import { Request, Response } from 'express';
import { verifyUserEmail } from '../../services/auth/verify-user-email.service';

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, code } = req.body;

        // Validar campos requeridos
        if (!email || !code) {
            res.status(400).json({
                status: 'error',
                message: 'Email y código son requeridos',
            });
            return;
        }

        // Validar formato del código (6 dígitos)
        if (!/^\d{6}$/.test(code)) {
            res.status(400).json({
                status: 'error',
                message: 'El código debe tener 6 dígitos',
            });
            return;
        }

        const user = await verifyUserEmail(email, code);

        res.status(200).json({
            status: 'success',
            message: 'Correo electrónico verificado exitosamente',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
            },
        });
    } catch (error) {
        if (error instanceof Error) {
            const errorMessages = [
                'Usuario no encontrado',
                'El correo electrónico ya ha sido verificado',
                'Código de verificación inválido',
                'El código de verificación ha expirado',
            ];

            if (errorMessages.includes(error.message)) {
                res.status(400).json({
                    status: 'error',
                    message: error.message,
                });
                return;
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al verificar el correo electrónico',
            data: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
