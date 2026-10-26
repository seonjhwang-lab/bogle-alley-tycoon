"""frontbar — 64x32 전방 매대 (손님 바로 앞 카운터 위)

  griddle         빨간 떡볶이 철판 (빈 판 + 손잡이 + 받침) — 떡볶이 층은 아래 프레임을 같은 좌표에 겹쳐 그림
  tteok_cook      막 붓고 끓이는 중 (묽은 소스, 큰 거품)
  tteok_glossy    윤기 나는 최상급 (반짝이 이동)
  tteok_sticky    졸아붙어 눌어붙기 시작 (진한 갈색 테두리 + 연기 한 줄)
  tteok_burnt     탔다 (검은 덩어리 + 연기)
  odeng_pot       사각 어묵탕 냄비 (육수 물결 2프레임) — 꼬치는 ui_stick_* 아이콘을 겹침

떡볶이 층은 왼쪽→오른쪽으로 4인분이 놓이도록 x 8..55 에 그린다.
게임에서는 남은 인분 수만큼 왼쪽부터 잘라서(crop) 보여 준다.
"""
import random
from pixel import Canvas

W, H = 64, 32
PLATE = (6, 14, 57, 27)          # 철판 안쪽 x0, y0, x1, y1
TTEOK_X0, TTEOK_X1 = 8, 55


def griddle() -> Canvas:
    c = Canvas(W, H)
    x0, y0, x1, y1 = PLATE
    # 받침 (가스 버너 다리)
    c.rect(12, y1 + 2, 4, 3, 'gray_dk'); c.rect(48, y1 + 2, 4, 3, 'gray_dk')
    c.hline(10, 54, y1 + 4, 'black')
    # 손잡이 (양옆)
    c.rect(1, 17, 5, 3, 'gray'); c.hline(1, 5, 17, 'gray_lt')
    c.rect(58, 17, 5, 3, 'gray'); c.hline(58, 62, 17, 'gray_lt')
    # 철판 테두리 (위쪽이 조금 좁은 사다리꼴로 원근감)
    for y in range(y0 - 2, y1 + 3):
        inset = max(0, (y0 + 2 - y)) // 1
        c.hline(x0 - 2 + inset, x1 + 2 - inset, y, 'gray_dk')
    c.hline(x0, x1, y0 - 2, 'gray')
    c.hline(x0 - 2, x1 + 2, y1 + 2, 'black')
    # 바닥면 (검게 그을린 철)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c.px(x, y, 'navy' if (x + y) % 5 else 'slate')
    # 빨간 철판 앞면 띠 (분식집 철판 특유의 빨간 칠)
    c.rect(x0 - 2, y1 + 1, x1 - x0 + 5, 2, 'red')
    c.hline(x0 - 2, x1 + 2, y1 + 1, 'pink')
    c.outline('black')
    return c


def _tteok_layer(sauce: str, sauce_hi: str, tteok: str, tteok_hi: str, k: int, rng_seed: int, crust: str | None = None) -> Canvas:
    c = Canvas(W, H)
    x0, y0, x1, y1 = PLATE
    rng = random.Random(rng_seed)
    # 소스 바다
    for y in range(y0 + 1, y1):
        for x in range(TTEOK_X0, TTEOK_X1 + 1):
            c.px(x, y, sauce)
    if crust:
        c.hline(TTEOK_X0, TTEOK_X1, y0 + 1, crust); c.hline(TTEOK_X0, TTEOK_X1, y1 - 1, crust)
        c.vline(TTEOK_X0, y0 + 1, y1 - 1, crust)
    # 떡 (가로로 누운 원통 4~5px) — 4인분 구역마다 3~4개
    for portion in range(4):
        px0 = TTEOK_X0 + 1 + portion * 12
        for j in range(4):
            tx = px0 + rng.randint(0, 6)
            ty = y0 + 2 + j * 3 + rng.randint(0, 1)
            ln = rng.choice((4, 5))
            c.hline(tx, tx + ln - 1, ty, tteok)
            c.hline(tx, tx + ln - 1, ty + 1, tteok_hi if j % 2 == 0 else tteok)
            c.px(tx + ln - 1, ty + 1, sauce_hi)
        # 어묵 세모 + 파 한 점
        fx = px0 + rng.randint(1, 7)
        fy = y0 + 4 + rng.randint(0, 5)
        c.px(fx, fy, 'tan'); c.hline(fx - 1, fx + 1, fy + 1, 'tan'); c.px(fx, fy + 1, 'brown')
        c.px(px0 + rng.randint(0, 9), y0 + 2 + rng.randint(0, 8), 'green')
    return c


def tteok_cook(k: int) -> Canvas:
    c = _tteok_layer('orange', 'gold', 'cream', 'white', k, 7)
    rng = random.Random(30 + k)
    for _ in range(9):                                   # 큰 거품 (팍팍 터짐)
        x, y = rng.randint(TTEOK_X0 + 1, TTEOK_X1 - 2), rng.randint(PLATE[1] + 2, PLATE[3] - 2)
        c.px(x, y, 'white'); c.px(x + 1, y, 'pink')
    for i in range(3):                                   # 김
        sx = 14 + i * 16 + k * 2
        c.px(sx, 9 - k, 'white'); c.px(sx + 1, 7 - k, 'gray_lt'); c.px(sx, 5 - k, 'gray_lt')
    return c


