import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createNotificationSchema } from "../validation/schemas.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get user notification list
router.get("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, req.internalUserId));

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications", detail: err.message });
  }
});

// Create a new notification
router.post("/", authMiddleware, userLookupMiddleware, validate(createNotificationSchema), async (req, res) => {
  const { content, scheduledAt } = req.body;

  try {
    const [noti] = await db
      .insert(schema.notifications)
      .values({ userId: req.internalUserId, content, scheduledAt })
      .returning();

    res.status(201).json(noti);
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification", detail: err.message });
  }
});

export default router;