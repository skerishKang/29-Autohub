import { Router, Request, Response } from 'express';
import { verifyFirebaseIdToken } from '../config/firebase';
import { createUser, findUserByEmail, generateAccessToken } from '../services/users/userService';

const router = Router();

interface FirebaseAuthRequestBody {
    idToken?: string;
}

router.post('/firebase', async (req: Request<unknown, unknown, FirebaseAuthRequestBody>, res: Response) => {
    const { idToken } = req.body || {};

    if (!idToken) {
        return res.status(400).json({
            status: 'error',
            message: 'idToken은 필수입니다.',
        });
    }

    try {
        const decoded = await verifyFirebaseIdToken(idToken);
        const email = decoded.email;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Firebase 토큰에 email 정보가 없습니다.',
            });
        }

        let user = await findUserByEmail(email);

        if (!user) {
            const randomPassword = `firebase:${decoded.uid}:${Date.now()}`;
            user = await createUser(email, randomPassword);
        }

        const token = generateAccessToken(user);

        return res.status(200).json({
            status: 'success',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (error: any) {
        const message =
            error?.message && typeof error.message === 'string'
                ? error.message
                : 'Firebase 인증 처리 중 오류가 발생했습니다.';

        if (message.includes('Firebase Admin이 초기화되지 않았습니다.')) {
            return res.status(500).json({
                status: 'error',
                message: '서버 인증 설정이 완료되지 않았습니다.',
            });
        }

        return res.status(401).json({
            status: 'error',
            message: '유효하지 않은 Firebase 토큰입니다.',
        });
    }
});

export default router;
