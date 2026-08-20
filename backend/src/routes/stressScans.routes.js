/**
 * Stress Scans API Routes
 * Handles CRUD operations for environmental & mental wellness scans
 */

import express from 'express';
import { validate } from '../validation/schemas.js';
import { stressScannerService } from '../services/stressScanner.service.js';
import { createStressScanSchema, stressScanIdParamSchema, stressScanQuerySchema } from '../validation/schemas.js';

const router = express.Router();

async function requireAuth(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = req.auth.userId;
  next();
}

router.post('/', requireAuth, validate(createStressScanSchema), async (req, res, next) => {
  try {
    const scan = await stressScannerService.createStressScan({
      userId: req.userId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: scan });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, validate(stressScanQuerySchema), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const days = req.query.days ? parseInt(req.query.days) : undefined;

    const scans = await stressScannerService.getStressScans(req.userId, { limit, offset, days });
    res.json({ success: true, data: scans });
  } catch (error) {
    next(error);
  }
});

router.get('/trends', requireAuth, async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const trends = await stressScannerService.getStressTrends(req.userId, days);
    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, validate(stressScanIdParamSchema), async (req, res, next) => {
  try {
    const scan = await stressScannerService.getStressScanById(parseInt(req.params.id), req.userId);
    if (!scan) {
      return res.status(404).json({ success: false, error: 'Stress scan not found' });
    }
    res.json({ success: true, data: scan });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, validate(stressScanIdParamSchema), async (req, res, next) => {
  try {
    const deleted = await stressScannerService.deleteStressScan(parseInt(req.params.id), req.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Stress scan not found' });
    }
    res.json({ success: true, message: 'Stress scan deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;