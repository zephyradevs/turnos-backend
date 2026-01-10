import { User } from '@prisma/client';
import prisma from '../../config/database';

export async function getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
        where: { email },
    });
}
