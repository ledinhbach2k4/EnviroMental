import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { eq, and, gte, lt } from "drizzle-orm";

const router = express.Router();

// Use middleware for all mood routes
router.use(authMiddleware, userLookupMiddleware);

// Get all moods of current user
router.get("/", async (req, res) => {
  try {
    const moods = await db
      .select()
      .from(schema.moodEntries)
      .where(eq(schema.moodEntries.userId, req.internalUserId));

    res.status(200).json(moods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch moods", detail: err.message });
  }
});

// Get mood entries for the current day
router.get("/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysEntries = await db
      .select()
      .from(schema.moodEntries)
      .where(
        and(
          eq(schema.moodEntries.userId, req.internalUserId),
          gte(schema.moodEntries.createdAt, today),
          lt(schema.moodEntries.createdAt, tomorrow)
        )
      );

    // Sort by time and format the response
    const formattedEntries = todaysEntries
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(entry => ({
        time: new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        moodLevel: entry.moodLevel,
      }));

    res.status(200).json(formattedEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch today's moods", detail: err.message });
  }
});

// Create a new mood entry
router.post("/", async (req, res) => {
  const { moodLevel, note, factors } = req.body;

  try {
    const [entry] = await db
      .insert(schema.moodEntries)
      .values({ userId: req.internalUserId, moodLevel, note, factors })
      .returning();

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert mood", detail: err.message });
  }
});

export default router;
