# AutoHub 웹 관리자 / 사용자 대시보드 설계

> 목표: 앱(SMSAutoHub / NotifyAutoHub)은 "허브/에이전트" 역할만 하고,
> 가입/로그인/설정/모니터링/과금/관리자는 **웹 대시보드**에서 모두 처리한다.

## 1. 사용자 타입 정의

- **일반 사용자(User)**
  - 자신의 디바이스(SMS 허브 앱)를 등록
  - 문자/알림 로그 간단 조회
  - n8n/텔레그램 등 연동 설정
  - 플랜/사용량 확인, 결제 정보 관리(향후)

- **관리자(Admin)**
  - 전체 사용자/디바이스/사용량 모니터링
  - 플랜/상품 구성 관리
  - 시스템 상태/에러 로그 확인

초기에는 관리자 1명(본인) + 일반 사용자 1~N 구조로 단순하게 간다.

---

## 2. 라우팅 구조(초안)

Next.js 기준 URL 설계. 실제 구현 시 `web` 폴더를 만들어 사용한다고 가정.

### 2.1 퍼블릭 페이지 (비로그인)

- `/`
  - 랜딩 페이지 (서비스 소개, 주요 기능, CTA 버튼: 가입 / 로그인)

- `/login`
  - 이메일 + 비밀번호 로그인 폼
  - 로그인 성공 시 `/dashboard`로 리다이렉트
  - 필요 API (예상): `POST /api/users/login`

- `/signup`
  - 이메일, 비밀번호(2회), 약관동의 등
  - 가입 후 바로 로그인 처리 또는 `/login`으로 이동
  - 필요 API (예상): `POST /api/users/signup`

- `/forgot-password` (나중)
  - 비밀번호 재설정 요청 폼
  - 필요 API (예상): `POST /api/users/forgot-password`

### 2.2 일반 사용자용 페이지 (로그인 필요)

- `/dashboard`
  - 오늘 처리된 문자/알림 수, n8n 포워딩 성공/실패, 최근 5개 메시지
  - 필요 API:
    - `GET /api/health` (요약 상태 표시용–간단)
    - `GET /api/analytics/summary` (예정)

- `/messages`
  - 시간순 메시지 리스트 (발신자, 내용 요약, 분석 결과 일부)
  - 필터: 기간, 발신자, 카테고리, 스팸 여부 등
  - 필요 API (예정):
    - `GET /api/sms?page=&limit=&sender=&category=&...`

- `/messages/[id]`
  - 개별 메시지 상세 화면
  - 필요 API (예정):
    - `GET /api/sms/:id`

- `/devices`
  - 등록된 디바이스(휴대폰) 목록: 이름, 마지막 동기화 시간, 상태(온라인/오프라인)
  - 디바이스 등록 토큰/QR 코드 발급(앱에서 스캔해서 계정 연동하는 용도)
  - 필요 API (예정):
    - `GET /api/users/devices`
    - `POST /api/users/devices` (디바이스 등록/토큰 생성)

- `/integrations`
  - n8n Webhook / 텔레그램 / 기타 연동 설정
  - 필요 API (일부 이미 존재, 일부 예정):
    - `GET /api/user/settings`
    - `PUT /api/user/settings`
    - `POST /api/webhooks/test`

- `/billing` (향후)
  - 현재 플랜, 사용량(월 메시지 수 / AI 호출 수), 업그레이드 버튼
  - 필요 API (예정):
    - `GET /api/user/usage`
    - `GET /api/user/subscription`
    - `POST /api/billing/checkout`

- `/settings`
  - 프로필(이메일), 알림 설정, 보안(비밀번호 변경 등)
  - 필요 API (예정):
    - `GET /api/users/me`
    - `PUT /api/users/me`

### 2.3 관리자 전용 페이지 (Admin)

- `/admin`
  - 요약 대시보드: 전체 사용자 수, 전체 디바이스 수, 오늘 처리량, 에러 수
  - 필요 API (예정): `GET /api/analytics/admin/summary`

- `/admin/users`
  - 사용자 리스트 (검색, 필터: 플랜, 상태 등)
  - 행 클릭 시 `/admin/users/[id]`로 이동
  - 필요 API (예정): `GET /api/admin/users`

- `/admin/users/[id]`
  - 사용자 상세: 기본 정보, 디바이스 목록, 최근 메시지, 사용량 그래프
  - 플랜 변경/정지/삭제 등 액션 버튼
  - 필요 API (예정):
    - `GET /api/admin/users/:id`
    - `PUT /api/admin/users/:id/plan`

- `/admin/messages`
  - 전체 메시지 로그 (검색/필터)
  - 필요 API (예정): `GET /api/admin/messages`

- `/admin/plans`
  - 플랜 목록(Free/Pro/Business/Enterprise), 가격/한도/설명
  - 필요 API (예정):
    - `GET /api/admin/plans`
    - `PUT /api/admin/plans/:id`

