# API Dashboard - Documentación

## Obtener Dashboard del Día

Devuelve toda la información relevante del día actual para el negocio.

### Endpoint

```
GET /api/dashboard/today
```

### Autenticación

Requiere autenticación mediante JWT token en el header:

```
Authorization: Bearer <token>
```

### Respuesta Exitosa (200)

```json
{
  "status": "success",
  "message": "Dashboard de hoy obtenido exitosamente",
  "data": {
    "currentTime": "2026-02-07T15:30:00.000Z",
    "upcomingAppointments": [
      {
        "id": "uuid",
        "client": {
          "id": "uuid",
          "name": "Juan Pérez",
          "email": "juan@email.com",
          "phone": "+54 9 11 1234-5678"
        },
        "service": {
          "id": "uuid",
          "externalId": "srv-001",
          "name": "Corte de cabello",
          "duration": 30,
          "price": 5000
        },
        "professional": {
          "id": "uuid",
          "externalId": "prof-001",
          "firstName": "Carlos",
          "lastName": "García"
        },
        "date": "2026-02-07",
        "startTime": "16:00",
        "endTime": "16:30",
        "duration": 30,
        "status": "confirmed",
        "price": 5000,
        "notes": null,
        "createdAt": "2026-02-07T10:00:00.000Z",
        "updatedAt": "2026-02-07T10:00:00.000Z",
        "cancelledAt": null,
        "cancelledReason": null,
        "completedAt": null,
        "timeUntil": "En 30 min",
        "minutesUntil": 30,
        "isNext": true,
        "isUrgent": true
      }
    ],
    "dayStats": {
      "totalAppointments": 12,
      "confirmed": 8,
      "pending": 3,
      "completed": 0,
      "cancelled": 1,
      "totalRevenue": 52000,
      "collectedRevenue": 15000,
      "occupancyRate": 75
    },
    "professionalStats": [
      {
        "professional": {
          "id": "uuid",
          "externalId": "prof-001",
          "firstName": "Carlos",
          "lastName": "García"
        },
        "appointmentsToday": 5,
        "nextAppointment": {
          "id": "uuid",
          "client": { ... },
          "service": { ... },
          "professional": { ... },
          "date": "2026-02-07",
          "startTime": "16:00",
          "endTime": "16:30",
          "status": "confirmed",
          ...
        },
        "isAvailable": true,
        "currentStatus": "available"
      }
    ],
    "popularServices": [
      {
        "service": {
          "id": "uuid",
          "externalId": "srv-001",
          "name": "Corte de cabello",
          "duration": 30,
          "price": 5000
        },
        "count": 7,
        "percentage": 58
      },
      {
        "service": {
          "id": "uuid",
          "externalId": "srv-002",
          "name": "Corte + Barba",
          "duration": 45,
          "price": 7500
        },
        "count": 3,
        "percentage": 25
      },
      {
        "service": {
          "id": "uuid",
          "externalId": "srv-004",
          "name": "Coloración",
          "duration": 90,
          "price": 15000
        },
        "count": 2,
        "percentage": 17
      }
    ],
    "businessHours": {
      "openTime": "09:00",
      "closeTime": "18:00",
      "isOpen": true
    }
  }
}
```

### Descripción de los Datos

#### `currentTime`

- **Tipo:** `string` (ISO 8601)
- **Descripción:** Timestamp actual del servidor

#### `upcomingAppointments`

- **Tipo:** `UpcomingAppointment[]`
- **Descripción:** Próximos turnos del día (solo los que aún no pasaron, excluye cancelados y completados)
- **Campos adicionales:**
  - `timeUntil`: Texto formateado del tiempo restante ("Ahora", "En 30 min", "En 2h 15min")
  - `minutesUntil`: Minutos exactos hasta el turno
  - `isNext`: `true` si es el próximo turno inmediato
  - `isUrgent`: `true` si faltan 30 minutos o menos

#### `dayStats`

