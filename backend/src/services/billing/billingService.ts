import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../../config/database';
import { logger } from '../../config/logger';

let initialized = false;

export async function initializeBillingService(): Promise<void> {
    if (initialized) return;

    const pool: Pool = getDbPool();

    const ddl = `
        CREATE TABLE IF NOT EXISTS plans (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price_monthly INTEGER NOT NULL,
            price_yearly INTEGER NOT NULL,
            included_credits INTEGER NOT NULL,
            device_limit INTEGER NOT NULL,
            workflow_limit INTEGER NOT NULL,
            member_limit INTEGER NOT NULL,
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tenants (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            plan_code TEXT NOT NULL REFERENCES plans(code),
            timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tenant_usage_periods (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            credits_used BIGINT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, period_start, period_end)
        );

        CREATE TABLE IF NOT EXISTS credit_transactions (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            amount BIGINT NOT NULL,
            reason TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tenant_members (
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            user_id UUID NOT NULL REFERENCES users(id),
            role TEXT NOT NULL DEFAULT 'owner',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (tenant_id, user_id)
        );
    `;

    await pool.query(ddl);

    const upsertPlansSql = `
        INSERT INTO plans (
            code,
            name,
            price_monthly,
            price_yearly,
            included_credits,
            device_limit,
            workflow_limit,
            member_limit,
            is_public
        ) VALUES
            ('FREE', '무료', 0, 0, 1000, 1, 3, 1, TRUE),
            ('P9', '9K 플랜', 9000, 86400, 10000, 1, 5, 1, TRUE),
            ('P19', '19K 플랜', 19000, 182400, 25000, 2, 10, 3, TRUE),
            ('P29', '29K 플랜', 29000, 278400, 45000, 3, 15, 5, TRUE),
            ('P49', '49K 플랜', 49000, 470400, 80000, 5, 25, 8, TRUE),
            ('P99', '99K 플랜', 99000, 950400, 200000, 10, 50, 15, TRUE),
            ('P149', '149K 플랜', 149000, 1430400, 400000, 20, 100, 30, TRUE)
        ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            price_monthly = EXCLUDED.price_monthly,
            price_yearly = EXCLUDED.price_yearly,
            included_credits = EXCLUDED.included_credits,
            device_limit = EXCLUDED.device_limit,
            workflow_limit = EXCLUDED.workflow_limit,
            member_limit = EXCLUDED.member_limit,
            is_public = EXCLUDED.is_public,
            updated_at = now();
    `;

    await pool.query(upsertPlansSql);

    initialized = true;
    logger.info('Billing service initialized');
}

export interface Plan {
    code: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    includedCredits: number;
    deviceLimit: number;
    workflowLimit: number;
    memberLimit: number;
    isPublic: boolean;
}

function mapPlanRow(row: any): Plan {
    return {
        code: row.code,
        name: row.name,
        priceMonthly: Number(row.price_monthly),
        priceYearly: Number(row.price_yearly),
        includedCredits: Number(row.included_credits),
        deviceLimit: Number(row.device_limit),
        workflowLimit: Number(row.workflow_limit),
        memberLimit: Number(row.member_limit),
        isPublic: Boolean(row.is_public),
    };
}

export async function listPublicPlans(): Promise<Plan[]> {
    const pool: Pool = getDbPool();
    const result = await pool.query('SELECT * FROM plans WHERE is_public = TRUE ORDER BY price_monthly ASC');
    return result.rows.map(mapPlanRow);
}

interface TenantInfo {
    tenantId: string;
    plan: Plan;
}

export function getCurrentMonthlyPeriod(now: Date): { periodStart: string; periodEnd: string } {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-based

    const periodStartDate = new Date(Date.UTC(year, month, 1));
    const periodEndDate = new Date(Date.UTC(year, month + 1, 1));

    const toDateString = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

    return {
        periodStart: toDateString(periodStartDate),
        periodEnd: toDateString(periodEndDate),
    };
}

