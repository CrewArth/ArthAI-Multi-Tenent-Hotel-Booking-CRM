import express from 'express';
import {
  createRoom,
  getRoomById,
  getRoomsByGuestHouse,
  listRooms,
  setAvailability,
  softDeleteRoom,
  updateRoom
} from '../controller/roomController.js';
import { authenticate } from '../middlewares/auth.js';
import { resolveSubscriptionPlan, checkRoomLimit } from '../middlewares/subscriptionMiddleware.js';
import { verifyPropertyOwnership } from '../middlewares/hotelAdminScopeMiddleware.js';

const router = express.Router();

router.post('/', authenticate, verifyPropertyOwnership, resolveSubscriptionPlan, checkRoomLimit, createRoom);
router.post('/by-guesthouse', getRoomsByGuestHouse);
router.post('/list', listRooms);
router.get('/:id', getRoomById);
router.put('/:id', authenticate, verifyPropertyOwnership, updateRoom);
router.patch('/:id/availability', authenticate, verifyPropertyOwnership, setAvailability);
router.delete('/:id', authenticate, verifyPropertyOwnership, softDeleteRoom);

export default router;
