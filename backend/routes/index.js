import express from 'express';
import authRoutes from './auth.js';
import adminRoutes from './createadmin.js';
import userRoutes from './userRoute.js';
import guestHouseRoutes from './guestHouseRoutes.js';
import roomRoutes from './roomRoutes.js';
import bedRoutes from './bedRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import adminSummary from './adminRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import contactRoutes from './contactRoutes.js';
import reportRoutes from '../reports/routes/reportRoutes.js';
import taxRoutes from './taxRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import tenantRoutes from './tenantRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import captureSessionRoutes from './captureSessionRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/guesthouses', guestHouseRoutes);
router.use('/rooms', roomRoutes);
router.use('/beds', bedRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/admin', adminSummary);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);
router.use('/capture-session', captureSessionRoutes);
router.use('/contact', contactRoutes);
router.use('/reports', reportRoutes);
router.use('/taxes', taxRoutes);
router.use('/payments', paymentRoutes);
router.use('/tenants', tenantRoutes);
router.use('/subscription', subscriptionRoutes);

export default router;