# 프로젝트의 목적 (Project Goal)

본 프로젝트의 궁극적인 목표는 투자 유치(IR) 자료를 효과적으로 분석하고, 이를 바탕으로 **실제 IR 컨설턴트가 투자자 또는 스타트업에게 컨설팅 및 멘토링을 제공할 때 즉시 활용할 수 있는 수준의 고품질 분석 문서를 생성**하는 것입니다. LLM(Large Language Model) API (AWS Bedrock, Claude 3.7)를 활용하여 IR 자료의 핵심 내용을 심층적으로 파악하고, 이를 구조화된 형태로 재구성하여 컨설턴트의 의사결정을 지원하고 업무 효율성을 극대화합니다.

**핵심 사용자 요구사항:**

- **실시간 진행 상황 확인:** 클라이언트(React)에서 4단계, 5단계, 9단계에서 생성되는 중간 및 최종 결과물을 각 단계별로 사용자에게 시각적으로 제공해야 합니다.
- **사용자 관리:** 회원가입 및 로그인 기능이 필수적이며, 사용자별 권한 관리(예: 일반 사용자, 관리자, 컨설턴트 등) 기능이 요구됩니다.

# 기술 스택 (Technology Stack)

- **클라이언트 (Frontend):** React
- **서버 (Backend):** Node.js
- **데이터베이스 (Database):** Supabase (Authentication, PostgreSQL DB)
- **LLM API:** AWS Bedrock (모델: Anthropic Claude 3.7)

# 전체 수행 프로세스 (Overall Execution Process)

## 1단계: IR 자료 입력 (Input IR Material)

- **클라이언트 (React):**
  - 사용자는 **파일 업로드 컴포넌트**를 통해 IR 자료 PDF 파일을 업로드합니다.
  - 업로드 시 `Key color: #1D93FF` 및 `Accent: #1D93FF33`를 활용한 시각적 피드백(진행바, 로딩 스피너)을 제공합니다.
  - 버튼은 `neon/glow effects`를 적용하고 `rounded edges`를 가지며, `hover/focus` 시 색상 전환 효과를 줍니다.
- **서버 (Node.js):**
  - 클라이언트로부터 PDF 파일을 수신합니다.
  - Supabase Storage를 활용하여 업로드된 PDF 파일을 안전하게 저장합니다. 파일명은 사용자 ID, 타임스탬프 등을 포함하여 고유성을 확보합니다.
  - Supabase Database에 파일 업로드 기록(사용자 ID, 파일명, 경로, 상태 등)을 저장합니다.
- **권한 관리:** 로그인된 사용자만 파일 업로드를 할 수 있도록 Supabase Auth를 통해 세션을 검증합니다.

## 2단계: PDF 파일을 이미지로 변환 (PDF to Image Conversion)

- **서버 (Node.js):**
  - Supabase Storage에서 PDF 파일을 다운로드합니다.
  - `pdf-to-image` 또는 `node-poppler-pdf`와 같은 Node.js 라이브러리를 활용하여 PDF의 각 페이지를 고해상도 이미지 파일(PNG, JPG)로 변환합니다. `ImageMagick` 또는 `Poppler`와 같은 외부 도구를 Node.js에서 쉘 명령으로 호출하는 방식도 고려합니다.
  - **상세 요구사항:**
    - **해상도:** 300 DPI 이상의 고해상도로 변환하여 텍스트 및 그래픽 요소의 가독성을 확보합니다.
    - **페이지당 이미지:** PDF의 모든 페이지가 개별 이미지 파일로 변환되어야 합니다. (예: `projectID_page_001.png`, `projectID_page_002.png`, ...)
    - **저장 경로:** 변환된 이미지 파일들은 Supabase Storage 내의 임시 경로에 페이지 순서대로 저장되어야 합니다.
  - Supabase Database에 각 페이지 이미지의 메타데이터(경로, 페이지 번호)를 저장합니다.

## 3단계: 이미지화된 IR 자료 페이지를 LLM API에 전송 (Send Image Pages to LLM API)

