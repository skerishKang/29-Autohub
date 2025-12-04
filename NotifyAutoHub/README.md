# 🔔 NotifyAutoHub - 스마트폰 알림 자동 중계 서비스

**안드로이드 모든 앱 알림을 실시간으로 외부 서비스로 중계하는 자동화 솔루션**

> "모든 앱 알림을 놓치지 않고 AI 기반으로 자동 분석 및 중계"

---

## 🎯 서비스 개요

NotifyAutoHub는 안드로이드 스마트폰의 모든 앱 알림(카카오톡, 이메일, SNS, 배송, 금융 등)을 실시간으로 수집하여 n8n, 텔레그램, 웹훅 등 외부 서비스로 자동 중계하는 서비스입니다. 사용자가 지정한 특정 앱만 필터링하거나 모든 알림을 통합하여 관리할 수 있습니다.

### ✨ 핵심 기능
- **전체 알림 수집**: 카카오톡, 이메일, SNS 등 모든 앱 알림 감지
- **앱별 필터링**: 사용자가 지정한 특정 앱만 선택적 수집
- **AI 알림 분석**: 알림 내용 자동 요약 및 중요도 분석
- **다중 중계**: n8n, 텔레그램, Slack 등 다양한 채널로 동시 전송
- **개인정보 보호**: 민감정보 자동 마스킹 기능 (사용자 선택)

---

## 🏗️ 시스템 구조

```mermaid
graph TD
    A[안드로이드 스마트폰] --> B[NotifyAutoHub 앱]
    B --> C[알림 수집 서비스]
    C --> D[앱별 필터링]
    D --> E[AI 분석 엔진]
    E --> F[중계 서버]
    F --> G[n8n 웹훅]
    F --> H[텔레그램 봇]
    F --> I[Slack 웹훅]
    F --> J[자체 API]
    
    K[사용자 설정] --> L[앱 선택]
    K --> M[키워드 필터]
    K --> N[마스킹 설정]
    
    L --> D
    M --> E
    N --> F
```

---

## 🛠️ 기술 스택

### 📱 안드로이드 앱
- **개발 언어**: Kotlin (Coroutines, Flow)
- **아키텍처**: MVVM + Clean Architecture
- **핵심 라이브러리**:
  ```kotlin
  // 알림 수집을 위한 NotificationListenerService
  class NotificationListenerService : NotificationListenerService() {
      override fun onNotificationPosted(sbn: StatusBarNotification) {
          // 알림 수신 로직
      }
  }
  
  // 네트워크 통신
  implementation 'com.squareup.retrofit2:retrofit:2.9.0'
  implementation 'com.squareup.okhttp3:okhttp:4.12.0'
  
  // 로컬 데이터베이스
  implementation 'androidx.room:room-runtime:2.6.1'
  implementation 'androidx.room:room-ktx:2.6.1'
  ```

### 🖥️ 백엔드 서버
- **언어**: Node.js (Express) / TypeScript
- **데이터베이스**: PostgreSQL
- **메시지 큐**: Redis Pub/Sub
- **API 문서**: Swagger/OpenAPI 3.0

### 🤖 AI 분석
- **알림 분류**: OpenAI GPT-4 API
- **요약 생성**: Claude API
- **중요도 분석**: 자체 ML 모델

---

## 📋 기능 상세

### 1️⃣ 알림 수집 기능
```kotlin
data class AppNotification(
    val id: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val content: String,
    val timestamp: Long,
    val category: NotificationCategory
)

enum class NotificationCategory {
    MESSAGE, EMAIL, SOCIAL, DELIVERY, FINANCE, SYSTEM, OTHER
}

class NotificationCollector {
    suspend fun collectAllNotifications(): List<AppNotification>
    suspend fun collectNewNotifications(): Flow<AppNotification>
    suspend fun filterByApp(packageName: String): Flow<AppNotification>
}
```

