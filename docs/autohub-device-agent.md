# AutoHub 디바이스 에이전트 설계 문서

## 1. 앱의 역할 개요

AutoHub 디바이스 에이전트(Android)는 다음 역할을 담당한다.

- 테넌트에 속한 실제 안드로이드 디바이스를 AutoHub 백엔드에 **등록**한다.
- 디바이스에서 수신하는 **SMS를 실시간으로 AutoHub 백엔드의 `/api/sms` 엔드포인트로 전달**한다.
- (선택) AutoHub 백엔드에서 지정한 발신 요청을 받아 안드로이드 단에서 **SMS 발신을 수행**할 수 있도록 확장 가능하다.

이 앱은 **AutoHub SaaS의 “디바이스 통신 에이전트”** 이며, 테넌트별로 여러 디바이스가 존재할 수 있다.

---

## 2. 주요 시나리오

### 2.1 디바이스 최초 등록

1. 사용자가 디바이스에 AutoHub 디바이스 에이전트 앱을 설치한다.
2. 앱을 실행하면 **설정 화면**이 표시된다.
3. 사용자가 다음 값을 입력한다.
   - API Base URL (예: `http://10.0.2.2:3029` 또는 `https://api.autohub.io`)
   - Device ID (테넌트 콘솔에서 발급하거나 사용자가 직접 지정)
   - Device Name (옵션, 사람이 알아보기 쉬운 이름)
4. "서버에 디바이스 등록" 버튼을 누르면 앱은 AutoHub 백엔드의 에이전트 전용 디바이스 등록 API (`POST /api/agent/devices/register`) 를 `x-agent-secret` 헤더와 함께 호출한다.
5. 등록이 성공하면 **설정값을 로컬에 영구 저장**하고, 이후 SMS 포워딩 시 이 값을 사용한다.

### 2.2 인바운드 SMS 수신 및 포워딩

1. 디바이스가 일반 SMS를 수신한다.
2. 안드로이드의 `SmsReceiver` 브로드캐스트 리시버가 `SMS_RECEIVED` 인텐트를 수신한다.
3. 리시버는 `AgentConfigStore` 에 저장된 설정을 로드한다.
4. 각 SMS 메시지에 대해 다음 정보를 추출한다.
   - `deviceId`: 설정값에서 로드
   - `messageId`: UUID로 생성 (단말 내 고유 ID)
   - `sender`: 발신 번호
   - `body`: 메시지 본문
   - `receivedAt`: 수신 시간 (ISO 8601 문자열)
5. 위 정보를 JSON 바디로 구성하여 AutoHub 백엔드의 `/api/sms` 엔드포인트로 HTTP POST 한다.
6. 백엔드는 다음을 수행한다.
   - `deviceId` 기준으로 테넌트 조회
   - 인바운드 SMS 로그 기록
   - 크레딧 0.5 차감 (소프트 리미트)
   - n8n 웹훅으로 메시지 및 분석 결과 포워딩

### 2.3 (향후) 발신 SMS 처리

1. AutoHub 백엔드 또는 n8n 플로우가 특정 디바이스에 SMS 발신을 요청한다.
2. 발신 요청을 전달하기 위한 메커니즘은 다음 중 하나로 설계할 수 있다.
   - 앱 내 폴링(주기적으로 서버에 발신 요청이 있는지 조회)
   - FCM 푸시를 이용해 발신 명령 전달
3. 에이전트 앱은 발신 요청을 수신하면 안드로이드 `SmsManager` 또는 적절한 API를 이용해 SMS를 전송하고, 결과를 서버에 다시 보고한다.

(발신 기능은 MVP 범위 밖으로 두고, 후속 단계에서 설계/구현한다.)

---

## 3. 화면 설계

### 3.1 설정 화면 (MainActivity)

- 구성 요소
  - 텍스트 필드: `API Base URL`
  - 텍스트 필드: `Device ID`
  - 텍스트 필드: `Device Name (Optional)`
  - 버튼: `서버에 디바이스 등록`
  - 텍스트: 등록 결과 메시지 (성공/실패)
  - (향후) 버튼/텍스트: `SMS 권한 상태 확인 및 요청`

