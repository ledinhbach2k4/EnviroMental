import express from "express";

const router = express.Router();

/**
 * GET /api/cortisol
 * Mock endpoint returning safe fallback cortisol data
 * until the real calculation algorithm is ready
 */
router.get("/", async (req, res) => {
  try {
    const mockData = {
      score: 42,
      category: "moderate",
      label: "Normal Level",
      breakdown: {
        mood: 15,
        habits: 10,
        environment: 17,
      },
      message: "Your stress levels are balanced.",
      warnings: [],
      circadianMultiplier: 1,
      timestamp: new Date(),
    };

    res.status(200).json({
      success: true,
      data: mockData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch cortisol data",
      detail: err.message,
    });
  }
});

export default router;
