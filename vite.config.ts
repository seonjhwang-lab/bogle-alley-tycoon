import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 모드
//  (기본)     dist/         일반 정적 빌드
//  single    dist-single/  index.html 한 파일 (Phaser 포함 모든 에셋 인라인)
//  artifact  dist-artifact/ 한 파일, Phaser는 jsDelivr CDN 전역에서 로드
export default defineConfig(({ mode }) => {
  const inline = mode === 'single' || mode === 'artifact';
  return {
    base: './',
    server: { host: true, port: 5173 },
    resolve: mode === 'artifact'
      ? { alias: { phaser: fileURLToPath(new URL('./src/phaser-global.ts', import.meta.url)) } }
      : {},
    build: {
      target: 'es2020',
      assetsInlineLimit: inline ? 100_000_000 : 4096,
      outDir: mode === 'single' ? 'dist-single' : mode === 'artifact' ? 'dist-artifact' : 'dist',
      chunkSizeWarningLimit: 2000,
    },
    plugins: inline ? [viteSingleFile()] : [],
  };
});
