import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";


const router = express.Router();

// GET /api/meditations - Get the list of meditations
router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(schema.meditations);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch meditations", detail: err.message });
  }
});

export default router;