- 동작
  - 앱 시작 시 `AgentConfigStore.load(context)` 로 저장된 설정이 있으면 필드에 채운다.
  - "서버에 디바이스 등록" 클릭 시
    - 필수 값 검증 (Base URL, Device ID)
    - `POST {apiBaseUrl}/api/agent/devices/register` 로 `{ deviceId, name }` 전송 (HTTP 헤더 `x-agent-secret` 포함)
    - 성공 시
      - `AgentConfigStore.save()` 를 통해 설정 저장
      - "등록 성공" 메시지 표시
    - 실패 시
      - 에러 메시지 표시

### 3.2 (선택) 상태/로그 화면

MVP 단계에서는 필수가 아니지만, 확장 옵션으로 다음 정보를 보여주는 상태 화면을 고려할 수 있다.

- 현재 설정 요약 (Base URL, Device ID, Device Name)
- 최근 N개의 수신 SMS를 단말 로컬 DB에 저장 후 표시
- 서버 통신 성공/실패 카운트, 마지막 전송 시간 등

---

## 4. 안드로이드 권한 및 컴포넌트

### 4.1 권한

- `android.permission.INTERNET`
  - AutoHub 백엔드와 HTTP 통신을 위해 필수.
- `android.permission.RECEIVE_SMS`
  - 인바운드 SMS를 수신하기 위해 필요.
- `android.permission.SEND_SMS`
  - 안드로이드 단말에서 실제 SMS 발신을 수행하기 위해 필요.

> 참고: Android 6.0 (API 23) 이상에서는 `RECEIVE_SMS` 는 런타임 권한 요청이 필요하다.
> - 앱 실행 시 또는 설정 화면에서 권한 상태를 확인하고, 필요 시 사용자에게 권한을 요청하는 UI를 제공해야 한다.

### 4.2 매니페스트 설정

`app/src/main/AndroidManifest.xml` 주요 항목:

- 권한 선언
  - `<uses-permission android:name="android.permission.INTERNET" />`
  - `<uses-permission android:name="android.permission.RECEIVE_SMS" />`
- Application 설정
  - `android:usesCleartextTraffic="true"` (개발 환경에서 HTTP를 허용하기 위해)
- 메인 액티비티
  - `.MainActivity` 에 `MAIN` + `LAUNCHER` 인텐트 필터
- SMS 리시버
  - `.SmsReceiver` 를 `android.provider.Telephony.SMS_RECEIVED` 액션에 바인딩

---

## 5. 안드로이드 코드 구조

### 5.1 설정 저장/로드 (`AgentConfig.kt`)

- `AgentConfig`
  - `apiBaseUrl: String`
  - `deviceId: String`
  - `deviceName: String?`
- `AgentConfigStore`
  - 내부적으로 SharedPreferences (`autohub_agent_prefs`) 사용
  - `load(context): AgentConfig?`
  - `save(context, config: AgentConfig)`

### 5.2 설정 화면 (`MainActivity.kt`)

- Jetpack Compose 기반 UI
- `SettingsScreen()` 에서
  - `LaunchedEffect(Unit)` 으로 저장된 설정 로드
  - 버튼 클릭 시 `registerDevice()` 호출 후 성공이면 `AgentConfigStore.save()` 수행
- `registerDevice(apiBaseUrl, deviceId, deviceName)`
  - OkHttp 사용
  - `POST {apiBaseUrl}/api/agent/devices/register`
  - HTTP 헤더 `x-agent-secret` 포함 (환경변수 `AGENT_REGISTRATION_SECRET` 기반 시크릿)
  - JSON: `{ "deviceId": "...", "name": "..." }`

### 5.3 SMS 수신 및 포워딩 (`SmsReceiver.kt`)

