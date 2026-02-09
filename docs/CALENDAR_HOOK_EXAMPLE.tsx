/**
 * Hook optimizado para cargar turnos del calendario
 * Este hook implementa la estrategia de rendimiento recomendada
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

// ============================================
// TYPES
// ============================================

export interface Appointment {
  id: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    id: string;
    externalId: string;
    name: string;
    duration: number;
    price: number | null;
  };
  professional: {
    id: string;
    externalId: string;
    firstName: string;
    lastName: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show";
  price: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
}

interface AppointmentsResponse {
  status: string;
  data: {
    appointments: Appointment[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

interface UseCalendarAppointmentsOptions {
  /** Token de autenticación */
  token: string;
  /** URL base de la API */
  apiUrl?: string;
  /** Límite de turnos por petición */
  limit?: number;
  /** Filtrar por profesional (externalId) */
  professionalId?: string;
  /** Filtrar por servicio (externalId) */
  serviceId?: string;
  /** Filtrar por estados */
  status?: string | string[];
  /** Habilitar prefetch del mes siguiente */
  enablePrefetch?: boolean;
}

type CalendarView = "day" | "week" | "month";

interface DateRange {
  startDate: string;
  endDate: string;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useCalendarAppointments = (
  options: UseCalendarAppointmentsOptions,
) => {
  const {
    token,
    apiUrl = "/api",
    limit = 500,
    professionalId,
    serviceId,
    status,
    enablePrefetch = true,
  } = options;

  // Estado
  const [appointments, setAppointments] = useState<Map<string, Appointment>>(
    new Map(),
  );
  const [loadedRanges, setLoadedRanges] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // UTILIDADES
  // ============================================

  /** Genera una clave única para un rango de fechas */
  const getRangeKey = useCallback(
    (startDate: string, endDate: string): string => {
      return `${startDate}_${endDate}`;
    },
    [],
  );

  /** Verifica si ya tenemos los datos de un rango */
  const hasRangeLoaded = useCallback(
    (startDate: string, endDate: string): boolean => {
      const key = getRangeKey(startDate, endDate);
      return loadedRanges.has(key);
    },
    [loadedRanges, getRangeKey],
  );

  /** Formatea una fecha a YYYY-MM-DD */
  const formatDate = useCallback((date: Date): string => {
    return format(date, "yyyy-MM-dd");
  }, []);

  // ============================================
  // FUNCIÓN PARA CARGAR TURNOS
  // ============================================

  const loadAppointments = useCallback(
    async (startDate: string, endDate: string, force: boolean = false) => {
      // No cargar si ya tenemos estos datos (a menos que se fuerce)
      if (!force && hasRangeLoaded(startDate, endDate)) {
        console.log(
          `[Calendar] Ya se cargaron los turnos para ${startDate} - ${endDate}`,
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Construir query params
        const params = new URLSearchParams({
          startDate,
          endDate,
          limit: limit.toString(),
          sortBy: "date",
          sortOrder: "asc",
        });

        if (professionalId) params.append("professionalId", professionalId);
        if (serviceId) params.append("serviceId", serviceId);
        if (status) {
          if (Array.isArray(status)) {
            status.forEach((s) => params.append("status", s));
          } else {
            params.append("status", status);
          }
        }

        console.log(`[Calendar] Cargando turnos: ${startDate} - ${endDate}`);

        // Hacer petición
        const response = await fetch(
          `${apiUrl}/appointments?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data: AppointmentsResponse = await response.json();

        // Si hay múltiples páginas, cargar todas
        const allAppointments = [...data.data.appointments];
        if (data.data.pagination.totalPages > 1) {
          console.log(
            `[Calendar] Cargando ${data.data.pagination.totalPages - 1} páginas adicionales...`,
          );

          for (let page = 2; page <= data.data.pagination.totalPages; page++) {
            params.set("page", page.toString());
            const pageResponse = await fetch(
              `${apiUrl}/appointments?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (pageResponse.ok) {
              const pageData: AppointmentsResponse = await pageResponse.json();
              allAppointments.push(...pageData.data.appointments);
            }
          }
        }

        console.log(`[Calendar] Cargados ${allAppointments.length} turnos`);

        // Actualizar estado (mantener turnos anteriores + agregar nuevos)
        setAppointments((prev) => {
          const updated = new Map(prev);
          allAppointments.forEach((apt) => {
            updated.set(apt.id, apt);
          });
          return updated;
        });

        // Marcar rango como cargado
        setLoadedRanges((prev) =>
          new Set(prev).add(getRangeKey(startDate, endDate)),
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        console.error("[Calendar] Error al cargar turnos:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiUrl,
      token,
      limit,
      professionalId,
      serviceId,
      status,
      hasRangeLoaded,
      getRangeKey,
    ],
  );

  // ============================================
  // FUNCIONES PARA CARGAR POR VISTA
  // ============================================

  /** Cargar turnos según la vista del calendario */
  const loadByView = useCallback(
    async (date: Date, view: CalendarView) => {
      let startDate: string;
      let endDate: string;

      switch (view) {
        case "day":
          startDate = formatDate(date);
          endDate = formatDate(date);
          break;

        case "week":
          startDate = formatDate(startOfWeek(date, { weekStartsOn: 1 }));
          endDate = formatDate(endOfWeek(date, { weekStartsOn: 1 }));
          break;

        case "month":
          startDate = formatDate(startOfMonth(date));
          endDate = formatDate(endOfMonth(date));
          break;
      }

      await loadAppointments(startDate, endDate);
    },
    [loadAppointments, formatDate],
  );

  /** Cargar turnos de un mes específico */
  const loadMonth = useCallback(
    async (date: Date) => {
      await loadByView(date, "month");
    },
    [loadByView],
  );

  /** Cargar turnos de una semana específica */
  const loadWeek = useCallback(
    async (date: Date) => {
      await loadByView(date, "week");
    },
    [loadByView],
  );

  /** Cargar turnos de un día específico */
  const loadDay = useCallback(
    async (date: Date) => {
      await loadByView(date, "day");
    },
    [loadByView],
  );

  /** Recargar turnos (forzar actualización) */
  const refresh = useCallback(
    async (startDate: string, endDate: string) => {
      // Limpiar el rango del caché
      setLoadedRanges((prev) => {
        const updated = new Set(prev);
        updated.delete(getRangeKey(startDate, endDate));
        return updated;
      });

      // Recargar
      await loadAppointments(startDate, endDate, true);
    },
    [loadAppointments, getRangeKey],
  );

  // ============================================
  // FILTRADO Y OBTENCIÓN DE TURNOS
  // ============================================

  /** Obtener turnos de un rango de fechas específico */
  const getAppointmentsInRange = useCallback(
    (startDate: string, endDate: string): Appointment[] => {
      const filtered: Appointment[] = [];

      appointments.forEach((apt) => {
        if (apt.date >= startDate && apt.date <= endDate) {
          filtered.push(apt);
        }
      });

      // Ordenar por fecha y hora
      return filtered.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
    },
    [appointments],
  );

  /** Obtener turnos de un día específico */
  const getAppointmentsForDay = useCallback(
    (date: Date): Appointment[] => {
      const dateStr = formatDate(date);
      return getAppointmentsInRange(dateStr, dateStr);
    },
    [getAppointmentsInRange, formatDate],
  );

  /** Obtener todos los turnos cargados como array */
  const allAppointments = useMemo(() => {
    return Array.from(appointments.values()).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments]);

  // ============================================
  // PREFETCH INTELIGENTE
  // ============================================

  useEffect(() => {
    if (!enablePrefetch) return;

    // Si estamos cerca del fin del mes, pre-cargar el mes siguiente
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = endOfMonth(today).getDate();

    // Si estamos en los últimos 7 días del mes
    if (dayOfMonth > daysInMonth - 7) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthStart = formatDate(startOfMonth(nextMonth));
      const nextMonthEnd = formatDate(endOfMonth(nextMonth));

      // Pre-cargar en segundo plano si no está cargado
      if (!hasRangeLoaded(nextMonthStart, nextMonthEnd)) {
        console.log("[Calendar] Pre-cargando mes siguiente...");
        loadAppointments(nextMonthStart, nextMonthEnd);
      }
    }
  }, [enablePrefetch, hasRangeLoaded, loadAppointments, formatDate]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Estado
    appointments: allAppointments,
    isLoading,
    error,

    // Carga por vista
    loadMonth,
    loadWeek,
    loadDay,
    loadByView,
    loadAppointments,

    // Utilidades
    getAppointmentsInRange,
    getAppointmentsForDay,
    hasRangeLoaded,
    refresh,

    // Stats
    totalLoaded: appointments.size,
    rangesLoaded: loadedRanges.size,
  };
};

// ============================================
// EJEMPLO DE USO
// ============================================

/**
 * Componente de ejemplo que muestra cómo usar el hook
 */
export const CalendarExample = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const token = "tu-token-jwt"; // Obtener del contexto de auth

  const {
    appointments,
    isLoading,
    error,
    loadMonth,
    loadWeek,
    loadDay,
    getAppointmentsForDay,
    refresh,
    totalLoaded,
  } = useCalendarAppointments({
    token,
    apiUrl: "/api",
    limit: 500,
    enablePrefetch: true,
    // professionalId: "prof-001", // Opcional: filtrar por profesional
    // status: ["confirmed", "pending"], // Opcional: filtrar por estados
  });

  // Cargar turnos cuando cambia la fecha o la vista
  useEffect(() => {
    switch (view) {
      case "day":
        loadDay(currentDate);
        break;
      case "week":
        loadWeek(currentDate);
        break;
      case "month":
        loadMonth(currentDate);
        break;
    }
  }, [currentDate, view, loadDay, loadWeek, loadMonth]);

  // Ejemplo: obtener turnos del día actual
  const todayAppointments = getAppointmentsForDay(new Date());

  return (
    <div>
      <h1>Calendario de Turnos</h1>
      <p>
        Vista: {view} | Turnos cargados: {totalLoaded}
      </p>

      {isLoading && <p>Cargando...</p>}
      {error && <p>Error: {error}</p>}

      <div>
        <h2>Turnos de hoy: {todayAppointments.length}</h2>
        {todayAppointments.map((apt) => (
          <div key={apt.id}>
            {apt.startTime} - {apt.client.name} - {apt.service.name}
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          refresh(
            format(startOfMonth(currentDate), "yyyy-MM-dd"),
            format(endOfMonth(currentDate), "yyyy-MM-dd"),
          )
        }
      >
        Refrescar
      </button>
    </div>
  );
};
