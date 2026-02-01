// ==========================================
// DTOs para turnos/citas
// ==========================================

/**
 * Estados posibles de un turno
 */
export type AppointmentStatus =
  | "pending" // Pendiente de confirmación
  | "confirmed" // Confirmado
  | "in_progress" // En progreso
  | "completed" // Completado
  | "cancelled" // Cancelado
  | "no_show"; // Cliente no asistió

/**
 * Mapeo de estados del frontend a estados de Prisma
 */
export const APPOINTMENT_STATUS_MAP: Record<AppointmentStatus, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  no_show: "NO_SHOW",
};

/**
 * Mapeo inverso de estados de Prisma a estados del frontend
 */
export const PRISMA_STATUS_MAP: Record<string, AppointmentStatus> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

/**
 * DTO para datos del cliente en el turno
 */
export interface AppointmentClientDTO {
  name: string;
  email?: string;
  phone?: string;
}

/**
 * DTO para crear un nuevo turno
 */
export interface CreateAppointmentDTO {
  // Datos del cliente
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;

  // IDs de relaciones (externalId del frontend)
  serviceId: string;
  professionalId: string;

  // Fecha y hora
  date: string; // Formato: YYYY-MM-DD
  startTime: string; // Formato: HH:mm
  endTime: string; // Formato: HH:mm

  // Opcionales
  notes?: string;
  status?: AppointmentStatus;
}

/**
 * DTO para actualizar un turno existente
 */
export interface UpdateAppointmentDTO {
  // Datos del cliente (opcionales para actualización)
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;

  // IDs de relaciones (externalId del frontend)
  serviceId?: string;
  professionalId?: string;

  // Fecha y hora
  date?: string;
  startTime?: string;
  endTime?: string;

  // Estado y notas
  notes?: string;
  status?: AppointmentStatus;

  // Para cancelación
  cancelledReason?: string;
}

/**
 * DTO de respuesta para un turno
 */
export interface AppointmentResponseDTO {
  id: string;

  // Información del cliente
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };

  // Información del servicio
  service: {
    id: string;
    externalId: string;
    name: string;
    duration: number;
    price: number | null;
  };

  // Información del profesional
  professional: {
    id: string;
    externalId: string;
    firstName: string;
    lastName: string;
  };

  // Fecha y hora
  date: string;
  startTime: string;
  endTime: string;
  duration: number;

  // Estado
  status: AppointmentStatus;

  // Precio al momento de la reserva
  price: number | null;

  // Notas
  notes: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Información de cancelación (si aplica)
  cancelledAt: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
}

/**
 * DTO para filtros de búsqueda de turnos
 */
export interface AppointmentFiltersDTO {
  // Rango de fechas
  startDate?: string;
  endDate?: string;

  // Filtros específicos
  professionalId?: string;
  serviceId?: string;
  clientId?: string;
  status?: AppointmentStatus | AppointmentStatus[];

  // Paginación
  page?: number;
  limit?: number;

  // Ordenamiento
  sortBy?: "date" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

/**
 * DTO para respuesta paginada de turnos
 */
export interface PaginatedAppointmentsDTO {
  appointments: AppointmentResponseDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Validación de formato de hora HH:mm
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/**
 * Validación de formato de fecha YYYY-MM-DD
 */
export const isValidDateFormat = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Calcular hora de fin basándose en hora de inicio y duración
 */
export const calculateEndTime = (
  startTime: string,
  durationMinutes: number,
): string => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
};
