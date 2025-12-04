// AI 분석 결과 타입 정의
export interface MessageAnalysisResult {
    isSpam: boolean;
    spamProbability: number;
    category: string;
    importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
    keywords: string[];
    summary: string;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | string;
    actionRequired: boolean;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | string;
    confidenceScore: number;
    processedAt: string;
    model: string;
    metadata?: {
        processingTime?: number;
        requestId?: string;
        [key: string]: unknown;
    };
}

// 필터링 설정 타입 정의
export interface FilterConfig {
    spamThreshold: number;
    importanceThreshold: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    enabledCategories: string[]; // 'ALL' 또는 개별 카테고리
    blockPromotions: boolean;
    maskSensitiveInfo: boolean;
}
