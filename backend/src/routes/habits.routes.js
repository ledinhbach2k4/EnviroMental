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
import { eq, and, desc, inArray } from "drizzle-orm";

const router = express.Router();

// In-flight mutex per habit+date to prevent concurrent race condition inserts
const inFlightLogLocks = new Map();

/**
 * Helper to compute an accurate 30-day completion history array (booleans)
 * ending on the specified target date (YYYY-MM-DD).
 */
async function syncCompletionHistory(habitId, targetDateStr) {
  try {
    const allLogs = await db
      .select({
        logDate: schema.habitLogs.logDate,
        completed: schema.habitLogs.completed,
      })
      .from(schema.habitLogs)
      .where(eq(schema.habitLogs.habitId, habitId));

    const dateMap = new Map();
    for (const log of allLogs) {
      if (!log || !log.logDate) continue;
      const dStr =
        typeof log.logDate === "string"
          ? log.logDate.split("T")[0]
          : new Date(log.logDate).toISOString().split("T")[0];
      dateMap.set(dStr, Boolean(log.completed));
    }

    const [targetYear, targetMonth, targetDay] = targetDateStr
      .split("-")
      .map(Number);
    const history = [];

    // 30 days ending on targetDateStr
    for (let i = 29; i >= 0; i--) {
      const dayDate = new Date(
        Date.UTC(targetYear, targetMonth - 1, targetDay - i)
      );
      const yyyy = dayDate.getUTCFullYear();
      const mm = String(dayDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(dayDate.getUTCDate()).padStart(2, "0");
      const dayKey = `${yyyy}-${mm}-${dd}`;
      history.push(dateMap.get(dayKey) ?? false);
    }

    await db
      .update(schema.habits)
      .set({ completionHistory: history })
      .where(eq(schema.habits.id, habitId));
  } catch (err) {
    console.error("Failed to update habit completionHistory:", err);
  }
}

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
      .where(eq(schema.habits.userId, userId))
      .orderBy(desc(schema.habitLogs.id));

    if (!logs || logs.length === 0) {
      return res.status(200).json([]);
    }

    const formattedLogs = logs.map((l) => l?.habit_logs || l).filter(Boolean);
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
router.post(
  "/",
  authMiddleware,
  userLookupMiddleware,
  validate(createHabitSchema),
  async (req, res) => {
    const { name, description, icon } = req.body;

    if (!req.internalUserId) {
      return res.status(400).json({ error: "User ID is missing" });
    }

    try {
      console.log(
        "Creating habit for userId:",
        req.internalUserId,
        "name:",
        name
      );
      const [habit] = await db
        .insert(schema.habits)
        .values({
          userId: req.internalUserId,
          name,
          description,
          icon,
          completionHistory: [],
        })
        .returning();

      console.log("Habit created:", habit);
      res.status(201).json(habit);
    } catch (err) {
      console.error("Error creating habit:", err);
      res
        .status(500)
        .json({ error: "Failed to create habit", detail: err.message });
    }
  }
);

// Delete a habit
router.delete(
  "/:habitId",
  authMiddleware,
  userLookupMiddleware,
  validate(habitIdParamSchema),
  async (req, res) => {
    const { habitId } = req.params;
    const parsedHabitId = parseInt(habitId, 10);

    try {
      // Verify the habit belongs to the user
      const [habit] = await db
        .select()
        .from(schema.habits)
        .where(eq(schema.habits.id, parsedHabitId));

      if (!habit || habit.userId !== req.internalUserId) {
        return res
          .status(404)
          .json({ error: "Habit not found or access denied" });
      }

      // First, delete all logs associated with the habit
      await db
        .delete(schema.habitLogs)
        .where(eq(schema.habitLogs.habitId, parsedHabitId));

      // Then, delete the habit itself
      await db
        .delete(schema.habits)
        .where(eq(schema.habits.id, parsedHabitId));

      res.status(204).send(); // 204 No Content for successful deletion
    } catch (err) {
      console.error("Error deleting habit:", err);
      res
        .status(500)
        .json({ error: "Failed to delete habit", detail: err.message });
    }
  }
);

// Upsert a habit log for a specific date
router.post(
  "/:habitId/log",
  authMiddleware,
  userLookupMiddleware,
  validate(habitLogSchema),
  async (req, res) => {
    const { habitId } = req.params;
    const { date, completed } = req.body; // date is in 'YYYY-MM-DD' format
    const parsedHabitId = parseInt(habitId, 10);
    const completedValue = completed !== undefined ? Boolean(completed) : true;

    try {
      // Verify the habit belongs to the user
      const [habit] = await db
        .select()
        .from(schema.habits)
        .where(eq(schema.habits.id, parsedHabitId));

      if (!habit || habit.userId !== req.internalUserId) {
        return res
          .status(404)
          .json({ error: "Habit not found or access denied" });
      }

      // Concurrency lock per habit+date to eliminate duplicate race condition inserts
      const lockKey = `${parsedHabitId}_${date}`;
      const previousOperation =
        inFlightLogLocks.get(lockKey) || Promise.resolve();

      const executeUpsert = async () => {
        // Query any existing logs for this habit and date
        const existingLogs = await db
          .select()
          .from(schema.habitLogs)
          .where(
            and(
              eq(schema.habitLogs.habitId, parsedHabitId),
              eq(schema.habitLogs.logDate, date)
            )
          );

        let resultLog;
        let isUpdate = false;

        if (existingLogs.length > 0) {
          isUpdate = true;
          // Update the primary log record
          const targetId = existingLogs[0].id;
          const [updatedLog] = await db
            .update(schema.habitLogs)
            .set({ completed: completedValue })
            .where(eq(schema.habitLogs.id, targetId))
            .returning();
          resultLog = updatedLog;

          // Deduplicate: Clean up any stale duplicate records for the same date
          if (existingLogs.length > 1) {
            const duplicateIds = existingLogs.slice(1).map((l) => l.id);
            await db
              .delete(schema.habitLogs)
              .where(inArray(schema.habitLogs.id, duplicateIds));
          }
        } else {
          // If no record exists, insert cleanly
          const [loggedHabit] = await db
            .insert(schema.habitLogs)
            .values({
              habitId: parsedHabitId,
              logDate: date,
              completed: completedValue,
            })
            .returning();
          resultLog = loggedHabit;
        }

        // Recalculate accurate 30-day completion history for cortisol stress engine
        await syncCompletionHistory(parsedHabitId, date);

        return { resultLog, isUpdate };
      };

      // Chain onto existing operation to serialize
      const currentOperation = previousOperation
        .catch(() => {})
        .then(executeUpsert);
      inFlightLogLocks.set(lockKey, currentOperation);

      try {
        const { resultLog, isUpdate } = await currentOperation;
        res.status(isUpdate ? 200 : 201).json(resultLog);
      } finally {
        if (inFlightLogLocks.get(lockKey) === currentOperation) {
          inFlightLogLocks.delete(lockKey);
        }
      }
    } catch (err) {
      console.error("Error in habit log upsert:", err);
      res
        .status(500)
        .json({ error: "Failed to log habit", detail: err.message });
    }
  }
);

export default router;
