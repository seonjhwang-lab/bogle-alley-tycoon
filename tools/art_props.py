"""props — 32x32 상점 소품 (6프레임 루프 애니메이션)

  arcade_*  문방구 미니 오락기: 화면 속 비행기가 좌우로 움직이며 총알 발사, 적 격추, 마퀴 불빛 순차 점멸
  tv_*      90년대 브라운관 TV: 화면 속 만화 캐릭터가 통통 뛰고 배경색이 바뀜, 볼록 화면 반사광
"""
from pixel import Canvas

W = H = 32

# ---------------------------------------------------------------- 미니 오락기
LIGHTS = ['red', 'yellow', 'green', 'cyan', 'pink_hot']


def arcade(k: int) -> Canvas:
    c = Canvas(W, H)
    x0, x1 = 6, 25                     # 캐비닛 좌우 (폭 20)
    # 몸통
    c.rect(x0, 9, 20, 22, 'blue_dk')
    c.rect(x0, 9, 2, 22, 'blue')
    c.rect(x1 - 1, 9, 2, 22, 'navy')
    # 마퀴 (상단 간판) + 순차 점멸 불빛
    c.rect(x0 - 1, 2, 22, 7, 'yellow')
    c.hline(x0 - 1, x1 + 1, 2, 'white')
    c.hline(x0 - 1, x1 + 1, 8, 'gold')
    for i in range(5):
        on = (i == k % 5) or (k == 5)
        c.rect(x0 + 1 + i * 4, 4, 2, 2, LIGHTS[i] if on else 'brown')
    # 화면 (검정 바탕 12x10)
    sx, sy = x0 + 4, 11
    c.rect(sx - 1, sy - 1, 14, 12, 'gray_dk')
    c.rect(sx, sy, 12, 10, 'black')
    # 별 배경 (아래로 흐름)
    for (bx, by) in ((1, 1), (8, 3), (4, 6), (10, 8)):
        c.px(sx + bx, sy + (by + k) % 10, 'gray_dk')
    # 적 (위쪽, 좌우로 흔들림) — 4프레임째에 격추되어 폭발
    ex = sx + 2 + [0, 2, 4, 6, 4, 2][k]
    if k in (3, 4):
        boom = ['yellow', 'orange'][k - 3]
        c.px(ex, sy + 2, boom); c.px(ex + 1, sy + 1, boom); c.px(ex + 2, sy + 2, boom); c.px(ex + 1, sy + 3, boom)
        if k == 4:
            c.px(ex - 1, sy + 1, 'red'); c.px(ex + 3, sy + 3, 'red')
    else:
        c.px(ex, sy + 1, 'magenta'); c.px(ex + 2, sy + 1, 'magenta')
        c.hline(ex, ex + 2, sy + 2, 'pink'); c.px(ex + 1, sy + 3, 'pink')
    # 플레이어 비행기 (아래쪽, 좌우 이동)
    px = sx + [3, 5, 7, 7, 5, 3][k]
    c.px(px + 1, sy + 7, 'white')
    c.hline(px, px + 2, sy + 8, 'cyan')
    c.px(px, sy + 9, 'blue'); c.px(px + 2, sy + 9, 'blue')
    # 총알 (위로)
    for j in range(2):
        by = sy + 6 - ((k * 2 + j * 3) % 6)
        if by > sy:
            c.px(px + 1, by, 'yellow')
    # 화면 반사광
    c.px(sx, sy, 'slate'); c.px(sx + 1, sy, 'slate')
    # 조작부 (기울어진 판)
    c.rect(x0, 22, 20, 4, 'slate')
    c.hline(x0, x1, 22, 'gray')
    c.vline(x0 + 5, 20, 22, 'black')
    c.rect(x0 + 4, 19, 3, 2, 'red' if k % 2 == 0 else 'red_dk')        # 조이스틱
    c.rect(x0 + 11, 23, 2, 2, 'yellow' if k % 3 else 'white')          # 버튼
    c.rect(x0 + 15, 23, 2, 2, 'pink' if k % 2 else 'pink_hot')
    # 동전 투입구
    c.rect(x0 + 8, 27, 4, 3, 'gray')
    c.vline(x0 + 10, 27, 29, 'black')
    c.px(x0 + 9, 29, 'pink_hot' if k % 2 else 'red')
    # 다리
    c.rect(x0 + 1, 31, 2, 1, 'black'); c.rect(x1 - 2, 31, 2, 1, 'black')
    c.outline('black')
    return c


