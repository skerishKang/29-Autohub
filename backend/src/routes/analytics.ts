import { Router, Request, Response } from 'express';

const router = Router();

// 간단한 통계/분석 API (MVP 단계에서는 스텁)
router.get('/summary', (_req: Request, res: Response) => {
    res.status(501).json({
        status: 'error',
        message: '통계/분석 API는 아직 구현되지 않았습니다.',
    });
});

export default router;
