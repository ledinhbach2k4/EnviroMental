import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { and, eq } from "drizzle-orm";

const router = express.Router();

// Get the list of user's appointments, with optional status filtering
router.get("/", authMiddleware, async (req, res) => {
  const { status } = req.query;

  try {
    const conditions = [eq(schema.appointments.userId, req.userId)];
    if (status) {
      conditions.push(eq(schema.appointments.status, status));
    }

    const appointments = await db
      .select()
      .from(schema.appointments)
      .where(and(...conditions));
      
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments", message: err.message });
  }
});

// Get a single appointment by ID
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [appointment] = await db
      .select()
      .from(schema.appointments)
      .where(and(eq(schema.appointments.id, id), eq(schema.appointments.userId, req.userId)));

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.status(200).json(appointment);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointment", message: err.message });
  }
});

// Create a new appointment
router.post("/", authMiddleware, async (req, res) => {
  const { therapistName, scheduledAt, notes, status } = req.body;

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
        scheduledAt: parsedScheduledAt,
        notes,
        status,
      })
      .returning();

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create appointment", detail: err.message });
  }
});

// Update an appointment
router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { therapistName, scheduledAt, notes, status } = req.body;

  try {
    const updateData = {};
    if (therapistName) updateData.therapistName = therapistName;
    if (scheduledAt) {
      const parsedScheduledAt = new Date(scheduledAt);
      if (isNaN(parsedScheduledAt.getTime())) {
        return res.status(400).json({ error: "Invalid scheduledAt format" });
      }
      updateData.scheduledAt = parsedScheduledAt;
    }
    if (notes) updateData.notes = notes;
    if (status) updateData.status = status;

    const [appointment] = await db
      .update(schema.appointments)
      .set(updateData)
      .where(and(eq(schema.appointments.id, id), eq(schema.appointments.userId, req.userId)))
      .returning();

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found or you don't have permission to update it" });
    }

    res.status(200).json(appointment);
  } catch (err) {
    res.status(500).json({ error: "Failed to update appointment", detail: err.message });
  }
});

// Delete an appointment
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const [appointment] = await db
      .delete(schema.appointments)
      .where(and(eq(schema.appointments.id, id), eq(schema.appointments.userId, req.userId)))
      .returning();

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found or you don't have permission to delete it" });
    }

    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete appointment", detail: err.message });
  }
});

export default router;