- `BroadcastReceiver` 구현체 `SmsReceiver`
  - `onReceive()` 에서 `SMS_RECEIVED` 액션 처리
  - `goAsync()` + 코루틴(IO 디스패처)로 비동기 처리
  - `AgentConfigStore.load()` 로 설정 로드 (없으면 경고 로그 후 종료)
  - `Telephony.Sms.Intents.getMessagesFromIntent(intent)` 로 SMS 배열 획득
  - 각 메시지에 대해 `SmsForwarder.forwardSms()` 호출

- `SmsForwarder`
  - 공통 OkHttpClient 사용
  - `forwardSms(config, sender, body, receivedAt, messageId)`
  - JSON: `{ deviceId, messageId, sender, body, receivedAt }`
  - `POST {config.apiBaseUrl}/api/sms` 호출

---

## 6. AutoHub 백엔드와의 연동 규약

### 6.1 디바이스 등록 API (초안)

- 엔드포인트: `POST /api/agent/devices/register`
- 요청 바디 예시

```json
{
  "deviceId": "device-001",
  "name": "office-phone-1"
}
```

- 응답 예시

```json
{
  "status": "success",
  "data": {
    "deviceId": "device-001",
    "tenantId": "tenant-123",
    "name": "office-phone-1",
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

- 인증/권한
  - 이 엔드포인트는 JWT 대신 `x-agent-secret` 헤더 기반 시크릿으로 보호된다.
  - 시크릿 값은 서버 환경변수 `AGENT_REGISTRATION_SECRET` 로 설정하며, 미설정 시 기본값 `dev-agent-secret` 이 사용된다.
  - 운영 환경에서는 충분히 복잡한 시크릿을 사용하고, 필요 시 주기적으로 교체할 수 있다.

### 6.2 인바운드 SMS API

- 엔드포인트: `POST /api/sms`
- 요청 바디 스키마 (`SmsRequestBody`)

```ts
interface SmsRequestBody {
  deviceId: string;
  messageId: string;
  sender: string;
  body: string;
  receivedAt: string;
  raw?: unknown;
}
```

- 안드로이드 에이전트에서 보내는 JSON 예시

```json
{
  "deviceId": "device-001",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "sender": "+821012345678",
  "body": "테스트 메시지",
  "receivedAt": "2025-01-01T12:00:00Z"
}
```

- 백엔드 처리 요약
  - `deviceId` 로 테넌트 조회 (`findTenantIdByDeviceId`)
  - `message_events` 테이블에 인바운드 로그 기록 (`logInboundSmsEvent`)
  - 테넌트가 있으면 `consumeCreditsForTenant(tenantId, 0.5, 'inbound:sms', ...)` 호출
  - n8n 웹훅으로 전체 payload + 분석 결과 전달

### 6.3 n8n 연동 플로우 예시

여기서는 인바운드 SMS를 받아 간단히 Slack으로 알림을 보내는 예시 플로우를 설명한다.

- 기본 아이디어
  - AutoHub 백엔드가 인바운드 SMS를 수신하면, 설정된 n8n 웹훅으로 payload를 전송한다.
  - n8n 플로우는 이 payload를 받아 조건에 따라 분기하고, Slack/이메일/웹훅 등으로 전달한다.

- 예시 플로우 구조
  1. **Webhook 노드**
     - HTTP Method: `POST`
     - Path: `/autohub/inbound-sms`
     - AutoHub 백엔드의 n8n 웹훅 URL로 설정 (예: `https://n8n.example.com/webhook/autohub/inbound-sms`).
  2. **Switch(조건 분기) 노드**
     - 입력: Webhook 노드의 JSON 바디 (예: `{{$json.body}}`).
     - 조건 예시:
       - `body` 에 특정 키워드 포함 여부 (예: "가입", "해지").
       - `sender` 번호별로 다른 채널로 라우팅.
  3. **Slack 노드 (또는 Email 노드)**
     - 메시지 텍스트 예시:
       - `From: {{$json.sender}}\nDevice: {{$json.deviceId}}\nBody: {{$json.body}}`
     - 채널: `#autohub-sms`

