# PICO 웹 (React)

백엔드 API와 연결하는 PICO 웹 프론트엔드입니다.

- 동작 기준: API 명세(`openapi.json`)와 백엔드 서비스 흐름 가이드(`DEMODAY_백엔드_서비스흐름.pdf`, 코드 `2d8b602`). 둘이 다르면 가이드를 따릅니다.
- 화면 기준: 상위 폴더의 `dist/` 프로토타입. 프로토타입과 명세가 다르면 명세를 따릅니다.
- 달라진 흐름, 백엔드·기획 요청 사항, 구현 현황은 [`API_NOTES.md`](API_NOTES.md)에 있습니다.

## 실제 백엔드에 연결

```
npm install
cp .env.example .env.local   # API_PROXY_TARGET=https://pico-dev.duckdns.org (개발 서버)
npm run dev                  # http://localhost:5173 (파일 업로드는 이 주소에서만 허용됨)
```

1. `/dev/api` 화면에서 `GET /api/health`, `GET /api/policies`, `GET /api/platforms` 응답이 오는지 확인합니다.
2. 개발 서버에는 약관 3종·관리자 계정·테스트 도우미가 준비되어 있습니다(`API_NOTES.md` 1-1). 예매처는 관리자 화면에서 등록합니다.
3. 약관이 없는 서버에 붙일 때만 `.env.local`의 `VITE_FALLBACK_*_ID`에 서버의 실제 문서 번호를 넣습니다(임시).
4. 운영팀 작업(요청 정책 검토, 증빙 파일 검토, 도우미 심사, 분쟁 확정, 신고 처리, 후기 숨김, 약관·예매처 등록 등)은 관리자 계정으로 로그인해 `/admin` 화면에서 합니다. 관리자 계정이면 프로필 메뉴에 '관리자 화면'이 보이고, 권한은 서버가 다시 검사합니다(관리자가 아니면 403).
5. PG(가상계좌·매칭권 카드결제·본인인증)와 계좌실명조회가 아직 연동되지 않아 503입니다. 최종 조건을 **직접 거래**로 보내야 끝까지 진행되고, 매칭권·인증은 백엔드가 DB로 넣어 둔 테스트 도우미 계정을 씁니다.
6. 화면 값이 비거나 단계가 이상하면 `/dev/api`에서 응답을 확인합니다. 대부분 응답 필드명 차이이고, 필드 후보는 `src/discovery/agent.ts`, `src/transactions/model.ts`, `src/agent/profile.ts`의 `pick()` 호출에 있습니다.

백엔드 명세가 바뀌면 `openapi.json`을 교체하고 `npm run api:types`로 타입을 다시 생성합니다.

## 구조

```
src/api/           API 클라이언트(client.ts), 토큰(tokens.ts), 약관(policies.ts), PortOne(portone.ts), 응답 필드 찾기(pick.ts), 생성된 타입(schema.d.ts)
src/auth/          로그인 상태, 로그인 필요 화면 보호
src/layout/        공통 셸(헤더·알림·프로필 팝오버·푸터)
src/discovery/     도우미 찾기(카드, 필터, 달력, 검색 API, 좋아요)
src/transactions/  거래 모델·단계 판단(model.ts), 거래 화면 공통 부품(ui.tsx), 부분성공 정산·환불(Settlement.tsx)
src/agent/         도우미 프로필 버전·인증·경력 증빙
src/ui/            공통 부품(아이콘, 모달, 토스트, 페이지 제목, 계정 화면 부품)
src/pages/         화면
src/styles/        프로토타입 CSS 원본(수정은 pc-refinements.css 끝에 주석과 함께)
```
