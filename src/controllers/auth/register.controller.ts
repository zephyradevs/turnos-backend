import { Request, Response } from 'express';
import { registerUser } from '../../services/auth/register-user.service';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Validar campos requeridos
        if (!email || !password || !name) {
            res.status(400).json({
                status: 'error',
                message: 'Email, password y nombre son requeridos',
            });
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                status: 'error',
                message: 'El formato del email no es válido',
            });
            return;
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            res.status(400).json({
                status: 'error',
                message: 'La contraseña debe tener al menos 6 caracteres',
            });
            return;
        }

        const user = await registerUser(email, password, name);

        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'El correo electrónico ya está registrado') {
            res.status(409).json({
                status: 'error',
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al registrar usuario',
            data: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
