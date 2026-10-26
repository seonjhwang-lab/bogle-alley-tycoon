"""shop_bg — 240x128 분식집 내부 (손님 카운터). 게임에서는 y=32에 놓인다.

  y  0..60   타일 벽 (위쪽은 주문 카드에 대부분 가려짐) + 시계·달력·메뉴판
  y 60..96   손님이 서는 영역 뒤 선반 (CRT TV, 라면 봉지, 양념통, 선풍기)
  y 96..128  나무 카운터 (상판 + 앞판). 게임에서 이 띠는 손님 위로 한 번 더 그린다.
"""
import random
from pixel import Canvas

W, H = 240, 128
COUNTER_Y = 96
R = random.Random(11)


def wall(c: Canvas):
    # 아이보리 타일 + 하단 민트 타일 띠 (90년대 분식집 벽)
    for y in range(0, 72):
        for x in range(W):
            col = 'cream'
            if x % 10 == 0 or y % 10 == 0:
                col = 'tan'
            c.px(x, y, col)
    for y in range(72, COUNTER_Y):
        for x in range(W):
            col = 'gray_lt'
            if x % 8 == 0 or (y - 72) % 8 == 0:
                col = 'gray'
            c.px(x, y, col)
    c.hline(0, W - 1, 71, 'brown'); c.hline(0, W - 1, 72, 'brown_dk')


def clock(c: Canvas, cx, cy):
    c.ellipse(cx, cy, 7, 7, 'white')
    c.ellipse(cx, cy, 7, 7, 'brown_dk', fill=False)
    c.vline(int(cx), int(cy) - 5, int(cy), 'black'); c.line(int(cx), int(cy), int(cx) + 3, int(cy) + 2, 'red')
    for a in ((0, -6), (6, 0), (0, 6), (-6, 0)):
        c.px(int(cx) + a[0], int(cy) + a[1], 'slate')


def calendar(c: Canvas, x, y):
    c.rect(x, y, 16, 20, 'white')
    c.rect(x, y, 16, 5, 'red')
    c.px(x + 4, y - 1, 'gray_dk'); c.px(x + 11, y - 1, 'gray_dk')
    for j in range(3):
        for i in range(4):
            c.px(x + 2 + i * 4, y + 8 + j * 4, 'slate' if (i + j) % 5 else 'red')
    c.outline('brown_dk') if False else None


def menu_board(c: Canvas, x, y, w):
    c.rect(x, y, w, 26, 'brown')
    c.rect(x + 1, y + 1, w - 2, 24, 'green_dkr')
    c.hline(x + 1, x + w - 2, y + 1, 'green_dk')
    for k in range(3):
        yy = y + 5 + k * 7
        c.hline(x + 4, x + 4 + 12 + (k * 5) % 9, yy, 'white')
        c.hline(x + w - 14, x + w - 6, yy, 'yellow')
        c.px(x + w - 4, yy, 'white')
    c.rect(x - 1, y + 26, w + 2, 1, 'brown_dk')


def shelf(c: Canvas):
    y = 62
    c.rect(0, y, W, 3, 'brown')
    c.hline(0, W - 1, y, 'tan')
    c.hline(0, W - 1, y + 3, 'brown_dk')
    for x in (12, 118, 226):                       # 선반 받침
        c.line(x, y + 4, x + 4, y + 8, 'brown_dk')


def crt_tv(c: Canvas, x, y):
    c.rect(x, y, 26, 20, 'gray')
    c.rect(x, y, 26, 1, 'gray_lt')
    c.rect(x + 2, y + 2, 17, 14, 'navy')
    c.rect(x + 3, y + 3, 15, 12, 'blue_dk')
    c.hline(x + 4, x + 10, y + 5, 'cyan')                 # 화면 반사
    c.rect(x + 6, y + 9, 8, 4, 'green')                   # 만화 장면
    c.px(x + 8, y + 8, 'yellow')
    for k in range(3):
        c.px(x + 21, y + 4 + k * 4, 'black'); c.px(x + 22, y + 4 + k * 4, 'gray_dk')
    c.rect(x + 4, y + 20, 18, 2, 'slate')
    c.line(x + 9, y, x + 5, y - 6, 'gray_dk'); c.line(x + 15, y, x + 20, y - 7, 'gray_dk')  # 안테나


