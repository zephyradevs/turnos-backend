import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// API routes
router.use('/users', userRoutes);

// Health check
router.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
