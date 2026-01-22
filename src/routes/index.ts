import { Router } from 'express';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/business', businessRoutes);

// Health check
router.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
