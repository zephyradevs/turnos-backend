import crypto from 'crypto';

/**
 * Genera un código de verificación de 6 dígitos
 */
export function generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Calcula la fecha de expiración del código de verificación
 * @param minutes - Minutos hasta la expiración
 */
export function getCodeExpirationDate(minutes: number): Date {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + minutes);
    return expirationDate;
}
