import axios from 'axios';
import { logger } from '../../config/logger';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// n8n 초기화 (현재는 설정 확인 및 로깅 정도만 수행)
export async function initializeN8nWebhooks(): Promise<void> {
    if (!N8N_WEBHOOK_URL) {
        logger.warn('N8N_WEBHOOK_URL이 설정되지 않아 n8n 연동이 비활성화됩니다.');
        return;
    }

    logger.info('n8n 연동 초기화 완료', {
        webhookUrl: N8N_WEBHOOK_URL,
    });
}

// n8n 포워딩에 사용할 페이로드 타입
export interface N8nForwardPayload {
    type: 'sms' | 'notification';
    data: unknown;
}

// n8n Webhook으로 이벤트 포워딩
export async function forwardToN8n(type: 'sms' | 'notification', data: unknown): Promise<void> {
    if (!N8N_WEBHOOK_URL) {
        logger.debug('N8N_WEBHOOK_URL 미설정 상태이므로 n8n 포워딩을 건너뜁니다.', { type });
        return;
    }

    try {
        await axios.post(
            N8N_WEBHOOK_URL,
            { type, data },
            {
                timeout: Number(process.env.N8N_TIMEOUT_MS || 5000),
            },
        );

        logger.info('n8n으로 이벤트 포워딩 완료', { type });
    } catch (error: unknown) {
        logger.error('n8n 포워딩 중 오류 발생', { type, error });
    }
}
