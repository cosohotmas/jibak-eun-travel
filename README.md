# 집밖은여행 (Jibak-eun Travel) · `jibak-eun-travel`

> **개인 포트폴리오 · 개발 역량 시연용 프로젝트 안내**  
> 본 프로젝트는 **실제 상용 쇼핑몰·결제 서비스가 아닌 개인 포트폴리오 및 AI·풀스택 개발 역량 시연용 데모 웹 애플리케이션**입니다. 표시된 상품 가격, 재고, 배송 및 결제 흐름은 데모 목적의 시뮬레이션으로 동작합니다.

지식 그래프(Knowledge Graph)와 RAG 기반 공식 수하물·교통 규정 검증을 결합한 **AI 트래블 컨시어지 & 스마트 패킹 스토어프론트**입니다. 사용자가 선택한 복합 이동수단(도보·자가용·지하철·버스·철도·배·항공) 중 **가장 엄격한 최소단위 규정**을 자동 계산하고, 실시간 카탈로그·가방 규격·적재율 게이지를 단일 기준으로 연동해 할루시네이션 없는 준비물 추천을 제공합니다.

---

## 주요 기능

- **지식 그래프 · RAG 기반 규정 엔진 & Fact-First 출처 표기**
  - 국토교통부(항공보안법), 코레일(KTX·SRT 약관), 법제처(도로교통법 제39조), 서울교통공사, 전국고속버스운송사업조합, 해양수산부, 국민체육진흥공단 기준을 지식 그래프 노드로 모델링
  - 복합 이동수단 선택 시 가장 엄격한 무게(`kg`), 크기(`cm`), 액체(`ml`), 배터리(`Wh`) 한계를 자동 산출하고 답변에 공식 출처 배지 표시
- **한 줄 요약 칩 (`[수정]`) & 4단계 맞춤여행 진단**
  - 평상시에는 `목적지 · 일정 · 동행 · 가방 · 이동수단 (최대 Xkg)` 한 줄 요약 칩으로 간결하게 표시하고, `[수정]` 클릭 시 세부 옵션(7대 이동수단, 국내·해외 목적지, 일정, 테마/비즈니스 출장 동행, 가방 규격 28L/20인치/24인치)을 온디맨드로 편집
- **테트리스 용량 게이지 & 3분할 체크리스트 영수증 팝업**
  - **챙길짐 / 살물건 / 현지조달** 3분할 체크리스트와 가방 부피·무게 적재율(%) 실시간 연동
  - 단일 규정 판정 함수를 공유해 채팅 추천 카드, 용량 게이지, 영수증 팝업 간 `규정적합 / 규정주의 / 규격초과` 판정 일관성 유지
- **스토어프론트 · 주문서 주소 검색 · 마이페이지**
  - 상품 상세 옵션(규격·색상·수량) 계산, 장바구니 담기, Daum 우편번호 + 내장 키워드 폴백 주소 검색 모달
  - Firebase Authentication(Google 로그인) 및 Firestore 연동 실시간 주문 내역(카드형 영수증)·체크리스트 저장·1:1 문의 지원
- **통합 운영 관리자 콘솔 (`#admin-console`)**
  - 시연용 간편 번호 입장, 재무 KPI·전환 퍼널·코호트, 상품/히어로 배너 관리, 실제 Firestore 주문 내역 조회 및 송장 상태 변경, 인터랙티브 지식 그래프 노드·연결선 시각화, AI 운영 비서

---

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Motion |
| Backend / API | Express (`server/app.ts`), Node.js ESM, Vercel Serverless Function (`api/index.ts`) |
| AI / RAG | `@google/genai` (Structured JSON Output + Server-Side Catalog Grounding) |
| Auth / Database | Firebase Authentication (Google), Cloud Firestore (`firestore.rules`) |

---

## 프로젝트 구조

