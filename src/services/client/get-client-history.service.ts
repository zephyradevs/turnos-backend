import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from "@prisma/client";
import prisma from "../../config/database";
import {
  ClientHistoryDTO,
  ClientHistoryFiltersDTO,
  ClientHistoryAppointmentDTO,
  ClientHistorySummaryDTO,
  ClientResponseDTO,
} from "../../types/client.types";
import {
  PRISMA_STATUS_MAP,
  APPOINTMENT_STATUS_MAP,
} from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Devuelve el historial completo de turnos de un cliente, con filtros,
 * paginación y un resumen estadístico general.
 */
export async function getClientHistory(
  userId: string,
  clientId: string,
  filters: ClientHistoryFiltersDTO = {},
): Promise<ClientHistoryDTO | null> {
  Logger.info("Obteniendo historial del cliente", {
    userId,
    clientId,
    filters,
  });

  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Verificar que el cliente pertenece al negocio y no está eliminado
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: business.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { appointments: true } },
    },
  });

  if (!client) {
    return null;
  }

  const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
  const limit = Math.min(100, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  // Construir filtro de appointments
  const appointmentWhere = buildAppointmentWhere(clientId, filters);

  // Ejecutar consultas en paralelo: appointments paginados, conteo y resumen
  const [appointments, total, summary] = await Promise.all([
    prisma.appointment.findMany({
      where: appointmentWhere,
      skip,
      take: limit,
      orderBy: buildOrderBy(filters.sortBy, filters.sortOrder),
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        duration: true,
        price: true,
        status: true,
        notes: true,
        cancelledAt: true,
        cancelledReason: true,
        completedAt: true,
        createdAt: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        professional: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.appointment.count({ where: appointmentWhere }),
    buildSummary(clientId),
  ]);

  Logger.info("Historial del cliente obtenido exitosamente", {
    clientId,
    total,
    page,
    returned: appointments.length,
  });

  return {
    client: toClientDTO(client),
    summary,
    appointments: appointments.map(toAppointmentDTO),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

function buildAppointmentWhere(
  clientId: string,
  filters: ClientHistoryFiltersDTO,
): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = { clientId };

  // Filtro por estado
  if (filters.status) {
    const prismaStatus = APPOINTMENT_STATUS_MAP[filters.status];
    if (prismaStatus) {
      where.status = prismaStatus as PrismaAppointmentStatus;
    }
  }

  // Filtro por rango de fechas
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo);
    }
  }

  return where;
}

// ---------------------------------------------------------------------------
// Ordenamiento
// ---------------------------------------------------------------------------

function buildOrderBy(
  sortBy?: ClientHistoryFiltersDTO["sortBy"],
  sortOrder: ClientHistoryFiltersDTO["sortOrder"] = "desc",
): Prisma.AppointmentOrderByWithRelationInput {
  const direction = sortOrder === "asc" ? "asc" : "desc";

  switch (sortBy) {
    case "status":
      return { status: direction };
    case "price":
      return { price: direction };
    case "date":
    default:
      return { date: direction };
  }
}

// ---------------------------------------------------------------------------
// Resumen estadístico (sin filtros, sobre TODOS los turnos del cliente)
// ---------------------------------------------------------------------------

async function buildSummary(
  clientId: string,
): Promise<ClientHistorySummaryDTO> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [counts, totalSpentResult, upcomingCount] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["status"],
      where: { clientId },
      _count: { id: true },
    }),
    prisma.appointment.aggregate({
      where: {
        clientId,
        status: { in: ["COMPLETED", "CONFIRMED", "IN_PROGRESS"] },
      },
      _sum: { price: true },
    }),
    prisma.appointment.count({
      where: {
        clientId,
        date: { gte: today },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
  ]);

  const statusCounts = counts.reduce<Record<string, number>>((acc, group) => {
    acc[group.status] = group._count.id;
    return acc;
  }, {});

  const totalAppointments = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return {
    totalAppointments,
    completedAppointments: statusCounts["COMPLETED"] ?? 0,
    cancelledAppointments: statusCounts["CANCELLED"] ?? 0,
    noShowAppointments: statusCounts["NO_SHOW"] ?? 0,
    upcomingAppointments: upcomingCount,
    totalSpent: totalSpentResult._sum.price
      ? Number(totalSpentResult._sum.price)
      : 0,
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

type AppointmentQueryResult = Prisma.AppointmentGetPayload<{
  select: {
    id: true;
    date: true;
    startTime: true;
    endTime: true;
    duration: true;
    price: true;
    status: true;
    notes: true;
    cancelledAt: true;
    cancelledReason: true;
    completedAt: true;
    createdAt: true;
    service: {
      select: { id: true; name: true; duration: true; price: true };
    };
    professional: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

function toAppointmentDTO(
  appointment: AppointmentQueryResult,
): ClientHistoryAppointmentDTO {
  return {
    id: appointment.id,
    date: appointment.date.toISOString().split("T")[0],
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: appointment.duration,
    price: appointment.price ? Number(appointment.price) : null,
    status: PRISMA_STATUS_MAP[appointment.status] || "pending",
    notes: appointment.notes,
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    cancelledReason: appointment.cancelledReason,
    completedAt: appointment.completedAt?.toISOString() ?? null,
    createdAt: appointment.createdAt.toISOString(),
    service: {
      id: appointment.service?.id ?? "",
      name: appointment.service?.name ?? "",
      duration: appointment.service?.duration ?? 0,
      price: appointment.service?.price
        ? Number(appointment.service.price)
        : null,
    },
    professional: {
      id: appointment.professional.id,
      firstName: appointment.professional.firstName,
      lastName: appointment.professional.lastName,
    },
  };
}

type ClientQueryResult = Prisma.ClientGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    createdAt: true;
    updatedAt: true;
    _count: { select: { appointments: true } };
  };
}>;

function toClientDTO(client: ClientQueryResult): ClientResponseDTO {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    totalAppointments: client._count.appointments,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
