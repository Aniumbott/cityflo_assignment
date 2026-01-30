import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (one level up from /backend)
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });
// Also load from backend dir if it exists (for Docker/Render where .env is local)
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtExpiresIn: 900,          // 15 minutes in seconds
  jwtRefreshExpiresIn: 604800, // 7 days in seconds
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};
