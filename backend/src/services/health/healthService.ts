import { logger } from '../../config/logger';

// 간단한 헬스 상태 플래그 (추후 DB/Redis 체크로 확장 가능)
let isHealthy = true;

// 주기적인 헬스 체크 시작 (현재는 스텁)
export function startHealthChecks(): void {
    logger.info('헬스 체크 서비스 초기화 (현재는 간단한 스텁 구현)');

    // TODO: 필요 시 DB/Redis Ping을 주기적으로 수행하도록 확장
}

export function getHealthStatus(): { healthy: boolean } {
    return { healthy: isHealthy };
}