- **서버 (Node.js):**
  - 변환된 이미지 파일들을 Supabase Storage에서 불러옵니다.
  - **AWS Bedrock (Claude 3.7) 연동:** AWS SDK for JavaScript (v3)를 사용하여 Bedrock API와 연동합니다.
  - **Prompt 1 (페이지별 분석 프롬프트):** Claude 3.7 모델에 최적화된 프롬프트를 정의합니다. 이 프롬프트는 페이지 이미지와 함께 전송되어 핵심 요약, 주요 데이터 추출, 잠재적 문제점/강점 식별을 요청해야 합니다. JSON 형식의 응답을 명확히 지시합니다.
    - **Prompt 1 별도 첨부**
  - **전송 방식:** 이미지 파일들은 Base64 인코딩 또는 S3 URL 형태로 Claude 3.7에 전송됩니다. Bedrock API의 Rate Limit을 고려하여 페이지 수가 많은 경우 비동기 또는 큐(Queue) 기반 처리 방식을 구현합니다.

## 4단계: JSON 형태로 응답 받기 & 클라이언트에 표시 (Receive JSON Response & Display on Client)

- **서버 (Node.js):**
  - AWS Bedrock API로부터 각 페이지에 대한 JSON 형태의 분석 결과를 수신합니다.
  - 수신된 JSON 데이터를 Supabase Database에 저장합니다 (페이지 번호별로 저장).
  - 클라이언트에 실시간으로 (WebSocket 또는 SSE 등 활용) 각 페이지의 분석 결과를 전송합니다.
- **클라이언트 (React):**
  - 서버로부터 수신된 각 페이지의 JSON 분석 결과를 화면에 실시간으로 표시합니다.
  - `Layout should use bold sans-serif fonts and rounded shapes`.
  - `Titles should be large and highly legible`.
  - 배경색은 `black (#000)` 또는 `soft gray (#F3F3F5)`를 사용하며, 분석 결과 카드나 섹션은 `rounded shapes`로 디자인합니다.
  - `large, energetic graphics: arrows, sweeping curves, bold circular motifs, and gradients`를 사용하여 각 페이지 분석 결과 사이를 시각적으로 연결하거나 강조합니다. `Accent: #1D93FF33`와 추가 팔레트 `#BF90F4`, `#33CFB4`, `#FFB740`, `#FF283E`를 활용하여 시각적 다양성을 부여합니다.
  - 사용자는 여기서 각 페이지별 분석 내용을 확인하고 검토할 수 있습니다.

## 5단계: 각 페이지별 JSON 응답을 다시 LLM API에 전송 & 클라이언트에 표시 (Resend Each Page's JSON Response & Display on Client)

- **서버 (Node.js):**
  - Supabase Database에 저장된 1차 JSON 응답을 불러옵니다.
  - **Prompt 2 (페이지별 심층 분석/재구성 프롬프트):** 컨설턴트 관점에서 추가적인 심층 분석 또는 재구성을 요청하는 프롬프트를 정의합니다.
    - **Prompt 2 별도 첨부**
  - Prompt 2와 함께 1차 JSON 응답을 Claude 3.7 모델에 전송하고, 2차 JSON 응답을 수신합니다.
  - 수신된 2차 JSON 데이터를 Supabase Database에 저장합니다.
  - 클라이언트에 실시간으로 각 페이지의 2차 분석 결과를 전송합니다.
- **클라이언트 (React):**
  - 서버로부터 수신된 각 페이지의 2차 JSON 분석 결과(핵심 메시지, 투자자 질문, 개선 제안 등)를 화면에 실시간으로 표시합니다.
  - `energetic, innovative feel`을 유지하며, `layering, overlaps, and motion`을 활용하여 1차 분석 결과와 차별화된 시각적 표현을 제공합니다. 예를 들어, `bold circular motifs`나 `gradients`를 사용하여 중요한 제안 사항을 강조합니다.
  - 각 페이지의 핵심 내용과 컨설팅 포인트를 명확히 시각화하여 사용자가 쉽게 파악할 수 있도록 합니다.

## 6단계: Prompt 2를 통해 나온 페이지별 JSON 응답들을 하나로 합침 (Combine JSON Responses from Prompt 2)

- **서버 (Node.js):**
  - Supabase Database에 저장된 모든 페이지의 2차 JSON 응답을 불러옵니다.
  - Node.js 로직을 사용하여 이 JSON 응답들을 하나의 통합된 JSON 객체로 결합합니다. 이때 페이지 순서가 유지되도록 주의합니다.
  - 통합된 JSON 데이터를 Supabase Database에 저장합니다.

## 7단계: 하나로 합친 JSON을 Prompt 3와 함께 LLM API에 전송 (Send Combined JSON to LLM API with Prompt 3)

