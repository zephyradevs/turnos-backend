import prisma from "../../config/database";
import { DeleteClientResponseDTO } from "../../types/client.types";
import { Logger } from "../../utils/logger";

/**
 * Realiza un borrado lógico de un cliente del negocio,
 * marcando el campo `deletedAt` con la fecha actual.
 *
 * El cliente y su historial de turnos se preservan en la base de datos
 * pero dejan de aparecer en las consultas de clientes activos.
 */
export async function deleteClient(
  userId: string,
  clientId: string,
): Promise<DeleteClientResponseDTO | null> {
  Logger.info("Eliminando cliente (borrado lógico)", { userId, clientId });

  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Verificar que el cliente existe, pertenece al negocio y no está ya eliminado
  const existing = await prisma.client.findFirst({
    where: {
      id: clientId,
      businessId: business.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  // Verificar que el cliente no tenga turnos pendientes o confirmados
  const pendingAppointments = await prisma.appointment.count({
    where: {
      clientId,
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      date: { gte: new Date() },
    },
  });

  if (pendingAppointments > 0) {
    throw new Error("CLIENT_HAS_PENDING_APPOINTMENTS");
  }

  const now = new Date();

  const deleted = await prisma.client.update({
    where: { id: clientId },
    data: { deletedAt: now },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  Logger.info("Cliente eliminado exitosamente (borrado lógico)", { clientId });

  return {
    id: deleted.id,
    deletedAt: deleted.deletedAt!.toISOString(),
  };
}
