import { Prisma } from "@prisma/client";
import prisma from "../../config/database";
import {
  TodayDashboardDTO,
  UpcomingAppointmentDTO,
  DayStatsDTO,
  ProfessionalStatsDTO,
  PopularServiceDTO,
  BusinessHoursDTO,
} from "../../types/dashboard.types";
import { AppointmentResponseDTO } from "../../types/appointment.types";
import { PRISMA_STATUS_MAP } from "../../types/appointment.types";
import { Logger } from "../../utils/logger";

/**
 * Tipo para el turno con todas las relaciones incluidas
 */
type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    client: true;
    service: true;
    professional: true;
  };
}>;

/**
 * Formatea el tiempo restante hasta un turno
 */
const formatTimeUntil = (minutes: number): string => {
  if (minutes <= 0) return "Ahora";
  if (minutes < 60) return `En ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `En ${hours}h`;
  return `En ${hours}h ${mins}min`;
};

/**
 * Convierte un turno de Prisma a DTO de respuesta
 */
function toResponseDTO(
  appointment: AppointmentWithRelations,
): AppointmentResponseDTO {
  return {
    id: appointment.id,
    client: {
      id: appointment.client.id,
      name: appointment.client.name,
      email: appointment.client.email,
      phone: appointment.client.phone,
    },
    service: {
      id: appointment.service.id,
      externalId: appointment.service.externalId,
      name: appointment.service.name,
      duration: appointment.service.duration,
      price: appointment.service.price
        ? Number(appointment.service.price)
        : null,
    },
    professional: {
      id: appointment.professional.id,
      externalId: appointment.professional.externalId,
      firstName: appointment.professional.firstName,
      lastName: appointment.professional.lastName,
    },
    date: appointment.date.toISOString().split("T")[0],
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: appointment.duration,
    status: PRISMA_STATUS_MAP[appointment.status] || "pending",
    price: appointment.price ? Number(appointment.price) : null,
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    cancelledAt: appointment.cancelledAt?.toISOString() || null,
    cancelledReason: appointment.cancelledReason,
    completedAt: appointment.completedAt?.toISOString() || null,
  };
}

/**
 * Parsea una fecha y hora en formato string a Date
 */
function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

/**
 * Obtiene el rango de fechas del día actual
 */
function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Verifica si el negocio está abierto en un momento dado
 */
function isBusinessOpen(
  currentTime: Date,
  openTime: string,
  closeTime: string,
): boolean {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const [openHour, openMinute] = openTime.split(":").map(Number);
  const openTotalMinutes = openHour * 60 + openMinute;

  const [closeHour, closeMinute] = closeTime.split(":").map(Number);
  const closeTotalMinutes = closeHour * 60 + closeMinute;

  return (
    currentTotalMinutes >= openTotalMinutes &&
    currentTotalMinutes < closeTotalMinutes
  );
}

/**
 * Obtiene toda la información del dashboard de hoy
 */
export async function getTodayDashboard(
  userId: string,
): Promise<TodayDashboardDTO | null> {
  Logger.info("Obteniendo dashboard de hoy", { userId });

  // Obtener el negocio del usuario
  const business = await prisma.business.findUnique({
    where: { userId },
    select: {
      id: true,
      globalOpenTime: true,
      globalCloseTime: true,
      useIndividualSchedule: true,
    },
  });

  if (!business) {
    Logger.warn("Negocio no encontrado", { userId });
    return null;
  }

  const currentTime = new Date();
  const { start, end } = getTodayRange();

  // Obtener todos los turnos del día con sus relaciones
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      client: true,
      service: true,
      professional: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // Obtener todos los profesionales del negocio
  const professionals = await prisma.professional.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });

  // Obtener todos los servicios del negocio
  const services = await prisma.service.findMany({
    where: { businessId: business.id },
  });

  // Obtener horarios de operación para determinar apertura/cierre
  const operatingHours = await prisma.operatingHours.findMany({
    where: { businessId: business.id },
  });

  // Convertir turnos a DTOs
  const appointmentDTOs = appointments.map(toResponseDTO);

  // ========================================
  // CALCULAR PRÓXIMOS TURNOS
  // ========================================
  const upcomingAppointments: UpcomingAppointmentDTO[] = appointmentDTOs
    .filter((apt) => {
      const aptDateTime = parseDateTime(apt.date, apt.startTime);
      return (
        aptDateTime > currentTime &&
        apt.status !== "cancelled" &&
        apt.status !== "completed"
      );
    })
    .map((apt, index) => {
      const aptDateTime = parseDateTime(apt.date, apt.startTime);
      const diffMs = aptDateTime.getTime() - currentTime.getTime();
      const minutesUntil = Math.floor(diffMs / 60000);

      return {
        ...apt,
        timeUntil: formatTimeUntil(minutesUntil),
        minutesUntil,
        isNext: index === 0,
        isUrgent: minutesUntil <= 30,
      };
    })
    .sort((a, b) => a.minutesUntil - b.minutesUntil);

  // ========================================
  // CALCULAR ESTADÍSTICAS DEL DÍA
  // ========================================
  const pastAppointments = appointmentDTOs.filter((apt) => {
    const aptEndTime = parseDateTime(apt.date, apt.endTime);
    return aptEndTime < currentTime && apt.status !== "cancelled";
  });

  const dayStats: DayStatsDTO = {
    totalAppointments: appointmentDTOs.length,
    confirmed: appointmentDTOs.filter((a) => a.status === "confirmed").length,
    pending: appointmentDTOs.filter((a) => a.status === "pending").length,
    completed: appointmentDTOs.filter((a) => a.status === "completed").length,
    cancelled: appointmentDTOs.filter((a) => a.status === "cancelled").length,
    totalRevenue: 0,
    collectedRevenue: 0,
    occupancyRate: 0,
  };

  // Calcular ingresos totales del día (solo turnos confirmados y completados)
  dayStats.totalRevenue = appointmentDTOs
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce((sum, apt) => sum + (apt.service.price || 0), 0);

  // Calcular ingresos recaudados (turnos que ya pasaron)
  dayStats.collectedRevenue = pastAppointments.reduce(
    (sum, apt) => sum + (apt.service.price || 0),
    0,
  );

  // Calcular tasa de ocupación
  // Asumiendo horario estándar de 9 horas con slots de 30 minutos
  const totalSlots = 9 * 2 * professionals.length; // 9 horas * 2 slots/hora * profesionales
  const occupiedSlots = appointmentDTOs.filter(
    (a) => a.status !== "cancelled",
  ).length;
  dayStats.occupancyRate =
    totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // ========================================
  // ESTADÍSTICAS POR PROFESIONAL
  // ========================================
  const professionalStats: ProfessionalStatsDTO[] = professionals.map(
    (prof) => {
      const profAppointments = appointmentDTOs.filter(
        (a) => a.professional.id === prof.id && a.status !== "cancelled",
      );

      // Encontrar el próximo turno del profesional
      const nextApt =
        profAppointments
          .filter((apt) => {
            const aptDateTime = parseDateTime(apt.date, apt.startTime);
            return aptDateTime > currentTime;
          })
          .sort((a, b) => {
            const dateA = parseDateTime(a.date, a.startTime);
            const dateB = parseDateTime(b.date, b.startTime);
            return dateA.getTime() - dateB.getTime();
          })[0] || null;

      // Verificar si está ocupado ahora
      const currentApt = profAppointments.find((apt) => {
        const startDateTime = parseDateTime(apt.date, apt.startTime);
        const endDateTime = parseDateTime(apt.date, apt.endTime);
        return startDateTime <= currentTime && endDateTime > currentTime;
      });

      const isAvailable = !currentApt;

      return {
        professional: {
          id: prof.id,
          externalId: prof.externalId,
          firstName: prof.firstName,
          lastName: prof.lastName,
        },
        appointmentsToday: profAppointments.length,
        nextAppointment: nextApt,
        isAvailable,
        currentStatus: currentApt ? "busy" : "available",
      };
    },
  );

  // ========================================
  // SERVICIOS MÁS POPULARES
  // ========================================
  const serviceCount: Record<string, number> = {};

  appointmentDTOs
    .filter((a) => a.status !== "cancelled")
    .forEach((apt) => {
      serviceCount[apt.service.id] = (serviceCount[apt.service.id] || 0) + 1;
    });

  const total = Object.values(serviceCount).reduce(
    (sum, count) => sum + count,
    0,
  );

  const popularServices: PopularServiceDTO[] = Object.entries(serviceCount)
    .map(([serviceId, count]) => {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return null;

      return {
        service: {
          id: service.id,
          externalId: service.externalId,
          name: service.name,
          duration: service.duration,
          price: service.price ? Number(service.price) : null,
        },
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .filter((item): item is PopularServiceDTO => item !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // ========================================
  // HORARIOS DEL NEGOCIO
  // ========================================
  const dayOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][currentTime.getDay()];

  const todayOperatingHours = operatingHours.find(
    (oh) => oh.dayOfWeek === dayOfWeek && oh.enabled,
  );

  const openTime =
    todayOperatingHours?.openTime || business.globalOpenTime || "09:00";
  const closeTime =
    todayOperatingHours?.closeTime || business.globalCloseTime || "18:00";

  const businessHours: BusinessHoursDTO = {
    openTime,
    closeTime,
    isOpen: isBusinessOpen(currentTime, openTime, closeTime),
  };

  Logger.info("Dashboard de hoy obtenido exitosamente", {
    userId,
    businessId: business.id,
    totalAppointments: dayStats.totalAppointments,
    upcomingCount: upcomingAppointments.length,
  });

  return {
    currentTime: currentTime.toISOString(),
    upcomingAppointments,
    dayStats,
    professionalStats,
    popularServices,
    businessHours,
  };
}
