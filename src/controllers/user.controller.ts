import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    // Get all users
    getAllUsers = async (_req: Request, res: Response): Promise<void> => {
        try {
            const users = await this.userService.getAllUsers();
            res.status(200).json({
                success: true,
                data: users,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener usuarios',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    // Get user by ID
    getUserById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = await this.userService.getUserById(Number(id));

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener usuario',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    // Create new user
    createUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const userData = req.body;
            const newUser = await this.userService.createUser(userData);

            res.status(201).json({
                success: true,
                message: 'Usuario creado exitosamente',
                data: newUser,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al crear usuario',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    // Update user
    updateUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userData = req.body;
            const updatedUser = await this.userService.updateUser(Number(id), userData);

            if (!updatedUser) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Usuario actualizado exitosamente',
                data: updatedUser,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al actualizar usuario',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    // Delete user
    deleteUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const deletedUser = await this.userService.deleteUser(Number(id));

            if (!deletedUser) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Usuario eliminado exitosamente',
                data: deletedUser,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al eliminar usuario',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
}
