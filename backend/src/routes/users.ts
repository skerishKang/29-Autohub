import { Router, Request, Response } from 'express';
import {
    createUser,
    validateUser,
    generateAccessToken,
    findUserById,
} from '../services/users/userService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

interface AuthRequestBody {
    email?: string;
    password?: string;
}

// 회원가입
router.post('/signup', async (req: Request<unknown, unknown, AuthRequestBody>, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'email과 password는 필수입니다.',
        });
    }

    try {
        const user = await createUser(email, password);
        const token = generateAccessToken(user);

        return res.status(201).json({
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
        // 이메일 중복 등 비즈니스 에러 처리
        if (error instanceof Error && error.message.includes('이미 사용 중인 이메일')) {
            return res.status(409).json({
                status: 'error',
                message: error.message,
            });
        }

        return res.status(500).json({
            status: 'error',
            message: '회원가입 처리 중 오류가 발생했습니다.',
        });
    }
});

// 로그인
router.post('/login', async (req: Request<unknown, unknown, AuthRequestBody>, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'email과 password는 필수입니다.',
        });
    }

    const user = await validateUser(email, password);
    if (!user) {
        return res.status(401).json({
            status: 'error',
            message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
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
});

// 내 정보 조회
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: '인증 정보가 없습니다.',
        });
    }

    const user = await findUserById(req.user.sub);
    if (!user) {
        return res.status(404).json({
            status: 'error',
            message: '사용자를 찾을 수 없습니다.',
        });
    }

    return res.status(200).json({
        status: 'success',
        data: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    });
});

export default router;
