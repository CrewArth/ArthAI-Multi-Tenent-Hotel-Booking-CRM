import express from 'express';
import { getSubscriptionUsage } from '../controller/subscriptionController.js';
import { authenticate } from '../middlewares/auth.js';
import { resolveSubscriptionPlan } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.post('/usage', authenticate, resolveSubscriptionPlan, getSubscriptionUsage);

export default router;
