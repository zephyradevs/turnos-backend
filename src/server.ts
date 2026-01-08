import app from './app';
import { config } from './config/env';
import { Logger } from './utils/logger';
import prisma from './config/database';

const startServer = async (): Promise<void> => {
    try {
        // Test database connection
        await prisma.$connect();
        Logger.info('Database connected successfully');

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
