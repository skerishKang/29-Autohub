import { Request, Response, NextFunction } from 'express';

// 메트릭 수집 미들웨어 (추후 Prometheus 등으로 확장 가능)
export function metricsMiddleware(_req: Request, _res: Response, next: NextFunction): void {
    // TODO: 요청 카운트/응답 시간 등을 메트릭으로 적재
    next();
}
