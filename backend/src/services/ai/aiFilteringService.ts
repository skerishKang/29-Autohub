import OpenAI from 'openai';
import { logger } from '../../config/logger';
import { MessageAnalysisResult, FilterConfig } from '../types';

export class AIFilteringService {
    private openai: OpenAI;
    private readonly maxRetries = 3;
    private readonly timeoutMs = 30000;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required');
        }

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: this.timeoutMs,
            maxRetries: this.maxRetries,
        });
    }

    /**
     * SMS 메시지 분석
     */
    async analyzeSMS(content: string, sender: string): Promise<MessageAnalysisResult> {
        try {
            const prompt = this.buildSMSAnalysisPrompt(content, sender);
            
            logger.info(`Analyzing SMS from ${sender}: ${content.substring(0, 50)}...`);
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "당신은 SMS 메시지 분석 전문가입니다. 정확하고 일관된 분석 결과를 JSON 형식으로만 제공해주세요."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
            
            // 결과 검증 및 기본값 설정
            const validatedResult = this.validateSMSAnalysisResult(analysis);
            
            logger.info(`SMS analysis completed for ${sender}: Spam=${validatedResult.isSpam}, Category=${validatedResult.category}`);
            
            return validatedResult;
            
        } catch (error) {
            logger.error(`Error analyzing SMS from ${sender}:`, error);
            return this.getDefaultAnalysisResult(error);
        }
    }

    /**
     * 알림 메시지 분석
     */
    async analyzeNotification(title: string, content: string, appName: string): Promise<MessageAnalysisResult> {
        try {
            const prompt = this.buildNotificationAnalysisPrompt(title, content, appName);
            
            logger.info(`Analyzing notification from ${appName}: ${title}`);
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "당신은 앱 알림 분석 전문가입니다. 정확하고 일관된 분석 결과를 JSON 형식으로만 제공해주세요."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 400,
                response_format: { type: "json_object" }
            });

            const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
            const validatedResult = this.validateNotificationAnalysisResult(analysis);
            
            logger.info(`Notification analysis completed for ${appName}: Category=${validatedResult.category}`);
            
            return validatedResult;
            
        } catch (error) {
            logger.error(`Error analyzing notification from ${appName}:`, error);
            return this.getDefaultAnalysisResult(error);
        }
    }

    /**
     * 배치 분석 처리
     */
    async analyzeBatch(messages: Array<{ content: string; sender?: string; type: 'sms' | 'notification' }>): Promise<MessageAnalysisResult[]> {
        try {
            const results = await Promise.allSettled(
                messages.map(message => 
                    message.type === 'sms' 
                        ? this.analyzeSMS(message.content, message.sender || 'Unknown')
                        : this.analyzeNotification('', message.content, message.sender || 'Unknown')
                )
            );

            return results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    logger.error(`Batch analysis failed for message ${index}:`, result.reason);
                    return this.getDefaultAnalysisResult(result.reason);
                }
            });

        } catch (error) {
            logger.error('Error in batch analysis:', error);
            throw error;
        }
    }

    /**
     * SMS 분석 프롬프트 생성
     */
    private buildSMSAnalysisPrompt(content: string, sender: string): string {
        return `
다음 SMS 메시지를 분석하여 JSON 형식으로 응답해주세요:

메시지: "${content}"
발신자: "${sender}"

분석 항목:
1. isSpam: 스팸 여부 (true/false)
2. spamProbability: 스팸 확률 (0.0-1.0)
3. category: 메시지 카테고리 (ADVERTISEMENT, BANKING, DELIVERY, PROMOTIONAL, PERSONAL, BUSINESS, VERIFICATION, OTHER)
4. importance: 중요도 (LOW, MEDIUM, HIGH, URGENT)
5. keywords: 주요 키워드 배열 (최대 5개)
6. summary: 메시지 요약 (20자 이내)
7. sentiment: 감성 분석 (POSITIVE, NEGATIVE, NEUTRAL)
8. actionRequired: 사용자 액션 필요 여부 (true/false)
9. confidenceScore: 분석 신뢰도 (0.0-1.0)

응답 형식:
{
  "isSpam": false,
  "spamProbability": 0.1,
  "category": "PERSONAL",
  "importance": "MEDIUM",
  "keywords": ["회식", "저녁", "레스토랑"],
  "summary": "저녁 7시 레스토랑 회식",
  "sentiment": "POSITIVE",
  "actionRequired": true,
  "confidenceScore": 0.95
}
`;
    }

    /**
     * 알림 분석 프롬프트 생성
     */
    private buildNotificationAnalysisPrompt(title: string, content: string, appName: string): string {
        return `
다음 앱 알림을 분석하여 JSON 형식으로 응답해주세요:

제목: "${title}"
내용: "${content}"
앱: "${appName}"

분석 항목:
1. category: 알림 카테고리 (MESSAGE, EMAIL, SOCIAL, DELIVERY, FINANCE, SYSTEM, PRODUCTIVITY, ENTERTAINMENT, NEWS, OTHER)
2. importance: 중요도 (LOW, MEDIUM, HIGH, URGENT)
3. keywords: 주요 키워드 배열 (최대 5개)
4. summary: 알림 요약 (20자 이내)
5. actionRequired: 사용자 액션 필요 여부 (true/false)
6. urgency: 긴급성 (LOW, MEDIUM, HIGH)
7. confidenceScore: 분석 신뢰도 (0.0-1.0)

응답 형식:
{
  "category": "MESSAGE",
  "importance": "MEDIUM",
  "keywords": ["새 메시지", "카카오톡"],
  "summary": "카카오톡 새 메시지 도착",
  "actionRequired": true,
  "urgency": "MEDIUM",
  "confidenceScore": 0.9
}
`;
    }

    /**
     * SMS 분석 결과 검증
     */
    private validateSMSAnalysisResult(analysis: any): MessageAnalysisResult {
        return {
            isSpam: Boolean(analysis.isSpam ?? false),
            spamProbability: Math.max(0, Math.min(1, Number(analysis.spamProbability) || 0)),
            category: this.validateCategory(analysis.category),
            importance: this.validateImportance(analysis.importance),
            keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 5) : [],
            summary: String(analysis.summary || '').substring(0, 50),
            sentiment: this.validateSentiment(analysis.sentiment),
            actionRequired: Boolean(analysis.actionRequired ?? false),
            urgency: this.validateUrgency(analysis.urgency),
            confidenceScore: Math.max(0, Math.min(1, Number(analysis.confidenceScore) || 0.5)),
            processedAt: new Date().toISOString(),
            model: "gpt-4",
            metadata: {
                processingTime: Date.now(),
                requestId: this.generateRequestId()
            }
        };
    }

    /**
     * 알림 분석 결과 검증
     */
    private validateNotificationAnalysisResult(analysis: any): MessageAnalysisResult {
        return {
            isSpam: false, // 알림은 기본적으로 스팸 아님
            spamProbability: 0,
            category: this.validateNotificationCategory(analysis.category),
            importance: this.validateImportance(analysis.importance),
            keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 5) : [],
            summary: String(analysis.summary || '').substring(0, 50),
            sentiment: 'NEUTRAL',
            actionRequired: Boolean(analysis.actionRequired ?? false),
            urgency: this.validateUrgency(analysis.urgency),
            confidenceScore: Math.max(0, Math.min(1, Number(analysis.confidenceScore) || 0.5)),
            processedAt: new Date().toISOString(),
            model: "gpt-4",
            metadata: {
                processingTime: Date.now(),
                requestId: this.generateRequestId()
            }
        };
    }

    /**
     * 카테고리 검증
     */
    private validateCategory(category: any): string {
        const validCategories = ['ADVERTISEMENT', 'BANKING', 'DELIVERY', 'PROMOTIONAL', 'PERSONAL', 'BUSINESS', 'VERIFICATION', 'OTHER'];
        return validCategories.includes(category) ? category : 'OTHER';
    }

    /**
     * 알림 카테고리 검증
     */
    private validateNotificationCategory(category: any): string {
        const validCategories = ['MESSAGE', 'EMAIL', 'SOCIAL', 'DELIVERY', 'FINANCE', 'SYSTEM', 'PRODUCTIVITY', 'ENTERTAINMENT', 'NEWS', 'OTHER'];
        return validCategories.includes(category) ? category : 'OTHER';
    }

    /**
     * 중요도 검증
     */
    private validateImportance(importance: any): string {
        const validImportance = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        return validImportance.includes(importance) ? importance : 'MEDIUM';
    }

    /**
     * 감성 검증
     */
    private validateSentiment(sentiment: any): string {
        const validSentiment = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'];
        return validSentiment.includes(sentiment) ? sentiment : 'NEUTRAL';
    }

    /**
     * 긴급성 검증
     */
    private validateUrgency(urgency: any): string {
        const validUrgency = ['LOW', 'MEDIUM', 'HIGH'];
        return validUrgency.includes(urgency) ? urgency : 'MEDIUM';
    }

    /**
     * 기본 분석 결과 생성 (에러 발생 시)
     */
    private getDefaultAnalysisResult(error: any): MessageAnalysisResult {
        return {
            isSpam: false,
            spamProbability: 0,
            category: 'OTHER',
            importance: 'MEDIUM',
            keywords: [],
            summary: '분석 실패',
            sentiment: 'NEUTRAL',
            actionRequired: false,
            urgency: 'MEDIUM',
            confidenceScore: 0,
            processedAt: new Date().toISOString(),
            model: 'gpt-4',
            metadata: {
                processingTime: Date.now(),
                requestId: this.generateRequestId(),
                error: error.message || 'Unknown error'
            }
        };
    }

    /**
     * 요청 ID 생성
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 분석 설정 업데이트
     */
    updateFilterConfig(config: FilterConfig): void {
        // TODO: 필터링 설정 업데이트 로직
        logger.info('Filter config updated:', config);
    }

    /**
     * 현재 필터링 설정 가져오기
     */
    getFilterConfig(): FilterConfig {
        // TODO: 필터링 설정 가져오기 로직
        return {
            spamThreshold: 0.7,
            importanceThreshold: 'MEDIUM',
            enabledCategories: ['ALL'],
            blockPromotions: true,
            maskSensitiveInfo: true
        };
    }
}