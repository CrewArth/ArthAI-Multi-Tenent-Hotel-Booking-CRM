import express from 'express';
import {
  getAdminSummary,
  listUsers,
  getBookingsPerDay,
  getTopGuestHouses,
  createUserByAdmin,
  assignGuestHouse,
  updateUserWidgets,
  getMe,
} from '../controller/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { resolveSubscriptionPlan, checkAdminLimit } from '../middlewares/subscriptionMiddleware.js';
import { uploadESignature, processAndUploadESignature } from '../middlewares/imageUpload.js';

const router = express.Router();

router.post('/summary', authenticate, getAdminSummary);
router.post('/me', authenticate, getMe);
router.post('/users/list', authenticate, listUsers);
router.post(
  '/users',
  authenticate,
  authorize('SUPER_ADMIN'),
  resolveSubscriptionPlan,
  checkAdminLimit,
  uploadESignature,
  processAndUploadESignature,
  createUserByAdmin
);
router.patch('/users/:id/assign-guesthouse', authenticate, authorize('SUPER_ADMIN'), assignGuestHouse);
router.patch('/users/:id/widgets', authenticate, authorize('SUPER_ADMIN'), updateUserWidgets);
router.post('/metrics/bookings-per-day', authenticate, getBookingsPerDay);
router.post('/metrics/top-guest-houses', authenticate, getTopGuestHouses);

export default router;
