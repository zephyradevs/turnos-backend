import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import redisClient from '../config/redis';

// Extender la interfaz Request para incluir el usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

interface JwtPayload {
    userId: string;
    email: string;
}

interface SessionData {
    userId: string;
    email: string;
    token: string;
    loginTime: string;
}

/**
 * Middleware de autenticación que valida el token JWT y la sesión en Redis
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Obtener el token del header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                status: 'error',
                message: 'Token de acceso no proporcionado',
            });
            return;
        }

        const token = authHeader.substring(7); // Remover 'Bearer '

        // Verificar y decodificar el token JWT
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        } catch (jwtError) {
            res.status(401).json({
                status: 'error',
                message: 'Token inválido o expirado',
            });
            return;
        }

        // Verificar que la sesión existe en Redis
        const sessionKey = `session:${decoded.userId}`;
        const sessionData = await redisClient.get(sessionKey);

        if (!sessionData) {
            res.status(401).json({
                status: 'error',
                message: 'Sesión no encontrada o expirada',
            });
            return;
        }

        // Parsear los datos de la sesión
        const session: SessionData = JSON.parse(sessionData);

        // Verificar que el token coincide con el de la sesión
        if (session.token !== token) {
            res.status(401).json({
                status: 'error',
                message: 'Token no válido para esta sesión',
            });
            return;
        }

        // Agregar información del usuario al request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
        };

        next();
    } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno de autenticación',
        });
    }
};
