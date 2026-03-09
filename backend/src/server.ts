import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import siteRoutes from './routes/site.routes';
import assetRoutes from './routes/asset.routes';
import surveyRoutes from './routes/survey.routes';
import photoRoutes from './routes/photo.routes';
import reviewRoutes from './routes/review.routes';
import dashboardRoutes from './routes/dashboard.routes';
import syncRoutes from './routes/sync.routes';
import { validateJwtSecretStrength } from './utils/security.utils';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Rate limiting — general API traffic
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Relaxed heavily in dev for massive initial background syncs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 1000, // Strict in prod, relaxed in dev for testing
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again in 15 minutes.' }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];

        // Allow requests with no origin (e.g., from IIS reverse proxy, curl, mobile apps)
        if (!origin) {
            return callback(null, true);
        }

        // Allow localhost only in development mode (security fix)
        if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(morgan('dev')); // Logging
// Limit JSON body size to prevent DoS attacks (10MB is sufficient for bulk sync)
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));

// Apply rate limiting in production only to avoid dev blocks
if (process.env.NODE_ENV === 'production') {
    app.use('/api', limiter);
}
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || '10mb', extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
if (process.env.NODE_ENV === 'production') {
    app.use('/api/auth', authLimiter, authRoutes);
} else {
    app.use('/api/auth', authRoutes);
}
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sync', syncRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);

    // Validate JWT_SECRET strength
    const jwtValidation = validateJwtSecretStrength(process.env.JWT_SECRET);
    if (!jwtValidation.isValid) {
        console.warn(`⚠️  SECURITY WARNING: ${jwtValidation.error}`);
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ CRITICAL: Insecure JWT_SECRET in production. Shutting down...');
            process.exit(1);
        }
    } else {
        console.log('✅ JWT_SECRET strength validated');
    }
});

export default app;
