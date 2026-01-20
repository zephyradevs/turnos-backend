import app from './app';
import prisma from './config/database';
import { config } from './config/env';
import { connectRedis } from './config/redis';
import { Logger } from './utils/logger';

const startServer = async (): Promise<void> => {
    try {
        // Test database connection
        await prisma.$connect();
        Logger.info('Database connected successfully');

        // Connect to Redis
        await connectRedis();

        // Start server
        app.listen(config.port, () => {
            Logger.info(`Server running on port ${config.port}`);
            Logger.info(`Environment: ${config.nodeEnv}`);
            Logger.info(`API available at http://localhost:${config.port}/api`);
        });
    } catch (error) {
        Logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
