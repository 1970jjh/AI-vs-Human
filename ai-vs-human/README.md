# AI vs 집단지성 - 스트림스 보드게임 AI 챌린지

JJ CREATIVE 교육연구소의 스트림스 보드게임 AI 대전 웹앱입니다.

## 주요 기능

- **관리자 모드**: 게임방 생성, 숫자 선택 (직접/랜덤), AI 자동 배치
- **참가자 모드**: 게임방 참여, 숫자 배치, 실시간 점수 확인
- **AI 대전**: Google Gemini API를 활용한 72점 요새 전략 AI
- **실시간 순위**: 참가자들의 점수 실시간 업데이트

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Google Gemini 2.0 Flash
- **배포**: Vercel

---

## 🚀 Vercel 배포 가이드

### 1단계: GitHub 저장소 준비

```bash
# 저장소 클론 (이미 완료됨)
git clone <repository-url>
cd ai-vs-human
```

### 2단계: Vercel 계정 연결

1. [Vercel](https://vercel.com)에 접속하여 로그인
2. **Add New** → **Project** 클릭
3. GitHub 저장소 선택 (Import)

### 3단계: 환경변수 설정

Vercel 대시보드에서 **Settings** → **Environment Variables** 로 이동하여 다음 환경변수 추가:

| 변수명 | 설명 | 예시값 |
|--------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIza...` |

### 4단계: Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **Create API Key** 클릭
3. 발급된 API 키를 Vercel 환경변수에 등록

### 5단계: 배포

1. Vercel에서 **Deploy** 클릭
2. 빌드 완료 후 자동 배포됨
3. 제공된 URL로 접속 확인

---

## 💻 로컬 개발 환경

### 설치

```bash
npm install
```

### 환경변수 설정

`.env.local` 파일 생성:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

### 빌드

```bash
npm run build
npm start
```

---

## 📋 기본 계정

| 역할 | 아이디 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin | admin123 |
| 회원1 | user1 | user123 |
| 회원2 | user2 | user123 |

> ⚠️ **보안 주의**: 프로덕션 배포 시 반드시 비밀번호를 변경하세요!

회원 데이터는 `data/users.json` 파일에서 관리됩니다.

---

## 🎮 사용 방법

### 관리자

1. 관리자 계정으로 로그인
2. **게임방 생성** 클릭하여 새 게임방 만들기
3. 참가자들이 입장할 때까지 대기
4. **게임 시작** 클릭
5. 숫자 선택 (직접 클릭 또는 랜덤 선택)
6. AI가 자동으로 최적 위치에 배치
7. **다음 턴** 클릭하여 진행

### 참가자

1. 회원 계정으로 로그인
2. 대기중인 게임방 선택하여 참여
3. 게임 시작 후, 숫자가 나오면 원하는 위치에 배치
4. AI와 점수 비교하며 게임 진행

---

## 📁 프로젝트 구조

```
ai-vs-human/
├── src/
│   ├── app/
│   │   ├── api/           # API 라우트
│   │   ├── admin/         # 관리자 페이지
│   │   ├── game/          # 참가자 게임 페이지
│   │   ├── login/         # 로그인 페이지
│   │   └── layout.tsx     # 레이아웃
│   ├── components/        # UI 컴포넌트
│   └── lib/               # 유틸리티 함수
│       ├── ai-logic.ts    # AI 배치 로직
│       ├── gemini.ts      # Gemini API 연동
│       ├── auth.ts        # 인증 시스템
│       ├── rooms.ts       # 방 관리
│       └── types.ts       # 타입 정의
├── data/                  # JSON 데이터 저장
└── public/                # 정적 파일
```

---

## ⚠️ 주의사항

### Vercel 배포 시 데이터 지속성

Vercel은 서버리스 환경이므로 `data/` 폴더의 JSON 파일은 배포 시마다 초기화됩니다.

**영구 데이터가 필요한 경우:**
- Vercel KV (Redis)
- Supabase
- MongoDB Atlas
- PlanetScale

등의 외부 데이터베이스 서비스 연동을 권장합니다.

---

## 📜 라이선스

MIT License

© JJ CREATIVE 교육연구소
