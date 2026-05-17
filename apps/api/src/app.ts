import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import customerRoutes from './routes/customers';
import invoiceRoutes from './routes/invoices';
import dashboardRoutes from './routes/dashboard';

const app = express();

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Rate limiting — 100 req/min per IP
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'RATE_LIMIT', message: 'Too many requests, please try again later.', status: 429 },
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/customers', customerRoutes);
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/dashboard', dashboardRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found', status: 404 });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
