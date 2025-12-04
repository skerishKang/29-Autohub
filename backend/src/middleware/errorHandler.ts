import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// 전역 에러 처리 미들웨어
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    logger.error('요청 처리 중 오류 발생', {
        path: req.originalUrl,
        method: req.method,
        error: err,
    });

    const statusCode = (err as any)?.statusCode || 500;
    const message = statusCode === 500
        ? '서버 내부 오류가 발생했습니다.'
        : (err as any)?.message || '요청 처리 중 오류가 발생했습니다.';

    res.status(statusCode).json({
        status: 'error',
        message,
        timestamp: new Date().toISOString(),
    });
}
