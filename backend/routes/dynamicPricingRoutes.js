import express from 'express';
import {
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  getHotelConfigStatus,
  toggleHotelConfigStatus,
  previewPricing,
} from '../controller/dynamicPricingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication and SUPER_ADMIN or HOTEL_ADMIN authorization
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'HOTEL_ADMIN'));

// All routes use POST per CLAUDE.md guidelines
router.post('/list', listPricingRules);
router.post('/create', createPricingRule);
router.post('/update', updatePricingRule);
router.post('/delete', deletePricingRule);
router.post('/toggle', togglePricingRule);
router.post('/config-status', getHotelConfigStatus);
router.post('/toggle-config-status', toggleHotelConfigStatus);
router.post('/preview', previewPricing);

export default router;
