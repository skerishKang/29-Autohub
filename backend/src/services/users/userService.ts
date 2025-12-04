import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../../config/database';
import { logger } from '../../config/logger';

export type UserRole = 'user' | 'admin';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

let initialized = false;

// users 테이블이 없으면 생성하는 초기화 함수
export async function initializeUserService(): Promise<void> {
    if (initialized) return;

    const pool = getDbPool();

    const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `;

    await pool.query(createTableSql);
    initialized = true;
    logger.info('users 테이블 확인/생성 완료');
}

function mapRowToUser(row: any): User {
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: (row.role as UserRole) || 'user',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const pool = getDbPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) return null;
    return mapRowToUser(result.rows[0]);
}

export async function findUserById(id: string): Promise<User | null> {
    const pool = getDbPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return null;
    return mapRowToUser(result.rows[0]);
}

export async function createUser(email: string, password: string): Promise<User> {
    const pool: Pool = getDbPool();

    const existing = await findUserByEmail(email);
    if (existing) {
        throw new Error('이미 사용 중인 이메일입니다.');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // 관리자 계정 이메일은 admin 역할로 저장
    const role: UserRole = email === 'padiemipu@gmail.com' ? 'admin' : 'user';

    const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, email, passwordHash, role],
    );

    const user = mapRowToUser(result.rows[0]);
    logger.info('새 유저 생성', { userId: user.id, email: user.email });
    return user;
}

export async function validateUser(email: string, password: string): Promise<User | null> {
    const user = await findUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
}

export interface AuthTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
}

export function generateAccessToken(user: User): string {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

    const payload: AuthTokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, secret, { expiresIn: '7d' });
}
