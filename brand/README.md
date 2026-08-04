# Logo „Říčany srdcem" — značkové podklady

Vektorová rekonstrukce loga z hlavičky webu (srdce + nápis **Říčany** / *srdcem*).
Podklady jsou připravené pro **tisk včetně velkoformátu** (plakáty, bannery, plachty).

## Proč to jde na velký formát

- **SVG i PDF jsou vektorové** — nemají rozlišení, dají se zvětšit na jakoukoli velikost (A0, billboard, plachta) bez ztráty ostrosti.
- **Text je převedený na křivky (obrysy)**, ne na živý font. Tiskárna tedy **nepotřebuje mít nainstalovaný font PT Serif** — logo se vždy vykreslí správně.
- PNG ve 4000 px slouží jen pro rychlé vložení do Office/sociálních sítí; **pro tiskárnu vždy posílejte SVG nebo PDF**.

## Soubory

| Soubor | Formát | Použití |
|---|---|---|
| `ricany-srdcem-logo.svg` / `.pdf` | vektor | **Hlavní logo**, plnobarevné, průhledné pozadí — výchozí volba pro tisk |
| `ricany-srdcem-logo-white-bg.svg` / `.pdf` | vektor | Plnobarevné na bílém podkladu (když je za logem barevné pozadí/foto a chceme bílý box) |
| `ricany-srdcem-logo-mono-white.svg` / `.pdf` | vektor | Celé **bílé** — na tmavé pozadí, fotky, červenou/modrou plochu |
| `ricany-srdcem-logo-mono-ink.svg` / `.pdf` | vektor | Celé **tmavé** jednobarevné — pro jednobarevný tisk, razítka, gravírování |
| `ricany-srdcem-heart.svg` / `.pdf` | vektor | Samotná **ikona srdce** — favicon, odznak, sociální profil, vodoznak |
| `*@4000.png`, `*@800.png` | rastr | Náhledy / Office / web (NE pro velkoformát) |

## Barvy

| Prvek | HEX | RGB | CMYK (orientačně) |
|---|---|---|---|
| Srdce — červená | `#d93434` | 217 · 52 · 52 | 0 · 76 · 76 · 15 |
| „srdcem" — modrá | `#2492d6` | 36 · 146 · 214 | 83 · 32 · 0 · 16 |
| „Říčany" — tmavá | `#142235` | 20 · 34 · 53 | 63 · 36 · 0 · 79 |

CMYK hodnoty jsou **orientační přepočet z RGB** — pro přesnou shodu nechte tiskárnu
provést konverzi do jejich profilu (případně si vyžádejte nátisk). Soubory jsou
dodány v RGB; běžná tiskárna si je do CMYK převede sama.

## Pravidla použití

- **Ochranná zóna:** kolem loga nechte volný prostor minimálně o velikosti **poloviny výšky srdce**. SVG/PDF už mají tuto rezervu zabudovanou v okraji.
- **Minimální velikost:** pro čitelnost nápisu nepoužívejte logo užší než **cca 25 mm** (tisk) / **120 px** (obrazovka). Pod tuto velikost použijte jen samotnou ikonu srdce.
- **Proporce nedeformovat** — vždy zachovat poměr stran (zvětšovat/zmenšovat se stisknutým Shiftem).
- Logo nepřebarvovat mimo dodané varianty, neotáčet, nepřidávat stíny/obrysy.
- Na tmavém/barevném podkladu použijte variantu `mono-white`, ne plnobarevnou.

## Jak byly podklady vytvořeny / jak je přegenerovat

Logo je 1:1 odvozené ze zdrojového kódu webu (`index.html`, `app.jsx`) —
stejná křivka srdce, stejné barvy, font **PT Serif Bold** („Říčany") a **PT Serif Bold Italic**
(„srdcem"). Generátor je `tools/gen_logo.py` (+ export do PDF/PNG `tools/export_logo.py`).