def tteok_glossy(k: int) -> Canvas:
    c = _tteok_layer('red', 'pink', 'cream', 'white', k, 7)
    # 이동하는 반짝이 (윤기)
    for i in range(6):
        x = TTEOK_X0 + 3 + ((i * 9 + k * 5) % (TTEOK_X1 - TTEOK_X0 - 4))
        y = PLATE[1] + 2 + (i * 3) % 10
        c.px(x, y, 'white')
        if (i + k) % 2:
            c.px(x + 1, y, 'pink')
    # 잔잔한 보글거림
    for i in range(4):
        x = TTEOK_X0 + 5 + i * 12 + k * 2
        c.px(x, PLATE[3] - 2, 'pink_hot')
    for i in range(2):                                   # 얇은 김
        sx = 20 + i * 22 + k
        c.px(sx, 10, 'gray_lt'); c.px(sx - 1, 8, 'white')
    return c


def tteok_sticky(k: int) -> Canvas:
    c = _tteok_layer('red_dk', 'red', 'tan', 'cream', k, 7, crust='brown_dk')
    # 눌어붙은 갈색 반점
    rng = random.Random(55)
    for _ in range(14):
        x, y = rng.randint(TTEOK_X0, TTEOK_X1), rng.randint(PLATE[1] + 1, PLATE[3] - 1)
        c.px(x, y, 'brown_dk' if (x + k) % 3 else 'plum_dk')
    # 연기 한 줄 + 경고 느낌의 노란 점
    for i in range(3):
        sx = 18 + i * 14
        c.px(sx + k, 10, 'gray'); c.px(sx - 1 + k, 8, 'gray'); c.px(sx + 1 - k, 6, 'gray_lt')
    return c


def tteok_burnt(k: int) -> Canvas:
    c = _tteok_layer('plum_dk', 'brown_dk', 'brown_dk', 'black', k, 7, crust='black')
    rng = random.Random(77)
    for _ in range(26):
        x, y = rng.randint(TTEOK_X0, TTEOK_X1), rng.randint(PLATE[1] + 1, PLATE[3] - 1)
        c.px(x, y, 'black')
    for i in range(4):                                   # 시커먼 연기
        sx = 12 + i * 13
        for j in range(4):
            c.px(sx + ((j + k) % 2), 11 - j * 2 - k, 'gray_dk' if j < 2 else 'gray')
    return c


def odeng_pot(k: int) -> Canvas:
    c = Canvas(W, H)
    x0, y0, x1, y1 = 12, 13, 51, 28
    # 받침
    c.rect(16, y1 + 1, 4, 3, 'gray_dk'); c.rect(43, y1 + 1, 4, 3, 'gray_dk')
    # 사각 냄비 (스테인리스) — 위 테두리는 밝게
    c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 'gray')
    c.rect(x0, y0 + 4, 2, y1 - y0 - 3, 'gray_lt')
    c.rect(x1 - 1, y0 + 4, 2, y1 - y0 - 3, 'gray_dk')
    c.hline(x0 - 1, x1 + 1, y0, 'white'); c.hline(x0 - 1, x1 + 1, y0 + 1, 'gray_lt')
    # 칸막이 (사각 어묵통 특유의 격자)
    c.rect(x0 + 2, y0 + 2, x1 - x0 - 3, 4, 'tan')        # 육수 면 (위에서 보이는 부분)
    for x in range(x0 + 2, x1 - 1):
        if (x + k * 2) % 6 < 2:
            c.px(x, y0 + 3, 'cream')                     # 물결
        if (x + k * 3) % 9 == 0:
            c.px(x, y0 + 4, 'gold')
    c.vline(x0 + 14, y0 + 2, y0 + 5, 'gray_dk'); c.vline(x0 + 27, y0 + 2, y0 + 5, 'gray_dk')
    # 앞면 글씨 띠 (빨간 '어묵' 스티커 느낌)
    c.rect(x0 + 8, y0 + 9, 24, 7, 'red')
    c.hline(x0 + 8, x0 + 31, y0 + 9, 'pink')
    for i in range(3):
        c.rect(x0 + 11 + i * 7, y0 + 11, 4, 3, 'white')
    c.outline('black')
    # 김 (2프레임 흔들림)
    for i in range(3):
        sx = x0 + 6 + i * 13
        c.px(sx + k, y0 - 3, 'white'); c.px(sx + 1 - k, y0 - 5, 'gray_lt'); c.px(sx + k, y0 - 7, 'gray_lt')
    return c


def frames():
    return [
        ('griddle', [griddle()], 1000),
        ('tteok_cook', [tteok_cook(k) for k in range(2)], 160),
        ('tteok_glossy', [tteok_glossy(k) for k in range(2)], 260),
        ('tteok_sticky', [tteok_sticky(k) for k in range(2)], 220),
        ('tteok_burnt', [tteok_burnt(k) for k in range(2)], 200),
        ('odeng_pot', [odeng_pot(k) for k in range(2)], 300),
    ]
