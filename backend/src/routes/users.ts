import { Router, Request, Response } from 'express';

const router = Router();

// 유저 관련 라우트 (MVP 단계에서는 스텁)
router.get('/', (_req: Request, res: Response) => {
    res.status(501).json({
        status: 'error',
        message: '유저 관련 API는 아직 구현되지 않았습니다.',
    });
});

export default router;
