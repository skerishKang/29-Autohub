import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../../config/database';
import { logger } from '../../config/logger';

let initialized = false;

export interface Device {
  id: string;
  tenantId: string;
  deviceId: string;
  name: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function initializeDeviceService(): Promise<void> {
  if (initialized) return;

  const pool: Pool = getDbPool();

  const ddl = `
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      device_id TEXT NOT NULL UNIQUE,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices(tenant_id);
  `;

  await pool.query(ddl);

  initialized = true;
  logger.info('devices 테이블 확인/생성 완료');
}

export async function findTenantIdByDeviceId(deviceId: string): Promise<string | null> {
  const pool: Pool = getDbPool();

  const result = await pool.query(
    'SELECT tenant_id FROM devices WHERE device_id = $1 LIMIT 1',
    [deviceId],
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return result.rows[0].tenant_id as string;
}

export async function registerDeviceForTenant(
  tenantId: string,
  deviceId: string,
  name?: string,
): Promise<void> {
  const pool: Pool = getDbPool();

  const id = uuidv4();

  await pool.query(
    `INSERT INTO devices (id, tenant_id, device_id, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (device_id) DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       name = COALESCE(EXCLUDED.name, devices.name),
       updated_at = now()`,
    [id, tenantId, deviceId, name ?? null],
  );

  logger.info('디바이스 등록/업데이트', { tenantId, deviceId });
}

function mapRowToDevice(row: any): Device {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    deviceId: row.device_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDevicesForTenant(tenantId: string): Promise<Device[]> {
  const pool: Pool = getDbPool();

  const result = await pool.query(
    `SELECT * FROM devices
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId],
  );

  return result.rows.map(mapRowToDevice);
}

export async function getDeviceByDeviceId(deviceId: string): Promise<Device | null> {
  const pool: Pool = getDbPool();

  const result = await pool.query(
    `SELECT * FROM devices
     WHERE device_id = $1
     LIMIT 1`,
    [deviceId],
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapRowToDevice(result.rows[0]);
}
