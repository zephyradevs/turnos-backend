import { User } from '@prisma/client';
import prisma from '../../config/database';
import { getUserByEmail } from '../user/get-user-by-email.service';

export async function verifyUserEmail(email: string, code: string): Promise<User> {
    // Buscar usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    // Verificar si ya está verificado
    if (user.emailVerified) {
        throw new Error('El correo electrónico ya ha sido verificado');
    }

    // Verificar si el código coincide
    if (user.emailVerificationCode !== code) {
        throw new Error('Código de verificación inválido');
    }

    // Verificar si el código ha expirado
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
        throw new Error('El código de verificación ha expirado');
    }

    // Marcar email como verificado y limpiar código de verificación
    const updatedUser = await prisma.user.update({
        where: { email },
        data: {
            emailVerified: true,
            emailVerificationCode: null,
            emailVerificationExpiresAt: null,
        },
    });

    return updatedUser;
}
