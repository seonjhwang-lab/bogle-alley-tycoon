"""peeps — 16x24 손님 5종(초등학생·여고생·체육선생님·여고생 군단·유도부원) + 도둑고양이.

Each human: walk(4) idle(2) eat(2) angry(2). Cat: walk(4) idle(2) steal(2) flee(2).
"""
from pixel import Canvas

W, H = 16, 24

BASE = {
    '.': None, 'K': 'black', 's': 'skin', 'S': 'skin_dk', 'e': 'black', 'm': 'brown_dk',
    'h': 'plum_dk', 'W': 'white', 'g': 'gray_lt', 'R': 'red', 'r': 'red_dk',
}

# ---------------------------------------------------------------- 초등학생
KID_UP = [  # rows 7..20
    "......KKKK......",
    "....KKYYYYKK....",
    "...KYYYYYYYyK...",
    "...KYYYYYYyyK...",
    "..KyyyyyyyyyyK..",
    "...KhsssssshK...",
    "...KssessessK...",
    "...KsssmmsssK...",
    "....KSSSSSSK....",
    "..KBRBBBBBBRBK..",
    "..KBRBBBBBBRBK..",
    "..KsnBBBBBBnsK..",
    "...KPPPPPPPPK...",
    "...KPPPKKPPPK...",
]
KID = dict(up=KID_UP, top=7, leg_top=21, legs_x=(4, 10),
           leg_rows=['skin', 'white', 'slate'], eye_row=13, eyes=(6, 9), mouth_row=14,
           legend={**BASE, 'Y': 'yellow', 'y': 'gold', 'B': 'blue', 'n': 'blue_dk', 'P': 'navy'},
           bowl_row=18)

# ---------------------------------------------------------------- 여고생
GIRL_UP = [  # rows 5..18
    ".....KKKKKK.....",
    "....KhhhhhhK....",
    "...KhhhhhhhhK...",
    "...KhhhhhhhhK...",
    "...KhsssssshK...",
    "...KhsesseshK...",
    "...KhssmmsshK...",
    "..KhKSSSSSSKhK..",
    "..KhWNWRRWNWhK..",
    "..KhWWRWWRWWhK..",
    "..KgWWWWWWWWgK..",
    "..KsNNNNNNNNsK..",
    "...KNnNnNnNnK...",
    "..KNNnNNnNNnNK..",
]
GIRL = dict(up=GIRL_UP, top=5, leg_top=19, legs_x=(5, 9),
            leg_rows=['skin', 'white', 'white', 'black', 'black'], eye_row=10, eyes=(6, 9), mouth_row=11,
            legend={**BASE, 'N': 'navy', 'n': 'slate'}, bowl_row=16)

# ---------------------------------------------------------------- 체육선생님
TEACH_UP = [  # rows 3..16
    "....KKKKKKKK....",
    "...KhhhhhhhhK...",
    "...KhhhhhhhhK...",
    "...KhsssssshK...",
    "...KsKKKKKKsK...",
    "...KssssssssK...",
    "...KsMMMMMMsK...",
    "....KSSSSSSK....",
    "..KWTTTsZTTTWK..",
    "..KWTTyTZTTTWK..",
    "..KWTTTTZTTTWK..",
    "..KWtTTTZTTtWK..",
    "..KsTTTTZTTTsK..",
    "...KttttttttK...",
]
TEACH = dict(up=TEACH_UP, top=3, leg_top=17, legs_x=(4, 9), leg_w=3,
             leg_rows=['T', 'T', 'T', 'T', 'T', 'white', 'white'], eye_row=7, eyes=(6, 9), mouth_row=9,
             legend={**BASE, 'M': 'plum_dk', 'T': 'blue_dk', 't': 'navy', 'y': 'gold', 'Z': 'gray_lt'},
             bowl_row=15, stripe=True)

# ---------------------------------------------------------------- 여고생 (히든 스테이지: 여고생 군단)
HS_UP = [  # rows 4..17
    ".....KKKKKK.....",
    "....KbbbbbbK.RR.",
    "...KbbbbbbbbKRK.",
    "...KbbbbbbbbbK..",
    "...KbsssssbbbK..",
    "...KbsessesbK...",
    "...KbssmmssbK...",
    "....KSSSSSSK....",
    "..KNNWRRRRWNNK..",
    "..KNNWWRRWWNNK..",
    "..KNNNWWWWNNNK..",
    "..KsNNNNNNNNsK..",
    "...KCcCcCcCcK...",
    "..KCcCcCcCcCcK..",
]
HSGIRL = dict(up=HS_UP, top=4, leg_top=18, legs_x=(5, 9),
              leg_rows=['skin', 'skin', 'white', 'white', 'black'], eye_row=9, eyes=(6, 9), mouth_row=10,
              legend={**BASE, 'b': 'brown_dk', 'N': 'navy', 'C': 'slate', 'c': 'red_dk'}, bowl_row=15)

