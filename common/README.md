# 🔧 AutoHub 공통 라이브러리

**SMSAutoHub와 NotifyAutoHub에서 공통으로 사용하는 유틸리티 및 라이브러리**

---

## 📋 개요

AutoHub 공통 라이브러리는 SMSAutoHub와 NotifyAutoHub 두 프로젝트에서 공통으로 사용되는 기능들을 모아놓은 모듈입니다. 코드 재사용성을 높이고 유지보수를 용이하게 하기 위해 만들어졌습니다.

### 주요 기능
- **데이터 모델**: 공통 데이터 구조 정의
- **네트워크**: API 통신 관련 유틸리티
- **보안**: 암호화 및 인증 관련 기능
- **유틸리티**: 날짜, 문자열 처리 등 공통 유틸리티
- **상수**: 공통 상수 및 설정 값

---

## 🏗️ 구조

```
common/
├── src/
│   ├── models/
│   │   ├── base-message.model.ts
│   │   ├── user.model.ts
│   │   └── index.ts
│   ├── network/
│   │   ├── api-client.ts
│   │   ├── websocket-client.ts
│   │   └── index.ts
│   ├── security/
│   │   ├── encryption.ts
│   │   ├── jwt-handler.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── date-utils.ts
│   │   ├── string-utils.ts
│   │   ├── validation-utils.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── app-categories.ts
│   │   ├── message-types.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📦 설치

```bash
npm install @autohub/common
# 또는
yarn add @autohub/common
```

---

## 🔧 사용법

### 기본 메시지 모델
```typescript
import { BaseMessage } from '@autohub/common';

const message: BaseMessage = {
    id: 'msg-123',
    userId: 'user-456',
    content: 'Hello World',
    timestamp: Date.now(),
    isRead: false,
    category: 'PERSONAL',
    importance: 'MEDIUM'
};
```

### API 클라이언트
```typescript
import { ApiClient } from '@autohub/common';

const apiClient = new ApiClient({
    baseURL: 'https://api.auto-hub.com',
    apiKey: 'your-api-key'
});

// SMS 전송
await apiClient.post('/api/sms', {
    sender: '010-1234-5678',
    content: 'Test message'
});

// 알림 전송
await apiClient.post('/api/notifications', {
    appName: 'KakaoTalk',
    title: 'New Message',
    content: 'You have a new message'
});
```

### 암호화 유틸리티
```typescript
import { EncryptionUtils } from '@autohub/common';

// 데이터 암호화
const encrypted = EncryptionUtils.encrypt('sensitive data', 'encryption-key');

// 데이터 복호화
const decrypted = EncryptionUtils.decrypt(encrypted, 'encryption-key');

// 해시 생성
const hash = EncryptionUtils.hash('password');
```

### 유틸리티 함수
```typescript
import { DateUtils, StringUtils, ValidationUtils } from '@autohub/common';

// 날짜 유틸리티
const formattedDate = DateUtils.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
const relativeTime = DateUtils.getRelativeTime(timestamp);

// 문자열 유틸리티
const masked = StringUtils.maskPhoneNumber('010-1234-5678'); // '010-****-5678'
const truncated = StringUtils.truncate('Long message content', 20); // 'Long message cont...'

// 유효성 검사
const isValidPhone = ValidationUtils.isValidPhoneNumber('010-1234-5678');
const isValidEmail = ValidationUtils.isValidEmail('user@example.com');
```

---

## 📚 API 문서

### 모델

#### BaseMessage
```typescript
interface BaseMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: number;
    isRead: boolean;
    category: MessageCategory;
    importance: ImportanceLevel;
    metadata?: Record<string, any>;
}
```

#### User
```typescript
interface User {
    id: string;
    email: string;
    phone?: string;
    preferences: UserPreferences;
    createdAt: number;
    updatedAt: number;
}
```

### 네트워크

#### ApiClient
```typescript
class ApiClient {
    constructor(config: ApiClientConfig);
    
    get<T>(url: string, params?: any): Promise<T>;
    post<T>(url: string, data?: any): Promise<T>;
    put<T>(url: string, data?: any): Promise<T>;
    delete<T>(url: string): Promise<T>;
    
    setAuthToken(token: string): void;
    removeAuthToken(): void;
}
```

### 보안

#### EncryptionUtils
```typescript
class EncryptionUtils {
    static encrypt(data: string, key: string): string;
    static decrypt(encryptedData: string, key: string): string;
    static hash(data: string): string;
    static generateSecureToken(): string;
}
```

---

## 🧪 테스트

```bash
# 모든 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage

# 특정 파일 테스트
npm test -- models/base-message.model.test.ts
```

---

## 🚀 빌드 및 배포

```bash
# 빌드
npm run build

# 로컬 패키징
npm pack

# NPM에 게시
npm publish
```

---

## 📋 기여 가이드

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 코딩 컨벤션
- TypeScript 사용
- ESLint 및 Prettier 적용
- 단위 테스트 필수
- JSDoc 주석 작성

---

## 📄 라이선스

本项目采用 [MIT License](../../LICENSE) 开源协议。

---

## 📞 지원

- **이슈 리포트**: [GitHub Issues]
- **문의**: dev-support@auto-hub.com
- **문서**: [공식 문서]

---

*AutoHub 공통 라이브러리 - 재사용 가능한 코드로 생산성 향상*

**마지막 업데이트: 2025-10-23*