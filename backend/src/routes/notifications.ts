import { Router, Request, Response } from 'express';

const router = Router();

// 알림 관련 라우트 (MVP 단계에서는 스텁)
router.post('/', (_req: Request, res: Response) => {
    res.status(501).json({
        status: 'error',
        message: '알림 처리 엔드포인트는 아직 구현되지 않았습니다.',
    });
});

export default router;
