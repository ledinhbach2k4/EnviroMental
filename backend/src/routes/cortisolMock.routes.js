import express from "express";

const router = express.Router();

const SAFE_CORTISOL_FALLBACK = {
  score: null,
  category: "unknown",
  label: "Insufficient Data",
  breakdown: {
    mood: null,
    habits: null,
    environment: null,
  },
  message: "Log your first mood or habit to see your cortisol risk score.",
  warnings: ["No data available — log a mood or complete a habit to get started."],
  circadianMultiplier: 1,
  timestamp: new Date().toISOString(),
};

/**
 * GET /api/cortisol
 * Safe fallback endpoint returning default cortisol data
 */
router.get("/", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        ...SAFE_CORTISOL_FALLBACK,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(200).json({
      success: true,
      data: SAFE_CORTISOL_FALLBACK,
    });
  }
});

export default router;