- 운영 팁
  - n8n 플로우 안에서 AutoHub의 다른 API(예: `/api/notifications` 또는 외부 API)를 추가로 호출해, SMS 내용을 기반으로 자동 응답/후속 작업을 트리거할 수 있다.
  - 테스트용 디바이스에서만 동작하도록 `deviceId` 화이트리스트를 두고 시작하는 것을 추천한다.

### 6.4 발신 SMS 플로우 및 API (기본 구현)

- 발신 플로우 개요
  - n8n 또는 백엔드 클라이언트가 `/api/notifications` 엔드포인트를 통해 **발신 SMS 요청**을 생성한다.
  - 서버는 `message_events` 테이블에 `direction = 'outbound'`, `channel = 'sms'`, `status = 'queued'` 인 레코드를 쌓는다.
  - 안드로이드 에이전트는 주기적으로 서버에서 자신(`deviceId`)에 해당하는 **대기 중(queued) 발신 SMS를 폴링**한다.
  - 에이전트가 SMS 발신을 실제로 수행한 후, 서버에 **성공/실패 상태를 보고(ack)** 한다.

- 1단계: n8n → 백엔드 (`POST /api/notifications`)
  - 인증: JWT (`Authorization: Bearer ...`), 기존 알림 API와 동일.
  - 요청 예시(JSON):
    - `channel`: 반드시 `"sms"`
    - `deviceId`: 발신을 수행할 에이전트 디바이스 ID
    - `recipient`: 수신자 전화번호 (예: `"+821012345678"`)
    - `body`: SMS 본문
  - 검증 규칙:
    - `channel` 과 `body` 는 필수.
    - `channel === "sms"` 인 경우 `deviceId`, `recipient` 도 필수.
  - 동작:
    - 유저 기준 테넌트를 식별(`getOrCreateTenantIdForUser`).
    - `message_events` 테이블에 `direction = 'outbound'`, `channel = 'sms'`, `status = 'queued'` 로 아웃바운드 이벤트를 기록.
    - 발신 1건당 1 크레딧 차감 (`consumeCreditsForUser`, 소프트 리미트).

- 2단계: 에이전트 → 백엔드 (다음 발신 SMS 조회)
  - 엔드포인트: `GET /api/agent/devices/:deviceId/outbound-sms/next`
  - 인증: `x-agent-secret` 헤더 (디바이스 등록 API와 동일 시크릿 사용).
  - 동작:
    - `message_events` 테이블에서
      - `direction = 'outbound'`
      - `channel = 'sms'`
      - `device_id = :deviceId`
      - `status = 'queued'`
      인 가장 오래된 레코드를 1건 조회.
    - 조회된 레코드는 즉시 `status = 'delivering'` 으로 업데이트.
  - 응답 예시:
    - 대기 중인 SMS가 없는 경우: `data: null`
    - 있는 경우:
      - `messageEventId`: `message_events.id`
      - `deviceId`: 대상 디바이스 ID
      - `recipient`: 수신자 번호
      - `body`: SMS 본문

- 3단계: 에이전트 → 백엔드 (발신 결과 보고)
  - 엔드포인트: `POST /api/agent/devices/:deviceId/outbound-sms/:messageEventId/ack`
  - 인증: `x-agent-secret` 헤더.
  - 요청 바디 예시(JSON):
    - `status`: `"sent"` 또는 `"failed"` (필수)
    - `errorCode`: 실패 시 에러 코드(옵션)
    - `errorMessage`: 실패 시 에러 메시지(옵션)
  - 동작:
    - `message_events` 에서
      - `id = :messageEventId`
      - `device_id = :deviceId`
      - `direction = 'outbound'`
      - `channel = 'sms'`
      인 레코드를 찾아 `status`, `error_code`, `error_message` 를 업데이트.
    - 성공 시 `status: success` 와 함께 `messageEventId`, 최종 `status` 를 응답.