# ---------------------------------------------------------------- 유도부원 (히든 스테이지: 유도부 강습)
JUDO_UP = [  # rows 3..16
    "....KKKKKKKK....",
    "...KhhhhhhhhK...",
    "...KssssssssK...",
    "...KsKKssKKsK...",
    "...KssessessK...",
    "...KsssmmsssK...",
    "....KSSSSSSK....",
    ".KWWWgWssWgWWWK.",
    ".KWWWWgWWgWWWWK.",
    ".KWWWWWgWWWWWWK.",
    ".KsWWWWWWWWWWsK.",
    "..KBBBBBBBBBBK..",
    "..KWWWWBBWWWWK..",
    "..KWWWWBWBWWWK..",
]
JUDO = dict(up=JUDO_UP, top=3, leg_top=17, legs_x=(4, 9), leg_w=3,
            leg_rows=['white', 'white', 'white', 'white', 'skin', 'skin', 'skin'], eye_row=7, eyes=(6, 9), mouth_row=8,
            legend={**BASE, 'W': 'white', 'g': 'gray_lt', 'B': 'black'}, bowl_row=15)

HEART = ["RR.RR", "RWRRR", ".RRR.", "..R.."]
ANGER = [".R.R.", "RR.RR", ".....", "RR.RR", ".R.R."]


def _check(rows):
    for r in rows:
        assert len(r) == 16, (len(r), r)


for spec in (KID, GIRL, TEACH, HSGIRL, JUDO):
    _check(spec['up'])


def legs(c: Canvas, spec, lift_l=0, lift_r=0):
    rows = spec['leg_rows']
    top = spec['leg_top']
    leg_color = {'T': 'blue_dk'}
    for side, (x, lift) in enumerate(zip(spec['legs_x'], (lift_l, lift_r))):
        for j, col in enumerate(rows):
            y = top + j - lift
            col = leg_color.get(col, col)
            lw = spec.get('leg_w', 2)
            for dx in range(lw):
                c.px(x + dx, y, col)
            if spec.get('stripe') and j < len(rows) - 2:
                c.px(x if side == 0 else x + lw - 1, y, 'white')
            c.px(x - 1, y, 'black'); c.px(x + lw, y, 'black')
        # 신발 앞코
        c.px(x - 1 if side == 0 else x + lw, top + len(rows) - 1 - lift, leg_color.get(rows[-1], rows[-1]))


def human(spec, pose: str, k: int) -> Canvas:
    c = Canvas(W, H)
    body = Canvas(W, H)
    body.grid(0, spec['top'], spec['up'], spec['legend'])
    lift_l = lift_r = 0
    bob = 0
    if pose == 'walk':
        lift_l, lift_r = [(1, 0), (0, 0), (0, 1), (0, 0)][k]
        bob = -1 if k in (0, 2) else 0
    elif pose == 'idle':
        bob = k
    elif pose == 'eat':
        bob = k
    elif pose == 'angry':
        lift_l, lift_r = [(1, 0), (0, 1)][k]

    ey, (ex1, ex2), my = spec['eye_row'], spec['eyes'], spec['mouth_row']
    if pose == 'eat':
        # 행복한 눈(^^) + 볼터치 + 그릇
        for ex in (ex1, ex2):
            body.px(ex, ey, 'skin'); body.px(ex, ey - 1 if spec is not TEACH else ey, 'black')
        body.px(ex1 - 1, ey + 1, 'pink'); body.px(ex2 + 1, ey + 1, 'pink')
        body.px(7, my, 'red_dk' if k == 0 else 'brown_dk'); body.px(8, my, 'red_dk' if k == 0 else 'skin')
        br = spec['bowl_row']
        body.hline(5, 10, br, 'red'); body.hline(6, 9, br + 1, 'red_dk')
        body.hline(6, 9, br - 1, 'cream')
        body.line(9, br - 4, 11, br - 1, 'tan')
        if k == 0:
            body.px(7, br - 3, 'white')
    if pose == 'angry':
        if spec is not TEACH:
            body.px(ex1 + 1, ey - 1, 'black'); body.px(ex2 - 1, ey - 1, 'black')
        body.px(ex1 - 1, ey + 1, 'pink'); body.px(ex2 + 1, ey + 1, 'pink')
        body.px(7, my, 'black'); body.px(8, my, 'black')
        if spec is TEACH:
            body.px(6, my, 'black'); body.px(9, my, 'black')
    legs(c, spec, lift_l, lift_r)
    c.paste(body.shifted(0, bob))
    c.outline('black') if False else None

    if pose == 'eat':
        hy = 0 if k == 1 else 1
        c.grid(10, hy, HEART, {'R': 'pink_hot', 'W': 'white'})
    if pose == 'angry':
        c.grid(11, k, ANGER, {'R': 'red'})
        if k == 1:
            c.px(3, spec['top'] - 1, 'gray_lt'); c.px(2, spec['top'] - 2, 'white')
    return c


