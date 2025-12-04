# 🛠️ AutoHub 개발 가이드

**스마트폰 문자/알림 자동화 플랫폼의 기술 구현 가이드**

> "개발부터 배포까지 전체 과정을 상세히 안내하는 기술 문서"

---

## 🎯 개발 개요

### 프로젝트 목표
- 안드로이드 스마트폰의 문자/알림을 실시간으로 수집
- AI 기반 필터링 및 분석 기능 구현
- 외부 서비스(n8n, 텔레그램 등)와의 연동
- 개인정보 보호 및 보안 강화

### 개발 철학
- **사용자 중심**: 사용자 편의성과 개인정보 보호 최우선
- **안정성**: 99.9% 이상의 서비스 안정성 목표
- **확장성**: 모듈화된 아키텍처로 쉬운 확장 지원
- **개방성**: 오픈소스 기반의 투명한 개발

---

## 🏗️ 기술 아키텍처

### 시스템 구조도
```mermaid
graph TB
    subgraph "클라이언트"
        A[SMSAutoHub 앱]
        B[NotifyAutoHub 앱]
    end
    
    subgraph "백엔드"
        C[API Gateway]
        D[문자 처리 서비스]
        E[알림 처리 서비스]
        F[AI 필터링 서비스]
        G[중계 서비스]
    end
    
    subgraph "데이터 저장소"
        H[PostgreSQL]
        I[Redis]
        J[File Storage]
    end
    
    subgraph "외부 서비스"
        K[n8n]
        L[텔레그램]
        M[Slack]
        N[OpenAI API]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    F --> G
    G --> K
    G --> L
    G --> M
    F --> N
    
    D --> H
    E --> H
    F --> I
    G --> J
```

### 기술 스택 선정 이유

#### 프론트엔드 (안드로이드)
- **Kotlin**: 안전하고 간결한 코드, 안드로이드 공식 언어
- **MVVM**: 데이터 바인딩과 생명주기 관리 용이
- **Coroutines**: 비동기 처리의 간결한 구현
- **Room**: 로컬 데이터베이스 관리의 표준화

#### 백엔드
- **Node.js**: JavaScript 생태계 활용, 빠른 개발 속도
- **Express**: 가볍고 유연한 웹 프레임워크
- **TypeScript**: 타입 안정성과 개발 생산성 향상
- **PostgreSQL**: 강력한 관계형 데이터베이스, ACID 보장

#### AI/ML
- **OpenAI API**: 강력한 자연어 처리 능력
- **자체 모델**: 특정 도메인 최적화 가능성

---

## 📱 모바일 앱 개발

### SMSAutoHub 개발

#### 1. 프로젝트 설정
```kotlin
// build.gradle (Module: app)
android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.autohub.sms"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Network
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    
    // Database
    implementation 'androidx.room:room-runtime:2.6.1'
    implementation 'androidx.room:room-ktx:2.6.1'
    kapt 'androidx.room:room-compiler:2.6.1'
    
    // Work Manager
    implementation 'androidx.work:work-runtime-ktx:2.9.0'
}
```

#### 2. SMS 수신 기능 구현
```kotlin
// SmsReceiver.kt
class SmsReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            messages.forEach { smsMessage ->
                val smsData = SmsMessage(
                    id = UUID.randomUUID().toString(),
                    sender = smsMessage.originatingAddress ?: "",
                    content = smsMessage.messageBody,
                    timestamp = System.currentTimeMillis(),
                    isRead = false
                )
                
                // 데이터베이스 저장
                CoroutineScope(Dispatchers.IO).launch {
                    SmsDatabase.getInstance(context).smsDao().insert(smsData)
                    
                    // 서버로 전송
                    sendToServer(smsData)
                }
            }
        }
    }
    
    private suspend fun sendToServer(sms: SmsMessage) {
        try {
            val apiService = RetrofitClient.getApiService()
            apiService.sendSms(sms.toDto())
        } catch (e: Exception) {
            Log.e("SmsReceiver", "Failed to send SMS to server", e)
        }
    }
}

// AndroidManifest.xml
<receiver android:name=".receiver.SmsReceiver"
    android:enabled="true"
    android:exported="true">
    <intent-filter android:priority="1000">
        <action android:name="android.provider.Telephony.SMS_RECEIVED" />
    </intent-filter>
</receiver>
```

