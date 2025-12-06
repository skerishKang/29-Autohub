import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getOrCreateTenantIdForUser, consumeCreditsForUser } from '../services/billing/billingService';
import { logOutboundMessageEvent } from '../services/messages/messageLogService';

const router = Router();

interface NotificationRequestBody {
    channel?: string;
    deviceId?: string;
    recipient?: string;
    body?: string;
}

// 아웃바운드 알림/메시지 발송 API
router.post('/', authMiddleware, async (
    req: AuthenticatedRequest,
    res: Response,
) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    const { channel, deviceId, recipient, body } = (req.body || {}) as NotificationRequestBody;

    if (!channel || !body) {
        return res.status(400).json({
            status: 'error',
            message: 'channel과 body는 필수입니다.',
        });
    }

    try {
        const { sub: userId, email } = req.user;

        // 유저 기준 테넌트 식별
        const tenantId = await getOrCreateTenantIdForUser(userId, email);

        // 메시지 이벤트 로그 (실제 외부 발송 로직은 이후 단계에서 연동 예정)
        const messageEventId = await logOutboundMessageEvent({
            tenantId,
            channel,
            deviceId,
            recipient,
            body,
            status: 'queued',
        });

        // 발신 1건당 1 크레딧 차감 (소프트 리미트, 마이너스 허용)
        const billingSummary = await consumeCreditsForUser(
            userId,
            email,
            1,
            'outbound:notification',
            { channel, deviceId, recipient, messageEventId },
        );

        return res.status(200).json({
            status: 'success',
            data: {
                messageEventId,
                billing: billingSummary,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: '알림 처리 중 오류가 발생했습니다.',
        });
    }
});

export default router;
