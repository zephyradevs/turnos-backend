import { Request, Response } from 'express';
import { loginUser } from '../../services/auth/login-user.service';

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validar campos requeridos
        if (!email || !password) {
            res.status(400).json({
                status: 'error',
                message: 'Email y contraseña son requeridos',
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

        const result = await loginUser(email, password);

        res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    emailVerified: result.user.emailVerified,
                    lastLogin: result.user.lastLogin,
                },
                token: result.token,
            },
        });
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === 'Credenciales inválidas' ||
                error.message === 'Por favor verifica tu correo electrónico antes de iniciar sesión')
        ) {
            res.status(401).json({
                status: 'error',
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al procesar el inicio de sesión',
        });
    }
};
