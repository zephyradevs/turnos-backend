import { Prisma } from "@prisma/client";
import prisma from "../../config/database";
import {
  ClientWithAppointmentsDTO,
  ClientAppointmentDTO,
} from "../../types/client.types";
import { PRISMA_STATUS_MAP } from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

/**
 * Devuelve un cliente del negocio por su ID, incluyendo su historial de turnos
 * ordenado del más reciente al más antiguo.
 */
export async function getClientById(
  userId: string,
  clientId: string,
): Promise<ClientWithAppointmentsDTO | null> {
  Logger.info("Obteniendo cliente por ID", { userId, clientId });

  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      businessId: business.id,
      deletedAt: null,
    },
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
      appointments: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          notes: true,
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
      },
    },
  });

  if (!client) {
    return null;
  }

  Logger.info("Cliente obtenido exitosamente", { clientId });

  return toResponseDTO(client);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ClientQueryResult = Prisma.ClientGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    createdAt: true;
    updatedAt: true;
    _count: { select: { appointments: true } };
    appointments: {
      select: {
        id: true;
        date: true;
        startTime: true;
        endTime: true;
        status: true;
        notes: true;
        createdAt: true;
        service: {
          select: { id: true; name: true; duration: true; price: true };
        };
        professional: { select: { id: true; firstName: true; lastName: true } };
      };
    };
  };
}>;

function toAppointmentDTO(
  appointment: ClientQueryResult["appointments"][number],
): ClientAppointmentDTO {
  return {
    id: appointment.id,
    date: appointment.date.toISOString().split("T")[0],
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: PRISMA_STATUS_MAP[appointment.status] || "pending",
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
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
  };
}

function toResponseDTO(client: ClientQueryResult): ClientWithAppointmentsDTO {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    totalAppointments: client._count.appointments,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    appointments: client.appointments.map(toAppointmentDTO),
  };
}
