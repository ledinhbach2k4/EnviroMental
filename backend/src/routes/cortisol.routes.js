import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { calculateCortisolScore } from "../services/cortisol.service.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware, userLookupMiddleware);

const SAFE_CORTISOL_FALLBACK = {
  score: null,
  category: "unknown",
  label: "Insufficient Data",
  breakdown: { mood: null, habits: null, environment: null },
  message: "Log your first mood or habit to see your cortisol risk score.",
  warnings: ["No data available — log a mood or complete a habit to get started."],
  circadianMultiplier: 1,
  timestamp: new Date().toISOString(),
};

/**
 * GET /api/cortisol-score (also handles /api/cortisol)
 * Returns the estimated cortisol risk score for the current user
 * Guaranteed to return safe fallback rather than 500 for new accounts
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.internalUserId;
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: {
          ...SAFE_CORTISOL_FALLBACK,
          timestamp: new Date().toISOString(),
        },
      });
    }

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

    // Fetch habits with today's completion status (supports user's local date if provided)
    const today =
      typeof req.query?.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().split("T")[0];

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
    if (Array.isArray(habitLogs)) {
      habitLogs.forEach((l) => {
        if (l?.habit_logs) {
          logsMap.set(l.habit_logs.habitId, l.habit_logs.completed);
        }
      });
    }

    const habits = Array.isArray(habitsData)
      ? habitsData.map((h) => ({
          ...h,
          completedToday: logsMap.get(h.id) ?? false,
        }))
      : [];

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

    const latestEnv = (environmentData && environmentData[0]) || null;

    // Fast-path: brand-new account with no records
    if ((!moodEntries || moodEntries.length === 0) && (!habits || habits.length === 0) && !latestEnv) {
      return res.status(200).json({
        success: true,
        data: {
          ...SAFE_CORTISOL_FALLBACK,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Calculate cortisol score
    const result = calculateCortisolScore({
      moodEntries: moodEntries || [],
      habits: habits || [],
      weather: latestEnv
        ? {
            temperature: latestEnv.temperature,
            humidity: latestEnv.humidity,
            lightLevel: latestEnv.lightLevel,
            description: "",
          }
        : null,
      airQuality: latestEnv
        ? {
            aqi: latestEnv.airQualityIndex,
            lightLevel: latestEnv.lightLevel,
          }
        : null,
    });

    res.status(200).json({
      success: true,
      data: result || SAFE_CORTISOL_FALLBACK,
    });
  } catch (err) {
    console.error("Error calculating cortisol score (returning safe default):", err);
    // Return safe default object instead of 500 error for new accounts
    res.status(200).json({
      success: true,
      data: {
        ...SAFE_CORTISOL_FALLBACK,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
