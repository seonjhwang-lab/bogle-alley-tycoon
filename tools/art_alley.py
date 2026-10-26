"""alley_bg — 180x120 학교 앞 분식점 골목 (쿼터뷰 정면).

Layout (bg 좌표, 게임에서는 y+24):
  y  0..58  건물 파사드 (좌: 문방구, 중앙: 분식점, 우: 이웃집)
  y 58..76  보도블록 (손님 줄서는 곳)
  y 76..120 아스팔트 + 어린이보호구역 빨간 노면
Slots: 오락기 x4..30 (바닥 y72), 파라솔 x138..176 (바닥 y74)
"""
import random
from pixel import Canvas

W, H = 180, 120
R = random.Random(7)

BUN = [".X.....X.", ".XXXXXXX.", ".X.....X.", ".XXXXXXX.", ".........",
       "XXXXXXXXX", "....X....", ".X.......", ".X.......", ".XXXXXXX."]
SIK = ["..X....X.", "..X....X.", ".X.X...X.", "X...X..X.", ".......X.",
       ".........", "XXXXXXXX.", ".......X.", ".......X.", ".......X."]
# 작은 간판 글자 '문구' (문방구)
MUN = ["XXXXX", "X...X", "XXXXX", ".....", "XXXXX", "..X..", "X....", "XXXXX"]
GU = ["XXXX.", "...X.", "...X.", ".....", "XXXXX", "..X..", "..X..", "....."]


def glyph(c, x, y, rows, col, bold=False, shadow=None):
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == 'X':
                if shadow:
                    c.px(x + i + 1, y + j + 1, shadow)
                    if bold:
                        c.px(x + i + 2, y + j + 1, shadow)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == 'X':
                c.px(x + i, y + j, col)
                if bold:
                    c.px(x + i + 1, y + j, col)


def sky(c):
    for y in range(0, 12):
        c.hline(0, W - 1, y, 'cyan' if y > 7 else 'blue')
    for (x, y) in ((6, 4), (148, 5)):
        c.ellipse(x + 6, y + 2, 7, 2, 'gray_lt')
        c.ellipse(x + 4, y + 1, 3.5, 2.5, 'white'); c.ellipse(x + 9, y, 4, 3, 'white')
        c.ellipse(x + 13, y + 2, 3, 2, 'white')


def left_shop(c):  # 문방구
    c.rect(0, 10, 44, 48, 'gray_lt')
    for y in range(12, 58, 4):
        c.hline(0, 43, y, 'gray')
    c.rect(0, 10, 44, 2, 'gray_dk')
    c.rect(2, 14, 38, 9, 'blue_dk')
    c.hline(2, 39, 14, 'blue')
    glyph(c, 8, 15, MUN, 'yellow'); glyph(c, 15, 15, GU, 'yellow')
    c.ellipse(32, 18.5, 3, 3, 'yellow'); c.px(31, 18, 'black'); c.px(33, 18, 'black')
    # 쇼윈도 (뽑기, 장난감)
    c.rect(3, 27, 36, 22, 'slate')
    c.rect(4, 28, 34, 20, 'blue_dk')
    for i, col in enumerate(('red', 'yellow', 'green', 'pink', 'cyan', 'orange')):
        c.ellipse(8 + i * 5, 44, 2, 2, col)
    c.rect(6, 31, 10, 7, 'cream'); c.hline(7, 14, 33, 'red'); c.hline(7, 12, 35, 'slate')
    c.rect(22, 30, 12, 9, 'pink'); c.rect(24, 32, 8, 5, 'white')
    c.vline(4, 28, 47, 'cyan')
    c.rect(2, 49, 40, 2, 'gray_dk')
    # 문방구 앞 빈 매대
    c.rect(2, 51, 40, 7, 'gray_lt')


