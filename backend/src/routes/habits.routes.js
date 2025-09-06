import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// Get all habit logs for the current user (MOST SPECIFIC ROUTE FIRST)
router.get("/logs", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    console.log("Fetching habit logs for userId:", req.internalUserId); // Changed to internalUserId
    const logs = await db
      .select()
      .from(schema.habitLogs)
      .innerJoin(schema.habits, eq(schema.habitLogs.habitId, schema.habits.id))
      .where(eq(schema.habits.userId, req.internalUserId)); // Changed to internalUserId

    console.log("Raw logs from DB:", logs);
    res.status(200).json(logs.map(l => l.habit_logs));
  } catch (err) {
    console.error("Error fetching habit logs:", err);
    res.status(500).json({ error: "Failed to fetch habit logs", detail: err.message });
  }
});

// Get list of user habits
router.get("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    console.log("Fetching habits for userId:", req.internalUserId); // Changed to internalUserId
    const habits = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.userId, req.internalUserId)); // Changed to internalUserId

    console.log("Raw habits from DB:", habits);
    res.status(200).json(habits);
  } catch (err) {
    console.error("Error fetching habits:", err);
    res.status(500).json({ error: "Failed to fetch habits", detail: err.message });
  }
});

// Create a new habit
router.post("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  const { name, description } = req.body;

  if (!req.internalUserId) {
    return res.status(400).json({ error: "User ID is missing" });
  }

  try {
    console.log("Creating habit for userId:", req.internalUserId, "name:", name);
    const [habit] = await db
      .insert(schema.habits)
      .values({ userId: req.internalUserId, name, description }) // Changed to internalUserId
      .returning();

    console.log("Habit created:", habit);
    res.status(201).json(habit);
  } catch (err) {
    console.error("Error creating habit:", err);
    res.status(500).json({ error: "Failed to create habit", detail: err.message });
  }
});

// Delete a habit
router.delete("/:habitId", authMiddleware, userLookupMiddleware, async (req, res) => {
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
router.post("/:habitId/log", authMiddleware, userLookupMiddleware, async (req, res) => {
  const { habitId } = req.params;
  const { date, completed } = req.body; // date should be in 'YYYY-MM-DD' format

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

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
      res.status(200).json(updatedLog);
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
      res.status(201).json(loggedHabit);
    }
  } catch (err) {
    console.error("Error in habit log upsert:", err);
    res.status(500).json({ error: "Failed to log habit", detail: err.message });
  }
});

export default router;
