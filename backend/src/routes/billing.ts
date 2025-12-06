import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
    listPublicPlans,
    getUsageSummaryForUser,
    consumeCreditsForUser,
    changePlanForUser,
    adjustCreditsForTenant,
} from '../services/billing/billingService';

const router = Router();

// 공개 요금제 리스트 조회
router.get('/plans', async (_req, res: Response) => {
    try {
        const plans = await listPublicPlans();
        return res.status(200).json({
            status: 'success',
            data: {
                plans,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: '요금제 정보를 불러오는 중 오류가 발생했습니다.',
        });
    }
});

// 현재 사용자 기준 사용량 요약 조회
router.get('/usage', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    try {
        const summary = await getUsageSummaryForUser(req.user.sub, req.user.email);
        return res.status(200).json({
            status: 'success',
            data: summary,
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: '사용량 정보를 불러오는 중 오류가 발생했습니다.',
        });
    }
});

// 크레딧 차감 테스트용 엔드포인트
router.post('/consume', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    const { amount, reason, metadata } = req.body ?? {};

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'amount는 0보다 큰 숫자여야 합니다.',
        });
    }

    try {
        const summary = await consumeCreditsForUser(
            req.user.sub,
            req.user.email,
            parsedAmount,
            typeof reason === 'string' && reason.trim().length > 0 ? reason : 'usage:test',
            metadata,
        );

        return res.status(200).json({
            status: 'success',
            data: summary,
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: '크레딧 차감 중 오류가 발생했습니다.',
        });
    }
});

// 현재 사용자 테넌트의 플랜 변경
router.post('/change-plan', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    const { planCode } = req.body ?? {};

    if (typeof planCode !== 'string' || planCode.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'planCode는 필수입니다.',
        });
    }

    try {
        const summary = await changePlanForUser(req.user.sub, req.user.email, planCode.trim());

        return res.status(200).json({
            status: 'success',
            data: summary,
        });
    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error?.message || '플랜 변경 중 오류가 발생했습니다.',
        });
    }
});

// 관리자용 크레딧 Top-up / 조정 API
router.post('/topup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: '관리자 권한이 필요합니다.',
        });
    }

    const { tenantId, amount, reason, metadata } = req.body ?? {};

    if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'tenantId는 필수입니다.',
        });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'amount는 0보다 큰 숫자여야 합니다.',
        });
    }

    try {
        // Top-up은 사용량을 줄이는 방향이므로 delta는 음수로 적용
        const summary = await adjustCreditsForTenant(
            tenantId.trim(),
            -parsedAmount,
            typeof reason === 'string' && reason.trim().length > 0 ? reason : 'topup:admin',
            metadata,
        );

        return res.status(200).json({
            status: 'success',
            data: summary,
        });
    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error?.message || '크레딧 Top-up 처리 중 오류가 발생했습니다.',
        });
    }
});

export default router;
