import { Router, Request, Response } from 'express';
import { getDbPool } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getOrCreateTenantIdForUser, getCurrentMonthlyPeriod } from '../services/billing/billingService';

const router = Router();

// 테넌트 기준 월간 수신/발신 메트릭 요약
router.get('/summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    try {
        const { sub: userId, email } = req.user;
        const tenantId = await getOrCreateTenantIdForUser(userId, email);

        const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

        const pool = getDbPool();

        // created_at 기준으로 월간 집계
        const inboundResult = await pool.query(
            `SELECT COUNT(*) AS cnt
             FROM message_events
             WHERE tenant_id = $1
               AND direction = 'inbound'
               AND created_at >= $2::date
               AND created_at < $3::date`,
            [tenantId, periodStart, periodEnd],
        );

        const outboundTotalResult = await pool.query(
            `SELECT COUNT(*) AS cnt
             FROM message_events
             WHERE tenant_id = $1
               AND direction = 'outbound'
               AND created_at >= $2::date
               AND created_at < $3::date`,
            [tenantId, periodStart, periodEnd],
        );

        const outboundSuccessResult = await pool.query(
            `SELECT COUNT(*) AS cnt
             FROM message_events
             WHERE tenant_id = $1
               AND direction = 'outbound'
               AND status NOT LIKE 'failed%'
               AND created_at >= $2::date
               AND created_at < $3::date`,
            [tenantId, periodStart, periodEnd],
        );

        const inboundCount = Number(inboundResult.rows[0]?.cnt ?? 0);
        const outboundCount = Number(outboundTotalResult.rows[0]?.cnt ?? 0);
        const outboundSuccessCount = Number(outboundSuccessResult.rows[0]?.cnt ?? 0);
        const outboundFailedCount = outboundCount - outboundSuccessCount;
        const outboundSuccessRate = outboundCount > 0
            ? outboundSuccessCount / outboundCount
            : null;

        return res.status(200).json({
            status: 'success',
            data: {
                periodStart,
                periodEnd,
                inboundCount,
                outboundCount,
                outboundSuccessCount,
                outboundFailedCount,
                outboundSuccessRate,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: '통계 요약을 불러오는 중 오류가 발생했습니다.',
        });
    }
});

export default router;
