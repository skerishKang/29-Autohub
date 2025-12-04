import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin(): admin.app.App | null {
    if (firebaseApp) {
        return firebaseApp;
    }

    const credentialsPath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;

    if (!credentialsPath) {
        logger.warn('FIREBASE_ADMIN_CREDENTIALS_PATH가 설정되지 않아 Firebase Admin을 초기화하지 않습니다.');
        return null;
    }

    try {
        const resolvedPath = path.isAbsolute(credentialsPath)
            ? credentialsPath
            : path.resolve(process.cwd(), credentialsPath);

        const serviceAccountJson = fs.readFileSync(resolvedPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });

        logger.info('Firebase Admin 초기화 완료');
        return firebaseApp;
    } catch (error) {
        logger.error('Firebase Admin 초기화 실패', { error });
        return null;
    }
}

export async function verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    const app = initializeFirebaseAdmin();

    if (!app) {
        throw new Error('Firebase Admin이 초기화되지 않았습니다.');
    }

    return admin.auth().verifyIdToken(idToken);
}
