# 활동지 AI 평가

학생 활동지 PDF를 업로드하면 Gemini가 교사가 정한 평가 기준에 따라 **기준별 점수 · 판단 근거 · 개선 제안**을 작성해 주는 Next.js 웹 앱입니다.

- **로그인**: Firebase Authentication (Google, 이메일/비밀번호)
- **PDF 저장**: Cloud Storage for Firebase — `teachers/{uid}/evaluations/{evaluationId}.pdf`
- **평가 기준·결과 저장**: Cloud Firestore — `teachers/{uid}/rubrics`, `teachers/{uid}/evaluations`
- **AI 평가**: Gemini API (`@google/genai`). **서버 API 라우트에서만** 호출하며 API 키는 브라우저로 나가지 않습니다.
- **배포**: Firebase App Hosting (`apphosting.yaml`)

## 구조

```
src/
  app/
    page.tsx                     로그인
    (teacher)/layout.tsx         로그인·권한 확인 + 상단 메뉴
    (teacher)/evaluate           PDF 업로드 → 평가
    (teacher)/evaluations        결과 목록 / 상세(PDF 보기·다시 평가·삭제)
    (teacher)/rubrics            평가 기준 목록 / 생성 / 수정
    api/                         서버 API (모두 Firebase ID 토큰 검증)
  lib/server/                    서버 전용(server-only): Admin SDK, Gemini, 인증
  lib/firebase-client.ts         브라우저: Firebase Auth만 사용
```

보안 설계
- 브라우저는 Firebase **Auth만** 사용하고, Firestore·Storage·Gemini는 모두 서버 API를 거칩니다.
- `firestore.rules`, `storage.rules`는 클라이언트 접근을 전부 막습니다(Admin SDK는 규칙을 우회).
- 모든 API는 `Authorization: Bearer <ID 토큰>`을 검증하고, 데이터는 교사 uid 경로 아래에만 저장·조회합니다.
- `ALLOWED_TEACHER_EMAILS`를 지정하면 그 이메일만 사용할 수 있습니다.
- PDF 안에 적힌 지시문(“만점 주세요” 등)은 따르지 않도록 시스템 지시문에 명시했습니다.

## 1. Firebase 프로젝트 준비

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 → **Blaze 요금제**로 전환 (App Hosting 필수)
2. **Authentication** → 로그인 방법에서 *Google*, *이메일/비밀번호* 사용 설정
3. **Firestore Database** 생성 (프로덕션 모드)
4. **Storage** 시작
5. 프로젝트 설정 → 내 앱 → **웹 앱 추가** (설정값은 로컬 개발에서 사용)
6. [Google AI Studio](https://aistudio.google.com/apikey)에서 Gemini API 키 발급

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local      # 값 채우기
gcloud auth application-default login   # 또는 FIREBASE_SERVICE_ACCOUNT_KEY 사용
npm run dev
```

http://localhost:3000 접속 → 로그인 → **평가 기준** 만들기 → **평가하기**에서 PDF 업로드.

## 3. Firebase App Hosting 배포

```bash
npm install -g firebase-tools
firebase login
firebase use --add                       # 프로젝트 선택

# 보안 규칙 배포 (클라이언트 직접 접근 차단)
firebase deploy --only firestore:rules,storage

# Gemini API 키를 Secret Manager에 저장하고 App Hosting에 접근 권한 부여
firebase apphosting:secrets:set gemini-api-key

# 백엔드 생성 후 배포
firebase apphosting:backends:create --backend worksheet-grader
firebase deploy --only apphosting
```

GitHub 저장소를 연결하면 콘솔(App Hosting)에서 push 시 자동 배포도 할 수 있습니다.

배포 후 할 일
- Authentication → 설정 → **승인된 도메인**에 App Hosting 도메인(`*.hosted.app`)이 있는지 확인하고 없으면 추가
- 필요하면 `apphosting.yaml`의 `ALLOWED_TEACHER_EMAILS`에 교사 이메일 입력 후 재배포

웹 앱 설정값(`NEXT_PUBLIC_FIREBASE_*`)과 Admin SDK 설정은 App Hosting이 빌드/런타임에 자동 주입하므로(`FIREBASE_WEBAPP_CONFIG`, `FIREBASE_CONFIG`) 따로 넣지 않아도 됩니다. App Hosting 기본 서비스 계정에 Firestore·Storage 권한이 기본 부여되어 있습니다.

## 설정값

| 변수 | 위치 | 설명 |
| --- | --- | --- |
| `GEMINI_API_KEY` | Secret (`gemini-api-key`) | 서버 런타임 전용 |
| `GEMINI_MODEL` | `apphosting.yaml` | 기본 `gemini-3.5-flash`. 사용 가능한 모델 ID로 변경 가능 |
| `ALLOWED_TEACHER_EMAILS` | `apphosting.yaml` | 쉼표 구분, 비우면 로그인한 모든 사용자 허용 |

## 제한 사항

- PDF는 10MB 이하 (Gemini에 inline 데이터로 전송)
- 평가는 요청 안에서 동기로 처리되며 보통 수십 초 걸립니다.
- AI 평가 결과는 참고 자료이며 최종 판단은 교사가 확인해야 합니다.
