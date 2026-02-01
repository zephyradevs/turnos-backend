import { Request, Response } from "express";
import { createAppointment } from "../../services/appointment/create-appointment.service";
import {
  getAppointments,
  getAppointmentById,
} from "../../services/appointment/get-appointments.service";
import {
  updateAppointment,
  cancelAppointment,
  completeAppointment,
} from "../../services/appointment/update-appointment.service";
import { deleteAppointment } from "../../services/appointment/delete-appointment.service";
import {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  AppointmentFiltersDTO,
  isValidTimeFormat,
  isValidDateFormat,
} from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

/**
 * Crear un nuevo turno
 * POST /api/appointments
 */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    const appointmentData: CreateAppointmentDTO = req.body;

    // Validaciones
    if (!appointmentData.clientName?.trim()) {
      res.status(400).json({
        status: "error",
        message: "El nombre del cliente es requerido",
      });
      return;
    }

    if (!appointmentData.serviceId) {
      res.status(400).json({
        status: "error",
        message: "El servicio es requerido",
      });
      return;
    }

    if (!appointmentData.professionalId) {
      res.status(400).json({
        status: "error",
        message: "El profesional es requerido",
      });
      return;
    }

    if (!appointmentData.date || !isValidDateFormat(appointmentData.date)) {
      res.status(400).json({
        status: "error",
        message: "La fecha es requerida y debe tener formato YYYY-MM-DD",
      });
      return;
    }

    if (
      !appointmentData.startTime ||
      !isValidTimeFormat(appointmentData.startTime)
    ) {
      res.status(400).json({
        status: "error",
        message: "La hora de inicio es requerida y debe tener formato HH:mm",
      });
      return;
    }

    if (
      appointmentData.endTime &&
      !isValidTimeFormat(appointmentData.endTime)
    ) {
      res.status(400).json({
        status: "error",
        message: "La hora de fin debe tener formato HH:mm",
      });
      return;
    }

    // Validar email si se proporciona
    if (
      appointmentData.clientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appointmentData.clientEmail)
    ) {
      res.status(400).json({
        status: "error",
        message: "El email del cliente no es válido",
      });
      return;
    }

    const result = await createAppointment(userId, appointmentData);

    res.status(201).json({
      status: "success",
      message: "Turno creado exitosamente",
      data: {
        appointment: result.appointment,
        isNewClient: result.isNewClient,
      },
    });
  } catch (error) {
    Logger.error("Error al crear turno:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "BUSINESS_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "No se encontró el negocio. Configure su negocio primero.",
          });
          return;
        case "PROFESSIONAL_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "El profesional seleccionado no existe",
          });
          return;
        case "SERVICE_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "El servicio seleccionado no existe",
          });
          return;
        case "INVALID_DATE":
          res.status(400).json({
            status: "error",
            message: "La fecha proporcionada no es válida",
          });
          return;
        case "TIME_SLOT_NOT_AVAILABLE":
          res.status(409).json({
            status: "error",
            message:
              "El horario seleccionado no está disponible para este profesional",
          });
          return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al crear el turno",
    });
  }
};

