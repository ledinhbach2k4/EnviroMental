import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { calculateCortisolScore } from "../services/cortisol.service.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware, userLookupMiddleware);

/**
 * GET /api/cortisol-score
 * Returns the estimated cortisol risk score for the current user
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.internalUserId;

    // Fetch mood entries (last 7 days for 3-day average)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const moodEntries = await db
      .select()
      .from(schema.moodEntries)
      .where(
        and(
          eq(schema.moodEntries.userId, userId),
          gte(schema.moodEntries.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(schema.moodEntries.createdAt));

    // Fetch habits with today's completion status
    const today = new Date().toISOString().split('T')[0];
    
    const habitsData = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.userId, userId));

    const habitLogs = await db
      .select()
      .from(schema.habitLogs)
      .innerJoin(schema.habits, eq(schema.habitLogs.habitId, schema.habits.id))
      .where(
        and(
          eq(schema.habits.userId, userId),
          eq(schema.habitLogs.logDate, today)
        )
      );

    // Combine habits with today's completion status
    const logsMap = new Map();
    habitLogs.forEach(l => {
      logsMap.set(l.habit_logs.habitId, l.habit_logs.completed);
    });

    const habits = habitsData.map(h => ({
      ...h,
      completedToday: logsMap.get(h.id) ?? false,
    }));

    // Fetch latest environment data (last 24 hours)
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);

    const environmentData = await db
      .select()
      .from(schema.environmentData)
      .where(
        and(
          eq(schema.environmentData.userId, userId),
          gte(schema.environmentData.recordedAt, dayAgo)
        )
      )
      .orderBy(desc(schema.environmentData.recordedAt))
      .limit(1);

    const latestEnv = environmentData[0] || null;

    // Calculate cortisol score
    const result = calculateCortisolScore({
      moodEntries,
      habits,
      weather: latestEnv ? {
        temperature: latestEnv.temperature,
        description: '', // Could add weather condition from external API
      } : null,
      airQuality: latestEnv ? {
        aqi: latestEnv.airQualityIndex,
      } : null,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error calculating cortisol score:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to calculate cortisol score", 
      detail: err.message 
    });
  }
});

export default router;