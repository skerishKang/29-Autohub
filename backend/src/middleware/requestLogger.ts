import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// 기본 요청 로깅 미들웨어
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('요청 로그', {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
        });
    });

    next();
}
