import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../services/users/userService';
import { logger } from '../config/logger';

// 인증 미들웨어 (MVP 단계에서는 통과만 수행)
export interface AuthenticatedRequest extends Request {
    user?: AuthTokenPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            status: 'error',
            message: '인증 토큰이 필요합니다.',
        });
        return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

    try {
        const payload = jwt.verify(token, secret) as AuthTokenPayload;
        (req as AuthenticatedRequest).user = payload;
        next();
    } catch (error) {
        logger.warn('JWT 검증 실패', { error });
        res.status(401).json({
            status: 'error',
            message: '유효하지 않은 토큰입니다.',
        });
    }
}
