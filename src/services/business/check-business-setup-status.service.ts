import prisma from "../../config/database";

export interface SetupStatus {
  setupPending: boolean;
  missingSteps: string[];
  details: {
    hasBusiness: boolean;
    hasCommunicationSettings: boolean;
    hasOperatingHours: boolean;
    hasProfessionals: boolean;
    hasProfessionalSchedules: boolean;
    hasServices: boolean;
    hasServiceProfessionals: boolean;
  };
}

export async function checkBusinessSetupStatus(
  userId: string,
): Promise<SetupStatus> {
  // Verificar si el usuario tiene un negocio
  const business = await prisma.business.findUnique({
    where: { userId },
    include: {
      communicationSettings: true,
      operatingHours: true,
      professionals: {
        include: {
          schedules: true,
          services: true,
        },
      },
      services: {
        include: {
          professionals: true,
        },
      },
    },
  });

  // Si no hay negocio, el setup está pendiente
  if (!business) {
    return {
      setupPending: true,
      missingSteps: [
        "business",
        "communication_settings",
        "operating_hours",
        "professionals",
        "professional_schedules",
        "services",
        "service_professionals",
      ],
      details: {
        hasBusiness: false,
        hasCommunicationSettings: false,
        hasOperatingHours: false,
        hasProfessionals: false,
        hasProfessionalSchedules: false,
        hasServices: false,
        hasServiceProfessionals: false,
      },
    };
  }

  // Verificar cada componente de configuración
  const hasCommunicationSettings = business.communicationSettings !== null;
  const hasOperatingHours = business.operatingHours.length > 0;
  const hasProfessionals = business.professionals.length > 0;

  // Verificar si hay al menos un profesional con horarios configurados
  const hasProfessionalSchedules = business.professionals.some(
    (professional: any) => professional.schedules.length > 0,
  );

  const hasServices = business.services.length > 0;

  // Verificar si hay al menos un servicio con profesionales asignados
  const hasServiceProfessionals = business.services.some(
    (service: any) => service.professionals.length > 0,
  );

  // Determinar qué pasos faltan
  const missingSteps: string[] = [];

  if (!hasCommunicationSettings) {
    missingSteps.push("communication_settings");
  }

  if (!hasOperatingHours) {
    missingSteps.push("operating_hours");
  }

  if (!hasProfessionals) {
    missingSteps.push("professionals");
  }

  if (!hasProfessionalSchedules && hasProfessionals) {
    missingSteps.push("professional_schedules");
  }

  if (!hasServices) {
    missingSteps.push("services");
  }

  if (!hasServiceProfessionals && hasServices && hasProfessionals) {
    missingSteps.push("service_professionals");
  }

  const setupPending = missingSteps.length > 0;

  return {
    setupPending,
    missingSteps,
    details: {
      hasBusiness: true,
      hasCommunicationSettings,
      hasOperatingHours,
      hasProfessionals,
      hasProfessionalSchedules,
      hasServices,
      hasServiceProfessionals,
    },
  };
}
