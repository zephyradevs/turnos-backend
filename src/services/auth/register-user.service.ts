import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { config } from '../../config/env';
import { generateVerificationCode, getCodeExpirationDate } from '../../utils/crypto';
import { sendVerificationCode } from '../email/send-verification-code.service';
import { getUserByEmail } from '../user/get-user-by-email.service';

export async function registerUser(email: string, password: string, name: string): Promise<User> {
    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error('El correo electrónico ya está registrado');
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Generar código de verificación
    const verificationCode = generateVerificationCode();
    const verificationExpiration = getCodeExpirationDate(config.verificationCodeExpiration);

    // Crear usuario
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            emailVerificationCode: verificationCode,
            emailVerificationExpiresAt: verificationExpiration,
        },
    });

    // Enviar email de verificación
    await sendVerificationCode(email, verificationCode);

    return user;
}