- **서버 (Node.js):**
  - Supabase Database에서 통합된 JSON 데이터를 불러옵니다.
  - **Prompt 3 (전체 IR 자료 종합 분석 프롬프트):** IR 자료 전체의 맥락을 고려한 횡단 분석 진행 - 종합적인 분석, 투자 매력도 평가, 핵심 컨설팅 방향 등을 도출하도록 지시합니다.
    - **Prompt 3 별도 첨부**
  - Prompt 3와 통합 JSON 데이터를 Claude 3.7 모델에 전송하고, 최종 JSON 응답을 수신합니다.
  - 수신된 최종 JSON 데이터를 Supabase Database에 저장합니다.

## 8단계: JSON 응답을 MD 파일로 변환 (Convert JSON Response to MD File)

- **서버 (Node.js):**
  - Supabase Database에서 최종 JSON 응답을 불러옵니다.
  - **Prompt 4 (MD 변환 프롬프트):** 최종 JSON 응답을 입력으로 받아, 전문적인 IR 컨설팅 보고서 형식의 Markdown 파일로 변환하도록 Claude 3.7에 지시합니다. Markdown 문법 및 특정 목차 구조 준수를 명확히 요청합니다.
    - **Prompt 4 별도 첨부**
  - Claude 3.7로부터 MD 형식의 텍스트를 수신하고, 이를 `.md` 파일로 저장합니다.
  - 생성된 MD 파일을 Supabase Storage에 저장합니다.

## 9단계: MD 파일을 전문적인 보고서 형태로 PDF 출력 & 클라이언트에 제공 (Output MD File as Professional PDF Report & Provide to Client)

- **서버 (Node.js):**
  - Supabase Storage에서 생성된 MD 파일을 불러옵니다.
  - `pandoc` 또는 `wkhtmltopdf`와 같은 외부 도구를 Node.js에서 호출하거나, Node.js 기반 PDF 생성 라이브러리(예: `Playwright`를 통한 HTML-to-PDF, `WeasyPrint` 컨테이너 활용 등)를 사용하여 MD 파일을 전문적인 PDF 보고서로 변환합니다.
  - **요구사항:**
    - **템플릿 적용:** 클라이언트의 `Key color: #1D93FF` 및 `Accent: #1D93FF33`를 활용한 로고, 서식, 글꼴 등을 포함하는 PDF 템플릿을 적용합니다. `bold sans-serif fonts`를 사용합니다.
    - **목차 및 페이지 번호:** 자동으로 목차와 페이지 번호가 생성됩니다.
    - **하이퍼링크 유지:** MD 내의 모든 하이퍼링크가 PDF에서도 클릭 가능하도록 유지됩니다.
  - 생성된 PDF 파일을 Supabase Storage에 저장하고, 다운로드 가능한 URL을 생성합니다.
  - 클라이언트에 PDF 다운로드 URL 및 최종 완료 상태를 전송합니다.
- **클라이언트 (React):**
  - 서버로부터 PDF 다운로드 URL을 수신하여 사용자에게 "보고서 다운로드" 버튼을 활성화합니다.
  - 다운로드 버튼은 `neon/glow effects`와 `rounded edges`를 가지며, `Key color: #1D93FF`를 사용합니다.
  - 최종 보고서가 준비되었음을 알리는 `large, energetic graphics`와 `Typography must be strong and contemporary` 디자인 요소를 활용하여 사용자에게 긍정적인 경험을 제공합니다. `cleat and visually striking` 레이아웃을 유지합니다.

# 디자인 가이드라인 (Design Guidelines) - React Frontend

## 1. 전반적인 미학 (Overall Aesthetic)

- **현대적 & 동적:** `modern web frontend`를 지향하며, 포스터 디자인에서 영감을 받은 `energetic, innovative feel`을 유지합니다.
- **레이어링 & 움직임:** `creative use of layering, overlaps, and motion`을 통해 동적이고 깊이 있는 인터페이스를 구현합니다.
- **클린 & 시각적:** `Avoid clutter; keep layouts clear and visually striking`. 콘텐츠를 명확하게 전달하면서도 시각적으로 강렬한 인상을 줍니다.

## 2. 색상 팔레트 (Color Palette)

