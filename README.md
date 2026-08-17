# Říčany srdcem — web kandidátky

Volební web pro **komunální volby v Říčanech 9.–10. října 2026**. Kandidátka **Říčany srdcem** = společný projekt **TOP 09**, **KDU·ČSL** a nezávislých kandidátů.

- **Doména:** [ricanysrdcem.cz](https://ricanysrdcem.cz) (registrátor: forpsi.com)
- **Hosting:** Vercel (deployment z GitHub repa, branch `claude/implement-ricany-teaser-QFIUX`)
- **Veřejná stránka (`/`):** finální web — Hero, priority, tým, kontakt
- **Teaser** („Již brzy" s countdownem) a **heslem chráněný náhled `/preview`** už neexistují — nahradil je finální web, viz [Cutover](#cutover-z-teaseru-na-finální-web-hotovo)

---

## Obsah

1. [Aktuální stav](#aktuální-stav)
2. [Struktura repa](#struktura-repa)
3. [Architektura](#architektura)
4. [Datový model](#datový-model)
5. [Jak měnit obsah](#jak-měnit-obsah)
6. [Práce s fotkami](#práce-s-fotkami)
7. [Import textů priorit z Confluence (Rovo MCP)](#import-textů-priorit-z-confluence-rovo-mcp)
8. [Import medailonků z Confluence](#import-medailonků-z-confluence)
9. [Import textů z Wordu](#import-textů-z-wordu)
10. [Prohlášení o transparentnosti (TTPA)](#prohlášení-o-transparentnosti-ttpa--nařízení-eu-2024900)
11. [Analytics (Plausible)](#analytics-plausible)
12. [Limity a doporučené délky textů](#limity-a-doporučené-délky-textů)
13. [Plány do budoucna](#plány-do-budoucna)
14. [Cutover z teaseru na finální web (hotovo)](#cutover-z-teaseru-na-finální-web-hotovo)

---

## Aktuální stav

**Web je ostrý.** Finální stránka běží na `/`, teaser i heslem chráněný náhled `/preview` byly zrušené.

| URL | Co je tam | Přístup |
|---|---|---|
| `ricanysrdcem.cz/` | **Finální web** — Hero, Priority, Tým, Kontakt, Footer | veřejné, indexovatelné |
| `ricanysrdcem.cz/ttpa/*.pdf` | prohlášení o transparentnosti (EU 2024/900) | veřejné |
| `ricanysrdcem.cz/robots.txt`, `/sitemap.xml` | pro vyhledávače | veřejné |

Obsah je reálný a finální — priority, seznam kandidátů, fotky i medailonky top10.

**Co ještě chybí** (nic z toho nebrání provozu, detaily v [Plánech do budoucna](#plány-do-budoucna)):
- **Odkazy na sociální sítě** — ikony FB/IG jsou z navigace dočasně odstraněné, protože reálné profily zatím nemáme. Až budou, vrátí se (návod níže).
- Registrace webu v Google Search Console / Bing Webmaster Tools.

---

## Struktura repa

```
/
├── README.md                  # tento dokument (na web se nenasazuje, viz .vercelignore)
├── index.html                 # finální stránka — CSS, meta/OG, React+Babel CDN, mount point
├── app.jsx                    # React komponenty (Nav, Hero, Priorities, Team, Contact, Footer)
├── data.js                    # veškerý obsah (window.RS_DATA)
├── robots.txt                 # povoluje indexaci, odkazuje na sitemapu
├── sitemap.xml                # jedna URL — web je single‑page
├── package.json               # marker pro Vercel, žádné deps
├── .vercelignore              # co se nemá nasazovat (README, tools/, uploads/)
├── photos/                    # hotové portréty použité na webu (<id>.webp / <id>.jpg)
├── uploads/                   # surové fotky, ze kterých se ty hotové generují (nenasazuje se)
├── assets/
│   ├── logo-new.webp          # logo v navigaci
│   ├── og-image.png           # 1200×630 náhled pro sociální sítě
│   ├── top09.png              # logo TOP 09 (footer)
│   ├── lidovci_logo_rgb_black-kdu.svg   # logo KDU·ČSL (footer)
│   └── kducsl.png, logo.jpg   # starší nepoužívané varianty log (záloha)
├── ttpa/                      # prohlášení o transparentnosti (nařízení EU 2024/900)
│   ├── rengl.pdf              # → ricanysrdcem.cz/ttpa/rengl.pdf
│   ├── maks.pdf               # → ricanysrdcem.cz/ttpa/maks.pdf
│   └── trojhrany.pdf          # → ricanysrdcem.cz/ttpa/trojhrany.pdf
├── brand/                     # logo v křivkách (SVG/PDF/PNG) + manuál, viz brand/README.md
└── tools/                     # pomocné skripty (nejsou součástí webu)
    ├── process-photos.py      # ořez fotek kandidátů 8+ na 4:5 → photos/
    ├── make-og-image.mjs      # generátor assets/og-image.png (Playwright + Chromium)
    └── gen_logo.py, export_logo.py
```

**Žádný build krok** — soubory se servírují přímo Vercelem jako statika; React/Babel se načítají z CDN, JSX se transformuje za běhu v prohlížeči (vhodné pro tuto velikost projektu, viz [Plány do budoucna](#plány-do-budoucna)).

---

## Architektura

### Stránka (`/`)

Render flow:
1. `index.html` načte CSS, fonty (PT Serif + PT Sans), React + ReactDOM + Babel z unpkg CDN
2. Inline `<script>` nastaví `--heart-mask` data URI pro CSS masku srdce
3. `data.js` (plain JS) nastaví `window.RS_DATA = {...}`
4. `app.jsx` (`type="text/babel"`) je za běhu transformován Babelem a mountovaný do `<div id="app">`

**Komponenty v `app.jsx`:**
| Komponenta | Účel |
|---|---|
| `Nav` | Sticky horní lišta — logo, kotvy na sekce, hamburger menu na mobilu (ikony FB/IG zatím vypnuté, viz níže) |
| `Hero` | „Říčany srdcem", úvodní slovo lídryně, fotka, dvě CTA (priority / tým) |
| `Priorities` + `PriorityCard` | Mřížka 10 karet (číslo, titulek, anotace) |
| `PriorityDrawer` | Pravostranný drawer s detailem priority (head fixed, body scrolluje); na dotyku jde zavřít **swipem doprava**, viz níže |
| `Team` + `TeamCardLeader` + `TeamCard` + `TeamRow` | Velká karta lídryně, grid kandidátů 2–7, řádkový list 8–21 (řádky 8–10 jsou klikací — mají fotku/medailonek) |
| `MemberModal` | Centrovaný modal s portrétem + medailonkem; na dotyku jde zavřít **tažením na koncích scrollu**, viz níže |
| `Footer` | „Společná kandidátka [TOP 09] [KDU·ČSL] a nezávislých kandidátů" |

**Helper `renderRichText`** rozparsuje markdown‑style `**bold**` v textu odstavců na `<strong>`. V obsahu ho ale **nepoužíváme** — viz [Tučné zvýraznění](#tučné-zvýraznění).

**Helper `scrollToId`** obsluhuje všechny odskoky na kotvy (navigace i CTA v Heru). Offset se počítá z **reálné výšky** `.nav` (`offsetHeight + 12`), ne z konstanty — hlavička je na mobilu a na desktopu různě vysoká. Respektuje i `prefers-reduced-motion`.

### Responzivita — kde jsou zlomy

| Zlom | Co se mění |
|---|---|
| `≤ 860px` | Hamburger menu místo odkazů, logo v hlavičce 116 → 56 px; Hero se zalomí pod sebe a **fotka lídryně se řadí mezi titulek a perex** (`.hero-text { display: contents }` + `order`); karta lídryně a mřížka kandidátů na 2 sloupce |
| `≤ 720px` | Svislé mezery sekcí 96 → 56 px, Hero padding 56/64 → 32/40 px; priority přepnou na `auto-fit`/`minmax(260px, 1fr)` (podle šířky 1–2 sloupce) |
| `≤ 640px` | Řádky „Dalších kandidátů" se zalomí do dvou pater (jméno / funkce), tečkovaný vodič zmizí |
| `≤ 480px` | Menší kolečka fotek (150 px) a písmo v kartách kandidátů — mřížka **zůstává dvousloupcová** až do 320 px |

Ověřeno bez horizontálního přetečení v rozsahu 320–1280 px. Modal i drawer používají `dvh` (na `vh` fallback), aby je neořízla vysouvací lišta mobilního prohlížeče.

### Zavření tažením (drawer i modal)

Obojí jde na dotyku zavřít gestem — prvek drží prst a po puštění se buď dozavře, nebo pruží zpět. Společnou mechaniku (osa, směr, prahy) řeší hook **`useDragToDismiss`** v `app.jsx`, vzhled a konec gesta si každá komponenta říká sama v `paint` / `release`.

| Prvek | Gesto | Co dělá | Kdy zabírá |
|---|---|---|---|
| `PriorityDrawer` | tažení **doprava** | zavře | vždy (panel se svisle scrolluje, vodorovné gesto je volné) |
| `MemberModal` | tažení **dolů i nahoru** | zavře | **jen na koncích scrollu** — nahoře dolů, dole nahoru |
| `MemberModal` | tažení **do stran** | **listuje mezi kandidáty** (doleva další, doprava předchozí) | vždy — vodorovně se nic neroluje |

**Listování v modalu** jde po pořadí `MODAL_MEMBERS` (`app.jsx`): lídryně, karty 2–7 a ti z dalších kandidátů, kdo mají medailonek — v praxi **top10**. Na koncích seznamu klade tažení odpor a vrátí se zpět. Přepnutí nechává stejný DOM prvek, takže se ručně resetuje `scrollTop` — jinak by nový medailonek začínal v místě, kam byl odrolovaný ten předchozí.

Ovládat se dá třemi způsoby, všechny vedou přes `slideTo()`, takže vypadají stejně:
- **swipe** do stran (dotyk),
- **lišta se šipkami `‹ ›`** dole v modalu (`.modal-nav`) — drží ji `position: sticky; bottom: 0`, protože scrollovací kontejner je sám `.modal`. Kdyby byla jen na konci obsahu, dozvěděl by se o listování jen ten, kdo dočte až dolů. Nad lištou je jemné prolnutí (`::before` s gradientem), ať text nekončí useknutý v půlce řádku. Šipka na kraji seznamu je `disabled`.
- **šipky ←/→** na klávesnici.

Lišta **záměrně neukazuje čítač** typu `02 / 10`: kandidátka má 21 lidí, takže „z deseti" mate. Číslo kandidáta je stejně vidět nahoře v modalu.

Tažení, které začne **na šipce**, kandidáta nepřeskočí dvakrát: zrušený `touchmove` potlačí i následný `click`, takže se uplatní jen gesto.

Vodorovné gesto je schválně **listování, ne zavírání**: zavírat vším směrem by znamenalo, že palcový oblouk na začátku scrollu (prvních ~10 px bývá vodorovných) odveze modal pryč, místo aby scrolloval.

Modal se roluje (medailonek lídryně má na mobilu 1234 px obsahu v 796px okně), takže gesto nesmí soupeřit se scrollem. Proto zabírá jen na okrajích — využívá přesně ten „přetah", který by jinak jen gumově odskočil. Dočtený medailonek se tak zavře tahem nahoru, bez nutnosti vyjet zpátky na začátek. Krátký medailonek, který se neroluje, zavírají oba směry.

Pár věcí je na tom ošemetných:

- **Listenery se věší ručně** (`el.addEventListener` s `{ passive: false }`), ne přes `onTouchMove`. React registruje touch handlery jako **pasivní**, takže by v nich `preventDefault()` nefungoval a obsah by při gestu zároveň scrolloval.
- **Callbacky drží ref**, ne závislosti efektu — jinak by se listenery převěšovaly při každém renderu.
- **Směr se určí až po 8 px** a poměrem `|podél| > |napříč| × 1.3`. Dokud gesto míří jinam (nebo směrem, který prvek zrovna nepřijímá), skript se nechá být a obsah normálně scrolluje.
- **`touch-action: pan-y pinch-zoom`** na `.drawer` i `.modal` (CSS) nechává prohlížeči svislý scroll a zoom.
- **Prahy:** zavření — drawer > ⅓ šířky panelu, modal > 110 px; přepnutí kandidáta > 80 px. U všech navíc rychlost > 0,5 px/ms (švihnutí z kratší dráhy).
- Modal má hook **navěšený dvakrát** (osa `y` = zavření, osa `x` = listování). Nekolidují spolu: každý si sáhne po gestu jen když jeho osa převáží tu druhou o 30 %, což může platit vždy nanejvýš pro jednu z nich. Šikmé gesto nespustí ani jedno a zůstane prohlížeči.
- Drawer má odchozí stav v CSS (`transform: translateX(100%)`), takže po puštění stačí vrátit řízení tranzici — v pořadí `transition` → vynucený reflow (`void el.offsetWidth`) → smazání inline `transform`. Bez toho reflow by prvek skočil bez animace. **Modal odchozí stav nemá** (po zavření mizí z DOM), takže si cestu za okraj odanimuje sám a `onClose` volá se zpožděním 200 ms.
- Podklad má vlastní tranzici, po dobu tažení se vypíná, jinak by ztmavení kulhalo za prstem.

Ověřeno v Chromiu s emulací dotyku — drawer: dlouhý swipe zavře, krátký pomalý pruží zpět, svislý tah scrolluje, tah doleva nedělá nic, po znovuotevření si panel nenese posun z minula. Modal (zavírání): nahoře zavírá tah dolů, dole tah nahoru, uprostřed textu ani jeden směr nezavírá, krátký tah pruží zpět, u nerolujícího medailonku fungují oba směry. Modal (listování): tažením doleva projde 01 → 10 a na konci se zastaví, doprava zpátky na 01, lišta i šipky ←/→ dělají totéž, nový medailonek začíná odshora, šikmé gesto nespustí nic, tažení začínající na šipce nepřeskočí dva kandidáty. Křížek, klik mimo i ESC fungují u obojího dál.

Ověřeno i to, že lišta drží u spodní hrany i po odrolování, šipky se na krajích seznamu vypínají a ťuknutí na šipku listuje stejně jako tažení.

**Knihovny z CDN** se načítají s `integrity` (SRI) — React i ReactDOM v **produkčním** buildu (`*.production.min.js`), Babel standalone pro runtime transformaci JSX. Při změně verze je potřeba spočítat nový SRI hash, jinak prohlížeč skript odmítne:

```sh
# hash přesně toho souboru, který unpkg servíruje (unpkg = obsah npm balíčku)
npm pack react@18.3.1 && tar xzf react-18.3.1.tgz
openssl dgst -sha384 -binary package/umd/react.production.min.js | openssl base64 -A
```

### Ikony sociálních sítí (dočasně vypnuté)

FB/IG profily zatím neexistují, takže ikony **nejsou** v navigaci — odkazovaly na `#` a nikam nevedly. Připravené zůstává všechno okolo:

- CSS `.nav-social` v `index.html`
- Plausible eventy `Social: Facebook` / `Social: Instagram` (helper `track()` v `app.jsx`)
- Komentář na správném místě v komponentě `Nav` (`app.jsx`)

**Až profily vzniknou**, vrátí se do `Nav` mezi `<nav className="nav-links">` a `.nav-burger` blok s reálnými `href` (historickou podobu markupu má git — commit před cutoverem).

### Heslem chráněný náhled (zrušeno)

Do cutoveru běžel na `/preview` heslem chráněný náhled (Vercel Edge Middleware v `middleware.js`, HMAC podepsaná cookie). Po spuštění ostrého webu byl smazaný. Kdyby byla potřeba znova (např. pracovní verze pro klienta), je v gitu — stačí vrátit `middleware.js`, změnit `matcher` na jinou cestu a doplnit env var `PREVIEW_PASSWORD` ve Vercelu.

---

## Datový model

Vše v `data.js` jako `window.RS_DATA`. Struktura:

```js
window.RS_DATA = {
  leader: {
    id:    'eva-novakova',
    name:  'Eva Nováková',                                // bez titulů
    role:  'Lídryně kandidátky',                            // bez „kandidátka na starostku“ — tak jsme se dohodli
    job:   'ředitelka neziskové organizace',              // 1-4 slova malými písmeny
    photo: 'URL nebo /photos/...',                // výchozí 4:5 portrét — použije se všude, kde není override
    photoHero: '...',                                      // VOLITELNÉ — fotka jen pro Hero (úvod)
    photoTeam: '...',                                      // VOLITELNÉ — fotka jen pro kartu v Týmu + modal
    bio:   '...',                                          // medailonek v modálu; odstavce oddělit prázdným řádkem (\n\n)
    intro: '...'                                           // úvodní slovo v Hero, ~5 vět
  },

  top6: [
    {
      id: 'petr-svoboda', n: 2,
      name: 'Petr Svoboda',
      role: 'dopravní inženýr',                            // pracovní pozice malými písmeny
      photo: '...',                                         // 4:5 portrét
      bio:   '...'                                          // medailonek 2-3 věty
    },
    // … kandidáti č. 3–7
  ],

  rest: [
    {
      id: 'pavel-kucera', n: 8,
      name: 'Pavel Kučera',
      role: 'podnikatel, gastronomie',
      photo: '...',                                         // jen pro modal, vlastní fotka kandidáta
      bio:   '...'                                          // medailonek; může být prázdný → fallback text
    },
    // … kandidáti č. 9, 10 (fotka + medailonek)
    { id: 'pavla-ruzickova', n: 11, name: '…', role: '…' }, // č. 11+ jen jméno a profese
    // … kandidáti č. 12–21
  ],

  priorities: [
    {
      n: 1,
      title: 'Bezpečná a plynulá doprava',                 // 3-5 slov
      lead:  'Méně tranzitu, lepší parkování…',            // 1 věta na kartě
      sections: [
        {
          heading: null,                                   // úvodní odstavec bez nadpisu
          paragraphs: [
            'Text odstavce bez zvýraznění.',                // v prioritách se netučňuje
          ]
        },
        {
          heading: 'Subnadpis sekce',
          paragraphs: [
            'První odstavec…',
            {
              image:   '/images/foto.jpg',          // OBRÁZEK uprostřed textu
              alt:     'Popis pro screen reader / SEO',
              caption: 'Volitelný popisek pod obrázkem'
            },
            'Pokračovací odstavec…'
          ]
        }
      ]
    },
    // … priority 2–10
  ]
};
```

**Konvence:**
- **Fotky a medailonky máme jen u top10** (lídryně + č. 2–10) — tak jsme se dohodli. Kandidáti od č. 11 dál mají v `rest` jen `name` + `role`.
- V řádkovém seznamu je kandidát **klikací (otevře modal se šipkou na konci řádku), jakmile má fotku nebo medailonek** — v praxi tedy č. 8–10. Ostatní řádky jsou statické. Logika je v `TeamRow` v `app.jsx`.
- `id` slugify z jména (kebab‑case ASCII)
- `n` = pořadí na kandidátce (1 = lídryně, neopakuje se v `top6`)
- **Bez akademických titulů** v `name` (rozhodli jsme dříve)
- `role` = pracovní pozice malými písmeny, ne oblast jako „Doprava a infrastruktura"
- **Tučné se nepoužívá** — texty priorit jdou na web bez `**…**` (viz [Tučné zvýraznění](#tučné-zvýraznění)). Parser by ho v `paragraphs` zvládl, ale obsah ho nemá.

---

## Jak měnit obsah

Pro 95 % změn stačí editovat **`data.js`** a pushnout. Vercel zdetekuje commit a redeployne (~30 s).

**Pár pravidel:**
- Zachovat strukturu klíčů (`leader`, `top6`, `rest`, `priorities`)
- Zachovat počet kandidátů (1 + 6 + 14 = **21**, nebo upravit i v komentáři)
- Zachovat počet priorit (**10**) — design počítá s 2×5 mřížkou
- Texty s česktými uvozovkami (`„…"`), em‑dash (`—`), nebreakovatelnou mezerou (` `) tam, kde nemá zlomit
- Foto URL může být absolutní (https://…) nebo relativní (`/photos/jmeno.png`)

**Strukturální změny** (komponenty, layout, animace) se dělají v `app.jsx` + CSS v `index.html`.

---

## Práce s fotkami

### Co je potřeba

**Fotky sbíráme jen u top10** (lídryně + č. 2–10). Kandidáti od č. 11 dál jsou na webu jen jako řádek se jménem a profesí.

| Skupina | Zdroj | Pozadí | Počet | Stav |
|---|---|---|---|---|
| Lídryně + top6 | Studio | bílé → odebrané (transparentní WebP) | 7 | ✅ hotovo |
| Kandidáti 8–10 | Vlastní | různé (ponechané) | 3 | ✅ hotovo |

> **Lídryně má dvě různé fotky:** jednu pro **Hero** (úvod nahoře) a jinou pro **kartu mezi kandidáty + modal**. V `data.js` se mapují na `leader.photoHero` a `leader.photoTeam` (viz [Datový model](#datový-model)). `leader.photo` je společný fallback, použije se jen tam, kde override chybí.

### Workflow při importu

Surové fotky patří do `uploads/` pod názvem `<id>-raw.jpg` (`<id>` = `id` kandidáta z `data.js`), hotové do `photos/`.

**Pro kandidáty 8+** je na to skript `tools/process-photos.py` (Python + Pillow) — ořízne na 4:5, zmenší na 600 × 750 px a uloží jako JPEG:

```sh
pip install Pillow
python3 tools/process-photos.py uploads/dominik-bren-raw.jpg dominik-bren
# volitelně: --face-x 0.48 (vodorovný střed obličeje) a --top 0.3 (svislé posazení výřezu)
```

Pak už jen doplnit `photo: '/photos/<id>.jpg'` do `data.js`.

**Pro top7** (ateliér, odebrané pozadí) skript není — vznikaly zvlášť přes [`rembg`](https://github.com/danielgatis/rembg), postup níže:

**Pro top7:**
1. Odebrání pozadí přes [`rembg`](https://github.com/danielgatis/rembg) → transparentní PNG
2. Detekce obličeje pro chytrý crop (hlava do horní třetiny)
3. Crop na poměr **4:5**
4. Resize do tří velikostí:
   - lídryně Hero: **1200 × 1500 px** → `leader-hero.webp` (`leader.photoHero`)
   - lídryně tým: **800 × 1000 px** → `leader-team.webp` (`leader.photoTeam`)
   - top6: **800 × 1000 px** (grid)
5. Uložení do `photos/<id>.webp` (transparentní WebP — alfa kanál jako PNG, ale ~10× menší; `<img src>` ho bere ve všech moderních prohlížečích, projekt už WebP používá i pro logo)

### Obrázky uvnitř priorit

Drop do `images/` jako JPG/WebP, šířka ≥ 1200 px, poměr 16:9 nebo 3:2. Reference v `data.js` jako `image: '/images/<nazev>.jpg'`.

---

## Import textů priorit z Confluence (Rovo MCP)

**Toto je standardní (primární) způsob aktualizace textů priorit.** Finální texty priorit píší autoři v Confluence; odtud je taháme přes **Atlassian Rovo MCP** konektor a mapujeme do pole `priorities` v `data.js`.

### Zdroj v Confluence

- **Site:** `top09ricany` (`https://top09ricany.atlassian.net`), prostor *TOP 09 Říčany*
- **Rodičovská stránka:** „Našich 10 priorit pro Říčany", **page ID `71204865`**
- **Pod ní jsou podstránky — co priorita, to jedna podstránka.** Pořadí podstránek (Confluence `childPosition`) určuje pořadí priorit (`n`) na webu.
- Nevyplněné podstránky (prázdný *Název priority* / *Anotace* / *Hlavní text*) se **přeskočí** a na jejich místě v `data.js` zůstává stávající placeholder.

### Jak má vypadat podstránka v Confluence

Aby šel obsah namapovat bez ručního dolaďování, drží autoři tuto strukturu nadpisů:

| Confluence | → mapuje se na |
|---|---|
| `## Název priority` + text pod ním | `priority.title` (3–5 slov) |
| `## Anotace` + text pod ní | `priority.lead` (1 věta) |
| `## Hlavní text`, první odstavec (bez `###`) | `sections[0]` s `heading: null` |
| `### Subnadpis` + odstavce pod ním | další `sections[]` (`heading` + `paragraphs`) |
| **Tučné** (Ctrl+B) | **nepřenáší se** — viz [Tučné zvýraznění](#tučné-zvýraznění) |

**Co se do webu nepřenáší / vynechává:**
- řádky **Garant / Autor** a `@zmínky` nahoře (interní metadata)
- autorské poznámky a otázky vložené do textu (např. „Funguje to takhle?")
- obrázky vložené jen jako interní `blob:` URL z editoru — nejsou veřejně dostupné; obrázek je potřeba zvlášť exportovat do `images/` a doplnit ručně (viz [Obrázky uvnitř priorit](#obrázky-uvnitř-priorit))

### Tučné zvýraznění

**V textech priorit se netučňuje.** Tučné, které autoři v Confluence použili (Ctrl+B), se do `data.js` **nepřebírá** — při importu ho zahoď.

Důvod: každou prioritu píše někdo jiný, takže syrové zvýraznění kolísalo od nuly po jedenáct kusů na prioritu, míchaly se v něm názvy opatření se slovesnými frázemi i celými větami a v draweru to působilo nahodile. Sjednocovat to podle nějakého klíče znamená rozhodovat za autory, které z jejich myšlenek jsou důležitější — proto radši rovnou žádné. Text priorit tak drží jednotnou barvu a důraz nesou nadpisy sekcí a `lead`.

Kontrola po importu (nesmí nic vypsat):

```sh
grep -n '\*\*' data.js
```

> Podpora `**bold**` v `app.jsx` (helper `renderRichText`) zůstává funkční pro případ, že by se rozhodnutí někdy změnilo — jen ji nepoužíváme.

### Postup (krok za krokem)

1. **Ověř dostupnost Rovo MCP** — musí být k dispozici nástroje `mcp__Atlassian_Rovo__*` (Confluence). Pokud nejsou, dál nepokračuj naslepo.
2. **Vylistuj podstránky** — `getConfluencePageDescendants` na `pageId: 71204865` (`cloudId: top09ricany.atlassian.net`), `depth: 1`.
3. **Stáhni obsah** každé podstránky přes `getConfluencePage` s `contentFormat: "markdown"` a urči, které jsou vyplněné.
4. **Namapuj** obsah na strukturu z [Datového modelu](#datový-model): `title`, `lead`, `sections[].{heading, paragraphs}`. Pořadí `n` podle `childPosition`.
5. **Typografie:** české uvozovky `„…"`, em‑dash `—`, nezalomitelná mezera (` `, U+00A0) po jednopísmenných předložkách/spojkách (`k s v z o u a i`). Nezalomitelnou mezeru aplikuj **jen v upravovaných prioritách**, ať nevzniká šum v nezměněných částech souboru.
6. **Zahoď tučné** — viz [Tučné zvýraznění](#tučné-zvýraznění). Do `data.js` jde text bez `**…**`.
7. **Zachovej všech 10 položek** v `priorities` — měň jen vyplněné, prázdné nech jako placeholder.
8. **Commit + push** na pracovní branch (`git push -u origin <branch>`), **bez** otevírání PR, pokud o něj není výslovně požádáno. Do commit message stručně, které priority se nahrály.
9. **Reportuj** zpět: které priority naplněné, které zůstaly placeholder, a cokoliv, co v Confluence chybělo nebo nešlo jednoznačně namapovat (chybějící anotace, 2větné `lead`, garbled text, vynechané obrázky/poznámky, drobné opravené překlepy).

### Kontrola po importu

```sh
# Ověření, že data.js je validní a má 10 priorit
node -e 'global.window={}; require("./data.js");
  const d=global.window.RS_DATA;
  console.log("priorit:", d.priorities.length);
  d.priorities.forEach(p=>console.log("n"+p.n, p.title));'
```

Hlídej [Limity a doporučené délky textů](#limity-a-doporučené-délky-textů) — zejména `title` ≤ 6 slov, `lead` ≤ 25 slov a součet `sections` ≤ 600 slov. Confluence texty bývají delší; co výrazně přetéká, nahlas v reportu k doladění.

---

## Import medailonků z Confluence

Medailonky kandidátů sbírají autoři ve stejném prostoru Confluence jako priority, na stránce **„Medailonky kandidátů“, page ID `105086977`** (podstránka stránky se seznamem kandidátů). Tahá se stejným Rovo MCP konektorem jako priority.

**Sbíráme je jen za top10** (lídryně + č. 2–10) — na stránce je pro každého z nich jeden nadpis `## <příjmení>`, pod ním text medailonku. Prázdný nadpis = medailonek zatím nedorazil, v `data.js` zůstane `bio: ''`.

U některých kandidátů je pod základní verzí ještě odstavec **„Prodloužená alternativa:"** a pod ním delší varianta téhož textu. **Na web patří ta prodloužená** — tak jsme se dohodli; modal si s ní poradí.

### Postup

1. `getConfluencePage` na `pageId: 105086977` (`cloudId: top09ricany.atlassian.net`), `contentFormat: "markdown"`.
2. Každý neprázdný blok namapovat na `bio` odpovídajícího kandidáta — `leader.bio`, `top6[].bio`, `rest[].bio`.
3. **Vynechat** `@zmínky` u nadpisů (interní metadata pro autory) a případné poznámky.
4. Text vložit jako **jeden odstavec** (`.modal-bio` je jedno `<p>`) — zalomení řádků z copy‑paste spojit mezerou.
5. Typografie stejná jako u priorit: české uvozovky `„…"`, em‑dash `—`, nezalomitelná mezera po jednopísmenných předložkách/spojkách (`k s v z o u a i`).
6. Hlídat [délku](#limity-a-doporučené-délky-textů) — modal se přizpůsobí do ~130 slov, nad to už je lepší text zkrátit. Co přetéká, **nezkracovat na vlastní pěst** — je to autorský text o konkrétním člověku; nahlásit to a nechat rozhodnutí na kandidátovi.
7. Commit + push na pracovní branch, bez PR (pokud o něj není výslovně požádáno).

> Existuje ještě starší stránka **„Medailonky“ (ID `102858761`)**, kterou si založil Vojtěch Vytiska, než vznikla ta oficiální. Jsou na ní starší verze medailonku Ondřeje Tomáše (č. 4) a medailonek Vojtěcha Vytisky (č. 16, mimo top10 → na web nejde). **Zdrojem pravdy je oficiální stránka**, k té starší se vracet netřeba.

### Kontrola po importu

```sh
node -e 'global.window={}; require("./data.js");
  const d=global.window.RS_DATA;
  [d.leader, ...d.top6, ...d.rest].forEach(m => console.log(
    String(m.n || 1).padStart(2), m.name,
    "| foto:", m.photo ? "ano" : "—",
    "| medailonek:", m.bio && m.bio.trim() ? m.bio.trim().split(/\s+/).length + " slov" : "—"));'
```

---

## Import textů z Wordu

**Alternativní (záložní) cesta** pro případ, že texty nedorazí přes Confluence, ale jako Word soubory (typicky medailonky a úvodní slovo; priority primárně přes [Confluence](#import-textů-priorit-z-confluence-rovo-mcp)).

Až dorazí Word soubory s finálními texty (priorit, medailonků, úvodního slova), napíšu skript `tools/import-docx.py` (Python + `python-docx`), který:

1. Otevře `.docx`
2. Detekuje strukturu podle Word stylů:
   - *Nadpis 1* → priorita / kandidát
   - *Nadpis 2/3* → subnadpis sekce
   - **Bold runs** → markdown `**…**`
3. Vyplivne aktualizovaný `data.js`

**Aby to fungovalo bez ručního dolaďování, je třeba aby autoři:**
- Tučné dělali přes Ctrl+B (nikoliv CAPSLOCKEM)
- Pro subnadpisy používali Wordové styly *Nadpis 2*, *Nadpis 3*
- Nedávali komentáře / track changes do exportu

---

## Prohlášení o transparentnosti (TTPA — nařízení EU 2024/900)

Nařízení EU o **transparentnosti a cílení politické reklamy** (Regulation (EU) 2024/900, „TTPA") vyžaduje, aby z volebních materiálů (letáky, inzeráty, online reklama) vedl odkaz na **prohlášení o transparentnosti**. Tyto PDF dokumenty jsou v repu ve složce **`ttpa/`** a servírují se přímo Vercelem jako statika:

| Soubor v repu | Veřejná URL |
|---|---|
| `ttpa/rengl.pdf` | `www.ricanysrdcem.cz/ttpa/rengl.pdf` |
| `ttpa/maks.pdf` | `www.ricanysrdcem.cz/ttpa/maks.pdf` |
| `ttpa/trojhrany.pdf` | `www.ricanysrdcem.cz/ttpa/trojhrany.pdf` |

### Proč `ttpa/` v rootu

- **Odkazy jsou stabilní přes celý životní cyklus webu.** Cesta `/ttpa/…` žije v rootu repa, **mimo** stránku samotnou. [Cutover z teaseru na finální web](#cutover-z-teaseru-na-finální-web-hotovo) se složky `ttpa/` **vůbec nedotkl** — URL na letácích fungují dál, **bez jakékoli úpravy**.
- **Nic to nechrání ani neblokuje.** `/ttpa/*` je veřejně dostupné (tak to má být) a `.vercelignore` se ho netýká.

### Aktualizace částek / obsahu (stejný název souboru)

Dokumenty jsou zatím **předběžné** (budou se aktualizovat částky). Postup při nové verzi:

1. Nahraj nový PDF **se stejným názvem** (`rengl.pdf` / `maks.pdf`) do složky `ttpa/` (přes GitHub „upload files" nebo `git`).
2. Push → Vercel redeployne (~30 s) a na stejné URL začne servírovat novou verzi. **URL na letácích měnit netřeba.**

> Cache: Vercel při každém deploji servíruje aktuální verzi (CDN se invaliduje na nový deployment). Prohlížeč si starou verzi může krátce držet, ale odkaz i cesta zůstávají stejné.

### Přidání dalších formulářů do budoucna

Stačí dropnout další PDF do `ttpa/` — bude hned dostupné na `www.ricanysrdcem.cz/ttpa/<nazev>.pdf`. Žádná konfigurace ani routing navíc.

---

## Analytics (Plausible)

Návštěvnost a chování měříme přes **[Plausible](https://plausible.io)** — **cookieless**, bez ukládání čehokoli do prohlížeče, takže **není potřeba cookie lišta ani souhlas** (ČR má od 1. 1. 2022 opt-in režim, § 89 zák. č. 127/2005 Sb.). Data jsou v EU, unikáty se počítají přes denně rotující anonymní hash.

### Jak je to zapojené

- **Skript** (`<script defer data-domain="ricanysrdcem.cz" src="https://plausible.io/js/script.js">`) je v `<head>` stránky `index.html` — právě jednou. Hned za ním je inicializační fronta pro `window.plausible`, aby se neztratily eventy odpálené dřív, než se skript stáhne.
- **Custom events** se posílají z `app.jsx` přes helper `track(name, props)` (no-op, když skript nenaběhne / je blokovaný adblockem). Web je v podstatě jedna stránka a priority/kandidáti se otevírají v draweru/modálu **bez změny URL**, takže bez těchto událostí by se prokliky nezměřily.

### Události, které se posílají

| Událost (event name) | Kdy | Poznámka |
|---|---|---|
| `Priorita: <název priority>` | otevření karty priority | 10 samostatných událostí, název = titulek priority |
| `Kandidát otevřen` | otevření medailonku kandidáta | jméno je v props (rozpad jen na Business tarifu) |
| `Hero CTA: Priority` / `Hero CTA: Tým` | klik na tlačítka v Hero | |
| `Social: Facebook` / `Social: Instagram` | klik na ikony v navigaci | **zatím se neposílá** — ikony jsou do doby, než budou reálné profily, z navigace odstraněné |
| `Kontakt e-mail` | klik na kontaktní e-mail | |

### Co je potřeba udělat v účtu Plausible (jednorázově, ruční)

1. Založit účet, přidat web **`ricanysrdcem.cz`**, zvolit tarif (základní **Growth** stačí).
2. V **Site Settings → Goals → + Add goal → Custom event** přidat tyto názvy (musí sedět **přesně**, jinak se událost nezobrazí):
   - `Priorita: Otevřená a naslouchající radnice`
   - `Priorita: Transparentní a digitální radnice`
   - `Priorita: Koncepční rozvoj dopravy na základě dat`
   - `Priorita: Klidnější centrum díky jižnímu obchvatu`
   - `Priorita: Město bez bariér pro každého`
   - `Priorita: Moderní a dostupné sociální služby`
   - `Priorita: Zelené město odolné proti horku`
   - `Priorita: Živý veřejný prostor`
   - `Priorita: Kvalita od školky po školu`
   - `Priorita: Podpora místních podnikatelů`
   - `Kandidát otevřen`
   - `Hero CTA: Priority`
   - `Hero CTA: Tým`
   - `Social: Facebook` *(až budou ikony zpět v navigaci)*
   - `Social: Instagram` *(dtto)*
   - `Kontakt e-mail`

> ⚠️ Názvy priorit v událostech = titulky z `data.js`. **Když prioritu přejmenuješ** (např. při importu z Confluence), uprav i název odpovídajícího goalu v Plausible (nebo přidej nový). Aktuální titulky ověříš příkazem z [kontroly po importu](#kontrola-po-importu).

> Rozpad `Kandidát otevřen` podle konkrétního jména (a property-rozpady obecně) je až na tarifu **Business**; na Growth uvidíš souhrnné počty. Prokliky priorit fungují na Growth plně, protože název je přímo v události.

---

## Limity a doporučené délky textů

Ucelená verze tohoto je v chatu, tady stručná tabulka:

| Pole | Ideální | Maximum |
|---|---|---|
| `leader.intro` (úvodní slovo) | 60–75 slov | 100 slov |
| `priority.title` (název) | 3–5 slov | 6 slov |
| `priority.lead` (anotace) | 12–18 slov | 25 slov |
| `priority.sections` (hlavní text celkem) | 250–400 slov | 600 slov |
| Jeden odstavec | 30–70 slov | 100 slov |
| Subnadpis | 2–5 slov | — |
| `leader.bio` (medailonek lídryně) | 120–170 slov | 180 slov |
| `top6[].bio` / `rest[].bio` | 80–110 slov | 130 slov |

**Medailonky chodí různě dlouhé, takže se jim modal přizpůsobuje** — podle počtu slov přepne mezi třemi velikostmi (`MemberModal` v `app.jsx` nasadí třídu, zbytek je CSS v `index.html`):

| Délka `bio` | Třída | Šířka modalu | Sloupec s fotkou |
|---|---|---|---|
| do 70 slov | — | 720 px | 220 px |
| 71–130 slov | `is-long` | 900 px | 270 px |
| 131+ slov | `is-xlong` | 1040 px | 340 px |

Prahy jsou nastavené podle **reálné délky finálních medailonků**: kandidáti č. 2–10 mají 82–113 slov, takže padnou všichni do `is-long` a při proklikávání týmu se modal nezvětšuje a nezmenšuje. Lídryně má 160 slov a je jediná v `is-xlong`.

Dvě věci, které prahy hlídají:

- **Délka řádku ~60–70 znaků.** Kdyby se dlouhý text nechal v úzkém sloupci vedle malé fotky, naroste do 20+ řádků; naopak roztažený přes celý široký modal by měl přes 90 znaků na řádek.
- **Výška textu vs. fotky.** U finálních textů je text o 64–133 px vyšší než fotka, takže vlevo dole nezůstává velká díra.

Nad ~180 slov (na mobilu dřív) se modal začne rolovat — křížek je sticky, takže zůstává po ruce, ale text už fotku vizuálně přebíjí; tam je lepší medailonek zkrátit. Delší text se dobře čte rozdělený na odstavce: v `data.js` je stačí oddělit prázdným řádkem (`\n\n`).

---

## Plány do budoucna

Seřazeno přibližně podle priority:

- [x] **Reálné texty priorit** z Confluence (Rovo MCP) — všech 10 nahráno
- [x] **Medailonky** z Confluence — finální verze všech top10 včetně lídryně
- [x] **Reálné fotky top10** — top7 ze studia (transparentní WebP), č. 8–10 vlastní (JPG)
- [ ] **Reálné URL Facebooku a Instagramu** v navigaci — **jediná otevřená věc z obsahu**, viz [Ikony sociálních sítí](#ikony-sociálních-sítí-dočasně-vypnuté)
- [x] **Kontaktní e‑mail** — sekce *Kontakt* odkazuje na `info@ricanysrdcem.cz`
- [x] **OG image + SEO meta** — `assets/og-image.png` (1200×630) + description / OG / Twitter meta v `index.html`
- [x] **Sitemap.xml + robots.txt** pro produkci
- [ ] **Registrace v Google Search Console + Bing Webmaster Tools** (mimo repo, viz [Co zbývá udělat ručně](#co-zbývá-udělat-ručně-mimo-repo))
- [x] **Analytics** — nasazen **Plausible** (cookieless, EU), viz [Analytics (Plausible)](#analytics-plausible)
- [x] **Cookie banner** — **není potřeba**, Plausible je cookieless (žádné cookies ani localStorage)
- [ ] **Lightoptimalizace** — náhrada Babelu z CDN buildovaným bundlem (Vite + esbuild). React/ReactDOM už jedou v produkčním buildu, největší zbytek je Babel standalone (~3 MB), který v prohlížeči překládá `app.jsx` za běhu.
- [x] **Image lazy loading** — `loading="lazy"` na fotkách týmu a obrázcích v draweru; Hero fotka má `fetchpriority="high"` a `width`/`height` (rezervuje místo, žádný layout shift)
- [ ] **`srcset`/`sizes`** pro responsivní fotky — na mobilu se pořád stahuje plná velikost (kolečko 150 px dostane 800px zdroj)
- [ ] **A11y audit** — kontrast, focus states, aria atributy, screen reader test (hotové dílčí věci: dotykový cíl hamburgeru 44×44, `prefers-reduced-motion`)
- [ ] **Lighthouse score** ≥ 95 ve všech kategoriích
- [ ] **Error/404 stránka** s odkazem zpět
- [ ] **Cross‑browser test** — Chrome / Firefox / Safari / mobilní Safari + Chrome (automatizovaně proběhl Chromium desktop 1440×900 i mobil 390×844)
- [ ] Připravit „post‑volební" verzi stránky (poděkování, výsledky, …) — minimálně hrubá šablona, ať není tlak po volbách

---

## Cutover z teaseru na finální web (hotovo)

Přepnutí `ricanysrdcem.cz` z teaseru na finální stránku proběhlo **4. 8. 2026**. Původní teaser i heslem chráněný náhled `/preview` tím zanikly; obojí zůstává v gitu (commit před cutoverem).

### Co se udělalo v repu
- [x] `preview/index.html` → root `index.html` (teaser smazán); Plausible skript je ve výsledku **právě jednou**
- [x] `preview/app.jsx` → `app.jsx`, `preview/data.js` → `data.js`, `preview/photos/` → `photos/`, `preview/uploads/` → `uploads/`, loga → `assets/`
- [x] Všechny absolutní cesty přepsané `/preview/…` → `/…` (`app.jsx`, `data.js`, `index.html`)
- [x] **Ikony FB/IG odstraněné** z navigace — vedly na `#`; CSS i eventy zůstávají připravené
- [x] Smazaný `middleware.js` (gate na `/preview`)
- [x] Odstraněné `<meta name="robots" content="noindex, nofollow">`
- [x] Doplněné `description`, `canonical`, OG a Twitter meta + `assets/og-image.png` (1200×630, generuje `tools/make-og-image.mjs`)
- [x] `robots.txt` (povoluje indexaci, odkazuje na sitemapu) a `sitemap.xml`
- [x] `.vercelignore` — README, `tools/` a `uploads/` se na web nenasazují (surové fotky byly dřív schované za heslem, teď by jinak visely veřejně)
- [x] React + ReactDOM přepnuté z `development` na **produkční** build (`*.production.min.js`) vč. přepočítaných SRI hashů
- [x] Opravená mobilní navigace — zavřené menu prosvítalo pod hlavičkou (padding/border se nepočítají do `max-height: 0`)
- [x] `package.json` **ponechán** — Vercel podle něj projekt detekuje, deps žádné nemá

### Co se ověřilo (Chromium, desktop 1440×900 + mobil 390×844)
- [x] Stránka se vykreslí, **žádná chyba v konzoli**, žádný request se statusem 4xx/5xx
- [x] Všechny obrázky se načtou (10 portrétů, logo, obě loga stran) — žádné `naturalWidth === 0`
- [x] 10 priorit, karta lídryně, 6 karet, 14 řádků dalších kandidátů, z toho 3 klikací (č. 8–10)
- [x] Drawer priority se otevře a zavře ESC; modal kandidáta se zavře ESC i klikem mimo
- [x] Kotvy `#priority`, `#tym`, `#kontakt` scrollují; mobilní menu se po kliku zavře
- [x] Žádné horizontální přetečení (desktop i mobil)
- [x] V DOM nezůstal **žádný odkaz na `#`** ani zbytek `.nav-social`
- [x] Plausible skript právě jednou, `<meta name="robots">` pryč, titulek stránky finální

> Test běžel proti lokálnímu `python3 -m http.server` s podstrčenými soubory z CDN (unpkg je ze sandboxu nedostupný). Že SRI hashe sedí, potvrdilo právě to, že se stránka s podstrčenými soubory vykreslila.

### Co zbývá udělat ručně (mimo repo)
- [ ] **Ve Vercelu smazat env var `PREVIEW_PASSWORD`** (a `PREVIEW_SECRET`, pokud byla) — bez middlewaru už nic nedělají
- [ ] Otestovat `ricanysrdcem.cz` v inkognito okně; v *DevTools → Network* ověřit request na `plausible.io/api/event` (202) a v Plausible *Realtime* živého návštěvníka
- [ ] Submit `sitemap.xml` do **Google Search Console** + Bing Webmaster Tools
- [ ] Ověřit náhled odkazu ve **Facebook Sharing Debugger** / Twitter Card Validator (OG image je `https://ricanysrdcem.cz/assets/og-image.png`)
- [ ] Případný **git tag** `v-pre-launch` na commitu **před** cutoverem, kdyby byl potřeba rychlý rollback
- [ ] Korektura jazyka (překlepy, interpunkce) a kontrola oficiálních verzí log stran ve footeru — obsahové, ne technické

### Co NEŘEŠIT (Vercel to dělá za nás)
- ✓ HTTPS / SSL certifikát (Let's Encrypt, auto‑renewal)
- ✓ CDN / edge caching
- ✓ HTTP/2 + HTTP/3
- ✓ Brotli komprese statiky

---

## Užitečné příkazy

```sh
# Lokální náhled (statika, stačí cokoli, co servíruje aktuální adresář)
python3 -m http.server 8765     # → http://127.0.0.1:8765/
npx serve .                     # alternativa

# Regenerace OG image (viz hlavička skriptu, potřebuje Playwright + Chromium)
node tools/make-og-image.mjs

# Manuální deploy přes Vercel CLI (jindy GitHub push stačí)
npx vercel --prod
```

> Stránka tahá React a Babel z unpkg.com a fonty z Google Fonts — lokální náhled proto potřebuje internet.

---

## Kontext pro budoucí session / dev

- Repo je na GitHubu jako `jgillern/ricanysrdcem`, branch **`claude/implement-ricany-teaser-QFIUX`**
- Žádný build pipeline, žádné `node_modules` — `package.json` je jen marker, aby Vercel projekt detekoval
- Při změně `data.js` / `app.jsx` / `index.html` v rootu se automaticky redeployne
- Pillow + python‑docx nainstalované v sandbox prostředí pro foto/Word pipeline (bude se reinstalovat při každé nové session)
- **Hlavní reference:** tento README + chat historie. Pokud něco nedává smysl, podívat se na commit history (`git log --oneline`) — commit messages popisují, co se dělalo a proč.
