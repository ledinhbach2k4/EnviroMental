import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { eq } from "drizzle-orm";

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
