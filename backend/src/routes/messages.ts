import { Router, Request, Response } from 'express';
import { getDbPool } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getOrCreateTenantIdForUser } from '../services/billing/billingService';

const router = Router();

// 테넌트 기준 최근 메시지 이벤트 목록
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '인증 정보가 없습니다.',
    });
  }

  try {
    const { sub: userId, email } = req.user;
    const tenantId = await getOrCreateTenantIdForUser(userId, email);

    const pool = getDbPool();

    const { direction, limit } = (req.query || {}) as {
      direction?: string;
      limit?: string;
    };

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const params: any[] = [tenantId, parsedLimit];
    let directionFilter = '';
    if (direction === 'inbound' || direction === 'outbound') {
      directionFilter = 'AND direction = $3';
      params.push(direction);
    }

    const result = await pool.query(
      `SELECT id, tenant_id, direction, channel, device_id, external_id, sender, recipient,
              body, status, error_code, error_message, received_at, created_at, updated_at
         FROM message_events
        WHERE tenant_id = $1
        ${directionFilter}
        ORDER BY created_at DESC
        LIMIT $2`,
      params,
    );

    return res.status(200).json({
      status: 'success',
      data: {
        messages: result.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '메시지 로그를 불러오는 중 오류가 발생했습니다.',
    });
  }
});

export default router;
