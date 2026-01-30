import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import notificationRoutes from './routes/notifications';

const app = express();

// Ensure upload directory exists
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle Multer errors
  if (err.message === 'Only PDF files are allowed') {
    res.status(400).json({ error: err.message });
    return;
  }
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'File size exceeds 10MB limit' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export default app;
