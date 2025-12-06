import { Router, Response } from 'express';
import { getDbPool } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getCurrentMonthlyPeriod } from '../services/billing/billingService';

const router = Router();

// 글로벌 관리자용 테넌트 요약 조회
router.get('/tenants', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

  try {
    const pool = getDbPool();
    const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

    const result = await pool.query(
      `SELECT
          t.id,
          t.name,
          t.plan_code,
          p.name AS plan_name,
          p.price_monthly,
          p.included_credits,
          COALESCE(u.credits_used, 0) AS credits_used,
          COALESCE(mi.inbound_count, 0) AS inbound_count,
          COALESCE(mo.outbound_count, 0) AS outbound_count,
          COALESCE(d.device_count, 0) AS device_count,
          t.created_at
        FROM tenants t
        JOIN plans p ON p.code = t.plan_code
        LEFT JOIN (
          SELECT tenant_id, SUM(credits_used) AS credits_used
          FROM tenant_usage_periods
          WHERE period_start = $1 AND period_end = $2
          GROUP BY tenant_id
        ) u ON u.tenant_id = t.id
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) AS inbound_count
          FROM message_events
          WHERE direction = 'inbound'
            AND created_at >= $1::date
            AND created_at < $2::date
          GROUP BY tenant_id
        ) mi ON mi.tenant_id = t.id
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) AS outbound_count
          FROM message_events
          WHERE direction = 'outbound'
            AND created_at >= $1::date
            AND created_at < $2::date
          GROUP BY tenant_id
        ) mo ON mo.tenant_id = t.id
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) AS device_count
          FROM devices
          GROUP BY tenant_id
        ) d ON d.tenant_id = t.id
        ORDER BY t.created_at DESC`,
      [periodStart, periodEnd],
    );

    return res.status(200).json({
      status: 'success',
      data: {
        periodStart,
        periodEnd,
        tenants: result.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '관리자용 테넌트 요약을 불러오는 중 오류가 발생했습니다.',
    });
  }
});

export default router;
