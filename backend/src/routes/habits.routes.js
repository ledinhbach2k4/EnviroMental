import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get list of user habits
router.get("/", authMiddleware, async (req, res) => {
  try {
    const habits = await db
      .select()
      .from(schema.habits)
      .where(eq(schema.habits.userId, req.userId));

    res.status(200).json(habits);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits", detail: err.message });
  }
});

// Create a new habit
router.post("/", authMiddleware, async (req, res) => {
  const { name, description } = req.body;

  try {
    const [habit] = await db
      .insert(schema.habits)
      .values({ userId: req.userId, name, description })
      .returning();

    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({ error: "Failed to create habit", detail: err.message });
  }
});

export default router;
