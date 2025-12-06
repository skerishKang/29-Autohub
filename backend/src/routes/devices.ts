import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getOrCreateTenantIdForUser } from '../services/billing/billingService';
import { listDevicesForTenant, registerDeviceForTenant } from '../services/devices/deviceService';

const router = Router();

interface DeviceCreateRequestBody {
  deviceId?: string;
  name?: string;
}

// 현재 테넌트의 디바이스 목록 조회
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

    const devices = await listDevicesForTenant(tenantId);

    return res.status(200).json({
      status: 'success',
      data: {
        devices,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '디바이스 목록을 불러오는 중 오류가 발생했습니다.',
    });
  }
});

// 현재 테넌트에 디바이스 등록
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '인증 정보가 없습니다.',
    });
  }

  const { deviceId, name } = (req.body || {}) as DeviceCreateRequestBody;

  if (!deviceId) {
    return res.status(400).json({
      status: 'error',
      message: 'deviceId는 필수입니다.',
    });
  }

  try {
    const { sub: userId, email } = req.user;
    const tenantId = await getOrCreateTenantIdForUser(userId, email);

    // 웹에서 등록하는 디바이스에는 agentVersion 정보를 별도로 받지 않는다.
    await registerDeviceForTenant(tenantId, deviceId, name);

    return res.status(201).json({
      status: 'success',
      data: {
        deviceId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '디바이스 등록 중 오류가 발생했습니다.',
    });
  }
});

export default router;
