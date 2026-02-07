# 🧪 Guía de Prueba Rápida - Dashboard API

## Pre-requisitos

1. ✅ Servidor corriendo: `npm run dev`
2. ✅ Base de datos PostgreSQL activa
3. ✅ Usuario registrado con negocio configurado
4. ✅ Al menos algunos turnos creados para el día actual

## Paso 1: Obtener Token de Autenticación

### Opción A: Registro + Login (si no tienes cuenta)

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'

# 2. Verificar email (revisa la base de datos para el código)
# O usa el código que llegó por email si está configurado

curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# 3. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Opción B: Login directo (si ya tienes cuenta)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "tupassword"
  }'
```

**Respuesta esperada:**

```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User"
    }
  }
}
```

**📋 Copia el TOKEN de la respuesta**

---

## Paso 2: Probar el Dashboard

### Con cURL

```bash
# Reemplaza YOUR_TOKEN_HERE con el token obtenido en el paso 1
curl -X GET http://localhost:3000/api/dashboard/today \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Con PowerShell (Windows)

```powershell
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/today" `
    -Method Get `
    -Headers $headers | ConvertTo-Json -Depth 10
```

### Con JavaScript (Node.js)

```javascript
// test-dashboard.js
const token = "YOUR_TOKEN_HERE";

fetch("http://localhost:3000/api/dashboard/today", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
})
  .then((res) => res.json())
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((err) => console.error("Error:", err));
```

Ejecutar con: `node test-dashboard.js`

---

## Respuesta Esperada

### ✅ Éxito (200 OK)

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
          /* datos del turno */
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

### ❌ Errores Posibles

#### No autenticado (401)

```json
{
  "status": "error",
  "message": "Usuario no autenticado"
}
```

**Solución:** Asegúrate de incluir el header `Authorization: Bearer TOKEN`

#### Token inválido o expirado (401)

```json
{
  "status": "error",
  "message": "Token inválido o expirado"
}
```

**Solución:** Haz login nuevamente para obtener un nuevo token

#### Negocio no encontrado (404)

```json
{
  "status": "error",
  "message": "No se encontró el negocio para este usuario"
}
```

**Solución:** Configura un negocio para el usuario primero usando `/api/business/configuration`

---

## Verificaciones Rápidas

### ✅ Checklist de Verificación

- [ ] El servidor está corriendo en http://localhost:3000
- [ ] Obtuviste un token válido del login
- [ ] El header Authorization está correctamente formateado
- [ ] El usuario tiene un negocio configurado
- [ ] La respuesta tiene status 200
- [ ] Los datos del dashboard están presentes

### 🔍 Inspeccionar los Datos

```javascript
// Verificar que hay próximos turnos
console.log("Próximos turnos:", data.data.upcomingAppointments.length);

// Verificar estadísticas del día
console.log("Total turnos del día:", data.data.dayStats.totalAppointments);
console.log("Ingresos totales:", data.data.dayStats.totalRevenue);

// Verificar profesionales
console.log(
  "Profesionales disponibles:",
  data.data.professionalStats.filter((p) => p.isAvailable).length,
);

// Verificar estado del negocio
console.log("Negocio abierto:", data.data.businessHours.isOpen);
```

---

## Testing con Postman

### Importar Colección

1. Abrir Postman
2. File → Import
3. Crear nueva request:
   - **Method:** GET
   - **URL:** `http://localhost:3000/api/dashboard/today`
   - **Headers:**
     - Key: `Authorization`
     - Value: `Bearer YOUR_TOKEN_HERE`
     - Key: `Content-Type`
     - Value: `application/json`
4. Click "Send"

### Guardar en Colección

Guarda la request para reutilizarla fácilmente:

- Nombre: "Get Today Dashboard"
- Carpeta: "Dashboard"

---

## Troubleshooting

### Problema: "Cannot GET /api/dashboard/today"

**Causa:** El servidor no está corriendo o la ruta no existe  
**Solución:**

```bash
# Verificar que el servidor esté corriendo
npm run dev

# Verificar rutas en src/routes/index.ts
```

### Problema: "401 Unauthorized"

**Causa:** Token no válido o no enviado  
**Solución:**

```bash
# Hacer login nuevamente
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}'
```

### Problema: "404 Not Found - Negocio no encontrado"

**Causa:** El usuario no tiene un negocio configurado  
**Solución:**

```bash
# Configurar el negocio primero
curl -X POST http://localhost:3000/api/business/configuration \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ /* datos del negocio */ }'
```

### Problema: "upcomingAppointments está vacío []"

**Causa:** No hay turnos creados para hoy o todos ya pasaron  
**Solución:**

```bash
# Crear un turno para hoy
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Cliente",
    "serviceId": "srv-001",
    "professionalId": "prof-001",
    "date": "'$(date +%Y-%m-%d)'",
    "startTime": "16:00",
    "endTime": "16:30"
  }'
```

---

## Logs del Servidor

Mientras pruebas, revisa los logs del servidor:

```bash
# Deberías ver algo como:
[INFO] Obteniendo dashboard de hoy { userId: '...' }
[INFO] Dashboard de hoy obtenido exitosamente {
  userId: '...',
  businessId: '...',
  totalAppointments: 12,
  upcomingCount: 5
}
```

---

## ✅ Todo Correcto Si...

1. ✅ Obtienes status 200
2. ✅ `data.currentTime` tiene un timestamp válido
3. ✅ `data.dayStats` tiene las estadísticas correctas
4. ✅ `data.businessHours` muestra los horarios
5. ✅ Los arrays tienen los datos esperados

## 🎉 ¡Listo!

Si ves una respuesta exitosa con todos los datos, **la API está funcionando correctamente**.

Ahora puedes integrarla con tu frontend usando los ejemplos en:

- `docs/FRONTEND_INTEGRATION_EXAMPLE.tsx`
- `docs/API_DASHBOARD.md`
