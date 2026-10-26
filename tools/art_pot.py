"""pot_modular — 48x48 양은냄비 (6 states + 3 topping overlays)."""
from pixel import Canvas

W = H = 48
CX = 24


def burner(c: Canvas, flame: int | None):
    # 가스레인지 삼발이 + 버너 링
    c.rect(9, 43, 30, 3, 'slate')
    c.hline(9, 38, 43, 'gray_dk')
    c.hline(10, 37, 46, 'navy')
    c.px(8, 44, 'navy'); c.px(39, 44, 'navy')
    for x in (12, 23, 24, 35):
        c.vline(x, 40, 43, 'black')
    if flame is None:
        return
    xs = [13, 17, 21, 26, 30, 34]
    for i, x in enumerate(xs):
        h = 2 + ((i + flame) % 2)
        c.vline(x, 42 - h, 42, 'blue')
        c.px(x, 42 - h, 'cyan')
        c.px(x + 1, 42, 'blue_dk')


def body(c: Canvas, dy=0, scorched=False):
    top, bot = 22 + dy, 39 + dy
    for y in range(top, bot + 1):
        inset = 1 if y >= bot - 1 else 0
        x0, x1 = 8 + inset, 39 - inset
        for x in range(x0, x1 + 1):
            col = 'gold'
            if x <= x0 + 2:
                col = 'yellow'
            elif x >= x1 - 1:
                col = 'brown'
            elif x >= x1 - 4:
                col = 'tan'
            c.px(x, y, col)
    # 말린 테두리 밴드
    c.hline(9, 38, top + 2, 'yellow')
    c.hline(9, 38, top + 3, 'tan')
    # 바닥 그림자
    c.hline(10, 37, bot, 'brown')
    # 양은 찌그러짐 디테일
    for (x, y) in ((15, 29), (16, 30), (27, 32), (28, 33), (21, 27), (33, 28), (13, 35)):
        c.px(x, y + dy, 'tan')
    for (x, y) in ((16, 29), (28, 32), (22, 27)):
        c.px(x, y + dy, 'yellow')
    # 손잡이 (양쪽 귀)
    for hx in (3, 40):
        c.rect(hx, 22 + dy, 5, 2, 'gold')
        c.hline(hx, hx + 4, 22 + dy, 'yellow')
        c.px(hx + (0 if hx < 24 else 4), 24 + dy, 'brown')
    if scorched:
        c.recolor({'gold': 'brown', 'yellow': 'tan', 'tan': 'brown_dk', 'brown': 'plum_dk'},
                  region=(0, 30 + dy, W, H))
        c.recolor({'gold': 'tan', 'yellow': 'gold'}, region=(0, 0, W, 30 + dy))


def rim(c: Canvas, dy=0):
    c.ellipse(23.5, 21 + dy, 17, 4.5, 'yellow')
    c.ellipse(23.5, 21 + dy, 17, 4.5, 'tan', fill=False)
    c.hline(10, 18, 17 + dy, 'white')  # 반사광


def inner(c: Canvas, dy, fill_main, fill_back=None):
    pts = c.ellipse(23.5, 21 + dy, 14.5, 3, fill_main)
    if fill_back:
        ymin = min(p[1] for p in pts)
        for (x, y) in pts:
            if y <= ymin + 1:
                c.px(x, y, fill_back)
    return pts


def finish_outline(c: Canvas, col='brown_dk'):
    c.outline(col)


def make_base(dy=0, flame=None, scorched=False):
    c = Canvas(W, H)
    body(c, dy, scorched)
    rim(c, dy)
    if scorched:
        c.recolor({'yellow': 'tan', 'white': 'gray_lt'})
    pot = c.copy()
    pot.outline('brown_dk')
    out = Canvas(W, H)
    burner(out, flame)
    out.paste(pot)
    return out


def bubbles(c: Canvas, pts, seed, n, big=False, col='white'):
    pts = sorted(pts)
    import random
    r = random.Random(seed)
    for _ in range(n):
        x, y = r.choice(pts)
        if big:
            c.px(x, y - 1, col); c.px(x + 1, y - 1, col)
            c.px(x - 1, y, col); c.px(x + 2, y, col)
            c.px(x, y + 1, col); c.px(x + 1, y + 1, col)
        else:
            c.px(x, y, col)


def frame_empty():
    c = make_base()
    inner(c, 0, 'tan', 'brown')
    return c


def frame_heating(i):
    c = make_base(flame=i)
    pts = inner(c, 0, 'blue', 'blue_dk')
    c.hline(14, 22, 22, 'cyan')
    bubbles(c, pts, 10 + i, 4)
    return c


def frame_boiling(i, gold=True):
    dy = -2 if i == 1 else 0
    c = make_base(dy=dy, flame=i + 2)
    pts = inner(c, dy, 'blue', 'blue_dk')
    c.hline(12, 20, 22 + dy, 'cyan'); c.hline(26, 33, 23 + dy, 'cyan')
    bubbles(c, pts, 40 + i, 4, big=True)
    bubbles(c, pts, 50 + i, 5)
    # 튀는 물방울
    drops = [(12, 13), (35, 12), (20, 10), (29, 11)] if i == 0 else [(10, 10), (37, 9), (23, 7), (31, 8)]
    for (x, y) in drops:
        c.px(x, y + dy, 'cyan'); c.px(x, y + 1 + dy, 'blue')
    if not gold:
        # 골든타임이 지난 '센 불' — 김이 더 많고 테두리 강조 없음
        for (x, y) in ((14, 6), (30, 4), (22, 2)) if i == 0 else ((16, 4), (28, 2), (34, 6)):
            c.px(x, y + dy, 'gray_lt'); c.px(x + 1, y - 1 + dy, 'white')
        return c
    # 노란 테두리 강조 (골든타임)
    c.outline('yellow')
    if i == 1:
        c.outline('gold')
    for (x, y) in ((4, 14), (43, 16)) if i == 0 else ((6, 10), (41, 12)):
        c.px(x, y, 'white'); c.px(x - 1, y, 'yellow'); c.px(x + 1, y, 'yellow')
        c.px(x, y - 1, 'yellow'); c.px(x, y + 1, 'yellow')
    return c


