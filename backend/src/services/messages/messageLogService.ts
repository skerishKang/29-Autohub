import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../../config/database';
import { logger } from '../../config/logger';

let initialized = false;

export async function initializeMessageLogService(): Promise<void> {
  if (initialized) return;

  const pool: Pool = getDbPool();

  const ddl = `
    CREATE TABLE IF NOT EXISTS message_events (
      id UUID PRIMARY KEY,
      tenant_id UUID NULL REFERENCES tenants(id),
      direction TEXT NOT NULL,
      channel TEXT NOT NULL,
      device_id TEXT,
      external_id TEXT,
      sender TEXT,
      recipient TEXT,
      body TEXT,
      status TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT,
      received_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_message_events_direction ON message_events(direction);
    CREATE INDEX IF NOT EXISTS idx_message_events_status ON message_events(status);
    CREATE INDEX IF NOT EXISTS idx_message_events_tenant_id ON message_events(tenant_id);
  `;

  await pool.query(ddl);

  initialized = true;
  logger.info('message_events 테이블 확인/생성 완료');
}

export interface InboundSmsEvent {
  deviceId: string;
  messageId?: string;
  sender: string;
  body: string;
  receivedAt: string;
  tenantId?: string;
}

export async function logInboundSmsEvent(event: InboundSmsEvent): Promise<void> {
  const pool: Pool = getDbPool();

  const id = uuidv4();

  await pool.query(
    `INSERT INTO message_events (
        id,
        tenant_id,
        direction,
        channel,
        device_id,
        external_id,
        sender,
        body,
        status,
        received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      event.tenantId ?? null,
      'inbound',
      'sms',
      event.deviceId,
      event.messageId ?? null,
      event.sender,
      event.body,
      'received',
      event.receivedAt,
    ],
  );

  logger.info('인바운드 SMS 이벤트 로그 기록', {
    messageEventId: id,
    deviceId: event.deviceId,
  });
}

export interface OutboundMessageEvent {
  tenantId: string;
  channel: string;
  deviceId?: string;
  externalId?: string;
  sender?: string;
  recipient?: string;
  body?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function logOutboundMessageEvent(event: OutboundMessageEvent): Promise<string> {
  const pool: Pool = getDbPool();

  const id = uuidv4();

  await pool.query(
    `INSERT INTO message_events (
        id,
        tenant_id,
        direction,
        channel,
        device_id,
        external_id,
        sender,
        recipient,
        body,
        status,
        error_code,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      event.tenantId,
      'outbound',
      event.channel,
      event.deviceId ?? null,
      event.externalId ?? null,
      event.sender ?? null,
      event.recipient ?? null,
      event.body ?? null,
      event.status,
      event.errorCode ?? null,
      event.errorMessage ?? null,
    ],
  );

  logger.info('아웃바운드 메시지 이벤트 로그 기록', {
    messageEventId: id,
    tenantId: event.tenantId,
    channel: event.channel,
  });

  return id;
}
