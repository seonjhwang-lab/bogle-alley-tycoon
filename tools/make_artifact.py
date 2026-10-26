"""dist-artifact/index.html → artifact/bogle_tycoon.html
claude.ai Artifact 규격: doctype/html/head/body 없이 본문만, Phaser는 jsDelivr에서 로드."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'dist-artifact', 'index.html'), encoding='utf-8').read()
style = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
scripts = re.findall(r'<script type="module"[^>]*>(.*?)</script>', src, re.S)
assert scripts, 'no module script'
page = f'''<title>보글보글 골목 타이쿤</title>
<meta name="theme-color" content="#181425">
<style>
:root {{ --bg: #181425; color-scheme: dark; }}
html, body {{ margin: 0; padding: 0; width: 100vw; height: 100%; height: 100dvh; overflow: hidden; }}
body {{ background: var(--bg); touch-action: none; -webkit-user-select: none; user-select: none; overscroll-behavior: none; }}
/* 좌우는 여백 0 (가로 꽉 채움), 위아래만 노치/홈바 안전 영역 */
#game {{ position: fixed; left: 0; width: 100vw; top: env(safe-area-inset-top, 0px); bottom: env(safe-area-inset-bottom, 0px);
  margin: 0; padding: 0; overflow: hidden; }}
canvas {{ display: block; image-rendering: pixelated; image-rendering: crisp-edges; }}
</style>
<div id="game" role="application" aria-label="보글보글 골목 타이쿤 게임 화면"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js"></script>
<script type="module">{scripts[0]}</script>
'''
os.makedirs(os.path.join(ROOT, 'artifact'), exist_ok=True)
out = os.path.join(ROOT, 'artifact', 'bogle_tycoon.html')
open(out, 'w', encoding='utf-8').write(page)
print(out, len(page.encode()) // 1024, 'KB')
