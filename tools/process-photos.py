#!/usr/bin/env python3
"""Příprava fotek kandidátů 8+ pro web (viz README → Práce s fotkami).

Vezme surovou fotku z uploads/, ořízne ji na poměr 4:5, zmenší
na 600×750 px a uloží jako photos/<id>.jpg (původní pozadí
zůstává — modal má bílou kartu).

Ořez: šířka/výška se dopočítá tak, aby se z originálu vzal co největší
výřez 4:5. Horizontálně se výřez posadí podle `--face-x` (0–1, výchozí
střed), vertikálně podle `--top` (0–1, výchozí 0 = od horní hrany, aby
nad hlavou zbyla jen malá rezerva).

Fotky top7 (ateliér, odebrané pozadí → transparentní WebP) tenhle skript
neřeší, ty vznikaly zvlášť přes rembg.

Použití:
    python3 tools/process-photos.py uploads/dominik-bren-raw.jpg dominik-bren
    python3 tools/process-photos.py raw.jpg peter-vercimak --face-x 0.49
"""

import argparse
import os

from PIL import Image, ImageOps

TARGET = (600, 750)  # 4:5
QUALITY = 88


def crop_45(im, face_x=0.5, top=0.0):
    w, h = im.size
    ratio = TARGET[0] / TARGET[1]
    if w / h > ratio:          # moc široké → ořezáváme po stranách
        cw, ch = int(round(h * ratio)), h
    else:                      # moc vysoké → ořezáváme zdola/shora
        cw, ch = w, int(round(w / ratio))
    left = min(max(int(round(face_x * w - cw / 2)), 0), w - cw)
    upper = min(max(int(round(top * (h - ch))), 0), h - ch)
    return im.crop((left, upper, left + cw, upper + ch))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src', help='surová fotka (uploads/…)')
    ap.add_argument('slug', help='id kandidáta z data.js, např. dominik-bren')
    ap.add_argument('--face-x', type=float, default=0.5,
                    help='vodorovný střed obličeje, 0–1 (výchozí 0.5)')
    ap.add_argument('--top', type=float, default=0.0,
                    help='svislé posazení výřezu, 0–1 (výchozí 0 = od horní hrany)')
    ap.add_argument('--out-dir', default='photos')
    args = ap.parse_args()

    im = ImageOps.exif_transpose(Image.open(args.src)).convert('RGB')
    out = crop_45(im, args.face_x, args.top).resize(TARGET, Image.LANCZOS)
    path = os.path.join(args.out_dir, args.slug + '.jpg')
    out.save(path, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    print(f'{args.src} {im.size} → {path} {out.size} '
          f'({os.path.getsize(path) // 1024} kB)')


if __name__ == '__main__':
    main()
