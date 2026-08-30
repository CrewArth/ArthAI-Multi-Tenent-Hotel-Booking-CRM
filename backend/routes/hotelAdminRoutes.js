import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload, processAndUploadImage } from '../middlewares/imageUpload.js';
import {
  getDashboardStats,
  getAssignedHotel,
  updateAssignedHotel,
  getAssignedRooms,
  createAssignedRoom,
  updateAssignedRoom,
  deleteAssignedRoom,
  getAssignedBeds,
  createAssignedBed,
  deleteAssignedBed,
  getAssignedBookings,
  updateAssignedBookingStatus,
  getAssignedConfiguration,
  updateAssignedConfiguration,
} from '../controller/hotelAdminController.js';

const router = express.Router();

// Middleware: Authenticate & Authorize for HOTEL_ADMIN or SUPER_ADMIN
router.use(authenticate);
router.use(authorize('HOTEL_ADMIN', 'SUPER_ADMIN'));

// ── Dashboard Stats ─────────────────────────────────────────────
router.get('/dashboard-stats', getDashboardStats);

// ── Assigned Hotel Management ───────────────────────────────────
router.get('/hotel', getAssignedHotel);
router.put('/hotel', upload, processAndUploadImage, updateAssignedHotel);

// ── Configuration Management ────────────────────────────────────
router.get('/configuration', getAssignedConfiguration);
router.post('/configuration', getAssignedConfiguration);
router.put('/configuration', updateAssignedConfiguration);
router.post('/configuration/update', updateAssignedConfiguration);

// ── Room Management (Scoped to Assigned Hotel) ──────────────────
router.get('/rooms', getAssignedRooms);
router.post('/rooms', upload, processAndUploadImage, createAssignedRoom);
router.put('/rooms/:id', upload, processAndUploadImage, updateAssignedRoom);
router.delete('/rooms/:id', deleteAssignedRoom);

// ── Bed Management (Scoped to Assigned Hotel) ───────────────────
router.get('/beds', getAssignedBeds);
router.post('/beds', createAssignedBed);
router.delete('/beds/:id', deleteAssignedBed);

// ── Bookings Management (Scoped to Assigned Hotel) ──────────────
router.get('/bookings', getAssignedBookings);
router.post('/bookings', getAssignedBookings);
router.patch('/bookings/:id/status', updateAssignedBookingStatus);

export default router;
