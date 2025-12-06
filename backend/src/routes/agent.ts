import { Router, Request, Response } from 'express';
import { registerDeviceForTenant, getDeviceByDeviceId } from '../services/devices/deviceService';
import { getOrCreateAgentTenant } from '../services/billing/billingService';
import { logger } from '../config/logger';

const router = Router();

interface AgentDeviceRegisterBody {
    deviceId?: string;
    name?: string;
}

const DEFAULT_AGENT_SECRET = 'dev-agent-secret';

function getAgentSecret(): string {
    const fromEnv = process.env.AGENT_REGISTRATION_SECRET;
    if (fromEnv && fromEnv.trim().length > 0) {
        return fromEnv.trim();
    }
    // 개발 편의를 위한 기본 값
    return DEFAULT_AGENT_SECRET;
}

router.post('/devices/register', async (req: Request<unknown, unknown, AgentDeviceRegisterBody>, res: Response) => {
    try {
        const configuredSecret = getAgentSecret();
        if (!configuredSecret) {
            return res.status(500).json({
                status: 'error',
                message: '에이전트 등록용 시크릿이 서버에 설정되지 않았습니다.',
            });
        }

        const headerSecret = (req.header('x-agent-secret') || req.header('x-agent-token') || '').trim();

        if (!headerSecret || headerSecret !== configuredSecret) {
            return res.status(401).json({
                status: 'error',
                message: '유효하지 않은 에이전트 시크릿입니다.',
            });
        }

        const { deviceId, name } = req.body || {};

        if (!deviceId) {
            return res.status(400).json({
                status: 'error',
                message: 'deviceId는 필수입니다.',
            });
        }

        const tenantId = await getOrCreateAgentTenant();
        await registerDeviceForTenant(tenantId, deviceId, name);

        logger.info('에이전트 디바이스 등록 완료', { tenantId, deviceId });

        return res.status(201).json({
            status: 'success',
            data: {
                deviceId,
            },
        });
    } catch (error) {
        logger.error('에이전트 디바이스 등록 중 오류', { error });
        return res.status(500).json({
            status: 'error',
            message: '에이전트 디바이스 등록 중 오류가 발생했습니다.',
        });
    }
});

router.get('/devices/:deviceId/status', async (req: Request, res: Response) => {
    try {
        const configuredSecret = getAgentSecret();
        if (!configuredSecret) {
            return res.status(500).json({
                status: 'error',
                message: '에이전트 등록용 시크릿이 서버에 설정되지 않았습니다.',
            });
        }

        const headerSecret = (req.header('x-agent-secret') || req.header('x-agent-token') || '').trim();

        if (!headerSecret || headerSecret !== configuredSecret) {
            return res.status(401).json({
                status: 'error',
                message: '유효하지 않은 에이전트 시크릿입니다.',
            });
        }

        const { deviceId } = req.params;

        if (!deviceId) {
            return res.status(400).json({
                status: 'error',
                message: 'deviceId 파라미터는 필수입니다.',
            });
        }

        const device = await getDeviceByDeviceId(deviceId);

        if (!device) {
            return res.status(200).json({
                status: 'success',
                data: {
                    exists: false,
                },
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                exists: true,
                device,
            },
        });
    } catch (error) {
        logger.error('에이전트 디바이스 상태 조회 중 오류', { error });
        return res.status(500).json({
            status: 'error',
            message: '에이전트 디바이스 상태 조회 중 오류가 발생했습니다.',
        });
    }
});

export default router;
