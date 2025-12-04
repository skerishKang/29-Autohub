import { Router, Request, Response } from 'express';

const router = Router();

// 외부 서비스 Webhook 수신 라우트 (MVP 단계에서는 스텁)
router.post('/', (_req: Request, res: Response) => {
    res.status(501).json({
        status: 'error',
        message: 'Webhook 수신 엔드포인트는 아직 구현되지 않았습니다.',
    });
});

export default router;
