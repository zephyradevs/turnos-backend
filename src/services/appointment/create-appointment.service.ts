import {
  Appointment,
  AppointmentStatus as PrismaAppointmentStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/database";
import {
  CreateAppointmentDTO,
  AppointmentResponseDTO,
  APPOINTMENT_STATUS_MAP,
  PRISMA_STATUS_MAP,
  PRISMA_TYPE_MAP,
  calculateEndTime,
} from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

/**
 * Tipo para el turno con todas las relaciones incluidas (nullable para bloqueos)
 */
type AppointmentWithRelations = Appointment & {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  service: {
    id: string;
    externalId: string;
    name: string;
    duration: number;
    price: Prisma.Decimal | null;
  } | null;
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
    type: PRISMA_TYPE_MAP[appointment.type] || "appointment",
    client: appointment.client
      ? {
          id: appointment.client.id,
          name: appointment.client.name,
          email: appointment.client.email,
          phone: appointment.client.phone,
        }
      : null,
    service: appointment.service
      ? {
          id: appointment.service.id,
          externalId: appointment.service.externalId,
          name: appointment.service.name,
          duration: appointment.service.duration,
          price: appointment.service.price
            ? Number(appointment.service.price)
            : null,
        }
      : null,
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
 * Resultado de crear un turno
 */
interface CreateAppointmentResult {
  appointment: AppointmentResponseDTO;
  isNewClient: boolean;
}

/**
 * Verifica que no haya solapamiento de horarios para un profesional en una fecha dada.
 * Considera tanto turnos normales como bloqueos de horario.
 */
async function checkTimeSlotOverlap(
  professionalId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const whereCondition: Prisma.AppointmentWhereInput = {
    professionalId,
    date,
    status: {
      notIn: ["CANCELLED", "NO_SHOW"],
    },
    OR: [
      // Nuevo turno empieza durante uno existente
      {
        startTime: { lte: startTime },
        endTime: { gt: startTime },
      },
      // Nuevo turno termina durante uno existente
      {
        startTime: { lt: endTime },
        endTime: { gte: endTime },
      },
      // Nuevo turno contiene completamente uno existente
      {
        startTime: { gte: startTime },
        endTime: { lte: endTime },
      },
    ],
  };

  // Excluir un turno específico (útil para actualizaciones)
  if (excludeAppointmentId) {
    whereCondition.id = { not: excludeAppointmentId };
  }

  const existingAppointment = await prisma.appointment.findFirst({
    where: whereCondition,
    select: { id: true },
  });

  return !!existingAppointment;
}

/**
 * Crea un bloqueo de horario para un profesional
 */
async function createBlock(
  businessId: string,
  professionalInternalId: string,
  data: CreateAppointmentDTO,
  appointmentDate: Date,
  endTime: string,
): Promise<AppointmentWithRelations> {
  // Calcular duración en minutos
  const [startH, startM] = data.startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const duration =
    data.duration || endH * 60 + endM - (startH * 60 + startM);

  const block = await prisma.appointment.create({
    data: {
      business: { connect: { id: businessId } },
      professional: { connect: { id: professionalInternalId } },
      type: "BLOCK",
      date: appointmentDate,
      startTime: data.startTime,
      endTime: endTime,
      duration,
      price: null,
      status: "CONFIRMED" as PrismaAppointmentStatus,
      notes: data.notes || null,
    },
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

  return block as AppointmentWithRelations;
}

/**
 * Crea un nuevo turno (appointment) para el negocio del usuario
 */
async function createRegularAppointment(
  businessId: string,
  professionalInternalId: string,
  data: CreateAppointmentDTO,
  appointmentDate: Date,
): Promise<{ appointment: AppointmentWithRelations; isNewClient: boolean }> {
  // Buscar el servicio por externalId
  const service = await prisma.service.findFirst({
    where: {
      businessId,
      externalId: data.serviceId!,
    },
    select: {
      id: true,
      duration: true,
      price: true,
    },
  });

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  // Calcular hora de fin si no viene del frontend
  const endTime =
    data.endTime || calculateEndTime(data.startTime, service.duration);

  // Verificar solapamiento
  const hasOverlap = await checkTimeSlotOverlap(
    professionalInternalId,
    appointmentDate,
    data.startTime,
    endTime,
  );

  if (hasOverlap) {
    throw new Error("TIME_SLOT_NOT_AVAILABLE");
  }

  // Determinar el estado del turno
  const status = data.status
    ? (APPOINTMENT_STATUS_MAP[data.status] as PrismaAppointmentStatus)
    : ("CONFIRMED" as PrismaAppointmentStatus);

  // Usar transacción para crear cliente (si es necesario) y turno
  const result = await prisma.$transaction(async (tx) => {
    let isNewClient = false;
    let client;

    // Buscar cliente existente por email (si tiene email) o crear uno nuevo
    if (data.clientEmail) {
      client = await tx.client.findFirst({
        where: {
          businessId,
          email: data.clientEmail,
        },
      });
    }

    if (!client) {
      // Crear nuevo cliente
      client = await tx.client.create({
        data: {
          businessId,
          name: data.clientName!,
          email: data.clientEmail || null,
          phone: data.clientPhone || null,
        },
      });
      isNewClient = true;
    } else {
      // Actualizar datos del cliente si han cambiado
      const updateData: { name?: string; phone?: string | null } = {};

      if (client.name !== data.clientName) {
        updateData.name = data.clientName;
      }
      if (data.clientPhone && client.phone !== data.clientPhone) {
        updateData.phone = data.clientPhone;
      }

      if (Object.keys(updateData).length > 0) {
        client = await tx.client.update({
          where: { id: client.id },
          data: updateData,
        });
      }
    }

    // Crear el turno
    const appointment = await tx.appointment.create({
      data: {
        business: { connect: { id: businessId } },
        client: { connect: { id: client.id } },
        professional: { connect: { id: professionalInternalId } },
        service: { connect: { id: service.id } },
        type: "APPOINTMENT",
        date: appointmentDate,
        startTime: data.startTime,
        endTime: endTime,
        duration: service.duration,
        price: service.price,
        status: status,
        notes: data.notes || null,
      },
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

    return {
      appointment: appointment as AppointmentWithRelations,
      isNewClient,
    };
  });

  return result;
}

/**
 * Crea un nuevo turno o bloqueo de horario para el negocio del usuario
 */
export async function createAppointment(
  userId: string,
  data: CreateAppointmentDTO,
): Promise<CreateAppointmentResult> {
  const appointmentType = data.type || "appointment";

  Logger.info("Creando registro en agenda", { userId, type: appointmentType });

  // Obtener el negocio del usuario
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Buscar el profesional por externalId
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

  // Parsear la fecha
  const appointmentDate = new Date(data.date);
  if (isNaN(appointmentDate.getTime())) {
    throw new Error("INVALID_DATE");
  }

  // ========================================
  // FLUJO: BLOQUEO DE HORARIO
  // ========================================
  if (appointmentType === "block") {
    if (!data.endTime) {
      throw new Error("BLOCK_END_TIME_REQUIRED");
    }

    // Verificar solapamiento (bloqueos también colisionan con turnos y otros bloqueos)
    const hasOverlap = await checkTimeSlotOverlap(
      professional.id,
      appointmentDate,
      data.startTime,
      data.endTime,
    );

    if (hasOverlap) {
      throw new Error("TIME_SLOT_NOT_AVAILABLE");
    }

    const block = await createBlock(
      business.id,
      professional.id,
      data,
      appointmentDate,
      data.endTime,
    );

    Logger.info("Bloqueo de horario creado exitosamente", {
      blockId: block.id,
    });

    return {
      appointment: toResponseDTO(block),
      isNewClient: false,
    };
  }

  // ========================================
  // FLUJO: TURNO NORMAL (APPOINTMENT)
  // ========================================
  if (!data.clientName?.trim()) {
    throw new Error("CLIENT_NAME_REQUIRED");
  }

  if (!data.serviceId) {
    throw new Error("SERVICE_REQUIRED");
  }

  const result = await createRegularAppointment(
    business.id,
    professional.id,
    data,
    appointmentDate,
  );

  Logger.info("Turno creado exitosamente", {
    appointmentId: result.appointment.id,
    isNewClient: result.isNewClient,
  });

  return {
    appointment: toResponseDTO(result.appointment),
    isNewClient: result.isNewClient,
  };
}

export { checkTimeSlotOverlap };
