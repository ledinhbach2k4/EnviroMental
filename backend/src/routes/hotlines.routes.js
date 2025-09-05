import express from "express";
import NodeCache from "node-cache";
import * as schema from "../db/schema.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// GET /api/hotlines - Get a list of support hotlines
router.get("/", async (req, res) => {
  try {
    const cachedData = cache.get("hotlines");
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const data = await req.db.select().from(schema.hotlines);
    cache.set("hotlines", data);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hotlines", detail: err.message });
  }
});

export default router;
