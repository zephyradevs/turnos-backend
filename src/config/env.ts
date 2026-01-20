import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,

    // Email configuration
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@turnos-app.com',
    },

    // Verification code expiration (in minutes)
    verificationCodeExpiration: parseInt(process.env.VERIFICATION_CODE_EXPIRATION || '15'),

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
    },

    // Redis configuration
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
};
