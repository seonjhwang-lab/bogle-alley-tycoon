"""slush_machine — 48x64 추억의 오렌지 슬러시 기계 + 컵 게이지 오버레이."""
from pixel import Canvas

W, H = 48, 64


def tank(c: Canvas, phase: int, fast=False):
    # 뚜껑
    c.rect(12, 1, 24, 3, 'red')
    c.hline(12, 35, 1, 'pink')
    c.rect(21, 0, 6, 1, 'red_dk')
    # 투명 돔 통 (x 9..38, y 4..29)
    for y in range(4, 30):
        x0, x1 = 9, 38
        if y < 6:
            x0, x1 = 11, 36
        for x in range(x0, x1 + 1):
            if y < 11:
                col = 'gray_lt' if (x + y) % 7 else 'white'
                c.px(x, y, col) if x in (x0, x1) else None
            else:
                c.px(x, y, 'orange')
        c.px(x0, y, 'gray_lt'); c.px(x1, y, 'gray')
    # 빈 윗부분은 유리 반투명 느낌
    c.rect(10, 5, 28, 6, 'gray_lt')
    c.rect(10, 9, 28, 2, 'gray')
    c.hline(15, 33, 6, 'white')
    # 슬러시 표면 (출렁)
    for x in range(10, 38):
        top = 11 + ((x // 3 + phase) % 2)
        c.vline(x, 11, top, 'gold')
        c.px(x, top + 1, 'gold')
    # 회전 스크류: 대각선 하얀 줄이 위상차로 이동
    step = 2 if fast else 1
    for y in range(14, 29):
        for x in range(12, 36):
            if (x + y + phase * 3 * step) % 8 == 0:
                c.px(x, y, 'gold')
            if (x + y + phase * 3 * step) % 8 == 1 and 17 < x < 31:
                c.px(x, y, 'yellow')
    c.vline(24, 13, 28, 'white')  # 중앙 축
    # 유리 하이라이트
    c.vline(12, 7, 26, 'white')
    c.vline(13, 8, 14, 'white')


def body(c: Canvas, lever_down: bool, warn: str):
    c.rect(6, 30, 36, 30, 'red')
    c.rect(36, 30, 6, 30, 'red_dk')
    c.hline(6, 41, 30, 'pink')
    # 흰 띠 + 로고판
    c.rect(6, 33, 36, 3, 'white')
    c.hline(6, 41, 35, 'gray_lt')
    c.rect(9, 38, 10, 6, 'cream')
    c.ellipse(13.5, 40.5, 2, 2, 'orange')
    c.px(13, 39, 'gold'); c.px(14, 38, 'green')
    # 경고등
    c.px(39, 38, warn); c.px(40, 38, warn); c.px(39, 39, warn); c.px(40, 39, warn)
    # 노즐
    c.rect(21, 37, 6, 5, 'gray')
    c.hline(21, 26, 37, 'gray_lt')
    c.rect(23, 42, 2, 2, 'gray_dk')
    # 레버
    if lever_down:
        c.line(26, 39, 31, 43, 'black')
        c.line(26, 40, 31, 44, 'black')
        c.rect(31, 43, 3, 3, 'white'); c.px(31, 43, 'gray_lt')
    else:
        c.vline(27, 32, 38, 'black'); c.vline(28, 32, 38, 'black')
        c.rect(26, 29, 4, 3, 'white'); c.px(26, 29, 'gray_lt')
    # 컵 받침 공간
    c.rect(12, 45, 24, 13, 'navy')
    c.hline(12, 35, 45, 'black')
    for x in range(13, 35, 2):
        c.px(x, 56, 'gray_dk'); c.px(x, 57, 'slate')
    # 발
    c.rect(7, 60, 4, 3, 'black'); c.rect(37, 60, 4, 3, 'black')


def machine(phase, lever_down=False, warn='green', stream=False, puddle=False):
    c = Canvas(W, H)
    tank(c, phase, fast=lever_down)
    body(c, lever_down, warn)
    if stream:
        c.vline(23, 44, 48, 'orange'); c.vline(24, 44, 48, 'gold')
    if puddle:
        c.hline(13, 34, 55, 'orange'); c.hline(15, 31, 54, 'orange')
        c.px(17, 53, 'gold'); c.px(28, 53, 'gold'); c.px(22, 56, 'orange')
        for (x, y) in ((22, 43), (25, 44), (21, 46)):
            c.px(x, y, 'orange')
    c.outline('black')
    return c


# --- 컵 오버레이 (기계 위에 같은 좌표로 겹침) -------------------------------
CUP_TOP, CUP_BOT = 46, 56


def cup_shape():
    rows = []
    for y in range(CUP_TOP, CUP_BOT + 1):
        k = (y - CUP_TOP) // 4
        rows.append((y, 18 + k, 29 - k))
    return rows


def cup(level: int, overflow=False):
    c = Canvas(W, H)
    rows = cup_shape()
    h = len(rows)
    fill_rows = round(h * level / 5)
    for idx, (y, x0, x1) in enumerate(rows):
        filled = idx >= h - fill_rows
        for x in range(x0, x1 + 1):
            if filled:
                c.px(x, y, 'orange')
            elif x in (x0 + 1,):
                c.px(x, y, 'white')
        if filled and idx == h - fill_rows:
            c.hline(x0, x1, y, 'gold')
        c.px(x0, y, 'gray_lt'); c.px(x1, y, 'gray')
    c.hline(17, 30, CUP_TOP, 'white')  # 컵 입구 테두리
    # 빨대 무늬 띠
    if overflow:
        c.ellipse(23.5, CUP_TOP - 1, 7, 2.5, 'orange')
        c.hline(19, 27, CUP_TOP - 3, 'gold')
        for (x, y0, y1) in ((17, 46, 52), (30, 46, 55), (21, 47, 49)):
            c.vline(x, y0, y1, 'orange')
    c.outline('black')
    return c


def frames():
    return [
        ('slush_idle', [machine(0), machine(1)], 220),
        ('slush_pull', [machine(0, True, 'yellow', stream=True), machine(1, True, 'yellow', stream=True)], 90),
        ('slush_overflow', [machine(0, True, 'pink_hot', puddle=True), machine(0, True, 'red_dk', puddle=True)], 160),
        ('slush_cup', [cup(i) for i in range(6)], 100),
        ('slush_cup_overflow', [cup(5, overflow=True)], 1000),
    ]
