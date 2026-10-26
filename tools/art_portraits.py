"""portraits — 32x32 스토리 대화창 초상화 (말할 때 입 2프레임)

  por_me       나 (할머니 가게를 맡은 손주, 빨간 두건 + 앞치마)
  por_grandma  할머니 (쪽진 회색 머리, 동그란 안경, 보라 카디건)
  por_hsgirl   여고생 반장 (갈색 포니테일 + 빨간 리본, 남색 교복)
  por_judo     유도부 주장 (짧은 머리, 굵은 눈썹, 흰 도복)
"""
from pixel import Canvas

W = H = 32


def _frame_bg(c: Canvas, col: str):
    c.rect(0, 0, W, H, col)
    for y in range(0, H, 4):
        for x in range((y // 4) % 2 * 2, W, 4):
            c.px(x, y, 'white' if col in ('yellow', 'cream') else 'slate')


def _face(c: Canvas, cx=15.5, cy=15, rx=8, ry=9):
    c.ellipse(cx, cy, rx, ry, 'skin')
    c.ellipse(cx + 3, cy + 2, rx - 4, ry - 3, 'skin')
    c.vline(int(cx + rx), int(cy - 2), int(cy + 4), 'skin_dk')


def _eyes(c: Canvas, y=15, xs=(12, 19), style='dot'):
    for x in xs:
        if style == 'dot':
            c.rect(x, y, 2, 3, 'black'); c.px(x, y, 'white')
        elif style == 'smile':
            c.px(x - 1, y + 1, 'black'); c.px(x, y, 'black'); c.px(x + 1, y, 'black'); c.px(x + 2, y + 1, 'black')
        elif style == 'fierce':
            c.rect(x, y + 1, 2, 2, 'black'); c.px(x, y + 1, 'white')


def _mouth(c: Canvas, k: int, y=21, x=15, color='red_dk'):
    if k == 0:
        c.hline(x - 1, x + 2, y, color)
    else:
        c.rect(x - 1, y - 1, 4, 3, color); c.hline(x, x + 1, y + 1, 'pink')


def me(k: int) -> Canvas:
    c = Canvas(W, H)
    _frame_bg(c, 'gold')
    # 몸: 흰 티 + 빨간 앞치마 끈
    c.rect(5, 25, 22, 7, 'white'); c.rect(8, 25, 3, 7, 'red'); c.rect(21, 25, 3, 7, 'red')
    c.rect(12, 28, 8, 4, 'red')
    _face(c)
    # 머리카락 (검정) + 빨간 두건
    c.ellipse(15.5, 9, 9, 5, 'black')
    c.rect(7, 7, 18, 4, 'red'); c.hline(7, 24, 7, 'pink')
    c.rect(24, 9, 4, 2, 'red'); c.rect(26, 11, 2, 3, 'red_dk')          # 두건 매듭
    c.px(10, 9, 'white'); c.px(16, 8, 'white')                            # 물방울 무늬
    c.vline(7, 11, 16, 'black'); c.vline(24, 11, 15, 'black')
    _eyes(c)
    c.px(10, 19, 'pink'); c.px(21, 19, 'pink')
    _mouth(c, k)
    c.outline('black')
    return c


def grandma(k: int) -> Canvas:
    c = Canvas(W, H)
    _frame_bg(c, 'cream')
    c.rect(5, 25, 22, 7, 'purple_dk'); c.rect(14, 25, 4, 7, 'magenta')    # 보라 카디건
    c.px(15, 27, 'white'); c.px(15, 30, 'white')
    _face(c)
    # 쪽진 회색 머리
    c.ellipse(15.5, 9, 9, 6, 'gray_lt')
    c.ellipse(15.5, 3, 4, 3, 'gray_lt'); c.hline(12, 19, 4, 'gray')     # 쪽
    c.line(19, 1, 23, 4, 'gold')                                           # 비녀
    c.vline(7, 10, 17, 'gray_lt'); c.vline(24, 10, 17, 'gray_lt')
    c.hline(10, 21, 11, 'gray')
    # 동그란 안경 + 웃는 눈
    for x in (11, 18):
        c.ellipse(x + 1.5, 15.5, 3, 2.6, 'gold', fill=False)
    c.hline(15, 16, 15, 'gold')
    _eyes(c, y=15, xs=(12, 19), style='smile')
    c.px(9, 20, 'pink'); c.px(22, 20, 'pink')
    c.px(10, 22, 'skin_dk'); c.px(21, 22, 'skin_dk')                        # 주름
    _mouth(c, k, y=22)
    c.outline('black')
    return c


def hsgirl(k: int) -> Canvas:
    c = Canvas(W, H)
    _frame_bg(c, 'pink')
    c.rect(5, 25, 22, 7, 'navy'); c.rect(12, 25, 8, 3, 'white')
    c.rect(14, 26, 4, 3, 'red'); c.px(13, 28, 'red'); c.px(18, 28, 'red')  # 리본 넥타이
    _face(c)
    c.ellipse(15.5, 9, 9.5, 6, 'brown_dk')
    c.vline(6, 9, 22, 'brown_dk'); c.vline(7, 9, 20, 'brown_dk')
    c.vline(24, 9, 18, 'brown_dk'); c.vline(25, 9, 22, 'brown_dk')
    c.rect(24, 4, 5, 3, 'red'); c.rect(28, 7, 2, 10, 'brown_dk')         # 리본 + 포니테일
    c.hline(10, 14, 11, 'brown'); c.px(9, 12, 'brown_dk')                  # 앞머리
    _eyes(c)
    c.px(11, 14, 'black'); c.px(21, 14, 'black')                            # 속눈썹
    c.px(10, 19, 'pink_hot'); c.px(21, 19, 'pink_hot')
    _mouth(c, k, color='red')
    c.outline('black')
    return c


def judo(k: int) -> Canvas:
    c = Canvas(W, H)
    _frame_bg(c, 'blue')
    c.rect(4, 24, 24, 8, 'white')
    c.line(11, 24, 16, 31, 'gray_lt'); c.line(21, 24, 16, 31, 'gray_lt')  # 도복 깃
    c.rect(4, 30, 24, 2, 'black')                                         # 검은 띠
    _face(c, rx=9)
    c.ellipse(15.5, 8, 9, 4, 'plum_dk')
    c.vline(6, 8, 12, 'plum_dk'); c.vline(25, 8, 12, 'plum_dk')
    c.rect(10, 12, 5, 2, 'black'); c.rect(17, 12, 5, 2, 'black')          # 굵은 눈썹
    _eyes(c, y=15, xs=(12, 19), style='fierce')
    c.px(13, 19, 'skin_dk'); c.px(19, 19, 'skin_dk')
    c.hline(9, 11, 24, 'skin_dk')                                          # 턱
    _mouth(c, k, y=21, color='red_dk')
    if k == 0:
        c.px(23, 6, 'white'); c.px(24, 5, 'white')                          # 땀 반짝
    c.outline('black')
    return c


def frames():
    return [
        ('por_me', [me(0), me(1)], 160),
        ('por_grandma', [grandma(0), grandma(1)], 160),
        ('por_hsgirl', [hsgirl(0), hsgirl(1)], 160),
        ('por_judo', [judo(0), judo(1)], 160),
    ]