# ---------------------------------------------------------------- 도둑고양이
CAT_HEAD = [
    ".KK..KK.",
    ".KoKKoK.",
    "KOOOOOOK",
    "KOgOOgOK",
    "KOOcpcOK",
    ".KccccK.",
]
CAT_LEG = {'O': 'orange', 'o': 'rust', 'c': 'cream', 'g': 'green', 'p': 'pink', 'K': 'black',
           'k': 'black', 'f': 'gray_lt', 'W': 'white'}


def cat(pose: str, k: int) -> Canvas:
    c = Canvas(W, H)
    arched = pose == 'flee'
    by = 17 if not arched else 15   # 몸통 윗줄
    hx, hy = 0, 13
    if pose == 'idle' and k == 1:
        hy += 0
    # 몸통 (x 3..13)
    for y in range(by, by + 4):
        for x in range(3, 14):
            col = 'orange'
            if y == by + 3 and 4 <= x <= 11:
                col = 'cream'
            if (x % 3 == 0) and y < by + 2:
                col = 'rust'
            c.px(x, y, col)
    if arched:
        c.hline(5, 11, by - 1, 'orange'); c.hline(7, 9, by - 2, 'orange')
        for x in (5, 7, 9, 11):
            c.px(x, by - 2 if 7 <= x <= 9 else by - 1, 'rust')
    # 다리
    leg_y0 = by + 4
    poses = {
        'walk': [((4, 0), (6, 1), (10, 1), (12, 0)), ((4, 1), (6, 0), (10, 0), (12, 1)),
                 ((4, 0), (6, 1), (10, 1), (12, 0)), ((4, 1), (6, 0), (10, 0), (12, 1))],
    }
    leg_set = poses['walk'][k] if pose == 'walk' else ((4, 0), (6, 0), (10, 0), (12, 0))
    for (lx, lift) in leg_set:
        for y in range(leg_y0, 23 - lift):
            c.px(lx, y, 'orange')
        c.px(lx, 23 - lift, 'cream')
    # 꼬리
    sway = [0, 1][k % 2] if pose in ('idle', 'walk') else 0
    if arched:
        c.vline(14, by - 5, by + 1, 'orange'); c.px(14, by - 6, 'rust'); c.px(15, by - 6, 'orange')
        c.px(13, by - 5, 'orange'); c.px(15, by - 4, 'orange')  # 털 바짝
    else:
        c.px(14, by + 1, 'orange'); c.px(14, by, 'orange')
        c.vline(15 - sway, by - 4, by - 1, 'orange')
        c.px(15 - sway, by - 5, 'rust')
    # 머리
    hy = by - 4 - (1 if arched else 0)
    c.grid(hx, hy, CAT_HEAD, CAT_LEG)
    if pose == 'steal':
        # 입에 문 생선
        fy = hy + 5
        c.hline(0, 3, fy, 'gray_lt'); c.px(0, fy - 1, 'gray'); c.px(0, fy + 1, 'gray')
        c.px(3, fy, 'gray'); c.px(4, fy, 'gray_lt')
        c.px(4 + k, hy - 2, 'yellow'); c.px(4 + k, hy - 4, 'yellow')  # 반짝
    if pose == 'flee':
        # 쉭! 하악질 - 눈 세모, 입 벌림, 느낌표
        c.px(2, hy + 3, 'yellow'); c.px(5, hy + 3, 'yellow')
        c.px(3, hy + 4, 'red_dk'); c.px(4, hy + 4, 'red_dk')
        ex = 7 + k
        c.vline(ex, 0 + k, 3 + k, 'red'); c.px(ex, 5 + k, 'red')
    out = c.copy()
    # 몸 외곽선 (머리 grid는 자체 외곽선)
    sil = Canvas(W, H)
    sil.paste(c)
    sil.outline('black')
    final = Canvas(W, H)
    final.paste(sil)
    final.paste(out)
    return final


def frames():
    out = []
    for key, spec in (('kid', KID), ('girl', GIRL), ('teacher', TEACH), ('hsgirl', HSGIRL), ('judo', JUDO)):
        out.append((f'{key}_walk', [human(spec, 'walk', k) for k in range(4)], 140))
        out.append((f'{key}_idle', [human(spec, 'idle', k) for k in range(2)], 450))
        out.append((f'{key}_eat', [human(spec, 'eat', k) for k in range(2)], 220))
        out.append((f'{key}_angry', [human(spec, 'angry', k) for k in range(2)], 160))
    out.append(('cat_walk', [cat('walk', k) for k in range(4)], 110))
    out.append(('cat_idle', [cat('idle', k) for k in range(2)], 400))
    out.append(('cat_steal', [cat('steal', k) for k in range(2)], 180))
    out.append(('cat_flee', [cat('flee', k) for k in range(2)], 100))
    return out
