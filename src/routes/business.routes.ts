import { Router } from 'express';
import { getConfiguration, saveConfiguration } from '../controllers/business/configuration.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de negocio requieren autenticación
router.use(authMiddleware);

// Configuración del negocio
router.post('/configuration', saveConfiguration);
router.get('/configuration', getConfiguration);

export default router;
