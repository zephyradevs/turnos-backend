import {
  Appointment,
  AppointmentStatus as PrismaAppointmentStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/database";
import {
  AppointmentFiltersDTO,
  AppointmentResponseDTO,
  PaginatedAppointmentsDTO,
  PRISMA_STATUS_MAP,
  APPOINTMENT_STATUS_MAP,
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
 * Obtener turnos con filtros y paginación
 */
export async function getAppointments(
  userId: string,
  filters: AppointmentFiltersDTO = {},
): Promise<PaginatedAppointmentsDTO> {
  Logger.info("Obteniendo turnos", { userId, filters });

  // Obtener el negocio del usuario
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Construir condiciones de búsqueda
  const where: Prisma.AppointmentWhereInput = {
    businessId: business.id,
  };

  // Filtro por rango de fechas
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.date.lte = new Date(filters.endDate);
    }
  }

  // Filtro por profesional (usando externalId)
  if (filters.professionalId) {
    const professional = await prisma.professional.findFirst({
      where: {
        businessId: business.id,
        externalId: filters.professionalId,
      },
      select: { id: true },
    });
    if (professional) {
      where.professionalId = professional.id;
    }
  }

  // Filtro por servicio (usando externalId)
  if (filters.serviceId) {
    const service = await prisma.service.findFirst({
      where: {
        businessId: business.id,
        externalId: filters.serviceId,
      },
      select: { id: true },
    });
    if (service) {
      where.serviceId = service.id;
    }
  }

  // Filtro por cliente
  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  // Filtro por estado
  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    const prismaStatuses = statuses.map(
      (s) => APPOINTMENT_STATUS_MAP[s] as PrismaAppointmentStatus,
    );
    where.status = { in: prismaStatuses };
  }

  // Paginación
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  // Ordenamiento
  const orderBy: Prisma.AppointmentOrderByWithRelationInput = {};
  const sortField = filters.sortBy || "date";
  const sortOrder = filters.sortOrder || "asc";

  if (sortField === "date") {
    orderBy.date = sortOrder;
  } else if (sortField === "createdAt") {
    orderBy.createdAt = sortOrder;
  } else if (sortField === "status") {
    orderBy.status = sortOrder;
  }

  // Consultar turnos y total
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
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
      orderBy: [orderBy, { startTime: "asc" }],
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  Logger.info("Turnos obtenidos", {
    count: appointments.length,
    total,
    page,
  });

  return {
    appointments: appointments.map(toResponseDTO),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Obtener un turno específico por ID
 */
export async function getAppointmentById(
  userId: string,
  appointmentId: string,
): Promise<AppointmentResponseDTO | null> {
  Logger.info("Obteniendo turno por ID", { userId, appointmentId });

  // Obtener el negocio del usuario
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      businessId: business.id,
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

  if (!appointment) {
    return null;
  }

  return toResponseDTO(appointment);
}