#### 3. UI 구현
```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var smsViewModel: SmsViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupViewModel()
        setupRecyclerView()
        observeViewModel()
    }
    
    private fun setupViewModel() {
        val smsRepository = SmsRepository(SmsDatabase.getInstance(this))
        val viewModelFactory = SmsViewModelFactory(smsRepository)
        smsViewModel = ViewModelProvider(this, viewModelFactory)[SmsViewModel::class.java]
    }
    
    private fun observeViewModel() {
        smsViewModel.smsList.observe(this) { smsList ->
            binding.recyclerView.adapter = SmsAdapter(smsList)
        }
    }
}

// activity_main.xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    
    <com.google.android.material.appbar.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toTopOf="parent">
        
        <com.google.android.material.appbar.MaterialToolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            app:title="SMSAutoHub" />
            
    </com.google.android.material.appbar.AppBarLayout>
    
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerView"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        app:layout_constraintTop_toBottomOf="@id/toolbar"
        app:layout_constraintBottom_toBottomOf="parent" />
        
</androidx.constraintlayout.widget.ConstraintLayout>
```

### NotifyAutoHub 개발

#### 1. 알림 수신 서비스
```kotlin
// NotificationListenerService.kt
class NotificationListenerService : NotificationListenerService() {
    
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        super.onNotificationPosted(sbn)
        
        val notification = sbn.notification
        val extras = notification.extras
        
        val appNotification = AppNotification(
            id = sbn.id.toString(),
            packageName = sbn.packageName,
            appName = getAppName(sbn.packageName),
            title = extras.getString(Notification.EXTRA_TITLE) ?: "",
            content = extras.getString(Notification.EXTRA_TEXT) ?: "",
            timestamp = System.currentTimeMillis(),
            category = categorizeNotification(sbn.packageName)
        )
        
        // 데이터베이스 저장 및 서버 전송
        CoroutineScope(Dispatchers.IO).launch {
            NotificationDatabase.getInstance(this@NotificationListenerService)
                .notificationDao().insert(appNotification)
            sendToServer(appNotification)
        }
    }
    
    private fun getAppName(packageName: String): String {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            packageName
        }
    }
    
    private fun categorizeNotification(packageName: String): NotificationCategory {
        return when {
            packageName.contains("kakao") || packageName.contains("talk") -> NotificationCategory.MESSAGE
            packageName.contains("mail") || packageName.contains("gmail") -> NotificationCategory.EMAIL
            packageName.contains("instagram") || packageName.contains("facebook") -> NotificationCategory.SOCIAL
            packageName.contains("delivery") || packageName.contains("courier") -> NotificationCategory.DELIVERY
            packageName.contains("bank") || packageName.contains("finance") -> NotificationCategory.FINANCE
            else -> NotificationCategory.OTHER
        }
    }
}
```

---

## 🖥️ 백엔드 개발

### 프로젝트 구조
```
backend/
├── src/
│   ├── controllers/
│   │   ├── sms.controller.js
│   │   ├── notification.controller.js
│   │   └── webhook.controller.js
│   ├── services/
│   │   ├── sms.service.js
│   │   ├── notification.service.js
│   │   ├── ai.service.js
│   │   └── relay.service.js
│   ├── models/
│   │   ├── sms.model.js
│   │   ├── notification.model.js
│   │   └── user.model.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   └── rate-limit.middleware.js
│   ├── routes/
│   │   ├── sms.routes.js
│   │   ├── notification.routes.js
│   │   └── webhook.routes.js
│   └── utils/
│       ├── database.js
│       ├── redis.js
│       └── logger.js
├── tests/
├── docs/
├── package.json
└── tsconfig.json
```

### API 서버 구현

#### 1. Express 서버 설정
```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './utils/database';
import { connectRedis } from './utils/redis';
import smsRoutes from './routes/sms.routes';
import notificationRoutes from './routes/notification.routes';
import webhookRoutes from './routes/webhook.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// 보안 미들웨어
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// 속도 제한
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 1000, // 15분당 1000개 요청
    message: 'Too many requests from this IP'
});
app.use(limiter);

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 라우트
app.use('/api/sms', smsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/webhooks', webhookRoutes);

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDatabase();
        await connectRedis();
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
```

