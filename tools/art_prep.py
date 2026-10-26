"""prep — 56x44 손질대 스테이션: 도마&대파(썰기 4단계), 계란 바구니, 치즈 접시, 싱크대."""
from pixel import Canvas

W, H = 56, 44


# ─── 도마 & 대파 ──────────────────────────────────────────────
def board_base(c: Canvas):
    c.rect(4, 14, 48, 26, 'tan')
    c.rect(4, 14, 48, 2, 'cream')
    c.rect(4, 38, 48, 2, 'brown')
    for (x, y) in ((10, 22), (30, 30), (44, 20), (18, 34)):
        c.hline(x, x + 4, y, 'orange_dk')
    c.ellipse(47, 18, 1.5, 1.5, 'brown_dk')            # 걸이 구멍
    c.outline('brown_dk')


def scallion_whole(c: Canvas, cut_upto: float):
    """대각선으로 놓인 대파. cut_upto(0~1)만큼 오른쪽부터 송송 썰림."""
    pts = []
    for k in range(34):
        x, y = 9 + k, 33 - k // 3
        pts.append((x, y))
    n_cut = int(len(pts) * cut_upto)
    whole = pts[: len(pts) - n_cut]
    for idx, (x, y) in enumerate(whole):
        green = idx > 9
        c.px(x, y, 'green' if green else 'white')
        c.px(x, y + 1, 'green_dk' if green else 'cream')
        c.px(x, y - 1, 'green' if green else 'white')
    if whole:
        c.px(whole[0][0] - 1, whole[0][1], 'cream')     # 뿌리
        c.px(whole[0][0] - 2, whole[0][1] + 1, 'tan')
    # 썰린 조각 (작은 링)
    for i in range(n_cut // 3):
        x = 40 - i * 4 + (i % 2)
        y = 30 - (i % 3) * 3
        c.px(x, y, 'green'); c.px(x + 1, y, 'green_dk'); c.px(x, y + 1, 'cream')


def knife_on_board(c: Canvas, lifted: bool):
    # 칼날 + 손잡이 (오른쪽 위)
    dy = -5 if lifted else 0
    for k in range(14):
        c.px(36 + k, 10 + dy + (k // 7), 'gray_lt')
        c.px(36 + k, 11 + dy + (k // 7), 'white')
        c.px(36 + k, 12 + dy + (k // 7), 'gray')
    c.rect(50, 11 + dy, 6, 3, 'brown_dk'); c.hline(50, 55, 11 + dy, 'brown')


def board(stage: int, lifted=False):
    c = Canvas(W, H)
    board_base(c)
    if stage < 3:
        scallion_whole(c, stage / 3)
    else:
        # 송송 썬 대파 소복이
        import random
        r = random.Random(3)
        for _ in range(26):
            x = r.randint(14, 36); y = r.randint(22, 34)
            c.px(x, y, r.choice(['green', 'green', 'green_dk', 'cream']))
            c.px(x + 1, y, 'green_dk')
        for (x, y) in ((20, 24), (28, 27), (24, 31), (32, 24)):
            c.ellipse(x, y, 1.6, 1.6, 'green'); c.px(x, y, 'cream')
    knife_on_board(c, lifted)
    return c


# ─── 계란 바구니 ──────────────────────────────────────────────
def egg_basket():
    c = Canvas(W, H)
    # 계란 (뒤)
    for (x, y) in ((17, 16), (27, 13), (37, 16), (22, 20), (33, 20)):
        c.ellipse(x, y, 4.5, 5.5, 'white')
        c.ellipse(x + 1, y + 1, 3, 4, 'cream')
        c.ellipse(x - 0.5, y - 0.5, 3.5, 4.5, 'white')
        c.px(int(x) - 2, int(y) - 3, 'white')
    eggs = c.copy()
    eggs.outline('gray')
    c = Canvas(W, H)
    c.paste(eggs)
    # 바구니 (등나무 짜임)
    for y in range(22, 40):
        inset = (y - 22) // 5
        for x in range(6 + inset, 50 - inset):
            col = 'tan' if ((x + y) % 4 < 2) else 'orange_dk'
            if (x - y) % 7 == 0:
                col = 'brown'
            c.px(x, y, col)
    c.rect(4, 21, 48, 3, 'brown'); c.hline(4, 51, 21, 'tan')
    c.line(8, 21, 18, 4, 'brown'); c.line(48, 21, 38, 4, 'brown'); c.hline(18, 38, 4, 'brown')  # 손잡이
    out = Canvas(W, H)
    c2 = c.copy()
    c2.outline('brown_dk')
    out.paste(c2)
    return out


# ─── 치즈 접시 ────────────────────────────────────────────────
def cheese_plate():
    c = Canvas(W, H)
    c.ellipse(27.5, 30, 24, 8, 'white')
    c.ellipse(27.5, 30, 24, 8, 'gray_lt', fill=False)
    c.ellipse(27.5, 29, 18, 5, 'gray_lt')
    c.ellipse(27.5, 28.5, 18, 5, 'white')
    # 슬라이스 치즈 4장 (비닐 포장 끝이 살짝 들림)
    for k in range(4):
        y = 26 - k * 3
        x = 16 + (k % 2) * 2
        for j in range(8):
            c.hline(x + j // 2, x + 22 + j // 2, y - j + 4 - 4, 'yellow')
        c.hline(x, x + 22, y + 1 - 4 + 4, 'gold')
        c.hline(x + 4, x + 26, y - 7 - 4 + 4, 'white')
    tmp = c.copy()
    tmp.outline('brown')
    return tmp


# ─── 싱크대 ──────────────────────────────────────────────────
def sink(dirty: int, wash_frame: int | None = None):
    c = Canvas(W, H)
    # 스테인리스 개수대
    c.rect(2, 14, 52, 28, 'gray')
    c.rect(2, 14, 52, 2, 'white')
    c.rect(6, 18, 44, 20, 'gray_dk')
    c.rect(6, 18, 44, 2, 'slate')
    c.ellipse(28, 34, 2, 1, 'black')                      # 배수구
    # 수도꼭지
    c.rect(40, 2, 4, 14, 'gray_lt'); c.rect(32, 2, 12, 4, 'gray_lt')
    c.hline(32, 43, 2, 'white'); c.rect(32, 6, 3, 3, 'gray')
    c.rect(44, 8, 6, 3, 'blue'); c.rect(36, 10, 5, 3, 'red')
    # 더러운 그릇 더미
    for i in range(min(dirty, 5)):
        x = 10 + (i % 3) * 12
        y = 30 - (i // 3) * 6
        c.ellipse(x + 5, y, 6, 2.5, 'gray_lt')
        c.ellipse(x + 5, y - 0.5, 4, 1.3, 'brown')
        c.hline(x, x + 10, y + 2, 'red_dk')
        c.px(x + 3, y - 1, 'red_dk')
    if wash_frame is not None:
        # 거품 + 물줄기
        c.vline(33, 9, 26, 'cyan'); c.vline(34, 9, 26, 'blue')
        import random
        r = random.Random(20 + wash_frame)
        for _ in range(9):
            x, y = r.randint(9, 46), r.randint(18, 34)
            rad = r.choice([1.5, 2, 2.5])
            c.ellipse(x, y, rad, rad, 'white')
            c.ellipse(x, y, rad, rad, 'cyan', fill=False)
    tmp = c.copy()
    tmp.outline('black')
    return tmp


def frames():
    return [
        ('board_0', [board(0)], 1000),
        ('board_1', [board(1)], 1000),
        ('board_2', [board(2)], 1000),
        ('board_ready', [board(3)], 1000),
        ('board_chop', [board(1, lifted=True)], 1000),
        ('egg_basket', [egg_basket()], 1000),
        ('cheese_plate', [cheese_plate()], 1000),
        ('sink_0', [sink(0)], 1000),
        ('sink_1', [sink(2)], 1000),
        ('sink_2', [sink(5)], 1000),
        ('sink_wash', [sink(2, 0), sink(2, 1)], 150),
    ]
