import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createGoalSchema } from "../validation/schemas.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get user target list
router.get("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const goals = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, req.internalUserId));

    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch goals", detail: err.message });
  }
});

// Create a new goal
router.post("/", authMiddleware, userLookupMiddleware, validate(createGoalSchema), async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    const [goal] = await db
      .insert(schema.goals)
      .values({ userId: req.internalUserId, title, description, dueDate })
      .returning();

    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: "Failed to create goal", detail: err.message });
  }
});

export default router;