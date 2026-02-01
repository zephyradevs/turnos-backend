import { Request, Response } from "express";
import { getBusinessConfiguration } from "../../services/business/get-business-configuration.service";
import { saveBusinessConfiguration } from "../../services/business/save-business-configuration.service";
import { BusinessConfigurationDTO } from "../../types/business.types";
import { Logger } from "../../utils/logger";

/**
 * Guardar la configuración completa del negocio
 * POST /api/business/configuration
 */
export const saveConfiguration = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    const configData: BusinessConfigurationDTO = req.body;

    // Validaciones básicas
    if (!configData.businessInfo) {
      res.status(400).json({
        status: "error",
        message: "La información del negocio es requerida",
      });
      return;
    }

    if (!configData.businessInfo.name || !configData.businessInfo.adminName) {
      res.status(400).json({
        status: "error",
        message: "El nombre del negocio y del administrador son requeridos",
      });
      return;
    }

    if (!configData.professionals || configData.professionals.length === 0) {
      res.status(400).json({
        status: "error",
        message: "Debe agregar al menos un profesional",
      });
      return;
    }

    if (!configData.operatingHours) {
      res.status(400).json({
        status: "error",
        message: "Los horarios de atención son requeridos",
      });
      return;
    }

    if (!configData.services || configData.services.length === 0) {
      res.status(400).json({
        status: "error",
        message: "Debe agregar al menos un servicio",
      });
      return;
    }

    if (!configData.bookingPreferences) {
      res.status(400).json({
        status: "error",
        message: "Las preferencias de reserva son requeridas",
      });
      return;
    }

    if (!configData.communication) {
      res.status(400).json({
        status: "error",
        message: "La configuración de comunicación es requerida",
      });
      return;
    }

    // Guardar la configuración
    const result = await saveBusinessConfiguration(userId, configData);

    res.status(200).json({
      status: "success",
      message: "Configuración del negocio guardada exitosamente",
      data: {
        businessId: result.business.id,
        businessName: result.business.name,
        professionalsCount: result.professionalsCount,
        servicesCount: result.servicesCount,
      },
    });
  } catch (error) {
    Logger.error("Error al guardar configuración del negocio:", error);

    if (error instanceof Error) {
      // Manejar errores específicos de Prisma
      if (error.message.includes("Unique constraint")) {
        res.status(409).json({
          status: "error",
          message:
            "Ya existe un registro con esos datos (DNI duplicado u otro campo único)",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error interno al guardar la configuración del negocio",
    });
  }
};

/**
 * Obtener la configuración completa del negocio
 * GET /api/business/configuration
 */
export const getConfiguration = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Usuario no autenticado",
      });
      return;
    }

    const configuration = await getBusinessConfiguration(userId);

    if (!configuration) {
      res.status(404).json({
        status: "error",
        message: "No se encontró configuración del negocio para este usuario",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Configuración del negocio obtenida exitosamente",
      data: configuration,
    });
  } catch (error) {
    Logger.error("Error al obtener configuración del negocio:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno al obtener la configuración del negocio",
    });
  }
};
