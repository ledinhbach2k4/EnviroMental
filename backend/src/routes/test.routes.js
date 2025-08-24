// routes/test.routes.js
import { Router } from 'express';
import job from '../config/cron.js';

const router = Router();

// GET /api/test/cron → trigger cron job immediately
router.get('/cron', (req, res) => {
  try {
    job.fireOnTick(); // run cron immediately
    res.json({ success: true, message: 'Cron job executed manually!' });
  } catch (error) {
    console.error('Cron test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
