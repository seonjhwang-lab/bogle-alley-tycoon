# 헤드리스 테스트

```bash
npm i -D puppeteer-core @sparticuz/chromium   # 또는 로컬 Chrome 경로로 executablePath 교체
npm run dev &                                 # http://localhost:5173
node tests/verify.mjs                         # 55개 항목 PASS/FAIL (VP=360x520 로 뷰포트 변경)
node tests/viewport.mjs                       # 5개 뷰포트 좌우 여백 측정 + 스크린샷 (두 번째 인자로 저장 폴더 지정)
node tests/stress.mjs                         # 무작위 연타 + 복구 검증
STAGES=d1,d2,h1 node tests/bot.mjs none 0.8 250   # 자동 플레이 매출 (업그레이드 none|all|props|full, 골든 적중률, 반응 ms)
```
