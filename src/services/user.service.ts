import prisma from '../config/database';
import { User, Prisma } from '@prisma/client';

export class UserService {
    // Get all users
    async getAllUsers(): Promise<User[]> {
        return await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get user by ID
    async getUserById(id: number): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { id },
        });
    }

    // Get user by email
    async getUserByEmail(email: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { email },
        });
    }

    // Create user
    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return await prisma.user.create({
            data,
        });
    }

    // Update user
    async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<User | null> {
        try {
            return await prisma.user.update({
                where: { id },
                data,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return null; // Record not found
                }
            }
            throw error;
        }
    }

    // Delete user
    async deleteUser(id: number): Promise<User | null> {
        try {
            return await prisma.user.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return null; // Record not found
                }
            }
            throw error;
        }
    }
}
