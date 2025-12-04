# 📱 SMSAutoHub - 스마트폰 문자 자동 중계 서비스

**안드로이드 문자(SMS)를 실시간으로 외부 서비스로 중계하는 자동화 솔루션**

> "모든 문자 메시지를 놓치지 않고 AI 기반으로 자동 분석 및 중계"

---

## 🎯 서비스 개요

SMSAutoHub는 안드로이드 스마트폰의 모든 수신 문자(SMS)를 실시간으로 수집하여 n8n, 텔레그램, 웹훅 등 외부 서비스로 자동 중계하는 서비스입니다. AI 필터링을 통해 스팸/광고를 자동 구분하고 중요 메시지만 선별적으로 전달할 수 있습니다.

### ✨ 핵심 기능
- **실시간 문자 수집**: 모든 수신 문자를 즉시 감지하고 수집
- **AI 기반 필터링**: 스팸, 광고, 중요 메시지 자동 분류
- **다중 중계**: n8n, 텔레그램, 웹훅 등 다양한 채널로 동시 전송
- **개인정보 보호**: 민감정보 자동 마스킹 기능 (사용자 선택)
- **발신자 필터링**: 특정 발신자/키워드 기반 선택적 중계

---

## 🏗️ 시스템 구조

```mermaid
graph TD
    A[안드로이드 스마트폰] --> B[SMSAutoHub 앱]
    B --> C[문자 수집 엔진]
    C --> D[AI 필터링 시스템]
    D --> E[중계 서버]
    E --> F[n8n 웹훅]
    E --> G[텔레그램 봇]
    E --> H[자체 API]
    E --> I[외부 웹훅]
    
    J[사용자 설정] --> K[발신자 필터]
    J --> L[마스킹 설정]
    J --> M[중계 대상 선택]
    
    K --> D
    L --> D
    M --> E
```

---

## 🛠️ 기술 스택

### 📱 안드로이드 앱
- **개발 언어**: Kotlin (Coroutines, Flow)
- **아키텍처**: MVVM + Clean Architecture
- **핵심 라이브러리**:
  ```kotlin
  // SMS 수신을 위한 브로드캐스트 리시버
  class SmsReceiver : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
          // SMS 수신 로직
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

### 🤖 AI 필터링
- **스팸 분류**: OpenAI GPT-4 API
- **감성 분석**: Claude API
- **키워드 추출**: 자체 NLP 모델

---

## 📋 기능 상세

### 1️⃣ 문자 수집 기능
```kotlin
data class SmsMessage(
    val id: String,
    val sender: String,
    val content: String,
    val timestamp: Long,
    val isRead: Boolean = false
)

class SmsCollector {
    suspend fun collectAllSms(): List<SmsMessage>
    suspend fun collectNewSms(): Flow<SmsMessage>
    suspend fun markAsRead(messageId: String)
}
```

### 2️⃣ AI 필터링
```typescript
interface SmsFilter {
    spamDetection(content: string): Promise<SpamResult>
    importanceAnalysis(content: string): Promise<ImportanceLevel>
    extractKeywords(content: string): Promise<string[]>
    sentimentAnalysis(content: string): Promise<Sentiment>
}

enum class ImportanceLevel {
    LOW, MEDIUM, HIGH, URGENT
}
```

### 3️⃣ 중계 시스템
```typescript
interface MessageRelay {
    sendToN8n(message: SmsMessage): Promise<void>
    sendToTelegram(message: SmsMessage): Promise<void>
    sendToWebhook(message: SmsMessage, url: string): Promise<void>
    broadcast(message: SmsMessage): Promise<void>
}
```

### 4️⃣ 개인정보 마스킹
```kotlin
class PrivacyMasker {
    fun maskBankAccount(content: String): String
    fun maskPhoneNumber(content: String): String
    fun maskVerificationCode(content: String): String
    fun maskPersonalInfo(content: String): String
}
```

---

## 🔐 보안 및 개인정보 보호

### 🛡️ 권한 관리
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 🔒 데이터 암호화
- **전송 암호화**: TLS 1.3
- **저장 암호화**: AES-256
- **API 인증**: JWT 토큰

### 🎭 개인정보 마스킹 규칙
```kotlin
val maskingRules = mapOf(
    "\\b\\d{3}-\\d{4}-\\d{4}\\b" to "XXX-XXXX-XXXX", // 전화번호
    "\\b\\d{3,4}-\\d{4}-\\d{4}\\b" to "XXXX-XXXX-XXXX", // 계좌번호
    "\\b\\d{6}\\b" to "XXXXXX", // 인증번호
    "\\b[0-9]{16}\\b" to "XXXXXXXXXXXXXXXX" // 카드번호
)
```

---

## 🚀 설치 및 설정

### 📱 앱 설치
1. **APK 다운로드**: 최신 버전 다운로드
2. **권한 허용**: SMS 읽기, 네트워크 권한 허용
3. **기본 설정**: 중계 대상, 필터링 옵션 설정

### ⚙️ 서버 설정
```bash
# 환경 변수 설정
export DATABASE_URL="postgresql://user:pass@localhost/smsautodb"
export REDIS_URL="redis://localhost:6379"
export OPENAI_API_KEY="your-openai-key"
export TELEGRAM_BOT_TOKEN="your-telegram-token"

