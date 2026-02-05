// ==========================================
// DTOs para el Dashboard de Hoy
// ==========================================

import { AppointmentResponseDTO } from "./appointment.types";

/**
 * Turno próximo con información adicional de tiempo
 */
export interface UpcomingAppointmentDTO extends AppointmentResponseDTO {
  timeUntil: string; // "En 30 min", "En 2h", "Ahora"
  minutesUntil: number; // Minutos hasta el turno
  isNext: boolean; // Es el próximo turno
  isUrgent: boolean; // Menos de 30 minutos
}

/**
 * Estadísticas del día
 */
export interface DayStatsDTO {
  totalAppointments: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalRevenue: number; // Ingresos totales esperados (confirmados + completados)
  collectedRevenue: number; // Ingresos ya cobrados (turnos que ya pasaron)
  occupancyRate: number; // Porcentaje de ocupación del día
}

/**
 * Estado de un profesional en el día
 */
export interface ProfessionalStatsDTO {
  professional: {
    id: string;
    externalId: string;
    firstName: string;
    lastName: string;
  };
  appointmentsToday: number;
  nextAppointment: AppointmentResponseDTO | null;
  isAvailable: boolean;
  currentStatus: "available" | "busy";
}

/**
 * Servicio popular del día
 */
export interface PopularServiceDTO {
  service: {
    id: string;
    externalId: string;
    name: string;
    duration: number;
    price: number | null;
  };
  count: number; // Cantidad de veces reservado hoy
  percentage: number; // Porcentaje del total
}

/**
 * Horarios del negocio
 */
export interface BusinessHoursDTO {
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  isOpen: boolean; // Si está abierto en este momento
}

/**
 * DTO principal del dashboard de hoy
 */
export interface TodayDashboardDTO {
  currentTime: string; // ISO timestamp
  upcomingAppointments: UpcomingAppointmentDTO[];
  dayStats: DayStatsDTO;
  professionalStats: ProfessionalStatsDTO[];
  popularServices: PopularServiceDTO[];
  businessHours: BusinessHoursDTO;
}
