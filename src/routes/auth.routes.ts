import { Router } from 'express';
import { login } from '../controllers/auth/login.controller';
import { register } from '../controllers/auth/register.controller';
import { verifyEmail } from '../controllers/auth/verify-email.controller';

const router = Router();

// Rutas de autenticación
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);

export default router;
