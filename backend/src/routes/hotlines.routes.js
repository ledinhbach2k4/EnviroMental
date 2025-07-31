import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";


const router = express.Router();

// GET /api/hotlines - Get a list of support hotlines
router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(schema.hotlines);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hotlines", detail: err.message });
  }
});

export default router;
