import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  addItem,
  approveItemRequest,
  createItemRequest,
  cancelItemRequest,
  directIssueItems,
  getInventoryConfiguration,
  listAvailableItems,
  listHotelInventory,
  listInventory,
  listItemRequests,
  updateInventoryConfiguration,
} from '../controller/inventoryController.js';

const router = express.Router();

router.use(authenticate);

router.post('/items/add', authorize('SUPER_ADMIN'), addItem);
router.post('/config', authorize('SUPER_ADMIN'), getInventoryConfiguration);
router.post('/config/update', authorize('SUPER_ADMIN'), updateInventoryConfiguration);
router.post('/list', authorize('SUPER_ADMIN'), listInventory);
router.post('/requests/list', authorize('SUPER_ADMIN'), listItemRequests);
router.post('/requests/:id/approve', authorize('SUPER_ADMIN'), approveItemRequest);
router.post('/requests/:id/cancel', authorize('SUPER_ADMIN'), cancelItemRequest);

router.post('/hotel/list', authorize('HOTEL_ADMIN'), listHotelInventory);
router.post('/hotel/config', authorize('HOTEL_ADMIN'), getInventoryConfiguration);
router.post('/hotel/available-items', authorize('HOTEL_ADMIN'), listAvailableItems);
router.post('/hotel/requests', authorize('HOTEL_ADMIN'), createItemRequest);
router.post('/hotel/direct-issue', authorize('HOTEL_ADMIN'), directIssueItems);

export default router;