### 2️⃣ 앱별 필터링
```kotlin
class AppFilter {
    private val enabledApps = mutableSetOf<String>()
    
    fun enableApp(packageName: String)
    fun disableApp(packageName: String)
    fun isEnabled(packageName: String): Boolean
    fun getEnabledApps(): List<String>
    
    // 미리 설정된 앱 카테고리
    companion object {
        val POPULAR_APPS = mapOf(
            "com.kakao.talk" to "카카오톡",
            "com.nhn.android.mail" to "네이버 메일",
            "com.google.android.gm" to "Gmail",
            "com.samsung.android.email" to "삼성 이메일",
            "com.spotify.music" to "Spotify",
            "com.instagram.android" to "Instagram"
        )
    }
}
```

### 3️⃣ AI 알림 분석
```typescript
interface NotificationAnalyzer {
    categorizeNotification(title: string, content: string): Promise<NotificationCategory>
    extractKeywords(title: string, content: string): Promise<string[]>
    generateSummary(title: string, content: string): Promise<string>
    analyzeImportance(title: string, content: string): Promise<ImportanceLevel>
}

interface NotificationSummarizer {
    summarizeDaily(notifications: AppNotification[]): Promise<string>
    summarizeByApp(notifications: AppNotification[]): Promise<Map<string, string>>
    generateInsights(notifications: AppNotification[]): Promise<string[]>
}
```

### 4️⃣ 중계 시스템
```typescript
interface NotificationRelay {
    sendToN8n(notification: AppNotification): Promise<void>
    sendToTelegram(notification: AppNotification): Promise<void>
    sendToSlack(notification: AppNotification): Promise<void>
    sendToDiscord(notification: AppNotification): Promise<void>
    broadcast(notification: AppNotification): Promise<void>
}
```

---

## 🔐 보안 및 개인정보 보호

### 🛡️ 권한 관리
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 🔒 데이터 암호화
- **전송 암호화**: TLS 1.3
- **저장 암호화**: AES-256
- **API 인증**: JWT 토큰

### 🎭 개인정보 마스킹 규칙
```kotlin
val notificationMaskingRules = mapOf(
    // 메시지 앱의 민감 내용
    "\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b" to "****@****.com", // 이메일
    "\\b\\d{2,4}-\\d{3,4}-\\d{4}\\b" to "XXX-XXXX-XXXX", // 전화번호
    "\\b계좌번호\\s*[:\\s]*\\d+[\\d-]*\\b" to "계좌번호: XXX-XXXX-XXXX", // 계좌
    "\\b인증번호\\s*[:\\s]*\\d{4,6}\\b" to "인증번호: XXXXXX" // 인증번호
)
```

---

## 🚀 설치 및 설정

### 📱 앱 설치
1. **알림 접근 권한**: 설정에서 알림 접근 권한 허용
2. **앱 선택**: 중계할 앱 선택 (전체 또는 특정 앱)
3. **중계 설정**: 전송할 서비스 선택 (텔레그램, n8n 등)
4. **필터링 설정**: 키워드 필터 및 마스킹 옵션 설정

### ⚙️ 서버 설정
```bash
# 환경 변수 설정
export DATABASE_URL="postgresql://user:pass@localhost/notifyhubdb"
export REDIS_URL="redis://localhost:6379"
export OPENAI_API_KEY="your-openai-key"
export TELEGRAM_BOT_TOKEN="your-telegram-token"

# 서버 실행
npm install
npm run build
npm start
```

### 🔗 텔레그램 봇 설정
```typescript
const telegramBot = new TelegramBot(token);
telegramBot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        "🔔 NotifyAutoHub에 오신 것을 환영합니다!\n" +
        "이제부터 모든 알림이 여기로 전송됩니다."
    );
});
```

---

## 📊 API 명세

### GET /api/notifications
수신된 알림 목록 조회

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "notif_12345",
      "appName": "카카오톡",
      "packageName": "com.kakao.talk",
      "title": "김철수",
      "content": "자료 공유해드렸습니다.",
      "timestamp": "2025-10-23T10:30:00Z",
      "category": "MESSAGE",
      "importance": "MEDIUM"
    }
  ]
}
```

### POST /api/notifications/relay
알림 중계 요청

**Request:**
```json
{
  "notification": {
    "id": "notif_12345",
    "appName": "카카오톡",
    "title": "김철수",
    "content": "자료 공유해드렸습니다."
  },
  "targets": ["telegram", "slack"],
  "maskSensitive": true
}
```

### GET /api/apps
설치된 앱 목록 조회

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "packageName": "com.kakao.talk",
      "appName": "카카오톡",
      "category": "MESSAGE",
      "enabled": true
    },
    {
      "packageName": "com.google.android.gm",
      "appName": "Gmail",
      "category": "EMAIL",
      "enabled": false
    }
  ]
}
```

