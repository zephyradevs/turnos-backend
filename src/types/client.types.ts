import { AppointmentStatus } from "./appointment.types";

// ==========================================
// DTOs para clientes
// ==========================================

/**
 * DTO de respuesta básica de un cliente
 */
export interface ClientResponseDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalAppointments: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO de respuesta de un cliente con su historial de turnos
 */
export interface ClientWithAppointmentsDTO extends ClientResponseDTO {
  appointments: ClientAppointmentDTO[];
}

/**
 * DTO de turno resumido en el contexto de un cliente
 */
export interface ClientAppointmentDTO {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number | null;
  };
  professional: {
    id: string;
    firstName: string;
    lastName: string;
  };
  notes: string | null;
  createdAt: string;
}

/**
 * DTO para filtros de búsqueda de clientes
 */
export interface ClientFiltersDTO {
  // Búsqueda por texto (nombre o email)
  search?: string;

  // Paginación
  page?: number;
  limit?: number;

  // Ordenamiento
  sortBy?: "name" | "createdAt" | "totalAppointments";
  sortOrder?: "asc" | "desc";
}

/**
 * DTO para respuesta paginada de clientes
 */
export interface PaginatedClientsDTO {
  clients: ClientResponseDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==========================================
// DTOs para historial de cliente
// ==========================================

/**
 * DTO de un turno detallado en el historial del cliente
 */
export interface ClientHistoryAppointmentDTO {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number | null;
  status: AppointmentStatus;
  notes: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
  createdAt: string;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number | null;
  };
  professional: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Resumen estadístico del historial del cliente
 */
export interface ClientHistorySummaryDTO {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  upcomingAppointments: number;
  totalSpent: number;
}

/**
 * Filtros para el historial de turnos de un cliente
 */
export interface ClientHistoryFiltersDTO {
  // Filtro por estado
  status?: AppointmentStatus;

  // Filtro por rango de fechas
  dateFrom?: string; // Formato: YYYY-MM-DD
  dateTo?: string; // Formato: YYYY-MM-DD

  // Paginación
  page?: number;
  limit?: number;

  // Ordenamiento
  sortBy?: "date" | "status" | "price";
  sortOrder?: "asc" | "desc";
}

/**
 * DTO de respuesta del historial completo de un cliente
 */
export interface ClientHistoryDTO {
  client: ClientResponseDTO;
  summary: ClientHistorySummaryDTO;
  appointments: ClientHistoryAppointmentDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==========================================
// DTOs para edición y eliminación de cliente
// ==========================================

/**
 * DTO para actualizar los datos de un cliente
 */
export interface UpdateClientDTO {
  name?: string;
  email?: string | null;
  phone?: string | null;
}

/**
 * DTO de respuesta tras eliminar (borrado lógico) un cliente
 */
export interface DeleteClientResponseDTO {
  id: string;
  deletedAt: string;
}