- `/admin/system`
  - 시스템 상태: 백엔드/DB/Redis/n8n 헬스체크 결과
  - 최근 에러 로그
  - 필요 API (예정):
    - `GET /api/health` (확장 버전)
    - `GET /api/admin/logs?type=error`

---

## 3. 인증/권한 흐름(초안)

> 현재 백엔드에는 인증 관련 미들웨어/라우팅 뼈대만 있고,
> 실제 `signup/login` API는 아직 구현되지 않은 상태. 이 문서는 설계 기준으로 사용.

- **인증 방식**
  - JWT 액세스 토큰 + 리프레시 토큰 또는
  - HttpOnly 쿠키 기반 세션(Next.js SSR에 유리)
  - 이 문서에서는 단순화를 위해 "JWT + Bearer 토큰"을 1차 가정

- **기본 흐름**
  1. `/signup` 에서 이메일/비밀번호 제출 → `POST /api/users/signup`
  2. 가입 성공 후 `/login` 에서 `POST /api/users/login`
  3. 서버에서 JWT 액세스 토큰 발급 → 클라이언트 로컬스토리지/쿠키에 저장
  4. 이후 요청 시 `Authorization: Bearer <token>` 헤더로 API 호출
  5. `authMiddleware` 가 토큰 검증 후 `req.user`에 유저 정보 주입
  6. 관리자 전용 라우트는 `role === 'admin'` 여부도 함께 체크

- **프론트 쪽 가드**
  - Next.js에서 `_app.tsx` 또는 레이아웃/미들웨어를 사용해
    - 비로그인 사용자가 `/dashboard`, `/admin/*` 에 접근 시 `/login`으로 리다이렉트
    - 로그인한 사용자가 `/login`, `/signup` 에 접근 시 `/dashboard`로 리다이렉트

---

## 4. 백엔드 API와의 매핑 정리

> 이미 있는 API와 앞으로 추가할 API를 구분해서 작성.

### 4.1 이미 구현된/부분 구현된 엔드포인트

- `GET /api/health`
  - 현재 상태: 구현 완료 (헬스 체크용)
  - 사용처: `/dashboard`, `/admin/system`

- `POST /api/sms`
  - 현재 상태: 구현 완료 (SMS 수신, optional AI 분석, n8n 포워딩)
  - 사용처: 앱(SMSAutoHub) → 백엔드

- `POST /api/webhooks/test`
  - 현재 상태: 스펙만 정의 (프론트에서 Webhook 테스트용으로 활용 예정)

- `GET /api/user/settings`, `PUT /api/user/settings`
  - 현재 상태: DTO/ApiService는 준비되어 있음 (실제 백엔드 구현 필요)

- `GET /api/user/usage`
  - 현재 상태: DTO/ApiService는 준비되어 있음 (실제 백엔드 구현 필요)

### 4.2 새로 추가해야 할 주요 엔드포인트 (예시)

- 인증/계정
  - `POST /api/users/signup`
  - `POST /api/users/login`
  - `POST /api/users/logout`
  - `GET /api/users/me`

- 디바이스
  - `GET /api/users/devices`
  - `POST /api/users/devices`
  - `DELETE /api/users/devices/:id`

- 메시지 조회(사용자용)
  - `GET /api/sms` (쿼리 필터 포함)
  - `GET /api/sms/:id`

- 관리자용
  - `GET /api/admin/users`
  - `GET /api/admin/users/:id`
  - `PUT /api/admin/users/:id/plan`
  - `GET /api/admin/messages`
  - `GET /api/analytics/admin/summary`
  - `GET /api/admin/logs`

- 결제/플랜 (향후)
  - `GET /api/plans`
  - `GET /api/user/subscription`
  - `POST /api/billing/checkout`
  - `POST /api/billing/webhook`

---

## 5. 앞으로의 구현 순서 제안

1. **백엔드 인증/유저 기본 API**
   - `POST /api/users/signup`
   - `POST /api/users/login`
   - `GET /api/users/me`

2. **Next.js 기반 웹 프로젝트 스캐폴딩 (web 폴더)**
   - `/login`, `/signup`, `/dashboard` 최소 페이지 생성
   - Oracle 백엔드 주소(`https://168.138.200.12:3029` 또는 도메인) `.env.local`로 분리

3. **사용자 대시보드(/dashboard)에서 /api/health 연동**
   - 백엔드 헬스 상태 카드로 표기

4. **메시지 리스트(/messages) → /api/sms (읽기 전용) 구현**

5. **관리자용 최소 페이지(/admin) 구현**
   - 초기엔 관리자 1명 하드코딩이라도 OK, 나중에 정식 RBAC로 확장

이 문서는 설계용이므로, 실제 구현 단계에서 라우트 이름이나 구조는 상황에 따라 조정할 수 있다.
