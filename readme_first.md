# JOUNG COACH Homepage v4 — Firebase CMS

이 버전부터는 글 1개를 추가할 때 홈페이지 전체 파일을 다시 업로드하지 않습니다.
관리자 페이지(admin.html)에서 저장하면 Firebase Realtime Database에 그 항목만 저장되고, 공개 홈페이지가 실시간으로 읽어 표시합니다.

## 최초 1회 설정

1. Firebase Console > Authentication > Sign-in method > Email/Password 활성화
2. Authentication > Users > 사용자 추가에서 본인 관리자 이메일/비밀번호 1개 생성
3. Realtime Database > Rules에 `database.rules.json` 내용을 반영
4. Storage > Rules에 `storage.rules` 내용을 반영
5. GitHub의 기존 홈페이지 파일을 이 v4 파일로 교체하고 Commit
6. Netlify가 GitHub와 연결되어 있으면 자동 배포됨
7. 배포 주소 뒤에 `/admin.html`로 접속하여 로그인
8. 첫 로그인 후 대시보드에서 `초기 콘텐츠 Firebase에 넣기`를 한 번 클릭

## 이후 운영

- 새 글: 관리자 > 글과 기록 > + 새 글 > 저장
- 새 활동: 관리자 > 활동 > + 새 활동 > 저장
- 연구: 관리자 > 연구에서 추가/수정/삭제
- 프로필: 관리자 > 프로필·철학에서 수정 및 사진 업로드
- 연락처: 관리자 > 연락처

GitHub는 홈페이지 코드가 바뀔 때만 수정합니다. 콘텐츠 추가/수정은 Firebase에서 처리됩니다.

## 중요

- 이 프로젝트는 Firebase `stocky-8fbdc`를 사용하도록 설정되어 있습니다.
- 모든 홈페이지 데이터는 `homepage/` 경로 아래에만 저장되어 기존 앱 데이터와 분리됩니다.
- Firebase Storage가 요금제/버킷 정책 때문에 업로드를 허용하지 않는 경우, 글 텍스트 저장은 정상 동작하고 이미지 업로드만 실패할 수 있습니다.