```text
jibak-eun-travel/
├── api/
│   └── index.ts                 # Vercel Serverless Function 엔트리포인트 (Express 앱 export)
├── public/
│   └── assets/aistudio/         # 상품·히어로 정적 이미지 에셋
├── server/
│   ├── app.ts                   # 공통 Express API 라우터 (/api/chat, /api/store/bootstrap 등)
│   └── knowledgeGraph.ts        # 지식 그래프 규정·공식 출처·카탈로그·판정 엔진
├── src/
│   ├── components/              # 챗봇, 용량 게이지, 영수증 모달, 주소 검색, 관리자 콘솔 등 UI
│   ├── lib/                     # Firebase 클라이언트 및 단일 규정 판정 유틸
│   ├── types/domain.ts          # 프론트엔드/백엔드 공용 도메인 타입
│   ├── App.tsx
│   └── main.tsx
├── server.ts                    # 로컬/개발용 통합 서버 (포트 3000 + Vite 미들웨어)
├── vercel.json                  # Vercel 빌드 출력(dist) 및 /api·SPA 리라이트 설정
├── firestore.rules              # Firestore 보안 규칙
└── package.json
```

---

## 로컬 실행 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   `.env.example`을 참고해 루트에 `.env` 파일을 생성합니다.
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```
   *(선택 사항: 서버 재시작·멀티 인스턴스 환경에서 관리자 토큰을 유지하려면 `SESSION_SECRET`을 추가하세요.)*

3. **개발 서버 실행 (포트 3000)**
   ```bash
   npm run dev
   ```

4. **타입 검사 및 프로덕션 빌드 확인**
   ```bash
   npm run lint
   npm run build
   ```

---

## Vercel 배포 가이드

이 저장소는 **`vercel.json`** 과 **`api/index.ts`** 가 포함되어 있어 GitHub 연동만으로 프론트엔드(Vite 정적 빌드 `dist/`)와 백엔드(`/api/*` Express Serverless Function)를 함께 배포할 수 있습니다.

### 1. Vercel 프로젝트 연결
1. [Vercel](https://vercel.com) 대시보드에서 **Add New → Project**를 선택하고 이 GitHub 저장소(`jibak-eun-travel`)를 Import 합니다.
2. `vercel.json` 설정에 의해 아래 항목이 자동 적용됩니다.
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Rewrites**: `/api/(.*)` → `/api/index`, 나머지 경로 → `/index.html`

### 2. Vercel 환경 변수(Environment Variables) 등록
Vercel 프로젝트 **Settings → Environment Variables**에 아래 변수를 추가한 뒤 배포(또는 Redeploy)하세요.

| Key | 필수 여부 | 설명 |
| --- | --- | --- |
| `GEMINI_API_KEY` | **필수** | AI 챗봇(`/api/chat`) 및 관리자 AI 비서(`/api/admin/copilot`) 호출용 Gemini API 키 |
| `SESSION_SECRET` | **권장** | `#admin-console` HMAC 세션 토큰 서명 키 (임의의 긴 문자열 입력 시 서버리스 인스턴스 간 세션 유지) |

### 3. Firebase Authentication 도메인 허용 (중요)
배포가 완료되어 `https://<your-project>.vercel.app` 주소를 발급받으면, **Google 로그인**이 차단(`auth/unauthorized-domain`)되지 않도록 Firebase Console에 도메인을 등록해야 합니다.
1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트(`docker-gcp-class-510113`) 선택
2. **Authentication → Settings → Authorized domains** 이동
3. **Add domain**을 눌러 배포된 Vercel 도메인(예: `jibak-eun-travel.vercel.app`) 추가

### 4. 서버리스 환경 참고 사항
- 사용자 로그인, 주문 생성, 마이페이지 주문 내역, 체크리스트 저장, 1:1 문의는 **Cloud Firestore**에 영구 저장됩니다.
- `#admin-console`의 데모 상품·배너 추가 및 클릭 통계 카운터는 서버 메모리(`storeRuntime`) 기반 데모 데이터로 동작하므로 서버리스 콜드 스타트 시 초기 시드 상태로 복원될 수 있습니다.

---

## 라이선스 및 유의사항

- 본 저장소는 포트폴리오 및 기술 시연 목적의 프로젝트입니다.
- 실제 항공·철도·여객선·버스 탑승 전에는 각 운송사 및 관계 기관의 최신 공식 약관을 반드시 재확인하시기 바랍니다.
