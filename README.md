# IR 자료 분석 및 컨설팅 보고서 자동화 시스템

AI 기반 IR(Investor Relations) 자료 분석 및 컨설팅 보고서 자동화 시스템입니다. AWS Bedrock Claude 3.7을 활용하여 PDF 형태의 IR 자료를 분석하고, 전문적인 컨설팅 보고서를 자동으로 생성합니다.

## 🚀 주요 기능

### 📊 AI 기반 분석

- **AWS Bedrock Claude 3.7** 활용한 심층 IR 자료 분석
- PDF 자동 이미지 변환 및 페이지별 분석
- 4단계 프롬프트 체인을 통한 체계적 분석 프로세스

### 🔐 사용자 인증 및 보안

- **Supabase Authentication** 기반 사용자 관리
- 보안 토큰 기반 API 접근 제어
- 개인별 프로젝트 격리 및 데이터 보호

### 📱 사용자 친화적 인터페이스

- **React + TypeScript** 기반 모던 웹 인터페이스
- 드래그 앤 드롭 파일 업로드
- 실시간 분석 진행상황 추적
- 반응형 디자인 및 다크 테마

### ⚡ 자동화된 워크플로우

- 파일 업로드부터 보고서 생성까지 완전 자동화
- 백그라운드 분석 처리 및 진행상황 알림
- PDF 보고서 자동 생성 및 다운로드

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  React Client   │◄──►│  Node.js API    │◄──►│    Supabase     │
│                 │    │                 │    │                 │
│  - 사용자 인터페이스  │    │  - 파일 처리     │    │  - 인증 & DB    │
│  - 상태 관리     │    │  - AI 분석 요청  │    │  - 파일 저장소   │
│  - 실시간 업데이트│    │  - 보고서 생성   │    │  - 사용자 데이터 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                    ┌─────────────────┐
                    │                 │
                    │  AWS Bedrock    │
                    │                 │
                    │  - Claude 3.7   │
                    │  - AI 모델 API  │
                    │  - 자연어 처리   │
                    │                 │
                    └─────────────────┘
```

## �️ 기술 스택

### Frontend

- **React 18** - 사용자 인터페이스
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구 및 개발 서버
- **Tailwind CSS** - 스타일링
- **Framer Motion** - 애니메이션
- **React Router** - 클라이언트 라우팅
- **React Query** - 서버 상태 관리

### Backend

- **Node.js** - 런타임
- **Express.js** - 웹 프레임워크
- **TypeScript** - 타입 안정성
- **Multer** - 파일 업로드 처리
- **Sharp** - 이미지 처리
- **PDF2PIC** - PDF → 이미지 변환

### AI & 클라우드

- **AWS Bedrock** - AI 모델 플랫폼
- **Claude 3.7 Sonnet** - 대화형 AI 모델
- **Supabase** - BaaS (인증, 데이터베이스, 저장소)

### 개발 도구

- **Nodemon** - 개발 서버 자동 재시작
- **Winston** - 로깅
- **Concurrently** - 동시 프로세스 실행

## 📁 프로젝트 구조

```
advaisor-new/
├── client/                 # React 프론트엔드
├── server/                 # Node.js 백엔드
├── prompts/               # LLM 프롬프트 파일들
├── .env                   # 환경 변수
├── package.json           # 루트 package.json (workspaces)
└── README.md             # 이 파일
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
npm run install-all
```

### 2. 개발 서버 실행

```bash
npm run dev
```

이 명령어는 클라이언트(Vite)와 서버(Express)를 동시에 실행합니다.

### 3. 개별 실행

```bash
# 클라이언트만 실행
npm run dev:client

# 서버만 실행
npm run dev:server
```

## 🔧 환경 설정

`.env` 파일에 다음 환경 변수들이 설정되어 있어야 합니다:

- AWS S3 및 Bedrock 인증 정보
- Supabase URL 및 API 키
- 기타 서비스 설정

## 📋 주요 기능

1. **사용자 관리**: Supabase Auth를 통한 회원가입/로그인
2. **파일 업로드**: IR 자료 PDF 업로드
3. **PDF 변환**: PDF를 고해상도 이미지로 변환
4. **AI 분석**: Claude 3.7을 통한 4단계 분석
5. **실시간 업데이트**: 분석 진행 상황 실시간 표시
6. **보고서 생성**: 최종 PDF 컨설팅 보고서 자동 생성

## 🎨 디자인 가이드라인

- **Key Color**: #1D93FF
- **Accent**: #1D93FF33
- **추가 팔레트**: #BF90F4, #33CFB4, #FFB740, #FF283E
- **폰트**: Bold Sans-serif
- **디자인**: Rounded shapes, Neon/glow effects

## 📖 개발 가이드

자세한 개발 지침은 `IR_Analysis_Project_Guidelines.md.md` 파일을 참조하세요.

## 🔄 처리 흐름

1. IR 자료 PDF 업로드
2. PDF → 이미지 변환
3. 페이지별 1차 LLM 분석
4. 페이지별 2차 LLM 분석
5. 전체 JSON 데이터 통합
6. 종합 LLM 분석
7. Markdown 보고서 생성
8. PDF 변환 및 다운로드
