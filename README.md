
# OSS Jiu-Jitsu Management System PoC

체육관 운영을 위한 반응형 통합 관리 시스템 PoC(Proof of Concept)입니다.

## 기능 요약
- **PC 관리자 모드**: 회원 등록, 수강권 관리, 전체 출결 통계
- **태블릿 키오스크 모드**: 카메라 기반(시뮬레이션) 출석 체크, 자동 수강권 차감
- **모바일 회원 모드**: 개인 잔여 수강권 및 출결 이력 조회

## 기술 스택
- React 18
- TypeScript
- Tailwind CSS
- LocalStorage (Serverless Data Persistence)
- Recharts (Data Visualization)

## GitHub Pages 배포 방법

1. **빌드**:
   `npm run build` 명령어를 사용하여 프로젝트를 빌드합니다. (Vite 환경 기준)

2. **배포용 베이스 경로 설정**:
   `vite.config.ts` 파일에서 `base` 속성을 설정해야 할 수 있습니다. (예: `base: '/repo-name/'`)
   *본 앱은 HashRouter를 사용하여 경로 문제를 최소화했습니다.*

3. **gh-pages 패키지 사용**:
   ```bash
   npm install gh-pages --save-dev
   ```

4. **package.json 스크립트 추가**:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

5. **실제 배포**:
   ```bash
   npm run deploy
   ```

6. **GitHub 설정**:
   해당 레포지토리의 `Settings > Pages` 탭에서 소스 브랜치가 `gh-pages`로 설정되어 있는지 확인하세요.

## 사용 주의사항
- 본 앱은 PoC 목적으로 제작되었으며, 실제 데이터베이스 연결 없이 브라우저의 `localStorage`를 사용합니다.
- 브라우저 쿠키/데이터를 삭제하면 모든 등록 데이터가 초기화됩니다.
