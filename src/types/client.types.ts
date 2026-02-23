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
