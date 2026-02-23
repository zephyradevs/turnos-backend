import { Router } from "express";
import { getAll, getById } from "../controllers/client/client.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de clientes requieren autenticación
router.use(authMiddleware);

router.get("/", getAll); // Listar clientes con filtros y paginación
router.get("/:id", getById); // Obtener cliente por ID con historial de turnos

export default router;
