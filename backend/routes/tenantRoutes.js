import express from 'express';
import { createTenant, listTenants, getTenantBySlug } from '../controller/tenantController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public route to resolve tenant by slug for frontend branding
router.get('/by-slug/:slug', getTenantBySlug);

// Protected routes for SUPER_ADMIN
router.get('/', authenticate, authorize('SUPER_ADMIN'), listTenants);
router.post('/', authenticate, authorize('SUPER_ADMIN'), createTenant);

export default router;