---

## 🎯 사용 시나리오

### 1️⃣ 메신저 앱
- **카카오톡**: 중요한 대화 내용을 실시간으로 텔레그램으로 전송
- **라인/페이스북**: 업무 관련 메시지만 필터링하여 Slack으로 전달
- **Discord/Slack**: 특정 채널 알림만 선별적으로 수신

### 2️⃣ 이메일 앱
- **Gmail/네이버 메일**: 중요 이메일만 즉시 알림
- **업무 이메일**: 특정 발신자 또는 제목 키워드 필터링
- **프로모션**: 광고성 이메일 자동 분류 및 요약

### 3️⃣ 금융 앱
- **은행 앱**: 입출금 알림을 실시간으로 가계부에 기록
- **증권사 앱**: 주식 알림을 투자 분석 시스템으로 전송
- **카드사 앱**: 결제 알림을 예산 관리 앱에 연동

### 4️⃣ 배송/쇼핑 앱
- **배송 앱**: 택배 배송 상태를 자동으로 캘린더에 등록
- **쇼핑 앱**: 할인/구매 알림을 쇼핑 리스트에 추가
- **예약 앱**: 예약 확인 알림을 일정 관리 앱에 연동

### 5️⃣ 소셜 미디어
- **Instagram**: 좋아요/댓글 알림을 통계 시스템으로 전송
- **YouTube**: 구독 채널 업로드 알림 즉시 수신
- **Twitter**: 멘션/DM 알림을 고객 관리 시스템에 연동

---

## 📈 성능 지표

### ⚡ 처리 속도
- **알림 수집**: < 0.5초
- **AI 분석**: < 2초
- **중계 전송**: < 1초
- **전체 처리**: < 3초

### 📊 처리 용량
- **일일 최대**: 50,000건
- **월간 최대**: 1,500,000건
- **동시 처리**: 500건/초

### 🎯 정확도
- **앱 분류**: 99% 이상
- **중요도 분석**: 88% 이상
- **요약 품질**: 85% 이상

---

## 💰 비즈니스 모델

### 🆓 무료 플랜
- 월 500건 처리
- 5개 앱 필터링
- 기본 분석

### 💎 프리미엄 플랜 ($4.99/월)
- 무제한 처리
- 모든 앱 필터링
- AI 고급 분석
- 다중 중계 채널

### 🏢 기업 플랜 (문의)
- 맞춤 필터링
- API 우선 지원
- 전용 관리자
- SLA 보장

---

## 🔧 개발 가이드

### 🏗️ 로컬 개발 환경
```bash
# 안드로이드 스튜디오 설정
git clone https://github.com/your-org/notifyauto-hub.git
cd notifyauto-hub-android
./gradlew build

# 백엔드 서버
git clone https://github.com/your-org/notifyauto-hub-server.git
cd notifyauto-hub-server
npm install
npm run dev
```

### 🧪 테스트
```bash
# 안드로이드 테스트
./gradlew test
./gradlew connectedAndroidTest

# 백엔드 테스트
npm run test
npm run test:coverage
```

### 📦 배포
```bash
# APK 빌드
./gradlew assembleRelease

# 서버 배포
docker build -t notifyauto-hub .
docker push your-registry/notifyauto-hub
```

---

## 📞 지원 및 문의

### 🐛 버그 리포트
- **GitHub Issues**: [프로젝트 Issues 페이지]
- **이메일**: [support@notifyauto-hub.com]

### 💬 커뮤니티
- **Discord**: [초대 링크]
- **Telegram**: [커뮤니티 그룹]

### 📚 문서
- **API 문서**: [docs/api.md]
- **사용자 가이드**: [docs/user-guide.md]
- **개발자 가이드**: [docs/developer-guide.md]

---

## 📄 라이선스

本项目采用 [MIT License](../../LICENSE) 开源协议。

---

*NotifyAutoHub - 스마트폰 알림 자동화의 새로운 기준*

**마지막 업데이트: 2025-10-23*