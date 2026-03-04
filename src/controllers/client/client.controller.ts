import { Request, Response } from "express";
import { getClients } from "../../services/client/get-clients.service";
import { getClientById } from "../../services/client/get-client-by-id.service";
import { getClientHistory } from "../../services/client/get-client-history.service";
import { updateClient } from "../../services/client/update-client.service";
import { deleteClient } from "../../services/client/delete-client.service";
import {
  ClientFiltersDTO,
  ClientHistoryFiltersDTO,
  UpdateClientDTO,
} from "../../types/client.types";
import { AppointmentStatus } from "../../types/appointment.types";
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

/**
 * Obtener el historial de turnos de un cliente
 * GET /api/clients/:id/history
 *
 * Query params:
 *   status       - Filtrar por estado: pending | confirmed | in_progress | completed | cancelled | no_show
 *   dateFrom     - Fecha desde (YYYY-MM-DD)
 *   dateTo       - Fecha hasta (YYYY-MM-DD)
 *   page         - Número de página (default: 1)
 *   limit        - Resultados por página (default: 20, max: 100)
 *   sortBy       - Campo de ordenamiento: date | status | price
 *   sortOrder    - Dirección: asc | desc
 */
export const getHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
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

    const filters: ClientHistoryFiltersDTO = {
      status: req.query.status as AppointmentStatus | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
      sortBy: req.query.sortBy as ClientHistoryFiltersDTO["sortBy"],
      sortOrder: req.query.sortOrder as ClientHistoryFiltersDTO["sortOrder"],
    };

    const result = await getClientHistory(userId, id, filters);

    if (!result) {
      res.status(404).json({
        status: "error",
        message: "Cliente no encontrado",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    Logger.error("Error al obtener historial del cliente:", error);

    if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio. Configure su negocio primero.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al obtener el historial del cliente",
    });
  }
};

/**
 * Actualizar los datos de un cliente
 * PUT /api/clients/:id
 *
 * Body (parcial):
 *   name   - Nombre del cliente
 *   email  - Email del cliente (null para eliminar)
 *   phone  - Teléfono del cliente (null para eliminar)
 */
export const update = async (req: Request, res: Response): Promise<void> => {
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

    const data: UpdateClientDTO = {};
    const { name, email, phone } = req.body;

    // Solo incluir los campos que fueron enviados
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    // Validar que al menos un campo fue enviado
    if (Object.keys(data).length === 0) {
      res.status(400).json({
        status: "error",
        message:
          "Debe enviar al menos un campo para actualizar (name, email, phone)",
      });
      return;
    }

    // Validar nombre si se envía
    if (
      data.name !== undefined &&
      (!data.name || data.name.trim().length === 0)
    ) {
      res.status(400).json({
        status: "error",
        message: "El nombre del cliente no puede estar vacío",
      });
      return;
    }

    const client = await updateClient(userId, id, data);

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
    Logger.error("Error al actualizar cliente:", error);

    if (error instanceof Error) {
      if (error.message === "BUSINESS_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "No se encontró el negocio. Configure su negocio primero.",
        });
        return;
      }

      if (error.message === "CLIENT_EMAIL_ALREADY_EXISTS") {
        res.status(409).json({
          status: "error",
          message: "Ya existe otro cliente con ese email en el negocio",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al actualizar el cliente",
    });
  }
};

/**
 * Eliminar un cliente (borrado lógico)
 * DELETE /api/clients/:id
 */
export const remove = async (req: Request, res: Response): Promise<void> => {
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

    const result = await deleteClient(userId, id);

    if (!result) {
      res.status(404).json({
        status: "error",
        message: "Cliente no encontrado",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Cliente eliminado exitosamente",
      data: result,
    });
  } catch (error) {
    Logger.error("Error al eliminar cliente:", error);

    if (error instanceof Error) {
      if (error.message === "BUSINESS_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "No se encontró el negocio. Configure su negocio primero.",
        });
        return;
      }

      if (error.message === "CLIENT_HAS_PENDING_APPOINTMENTS") {
        res.status(409).json({
          status: "error",
          message:
            "No se puede eliminar el cliente porque tiene turnos pendientes o confirmados",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al eliminar el cliente",
    });
  }
};
