import { Request, Response } from "express";
import { getClients } from "../../services/client/get-clients.service";
import { getClientById } from "../../services/client/get-client-by-id.service";
import { ClientFiltersDTO } from "../../types/client.types";
import { Logger } from "../../utils/logger";

/**
 * Obtener la lista paginada de clientes del negocio
 * GET /api/clients
 *
 * Query params:
 *   search       - Filtrar por nombre o email
 *   page         - Número de página (default: 1)
 *   limit        - Resultados por página (default: 20, max: 100)
 *   sortBy       - Campo de ordenamiento: name | createdAt | totalAppointments
 *   sortOrder    - Dirección: asc | desc
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    const filters: ClientFiltersDTO = {
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
      sortBy: req.query.sortBy as ClientFiltersDTO["sortBy"],
      sortOrder: req.query.sortOrder as ClientFiltersDTO["sortOrder"],
    };

    const result = await getClients(userId, filters);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    Logger.error("Error al obtener clientes:", error);

    if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio. Configure su negocio primero.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al obtener los clientes",
    });
  }
};

/**
 * Obtener un cliente por ID con su historial de turnos
 * GET /api/clients/:id
 */
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        status: "error",
        message: "El ID del cliente es requerido",
      });
      return;
    }

    const client = await getClientById(userId, id);

    if (!client) {
      res.status(404).json({
        status: "error",
        message: "Cliente no encontrado",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { client },
    });
  } catch (error) {
    Logger.error("Error al obtener cliente:", error);

    if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio. Configure su negocio primero.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al obtener el cliente",
    });
  }
};
