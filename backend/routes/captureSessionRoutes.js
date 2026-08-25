import express from 'express';
import {
  getRoster,
  addGuestToSession,
  uploadGuestDocument,
  endCaptureSession,
} from '../controller/captureSessionController.js';
import { authenticateCaptureSession } from '../middlewares/captureSessionAuth.js';
import { uploadSingleDocument, processAndUploadGuestDocument } from '../middlewares/imageUpload.js';

const router = express.Router();

// All capture-session routes are authenticated via the scoped JWT token
router.use(authenticateCaptureSession);

// GET guest roster and document capture status for this booking session
router.get('/roster', getRoster);

// POST add new family member to roster
router.post('/guests', addGuestToSession);

// POST upload/replace verification document for a specific guest
router.post(
  '/guests/:guestId/document',
  uploadSingleDocument,
  processAndUploadGuestDocument,
  uploadGuestDocument
);

// POST end/invalidate capture session
router.post('/end', endCaptureSession);

export default router;
