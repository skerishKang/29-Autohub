import winston from 'winston';
import 'winston-daily-rotate-file';

// 기본 로거 인스턴스 (초기화 후 사용)
let logger: winston.Logger;

/**
 * 애플리케이션 전역에서 사용할 로거 초기화
 * - 콘솔 + 일일 로테이션 파일 로그 지원
 */
export function initializeLogger(): winston.Logger {
    if (logger) {
        return logger;
    }

    const logLevel = process.env.LOG_LEVEL || 'info';

    const consoleTransport = new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `[${timestamp}] ${level}: ${message}${metaString}`;
            })
        )
    });

    const fileTransport = new (winston.transports as any).DailyRotateFile({
        dirname: process.env.LOG_DIR || 'logs',
        filename: process.env.LOG_FILENAME || 'autohub-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: process.env.LOG_MAX_FILES || '14d',
        zippedArchive: true,
        level: logLevel,
    });

    logger = winston.createLogger({
        level: logLevel,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
        ),
        transports: [consoleTransport, fileTransport],
    });

    return logger;
}

// 다른 모듈에서 직접 사용할 수 있도록 로거 내보내기
export { logger };
