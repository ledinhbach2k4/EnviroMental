import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createEmergencyContactSchema } from "../validation/schemas.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get user's emergency contacts
router.get("/contacts", authMiddleware, userLookupMiddleware, async (req, res) => {
  try {
    const data = await db
      .select()
      .from(schema.emergencyContacts)
      .where(eq(schema.emergencyContacts.userId, req.internalUserId));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emergency contacts", detail: err.message });
  }
});

// Create a new emergency contact
router.post("/contacts", authMiddleware, userLookupMiddleware, validate(createEmergencyContactSchema), async (req, res) => {
  const { name, phone, relation } = req.body;
  try {
    const [contact] = await db
      .insert(schema.emergencyContacts)
      .values({ userId: req.internalUserId, name, phone, relation })
      .returning();
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to create emergency contact", detail: err.message });
  }
});

export default router;