import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';
import { setupSwagger } from './config/swagger';
import { initializeLogger } from './config/logger';
import { metricsMiddleware } from './middleware/metrics';
import { initializeTelegramBot } from './services/telegram/telegramService';
import { initializeN8nWebhooks } from './services/n8n/n8nService';
import { startHealthChecks } from './services/health/healthService';
import { initializeUserService } from './services/users/userService';

// 라우트 임포트
import smsRoutes from './routes/sms';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import webhookRoutes from './routes/webhooks';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';

// 환경 변수 로드
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// 로거 초기화
const logger = initializeLogger();

// 보안 미들웨어
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS 설정
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://auto-hub.com'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// 속도 제한
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // 15분당 1000개 요청
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// 기본 미들웨어
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 미들웨어
app.use(requestLogger);
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim())
        }
    }));
}

// 메트릭 미들웨어
app.use(metricsMiddleware);

// API 라우트
app.use('/api/health', healthRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// 인증이 필요한 라우트
app.use('/api/protected', authMiddleware);
// 보호된 라우트들...

// Swagger 문서
setupSwagger(app);

// 기본 라우트
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'AutoHub Backend API',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 처리
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// 에러 핸들러
app.use(errorHandler);

// 서버 시작 함수
async function startServer() {
    try {
        logger.info('Starting AutoHub Backend Server...');
        
        // 데이터베이스 연결
        await connectDatabase();
        logger.info('Database connected successfully');

        // 유저 서비스 초기화 (users 테이블 생성 등)
        await initializeUserService();
        
        // Redis 연결
        await connectRedis();
        logger.info('Redis connected successfully');
        
        // 외부 서비스 초기화
        if (process.env.TELEGRAM_BOT_TOKEN) {
            await initializeTelegramBot();
            logger.info('Telegram bot initialized');
        }
        
        await initializeN8nWebhooks();
        logger.info('N8n webhooks initialized');
        
        // 헬스체크 서비스 시작
        startHealthChecks();
        logger.info('Health checks started');
        
        // 서버 시작
        server.listen(PORT, () => {
            logger.info(`🚀 AutoHub Backend Server is running on port ${PORT}`);
            logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
            logger.info(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        
        // Graceful shutdown 처리
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        process.on('SIGUSR2', gracefulShutdown); // Nodemon restart
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown 함수
function gracefulShutdown(signal: string) {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
            // 데이터베이스 연결 종료
            // await disconnectDatabase();
            
            // Redis 연결 종료
            // await disconnectRedis();
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    
    // 10초 후 강제 종료
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
}

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// 서버 시작
if (require.main === module) {
    startServer();
}

export default app;
export { app, server };