"""ui_icons — 16x16 HUD/재료 버튼 아이콘."""
from pixel import Canvas

W = H = 16


def coin(k=0):
    c = Canvas(W, H)
    rx = [6, 4, 1.5, 4][k]
    c.ellipse(7.5, 7.5, rx, 6, 'gold')
    if rx > 2:
        c.ellipse(7.5, 7.5, rx - 1.5, 4.5, 'yellow')
        c.vline(7, 4, 11, 'gold'); c.px(6, 4, 'white')
    c.outline('brown_dk')
    return c


STAR = ["......KK......", ".....KYYK.....", ".....KYYK.....", "....KYYYYK....",
        "KKKKKYYWYKKKKK", "KYYYYYYYWYYYYK", ".KYYYYYYYYYYK.", "..KYYYYYYYYK..",
        "...KYYYYYYK...", "...KYYYYYYK...", "..KYYYKKYYYK..", "..KYYK..KYYK..",
        ".KYK......KYK.", ".KK........KK."]


def star(filled=True):
    c = Canvas(W, H)
    leg = {'K': 'brown_dk', 'Y': 'gold' if filled else 'slate', 'W': 'yellow' if filled else 'gray_dk'}
    c.grid(1, 1, STAR, leg)
    if filled:
        c.px(6, 4, 'yellow'); c.px(6, 5, 'white')
    return c


def sun():
    c = Canvas(W, H)
    for (x0, y0, x1, y1) in ((7, 0, 8, 2), (7, 13, 8, 15), (0, 7, 2, 8), (13, 7, 15, 8)):
        c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 'orange')
    for (x, y) in ((2, 2), (13, 2), (2, 13), (13, 13), (3, 3), (12, 3), (3, 12), (12, 12)):
        c.px(x, y, 'orange')
    c.ellipse(7.5, 7.5, 4, 4, 'gold'); c.ellipse(7, 7, 2.5, 2.5, 'yellow'); c.px(6, 6, 'white')
    return c


def rain():
    c = Canvas(W, H)
    c.ellipse(7.5, 6, 6, 3.5, 'gray_lt'); c.ellipse(5, 4.5, 3, 3, 'white'); c.ellipse(10, 5, 3, 2.5, 'gray_lt')
    c.outline('gray_dk')
    for x in (4, 8, 12):
        c.vline(x, 11, 13, 'blue'); c.px(x - 1, 14, 'cyan')
    return c


def kettle():
    c = Canvas(W, H)
    # 노란 양은 주전자
    c.ellipse(7, 10.5, 5, 4, 'gold')
    c.ellipse(6, 9.5, 2.5, 2, 'yellow')
    c.hline(3, 11, 14, 'tan')
    c.rect(5, 5, 5, 2, 'gold'); c.hline(5, 9, 5, 'yellow')   # 뚜껑
    c.px(7, 4, 'brown')
    c.line(11, 10, 14, 6, 'gold'); c.px(14, 5, 'yellow')     # 주둥이
    c.outline('brown_dk')
    # 손잡이 고리 (외곽선 위에)
    c.line(3, 6, 4, 3, 'black'); c.hline(4, 10, 2, 'black'); c.line(10, 3, 11, 6, 'black')
    c.px(15, 3, 'cyan'); c.px(14, 2, 'white')
    return c


def noodle():
    c = Canvas(W, H)
    # 라면 봉지 + 꼬불면
    c.rect(2, 2, 12, 12, 'red')
    c.rect(2, 2, 12, 2, 'red_dk'); c.rect(2, 12, 12, 2, 'red_dk')
    for y in (5, 7, 9):
        for x in range(4, 12):
            if (x + y) % 3:
                c.px(x, y + (x % 2), 'yellow')
    c.rect(9, 9, 4, 3, 'orange'); c.px(10, 10, 'gold')  # 스프 봉지
    c.px(3, 3, 'pink')
    c.outline('black')
    return c


def egg():
    c = Canvas(W, H)
    c.ellipse(7.5, 8.5, 5, 6, 'white')
    c.ellipse(9, 10, 3, 3.5, 'gray_lt')
    c.ellipse(7.5, 8.5, 5, 6, 'white')
    c.rect(10, 9, 2, 4, 'gray_lt'); c.px(5, 5, 'white')
    c.ellipse(7, 7.5, 4, 5, 'white')
    c.px(5, 4, 'white'); c.px(9, 11, 'gray_lt'); c.px(10, 12, 'gray_lt'); c.px(11, 10, 'gray_lt')
    c.outline('brown_dk')
    return c


