#!/usr/bin/env python3
"""Generator loga 'Říčany srdcem' — věrná rekonstrukce hlavičky z webu
(srdce + dvouřádkový nápis) jako čistý vektor s textem převedeným na křivky."""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

# --- značkové konstanty (1:1 s preview/index.html) ---
RED   = "#d93434"   # --rs-red    (srdce)
BLUE  = "#2492d6"   # --rs-blue   (slovo 'srdcem')
INK   = "#142235"   # --rs-ink    (slovo 'Říčany')
WHITE = "#ffffff"

HEART_PATH = ("M50 92 C 14 68, 2 44, 10 24 C 18 8, 38 6, 48 18 "
              "C 49 19, 49.5 20, 50 22 C 50.5 20, 51 19, 52 18 "
              "C 62 6, 82 8, 90 24 C 98 44, 86 68, 50 92 Z")

FONT_BOLD   = "/tmp/PTSerif-Bold.ttf"
FONT_ITALIC = "/tmp/PTSerif-BoldItalic.ttf"

# --- rozměry odvozené z .nav-logo (CSS) ---
HEART = 44.0            # .nav-heart 44x44
GAP   = 14.0            # .nav-logo gap
FS    = 24.0            # .nav-name font-size
LH    = FS * 0.95       # line-height 0.95
LSP   = -0.01 * FS      # letter-spacing -0.01em
UPM   = 1000.0
SCALE = FS / UPM
CAP   = 700.0 * SCALE   # cap-height v px

PAD   = 16.0           # okraj kolem loga

def glyph_paths(font_path, text, color, base_x, base_y):
    """Vrátí (svg_fragment, advance_total). Každý glyf jako <path> s transformem,
    text převedený na obrysové křivky (nezávislé na fontu)."""
    font = TTFont(font_path)
    gset = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    frags = []
    pen_x = base_x
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            raise SystemExit(f"Glyf pro '{ch}' nenalezen")
        pen = SVGPathPen(gset)
        gset[gname].draw(pen)
        d = pen.getCommands()
        if d:
            # glyf je y-up; SVG y-down -> scale(s,-s); baseline na base_y
            frags.append(
                f'<path d="{d}" fill="{color}" '
                f'transform="translate({pen_x:.3f} {base_y:.3f}) scale({SCALE:.5f} {-SCALE:.5f})"/>'
            )
        adv = hmtx[gname][0]
        pen_x += adv * SCALE + LSP
    return "\n".join(frags), pen_x - base_x

def build(text_x):
    # baseline obou řádků (cap-blok vertikálně vystředěný na střed srdce y=22)
    b1 = 22.0 - (LH + CAP) / 2 + CAP
    b2 = b1 + LH
    g1, w1 = glyph_paths(FONT_BOLD,   "Říčany", INK,  text_x, b1)
    g2, w2 = glyph_paths(FONT_ITALIC, "srdcem", BLUE, text_x, b2)
    return g1, g2, max(w1, w2)

def heart(color=RED):
    return f'<path d="{HEART_PATH}" fill="{color}" transform="scale(0.44)"/>'

def make_svg(heart_color, ink_color, blue_color, bg=None):
    text_x = HEART + GAP
    # přegenerovat s danými barvami
    b1 = 22.0 - (LH + CAP) / 2 + CAP
    b2 = b1 + LH
    g1, w1 = glyph_paths(FONT_BOLD,   "Říčany", ink_color,  text_x, b1)
    g2, w2 = glyph_paths(FONT_ITALIC, "srdcem", blue_color, text_x, b2)
    content_w = text_x + max(w1, w2)
    content_h = 44.0
    vb_w = content_w + 2 * PAD
    vb_h = content_h + 2 * PAD
    bg_rect = f'<rect x="0" y="0" width="{vb_w:.3f}" height="{vb_h:.3f}" fill="{bg}"/>' if bg else ""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w:.3f} {vb_h:.3f}" width="{vb_w:.3f}" height="{vb_h:.3f}" role="img" aria-label="Říčany srdcem">
<title>Říčany srdcem</title>
{bg_rect}
<g transform="translate({PAD} {PAD})">
{heart(heart_color)}
{g1}
{g2}
</g>
</svg>
'''

OUT = "/home/user/ricanysrdcem/brand"
os.makedirs(OUT, exist_ok=True)

variants = {
    "ricany-srdcem-logo.svg":            dict(heart_color=RED, ink_color=INK,   blue_color=BLUE),                 # plnobarevné, transparentní
    "ricany-srdcem-logo-white-bg.svg":   dict(heart_color=RED, ink_color=INK,   blue_color=BLUE, bg=WHITE),       # na bílém pozadí
    "ricany-srdcem-logo-mono-white.svg": dict(heart_color=WHITE, ink_color=WHITE, blue_color=WHITE),              # celé bílé (na tmavé/foto)
    "ricany-srdcem-logo-mono-ink.svg":   dict(heart_color=INK, ink_color=INK,   blue_color=INK),                  # celé tmavé jednobarevné
}
for name, kw in variants.items():
    with open(os.path.join(OUT, name), "w") as f:
        f.write(make_svg(**kw))
    print("napsáno", name)

# samostatná ikona srdce (pro favicon / sociální / razítko)
icon = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Říčany srdcem — srdce">
<title>Říčany srdcem — srdce</title>
<path d="{HEART_PATH}" fill="{RED}"/>
</svg>
'''
with open(os.path.join(OUT, "ricany-srdcem-heart.svg"), "w") as f:
    f.write(icon)
print("napsáno ricany-srdcem-heart.svg")
