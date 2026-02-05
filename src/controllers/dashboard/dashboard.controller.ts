import { Request, Response } from "express";
import { getTodayDashboard } from "../../services/dashboard/get-today-dashboard.service";
import { Logger } from "../../utils/logger";

/**
 * Obtener el dashboard de hoy con toda la información relevante
 * GET /api/dashboard/today
 */
export const getTodayDashboardData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    const dashboard = await getTodayDashboard(userId);

    if (!dashboard) {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio para este usuario",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Dashboard de hoy obtenido exitosamente",
      data: dashboard,
    });
  } catch (error) {
    Logger.error("Error al obtener dashboard de hoy:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno al obtener el dashboard de hoy",
    });
  }
};
