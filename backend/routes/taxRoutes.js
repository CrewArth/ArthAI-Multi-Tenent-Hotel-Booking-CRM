import express from 'express';
import { listTaxes, createTax, updateTax, deleteTax } from '../controller/taxController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post('/list', listTaxes);
router.post('/', authenticate, authorize('SUPER_ADMIN'), createTax);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN'), updateTax);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteTax);

export default router;
