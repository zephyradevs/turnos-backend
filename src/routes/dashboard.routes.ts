import { Router } from "express";
import { getTodayDashboardData } from "../controllers/dashboard/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de dashboard requieren autenticación
router.use(authMiddleware);

// Dashboard de hoy
router.get("/today", getTodayDashboardData);

export default router;
