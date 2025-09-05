import express from "express";
import NodeCache from "node-cache";
import * as schema from "../db/schema.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// GET /api/mindfulness - Get the mindfulness exercise list
router.get("/", async (req, res) => {
  try {
    const cachedData = cache.get("mindfulness");
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const data = await req.db.select().from(schema.mindfulnessExercises);
    cache.set("mindfulness", data);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mindfulness exercises", detail: err.message });
  }
});

export default router;
