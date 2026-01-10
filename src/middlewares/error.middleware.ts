import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Error:', err);

    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};

export const notFoundHandler = (
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        data: { path: req.originalUrl },
    });
};
