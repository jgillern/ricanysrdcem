#!/usr/bin/env python3
import cairosvg, os
B = "/home/user/ricanysrdcem/brand"

# SVG zdroje -> PDF (vektor, pro tiskárnu) + PNG (vysoké rozlišení, transparentní)
svgs = [
    "ricany-srdcem-logo.svg",
    "ricany-srdcem-logo-white-bg.svg",
    "ricany-srdcem-logo-mono-white.svg",
    "ricany-srdcem-logo-mono-ink.svg",
    "ricany-srdcem-heart.svg",
]
for s in svgs:
    src = os.path.join(B, s)
    stem = s[:-4]
    # vektorové PDF — škáluje se do nekonečna, ideální pro velkoformát
    cairosvg.svg2pdf(url=src, write_to=os.path.join(B, stem + ".pdf"))
    # PNG ve vysokém rozlišení (transparentní) — šířka 4000 px pro plakáty/bannery
    w = 4000 if "heart" not in s else 2000
    cairosvg.svg2png(url=src, write_to=os.path.join(B, stem + "@4000.png"), output_width=w)
    print("export", stem)

# PNG ve "webové" velikosti pro rychlý náhled
cairosvg.svg2png(url=os.path.join(B, "ricany-srdcem-logo.svg"),
                 write_to=os.path.join(B, "ricany-srdcem-logo@800.png"), output_width=800)
print("hotovo")
