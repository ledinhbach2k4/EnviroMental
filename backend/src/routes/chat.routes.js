import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Retrieve all user chat logs
router.get("/", authMiddleware, async (req, res) => {
  try {
    const messages = await db
      .select()
      .from(schema.chatLogs)
      .where(eq(schema.chatLogs.userId, req.userId));

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat logs", detail: err.message });
  }
});

// Send new message
router.post("/", authMiddleware, async (req, res) => {
  const { sender, message } = req.body;

  try {
    const [msg] = await db
      .insert(schema.chatLogs)
      .values({ userId: req.userId, sender, message })
      .returning();

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message", detail: err.message });
  }
});

export default router;