def right_house(c):
    c.rect(136, 12, 44, 46, 'tan')
    for y in range(14, 58, 3):
        off = 0 if (y // 3) % 2 else 4
        for x in range(136 + off, 180, 8):
            c.vline(x, y, y + 2, 'brown')
        c.hline(136, 179, y, 'brown')
    c.rect(136, 12, 44, 2, 'brown_dk')
    # 창문 + 에어컨 실외기
    c.rect(144, 20, 16, 14, 'white'); c.rect(145, 21, 14, 12, 'blue')
    c.vline(152, 21, 32, 'white'); c.hline(145, 158, 26, 'white')
    c.hline(146, 151, 22, 'cyan')
    c.rect(164, 38, 12, 10, 'gray_lt'); c.ellipse(169.5, 43, 3, 3, 'gray')
    c.ellipse(169.5, 43, 1, 1, 'slate')
    # 철문
    c.rect(140, 38, 18, 20, 'green_dk')
    for x in range(141, 158, 3):
        c.vline(x, 39, 57, 'green_dkr')
    c.px(155, 48, 'yellow')


def main_shop(c):
    x0, x1 = 44, 135
    c.rect(x0, 8, x1 - x0 + 1, 50, 'cream')
    for y in range(10, 58, 4):
        c.hline(x0, x1, y, 'tan')
        off = 0 if (y // 4) % 2 else 5
        for x in range(x0 + off, x1, 10):
            c.vline(x, y, y + 3, 'tan')
    # 간판
    c.rect(x0 + 2, 6, x1 - x0 - 3, 15, 'red')
    c.rect(x0 + 2, 6, x1 - x0 - 3, 1, 'pink')
    c.rect(x0 + 2, 20, x1 - x0 - 3, 1, 'red_dk')
    c.vline(x0 + 2, 6, 20, 'red_dk'); c.vline(x1 - 1, 6, 20, 'red_dk')
    glyph(c, 76, 8, BUN, 'white', bold=True, shadow='red_dk')
    glyph(c, 92, 8, SIK, 'white', bold=True, shadow='red_dk')
    # 간판 양옆 아이콘: 라면 그릇 / 떡꼬치
    c.ellipse(57, 15, 5, 2.5, 'yellow'); c.hline(52, 62, 13, 'gold')
    c.line(55, 9, 58, 13, 'cream'); c.line(57, 9, 60, 13, 'cream')
    for i in range(3):
        c.ellipse(116 + i * 4, 13 - i, 1.5, 1.5, 'orange')
    c.line(114, 16, 126, 9, 'tan')
    # 차양 (빨강/흰 줄무늬, 물결 하단)
    for x in range(x0 - 2, x1 + 3):
        col = 'red' if ((x - x0) // 5) % 2 == 0 else 'white'
        c.vline(x, 21, 28, col)
        scallop = 29 + (1 if ((x - x0) % 5) in (1, 2, 3) else 0)
        c.vline(x, 28, scallop, col)
    c.hline(x0 - 2, x1 + 2, 21, 'red_dk')
    # 가게 앞면
    c.rect(x0 + 2, 31, x1 - x0 - 3, 27, 'brown_dk')
    # 왼쪽 창 (주방 보임 + 김)
    c.rect(48, 33, 38, 16, 'gray_lt')
    c.rect(49, 34, 36, 14, 'slate')
    for i in range(3):
        c.ellipse(55 + i * 11, 44, 3.5, 2, 'gold')
        c.rect(52 + i * 11, 44, 7, 3, 'gold')
        for k in range(3):
            c.px(54 + i * 11 + k, 41 - k, 'white')
    c.hline(49, 84, 34, 'gray')
    # 메뉴판
    c.rect(48, 50, 16, 7, 'cream'); c.rect(66, 50, 20, 7, 'cream')
    for y in (51, 53, 55):
        c.hline(49, 59, y, 'brown_dk'); c.px(62, y, 'red')
        c.hline(67, 80, y, 'brown_dk'); c.px(84, y, 'red')
    # 문
    c.rect(91, 32, 20, 26, 'brown')
    c.rect(93, 34, 7, 22, 'blue'); c.rect(102, 34, 7, 22, 'blue')
    c.vline(94, 35, 50, 'cyan'); c.vline(103, 35, 50, 'cyan')
    c.px(99, 46, 'yellow'); c.px(102, 46, 'yellow')
    c.rect(95, 38, 12, 4, 'white'); c.hline(96, 105, 39, 'red'); c.hline(96, 103, 40, 'slate')
    # 오른쪽 창 + 포스터
    c.rect(114, 33, 19, 18, 'gray_lt'); c.rect(115, 34, 17, 16, 'slate')
    c.rect(117, 36, 13, 12, 'yellow'); c.ellipse(123, 41, 4, 3, 'red')
    c.hline(119, 128, 46, 'red_dk')
    # 카운터 (떡볶이 철판)
    c.rect(112, 51, 22, 7, 'gray')
    c.hline(112, 133, 51, 'gray_lt')
    c.rect(114, 52, 18, 3, 'red_dk'); c.hline(115, 130, 52, 'red')
    for x in (116, 120, 124, 128):
        c.px(x, 53, 'orange')


def pole(c):
    c.rect(38, 0, 4, 74, 'brown_dk')
    c.vline(38, 0, 73, 'brown')
    c.rect(34, 6, 12, 2, 'brown_dk')
    c.px(35, 5, 'gray_lt'); c.px(44, 5, 'gray_lt')
    for x in range(0, W):
        y = 2 + int(((x - 90) / 70.0) ** 2 * 3)
        if 0 <= y < 12:
            c.px(x, y, 'navy')
    c.rect(40, 30, 3, 6, 'gray_lt')  # 전봇대 광고지
    c.px(41, 32, 'red')


def sidewalk(c):
    c.rect(0, 58, W, 18, 'gray_lt')
    for y in range(58, 76, 4):
        c.hline(0, W - 1, y, 'gray')
        off = 0 if (y // 4) % 2 else 4
        for x in range(off, W, 8):
            c.vline(x, y, y + 3, 'gray')
    # 점자블록 (노랑)
    for x in range(0, W, 2):
        c.px(x, 72, 'gold'); c.px(x + 1, 73, 'gold')
    c.rect(0, 74, W, 2, 'gray_dk')  # 연석
    c.hline(0, W - 1, 76, 'slate')


def road(c):
    c.rect(0, 77, W, 43, 'slate')
    for _ in range(260):
        c.px(R.randrange(W), R.randrange(77, 120), R.choice(['navy', 'gray_dk']))
    # 어린이보호구역 빨간 노면
    c.rect(0, 86, W, 26, 'red_dk')
    for _ in range(140):
        c.px(R.randrange(W), R.randrange(86, 112), 'rust')
    # 지그재그 노란 선
    for x in range(W):
        y = 82 + abs((x % 12) - 6) // 2
        c.px(x, y, 'yellow')
    c.hline(0, W - 1, 116, 'yellow'); c.hline(0, W - 1, 117, 'gold')
    # 횡단보도
    for x in range(146, 178, 6):
        c.rect(x, 86, 4, 26, 'white')
    # 노면 정지선 + 서행 마름모
    c.rect(140, 86, 2, 26, 'white')
    for k in range(5):
        c.hline(24 - k * 2, 24 + k * 2, 94 + k, 'white')
        c.hline(24 - k * 2, 24 + k * 2, 104 - k, 'white')
    for k in range(3):
        c.hline(24 - k * 2, 24 + k * 2, 96 + k, 'red_dk')
        c.hline(24 - k * 2, 24 + k * 2, 102 - k, 'red_dk')
    c.hline(16, 32, 99, 'red_dk')


def slot_marker(c, x, y, w, h):
    for i in range(w):
        if (i // 2) % 2 == 0:
            c.px(x + i, y, 'yellow'); c.px(x + i, y + h - 1, 'yellow')
    for j in range(h):
        if (j // 2) % 2 == 0:
            c.px(x, y + j, 'yellow'); c.px(x + w - 1, y + j, 'yellow')
    cx, cy = x + w // 2, y + h // 2
    c.hline(cx - 1, cx + 1, cy, 'yellow'); c.vline(cx, cy - 1, cy + 1, 'yellow')


def build(with_slots=True):
    c = Canvas(W, H)
    sky(c)
    left_shop(c)
    right_house(c)
    main_shop(c)
    sidewalk(c)
    road(c)
    pole(c)
    if with_slots:
        slot_marker(c, 5, 62, 24, 10)    # 오락기 자리
        slot_marker(c, 140, 62, 34, 11)  # 파라솔 자리
    return c


def frames():
    # 0: 기본(슬롯 표시), 1: 저녁 노을 톤 (피버/저녁용)
    day = build()
    eve = day.copy()
    eve.recolor({'blue': 'magenta', 'cyan': 'pink', 'cream': 'tan', 'gray_lt': 'gray', 'slate': 'navy'})
    return [('alley_day', [day], 1000), ('alley_evening', [eve], 1000)]
