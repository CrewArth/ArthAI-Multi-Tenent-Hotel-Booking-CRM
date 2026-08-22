import express from 'express';
import { saLogin } from '../controllers/saAuthController.js';

const router = express.Router();

router.post('/login', saLogin);

export default router;
