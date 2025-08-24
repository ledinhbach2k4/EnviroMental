// routes/test.routes.js
import { Router } from 'express';
import job from '../config/cron.js';

const router = Router();

// POST /api/test/cron → chạy cron job ngay lập tức
router.post('/cron', (req, res) => {
  try {
    job.fireOnTick(); // chạy cron ngay
    res.json({ success: true, message: 'Cron job executed manually!' });
  } catch (error) {
    console.error('Cron test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
