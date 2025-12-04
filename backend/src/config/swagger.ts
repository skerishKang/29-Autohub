import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger / OpenAPI 설정
 */
export function setupSwagger(app: Express): void {
    const options: swaggerJsdoc.Options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'AutoHub Backend API',
                version: process.env.npm_package_version || '1.0.0',
                description: 'SMS / 알림 자동화용 AutoHub 백엔드 API 문서',
            },
        },
        // 라우트 주석 기반 문서 자동 생성 (필요 시 확장 가능)
        apis: ['src/routes/*.ts'],
    };

    const specs = swaggerJsdoc(options);

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
