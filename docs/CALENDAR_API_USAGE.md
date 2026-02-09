# API para Calendario - Guía de Uso

## Ruta Principal: GET `/api/appointments`

Esta ruta está diseñada específicamente para soportar el calendario con **optimización de rendimiento** mediante la carga de turnos por rangos de fechas.

---

## 🎯 Estrategia de Rendimiento

### Concepto Principal

En lugar de cargar **todos los turnos del negocio** (que podría ser pesado), la API permite solicitar turnos solo del rango de fechas que el usuario está viendo en el calendario.

### Flujo Recomendado

1. **Carga inicial**: Solicitar turnos del mes actual
2. **Navegación**: Cuando el usuario se mueve en el calendario, solicitar los nuevos rangos necesarios
3. **Caché local**: Guardar en el frontend los turnos ya obtenidos para no volver a pedirlos

---

## 📡 Uso de la API

### Endpoint

```
GET /api/appointments
```

### Headers Requeridos

```
Authorization: Bearer {token}
```

### Parámetros de Query

| Parámetro        | Tipo   | Descripción                          | Ejemplo      |
| ---------------- | ------ | ------------------------------------ | ------------ |
| `startDate`      | string | Fecha inicio (YYYY-MM-DD)            | `2026-02-01` |
| `endDate`        | string | Fecha fin (YYYY-MM-DD)               | `2026-02-28` |
| `professionalId` | string | Filtrar por profesional (externalId) | `prof-001`   |
| `serviceId`      | string | Filtrar por servicio (externalId)    | `srv-001`    |
| `clientId`       | string | Filtrar por cliente (UUID)           | `uuid...`    |
| `status`         | string | Filtrar por estado(s)                | `confirmed`  |
| `page`           | number | Número de página                     | `1`          |
| `limit`          | number | Turnos por página                    | `50`         |
| `sortBy`         | string | Campo para ordenar                   | `date`       |
| `sortOrder`      | string | Orden (asc/desc)                     | `asc`        |

---

## 📅 Ejemplos de Uso para el Calendario

### 1. Vista Diaria - Cargar turnos del día actual

```typescript
// Ejemplo: 9 de febrero de 2026
const startDate = "2026-02-09";
const endDate = "2026-02-09";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=100&sortBy=date&sortOrder=asc`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 2. Vista Semanal - Cargar turnos de la semana

```typescript
// Semana del 9 al 15 de febrero de 2026
const startDate = "2026-02-09";
const endDate = "2026-02-15";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=200&sortBy=date&sortOrder=asc`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 3. Vista Mensual - Cargar turnos del mes completo

```typescript
// Mes completo de febrero de 2026
const startDate = "2026-02-01";
const endDate = "2026-02-28";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=500&sortBy=date&sortOrder=asc`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 4. Cargar turnos adicionales al navegar

```typescript
// Usuario avanza al mes siguiente (marzo 2026)
const startDate = "2026-03-01";
const endDate = "2026-03-31";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=500&sortBy=date&sortOrder=asc`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 5. Filtrar por profesional en el calendario

```typescript
// Ver solo turnos de un profesional específico
const startDate = "2026-02-01";
const endDate = "2026-02-28";
const professionalId = "prof-001";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&professionalId=${professionalId}&limit=500`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 6. Filtrar por estado

```typescript
// Ver solo turnos confirmados
const startDate = "2026-02-01";
const endDate = "2026-02-28";

const response = await fetch(
  `/api/appointments?startDate=${startDate}&endDate=${endDate}&status=confirmed&limit=500`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

---

## 📦 Estructura de Respuesta

```typescript
{
  "status": "success",
  "data": {
    "appointments": [
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
        "date": "2026-02-09",
        "startTime": "10:00",
        "endTime": "10:30",
        "duration": 30,
        "status": "confirmed",
        "price": 5000,
        "notes": null,
        "createdAt": "2026-02-01T10:00:00.000Z",
        "updatedAt": "2026-02-01T10:00:00.000Z",
        "cancelledAt": null,
        "cancelledReason": null,
        "completedAt": null
      }
      // ... más turnos
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 500,
      "totalPages": 1
    }
  }
}
```

---

## 🚀 Optimizaciones Recomendadas en el Frontend

### 1. Caché Inteligente

```typescript
// Mantener un mapa de turnos ya cargados
const appointmentsCache = new Map<string, Appointment[]>();

// Generar clave del rango
const getCacheKey = (start: string, end: string) => `${start}_${end}`;

// Verificar si ya tenemos esos datos
const cacheKey = getCacheKey(startDate, endDate);
if (appointmentsCache.has(cacheKey)) {
  return appointmentsCache.get(cacheKey);
}

// Si no, hacer la petición y guardar en caché
const appointments = await fetchAppointments(startDate, endDate);
appointmentsCache.set(cacheKey, appointments);
```

### 2. Carga Progresiva

```typescript
// Al cambiar de mes, cargar solo el nuevo rango
const handleMonthChange = async (newMonth: Date) => {
  const startOfMonth = format(newMonth, "yyyy-MM-01");
  const endOfMonth = format(endOfMonth(newMonth), "yyyy-MM-dd");

  // Solo cargar si no está en caché
  if (!hasAppointmentsForRange(startOfMonth, endOfMonth)) {
    await loadAppointments(startOfMonth, endOfMonth);
  }
};
```

### 3. Límites Generosos

```typescript
// Usar límites altos para reducir paginación
// La mayoría de negocios no tienen más de 500 turnos por mes
const APPOINTMENTS_LIMIT = 500;

// Si el total supera el límite, cargar las páginas restantes
if (pagination.totalPages > 1) {
  for (let page = 2; page <= pagination.totalPages; page++) {
    await loadAppointmentsPage(startDate, endDate, page);
  }
}
```

### 4. Prefetch Inteligente

```typescript
// Pre-cargar el mes siguiente cuando estamos a mitad del mes actual
useEffect(() => {
  const today = new Date();
  if (today.getDate() > 15) {
    // Pre-cargar próximo mes en segundo plano
    const nextMonth = addMonths(today, 1);
    prefetchMonthAppointments(nextMonth);
  }
}, [currentMonth]);
```

---

## ⚡ Ventajas de esta Implementación

1. **Rendimiento**: Solo se cargan los turnos necesarios
2. **Flexibilidad**: Soporta todas las vistas del calendario (día, semana, mes)
3. **Escalabilidad**: Funciona bien incluso con miles de turnos
4. **Filtrado**: Permite filtrar por profesional, servicio, estado, etc.
5. **Paginación**: Si hay muchos turnos en un rango, se pueden paginar

---

## 🎨 Estados de Turnos Disponibles

- `pending` - Pendiente de confirmación
- `confirmed` - Confirmado
- `in_progress` - En progreso
- `completed` - Completado
- `cancelled` - Cancelado
- `no_show` - Cliente no asistió

---

## 🔒 Seguridad

- Requiere **autenticación** (token JWT)
- Solo devuelve turnos del **negocio del usuario autenticado**
- No permite acceso a turnos de otros negocios

---

## 💡 Consejos Adicionales

1. **Para vista inicial del mes**: Pedir `limit=500` (suficiente para la mayoría de casos)
2. **Para búsquedas específicas**: Combinar filtros de fecha con profesional/servicio
3. **Para updates en tiempo real**: Considerar implementar WebSockets o polling cada X minutos
4. **Para mejor UX**: Mostrar loading mientras se cargan los datos de nuevos rangos
