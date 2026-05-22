import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/errors';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import tasksRouter from './modules/tasks/tasks.router';
import openapiSpec from './config/openapi.json';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Turn off for swagger UI rendering if needed
}));

// CORS middleware
app.use(cors({
  origin: '*', // Allow all for evaluation simplicity, can narrow down in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiter to prevent brute-force attacks on auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter);

// Body parser
app.use(express.json());

// HTTP Request Logger
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Swagger Documentation Route
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Task Manager API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// App API Module Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/tasks', tasksRouter);

// Fallback for unhandled endpoints
app.all('*', (req, res, next) => {
  next(new AppError(`Endpoint '${req.method} ${req.originalUrl}' not found on this server.`, 404));
});

// Global Error Handler Middleware
app.use(errorHandler);

// Spin up server
app.listen(config.port, () => {
  console.log(`[Server] Running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`[Docs] Swagger interactive documentation API is online at http://localhost:${config.port}/api/v1/docs`);
});
