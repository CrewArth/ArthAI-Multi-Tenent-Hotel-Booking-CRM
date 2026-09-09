import express from 'express';
import {
  createBed,
  listBedsByRoom,
  softDeleteBed,
  toggleAvailability,
  updateBed,
  autoCreateBeds,
  listBedConfigs,
  saveBedConfig,
  deleteBedConfig
} from '../controller/bedController.js';

const router = express.Router();

router.post('/', createBed);
router.post('/auto-create', autoCreateBeds);
router.post('/list', listBedsByRoom);
router.post('/by-rooms', listBedsByRoom);
router.post('/configs/list', listBedConfigs);
router.post('/configs', saveBedConfig);
router.post('/configs/delete', deleteBedConfig);
router.put('/:id', updateBed);
router.patch('/:id/availability', toggleAvailability);
router.delete('/:id', softDeleteBed);

export default router;