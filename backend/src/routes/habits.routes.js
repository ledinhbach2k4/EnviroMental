import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import {
  validate,
  createHabitSchema,
  habitLogSchema,
  habitIdParamSchema,
} from "../validation/schemas.js";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// Get all habit logs for the current user (MOST SPECIFIC ROUTE FIRST)
router.get("/logs", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const userId = req.internalUserId;
    if (!userId) {
      return res.status(200).json([]);
    }

    console.log("Fetching habit logs for userId:", userId);
    const logs = await db
      .select()
      .from(schema.habitLogs)
      .innerJoin(schema.habits, eq(schema.habitLogs.habitId, schema.habits.id))
      .where(eq(schema.habits.userId, userId));

    if (!logs || logs.length === 0) {
      return res.status(200).json([]);
    }

    const formattedLogs = logs.map(l => l?.habit_logs || l).filter(Boolean);
    res.status(200).json(formattedLogs);
  } catch (err) {
    console.error("Error fetching habit logs:", err);
    // Safe fallback for new accounts without habit records
    res.status(200).json([]);
  }
});

// Get list of user habits
router.get("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const userId = req.internalUserId;
    if (!userId) {
      return res.status(200).json([]);
    }

    console.log("Fetching habits for userId:", userId);
    const habits = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.userId, userId));

    if (!habits || habits.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(habits);
  } catch (err) {
    console.error("Error fetching habits:", err);
    // Safe fallback for new accounts
    res.status(200).json([]);
  }
});

// Create a new habit
router.post("/", authMiddleware, userLookupMiddleware, validate(createHabitSchema), async (req, res) => {
  const { name, description, icon } = req.body;

  if (!req.internalUserId) {
    return res.status(400).json({ error: "User ID is missing" });
  }

  try {
    console.log("Creating habit for userId:", req.internalUserId, "name:", name);
    const [habit] = await db
      .insert(schema.habits)
      .values({ userId: req.internalUserId, name, description, icon })
      .returning();

    console.log("Habit created:", habit);
    res.status(201).json(habit);
  } catch (err) {
    console.error("Error creating habit:", err);
    res.status(500).json({ error: "Failed to create habit", detail: err.message });
  }
});

// Delete a habit
router.delete("/:habitId", authMiddleware, userLookupMiddleware, validate(habitIdParamSchema), async (req, res) => {
  const { habitId } = req.params;

  try {
    // Verify the habit belongs to the user
    const [habit] = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.id, parseInt(habitId)));

    if (!habit || habit.userId !== req.internalUserId) {
      return res.status(404).json({ error: "Habit not found or access denied" });
    }

    // First, delete all logs associated with the habit
    await db.delete(schema.habitLogs).where(eq(schema.habitLogs.habitId, parseInt(habitId)));

    // Then, delete the habit itself
    await db.delete(schema.habits).where(eq(schema.habits.id, parseInt(habitId)));

    res.status(204).send(); // 204 No Content for successful deletion
  } catch (err) {
    console.error("Error deleting habit:", err);
    res.status(500).json({ error: "Failed to delete habit", detail: err.message });
  }
});

// Upsert a habit log for a specific date
router.post("/:habitId/log", authMiddleware, userLookupMiddleware, validate(habitLogSchema), async (req, res) => {
  const { habitId } = req.params;
  const { date, completed } = req.body; // date should be in 'YYYY-MM-DD' format

  try {
    // Optional: Verify the habit belongs to the user
    const [habit] = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.id, parseInt(habitId)));

    if (!habit || habit.userId !== req.internalUserId) {
      return res.status(404).json({ error: "Habit not found or access denied" });
    }

    // Check if a log for this habit and date already exists
    const existingLogs = await db
      .select()
      .from(schema.habitLogs)
      .where(
        and(
          eq(schema.habitLogs.habitId, parseInt(habitId)),
          eq(schema.habitLogs.logDate, date)
        )
      );

    let resultLog;
    if (existingLogs.length > 0) {
      // If logs exist, update them all to the new 'completed' status
      const [updatedLog] = await db
        .update(schema.habitLogs)
        .set({ completed: completed !== undefined ? completed : true })
        .where(
          and(
            eq(schema.habitLogs.habitId, parseInt(habitId)),
            eq(schema.habitLogs.logDate, date)
          )
        )
        .returning();
      resultLog = updatedLog;
    } else {
      // If no log exists, insert a new one
      const [loggedHabit] = await db
        .insert(schema.habitLogs)
        .values({
          habitId: parseInt(habitId),
          logDate: date,
          completed: completed !== undefined ? completed : true,
        })
        .returning();
      resultLog = loggedHabit;
    }

    // Update completion_history (keep last 30 days)
    try {
      const currentHistory = Array.isArray(habit.completionHistory)
        ? habit.completionHistory
        : [];
      const completedValue = completed !== undefined ? completed : true;
      const updatedHistory = [...currentHistory, completedValue].slice(-30);
      await db
        .update(schema.habits)
        .set({ completionHistory: updatedHistory })
        .where(eq(schema.habits.id, parseInt(habitId)));
    } catch (historyErr) {
      console.error("Failed to update completion_history:", historyErr);
      // Do not fail the request if history update fails
    }

    res.status(existingLogs.length > 0 ? 200 : 201).json(resultLog);
  } catch (err) {
    console.error("Error in habit log upsert:", err);
    res.status(500).json({ error: "Failed to log habit", detail: err.message });
  }
});

export default router;