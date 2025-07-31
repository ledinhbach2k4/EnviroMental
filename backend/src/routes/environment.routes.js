import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create new environment record
router.post("/", authMiddleware, async (req, res) => {
  const {
    temperature,
    humidity,
    airQualityIndex,
    noiseLevel,
    lightLevel,
  } = req.body;

  try {
    const [env] = await db
      .insert(schema.environmentData)
      .values({
        userId: req.userId,
        temperature,
        humidity,
        airQualityIndex,
        noiseLevel,
        lightLevel,
      })
      .returning();

    res.status(201).json(env);
  } catch (err) {
    res.status(500).json({ error: "Failed to save environment data", detail: err.message });
  }
});

export default router;
