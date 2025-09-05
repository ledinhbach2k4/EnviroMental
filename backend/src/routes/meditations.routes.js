import express from "express";
import NodeCache from "node-cache";
import * as schema from "../db/schema.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// GET /api/meditations - Get the list of meditations
router.get("/", async (req, res) => {
  try {
    const cachedData = cache.get("meditations");
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const data = await req.db.select().from(schema.meditations);
    cache.set("meditations", data);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch meditations", detail: err.message });
  }
});

export default router;
