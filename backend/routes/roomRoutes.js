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

const router = express.Router();

router.post('/', authenticate, resolveSubscriptionPlan, checkRoomLimit, createRoom);
router.post('/by-guesthouse', getRoomsByGuestHouse);
router.post('/list', listRooms);
router.get('/:id', getRoomById);
router.put('/:id', updateRoom);
router.patch('/:id/availability', setAvailability);
router.delete('/:id', softDeleteRoom);

export default router;
