import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AIFilteringService } from '../services/ai/aiFilteringService';
import { forwardToN8n } from '../services/n8n/n8nService';
import { MessageAnalysisResult } from '../services/types';
import { logInboundSmsEvent } from '../services/messages/messageLogService';
import { findTenantIdByDeviceId, updateDeviceLastSeenAt } from '../services/devices/deviceService';
import { consumeCreditsForTenant } from '../services/billing/billingService';

const router = Router();

// SMS 요청 바디 타입
interface SmsRequestBody {
    deviceId: string;
    messageId: string;
    sender: string;
    body: string;
    receivedAt: string;
    raw?: unknown;
}

let smsAiService: AIFilteringService | null = null;

// AI 필터링 서비스 Lazy 초기화
function getAiService(): AIFilteringService | null {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    if (!smsAiService) {
        try {
            smsAiService = new AIFilteringService();
            logger.info('AIFilteringService 초기화 완료 (SMS)');
        } catch (error: unknown) {
            logger.error('AIFilteringService 초기화 실패', { error });
            smsAiService = null;
        }
    }

    return smsAiService;
}

// SMS 수신 엔드포인트
router.post('/', async (
    req: Request<unknown, unknown, SmsRequestBody>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { deviceId, messageId, sender, body, receivedAt, raw } = req.body || {} as SmsRequestBody;

        if (!deviceId || !sender || !body || !receivedAt) {
            return res.status(400).json({
                status: 'error',
                message: 'deviceId, sender, body, receivedAt는 필수입니다.',
            });
        }

        const event = {
            deviceId,
            messageId,
            sender,
            body,
            receivedAt,
            raw,
        };

        // 디바이스 마지막 통신 시각 업데이트 (등록 여부와 무관하게 시도)
        try {
            await updateDeviceLastSeenAt(deviceId);
        } catch (error) {
            logger.error('디바이스 last_seen_at 업데이트 중 오류', { error, deviceId });
        }

        let tenantId: string | null = null;
        try {
            tenantId = await findTenantIdByDeviceId(deviceId);
        } catch (error) {
            logger.error('디바이스 기준 테넌트 조회 중 오류', { error, deviceId });
        }

        await logInboundSmsEvent({
            deviceId,
            messageId,
            sender,
            body,
            receivedAt,
            tenantId: tenantId ?? undefined,
        });

        if (tenantId) {
            // 수신 1건당 0.5 크레딧 차감 (소프트 리미트, 마이너스 허용)
            try {
                await consumeCreditsForTenant(tenantId, 0.5, 'inbound:sms', {
                    deviceId,
                    messageId,
                    sender,
                });
            } catch (error) {
                // 과금 실패는 로깅만 하고 수신 처리 자체는 성공으로 유지
                logger.error('인바운드 SMS 크레딧 차감 중 오류', { error, deviceId, tenantId });
            }
        }

        let analysis: MessageAnalysisResult | null = null;
        const aiService = getAiService();

        if (aiService) {
            analysis = await aiService.analyzeSMS(body, sender);
        }

        const payloadForN8n = {
            ...event,
            analysis,
        };

        await forwardToN8n('sms', payloadForN8n);

        return res.status(200).json({
            status: 'success',
            data: {
                deviceId,
                messageId,
                sender,
                receivedAt,
                analysis,
                forwardedToN8n: Boolean(process.env.N8N_WEBHOOK_URL),
            },
        });
    } catch (error) {
        return next(error as unknown as Error);
    }
});

export default router;