export async function getOrCreateTenantForUser(userId: string, email: string): Promise<TenantInfo> {
    const pool: Pool = getDbPool();

    // 이미 소속된 테넌트가 있는지 확인
    const existing = await pool.query(
        `SELECT t.id AS tenant_id, t.plan_code
         FROM tenant_members tm
         JOIN tenants t ON tm.tenant_id = t.id
         WHERE tm.user_id = $1
         LIMIT 1`,
        [userId],
    );

    const existingRowCount = existing.rowCount ?? 0;

    if (existingRowCount > 0) {
        const row = existing.rows[0];
        const planResult = await pool.query('SELECT * FROM plans WHERE code = $1', [row.plan_code]);
        if (planResult.rowCount === 0) {
            throw new Error(`플랜 코드를 찾을 수 없습니다: ${row.plan_code}`);
        }
        const plan = mapPlanRow(planResult.rows[0]);
        return { tenantId: row.tenant_id, plan };
    }

    // 없으면 기본 FREE 플랜으로 신규 테넌트 생성
    const tenantId = uuidv4();
    const planCode = 'FREE';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO tenants (id, name, plan_code)
             VALUES ($1, $2, $3)`,
            [tenantId, email, planCode],
        );

        await client.query(
            `INSERT INTO tenant_members (tenant_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [tenantId, userId, 'owner'],
        );

        const planResult = await client.query('SELECT * FROM plans WHERE code = $1', [planCode]);
        if (planResult.rowCount === 0) {
            throw new Error(`플랜 코드를 찾을 수 없습니다: ${planCode}`);
        }
        const plan = mapPlanRow(planResult.rows[0]);

        await client.query('COMMIT');

        logger.info('새 테넌트 생성', { tenantId, userId, email, planCode });

        return { tenantId, plan };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('테넌트 생성 중 오류', { error });
        throw error;
    } finally {
        client.release();
    }
}

export async function consumeCreditsForTenant(
    tenantId: string,
    amount: number,
    reason: string,
    metadata?: unknown,
): Promise<BillingUsageSummary> {
    if (amount <= 0) {
        throw new Error('차감할 크레딧 양은 0보다 커야 합니다.');
    }

    const pool: Pool = getDbPool();
    const plan = await getTenantPlanById(tenantId);
    const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const usageId = uuidv4();

        await client.query(
            `INSERT INTO tenant_usage_periods (id, tenant_id, period_start, period_end, credits_used)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, period_start, period_end)
             DO UPDATE SET
                 credits_used = tenant_usage_periods.credits_used + EXCLUDED.credits_used,
                 updated_at = now()`,
            [usageId, tenantId, periodStart, periodEnd, amount],
        );

        const txId = uuidv4();
        await client.query(
            `INSERT INTO credit_transactions (id, tenant_id, amount, reason, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [txId, tenantId, amount, reason, metadata ?? null],
        );

        const usageResult = await client.query(
            `SELECT credits_used
             FROM tenant_usage_periods
             WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3
             LIMIT 1`,
            [tenantId, periodStart, periodEnd],
        );

        const usageRowCount = usageResult.rowCount ?? 0;
        const usedCredits = usageRowCount > 0 ? Number(usageResult.rows[0].credits_used) : 0;
        const remainingCredits = plan.includedCredits - usedCredits;

        await client.query('COMMIT');

        return {
            plan,
            periodStart,
            periodEnd,
            usedCredits,
            remainingCredits,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('테넌트 기준 크레딧 차감 중 오류', { error });
        throw error;
    } finally {
        client.release();
    }
}

export async function getOrCreateTenantIdForUser(userId: string, email: string): Promise<string> {
    const { tenantId } = await getOrCreateTenantForUser(userId, email);
    return tenantId;
}

export async function getOrCreateAgentTenant(): Promise<string> {
    const pool: Pool = getDbPool();
    const agentTenantName = process.env.AGENT_TENANT_NAME || 'Device Agent Dev Tenant';
    const planCode = 'FREE';

    const existing = await pool.query(
        'SELECT id FROM tenants WHERE name = $1 LIMIT 1',
        [agentTenantName],
    );

    const existingRowCount = existing.rowCount ?? 0;
    if (existingRowCount > 0) {
        return existing.rows[0].id as string;
    }

    const tenantId = uuidv4();

    await pool.query(
        `INSERT INTO tenants (id, name, plan_code)
         VALUES ($1, $2, $3)`,
        [tenantId, agentTenantName, planCode],
    );

    logger.info('에이전트 기본 테넌트 생성', { tenantId, agentTenantName, planCode });

    return tenantId;
}

async function getTenantPlanById(tenantId: string): Promise<Plan> {
    const pool: Pool = getDbPool();
    const result = await pool.query(
        `SELECT p.*
         FROM tenants t
         JOIN plans p ON t.plan_code = p.code
         WHERE t.id = $1
         LIMIT 1`,
        [tenantId],
    );

    if ((result.rowCount ?? 0) === 0) {
        throw new Error(`테넌트 또는 플랜을 찾을 수 없습니다: ${tenantId}`);
    }

    return mapPlanRow(result.rows[0]);
}

export interface BillingUsageSummary {
    plan: Plan;
    periodStart: string;
    periodEnd: string;
    usedCredits: number;
    remainingCredits: number;
}

export async function getUsageSummaryForUser(userId: string, email: string): Promise<BillingUsageSummary> {
    const pool: Pool = getDbPool();
    const { tenantId, plan } = await getOrCreateTenantForUser(userId, email);

    const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

    const usageResult = await pool.query(
        `SELECT credits_used
         FROM tenant_usage_periods
         WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3
         LIMIT 1`,
        [tenantId, periodStart, periodEnd],
    );

    const usageRowCount = usageResult.rowCount ?? 0;

    const usedCredits = usageRowCount > 0 ? Number(usageResult.rows[0].credits_used) : 0;
    const remainingCredits = plan.includedCredits - usedCredits;

    return {
        plan,
        periodStart,
        periodEnd,
        usedCredits,
        remainingCredits,
    };
}

export async function consumeCreditsForUser(
    userId: string,
    email: string,
    amount: number,
    reason: string,
    metadata?: unknown,
): Promise<BillingUsageSummary> {
    if (amount <= 0) {
        throw new Error('차감할 크레딧 양은 0보다 커야 합니다.');
    }

    const pool: Pool = getDbPool();
    const { tenantId, plan } = await getOrCreateTenantForUser(userId, email);
    const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const usageId = uuidv4();

        // 현재 기간 사용량 upsert (credits_used 누적)
        await client.query(
            `INSERT INTO tenant_usage_periods (id, tenant_id, period_start, period_end, credits_used)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, period_start, period_end)
             DO UPDATE SET
                 credits_used = tenant_usage_periods.credits_used + EXCLUDED.credits_used,
                 updated_at = now()`,
            [usageId, tenantId, periodStart, periodEnd, amount],
        );

        // 크레딧 트랜잭션 기록 (양수 amount = 사용)
        const txId = uuidv4();
        await client.query(
            `INSERT INTO credit_transactions (id, tenant_id, amount, reason, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [txId, tenantId, amount, reason, metadata ?? null],
        );

        const usageResult = await client.query(
            `SELECT credits_used
             FROM tenant_usage_periods
             WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3
             LIMIT 1`,
            [tenantId, periodStart, periodEnd],
        );

        const usageRowCount = usageResult.rowCount ?? 0;
        const usedCredits = usageRowCount > 0 ? Number(usageResult.rows[0].credits_used) : 0;
        const remainingCredits = plan.includedCredits - usedCredits;

        await client.query('COMMIT');

        return {
            plan,
            periodStart,
            periodEnd,
            usedCredits,
            remainingCredits,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('크레딧 차감 중 오류', { error });
        throw error;
    } finally {
        client.release();
    }
}

