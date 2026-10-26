"""Generate all sprite frames, pack Aseprite-format atlases, and write previews.

Outputs
  tools/out/<asset>/f_###.png        per-frame PNGs (Aseprite import source)
  tools/out/<asset>/tags.json        tag → [from,to] (1-based) + durations
  public/assets/sprites/<asset>.png  horizontal sheet (same layout as Aseprite --sheet-type horizontal)
  public/assets/sprites/<asset>.json Aseprite JSON (hash) with meta.frameTags
  tools/preview/<asset>.png          8x/4x contact sheet for eyeballing
"""
from __future__ import annotations
import json, os, sys, importlib
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

ASSETS = {
    'pot_modular': ('art_pot', 48, 48),
    'slush_machine': ('art_slush', 48, 64),
    'peeps': ('art_peeps', 16, 24),
    'ui_icons': ('art_ui', 16, 16),
    'ui_mini': ('art_ui_mini', 8, 8),
    'shop_bg': ('art_shop', 240, 128),
    'kitchen_bg': ('art_kitchen', 240, 266),
    'prep': ('art_prep', 56, 44),
    'frontbar': ('art_front', 64, 32),
    'props': ('art_props', 32, 32),
    'portraits': ('art_portraits', 32, 32),
}


def build(name):
    mod_name, w, h = ASSETS[name]
    mod = importlib.import_module(mod_name)
    groups = mod.frames()
    flat, tags = [], []
    for tag, canvases, dur in groups:
        start = len(flat)
        for cv in canvases:
            assert (cv.w, cv.h) == (w, h), f'{name}/{tag} wrong size {cv.w}x{cv.h}'
            flat.append((cv, dur))
        tags.append({'name': tag, 'from': start, 'to': len(flat) - 1, 'direction': 'forward'})

    out_dir = os.path.join(HERE, 'out', name)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    for i, (cv, _) in enumerate(flat):
        cv.image().save(os.path.join(out_dir, f'f_{i + 1:03d}.png'))
    with open(os.path.join(out_dir, 'tags.json'), 'w') as fp:
        json.dump({'w': w, 'h': h, 'durations': [d for _, d in flat], 'tags': tags}, fp, ensure_ascii=False)

    sheet = Image.new('RGBA', (w * len(flat), h), (0, 0, 0, 0))
    frames_json = {}
    for i, (cv, dur) in enumerate(flat):
        sheet.paste(cv.image(), (i * w, 0))
        frames_json[str(i)] = {
            'frame': {'x': i * w, 'y': 0, 'w': w, 'h': h},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h},
            'sourceSize': {'w': w, 'h': h},
            'duration': dur,
        }
    sprites_dir = os.path.join(ROOT, 'public', 'assets', 'sprites')
    os.makedirs(sprites_dir, exist_ok=True)
    sheet.save(os.path.join(sprites_dir, f'{name}.png'))
    meta = {
        'app': 'https://www.aseprite.org/', 'version': '1.3.18.5',
        'image': f'{name}.png', 'format': 'RGBA8888',
        'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1',
        'frameTags': [dict(t, color='#000000ff') for t in tags],
        'layers': [{'name': 'art', 'opacity': 255, 'blendMode': 'normal'}],
        'slices': [],
    }
    with open(os.path.join(sprites_dir, f'{name}.json'), 'w') as fp:
        json.dump({'frames': frames_json, 'meta': meta}, fp, ensure_ascii=False, indent=1)

    # preview contact sheet
    scale = 8 if w <= 24 else (6 if w <= 48 else (5 if w <= 56 else (3 if w <= 180 else 2)))
    cols = min(len(flat), max(1, 720 // (w * scale + 4)))
    rows = (len(flat) + cols - 1) // cols
    pv = Image.new('RGBA', (cols * (w * scale + 4) + 4, rows * (h * scale + 14) + 4), (40, 40, 52, 255))
    d = ImageDraw.Draw(pv)
    tag_of = {}
    for t in tags:
        for k in range(t['from'], t['to'] + 1):
            tag_of[k] = t['name']
    for i, (cv, _) in enumerate(flat):
        cx, cy = 4 + (i % cols) * (w * scale + 4), 4 + (i // cols) * (h * scale + 14)
        bg = Image.new('RGBA', (w * scale, h * scale), (120, 140, 120, 255))
        img = cv.image().resize((w * scale, h * scale), Image.NEAREST)
        bg.alpha_composite(img)
        pv.paste(bg, (cx, cy + 10))
        d.text((cx, cy - 1), f'{i + 1}:{tag_of[i]}'[:28], fill=(255, 255, 255, 255))
    os.makedirs(os.path.join(HERE, 'preview'), exist_ok=True)
    pv.save(os.path.join(HERE, 'preview', f'{name}.png'))
    return len(flat), tags


if __name__ == '__main__':
    names = sys.argv[1:] or list(ASSETS)
    for n in names:
        count, tags = build(n)
        print(f'{n}: {count} frames, tags={[t["name"] for t in tags]}')
