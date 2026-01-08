import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';

const app: Application = express();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Turnos Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            users: '/api/users',
        },
    });
});

app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