export async function changePlanForUser(
    userId: string,
    email: string,
    newPlanCode: string,
): Promise<BillingUsageSummary> {
    const pool: Pool = getDbPool();

    const { tenantId } = await getOrCreateTenantForUser(userId, email);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const planResult = await client.query('SELECT * FROM plans WHERE code = $1 AND is_public = TRUE', [
            newPlanCode,
        ]);

        if ((planResult.rowCount ?? 0) === 0) {
            throw new Error(`변경할 플랜을 찾을 수 없습니다: ${newPlanCode}`);
        }

        await client.query('UPDATE tenants SET plan_code = $1, updated_at = now() WHERE id = $2', [
            newPlanCode,
            tenantId,
        ]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('플랜 변경 중 오류', { error, userId, newPlanCode });
        throw error;
    } finally {
        client.release();
    }

    // 변경된 플랜을 기준으로 사용량 요약 재계산
    return getUsageSummaryForUser(userId, email);
}

export async function adjustCreditsForTenant(
    tenantId: string,
    delta: number,
    reason: string,
    metadata?: unknown,
): Promise<BillingUsageSummary> {
    if (delta === 0) {
        throw new Error('크레딧 조정 delta는 0이 될 수 없습니다.');
    }

    const pool: Pool = getDbPool();
    const plan = await getTenantPlanById(tenantId);
    const { periodStart, periodEnd } = getCurrentMonthlyPeriod(new Date());

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const usageId = uuidv4();

        await client.query(
            `INSERT INTO tenant_usage_periods (id, tenant_id, period_start, period_end, credits_used)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, period_start, period_end)
             DO UPDATE SET
                 credits_used = tenant_usage_periods.credits_used + EXCLUDED.credits_used,
                 updated_at = now()`,
            [usageId, tenantId, periodStart, periodEnd, delta],
        );

        const txId = uuidv4();
        await client.query(
            `INSERT INTO credit_transactions (id, tenant_id, amount, reason, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [txId, tenantId, delta, reason, metadata ?? null],
        );

        const usageResult = await client.query(
            `SELECT credits_used
             FROM tenant_usage_periods
             WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3
             LIMIT 1`,
            [tenantId, periodStart, periodEnd],
        );

        const usageRowCount = usageResult.rowCount ?? 0;
        const usedCredits = usageRowCount > 0 ? Number(usageResult.rows[0].credits_used) : 0;
        const remainingCredits = plan.includedCredits - usedCredits;

        await client.query('COMMIT');

        return {
            plan,
            periodStart,
            periodEnd,
            usedCredits,
            remainingCredits,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('테넌트 크레딧 조정 중 오류', { error, tenantId, delta });
        throw error;
    } finally {
        client.release();
    }
}
