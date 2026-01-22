import { Business } from '@prisma/client';
import prisma from '../../config/database';
import { BusinessConfigurationDTO, DAYS_OF_WEEK } from '../../types/business.types';
import { Logger } from '../../utils/logger';

interface SaveConfigurationResult {
    business: Business;
    professionalsCount: number;
    servicesCount: number;
}

/**
 * Guarda o actualiza la configuración completa del negocio
 */
export async function saveBusinessConfiguration(userId: string, config: BusinessConfigurationDTO): Promise<SaveConfigurationResult> {
    const { businessInfo, professionals, operatingHours, services, bookingPreferences, communication } = config;

    // Usar transacción para asegurar consistencia con timeout extendido
    const result = await prisma.$transaction(async (tx) => {
        // 1. Crear o actualizar el negocio
        const existingBusiness = await tx.business.findUnique({
            where: { userId },
        });

        let business: Business;

        if (existingBusiness) {
            // Eliminar datos relacionados para recrearlos
            await tx.serviceProfessional.deleteMany({
                where: {
                    service: { businessId: existingBusiness.id },
                },
            });
            await tx.service.deleteMany({
                where: { businessId: existingBusiness.id },
            });
            await tx.professionalSchedule.deleteMany({
                where: {
                    professional: { businessId: existingBusiness.id },
                },
            });
            await tx.professional.deleteMany({
                where: { businessId: existingBusiness.id },
            });
            await tx.operatingHours.deleteMany({
                where: { businessId: existingBusiness.id },
            });
            await tx.bookingPreferences.deleteMany({
                where: { businessId: existingBusiness.id },
            });
            await tx.communicationSettings.deleteMany({
                where: { businessId: existingBusiness.id },
            });

            // Actualizar negocio existente
            business = await tx.business.update({
                where: { id: existingBusiness.id },
                data: {
                    name: businessInfo.name,
                    adminName: businessInfo.adminName,
                    phone: businessInfo.phone,
                    address: businessInfo.address,
                    city: businessInfo.city,
                    province: businessInfo.province,
                    logo: businessInfo.logo,
                    useIndividualSchedule: operatingHours.useIndividualSchedule,
                    useIndividualProfessionalSchedule: operatingHours.useIndividualProfessionalSchedule,
                    globalOpenTime: operatingHours.globalSchedule.openTime,
                    globalCloseTime: operatingHours.globalSchedule.closeTime,
                    globalDuration: operatingHours.globalSchedule.duration,
                },
            });
        } else {
            // Crear nuevo negocio
            business = await tx.business.create({
                data: {
                    userId,
                    name: businessInfo.name,
                    adminName: businessInfo.adminName,
                    phone: businessInfo.phone,
                    address: businessInfo.address,
                    city: businessInfo.city,
                    province: businessInfo.province,
                    logo: businessInfo.logo,
                    useIndividualSchedule: operatingHours.useIndividualSchedule,
                    useIndividualProfessionalSchedule: operatingHours.useIndividualProfessionalSchedule,
                    globalOpenTime: operatingHours.globalSchedule.openTime,
                    globalCloseTime: operatingHours.globalSchedule.closeTime,
                    globalDuration: operatingHours.globalSchedule.duration,
                },
            });
        }

        // 2. Crear horarios de operación del negocio
        for (const day of DAYS_OF_WEEK) {
            const daySchedule = operatingHours.days[day];
            await tx.operatingHours.create({
                data: {
                    businessId: business.id,
                    dayOfWeek: day,
                    enabled: daySchedule.enabled,
                    openTime: daySchedule.openTime,
                    closeTime: daySchedule.closeTime,
                    duration: daySchedule.duration,
                },
            });
        }

        // 3. Crear profesionales y sus horarios
        const professionalIdMap = new Map<string, string>(); // externalId -> dbId

        for (const prof of professionals) {
            const createdProfessional = await tx.professional.create({
                data: {
                    businessId: business.id,
                    externalId: prof.id,
                    firstName: prof.firstName,
                    lastName: prof.lastName,
                    birthDate: new Date(prof.birthDate),
                    dni: prof.dni,
                    description: prof.description,
                    useIndividualSchedule: operatingHours.professionalSchedules?.[prof.id]?.useIndividualSchedule ?? false,
                    globalOpenTime: operatingHours.professionalSchedules?.[prof.id]?.globalSchedule?.openTime,
                    globalCloseTime: operatingHours.professionalSchedules?.[prof.id]?.globalSchedule?.closeTime,
                    globalDuration: operatingHours.professionalSchedules?.[prof.id]?.globalSchedule?.duration,
                },
            });

            professionalIdMap.set(prof.id, createdProfessional.id);

            // Crear horarios del profesional si usa horario individual por profesional
            if (operatingHours.useIndividualProfessionalSchedule && operatingHours.professionalSchedules?.[prof.id]) {
                const profSchedule = operatingHours.professionalSchedules[prof.id];

                for (const day of DAYS_OF_WEEK) {
                    const daySchedule = profSchedule.days[day];
                    await tx.professionalSchedule.create({
                        data: {
                            professionalId: createdProfessional.id,
                            dayOfWeek: day,
                            enabled: daySchedule.enabled,
                            openTime: daySchedule.openTime,
                            closeTime: daySchedule.closeTime,
                            duration: daySchedule.duration,
                        },
                    });
                }
            }
        }

        // 4. Crear servicios y asignar profesionales
        for (const service of services) {
            const createdService = await tx.service.create({
                data: {
                    businessId: business.id,
                    externalId: service.id,
                    name: service.name,
                    duration: service.duration,
                    price: service.price ?? null,
                },
            });

            // Asignar profesionales al servicio
            for (const profExternalId of service.professionalIds) {
                const professionalDbId = professionalIdMap.get(profExternalId);
                if (professionalDbId) {
                    await tx.serviceProfessional.create({
                        data: {
                            serviceId: createdService.id,
                            professionalId: professionalDbId,
                        },
                    });
                } else {
                    Logger.warn(`Profesional con ID externo ${profExternalId} no encontrado para el servicio ${service.name}`);
                }
            }
        }

        // 5. Crear preferencias de reservas
        await tx.bookingPreferences.create({
            data: {
                businessId: business.id,
                allowCancellation: bookingPreferences.allowCancellation,
                hoursBeforeBooking: bookingPreferences.hoursBeforeBooking,
                maxDaysAhead: bookingPreferences.maxDaysAhead,
            },
        });

        // 6. Crear configuración de comunicación
        await tx.communicationSettings.create({
            data: {
                businessId: business.id,
                sendConfirmationEmail: communication.sendConfirmationEmail,
                sendReminderEmail: communication.sendReminderEmail,
                reminderHoursBefore: communication.reminderHoursBefore ?? 24,
            },
        });

        return {
            business,
            professionalsCount: professionals.length,
            servicesCount: services.length,
        };
    }, {
        maxWait: 10000, // Espera máxima de 10 segundos antes de iniciar la transacción
        timeout: 15000, // Timeout de 15 segundos para completar la transacción
    });

    Logger.info(`Configuración del negocio guardada para el usuario ${userId}`);
    return result;
}
