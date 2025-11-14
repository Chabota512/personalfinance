// Security Configuration
// 
// Required Environment Variables:
// - ENCRYPTION_KEY: For encrypting sensitive data (set in Replit Secrets)
// - GEMINI_API_KEY: For AI features (optional, set in Replit Secrets)
// 
// To configure:
// 1. Open Secrets tool in left sidebar
// 2. Add ENCRYPTION_KEY with a strong random string (32+ chars)
// 3. Add GEMINI_API_KEY with your Google AI API key (optional)



import CryptoJS from 'crypto-js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import cors from 'cors';

// Validate environment variables
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: ENCRYPTION_KEY not set. Using default key. Please configure in Replit Secrets.');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

export function decryptData(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function setupSecurity(app: Express) {
  // Trust proxy for Replit environment (enables X-Forwarded-For header handling)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development, enable in production with proper config
  }));

  // CORS configuration - allow mobile app and web origins
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:5000',
        'http://localhost:5173',
        'https://localhost:5000',
        'https://localhost:5173',
        'capacitor://localhost',
        'https://localhost',
        'ionic://localhost',
        'http://localhost',
        'https://personalfinance-pro-backend.onrender.com',
      ];

      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.replit.dev') || origin.endsWith('.onrender.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });

  app.use('/api/', limiter);

  // Strict rate limit for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.',
  });

  app.use('/api/auth/', authLimiter);
}