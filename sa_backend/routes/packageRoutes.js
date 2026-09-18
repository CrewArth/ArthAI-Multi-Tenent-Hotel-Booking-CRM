import express from 'express';
import { createPackage, listPackages } from '../controllers/packageController.js';
import { authenticateSa } from '../middlewares/saAuth.js';

const router = express.Router();

router.use(authenticateSa);
router.get('/', listPackages);
router.post('/', createPackage);

export default router;
