import prisma from '../../config/database';
import {
    BookingPreferencesDTO,
    BusinessConfigurationDTO,
    BusinessInfoDTO,
    CommunicationDTO,
    DayOfWeek,
    DAYS_OF_WEEK,
    DayScheduleDTO,
    OperatingHoursDTO,
    ProfessionalDTO,
    ProfessionalScheduleDTO,
    ServiceDTO,
} from '../../types/business.types';

/**
 * Obtiene la configuración completa del negocio de un usuario
 */
export async function getBusinessConfiguration(userId: string): Promise<BusinessConfigurationDTO | null> {
    const business = await prisma.business.findUnique({
        where: { userId },
        include: {
            professionals: {
                include: {
                    schedules: true,
                    services: {
                        include: {
                            service: true,
                        },
                    },
                },
            },
            operatingHours: true,
            services: {
                include: {
                    professionals: {
                        include: {
                            professional: true,
                        },
                    },
                },
            },
            bookingPreferences: true,
            communicationSettings: true,
        },
    });

    if (!business) {
        return null;
    }

    // Mapear información del negocio
    const businessInfo: BusinessInfoDTO = {
        adminName: business.adminName,
        name: business.name,
        phone: business.phone,
        address: business.address,
        city: business.city,
        province: business.province,
        logo: business.logo,
    };

    // Mapear profesionales
    const professionals: ProfessionalDTO[] = business.professionals.map((prof) => ({
        id: prof.externalId,
        firstName: prof.firstName,
        lastName: prof.lastName,
        birthDate: prof.birthDate.toISOString().split('T')[0],
        dni: prof.dni,
        description: prof.description ?? undefined,
    }));

    // Mapear horarios de operación
    const operatingHoursDays: Record<DayOfWeek, DayScheduleDTO> = {} as Record<DayOfWeek, DayScheduleDTO>;
    for (const oh of business.operatingHours) {
        operatingHoursDays[oh.dayOfWeek as DayOfWeek] = {
            enabled: oh.enabled,
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            duration: oh.duration,
        };
    }

    // Asegurar que todos los días estén presentes
    for (const day of DAYS_OF_WEEK) {
        if (!operatingHoursDays[day]) {
            operatingHoursDays[day] = {
                enabled: false,
                openTime: '09:00',
                closeTime: '18:00',
                duration: 30,
            };
        }
    }

    // Mapear horarios de profesionales
    const professionalSchedules: Record<string, ProfessionalScheduleDTO> = {};
    for (const prof of business.professionals) {
        const profDays: Record<DayOfWeek, DayScheduleDTO> = {} as Record<DayOfWeek, DayScheduleDTO>;

        for (const schedule of prof.schedules) {
            profDays[schedule.dayOfWeek as DayOfWeek] = {
                enabled: schedule.enabled,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                duration: schedule.duration,
            };
        }

        // Asegurar que todos los días estén presentes
        for (const day of DAYS_OF_WEEK) {
            if (!profDays[day]) {
                profDays[day] = {
                    enabled: false,
                    openTime: '09:00',
                    closeTime: '18:00',
                    duration: 30,
                };
            }
        }

        professionalSchedules[prof.externalId] = {
            useIndividualSchedule: prof.useIndividualSchedule,
            globalSchedule: {
                openTime: prof.globalOpenTime ?? '09:00',
                closeTime: prof.globalCloseTime ?? '18:00',
                duration: prof.globalDuration ?? 30,
            },
            days: {
                monday: profDays.monday,
                tuesday: profDays.tuesday,
                wednesday: profDays.wednesday,
                thursday: profDays.thursday,
                friday: profDays.friday,
                saturday: profDays.saturday,
                sunday: profDays.sunday,
            },
        };
    }

    const operatingHours: OperatingHoursDTO = {
        useIndividualSchedule: business.useIndividualSchedule,
        useIndividualProfessionalSchedule: business.useIndividualProfessionalSchedule,
        globalSchedule: {
            openTime: business.globalOpenTime ?? '09:00',
            closeTime: business.globalCloseTime ?? '18:00',
            duration: business.globalDuration ?? 30,
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
        professionalSchedules,
    };

    // Mapear servicios
    const services: ServiceDTO[] = business.services.map((service) => ({
        id: service.externalId,
        name: service.name,
        duration: service.duration,
        price: service.price ? Number(service.price) : undefined,
        professionalIds: service.professionals.map((sp) => sp.professional.externalId),
    }));

    // Mapear preferencias de reservas
    const bookingPreferences: BookingPreferencesDTO = business.bookingPreferences
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

    // Mapear configuración de comunicación
    const communication: CommunicationDTO = business.communicationSettings
        ? {
            sendConfirmationEmail: business.communicationSettings.sendConfirmationEmail,
            sendReminderEmail: business.communicationSettings.sendReminderEmail,
            reminderHoursBefore: business.communicationSettings.reminderHoursBefore,
        }
        : {
            sendConfirmationEmail: true,
            sendReminderEmail: true,
            reminderHoursBefore: 24,
        };

    return {
        businessInfo,
        professionals,
        operatingHours,
        services,
        bookingPreferences,
        communication,
    };
}
