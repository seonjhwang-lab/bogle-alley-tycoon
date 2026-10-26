"""Tiny pixel-art canvas helpers (Endesga 32 palette)."""
from __future__ import annotations
import numpy as np
from PIL import Image

# Endesga 32 — https://lospec.com/palette-list/endesga-32
E32 = {
    'rust': 'be4a2f', 'orange_dk': 'd77643', 'cream': 'ead4aa', 'tan': 'e4a672',
    'brown': 'b86f50', 'brown_dk': '733e39', 'plum_dk': '3e2731', 'red_dk': 'a22633',
    'red': 'e43b44', 'orange': 'f77622', 'gold': 'feae34', 'yellow': 'fee761',
    'green': '63c74d', 'green_dk': '3e8948', 'green_dkr': '265c42', 'teal_dk': '193c3e',
    'blue_dk': '124e89', 'blue': '0099db', 'cyan': '2ce8f5', 'white': 'ffffff',
    'gray_lt': 'c0cbdc', 'gray': '8b9bb4', 'gray_dk': '5a6988', 'slate': '3a4466',
    'navy': '262b44', 'black': '181425', 'pink_hot': 'ff0044', 'purple_dk': '68386c',
    'magenta': 'b55088', 'pink': 'f6757a', 'skin': 'e8b796', 'skin_dk': 'c28569',
}
PALETTE_ORDER = list(E32.keys())


def rgba(name: str | None):
    if name is None:
        return (0, 0, 0, 0)
    h = E32[name]
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), dtype=np.uint8)

    # --- primitives -------------------------------------------------------
    def px(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = rgba(c)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return tuple(self.a[y, x])
        return (0, 0, 0, 0)

    def opaque(self, x, y):
        return self.get(x, y)[3] > 0

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def hline(self, x0, x1, y, c):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            self.px(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def ellipse(self, cx, cy, rx, ry, c, fill=True):
        """Ellipse on half-pixel centres allowed (cx may be x.5)."""
        pts = set()
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx = (x + 0.5 - (cx + 0.5)) / max(rx, 0.01)
                dy = (y + 0.5 - (cy + 0.5)) / max(ry, 0.01)
                if dx * dx + dy * dy <= 1.0:
                    pts.add((x, y))
        if fill:
            for (x, y) in pts:
                self.px(x, y, c)
        else:
            for (x, y) in pts:
                if any((x + ox, y + oy) not in pts for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.px(x, y, c)
        return pts

    def grid(self, x0, y0, rows, legend, skip='.'):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == skip or ch == ' ':
                    continue
                self.px(x0 + i, y0 + j, legend[ch])

    def outline(self, c, only_empty=True):
        """1px outer outline around every opaque pixel (4-neighbour)."""
        src = self.a[:, :, 3] > 0
        out = []
        for y in range(self.h):
            for x in range(self.w):
                if src[y, x]:
                    continue
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + ox, y + oy
                    if 0 <= xx < self.w and 0 <= yy < self.h and src[yy, xx]:
                        out.append((x, y)); break
        for x, y in out:
            self.px(x, y, c)

    def recolor(self, mapping: dict, region=None):
        x0, y0, x1, y1 = region or (0, 0, self.w, self.h)
        lut = {rgba(k)[:3]: rgba(v) for k, v in mapping.items()}
        for y in range(y0, y1):
            for x in range(x0, x1):
                p = tuple(self.a[y, x])
                if p[3] and p[:3] in lut:
                    self.a[y, x] = lut[p[:3]]

    def paste(self, other: 'Canvas', ox=0, oy=0):
        for y in range(other.h):
            for x in range(other.w):
                p = other.a[y, x]
                if p[3]:
                    xx, yy = x + ox, y + oy
                    if 0 <= xx < self.w and 0 <= yy < self.h:
                        self.a[yy, xx] = p

    def shifted(self, dx, dy) -> 'Canvas':
        c = Canvas(self.w, self.h)
        c.paste(self, dx, dy)
        return c

    def copy(self) -> 'Canvas':
        c = Canvas(self.w, self.h)
        c.a = self.a.copy()
        return c

    def image(self) -> Image.Image:
        return Image.fromarray(self.a, 'RGBA')