def noodles(c: Canvas, dy, phase):
    for row, y in enumerate((19, 21, 23)):
        for x in range(12, 36):
            if (x + row * 2 + phase) % 6 in (0, 1):
                yy = y + dy + (1 if (x + phase) % 4 < 2 else 0)
                if c.get(x, yy)[:3] in ((0xe4, 0x3b, 0x44), (0xa2, 0x26, 0x33), (0xf7, 0x76, 0x22)):
                    c.px(x, yy, 'cream')


def broth(c: Canvas, i, dy=0, flame=None):
    pts = inner(c, dy, 'red', 'red_dk')
    c.hline(13, 19, 22 + dy, 'orange')
    noodles(c, dy, i)
    bubbles(c, pts, 70 + i, 3, col='orange')
    return pts


def frame_simmering(i):
    c = make_base(flame=i)
    broth(c, i)
    return c


def steam(c: Canvas, i):
    for k, bx in enumerate((15, 24, 32)):
        for y in range(3, 16):
            off = int(((y + i * 2 + k * 3) % 8) / 2)
            off = (0, 1, 1, 0)[off] - 0
            x = bx + off - (1 if (y // 4 + k) % 2 else 0)
            col = 'white' if y > 9 else 'gray_lt'
            if (y + k + i) % 5 != 0:
                c.px(x, y, col)


def frame_ready(i):
    c = make_base(flame=None)
    broth(c, i + 3)
    steam(c, i)
    return c


def frame_burnt(i):
    c = make_base(scorched=True)
    pts = inner(c, 0, 'black', 'plum_dk')
    bubbles(c, pts, 90 + i, 3, col='brown_dk')
    # 검은 연기 뭉게
    puffs = [(16, 12, 3), (26, 8, 4), (33, 13, 3), (21, 4, 2)] if i == 0 else \
            [(17, 10, 3), (27, 6, 4), (32, 11, 3), (23, 2, 2)]
    for (x, y, r) in puffs:
        c.ellipse(x, y, r, r - 0.5, 'gray_dk')
        c.ellipse(x - 0.5, y - 0.5, r - 1, r - 1.5, 'slate')
        c.px(x - 1, y - r + 1, 'gray')
    return c


# --- 토핑 오버레이 (냄비 국물 위 좌표에 맞춤) ----------------------------
def topping_egg():
    c = Canvas(W, H)
    c.ellipse(16.5, 20, 5, 2.5, 'white')
    c.ellipse(16.5, 20, 5, 2.5, 'gray_lt', fill=False)
    c.hline(13, 18, 19, 'white')
    c.ellipse(17, 20, 1.6, 1.2, 'orange')
    c.px(16, 19, 'gold'); c.px(17, 19, 'yellow')
    return c


def topping_scallion():
    c = Canvas(W, H)
    rings = [(29, 18), (32, 20), (27, 21), (34, 22), (30, 23), (24, 18), (21, 23), (36, 19), (12, 22)]
    for (x, y) in rings:
        c.px(x, y, 'green'); c.px(x + 1, y, 'green_dk')
        c.px(x, y + 1, 'green_dk') if (x + y) % 3 == 0 else None
    c.px(30, 18, 'cream'); c.px(33, 20, 'yellow')
    return c


def topping_cheese():
    c = Canvas(W, H)
    # 원근 걸린 치즈 한 장 (평행사변형)
    for j, y in enumerate(range(16, 22)):
        x0 = 23 - j // 2
        c.hline(x0, x0 + 8, y, 'yellow')
    c.hline(23, 31, 16, 'white')
    for j, y in enumerate(range(16, 22)):
        c.px(23 - j // 2 + 8, y, 'gold')
    c.hline(20, 28, 21, 'gold')
    c.vline(21, 22, 23, 'yellow')  # 녹아 흐르는 치즈
    c.px(28, 22, 'yellow')
    return c


def frames():
    """[(tag, [canvas...], duration_ms)]"""
    return [
        ('pot_empty', [frame_empty()], 500),
        ('pot_heating', [frame_heating(0), frame_heating(1)], 220),
        ('pot_boiling_gold', [frame_boiling(0), frame_boiling(1)], 110),
        ('pot_boiling', [frame_boiling(0, False), frame_boiling(1, False)], 90),
        ('pot_simmering', [frame_simmering(0), frame_simmering(1)], 200),
        ('pot_ready', [frame_ready(0), frame_ready(1)], 260),
        ('pot_burnt', [frame_burnt(0), frame_burnt(1)], 220),
        ('pot_topping_egg', [topping_egg()], 1000),
        ('pot_topping_scallion', [topping_scallion()], 1000),
        ('pot_topping_cheese', [topping_cheese()], 1000),
    ]
