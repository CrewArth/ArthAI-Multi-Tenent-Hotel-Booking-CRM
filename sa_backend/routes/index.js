import express from 'express';
import saAuthRoutes from './saAuthRoutes.js';
import tenantProvisionRoutes from './tenantProvisionRoutes.js';

const router = express.Router();

router.use('/sa/auth', saAuthRoutes);
router.use('/sa/tenants', tenantProvisionRoutes);

export default router;
