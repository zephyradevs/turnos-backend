import { Router } from "express";
import {
  getAll,
  getById,
  getHistory,
  update,
  remove,
} from "../controllers/client/client.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de clientes requieren autenticación
router.use(authMiddleware);

router.get("/", getAll); // Listar clientes con filtros y paginación
router.get("/:id", getById); // Obtener cliente por ID con historial de turnos
router.get("/:id/history", getHistory); // Historial detallado de turnos del cliente
router.put("/:id", update); // Actualizar datos de un cliente
router.delete("/:id", remove); // Eliminar cliente (borrado lógico)

export default router;
