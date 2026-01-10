import nodemailer from 'nodemailer';
import { config } from '../../config/env';
import { Logger } from '../../utils/logger';

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: config.email.user && config.email.password ? {
        user: config.email.user,
        pass: config.email.password,
    } : undefined,
});

export async function sendVerificationCode(email: string, code: string): Promise<void> {
    try {
        const mailOptions = {
            from: config.email.from,
            to: email,
            subject: 'Código de Verificación - Turnos App',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Verifica tu correo electrónico</h2>
                    <p>Gracias por registrarte en Turnos App. Para completar tu registro, usa el siguiente código de verificación:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
                    </div>
                    <p>Este código expirará en ${config.verificationCodeExpiration} minutos.</p>
                    <p>Si no solicitaste este código, puedes ignorar este correo.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
                </div>
            `,
            text: `Código de Verificación: ${code}\n\nEste código expirará en ${config.verificationCodeExpiration} minutos.`,
        };

        await transporter.sendMail(mailOptions);
        Logger.info(`Verification code sent to ${email}`);
    } catch (error) {
        Logger.error('Error sending verification email:', error);
        throw new Error('Error al enviar el correo de verificación');
    }
}
