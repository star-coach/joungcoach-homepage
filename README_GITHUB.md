# JOUNG COACH Homepage v3.1

이번 버전은 실제 프로필 사진(`assets/images/profile.jpg`)이 적용된 버전입니다.

## GitHub에 올리기
1. 이 폴더 안의 파일과 폴더를 모두 선택합니다.
2. GitHub의 `joungcoach-homepage` 저장소에서 **Add file → Upload files**를 누릅니다.
3. 파일 전체를 끌어다 놓습니다.
4. 기존 파일을 바꾸는 경우 GitHub가 변경사항을 자동 인식합니다.
5. Commit message에 `Homepage v3.1 profile update`라고 적고 **Commit changes**를 누릅니다.

## 프로필 사진
- 현재 파일: `assets/images/profile.jpg`
- 홈페이지 첫 화면에서는 얼굴과 상반신이 자연스럽게 보이도록 자동 크롭됩니다.
- 나중에 사진을 바꿀 때도 새 사진의 파일명을 `profile.jpg`로 맞춰 같은 위치에 덮어쓰면 됩니다.

## 글/활동 수정
`admin.html`을 열어 내용을 수정한 뒤 `content.js`를 내려받아 기존 파일과 교체합니다.


---

# JOUNG COACH Personal Homepage v3

## 1. 가장 먼저 할 일
1. `index.html`을 더블클릭해 홈페이지를 확인합니다.
2. `admin.html`을 열어 글과 활동을 수정합니다.
3. 사진 파일은 `assets/images` 폴더에 넣습니다.
4. 관리자 화면에서 사진 경로를 `assets/images/파일명.jpg`처럼 적습니다.
5. 수정이 끝나면 `content.js 다운로드`를 눌러 기존 `content.js`를 교체합니다.

> 주의: 관리자 화면은 서버에 데이터를 직접 저장하지 않습니다. 비밀번호가 필요한 진짜 CMS가 아니라, **코드를 몰라도 content.js를 만드는 편집 도구**입니다. GitHub에 올리는 공개 홈페이지에 관리자 비밀번호나 개인 토큰을 넣지 마세요.

## 2. 사진 넣는 법
- 프로필: `assets/images/profile.jpg`
- 강의: `assets/images/lecture-2026-09.jpg`
- 코칭: `assets/images/coaching-2026-09.jpg`
- AI 활동: `assets/images/public-ai-2026-09.jpg`

영문 소문자, 숫자, 하이픈(-) 중심의 파일명을 권장합니다.

### 권장 사진 크기
- 프로필 사진: 세로 4:5, 1200px 이상
- 활동 사진: 가로 16:10 또는 16:9, 1600px 안팎
- JPG/WebP 권장, 한 장당 가능하면 1MB 이하

## 3. GitHub에 처음 올리는 가장 쉬운 방법
1. https://github.com 접속 후 로그인
2. 오른쪽 위 `+` → `New repository`
3. Repository name: `joungcoach-homepage`
4. `Public` 선택
5. README 자동 생성은 체크하지 않아도 됩니다.
6. `Create repository`
7. 새 저장소 화면에서 `uploading an existing file` 선택
8. 이 폴더 안의 파일과 폴더를 **전부** 업로드
   - index.html
   - styles.css
   - app.js
   - content.js
   - admin.html
   - assets 폴더
   - README_GITHUB.md
9. 아래 Commit changes에 `Homepage v3 first upload` 입력
10. `Commit changes` 클릭

## 4. 중요한 점: assets 폴더
GitHub 웹 업로드에서 폴더째 드래그하면 `assets/images/...` 구조가 유지됩니다. 구조를 바꾸면 사진 경로가 깨집니다.

## 5. 홈페이지 글을 수정한 뒤 GitHub에 반영하기
### 글만 바꾼 경우
1. 컴퓨터에서 `admin.html` 실행
2. 글 수정
3. `content.js 다운로드`
4. GitHub 저장소에서 기존 `content.js` 클릭
5. 우측 상단 휴지통으로 지우는 대신, 가장 쉬운 방법은 `Add file` → `Upload files`
6. 새 `content.js`를 끌어다 놓기
7. 같은 파일명으로 덮어쓰기 안내가 나오면 진행
8. `Commit changes`

### 사진도 추가한 경우
1. 새 사진을 `assets/images` 폴더에 넣기
2. 관리자에서 해당 사진 경로 입력
3. 새 `content.js` 다운로드
4. GitHub에서 `assets/images`에 사진 업로드
5. 루트에 새 `content.js` 업로드
6. Commit changes

## 6. Netlify로 공개하기
1. https://app.netlify.com 로그인
2. `Add new project` → `Import an existing project`
3. `GitHub` 선택
4. `joungcoach-homepage` 저장소 선택
5. 정적 HTML이므로 별도 Build command는 비워둡니다.
6. Publish directory도 루트(`.`) 기준으로 배포합니다.
7. Deploy

이후 GitHub에 Commit할 때마다 Netlify가 자동으로 새 버전을 배포합니다.

## 7. 도메인 연결
Netlify의 Domain management에서 보유 도메인을 연결합니다. 기본 도메인을 하나 정하고 다른 도메인은 기본 도메인으로 리디렉션하는 구성이 관리하기 쉽습니다.

## 8. 콘텐츠 운영 원칙
한 달 4개 정도면 충분합니다.
- 1주: Coaching
- 2주: Public Service
- 3주: AI · AX
- 4주: Research

새 글을 억지로 만들기보다 이미 한 강의, 코칭, 연구, 업무개선 경험을 기록하는 방식으로 운영합니다.

## 9. 다음 단계로 확장할 때
현재 v3는 '쉽고 안전한 정적 홈페이지'입니다. 글이 30~50개 이상 쌓이거나 여러 기기에서 바로 작성하고 싶어지면 Supabase/별도 CMS를 붙여 로그인 기반 관리자 페이지로 확장할 수 있습니다.
