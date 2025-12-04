import { Request, Response, NextFunction } from 'express';

// 인증 미들웨어 (MVP 단계에서는 통과만 수행)
export function authMiddleware(_req: Request, _res: Response, next: NextFunction): void {
    // TODO: 토큰 기반 인증/인가 로직 추가
    next();
}
