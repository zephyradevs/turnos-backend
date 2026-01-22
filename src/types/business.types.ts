// ==========================================
// DTOs para la configuración del negocio
// ==========================================

export interface BusinessInfoDTO {
    adminName: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    logo?: string | null;
}

export interface ProfessionalDTO {
    id: string; // ID externo del frontend
    firstName: string;
    lastName: string;
    birthDate: string; // Formato: YYYY-MM-DD
    dni: string;
    description?: string;
}

export interface DayScheduleDTO {
    enabled: boolean;
    openTime: string; // Formato: HH:mm
    closeTime: string; // Formato: HH:mm
    duration: number; // Duración en minutos
}

export interface GlobalScheduleDTO {
    openTime: string;
    closeTime: string;
    duration: number;
    customDuration?: boolean;
}

export interface ProfessionalScheduleDTO {
    useIndividualSchedule: boolean;
    globalSchedule: GlobalScheduleDTO;
    days: {
        monday: DayScheduleDTO;
        tuesday: DayScheduleDTO;
        wednesday: DayScheduleDTO;
        thursday: DayScheduleDTO;
        friday: DayScheduleDTO;
        saturday: DayScheduleDTO;
        sunday: DayScheduleDTO;
    };
}

export interface OperatingHoursDTO {
    useIndividualSchedule: boolean;
    useIndividualProfessionalSchedule: boolean;
    globalSchedule: GlobalScheduleDTO;
    days: {
        monday: DayScheduleDTO;
        tuesday: DayScheduleDTO;
        wednesday: DayScheduleDTO;
        thursday: DayScheduleDTO;
        friday: DayScheduleDTO;
        saturday: DayScheduleDTO;
        sunday: DayScheduleDTO;
    };
    professionalSchedules: Record<string, ProfessionalScheduleDTO>; // Key: professional external ID
}

export interface ServiceDTO {
    id: string; // ID externo del frontend
    name: string;
    duration: number; // Duración en minutos
    price?: number;
    professionalIds: string[]; // IDs externos de profesionales
}

export interface BookingPreferencesDTO {
    allowCancellation: boolean;
    hoursBeforeBooking: number;
    maxDaysAhead: number;
}

export interface CommunicationDTO {
    sendConfirmationEmail: boolean;
    sendReminderEmail: boolean;
    reminderHoursBefore?: number;
}

export interface BusinessConfigurationDTO {
    businessInfo: BusinessInfoDTO;
    professionals: ProfessionalDTO[];
    operatingHours: OperatingHoursDTO;
    services: ServiceDTO[];
    bookingPreferences: BookingPreferencesDTO;
    communication: CommunicationDTO;
    completedSteps?: number[]; // No es relevante para el backend
}

// Tipo para los días de la semana
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];