| 용도                      | 색상코드    | 설명                                                                                                  |
| :------------------------ | :---------- | :---------------------------------------------------------------------------------------------------- |
| **주요색 (Primary)**      | `#1D93FF`   | 브랜드의 핵심 색상. CTA, 아이콘, 중요 강조 요소에 사용합니다.                                         |
| **보조색(투명) (Accent)** | `#1D93FF33` | 주요색의 20% 투명도 (약간 불투명한 파란색). 배경 요소, 오버레이, 그래픽의 부드러운 효과에 활용합니다. |
| 팔레트1                   | `#BF90F4`   | (보라색 계열) 시각적 계층을 만들거나 특정 섹션을 구분하는 데 사용합니다.                              |
| 팔레트2                   | `#33CFB4`   | (청록색 계열) 성공, 완료, 긍정적인 피드백 또는 대조적인 강조에 사용합니다.                            |
| 팔레트3                   | `#FFB740`   | (주황색 계열) 경고, 주의, 하이라이트 또는 보조적인 강조에 사용합니다.                                 |
| 팔레트4                   | `#FF283E`   | (빨간색 계열) 에러, 위험, 부정적인 피드백 또는 강렬한 강조에 사용합니다.                              |
| **배경색 (Background)**   | `#000`      | (Black) 주요 콘텐츠 영역 또는 강렬하고 모던한 느낌을 줄 때 사용합니다.                                |
| **배경색 (Background)**   | `#F3F3F5`   | (Soft Gray) 가볍고 깔끔한 느낌, 가독성을 높일 때 사용합니다.                                          |

## 3. 타이포그래피 (Typography)

- **글꼴:** `bold sans-serif fonts`를 선호합니다. (예: Montserrat, Poppins, Inter 등)
- **강조:** `Typography must be strong and contemporary`.
- **제목:** `Titles should be large and highly legible`. 섹션 제목, 카드 제목 등은 크고 명확하게 디자인하여 가독성을 극대화합니다.
- **본문:** 본문 텍스트는 간결하고 명확하며, 배경색에 따라 적절한 대비를 유지합니다.

## 4. 레이아웃 및 형태 (Layout and Shapes)

- **형태:** `rounded shapes`를 광범위하게 사용합니다. 버튼, 카드, 입력 필드 등 UI 요소 전반에 적용합니다.
- **간격:** `Avoid clutter`. 충분한 여백을 활용하여 콘텐츠 간의 구분을 명확히 하고 시각적 피로도를 줄입니다.
- **동적 그래픽:** `large, energetic graphics: arrows, sweeping curves, bold circular motifs, and gradients`를 적극적으로 활용합니다.
  - **사용 예시:**
    - 진행 상황을 나타내는 스텝 바이 스텝 인디케이터에 `arrows`나 `sweeping curves`를 `Key color`와 `Accent` 색상으로 적용합니다.
    - 섹션 구분이나 중요 정보 강조에 `bold circular motifs`와 `gradients`를 사용합니다. `BF90F4`, `33CFB4`, `FFB740` 등 보조 팔레트 색상을 활용하여 다채로운 느낌을 줍니다.

## 5. UI 요소 (UI Elements)

- **버튼:** `Buttons should feature neon/glow effects based on the key color` (`#1D93FF`). `rounded edges`를 가지며, `color transitions on hover/focus` 효과를 제공하여 상호작용성을 높입니다.
  - 기본 버튼: 배경 `#1D93FF`, 텍스트 흰색. 호버 시 글로우 효과.
  - 보조 버튼: 배경 투명, 테두리 `#1D93FF`, 텍스트 `#1D93FF`. 호버 시 배경 `#1D93FF`로 채워짐.
- **입력 필드:** `rounded shapes`를 가지며, 포커스 시 `Key color` 테두리나 `glow effect`를 적용합니다.
- **카드/패널:** `rounded shapes`를 기본으로 하며, 배경색 (`#000` 또는 `#F3F3F5`)에 따라 대비되는 색상을 활용하여 콘텐츠를 담습니다. `layering` 효과를 줄 수 있습니다.
- **로딩/진행 표시:** `Key color`와 `Accent` 색상을 활용한 동적인 로딩 애니메이션 또는 진행바를 디자인합니다. `sweeping curves`나 `bold circular motifs`를 사용할 수 있습니다.

## 6. 이미지 및 아이콘 (Imagery and Icons)

- 추상적이고 현대적인 느낌의 아이콘을 사용합니다. `bold sans-serif fonts`와 일관된 스타일을 유지합니다.
- 필요에 따라 `gradients`와 `glow effects`를 아이콘에도 적용하여 디자인 통일성을 높입니다.
