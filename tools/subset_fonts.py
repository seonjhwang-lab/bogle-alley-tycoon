"""Galmuri 폰트를 게임에서 실제 쓰는 글자만 남기도록 서브셋 (용량 ~95% 감소).
src/ 의 모든 문자열 + ASCII + 기호를 수집해 public/fonts/*.woff2 를 다시 만든다."""
import glob, os, re
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chars = set(chr(c) for c in range(0x20, 0x7f))
chars |= set('♥♡→←↑↓·…★☆%×!?~')
for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.ts'), recursive=True):
    chars |= set(open(f, encoding='utf-8').read())
chars = {c for c in chars if c.isprintable() and c not in '\n\r\t'}
text = ''.join(sorted(chars))
print(len(text), 'glyphs')
src = os.path.join(ROOT, 'node_modules', 'galmuri', 'dist')
for name in ('Galmuri7', 'Galmuri9', 'Galmuri11-Bold'):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    font = subset.load_font(os.path.join(src, f'{name}.ttf'), opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(font)
    out = os.path.join(ROOT, 'public', 'fonts', f'{name}.woff2')
    subset.save_font(font, out, opts)
    print(name, os.path.getsize(out), 'bytes')
