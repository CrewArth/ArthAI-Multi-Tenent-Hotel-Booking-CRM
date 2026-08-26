import express from 'express';
import {
  createGuestHouse,
  getGuestHouses,
  toggleMaintenanceMode,
  deleteGuestHouse,
  getGuestHouseById,
  updateGuestHouse
} from '../controller/guestHouseController.js';

import { upload, processAndUploadImage } from '../middlewares/imageUpload.js';
import { authenticate } from '../middlewares/auth.js';
import { resolveSubscriptionPlan, checkHotelLimit } from '../middlewares/subscriptionMiddleware.js';

import {
  preventHotelCreationForHotelAdmin,
  preventHotelDeletionForHotelAdmin,
  verifyPropertyOwnership,
} from '../middlewares/hotelAdminScopeMiddleware.js';

const router = express.Router();

// Create Guest House (HOTEL_ADMIN forbidden)
router.post(
  '/',
  authenticate,
  preventHotelCreationForHotelAdmin,
  resolveSubscriptionPlan,
  checkHotelLimit,
  upload,                 // multer memory upload
  processAndUploadImage,  // sharp → optimized → upload to S3
  createGuestHouse
);

// Get all Guest Houses
router.post('/list', getGuestHouses);

// Toggle Maintenance
router.patch('/:guestHouseId/maintenance', authenticate, verifyPropertyOwnership, toggleMaintenanceMode);

// Get Guest House by ID
router.get('/:guestHouseId', getGuestHouseById);

// Delete Guest House (HOTEL_ADMIN forbidden)
router.delete('/:guestHouseId', authenticate, preventHotelDeletionForHotelAdmin, deleteGuestHouse);

// Update Guest House (HOTEL_ADMIN allowed for assigned property)
router.put(
  '/:guestHouseId',
  authenticate,
  verifyPropertyOwnership,
  upload,
  processAndUploadImage,
  updateGuestHouse
);

export default router;
