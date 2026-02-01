import prisma from "../../config/database";
import { Logger } from "../../utils/logger";

/**
 * Resultado de eliminar un turno
 */
interface DeleteAppointmentResult {
  success: boolean;
  appointmentId: string;
}

/**
 * Elimina un turno de forma permanente
 *
 * NOTA: En la mayoría de casos es preferible usar cancelAppointment
 * para mantener el historial. Esta función es para casos especiales
 * donde se necesita eliminar completamente el registro.
 */
export async function deleteAppointment(
  userId: string,
  appointmentId: string,
): Promise<DeleteAppointmentResult> {
  Logger.info("Eliminando turno", { userId, appointmentId });

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
    select: { id: true },
  });

  if (!existingAppointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  // Eliminar el turno
  await prisma.appointment.delete({
    where: { id: appointmentId },
  });

  Logger.info("Turno eliminado exitosamente", { appointmentId });

  return {
    success: true,
    appointmentId,
  };
}