def scallion():
    c = Canvas(W, H)
    c.line(2, 13, 12, 3, 'green'); c.line(3, 13, 13, 3, 'green_dk'); c.line(2, 12, 12, 2, 'green')
    c.line(4, 14, 7, 11, 'white'); c.line(3, 14, 6, 11, 'cream')
    for (x, y) in ((11, 11), (13, 13), (9, 13)):
        c.ellipse(x, y, 1.5, 1.5, 'green'); c.px(x, y, 'cream')
    c.outline('green_dkr')
    return c


def cheese():
    c = Canvas(W, H)
    for y in range(4, 13):
        c.hline(2 + (12 - y) // 3, 13, y, 'yellow')
    c.hline(3, 13, 4, 'white')
    c.vline(13, 4, 12, 'gold'); c.hline(2, 13, 12, 'gold')
    for (x, y) in ((6, 7), (10, 9), (8, 11)):
        c.px(x, y, 'gold')
    c.outline('brown')
    return c


def slush():
    c = Canvas(W, H)
    for y in range(5, 15):
        k = (y - 5) // 4
        c.hline(4 + k, 11 - k, y, 'orange')
    c.ellipse(7.5, 4, 4.5, 2, 'orange'); c.hline(5, 9, 3, 'gold')
    c.vline(10, 0, 4, 'red'); c.px(11, 0, 'red')
    c.vline(5, 6, 12, 'gold')
    c.outline('black')
    return c


def shop():
    c = Canvas(W, H)
    c.rect(2, 7, 12, 8, 'cream'); c.rect(6, 10, 4, 5, 'brown')
    for x in range(1, 15):
        c.vline(x, 3, 6, 'red' if (x // 2) % 2 == 0 else 'white')
    c.hline(1, 14, 2, 'red_dk')
    c.rect(11, 0, 5, 5, 'green'); c.hline(12, 14, 2, 'white'); c.vline(13, 1, 3, 'white')
    c.outline('black')
    return c


def heart():
    c = Canvas(W, H)
    c.grid(2, 3, [".RR..RR.", "RRRRRRRR", "RWRRRRRR", "RRRRRRRR", ".RRRRRR.", "..RRRR..", "...RR..."],
           {'R': 'pink_hot', 'W': 'white'})
    c.outline('red_dk')
    return c


def fire(k=0):
    c = Canvas(W, H)
    c.ellipse(7.5, 10, 5, 4.5, 'orange')
    c.line(4, 9, 6 + k, 2, 'orange'); c.line(5, 9, 7 + k, 2, 'orange')
    c.line(10, 9, 11 - k, 4, 'orange'); c.line(9, 9, 10 - k, 4, 'orange')
    c.ellipse(7.5, 11, 3, 2.5, 'gold'); c.ellipse(7.5, 12, 1.5, 1.5, 'yellow')
    c.outline('red_dk')
    return c


def bowl(dirty=False):
    """라면 그릇 (빨간 번개무늬 멜라민)"""
    c = Canvas(W, H)
    c.ellipse(7.5, 7, 7, 2.5, 'cream' if not dirty else 'tan')
    if not dirty:
        c.ellipse(7.5, 7.2, 5.5, 1.6, 'red')
        c.hline(4, 11, 6, 'orange')
        for x in (4, 7, 10):
            c.px(x, 7, 'cream')        # 면발
    else:
        c.ellipse(7.5, 7.2, 5.5, 1.6, 'brown')
        c.px(5, 7, 'red_dk'); c.px(9, 6, 'red_dk'); c.px(11, 7, 'brown_dk')
    for y in range(8, 13):
        half = 7 - (y - 8)
        c.hline(8 - half, 7 + half, y, 'white' if not dirty else 'gray_lt')
    band = 'red' if not dirty else 'red_dk'
    c.hline(1, 14, 9, band)
    for x in range(2, 14, 2):                                   # 번개 무늬 띠
        c.px(x, 10, band)
    c.hline(5, 10, 13, 'gray_lt')
    c.outline('brown_dk')
    if dirty:
        c.px(12, 3, 'gray'); c.px(13, 2, 'gray'); c.px(3, 2, 'gray')
    return c


def trash():
    c = Canvas(W, H)
    c.rect(3, 5, 10, 10, 'gray')
    c.rect(3, 5, 2, 10, 'gray_lt')
    for x in (6, 9):
        c.vline(x, 7, 13, 'gray_dk')
    c.rect(2, 3, 12, 2, 'gray_lt'); c.rect(6, 1, 4, 2, 'gray')
    c.outline('black')
    return c


def hand(press=False):
    """손가락 가이드 👇"""
    c = Canvas(W, H)
    dy = 1 if press else 0
    rows = [
        ".KKKKKKK..",
        "KWWWWWWWK.",
        "KWKWKWKWWK",
        "KWWWWWWWWK",
        "KWWWWWWWWK",
        ".KWWWWWWK.",
        "..KWWKKK..",
        "..KWWK....",
        "..KWWK....",
        "..KWWK....",
        "..KWWK....",
        "...KK.....",
    ]
    c.grid(3, 0 + dy, rows, {'K': 'black', 'W': 'white'})
    c.px(5, 8 + dy, 'skin'); c.px(5, 9 + dy, 'skin')
    if press:
        for (x, y) in ((2, 13), (10, 13), (1, 15), (11, 15), (6, 15)):
            c.px(x, y, 'yellow')
    return c


def arrow(k=0):
    c = Canvas(W, H)
    dy = k
    c.rect(5, 1 + dy, 6, 6, 'yellow')
    for j in range(6):
        c.hline(2 + j, 13 - j, 7 + j + dy, 'yellow')
    c.vline(5, 1 + dy, 6 + dy, 'white')
    c.outline('brown_dk')
    return c


def clock():
    c = Canvas(W, H)
    c.ellipse(7.5, 8, 6, 6, 'white')
    c.ellipse(7.5, 8, 6, 6, 'red', fill=False)
    c.vline(7, 4, 8, 'black'); c.hline(8, 10, 8, 'black')
    c.rect(5, 0, 6, 2, 'red'); c.px(1, 3, 'red'); c.px(14, 3, 'red')
    c.outline('brown_dk')
    return c


def lock():
    c = Canvas(W, H)
    c.rect(3, 7, 10, 8, 'gold')
    c.hline(3, 12, 7, 'yellow')
    c.rect(5, 2, 6, 1, 'gray'); c.vline(4, 3, 6, 'gray'); c.vline(11, 3, 6, 'gray')
    c.rect(7, 9, 2, 3, 'brown_dk')
    c.outline('black')
    return c


def knife():
    c = Canvas(W, H)
    for k in range(9):                                   # 칼날 (대각선)
        c.px(3 + k, 12 - k, 'gray_lt'); c.px(4 + k, 12 - k, 'white'); c.px(3 + k, 13 - k, 'gray')
    c.line(1, 15, 3, 13, 'brown'); c.line(2, 15, 4, 13, 'brown_dk'); c.px(1, 14, 'brown')
    c.outline('black')
    c.px(13, 1, 'yellow'); c.px(14, 2, 'yellow'); c.px(12, 0, 'white')
    return c


def scallion_cut():
    """송송 썬 대파"""
    c = Canvas(W, H)
    rings = [(4, 6), (9, 4), (12, 8), (6, 10), (10, 11), (3, 12), (13, 13)]
    for (x, y) in rings:
        c.ellipse(x, y, 1.6, 1.6, 'green')
        c.px(x, y, 'cream')
    c.outline('green_dkr')
    return c


def sponge():
    c = Canvas(W, H)
    c.rect(2, 7, 12, 6, 'yellow'); c.rect(2, 5, 12, 2, 'green')
    for (x, y) in ((4, 9), (8, 10), (11, 8)):
        c.px(x, y, 'gold')
    c.outline('brown_dk')
    for (x, y, r) in ((4, 3, 1.5), (10, 2, 1.2), (13, 4, 1)):
        c.ellipse(x, y, r, r, 'cyan', fill=False)
    return c


def flame_up():
    """고화력 버너: 파란 불꽃 + 위쪽 화살표"""
    c = Canvas(W, H)
    for i, x in enumerate((3, 6, 9, 12)):
        h = 5 + (i % 2) * 2
        c.vline(x, 14 - h, 14, 'blue'); c.px(x, 14 - h, 'cyan'); c.px(x + 1, 14, 'blue_dk')
    c.hline(1, 14, 15, 'gray_dk')
    c.outline('navy')
    for j in range(3):
        c.hline(12 - j, 12 + j, 1 + j, 'yellow')
    return c


def autowash():
    """자동 설거지 보조: 거품 + 톱니"""
    c = Canvas(W, H)
    c.ellipse(9, 9, 5, 5, 'gray')
    for (x, y) in ((9, 3), (9, 15), (3, 9), (15, 9), (5, 5), (13, 5), (5, 13), (13, 13)):
        c.px(x, y, 'gray')
    c.ellipse(9, 9, 2, 2, 'gray_dk')
    c.outline('black')
    for (x, y, r) in ((3, 3, 2.2), (6, 1.5, 1.3)):
        c.ellipse(x, y, r, r, 'white'); c.ellipse(x, y, r, r, 'cyan', fill=False)
    return c


def bell():
    c = Canvas(W, H)
    c.ellipse(7.5, 9, 5, 4, 'gold')
    c.rect(3, 9, 10, 3, 'gold')
    c.hline(1, 14, 12, 'tan'); c.rect(7, 3, 2, 2, 'gray')
    c.px(5, 7, 'yellow'); c.px(6, 6, 'white')
    c.outline('brown_dk')
    return c



def knob(pressed=False):
    """슬러시 레버 손잡이 (빨간 공 + 은색 축)"""
    c = Canvas(W, H)
    c.rect(6, 12, 4, 4, 'gray_lt')            # 축 (아래로 이어짐)
    c.vline(6, 12, 15, 'white')
    c.ellipse(7.5, 7, 6, 5.5, 'red_dk' if pressed else 'red')
    c.ellipse(6.5, 6, 4, 3.5, 'red' if pressed else 'pink')
    c.px(5, 4, 'white'); c.px(6, 4, 'white'); c.px(5, 5, 'white')
    c.outline('black')
    return c


def tteok_cup():
    """종이컵 떡볶이 (빨간 줄무늬 컵 + 떡 + 이쑤시개)"""
    c = Canvas(W, H)
    for y in range(7, 15):
        k = (y - 7) // 4
        c.hline(3 + k, 12 - k, y, 'white')
    c.hline(3, 12, 9, 'red'); c.hline(4, 11, 12, 'red')
    c.ellipse(7.5, 6, 5, 2.2, 'red')
    for (x, y) in ((5, 5), (8, 4), (10, 6), (6, 7)):
        c.hline(x, x + 1, y, 'cream')
    c.px(9, 6, 'white')
    c.line(9, 4, 12, 0, 'tan'); c.px(12, 0, 'brown')
    c.outline('black')
    return c


def odeng():
    """어묵 꼬치 (지그재그로 접은 어묵 + 나무 꼬챙이)"""
    c = Canvas(W, H)
    c.vline(8, 1, 15, 'tan'); c.vline(7, 13, 15, 'brown')
    for j, x0 in enumerate((4, 6, 4, 6)):
        y = 3 + j * 3
        c.rect(x0, y, 7, 3, 'gold' if j % 2 == 0 else 'tan')
        c.hline(x0, x0 + 6, y, 'yellow' if j % 2 == 0 else 'cream')
    c.outline('brown_dk')
    return c


def stick(done: bool):
    """어묵탕에 꽂힌 꼬치 (위쪽 절반만 보임)"""
    c = Canvas(W, H)
    c.vline(7, 0, 15, 'tan'); c.px(7, 0, 'cream')
    body = 'gold' if done else 'cream'
    edge = 'brown' if done else 'tan'
    for j, x0 in enumerate((5, 6, 5)):
        y = 5 + j * 3
        c.rect(x0, y, 5, 3, body)
        c.hline(x0, x0 + 4, y + 2, edge)
    c.outline('brown_dk' if done else 'brown')
    return c


def ladle():
    c = Canvas(W, H)
    c.line(2, 2, 9, 9, 'gray_lt'); c.line(3, 2, 10, 9, 'gray')
    c.ellipse(11, 11, 3.5, 3, 'gray_lt'); c.ellipse(11, 11.5, 2.2, 1.6, 'red')
    c.outline('black')
    return c


def arcade_icon():
    c = Canvas(W, H)
    c.rect(3, 4, 10, 11, 'blue_dk'); c.rect(3, 1, 10, 3, 'yellow')
    c.rect(5, 5, 6, 5, 'black'); c.px(7, 8, 'cyan'); c.px(8, 6, 'pink')
    c.rect(4, 11, 8, 2, 'slate'); c.px(6, 11, 'red'); c.px(9, 12, 'yellow')
    c.outline('black')
    return c


def tv_icon():
    c = Canvas(W, H)
    c.line(5, 4, 3, 0, 'gray_dk'); c.line(10, 4, 12, 0, 'gray_dk')
    c.rect(1, 4, 14, 10, 'brown'); c.rect(2, 5, 9, 8, 'blue_dk')
    c.px(5, 8, 'yellow'); c.px(6, 8, 'yellow'); c.px(5, 9, 'yellow'); c.px(6, 9, 'yellow'); c.px(3, 6, 'white')
    c.px(12, 6, 'gray_lt'); c.px(12, 9, 'gray_lt')
    c.outline('black')
    return c


def ribbon():
    """여고생 군단 (빨간 리본)"""
    c = Canvas(W, H)
    c.grid(1, 4, ["RR......RR..", "RRRR..RRRR..", "RRRRRRRRRR..", "RRRRRRRRRR..", "RRRR..RRRR..", "RR..RR..RR..",
                  "....RR......", "...RRRR....."], {'R': 'red'})
    c.px(2, 5, 'pink'); c.px(9, 5, 'pink'); c.rect(5, 6, 2, 2, 'red_dk')
    c.outline('black')
    return c


def belt():
    """유도부 (흰 도복 + 검은 띠)"""
    c = Canvas(W, H)
    c.rect(2, 3, 12, 11, 'white'); c.line(5, 3, 8, 7, 'gray_lt'); c.line(11, 3, 8, 7, 'gray_lt')
    c.rect(2, 9, 12, 2, 'black'); c.rect(6, 11, 2, 4, 'black'); c.rect(9, 11, 2, 3, 'black')
    c.outline('slate')
    return c


def trophy():
    c = Canvas(W, H)
    c.rect(4, 2, 8, 6, 'gold'); c.ellipse(7.5, 7, 4, 3, 'gold')
    c.px(2, 3, 'gold'); c.px(2, 4, 'gold'); c.px(13, 3, 'gold'); c.px(13, 4, 'gold')
    c.rect(7, 10, 2, 2, 'gold'); c.rect(4, 12, 8, 3, 'brown')
    c.px(5, 3, 'white'); c.px(5, 4, 'yellow')
    c.outline('brown_dk')
    return c


def flame_fever(k=0):
    """피버 타임 불꽃 (HUD)"""
    c = Canvas(W, H)
    c.ellipse(7.5, 10, 5, 4.5, 'pink_hot')
    c.line(4, 9, 6 + k, 1, 'pink_hot'); c.line(5, 9, 7 + k, 1, 'pink_hot')
    c.line(10, 9, 11 - k, 3, 'orange'); c.line(9, 9, 10 - k, 3, 'orange')
    c.ellipse(7.5, 11, 3, 2.5, 'yellow'); c.ellipse(7.5, 12, 1.5, 1.5, 'white')
    c.outline('red_dk')
    return c


def frames():
    return [
        ('ui_coin', [coin(k) for k in range(4)], 110),
        ('ui_star', [star(True)], 1000), ('ui_star_empty', [star(False)], 1000),
        ('ui_sun', [sun()], 1000), ('ui_rain', [rain()], 1000),
        ('ui_kettle', [kettle()], 1000), ('ui_noodle', [noodle()], 1000),
        ('ui_egg', [egg()], 1000), ('ui_scallion', [scallion()], 1000),
        ('ui_cheese', [cheese()], 1000), ('ui_slush', [slush()], 1000),
        ('ui_shop', [shop()], 1000), ('ui_heart', [heart()], 1000),
        ('ui_fire', [fire(0), fire(1)], 120),
        ('ui_bowl', [bowl()], 1000), ('ui_bowl_dirty', [bowl(True)], 1000),
        ('ui_trash', [trash()], 1000), ('ui_hand', [hand(False), hand(True)], 260),
        ('ui_arrow', [arrow(0), arrow(1)], 180), ('ui_clock', [clock()], 1000),
        ('ui_lock', [lock()], 1000), ('ui_knife', [knife()], 1000),
        ('ui_scallion_cut', [scallion_cut()], 1000), ('ui_sponge', [sponge()], 1000),
        ('ui_flame_up', [flame_up()], 1000), ('ui_autowash', [autowash()], 1000),
        ('ui_bell', [bell()], 1000),
        ('ui_knob', [knob(False), knob(True)], 1000),
        ('ui_tteok', [tteok_cup()], 1000), ('ui_odeng', [odeng()], 1000),
        ('ui_stick_raw', [stick(False)], 1000), ('ui_stick_done', [stick(True)], 1000),
        ('ui_ladle', [ladle()], 1000), ('ui_arcade', [arcade_icon()], 1000), ('ui_tv', [tv_icon()], 1000),
        ('ui_ribbon', [ribbon()], 1000), ('ui_belt', [belt()], 1000), ('ui_trophy', [trophy()], 1000),
        ('ui_fever', [flame_fever(0), flame_fever(1)], 120),
    ]
