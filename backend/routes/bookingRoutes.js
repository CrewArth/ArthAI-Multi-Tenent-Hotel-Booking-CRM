// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  createAdminBooking,
  getAllBookings,
  getMyBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  checkAvailability,
  getApprovedBookingsForCalendar,
  exportDailyBookings,
  getBookingById,
  updateAdminBooking
} from "../controller/bookingController.js";
import {
  createCaptureSession,
  endCaptureSession,
  uploadManualGuestDocument,
} from "../controller/captureSessionController.js";
import {
  processAndUploadVerificationImage,
  uploadVerificationImage,
  uploadSingleDocument,
  processAndUploadGuestDocument,
} from "../middlewares/imageUpload.js";
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// QR Capture Session endpoints for desktop admin
router.post(
  "/:id/capture-session",
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  createCaptureSession
);

router.post(
  "/:id/capture-session/end",
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  endCaptureSession
);

// Manual desktop upload for specific guest slot
router.post(
  "/:id/guests/:guestId/document",
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  uploadSingleDocument,
  processAndUploadGuestDocument,
  uploadManualGuestDocument
);

// User creates a booking
router.post("/", createBooking);

router.post(
  "/admin",
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  uploadVerificationImage,
  processAndUploadVerificationImage,
  createAdminBooking
);

// User gets their bookings
router.post("/my", getMyBookings);

// Admin fetches all bookings
router.post("/list", authenticate, getAllBookings);

// Admin exports bookings by day
router.post("/export/daily", authenticate, exportDailyBookings);

// Admin approves / rejects / cancels booking
router.patch("/:id/approve", approveBooking);
router.patch("/:id/reject", rejectBooking);
router.patch("/:id/cancel", cancelBooking);

// To Check Room or Bed Availability
router.post("/availability", checkAvailability);

// Get approved bookings for calendar (admin)
router.post("/calendar", authenticate, getApprovedBookingsForCalendar);

// Get single booking by ID — must come after all named GET routes
router.get("/:id", authenticate, getBookingById);

// Admin updates a booking
router.put(
  "/:id/admin",
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  uploadVerificationImage,
  processAndUploadVerificationImage,
  updateAdminBooking
);

export default router;

