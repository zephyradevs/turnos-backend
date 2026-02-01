import {
  Appointment,
  AppointmentStatus as PrismaAppointmentStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/database";
import {
  UpdateAppointmentDTO,
  AppointmentResponseDTO,
  APPOINTMENT_STATUS_MAP,
  PRISMA_STATUS_MAP,
  calculateEndTime,
} from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

/**
 * Tipo para el turno con todas las relaciones incluidas
 */
type AppointmentWithRelations = Appointment & {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    id: string;
    externalId: string;
    name: string;
    duration: number;
    price: Prisma.Decimal | null;
  };
  professional: {
    id: string;
    externalId: string;
    firstName: string;
    lastName: string;
  };
};

/**
 * Transforma un Appointment de Prisma a DTO de respuesta
 */
function toResponseDTO(
  appointment: AppointmentWithRelations,
): AppointmentResponseDTO {
  return {
    id: appointment.id,
    client: {
      id: appointment.client.id,
      name: appointment.client.name,
      email: appointment.client.email,
      phone: appointment.client.phone,
    },
    service: {
      id: appointment.service.id,
      externalId: appointment.service.externalId,
      name: appointment.service.name,
      duration: appointment.service.duration,
      price: appointment.service.price
        ? Number(appointment.service.price)
        : null,
    },
    professional: {
      id: appointment.professional.id,
      externalId: appointment.professional.externalId,
      firstName: appointment.professional.firstName,
      lastName: appointment.professional.lastName,
    },
    date: appointment.date.toISOString().split("T")[0],
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: appointment.duration,
    status: PRISMA_STATUS_MAP[appointment.status] || "pending",
    price: appointment.price ? Number(appointment.price) : null,
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    cancelledAt: appointment.cancelledAt?.toISOString() || null,
    cancelledReason: appointment.cancelledReason,
    completedAt: appointment.completedAt?.toISOString() || null,
  };
}

/**
 * Actualiza un turno existente
 */
export async function updateAppointment(
  userId: string,
  appointmentId: string,
  data: UpdateAppointmentDTO,
): Promise<AppointmentResponseDTO> {
  Logger.info("Actualizando turno", { userId, appointmentId });

  // Obtener el negocio del usuario
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Verificar que el turno existe y pertenece al negocio
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      businessId: business.id,
    },
    include: {
      client: true,
      service: true,
    },
  });

  if (!existingAppointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  // Preparar datos de actualización
  const updateData: Prisma.AppointmentUpdateInput = {};

  // Actualizar profesional si cambió
  let newProfessionalId = existingAppointment.professionalId;
  if (data.professionalId) {
    const professional = await prisma.professional.findFirst({
      where: {
        businessId: business.id,
        externalId: data.professionalId,
      },
      select: { id: true },
    });

    if (!professional) {
      throw new Error("PROFESSIONAL_NOT_FOUND");
    }
    newProfessionalId = professional.id;
    updateData.professional = { connect: { id: professional.id } };
  }

  // Actualizar servicio si cambió
  let serviceDuration = existingAppointment.service.duration;
  if (data.serviceId) {
    const service = await prisma.service.findFirst({
      where: {
        businessId: business.id,
        externalId: data.serviceId,
      },
      select: { id: true, duration: true, price: true },
    });

    if (!service) {
      throw new Error("SERVICE_NOT_FOUND");
    }
    serviceDuration = service.duration;
    updateData.service = { connect: { id: service.id } };
    updateData.duration = service.duration;
    updateData.price = service.price;
  }

  // Actualizar fecha
  let appointmentDate = existingAppointment.date;
  if (data.date) {
    appointmentDate = new Date(data.date);
    if (isNaN(appointmentDate.getTime())) {
      throw new Error("INVALID_DATE");
    }
    updateData.date = appointmentDate;
  }

  // Actualizar hora de inicio y calcular hora de fin
  let startTime = data.startTime || existingAppointment.startTime;
  let endTime = data.endTime || calculateEndTime(startTime, serviceDuration);

  if (data.startTime) {
    updateData.startTime = data.startTime;
    updateData.endTime = endTime;
  }

  // Verificar conflictos de horario si cambió fecha, hora o profesional
  if (data.date || data.startTime || data.professionalId) {
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        professionalId: newProfessionalId,
        date: appointmentDate,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (conflictingAppointment) {
      throw new Error("TIME_SLOT_NOT_AVAILABLE");
    }
  }

  // Actualizar estado
  if (data.status) {
    const newStatus = APPOINTMENT_STATUS_MAP[
      data.status
    ] as PrismaAppointmentStatus;
    updateData.status = newStatus;

    // Agregar timestamps según el estado
    if (data.status === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = data.cancelledReason || null;
    } else if (data.status === "completed") {
      updateData.completedAt = new Date();
    }
  }

  // Actualizar notas
  if (data.notes !== undefined) {
    updateData.notes = data.notes || null;
  }

  // Actualizar datos del cliente si es necesario
  if (data.clientName || data.clientEmail || data.clientPhone) {
    const clientUpdateData: Prisma.ClientUpdateInput = {};

    if (data.clientName) {
      clientUpdateData.name = data.clientName;
    }
    if (data.clientEmail !== undefined) {
      clientUpdateData.email = data.clientEmail || null;
    }
    if (data.clientPhone !== undefined) {
      clientUpdateData.phone = data.clientPhone || null;
    }

    await prisma.client.update({
      where: { id: existingAppointment.clientId },
      data: clientUpdateData,
    });
  }

  // Actualizar el turno
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          id: true,
          externalId: true,
          name: true,
          duration: true,
          price: true,
        },
      },
      professional: {
        select: {
          id: true,
          externalId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  Logger.info("Turno actualizado exitosamente", { appointmentId });

  return toResponseDTO(updatedAppointment);
}

/**
 * Cancela un turno
 */
export async function cancelAppointment(
  userId: string,
  appointmentId: string,
  reason?: string,
): Promise<AppointmentResponseDTO> {
  Logger.info("Cancelando turno", { userId, appointmentId });

  return updateAppointment(userId, appointmentId, {
    status: "cancelled",
    cancelledReason: reason,
  });
}

/**
 * Marca un turno como completado
 */
export async function completeAppointment(
  userId: string,
  appointmentId: string,
): Promise<AppointmentResponseDTO> {
  Logger.info("Completando turno", { userId, appointmentId });

  return updateAppointment(userId, appointmentId, {
    status: "completed",
  });
}