/**
 * Obtener turnos con filtros
 * GET /api/appointments
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

    // Construir filtros desde query params
    const filters: AppointmentFiltersDTO = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      professionalId: req.query.professionalId as string,
      serviceId: req.query.serviceId as string,
      clientId: req.query.clientId as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
      sortBy: req.query.sortBy as "date" | "createdAt" | "status",
      sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    // Parsear status (puede ser uno o varios)
    if (req.query.status) {
      const statusParam = req.query.status;
      if (Array.isArray(statusParam)) {
        filters.status = statusParam as any;
      } else {
        filters.status = statusParam as any;
      }
    }

    const result = await getAppointments(userId, filters);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    Logger.error("Error al obtener turnos:", error);

    if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio. Configure su negocio primero.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al obtener los turnos",
    });
  }
};

/**
 * Obtener un turno por ID
 * GET /api/appointments/:id
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
        message: "El ID del turno es requerido",
      });
      return;
    }

    const appointment = await getAppointmentById(userId, id);

    if (!appointment) {
      res.status(404).json({
        status: "error",
        message: "Turno no encontrado",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { appointment },
    });
  } catch (error) {
    Logger.error("Error al obtener turno:", error);

    if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({
        status: "error",
        message: "No se encontró el negocio. Configure su negocio primero.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al obtener el turno",
    });
  }
};

/**
 * Actualizar un turno
 * PUT /api/appointments/:id
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
        message: "El ID del turno es requerido",
      });
      return;
    }

    const updateData: UpdateAppointmentDTO = req.body;

    // Validar formato de fecha si se proporciona
    if (updateData.date && !isValidDateFormat(updateData.date)) {
      res.status(400).json({
        status: "error",
        message: "La fecha debe tener formato YYYY-MM-DD",
      });
      return;
    }

    // Validar formato de hora si se proporciona
    if (updateData.startTime && !isValidTimeFormat(updateData.startTime)) {
      res.status(400).json({
        status: "error",
        message: "La hora de inicio debe tener formato HH:mm",
      });
      return;
    }

    if (updateData.endTime && !isValidTimeFormat(updateData.endTime)) {
      res.status(400).json({
        status: "error",
        message: "La hora de fin debe tener formato HH:mm",
      });
      return;
    }

    // Validar email si se proporciona
    if (
      updateData.clientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.clientEmail)
    ) {
      res.status(400).json({
        status: "error",
        message: "El email del cliente no es válido",
      });
      return;
    }

    const appointment = await updateAppointment(userId, id, updateData);

    res.status(200).json({
      status: "success",
      message: "Turno actualizado exitosamente",
      data: { appointment },
    });
  } catch (error) {
    Logger.error("Error al actualizar turno:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "BUSINESS_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "No se encontró el negocio. Configure su negocio primero.",
          });
          return;
        case "APPOINTMENT_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "Turno no encontrado",
          });
          return;
        case "PROFESSIONAL_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "El profesional seleccionado no existe",
          });
          return;
        case "SERVICE_NOT_FOUND":
          res.status(404).json({
            status: "error",
            message: "El servicio seleccionado no existe",
          });
          return;
        case "INVALID_DATE":
          res.status(400).json({
            status: "error",
            message: "La fecha proporcionada no es válida",
          });
          return;
        case "TIME_SLOT_NOT_AVAILABLE":
          res.status(409).json({
            status: "error",
            message:
              "El horario seleccionado no está disponible para este profesional",
          });
          return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al actualizar el turno",
    });
  }
};

/**
 * Cancelar un turno
 * POST /api/appointments/:id/cancel
 */
export const cancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { reason } = req.body;

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
        message: "El ID del turno es requerido",
      });
      return;
    }

    const appointment = await cancelAppointment(userId, id, reason);

    res.status(200).json({
      status: "success",
      message: "Turno cancelado exitosamente",
      data: { appointment },
    });
  } catch (error) {
    Logger.error("Error al cancelar turno:", error);

    if (error instanceof Error) {
      if (error.message === "BUSINESS_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "No se encontró el negocio",
        });
        return;
      }
      if (error.message === "APPOINTMENT_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "Turno no encontrado",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al cancelar el turno",
    });
  }
};

/**
 * Completar un turno
 * POST /api/appointments/:id/complete
 */
export const complete = async (req: Request, res: Response): Promise<void> => {
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
        message: "El ID del turno es requerido",
      });
      return;
    }

    const appointment = await completeAppointment(userId, id);

    res.status(200).json({
      status: "success",
      message: "Turno completado exitosamente",
      data: { appointment },
    });
  } catch (error) {
    Logger.error("Error al completar turno:", error);

    if (error instanceof Error) {
      if (error.message === "BUSINESS_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "No se encontró el negocio",
        });
        return;
      }
      if (error.message === "APPOINTMENT_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "Turno no encontrado",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al completar el turno",
    });
  }
};

/**
 * Eliminar un turno (permanente)
 * DELETE /api/appointments/:id
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
        message: "El ID del turno es requerido",
      });
      return;
    }

    await deleteAppointment(userId, id);

    res.status(200).json({
      status: "success",
      message: "Turno eliminado exitosamente",
    });
  } catch (error) {
    Logger.error("Error al eliminar turno:", error);

    if (error instanceof Error) {
      if (error.message === "BUSINESS_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "No se encontró el negocio",
        });
        return;
      }
      if (error.message === "APPOINTMENT_NOT_FOUND") {
        res.status(404).json({
          status: "error",
          message: "Turno no encontrado",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno del servidor al eliminar el turno",
    });
  }
};
