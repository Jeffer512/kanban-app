import express from 'express';
import { register, login, logout, getMe } from '../controllers/authController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', authenticateToken, logout);
authRouter.get('/me', authenticateToken, getMe);

export default authRouter;