#### 2. SMS 처리 서비스
```typescript
// sms.service.ts
import { SMS } from '../models/sms.model';
import { AIService } from './ai.service';
import { RelayService } from './relay.service';

export class SMSService {
    private aiService: AIService;
    private relayService: RelayService;

    constructor() {
        this.aiService = new AIService();
        this.relayService = new RelayService();
    }

    async processSMS(smsData: SMSDto): Promise<SMS> {
        try {
            // SMS 데이터베이스 저장
            const sms = await SMS.create({
                id: smsData.id,
                sender: smsData.sender,
                content: smsData.content,
                timestamp: new Date(smsData.timestamp),
                isRead: false
            });

            // AI 필터링
            const aiResult = await this.aiService.analyzeSMS(smsData.content);
            
            // AI 결과 업데이트
            await sms.update({
                isSpam: aiResult.isSpam,
                importance: aiResult.importance,
                category: aiResult.category,
                keywords: aiResult.keywords,
                summary: aiResult.summary
            });

            // 중계 서비스 호출
            if (!aiResult.isSpam) {
                await this.relayService.relaySMS(sms);
            }

            return sms;
        } catch (error) {
            throw new Error(`Failed to process SMS: ${error.message}`);
        }
    }

    async getSMSList(filter: any): Promise<SMS[]> {
        return await SMS.findAll({
            where: filter,
            order: [['timestamp', 'DESC']]
        });
    }

    async updateSMS(id: string, updates: any): Promise<SMS> {
        const sms = await SMS.findByPk(id);
        if (!sms) {
            throw new Error('SMS not found');
        }
        
        return await sms.update(updates);
    }
}
```

#### 3. AI 필터링 서비스
```typescript
// ai.service.ts
import OpenAI from 'openai';

export class AIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeSMS(content: string): Promise<AIAnalysisResult> {
        try {
            const prompt = `
다음 SMS 메시지를 분석하여 JSON 형식으로 응답해주세요:
메시지: "${content}"

분석 항목:
1. isSpam: 스팸 여부 (true/false)
2. importance: 중요도 (LOW/MEDIUM/HIGH/URGENT)
3. category: 카테고리 (ADVERTISEMENT/BANKING/DELIVERY/PROMOTIONAL/PERSONAL/BUSINESS)
4. keywords: 키워드 배열
5. summary: 요약 (20자 이내)
6. sentiment: 감성 (POSITIVE/NEGATIVE/NEUTRAL)