# ---------------------------------------------------------------- 브라운관 TV
SCREEN_BG = ['blue_dk', 'purple_dk', 'teal_dk', 'blue_dk', 'magenta', 'green_dkr']


def tv(k: int) -> Canvas:
    c = Canvas(W, H)
    x0, y0, w, h = 2, 8, 28, 22
    # 안테나 (토끼귀) — 살짝 흔들림
    sway = [0, 1, 0, -1, 0, 1][k]
    c.line(x0 + 10, y0, x0 + 6 + sway, y0 - 7, 'gray_dk'); c.px(x0 + 6 + sway, y0 - 8, 'red')
    c.line(x0 + 16, y0, x0 + 21 + sway, y0 - 7, 'gray_dk'); c.px(x0 + 21 + sway, y0 - 8, 'red')
    c.rect(x0 + 10, y0 - 1, 7, 2, 'gray')
    # 나무 케이스
    c.rect(x0, y0, w, h, 'brown')
    c.rect(x0, y0, w, 1, 'tan')
    c.rect(x0, y0 + h - 2, w, 2, 'brown_dk')
    c.rect(x0 + w - 7, y0 + 2, 5, h - 5, 'brown_dk')
    # 다이얼 2개 + 스피커 줄
    for j in range(2):
        c.rect(x0 + w - 6, y0 + 3 + j * 5, 3, 3, 'gray_lt'); c.px(x0 + w - 5, y0 + 4 + j * 5, 'black')
    for j in range(3):
        c.hline(x0 + w - 6, x0 + w - 4, y0 + 14 + j * 2, 'black')
    # 볼록 화면 (모서리 둥글게)
    sx, sy, sw, sh = x0 + 2, y0 + 2, 18, 16
    bg = SCREEN_BG[k]
    c.rect(sx, sy, sw, sh, 'gray_dk')
    c.rect(sx + 1, sy + 1, sw - 2, sh - 2, bg)
    for (px, py) in ((sx + 1, sy + 1), (sx + sw - 2, sy + 1), (sx + 1, sy + sh - 2), (sx + sw - 2, sy + sh - 2)):
        c.px(px, py, 'gray_dk')
    # 땅 (화면 아래)
    c.hline(sx + 1, sx + sw - 2, sy + sh - 3, 'green')
    c.hline(sx + 1, sx + sw - 2, sy + sh - 2, 'green_dk')
    # 만화 캐릭터: 동그란 얼굴 + 귀 (통통 점프 + 좌우 이동)
    jump = [0, 2, 4, 5, 4, 2][k]
    cx = sx + 5 + [0, 1, 2, 3, 4, 5][k]
    cy = sy + sh - 8 - jump
    c.ellipse(cx + 1.5, cy + 1.5, 2.6, 2.6, 'yellow')
    c.px(cx - 1, cy - 1, 'yellow'); c.px(cx + 4, cy - 1, 'yellow')      # 귀
    c.px(cx, cy + 1, 'black'); c.px(cx + 3, cy + 1, 'black')             # 눈
    c.px(cx + 1, cy + 3, 'red'); c.px(cx + 2, cy + 3, 'red')             # 입
    c.px(cx - 1, cy + 2, 'pink'); c.px(cx + 4, cy + 2, 'pink')           # 볼
    if jump == 0:
        c.hline(cx - 1, cx + 4, sy + sh - 4, 'green_dkr')                # 그림자
    # 반짝이 별 (배경)
    c.px(sx + 13 - k % 3, sy + 3 + k % 2, 'white')
    # 주사선 + 볼록 반사광
    for yy in range(sy + 2, sy + sh - 1, 3):
        c.px(sx + 2, yy, 'white' if yy == sy + 2 else bg)
    c.hline(sx + 2, sx + 6, sy + 2, 'white')
    c.px(sx + 2, sy + 3, 'white')
    # 받침
    c.rect(x0 + 4, y0 + h, 20, 2, 'slate')
    c.outline('black')
    return c


def frames():
    return [
        ('arcade', [arcade(k) for k in range(6)], 140),
        ('tv', [tv(k) for k in range(6)], 180),
    ]
