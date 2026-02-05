import prisma from "../../config/database";
import {
  CompleteBusinessConfigurationDTO,
  BusinessInfoCompleteDTO,
  ProfessionalCompleteDTO,
  ServiceCompleteDTO,
  OperatingHoursCompleteDTO,
  BookingPreferencesCompleteDTO,
  CommunicationCompleteDTO,
  DayOfWeek,
  DayScheduleDTO,
  DAYS_OF_WEEK,
} from "../../types/business.types";
import { Logger } from "../../utils/logger";

/**
 * Obtiene la configuración completa del negocio con todos los detalles
 * Esta es la información que se usará en el frontend para configurar el calendario,
 * mostrar profesionales, horarios, servicios, etc.
 */
export async function getCompleteBusinessConfiguration(
  userId: string,
): Promise<CompleteBusinessConfigurationDTO | null> {
  Logger.info("Obteniendo configuración completa del negocio", { userId });

  // Buscar el negocio con todas sus relaciones
  const business = await prisma.business.findUnique({
    where: { userId },
    include: {
      professionals: {
        include: {
          schedules: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      services: {
        include: {
          professionals: {
            include: {
              professional: {
                select: {
                  id: true,
                  externalId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      operatingHours: {
        orderBy: {
          dayOfWeek: "asc",
        },
      },
      bookingPreferences: true,
      communicationSettings: true,
    },
  });

  if (!business) {
    Logger.warn("Negocio no encontrado", { userId });
    return null;
  }

  // Mapear información del negocio
  const businessInfo: BusinessInfoCompleteDTO = {
    id: business.id,
    adminName: business.adminName,
    name: business.name,
    phone: business.phone,
    address: business.address,
    city: business.city,
    province: business.province,
    logo: business.logo,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };

  // Mapear profesionales con sus horarios
  const professionals: ProfessionalCompleteDTO[] = business.professionals.map(
    (prof) => {
      // Crear objeto de horarios por día
      const scheduleDays: Record<DayOfWeek, DayScheduleDTO> = {} as Record<
        DayOfWeek,
        DayScheduleDTO
      >;

      // Mapear los horarios existentes
      for (const schedule of prof.schedules) {
        scheduleDays[schedule.dayOfWeek as DayOfWeek] = {
          enabled: schedule.enabled,
          openTime: schedule.openTime,
          closeTime: schedule.closeTime,
          duration: schedule.duration,
        };
      }

      // Asegurar que todos los días estén presentes con valores por defecto
      for (const day of DAYS_OF_WEEK) {
        if (!scheduleDays[day]) {
          scheduleDays[day] = {
            enabled: false,
            openTime: "09:00",
            closeTime: "18:00",
            duration: 30,
          };
        }
      }

      return {
        id: prof.id,
        externalId: prof.externalId,
        firstName: prof.firstName,
        lastName: prof.lastName,
        birthDate: prof.birthDate.toISOString().split("T")[0],
        dni: prof.dni,
        description: prof.description,
        useIndividualSchedule: prof.useIndividualSchedule,
        globalSchedule: prof.globalOpenTime
          ? {
              openTime: prof.globalOpenTime,
              closeTime: prof.globalCloseTime || "18:00",
              duration: prof.globalDuration || 30,
            }
          : undefined,
        schedules: {
          monday: scheduleDays.monday,
          tuesday: scheduleDays.tuesday,
          wednesday: scheduleDays.wednesday,
          thursday: scheduleDays.thursday,
          friday: scheduleDays.friday,
          saturday: scheduleDays.saturday,
          sunday: scheduleDays.sunday,
        },
        createdAt: prof.createdAt.toISOString(),
        updatedAt: prof.updatedAt.toISOString(),
      };
    },
  );

  // Mapear servicios con sus profesionales asignados
  const services: ServiceCompleteDTO[] = business.services.map((service) => ({
    id: service.id,
    externalId: service.externalId,
    name: service.name,
    duration: service.duration,
    price: service.price ? Number(service.price) : null,
    professionals: service.professionals.map((sp) => ({
      id: sp.professional.id,
      externalId: sp.professional.externalId,
      firstName: sp.professional.firstName,
      lastName: sp.professional.lastName,
    })),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }));

  // Mapear horarios de operación del negocio
  const operatingHoursDays: Record<DayOfWeek, DayScheduleDTO> = {} as Record<
    DayOfWeek,
    DayScheduleDTO
  >;

  // Mapear los horarios existentes
  for (const oh of business.operatingHours) {
    operatingHoursDays[oh.dayOfWeek as DayOfWeek] = {
      enabled: oh.enabled,
      openTime: oh.openTime,
      closeTime: oh.closeTime,
      duration: oh.duration,
    };
  }

  // Asegurar que todos los días estén presentes con valores por defecto
  for (const day of DAYS_OF_WEEK) {
    if (!operatingHoursDays[day]) {
      operatingHoursDays[day] = {
        enabled: false,
        openTime: "09:00",
        closeTime: "18:00",
        duration: 30,
      };
    }
  }

  const operatingHours: OperatingHoursCompleteDTO = {
    useIndividualSchedule: business.useIndividualSchedule,
    useIndividualProfessionalSchedule:
      business.useIndividualProfessionalSchedule,
    globalSchedule: {
      openTime: business.globalOpenTime || "09:00",
      closeTime: business.globalCloseTime || "18:00",
      duration: business.globalDuration || 30,
    },
    days: {
      monday: operatingHoursDays.monday,
      tuesday: operatingHoursDays.tuesday,
      wednesday: operatingHoursDays.wednesday,
      thursday: operatingHoursDays.thursday,
      friday: operatingHoursDays.friday,
      saturday: operatingHoursDays.saturday,
      sunday: operatingHoursDays.sunday,
    },
  };

  // Mapear preferencias de reservas con valores por defecto
  const bookingPreferences: BookingPreferencesCompleteDTO =
    business.bookingPreferences
      ? {
          allowCancellation: business.bookingPreferences.allowCancellation,
          hoursBeforeBooking: business.bookingPreferences.hoursBeforeBooking,
          maxDaysAhead: business.bookingPreferences.maxDaysAhead,
        }
      : {
          allowCancellation: true,
          hoursBeforeBooking: 24,
          maxDaysAhead: 30,
        };

  // Mapear configuración de comunicación con valores por defecto
  const communication: CommunicationCompleteDTO = business.communicationSettings
    ? {
        sendConfirmationEmail:
          business.communicationSettings.sendConfirmationEmail,
        sendReminderEmail: business.communicationSettings.sendReminderEmail,
        reminderHoursBefore: business.communicationSettings.reminderHoursBefore,
      }
    : {
        sendConfirmationEmail: true,
        sendReminderEmail: true,
        reminderHoursBefore: 24,
      };

  Logger.info("Configuración completa del negocio obtenida exitosamente", {
    userId,
    businessId: business.id,
    professionalsCount: professionals.length,
    servicesCount: services.length,
  });

  return {
    business: businessInfo,
    professionals,
    services,
    operatingHours,
    bookingPreferences,
    communication,
  };
}
