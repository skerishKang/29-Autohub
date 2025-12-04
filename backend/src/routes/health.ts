import { Router, Request, Response } from 'express';
import { getHealthStatus } from '../services/health/healthService';

const router = Router();

// 기본 헬스 체크 엔드포인트
router.get('/', (_req: Request, res: Response) => {
    const status = getHealthStatus();

    res.json({
        status: status.healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
    });
});

export default router;