> 참고: 안드로이드 에이전트 쪽의 실제 폴링/발신/ACK 구현은 이후 단계에서 진행할 수 있으며,
> 위 API 설계에 맞추어 코루틴 기반 폴링 루프와 `SmsManager` 호출을 추가하면 된다.

---

## 7. 향후 작업 항목

- 안드로이드
  - `RECEIVE_SMS` 런타임 권한 요청 플로우 구현
  - 상태/로그 화면 추가 여부 결정 및 구현
  - 발신 SMS 처리 플로우 설계 및 구현 (서버 명령 → 단말 발신 → 서버 보고)
- 백엔드
  - (완료) 디바이스 에이전트용 등록/인증 전략 설계 및 구현 (`/api/agent/devices/register`, `x-agent-secret`, `AGENT_REGISTRATION_SECRET`)
  - 에이전트 버전/상태(온라인 여부, 마지막 통신 시각 등) 모니터링 API 설계
- 운영
  - 디바이스 등록/관리 UI에서 에이전트 상태 표시
  - n8n 플로우 템플릿(예: 키워드 기반 라우팅, 스팸 필터링) 제공

---

## 8. n8n 템플릿 플로우 예시

### 8.1 키워드 기반 자동 응답 플로우

- 목적: 특정 키워드(예: "가입", "해지")가 포함된 인바운드 SMS에 대해 자동으로 응답 SMS를 발송한다.
- 구조:
  1. **Webhook(인바운드 SMS 수신)**
     - Path: `/autohub/inbound-sms`
     - AutoHub 백엔드의 n8n 웹훅 URL로 설정.
  2. **Switch(조건 분기)**
     - 조건 1: `{{$json.body}}` 에 `"가입"` 포함
     - 조건 2: `{{$json.body}}` 에 `"해지"` 포함
  3. **Function 노드(응답 메시지 구성)**
     - 분기별로 응답 텍스트와 대상 번호(`recipient`)를 설정.
  4. **HTTP Request 노드(발신 SMS 요청)**
     - Method: `POST`
     - URL: `https://<autohub-backend>/api/notifications`
     - Body(JSON):
       ```json
       {
         "channel": "sms",
         "deviceId": "{{ $json.deviceId }}",
         "recipient": "{{ $json.sender }}",
         "body": "{{ $json.replyBody }}"
       }
       ```
     - 인증: AutoHub 백엔드용 API 토큰 또는 JWT 사용.

### 8.2 발신 캠페인(배치 발송) 플로우

- 목적: 특정 번호 리스트에 동일한 공지/캠페인 메시지를 순차적으로 발송한다.
- 구조:
  1. **Manual Trigger 또는 Schedule 노드**
  2. **Spreadsheet / Static Data 노드**
     - 수신자 목록(전화번호, 이름 등) 보관.
  3. **Item Lists / Split In Batches 노드**
     - 적절한 배치 크기로 나누어 전송(예: 50건 단위).
  4. **HTTP Request 노드(발신 SMS 요청)**
     - URL: `/api/notifications`
     - Body(JSON):
       ```json
       {
         "channel": "sms",
         "deviceId": "campaign-device-1",
         "recipient": "{{ $json.phone }}",
         "body": "{{ $json.message }}"
       }
       ```

### 8.3 스팸/블랙리스트 필터링 플로우

- 목적: 특정 번호(블랙리스트)에서 오는 메시지나, 스팸 의심 키워드가 포함된 메시지를 별도 라벨링/차단 처리.
- 구조:
  1. **Webhook(인바운드 SMS)**
  2. **IF 노드(블랙리스트 번호)**
     - 조건: `{{$json.sender}}` 가 특정 리스트에 포함되는지 체크.
  3. **IF 노드(스팸 키워드)**
     - 조건: `{{$json.body}}` 내 금지/의심 키워드 포함 여부 체크.
  4. **HTTP Request 노드(내부 API 호출)**
     - 예: `/api/notifications` 나 외부 서비스로 경고 전송.
  5. (선택) **Database 노드**
     - 스팸/차단 로그를 별도 테이블에 저장.
