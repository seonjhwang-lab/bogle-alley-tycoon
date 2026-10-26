"""kitchen_bg — 240x266 조리대 + 손질대. 게임에서는 y=160에 놓인다.

  y   0..170  조리 구역: 왼쪽 가스레인지(화구 2x2), 오른쪽 스테인리스(슬러시 받침, 그릇 선반)
  y 170..266  손질 구역: 나무 도마 작업대 (도마·계란·치즈·싱크 자리)
"""
from pixel import Canvas

W, H = 240, 266
PREP_Y = 170
CELLS = [(4, 2), (66, 2), (4, 86), (66, 86)]   # 화구 셀 (60x84) — constants.ts 와 일치


def stove(c: Canvas):
    # 가스레인지 상판 (짙은 철판)
    c.rect(0, 0, 130, PREP_Y, 'navy')
    for y in range(0, PREP_Y, 2):
        c.hline(0, 129, y, 'slate' if (y // 2) % 3 == 0 else 'navy')
    c.rect(0, 0, 130, 1, 'gray_dk')
    for (cx, cy) in CELLS:
        # 화구 받침 패널
        x0, y0 = cx + 2, cy + 12
        c.rect(x0, y0, 56, 58, 'black')
        c.rect(x0 + 1, y0 + 1, 54, 56, 'slate')
        c.hline(x0 + 1, x0 + 54, y0 + 1, 'gray_dk')
        # 버너 링 (냄비 아래에 살짝 보이도록)
        bx, by = cx + 30, cy + 58
        c.ellipse(bx - 0.5, by, 18, 5, 'gray_dk')
        c.ellipse(bx - 0.5, by, 18, 5, 'black', fill=False)
        c.ellipse(bx - 0.5, by, 11, 3, 'black')
        # 셀 번호 점 (1~4)
        n = CELLS.index((cx, cy)) + 1
        for k in range(n):
            c.px(x0 + 4 + k * 3, y0 + 52, 'gold')
        # 조절 손잡이
        kx, ky = x0 + 48, y0 + 52
        c.ellipse(kx, ky, 2.5, 2.5, 'gray_lt'); c.px(int(kx), int(ky) - 2, 'red')
    c.rect(128, 0, 3, PREP_Y, 'gray')
    c.vline(128, 0, PREP_Y - 1, 'gray_lt')


def steel(c: Canvas):
    x0 = 131
    c.rect(x0, 0, W - x0, PREP_Y, 'gray_lt')
    for x in range(x0, W, 3):
        c.vline(x, 0, PREP_Y - 1, 'gray' if (x // 3) % 4 == 0 else 'gray_lt')
    c.hline(x0, W - 1, 0, 'white')
    # 슬러시 받침대 (나무 상자) — 기계 발이 y≈72 에 놓임
    c.rect(140, 70, 92, 10, 'brown')
    c.hline(140, 231, 70, 'tan'); c.hline(140, 231, 79, 'brown_dk')
    for x in range(146, 230, 14):
        c.vline(x, 71, 78, 'brown_dk')
    # 그릇 선반 (2단)
    sy = 90
    c.rect(138, sy, 96, 76, 'brown_dk')
    c.rect(140, sy + 2, 92, 72, 'plum_dk')
    for k, yy in enumerate((sy + 36, sy + 72)):
        c.rect(138, yy, 96, 4, 'tan')
        c.hline(138, 233, yy, 'cream')
        c.hline(138, 233, yy + 3, 'brown')
    c.rect(138, sy, 96, 3, 'tan'); c.hline(138, 233, sy, 'cream')


def prep(c: Canvas):
    y0 = PREP_Y
    # 스테인리스 립
    c.rect(0, y0, W, 3, 'gray_lt'); c.hline(0, W - 1, y0, 'white'); c.hline(0, W - 1, y0 + 2, 'gray')
    # 원목 작업대 (가로 판재)
    for y in range(y0 + 3, H):
        band = ((y - y0 - 3) // 9) % 2
        for x in range(W):
            col = 'tan' if band == 0 else 'orange_dk'
            if (x * 7 + y * 3) % 53 == 0:
                col = 'brown'
            c.px(x, y, col)
        if (y - y0 - 3) % 9 == 0:
            c.hline(0, W - 1, y, 'brown')
    # 스테이션 자리 매트 (4칸, 58px 간격)
    for i in range(4):
        x = 2 + i * 59
        c.rect(x, y0 + 6, 56, 62, 'brown')
        c.rect(x + 1, y0 + 7, 54, 60, 'brown_dk')
        c.rect(x + 1, y0 + 7, 54, 1, 'brown')
    c.rect(0, H - 4, W, 4, 'brown_dk'); c.hline(0, W - 1, H - 4, 'brown')


def build():
    c = Canvas(W, H)
    stove(c)
    steel(c)
    prep(c)
    return c


def frames():
    return [('kitchen_bg', [build()], 1000)]
