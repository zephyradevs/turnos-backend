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
 * Resultado de crear un turno
 */
interface CreateAppointmentResult {
  appointment: AppointmentResponseDTO;
  isNewClient: boolean;
}

/**
 * Crea un nuevo turno para el negocio del usuario
 */
export async function createAppointment(
  userId: string,
  data: CreateAppointmentDTO,
): Promise<CreateAppointmentResult> {
  Logger.info("Creando nuevo turno", { userId });

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

  // Buscar el servicio por externalId
  const service = await prisma.service.findFirst({
    where: {
      businessId: business.id,
      externalId: data.serviceId,
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

  // Parsear la fecha
  const appointmentDate = new Date(data.date);
  if (isNaN(appointmentDate.getTime())) {
    throw new Error("INVALID_DATE");
  }

  // Calcular hora de fin si no viene del frontend
  const endTime =
    data.endTime || calculateEndTime(data.startTime, service.duration);

  // Verificar que no haya conflicto de horarios para el profesional
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      professionalId: professional.id,
      date: appointmentDate,
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
      OR: [
        // Nuevo turno empieza durante uno existente
        {
          startTime: { lte: data.startTime },
          endTime: { gt: data.startTime },
        },
        // Nuevo turno termina durante uno existente
        {
          startTime: { lt: endTime },
          endTime: { gte: endTime },
        },
        // Nuevo turno contiene uno existente
        {
          startTime: { gte: data.startTime },
          endTime: { lte: endTime },
        },
      ],
    },
  });

  if (existingAppointment) {
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
          businessId: business.id,
          email: data.clientEmail,
        },
      });
    }

    if (!client) {
      // Crear nuevo cliente
      client = await tx.client.create({
        data: {
          businessId: business.id,
          name: data.clientName,
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
        businessId: business.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
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

    return { appointment, isNewClient };
  });

  Logger.info("Turno creado exitosamente", {
    appointmentId: result.appointment.id,
    isNewClient: result.isNewClient,
  });

  return {
    appointment: toResponseDTO(result.appointment),
    isNewClient: result.isNewClient,
  };
}
