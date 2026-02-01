import { Router } from "express";
import {
  create,
  getAll,
  getById,
  update,
  cancel,
  complete,
  remove,
} from "../controllers/appointment/appointment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de turnos requieren autenticación
router.use(authMiddleware);

// CRUD de turnos
router.post("/", create); // Crear turno
router.get("/", getAll); // Listar turnos con filtros
router.get("/:id", getById); // Obtener turno por ID
router.put("/:id", update); // Actualizar turno
router.delete("/:id", remove); // Eliminar turno (permanente)

// Acciones específicas
router.post("/:id/cancel", cancel); // Cancelar turno
router.post("/:id/complete", complete); // Marcar como completado

export default router;
