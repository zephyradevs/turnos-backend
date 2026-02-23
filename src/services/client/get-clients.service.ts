import { Prisma } from "@prisma/client";
import prisma from "../../config/database";
import {
  ClientFiltersDTO,
  ClientResponseDTO,
  PaginatedClientsDTO,
} from "../../types/client.types";
import { Logger } from "../../utils/logger";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Devuelve la lista paginada de clientes del negocio, con soporte para
 * búsqueda por nombre/email y ordenamiento dinámico.
 */
export async function getClients(
  userId: string,
  filters: ClientFiltersDTO = {},
): Promise<PaginatedClientsDTO> {
  Logger.info("Obteniendo clientes del negocio", { userId, filters });

  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
  const limit = Math.min(100, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  // Filtro base: solo clientes del negocio
  const where: Prisma.ClientWhereInput = {
    businessId: business.id,
  };

  // Búsqueda por nombre o email (case-insensitive)
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  // Ordenamiento — para totalAppointments se ordena por conteo de relación
  const orderBy = buildOrderBy(filters.sortBy, filters.sortOrder);

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { appointments: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  Logger.info("Clientes obtenidos exitosamente", {
    total,
    page,
    limit,
    returned: clients.length,
  });

  return {
    clients: clients.map(toResponseDTO),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toResponseDTO(
  client: Prisma.ClientGetPayload<{
    select: {
      id: true;
      name: true;
      email: true;
      phone: true;
      createdAt: true;
      updatedAt: true;
      _count: { select: { appointments: true } };
    };
  }>,
): ClientResponseDTO {
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

function buildOrderBy(
  sortBy?: ClientFiltersDTO["sortBy"],
  sortOrder: ClientFiltersDTO["sortOrder"] = "asc",
): Prisma.ClientOrderByWithRelationInput {
  const direction = sortOrder === "desc" ? "desc" : "asc";

  switch (sortBy) {
    case "totalAppointments":
      return { appointments: { _count: direction } };
    case "createdAt":
      return { createdAt: direction };
    case "name":
    default:
      return { name: direction };
  }
}
