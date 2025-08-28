import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all moods of current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const moods = await db
      .select()
      .from(schema.moodEntries)
      .where(eq(schema.moodEntries.userId, req.auth.userId));

    res.status(200).json(moods);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch moods", detail: err.message });
  }
});

// Create a new mood entry
// Create a new mood entry
router.post("/", authMiddleware, async (req, res) => {
  const { moodLevel, note, factors } = req.body;

  try {
    const [entry] = await db
      .insert(schema.moodEntries)
      .values({ userId: req.auth.userId, moodLevel, note, factors })
      .returning();

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to insert mood", detail: err.message });
  }
});

export default router;
