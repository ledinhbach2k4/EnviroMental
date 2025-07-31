import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get the list of user's appointments
router.get("/", authMiddleware, async (req, res) => {
  try {
    const appointments = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.userId, req.userId));
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments", detail: err.message });
  }
});

// Create a new appointment
router.post("/", authMiddleware, async (req, res) => {
  const { therapistName, scheduledAt, notes } = req.body;

  try {
    // Validate and parse scheduledAt
    const parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledAt format" });
    }

    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        userId: req.userId,
        therapistName,
        scheduledAt: parsedScheduledAt, // Use Date object
        notes,
      })
      .returning();

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create appointment", detail: err.message });
  }
});

export default router;