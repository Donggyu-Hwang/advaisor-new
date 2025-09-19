# 🚀 IR 분석 시스템 사용 가이드

## 1. 시스템 개요

이 시스템은 IR(투자 유치) 자료를 AI로 분석하여 전문적인 컨설팅 보고서를 자동 생성하는 웹 애플리케이션입니다.

### 주요 기능

- PDF IR 자료 업로드
- AI 기반 단계별 분석 (Claude 3.7)
- 실시간 분석 진행 상황 표시
- 전문 컨설팅 보고서 PDF 생성

## 2. 실행 방법

### 개발 환경 실행

```bash
# 전체 시스템 실행 (클라이언트 + 서버)
npm run dev

# 개별 실행
npm run dev:client  # 클라이언트만
npm run dev:server  # 서버만
```

### 접속 URL

- **클라이언트**: http://localhost:5173
- **서버 API**: http://localhost:3001
- **헬스 체크**: http://localhost:3001/api/health

## 3. API 엔드포인트

### 업로드 관련

- `POST /api/upload/pdf` - PDF 파일 업로드
- `POST /api/upload/convert/:projectId` - PDF를 이미지로 변환
- `POST /api/upload/process` - 전체 파이프라인 실행

### 분석 관련

- `POST /api/analysis/step1/:projectId` - 1단계 분석
- `POST /api/analysis/step2/:projectId` - 2단계 분석
- `POST /api/analysis/overall/:projectId` - 전체 분석
- `POST /api/analysis/report/:projectId` - 마크다운 보고서 생성
- `GET /api/analysis/status/:projectId` - 분석 상태 조회

### 프로젝트 관리

- `GET /api/projects` - 프로젝트 목록 조회
- `GET /api/projects/:projectId` - 프로젝트 상세 조회
- `DELETE /api/projects/:projectId` - 프로젝트 삭제
- `GET /api/projects/:projectId/download/:type` - 보고서 다운로드

## 4. 사용 플로우

### 기본 사용법

1. **업로드**: IR 자료 PDF 파일 업로드
2. **분석**: AI가 자동으로 4단계 분석 수행
3. **결과 확인**: 실시간으로 분석 결과 확인
4. **보고서 다운로드**: 최종 PDF 보고서 다운로드

### API 사용 예제

```bash
# 1. PDF 업로드 및 전체 처리
curl -X POST http://localhost:3001/api/upload/process \
  -H "user-id: test-user" \
  -F "file=@your-ir-document.pdf" \
  -F "projectName=My IR Project"

# 2. 프로젝트 상태 확인
curl http://localhost:3001/api/analysis/status/{projectId}

# 3. 보고서 다운로드 URL 생성
curl http://localhost:3001/api/projects/{projectId}/download/pdf
```

## 5. 분석 단계 설명

### 1단계: 페이지별 기본 분석

- IR 슬라이드의 각 페이지를 개별 분석
- 제목, 내용, 디자인, 핵심 메시지 추출
- JSON 형태의 구조화된 분석 결과 생성

### 2단계: 페이지별 심층 분석

- 1단계 결과를 바탕으로 컨설팅 관점의 심층 분석
- 투자자 질문, 개선 제안, 리스크 요소 도출

### 3단계: 전체 종합 분석

- 모든 페이지의 분석 결과를 통합
- 투자 매력도 평가, 전략적 제안 도출

### 4단계: 보고서 생성

- 전문적인 컨설팅 보고서 형식으로 변환
- Markdown → PDF 변환

## 6. 파일 구조

```
advaisor-new/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 재사용 가능한 컴포넌트
│   │   ├── contexts/       # React Context (Auth, Supabase)
│   │   ├── pages/          # 페이지 컴포넌트
│   │   └── lib/           # 유틸리티 및 설정
├── server/                 # Node.js 백엔드
│   ├── src/
│   │   ├── config/        # 설정 파일 (Supabase, Bedrock)
│   │   ├── services/      # 비즈니스 로직
│   │   ├── routes/        # API 라우트
│   │   └── middleware/    # Express 미들웨어
├── prompts/               # LLM 프롬프트 파일들
└── .env                   # 환경 변수
```

## 7. 환경 변수 설정

`.env` 파일에 다음 설정이 필요합니다:

```env
# Supabase
supabase.url=your_supabase_url
supabase.key=your_supabase_anon_key

# AWS Bedrock
aws.bedrock.region=us-west-2
aws.bedrock.access-key=your_access_key
aws.bedrock.secret-key=your_secret_key
aws.bedrock.profile-arn=your_claude_model_arn
```

## 8. 데이터베이스 테이블

### Supabase 테이블 구조

- `projects`: 프로젝트 기본 정보
- `project_pages`: 페이지별 분석 결과
- `final_reports`: 최종 보고서 정보

## 9. 문제 해결

### 일반적인 문제

1. **서버 시작 실패**: 환경 변수 확인
2. **PDF 변환 실패**: 시스템에 poppler 설치 필요
3. **분석 실패**: AWS Bedrock 권한 및 크레딧 확인

### 로그 확인

- 서버 로그: `server/logs/` 디렉토리
- 브라우저 개발자 도구의 Console 탭

## 10. 개발자 정보

이 시스템은 모노레포 구조로 설계되어 확장 가능하며, 각 컴포넌트가 독립적으로 개발 및 배포 가능합니다.

### 추가 개발 시 고려사항

- 인증 시스템 완성 (현재 임시 구현)
- 실시간 업데이트 (WebSocket/SSE)
- PDF 변환 성능 최적화
- 에러 핸들링 강화
