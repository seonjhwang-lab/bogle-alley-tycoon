"""ui_mini — 8x8 주문 카드용 미니 아이콘."""
from pixel import Canvas

LEG = {'K': 'black', 'W': 'white', 'g': 'gray_lt', 'Y': 'yellow', 'y': 'gold', 'O': 'orange',
       'G': 'green', 'd': 'green_dk', 'R': 'red', 'r': 'red_dk', 'c': 'cream', 'B': 'brown_dk', 'P': 'pink_hot'}

ICONS = {
    'mini_ramen': ["........", ".c.c.c..", "KKKKKKKK", "KRcRcRRK", ".KrrrrK.", "..KKKK..", "........", "........"],
    'mini_egg':   ["........", "..KKKK..", ".KWWWWK.", "KWWOOWWK", "KWWOyWgK", ".KWWWgK.", "..KKKK..", "........"],
    'mini_scallion': ["........", ".KK..KK.", "KGcK.KdK", ".KK.KK..", "...KGcK.", "KK..KK..", "dK......", "K......."],
    'mini_cheese': ["........", "..KKKKKK", ".KWYYYYK", ".KYYyYYK", "KYYYYYyK", "KyyyyyyK", "KKKKKKK.", "........"],
    'mini_slush': [".....R..", ".KKKKRK.", "KOOOOOOK", ".KOyOOK.", ".KOOOOK.", "..KOOK..", "..KKKK..", "........"],
    'mini_heart': ["........", ".PP.PP..", "PWPPPPP.", "PPPPPPP.", ".PPPPP..", "..PPP...", "...P....", "........"],
    'mini_perfect': ["...Y....", "...Y....", ".YYYYY..", "..YYY...", ".Y...Y..", "........", "........", "........"],
}


def frames():
    out = []
    for name, rows in ICONS.items():
        c = Canvas(8, 8)
        c.grid(0, 0, rows, LEG)
        out.append((name, [c], 1000))
    return out