- **Tipo:** `DayStats`
- **Descripción:** Estadísticas generales del día
- **Campos:**
  - `totalAppointments`: Total de turnos del día
  - `confirmed`: Turnos confirmados
  - `pending`: Turnos pendientes de confirmación
  - `completed`: Turnos completados
  - `cancelled`: Turnos cancelados
  - `totalRevenue`: Ingresos totales esperados (confirmados + completados)
  - `collectedRevenue`: Ingresos ya recaudados (turnos que ya pasaron)
  - `occupancyRate`: Porcentaje de ocupación basado en horarios y profesionales

#### `professionalStats`

- **Tipo:** `ProfessionalStats[]`
- **Descripción:** Estado y estadísticas de cada profesional
- **Campos:**
  - `professional`: Información básica del profesional
  - `appointmentsToday`: Cantidad de turnos del profesional hoy
  - `nextAppointment`: Próximo turno del profesional (null si no tiene)
  - `isAvailable`: `true` si no está ocupado en este momento
  - `currentStatus`: "available" o "busy"

#### `popularServices`

- **Tipo:** `PopularService[]`
- **Descripción:** Top 3 servicios más reservados del día
- **Campos:**
  - `service`: Información del servicio
  - `count`: Cantidad de veces reservado hoy
  - `percentage`: Porcentaje del total de turnos

#### `businessHours`

- **Tipo:** `BusinessHours`
- **Descripción:** Horarios de operación del día actual
- **Campos:**
  - `openTime`: Hora de apertura (formato HH:mm)
  - `closeTime`: Hora de cierre (formato HH:mm)
  - `isOpen`: `true` si el negocio está abierto en este momento

### Errores Posibles

#### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Usuario no autenticado"
}
```

#### 404 Not Found

```json
{
  "status": "error",
  "message": "No se encontró el negocio para este usuario"
}
```

#### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Error interno al obtener el dashboard de hoy"
}
```

### Ejemplo de Uso

#### JavaScript/TypeScript (Fetch)

```typescript
const response = await fetch("http://localhost:3000/api/dashboard/today", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

const result = await response.json();

if (result.status === "success") {
  const dashboard = result.data;
  console.log("Próximos turnos:", dashboard.upcomingAppointments.length);
  console.log("Total del día:", dashboard.dayStats.totalRevenue);
}
```

#### Axios

```typescript
import axios from "axios";

try {
  const { data } = await axios.get(
    "http://localhost:3000/api/dashboard/today",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  console.log("Dashboard:", data.data);
} catch (error) {
  console.error("Error:", error.response?.data);
}
```

### Notas Importantes

1. **Zona Horaria:** Todos los timestamps están en UTC. El cliente debe convertirlos a la zona horaria local si es necesario.

2. **Actualización en Tiempo Real:** Para mantener la información actualizada, se recomienda:
   - Hacer polling cada 1-2 minutos
   - O usar WebSockets (a implementar en futuras versiones)

3. **Rendimiento:** La consulta es optimizada para ser rápida. Incluye todas las relaciones necesarias en una sola query.

4. **Caching:** Se recomienda implementar cache en el cliente para reducir llamadas:

   ```typescript
   // Actualizar cada minuto
   useEffect(() => {
     const interval = setInterval(fetchDashboard, 60000);
     return () => clearInterval(interval);
   }, []);
   ```

5. **Estados de Turnos:**
   - `pending`: Pendiente de confirmación
   - `confirmed`: Confirmado
   - `in_progress`: En progreso
   - `completed`: Completado
   - `cancelled`: Cancelado
   - `no_show`: Cliente no asistió

### Cálculo de Métricas

#### Tasa de Ocupación (occupancyRate)

```
totalSlots = (minutosLaborables / duraciónPromedioPorSlot) * numeroDeProfesionales
occupancyRate = (turnosOcupados / totalSlots) * 100
```

#### Ingresos Recaudados (collectedRevenue)

Solo cuenta los turnos cuya hora de fin ya pasó (asume que fueron cobrados).

#### Tiempo Hasta Turno (timeUntil)

- Si faltan ≤ 0 minutos: "Ahora"
- Si faltan < 60 minutos: "En X min"
- Si faltan ≥ 60 minutos: "En Xh Ymin"
