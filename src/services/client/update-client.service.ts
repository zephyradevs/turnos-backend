import prisma from "../../config/database";
import { UpdateClientDTO, ClientResponseDTO } from "../../types/client.types";
import { Logger } from "../../utils/logger";

/**
 * Actualiza los datos de un cliente del negocio.
 * Solo se modifican los campos proporcionados en el DTO.
 */
export async function updateClient(
  userId: string,
  clientId: string,
  data: UpdateClientDTO,
): Promise<ClientResponseDTO | null> {
  Logger.info("Actualizando cliente", { userId, clientId, data });

  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  // Verificar que el cliente existe, pertenece al negocio y no está eliminado
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

  // Validar unicidad de email dentro del negocio (si se está cambiando)
  if (data.email !== undefined && data.email !== null) {
    const emailTaken = await prisma.client.findFirst({
      where: {
        businessId: business.id,
        email: data.email,
        id: { not: clientId },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (emailTaken) {
      throw new Error("CLIENT_EMAIL_ALREADY_EXISTS");
    }
  }

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
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

  Logger.info("Cliente actualizado exitosamente", { clientId });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    totalAppointments: updated._count.appointments,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}
