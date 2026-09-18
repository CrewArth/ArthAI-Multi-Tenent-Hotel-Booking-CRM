import express from 'express';
import saAuthRoutes from './saAuthRoutes.js';
import tenantProvisionRoutes from './tenantProvisionRoutes.js';
import packageRoutes from './packageRoutes.js';

const router = express.Router();

router.use('/sa/auth', saAuthRoutes);
router.use('/sa/tenants', tenantProvisionRoutes);
router.use('/sa/packages', packageRoutes);

export default router;