def radio(c: Canvas, x, y):
    """카세트 라디오 (선반 위)"""
    c.rect(x, y + 4, 22, 12, 'gray')
    c.rect(x, y + 4, 22, 1, 'gray_lt')
    c.ellipse(x + 5, y + 10, 3, 3, 'slate'); c.ellipse(x + 5, y + 10, 1, 1, 'gray_dk')
    c.ellipse(x + 16, y + 10, 3, 3, 'slate'); c.ellipse(x + 16, y + 10, 1, 1, 'gray_dk')
    c.rect(x + 9, y + 7, 4, 3, 'navy'); c.px(x + 10, y + 8, 'orange')
    c.line(x + 3, y + 4, x + 8, y, 'gray_dk'); c.hline(x + 8, x + 14, y, 'gray_dk'); c.line(x + 14, y, x + 19, y + 4, 'gray_dk')


def ramen_packs(c: Canvas, x, y, n):
    cols = [('red', 'yellow'), ('orange', 'red_dk'), ('red', 'white'), ('blue', 'yellow')]
    for i in range(n):
        a, b = cols[i % len(cols)]
        px = x + i * 9
        c.rect(px, y, 8, 10, a)
        c.rect(px, y + 3, 8, 3, b)
        c.vline(px, y, y + 9, 'red_dk' if a == 'red' else 'brown_dk')


def bottles(c: Canvas, x, y):
    for i, col in enumerate(('red', 'green_dk', 'brown', 'gold')):
        px = x + i * 6
        c.rect(px, y + 3, 4, 8, col)
        c.rect(px + 1, y, 2, 3, 'white' if col != 'gold' else 'red')
        c.px(px + 1, y + 5, 'white')


def fan(c: Canvas, x, y):
    c.ellipse(x, y, 8, 8, 'gray_lt')
    c.ellipse(x, y, 8, 8, 'gray', fill=False)
    for k in range(-6, 7, 3):
        c.line(x - 7, y + k, x + 7, y + k, 'gray')
    c.ellipse(x, y, 2, 2, 'blue')
    c.vline(x, y + 8, y + 14, 'gray_dk'); c.rect(x - 4, y + 15, 9, 2, 'blue_dk')


def poster(c: Canvas, x, y):
    c.rect(x, y, 22, 28, 'yellow')
    c.rect(x + 2, y + 2, 18, 12, 'orange')
    c.ellipse(x + 11, y + 9, 5, 3, 'red')
    c.hline(x + 6, x + 16, y + 8, 'cream')
    for k in range(3):
        c.hline(x + 3, x + 18 - k * 3, y + 18 + k * 3, 'brown_dk')


def counter(c: Canvas):
    y = COUNTER_Y
    # 상판
    c.rect(0, y, W, 6, 'tan')
    c.hline(0, W - 1, y, 'cream')
    c.hline(0, W - 1, y + 5, 'brown')
    for x in range(0, W, 23):
        c.hline(x, x + 8, y + 2, 'cream')
    # 앞판 (세로 판자)
    c.rect(0, y + 6, W, H - y - 6, 'brown')
    for x in range(0, W, 12):
        c.vline(x, y + 6, H - 1, 'brown_dk')
        c.vline(x + 1, y + 6, H - 1, 'tan' if x % 24 == 0 else 'brown')
    # 빨간 띠 + 흰 줄
    c.rect(0, y + 14, W, 5, 'red')
    c.hline(0, W - 1, y + 14, 'pink')
    c.hline(0, W - 1, y + 18, 'red_dk')
    for x in range(4, W, 16):
        c.rect(x, y + 16, 6, 1, 'white')
    c.hline(0, W - 1, H - 1, 'plum_dk')


def build():
    c = Canvas(W, H)
    wall(c)
    clock(c, 30, 12)
    calendar(c, 206, 4)
    menu_board(c, 84, 4, 72)
    poster(c, 168, 30)
    poster(c, 46, 32)
    shelf(c)
    radio(c, 8, 46)
    ramen_packs(c, 98, 52, 5)
    bottles(c, 150, 51)
    fan(c, 222, 46)
    counter(c)
    return c


def frames():
    return [('shop_bg', [build()], 1000)]
