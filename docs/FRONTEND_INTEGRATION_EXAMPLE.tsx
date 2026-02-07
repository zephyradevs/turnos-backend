/**
 * ⚠️ NOTA IMPORTANTE:
 * Este archivo es solo un EJEMPLO DE REFERENCIA para integración frontend.
 * NO debe ser incluido en el proyecto backend.
 * Los errores de TypeScript son esperados porque faltan las dependencias de React.
 *
 * Para usar este código:
 * 1. Cópialo a tu proyecto frontend (React/Next.js/Vite)
 * 2. Instala las dependencias necesarias (axios, react, etc.)
 * 3. Adapta las rutas de importación según tu estructura
 *
 * EJEMPLO DE INTEGRACIÓN FRONTEND
 *
 * Este archivo muestra cómo integrar la API del dashboard de hoy
 * con tu aplicación React/TypeScript.
 */

// ============================================
// 1. TIPOS (dashboard.types.ts)
// ============================================

export interface AppointmentClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AppointmentService {
  id: string;
  externalId: string;
  name: string;
  duration: number;
  price: number | null;
}

export interface AppointmentProfessional {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  client: AppointmentClient;
  service: AppointmentService;
  professional: AppointmentProfessional;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: AppointmentStatus;
  price: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
}

export interface UpcomingAppointment extends Appointment {
  timeUntil: string;
  minutesUntil: number;
  isNext: boolean;
  isUrgent: boolean;
}

export interface DayStats {
  totalAppointments: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  collectedRevenue: number;
  occupancyRate: number;
}

export interface ProfessionalStats {
  professional: AppointmentProfessional;
  appointmentsToday: number;
  nextAppointment: Appointment | null;
  isAvailable: boolean;
  currentStatus: "available" | "busy";
}

export interface PopularService {
  service: AppointmentService;
  count: number;
  percentage: number;
}

