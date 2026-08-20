import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createSuggestionSchema } from "../validation/schemas.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all suggestions from current user
router.get("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const data = await db
      .select()
      .from(schema.suggestions)
      .where(eq(schema.suggestions.userId, req.internalUserId));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suggestions", detail: err.message });
  }
});

// Create a new suggestion
router.post("/", authMiddleware, userLookupMiddleware, validate(createSuggestionSchema), async (req, res) => {
  const { content } = req.body;
  try {
    const [sug] = await db
      .insert(schema.suggestions)
      .values({ userId: req.internalUserId, content })
      .returning();
    res.status(201).json(sug);
  } catch (err) {
    res.status(500).json({ error: "Failed to create suggestion", detail: err.message });
  }
});

export default router;