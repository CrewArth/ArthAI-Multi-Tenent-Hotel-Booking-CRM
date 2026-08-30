import express from 'express';
import { getSettings, updateSettings } from '../controller/settingsController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// GET & POST /api/settings - Fetch tenant logo & site name
router.get('/', getSettings);
router.post('/', getSettings);
router.post('/get', getSettings);

// PUT /api/settings - Update site name & logo (Protected for SUPER_ADMIN & ADMIN)
router.put('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateSettings);
router.post('/update', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateSettings);

export default router;