응답 형식:
{
    "isSpam": false,
    "importance": "MEDIUM",
    "category": "BANKING",
    "keywords": ["입금", "계좌"],
    "summary": "계좌 입금 알림",
    "sentiment": "NEUTRAL"
}
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "당장은 SMS 메시지 분석 전문가입니다. 항상 JSON 형식으로 정확하게 응답해주세요."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 200
            });

            const content = response.choices[0]?.message?.content;
            return JSON.parse(content || '{}');
        } catch (error) {
            console.error('AI analysis failed:', error);
            // 분석 실패 시 기본값 반환
            return {
                isSpam: false,
                importance: 'MEDIUM',
                category: 'PERSONAL',
                keywords: [],
                summary: content.substring(0, 20),
                sentiment: 'NEUTRAL'
            };
        }
    }

    async analyzeNotification(title: string, content: string): Promise<NotificationAnalysisResult> {
        // SMS와 유사한 방식으로 알림 분석
        const prompt = `
다음 앱 알림을 분석하여 JSON 형식으로 응답해주세요:
제목: "${title}"
내용: "${content}"

분석 항목:
1. importance: 중요도 (LOW/MEDIUM/HIGH/URGENT)
2. category: 알림 카테고리 (MESSAGE/EMAIL/SOCIAL/DELIVERY/FINANCE/SYSTEM/OTHER)
3. keywords: 키워드 배열
4. summary: 요약 (20자 이내)
5. actionRequired: 사용자 액션 필요 여부 (true/false)
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "당장은 앱 알림 분석 전문가입니다. 항상 JSON 형식으로 정확하게 응답해주세요."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            });

            const content = response.choices[0]?.message?.content;
            return JSON.parse(content || '{}');
        } catch (error) {
            console.error('Notification analysis failed:', error);
            return {
                importance: 'MEDIUM',
                category: 'OTHER',
                keywords: [],
                summary: `${title}: ${content}`.substring(0, 20),
                actionRequired: false
            };
        }
    }
}
```

---

## 🔐 보안 구현

### 1. API 인증
```typescript
// auth.middleware.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};
```

### 2. 개인정보 마스킹
```kotlin
// PrivacyMasker.kt
class PrivacyMasker {
    companion object {
        private val MASKING_RULES = mapOf(
            "\\b\\d{3}-\\d{4}-\\d{4}\\b".toRegex() to "XXX-XXXX-XXXX", // 전화번호
            "\\b\\d{3,4}-\\d{4}-\\d{4}\\b".toRegex() to "XXXX-XXXX-XXXX", // 계좌번호
            "\\b\\d{6}\\b".toRegex() to "XXXXXX", // 인증번호
            "\\b[0-9]{16}\\b".toRegex() to "XXXXXXXXXXXXXXXX", // 카드번호
            "\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b".toRegex() to "****@****.com" // 이메일
        )
    }

    fun maskSensitiveContent(content: String): String {
        var maskedContent = content
        
        MASKING_RULES.forEach { (pattern, replacement) ->
            maskedContent = maskedContent.replace(pattern, replacement)
        }
        
        return maskedContent
    }
    
    fun maskBankAccount(content: String): String {
        return content.replace("\\b[0-9-]+".toRegex(), "XXX-XXXX-XXXX")
    }
    
    fun maskVerificationCode(content: String): String {
        return content.replace("\\b\\d{4,6}\\b".toRegex(), "XXXXXX")
    }
}
```

---

## 📊 데이터베이스 설계

### 1. PostgreSQL 스키마
```sql
-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS 테이블
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    sender VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    importance VARCHAR(20) DEFAULT 'MEDIUM',
    category VARCHAR(50),
    keywords TEXT[],
    summary TEXT,
    sentiment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 알림 테이블
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    package_name VARCHAR(255) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT,
    timestamp TIMESTAMP NOT NULL,
    category VARCHAR(50),
    importance VARCHAR(20) DEFAULT 'MEDIUM',
    keywords TEXT[],
    summary TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 중계 로그 테이블
CREATE TABLE relay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    message_type VARCHAR(20) NOT NULL, -- 'sms' or 'notification'
    target VARCHAR(50) NOT NULL, -- 'telegram', 'n8n', 'slack', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_sms_user_timestamp ON sms_messages(user_id, timestamp DESC);
CREATE INDEX idx_notifications_user_timestamp ON notifications(user_id, timestamp DESC);
CREATE INDEX idx_relay_logs_message_id ON relay_logs(message_id);
```

### 2. Redis 캐싱
```typescript
// redis.ts
import Redis from 'ioredis';

class RedisClient {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
        });
    }

    async cacheSMS(smsId: string, smsData: any, ttl: number = 3600): Promise<void> {
        await this.client.setex(`sms:${smsId}`, ttl, JSON.stringify(smsData));
    }

    async getCachedSMS(smsId: string): Promise<any> {
        const cached = await this.client.get(`sms:${smsId}`);
        return cached ? JSON.parse(cached) : null;
    }

    async cacheNotification(notificationId: string, data: any, ttl: number = 3600): Promise<void> {
        await this.client.setex(`notification:${notificationId}`, ttl, JSON.stringify(data));
    }

    async getCachedNotification(notificationId: string): Promise<any> {
        const cached = await this.client.get(`notification:${notificationId}`);
        return cached ? JSON.parse(cached) : null;
    }
}

export const redisClient = new RedisClient();
```

---

## 🚀 배포 및 운영

### 1. Docker 설정
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 의존성 복사
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY dist/ ./dist/

# 환경 변수
ENV NODE_ENV=production

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 앱 실행
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/autohub
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=autohub
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. CI/CD 파이프라인
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run integration tests
        run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Build Docker image
        run: docker build -t autohub-backend:latest .
        
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag autohub-backend:latest ${{ secrets.DOCKER_REGISTRY }}/autohub-backend:latest
          docker push ${{ secrets.DOCKER_REGISTRY }}/autohub-backend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to production
        run: |
          # SSH를 통해 서버에 접속하여 배포
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} "
            docker pull ${{ secrets.DOCKER_REGISTRY }}/autohub-backend:latest &&
            docker-compose down &&
            docker-compose up -d
          "
```

---

## 🧪 테스트 전략

### 1. 단위 테스트
```typescript
// sms.service.test.ts
import { SMSService } from '../services/sms.service';
import { AIService } from '../services/ai.service';
import { RelayService } from '../services/relay.service';

