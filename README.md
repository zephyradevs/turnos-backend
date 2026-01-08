# Turnos Backend

Express + TypeScript + Prisma + PostgreSQL backend application.

## 📋 Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

## 🚀 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Copiar el archivo `.env` y ajustar la URL de la base de datos PostgreSQL.

3. Configurar Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

## 🏃 Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
turnos-backend/
├── src/
│   ├── config/          # Configuración (database, env)
│   ├── controllers/     # Lógica de controladores
│   ├── models/          # Modelos de Prisma
│   ├── routes/          # Definición de rutas
│   ├── middlewares/     # Middlewares personalizados
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades
│   ├── app.ts           # Configuración de Express
│   └── server.ts        # Inicialización del servidor
├── prisma/
│   └── schema.prisma    # Esquema de Prisma
├── .env                 # Variables de entorno
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Users

- `GET /api/users` - Obtener todos los usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear nuevo usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Health Check

- `GET /api/health` - Verificar estado del servidor

## 🗄️ Prisma Commands

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Crear migración
npm run prisma:migrate

# Abrir Prisma Studio
npm run prisma:studio
```

## 📝 Ejemplo de Uso

### Crear un usuario

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "securepassword"
  }'
```

## 🛠️ Tecnologías

- **Express** - Framework web
- **TypeScript** - Lenguaje tipado
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **Helmet** - Seguridad
- **Morgan** - Logger HTTP
- **CORS** - Cross-Origin Resource Sharing

## 📄 Licencia

ISC
