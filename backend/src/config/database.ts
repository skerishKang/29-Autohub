import { Pool } from 'pg';
import { logger } from './logger';

let pool: Pool | null = null;

/**
 * PostgreSQL 연결 초기화
 */
export async function connectDatabase(): Promise<Pool> {
    if (pool) {
        return pool;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 5432);
    const user = process.env.DB_USER || 'autohub';
    const password = process.env.DB_PASSWORD || 'autohub123';
    const database = process.env.DB_NAME || 'autohub';

    pool = new Pool({
        host,
        port,
        user,
        password,
        database,
        max: Number(process.env.DB_MAX_CLIENTS || 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    });

    try {
        await pool.query('SELECT 1');
        logger.info('PostgreSQL 연결 성공', { host, database });
    } catch (error) {
        logger.error('PostgreSQL 연결 실패', { error });
        throw error;
    }

    return pool;
}

/**
 * 연결된 Pool 반환 (없으면 에러)
 */
export function getDbPool(): Pool {
    if (!pool) {
        throw new Error('Database not connected. connectDatabase()를 먼저 호출하세요.');
    }
    return pool;
}

/**
 * 애플리케이션 종료 시 Pool 정리용
 */
export async function disconnectDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('PostgreSQL 연결 종료');
    }
}
