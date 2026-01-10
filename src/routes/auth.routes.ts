import { Router } from 'express';
import { register } from '../controllers/auth/register.controller';
import { verifyEmail } from '../controllers/auth/verify-email.controller';

const router = Router();

// Rutas de autenticación
router.post('/register', register);
router.post('/verify-email', verifyEmail);

export default router;