# 서버 실행
npm install
npm run build
npm start
```

### 🔗 n8n 연동
```json
{
  "webhook": {
    "url": "https://your-n8n-instance.com/webhook/sms",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer your-webhook-token"
    }
  }
}
```

---

## 📊 API 명세

### GET /api/sms
수신된 문자 목록 조회

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "12345",
      "sender": "010-1234-5678",
      "content": "배송이 완료되었습니다.",
      "timestamp": "2025-10-23T10:30:00Z",
      "isSpam": false,
      "importance": "MEDIUM"
    }
  ]
}
```

### POST /api/sms/relay
문자 중계 요청

**Request:**
```json
{
  "message": {
    "id": "12345",
    "sender": "010-1234-5678",
    "content": "배송이 완료되었습니다."
  },
  "targets": ["n8n", "telegram"],
  "maskSensitive": true
}
```

---

## 🎯 사용 시나리오

### 1️⃣ 개인 자동화
- **배송 알림**: 택배사 문자를 자동으로 캘린더에 등록
- **금융 알림**: 은행 문자를 자동으로 가계부에 기록
- **중요 연락**: 가족/친구 문자를 즉시 텔레그램으로 전달

### 2️⃣ 비즈니스 활용
- **고객 응대**: 고객 문의 문자를 자동으로 티켓 시스템에 등록
- **마케팅**: 광고성 문자를 자동으로 필터링하고 분석
- **팀协作**: 팀 문자를 자동으로 협업툴에 공유

### 3️⃣ AI 분석
- **감성 분석**: 문자 내용의 감성을 분석하여 우선순위 결정
- **키워드 추출**: 중요 키워드를 자동으로 추출하여 태깅
- **패턴 인식**: 반복적인 문자 패턴을 학습하여 자동 분류

---

## 📈 성능 지표

### ⚡ 처리 속도
- **문자 수집**: < 1초
- **AI 필터링**: < 3초
- **중계 전송**: < 2초
- **전체 처리**: < 5초

### 📊 처리 용량
- **일일 최대**: 10,000건
- **월간 최대**: 300,000건
- **동시 처리**: 100건/초

### 🎯 정확도
- **스팸 분류**: 95% 이상
- **중요도 분석**: 90% 이상
- **감성 분석**: 85% 이상

---

## 💰 비즈니스 모델

### 🆓 무료 플랜
- 월 100건 처리
- 기본 필터링
- 텔레그램 중계

### 💎 프리미엄 플랜 ($4.99/월)
- 무제한 처리
- AI 고급 필터링
- 다중 중계 채널
- 개인정보 마스킹

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
git clone https://github.com/your-org/smsautod-hub.git
cd smsauto-hub-android
./gradlew build

# 백엔드 서버
git clone https://github.com/your-org/smsauto-hub-server.git
cd smsauto-hub-server
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
docker build -t smsauto-hub .
docker push your-registry/smsauto-hub
```

---

## 📞 지원 및 문의

### 🐛 버그 리포트
- **GitHub Issues**: [프로젝트 Issues 페이지]
- **이메일**: [support@smsauto-hub.com]

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

*SMSAutoHub - 스마트폰 문자 자동화의 새로운 기준*

**마지막 업데이트: 2025-10-23*