describe('SMSService', () => {
    let smsService: SMSService;
    let mockAIService: jest.Mocked<AIService>;
    let mockRelayService: jest.Mocked<RelayService>;

    beforeEach(() => {
        mockAIService = {
            analyzeSMS: jest.fn()
        } as any;

        mockRelayService = {
            relaySMS: jest.fn()
        } as any;

        smsService = new SMSService();
        (smsService as any).aiService = mockAIService;
        (smsService as any).relayService = mockRelayService;
    });

    describe('processSMS', () => {
        it('should process SMS successfully', async () => {
            const smsData = {
                id: 'test-id',
                sender: '010-1234-5678',
                content: 'Test message',
                timestamp: Date.now()
            };

            const aiResult = {
                isSpam: false,
                importance: 'MEDIUM',
                category: 'PERSONAL',
                keywords: ['test'],
                summary: 'Test message',
                sentiment: 'NEUTRAL'
            };

            mockAIService.analyzeSMS.mockResolvedValue(aiResult);
            mockRelayService.relaySMS.mockResolvedValue(undefined);

            const result = await smsService.processSMS(smsData);

            expect(result).toBeDefined();
            expect(mockAIService.analyzeSMS).toHaveBeenCalledWith(smsData.content);
            expect(mockRelayService.relaySMS).toHaveBeenCalled();
        });

        it('should not relay spam messages', async () => {
            const smsData = {
                id: 'test-id',
                sender: 'spam-sender',
                content: 'Spam message',
                timestamp: Date.now()
            };

            const aiResult = {
                isSpam: true,
                importance: 'LOW',
                category: 'ADVERTISEMENT',
                keywords: ['spam'],
                summary: 'Spam message',
                sentiment: 'NEGATIVE'
            };

            mockAIService.analyzeSMS.mockResolvedValue(aiResult);

            await smsService.processSMS(smsData);

            expect(mockRelayService.relaySMS).not.toHaveBeenCalled();
        });
    });
});
```

### 2. 통합 테스트
```typescript
// integration/sms.test.ts
import request from 'supertest';
import { app } from '../server';

describe('SMS Integration', () => {
    describe('POST /api/sms', () => {
        it('should receive and process SMS', async () => {
            const smsData = {
                id: 'integration-test-id',
                sender: '010-9876-5432',
                content: 'Integration test message',
                timestamp: Date.now()
            };

            const response = await request(app)
                .post('/api/sms')
                .send(smsData)
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.data.id).toBe(smsData.id);
        });

        it('should validate SMS data', async () => {
            const invalidSmsData = {
                sender: '010-9876-5432'
                // Missing required fields
            };

            const response = await request(app)
                .post('/api/sms')
                .send(invalidSmsData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});
```

---

## 📈 모니터링 및 로깅

### 1. 로깅 설정
```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'autohub-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

export default logger;
```

### 2. 메트릭 수집
```typescript
// metrics.ts
import client from 'prom-client';

// 메트릭 레지스트리
const register = new client.Registry();

// 기본 메트릭
client.collectDefaultMetrics({ register });

// 커스텀 메트릭
export const smsProcessedCounter = new client.Counter({
    name: 'sms_processed_total',
    help: 'Total number of SMS processed',
    labelNames: ['status', 'category'],
    registers: [register]
});

export const notificationProcessedCounter = new client.Counter({
    name: 'notifications_processed_total',
    help: 'Total number of notifications processed',
    labelNames: ['app_name', 'category'],
    registers: [register]
});

export const aiProcessingDuration = new client.Histogram({
    name: 'ai_processing_duration_seconds',
    help: 'Duration of AI processing',
    labelNames: ['message_type'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register]
});

export const relaySuccessCounter = new client.Counter({
    name: 'relay_success_total',
    help: 'Total number of successful relays',
    labelNames: ['target', 'message_type'],
    registers: [register]
});

export const relayFailureCounter = new client.Counter({
    name: 'relay_failure_total',
    help: 'Total number of failed relays',
    labelNames: ['target', 'message_type', 'error_type'],
    registers: [register]
});

export { register };
```

---

## 📞 개발 지원

### 문서화
- **API 문서**: Swagger/OpenAPI 3.0 기반
- **사용자 가이드**: 상세한 사용법 및 설정 가이드
- **개발자 가이드**: 기술 구현 및 아키텍처 설명
- **배포 가이드**: 개발, 테스트, 프로덕션 환경 설정

### 커뮤니티
- **GitHub**: 소스 코드 및 이슈 관리
- **Discord**: 개발자 커뮤니티
- **문서 위키**: 지식 베이스 및 FAQ

### 지원 채널
- **이메일**: dev-support@auto-hub.com
- **버그 리포트**: GitHub Issues
- **기능 요청**: GitHub Discussions

---

*AutoHub 개발 가이드 - 안정적이고 확장 가능한 서비스 구축을 위한 완벽한 가이드*

**마지막 업데이트: 2025-10-23*