export interface BusinessHours {
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface TodayDashboard {
  currentTime: string;
  upcomingAppointments: UpcomingAppointment[];
  dayStats: DayStats;
  professionalStats: ProfessionalStats[];
  popularServices: PopularService[];
  businessHours: BusinessHours;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  message: string;
  data?: T;
}

// ============================================
// 2. API CLIENT (api/dashboard.ts)
// ============================================

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Configurar instancia de axios con interceptores para el token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para añadir el token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Obtiene el dashboard del día actual
 */
export async function getTodayDashboard(): Promise<TodayDashboard> {
  const response =
    await apiClient.get<ApiResponse<TodayDashboard>>("/dashboard/today");

  if (response.data.status !== "success" || !response.data.data) {
    throw new Error(response.data.message || "Error al obtener dashboard");
  }

  return response.data.data;
}

// ============================================
// 3. REACT HOOK (hooks/useTodayDashboard.ts)
// ============================================

import { useState, useEffect } from "react";
import { getTodayDashboard } from "../api/dashboard";

export interface UseTodayDashboardReturn {
  dashboard: TodayDashboard | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener y mantener actualizado el dashboard del día
 * Se actualiza automáticamente cada minuto
 */
export function useTodayDashboard(
  autoRefresh: boolean = true,
  refreshInterval: number = 60000, // 1 minuto
): UseTodayDashboardReturn {
  const [dashboard, setDashboard] = useState<TodayDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const data = await getTodayDashboard();
      setDashboard(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      console.error("Error al obtener dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return {
    dashboard,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
}

// ============================================
// 4. COMPONENTE DE EJEMPLO (Dashboard.tsx)
// ============================================

import React from "react";
import { useTodayDashboard } from "./hooks/useTodayDashboard";

export const TodayDashboard: React.FC = () => {
  const { dashboard, isLoading, error, refetch } = useTodayDashboard();

  if (isLoading) {
    return <div>Cargando dashboard...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={refetch}>Reintentar</button>
      </div>
    );
  }

  if (!dashboard) {
    return <div>No hay datos disponibles</div>;
  }

  return (
    <div className="dashboard">
      {/* Header con estado del negocio */}
      <div className="business-status">
        <h1>
          Dashboard - {new Date(dashboard.currentTime).toLocaleDateString()}
        </h1>
        <p>
          Estado: {dashboard.businessHours.isOpen ? "🟢 Abierto" : "🔴 Cerrado"}{" "}
          ({dashboard.businessHours.openTime} -{" "}
          {dashboard.businessHours.closeTime})
        </p>
      </div>

      {/* Estadísticas del día */}
      <div className="day-stats">
        <h2>Estadísticas del Día</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Turnos</h3>
            <p className="stat-value">{dashboard.dayStats.totalAppointments}</p>
          </div>
          <div className="stat-card">
            <h3>Confirmados</h3>
            <p className="stat-value">{dashboard.dayStats.confirmed}</p>
          </div>
          <div className="stat-card">
            <h3>Pendientes</h3>
            <p className="stat-value">{dashboard.dayStats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Ingresos Totales</h3>
            <p className="stat-value">
              ${dashboard.dayStats.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="stat-card">
            <h3>Ingresos Cobrados</h3>
            <p className="stat-value">
              ${dashboard.dayStats.collectedRevenue.toLocaleString()}
            </p>
          </div>
          <div className="stat-card">
            <h3>Ocupación</h3>
            <p className="stat-value">{dashboard.dayStats.occupancyRate}%</p>
          </div>
        </div>
      </div>

      {/* Próximos turnos */}
      <div className="upcoming-appointments">
        <h2>Próximos Turnos</h2>
        {dashboard.upcomingAppointments.length === 0 ? (
          <p>No hay turnos próximos</p>
        ) : (
          <div className="appointments-list">
            {dashboard.upcomingAppointments.slice(0, 5).map((apt) => (
              <div
                key={apt.id}
                className={`appointment-card ${apt.isUrgent ? "urgent" : ""} ${apt.isNext ? "next" : ""}`}
              >
                <div className="appointment-time">
                  <span className="time">{apt.startTime}</span>
                  <span className="time-until">{apt.timeUntil}</span>
                </div>
                <div className="appointment-info">
                  <p className="client-name">{apt.client.name}</p>
                  <p className="service-name">{apt.service.name}</p>
                  <p className="professional-name">
                    {apt.professional.firstName} {apt.professional.lastName}
                  </p>
                </div>
                <div className="appointment-status">
                  <span className={`status-badge ${apt.status}`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estado de profesionales */}
      <div className="professional-stats">
        <h2>Estado de Profesionales</h2>
        <div className="professionals-grid">
          {dashboard.professionalStats.map((prof) => (
            <div key={prof.professional.id} className="professional-card">
              <div className="professional-header">
                <h3>
                  {prof.professional.firstName} {prof.professional.lastName}
                </h3>
                <span className={`status-indicator ${prof.currentStatus}`}>
                  {prof.isAvailable ? "🟢 Disponible" : "🔴 Ocupado"}
                </span>
              </div>
              <div className="professional-info">
                <p>Turnos hoy: {prof.appointmentsToday}</p>
                {prof.nextAppointment && (
                  <p>
                    Próximo turno: {prof.nextAppointment.startTime} -{" "}
                    {prof.nextAppointment.client.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Servicios populares */}
      <div className="popular-services">
        <h2>Servicios Más Populares</h2>
        <div className="services-list">
          {dashboard.popularServices.map((service) => (
            <div key={service.service.id} className="service-item">
              <div className="service-info">
                <p className="service-name">{service.service.name}</p>
                <p className="service-count">
                  {service.count} reservas ({service.percentage}%)
                </p>
              </div>
              <div className="service-bar">
                <div
                  className="service-bar-fill"
                  style={{ width: `${service.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 5. ESTILOS CSS DE EJEMPLO (Dashboard.css)
// ============================================

/*
.dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.business-status {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.appointment-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #ccc;
}

.appointment-card.urgent {
  border-left-color: #ff4444;
  background: #fff5f5;
}

.appointment-card.next {
  border-left-color: #4CAF50;
  background: #f0fff4;
}

.professionals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.professional-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-indicator.available {
  color: #4CAF50;
}

.status-indicator.busy {
  color: #ff4444;
}

.service-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 5px;
}

.service-bar-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}
*/
