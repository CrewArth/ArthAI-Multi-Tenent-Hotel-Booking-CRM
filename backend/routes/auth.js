import express from 'express';
import { loginUser, forgotPassword, resetPassword } from '../controller/authController.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/signin', authRateLimiter, loginUser);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

export default router;