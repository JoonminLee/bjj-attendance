
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 배포 시 레포지토리 이름을 base로 설정해야 합니다.
  // 레포지토리 이름이 'oss-system'이라면 '/oss-system/'으로 수정하세요.
  // 여기서는 상대 경로인 './'를 사용하여 범용적으로 작동하게 합니다.
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
