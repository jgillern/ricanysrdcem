# Říčany srdcem — web kandidátky

Volební web pro **komunální volby v Říčanech 9.–10. října 2026**. Kandidátka **Říčany srdcem** = společný projekt **TOP 09**, **KDU·ČSL** a nezávislých kandidátů.

- **Doména:** [ricanysrdcem.cz](https://ricanysrdcem.cz) (registrátor: forpsi.com)
- **Hosting:** Vercel (deployment z GitHub repa, branch `claude/implement-ricany-teaser-QFIUX`)
- **Veřejná stránka (`/`):** teaser „Již brzy" s pulzujícím srdcem a countdownem
- **Náhled finální stránky (`/preview`):** chráněný heslem `Volby2026!`

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
14. [Checklist pro spuštění do produkce](#checklist-pro-spuštění-do-produkce)

---

## Aktuální stav

| URL | Co je tam | Přístup |
|---|---|---|
| `ricanysrdcem.cz/` | **Teaser** — pulzující srdce, datum voleb, countdown | veřejné |
| `ricanysrdcem.cz/preview` | **Plnohodnotný náhled** finálního webu (Hero, Priority, Tým, Footer) | heslo `Volby2026!` (jen heslo, jméno se ignoruje) |
| `ricanysrdcem.cz/preview/login` | login form pro `/preview` | volné GET, POST validuje heslo |

Obsah na `/preview` je reálný a finální — priority, seznam kandidátů, fotky i medailonky top10. Co zbývá dodělat, je v [Plánech do budoucna](#plány-do-budoucna) (hlavně reálné odkazy na FB/IG a SEO před spuštěním).

---

## Struktura repa

```
/
├── README.md                  # tento dokument
├── index.html                 # teaser stránka (veřejná)
├── middleware.js              # Vercel Edge Middleware — gate na /preview
├── package.json               # marker pro Vercel, žádné deps
├── ttpa/                      # prohlášení o transparentnosti (nařízení EU 2024/900)
│   ├── rengl.pdf              # → ricanysrdcem.cz/ttpa/rengl.pdf
│   └── maks.pdf               # → ricanysrdcem.cz/ttpa/maks.pdf
├── brand/                     # logo v křivkách (SVG/PDF/PNG) + manuál, viz brand/README.md
├── tools/                     # pomocné skripty (nejsou součástí webu)
│   ├── process-photos.py      # ořez fotek kandidátů 8+ na 4:5 → preview/photos/
│   └── gen_logo.py, export_logo.py
└── preview/
    ├── index.html             # shell stránky (CSS, React+Babel CDN, mount point)
    ├── app.jsx                # React komponenty (Nav, Hero, Priorities, Team, Footer …)
    ├── data.js                # veškerý obsah (window.RS_DATA)
    ├── photos/                # hotové portréty použité na webu (<id>.webp / <id>.jpg)
    ├── uploads/               # surové fotky, ze kterých se ty hotové generují
    ├── logo-new.webp          # logo v navigaci
    ├── top09.png              # logo TOP 09 (footer)
    └── lidovci_logo_rgb_black-kdu.svg   # logo KDU·ČSL (footer)
```

**Žádný build krok** — soubory se servírují přímo Vercelem jako statika; React/Babel se načítají z CDN, JSX se transformuje za běhu v prohlížeči (vhodné pro tuto velikost projektu, viz [Plány do budoucna](#plány-do-budoucna)).

---

## Architektura

### Teaser (`/`)

- Plain HTML/CSS/JS, žádný framework
- Pulzující červené srdce s datem voleb („Komunální volby / 9.–10. října 2026")
- Tagline + živý countdown (cíl 2026‑10‑09 14:00 CEST)
- Favicon je inline SVG srdce (data URI)

### Náhled (`/preview/*`)

Render flow:
1. `preview/index.html` načte CSS, fonty (PT Serif + PT Sans), React + ReactDOM + Babel z unpkg CDN
2. Inline `<script>` nastaví `--heart-mask` data URI pro CSS masku srdce
3. `data.js` (plain JS) nastaví `window.RS_DATA = {...}`
4. `app.jsx` (`type="text/babel"`) je za běhu transformován Babelem a mountovaný do `<div id="app">`

**Komponenty v `app.jsx`:**
| Komponenta | Účel |
|---|---|
| `Nav` | Sticky horní lišta — logo, scroll spy, hamburger menu, ikony FB+IG |
| `Hero` | „Říčany srdcem", úvodní slovo lídryně, fotka, dvě CTA (priority / tým) |
| `Priorities` + `PriorityCard` | Mřížka 10 karet (číslo, titulek, anotace) |
| `PriorityDrawer` | Pravostranný drawer s detailem priority (head fixed, body scrolluje) |
| `Team` + `TeamCardLeader` + `TeamCard` + `TeamRow` | Velká karta lídryně, grid kandidátů 2–7, řádkový list 8–21 (řádky 8–10 jsou klikací — mají fotku/medailonek) |
| `MemberModal` | Centrovaný modal s portrétem + medailonkem |
| `Footer` | „Společná kandidátka [TOP 09] [KDU·ČSL] a nezávislých kandidátů" |

**Helper `renderRichText`** rozparsuje markdown‑style `**bold**` v textu odstavců na `<strong>`.

### Auth (`/preview` gate)

Implementace v `middleware.js` (Vercel Edge Middleware, runtime Web API):

1. **Matcher** — middleware běží jen na `/preview` a `/preview/:path*`
2. **GET bez cookie** → vrátí inline HTML formulář (jediné pole *Heslo*)
3. **POST `/preview/login`** → ověří heslo proti `process.env.PREVIEW_PASSWORD`
4. Při úspěchu vystaví **HttpOnly Secure SameSite=Lax cookie** `rs_preview=<timestamp>.<hmac>` s `Path=/preview` a `Max-Age=30 dní`
5. **HMAC SHA‑256** podpis přes `crypto.subtle.sign`, klíč z `PREVIEW_SECRET` (fallback `PREVIEW_PASSWORD`)
6. Při dalším requestu middleware ověří podpis i stáří cookie a buď pustí dál, nebo znova vykreslí login formulář

**Env vary na Vercelu** (Project → Settings → Environment Variables):
- `PREVIEW_PASSWORD` (povinné) — aktuálně `Volby2026!`
- `PREVIEW_SECRET` (volitelné) — separátní HMAC klíč; pokud není, použije se `PREVIEW_PASSWORD` (změnou hesla pak invaliduješ všechny existující sessiony)

---

## Datový model

Vše v `preview/data.js` jako `window.RS_DATA`. Struktura:

```js
window.RS_DATA = {
  leader: {
    id:    'eva-novakova',
    name:  'Eva Nováková',                                // bez titulů
    role:  'Lídryně kandidátky',                            // bez „kandidátka na starostku“ — tak jsme se dohodli
    job:   'ředitelka neziskové organizace',              // 1-4 slova malými písmeny
    photo: 'URL nebo /preview/photos/...',                // výchozí 4:5 portrét — použije se všude, kde není override
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
            'Text odstavce **s tučnou částí** uprostřed.',  // string s markdown bold
          ]
        },
        {
          heading: 'Subnadpis sekce',
          paragraphs: [
            'První odstavec…',
            {
              image:   '/preview/images/foto.jpg',          // OBRÁZEK uprostřed textu
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
- Markdown `**bold**` funguje **jen v `paragraphs` priority drawer** (ne v `lead`, `bio`, `intro`)

---

## Jak měnit obsah

Pro 95 % změn stačí editovat **`preview/data.js`** a pushnout. Vercel zdetekuje commit a redeployne (~30 s).

**Pár pravidel:**
- Zachovat strukturu klíčů (`leader`, `top6`, `rest`, `priorities`)
- Zachovat počet kandidátů (1 + 6 + 14 = **21**, nebo upravit i v komentáři)
- Zachovat počet priorit (**10**) — design počítá s 2×5 mřížkou
- Texty s česktými uvozovkami (`„…"`), em‑dash (`—`), nebreakovatelnou mezerou (` `) tam, kde nemá zlomit
- Foto URL může být absolutní (https://…) nebo relativní (`/preview/photos/jmeno.png`)

**Strukturální změny** (komponenty, layout, animace) se dělají v `preview/app.jsx` + CSS v `preview/index.html`.

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

Surové fotky patří do `preview/uploads/` pod názvem `<id>-raw.jpg` (`<id>` = `id` kandidáta z `data.js`), hotové do `preview/photos/`.

**Pro kandidáty 8+** je na to skript `tools/process-photos.py` (Python + Pillow) — ořízne na 4:5, zmenší na 600 × 750 px a uloží jako JPEG:

```sh
pip install Pillow
python3 tools/process-photos.py preview/uploads/dominik-bren-raw.jpg dominik-bren
# volitelně: --face-x 0.48 (vodorovný střed obličeje) a --top 0.3 (svislé posazení výřezu)
```

Pak už jen doplnit `photo: '/preview/photos/<id>.jpg'` do `data.js`.

**Pro top7** (ateliér, odebrané pozadí) skript není — vznikaly zvlášť přes [`rembg`](https://github.com/danielgatis/rembg), postup níže:

**Pro top7:**
1. Odebrání pozadí přes [`rembg`](https://github.com/danielgatis/rembg) → transparentní PNG
2. Detekce obličeje pro chytrý crop (hlava do horní třetiny)
3. Crop na poměr **4:5**
4. Resize do tří velikostí:
   - lídryně Hero: **1200 × 1500 px** → `leader-hero.webp` (`leader.photoHero`)
   - lídryně tým: **800 × 1000 px** → `leader-team.webp` (`leader.photoTeam`)
   - top6: **800 × 1000 px** (grid)
5. Uložení do `preview/photos/<id>.webp` (transparentní WebP — alfa kanál jako PNG, ale ~10× menší; `<img src>` ho bere ve všech moderních prohlížečích, projekt už WebP používá i pro logo)

### Obrázky uvnitř priorit

Drop do `preview/images/` jako JPG/WebP, šířka ≥ 1200 px, poměr 16:9 nebo 3:2. Reference v `data.js` jako `image: '/preview/images/<nazev>.jpg'`.

---

## Import textů priorit z Confluence (Rovo MCP)

**Toto je standardní (primární) způsob aktualizace textů priorit.** Finální texty priorit píší autoři v Confluence; odtud je taháme přes **Atlassian Rovo MCP** konektor a mapujeme do pole `priorities` v `preview/data.js`.

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
| **Tučné** (Ctrl+B) | markdown `**…**` v `paragraphs` |

**Co se do webu nepřenáší / vynechává:**
- řádky **Garant / Autor** a `@zmínky` nahoře (interní metadata)
- autorské poznámky a otázky vložené do textu (např. „Funguje to takhle?")
- obrázky vložené jen jako interní `blob:` URL z editoru — nejsou veřejně dostupné; obrázek je potřeba zvlášť exportovat do `preview/images/` a doplnit ručně (viz [Obrázky uvnitř priorit](#obrázky-uvnitř-priorit))

### Pravidla pro tučné zvýraznění

Tučné z Confluence **nepřebírej jedna ku jedné.** Každou prioritu píše někdo jiný, takže syrové tučné kolísá od nuly po deset zvýraznění na prioritu a v draweru to pak působí nahodile. Při importu ho srovnej na tato pravidla:

1. **Tučně jen název konkrétního opatření, nástroje nebo pravidla** — jmenná fráze do ~6 slov (`centrální databáze projektů`, `program adopce předzahrádek`, `Plán udržitelné městské mobility`). Ne slovesná fráze („zapojíme hned na samém začátku"), ne celá věta, ne obecný princip.
2. **Nejvýš jedno tučné na odstavec.** Když jich autor nabízí víc, vyhrává to nejkonkrétnější; u pojmenovaných programů („Překvapte Říčany 2.0", Datová výzva Říčany) vyhrává název.
3. **V úvodním odstavci** (`heading: null`) se netučňuje — je to shrnutí priority, ne výčet opatření.
4. **Cíl 3–6 tučných na prioritu.** Sekce, která žádné konkrétní opatření nepojmenovává, klidně zůstane bez tučného; naopak priorita bez jediného zvýraznění vypadá vedle ostatních plochá — tam nějaké doplň.

Kontrola po importu:

```sh
node -e 'global.window={}; require("./preview/data.js");
  global.window.RS_DATA.priorities.forEach(p => {
    let n = 0;
    p.sections.forEach((s, si) => s.paragraphs.forEach(x => {
      if (typeof x !== "string") return;
      const m = x.match(/\*\*[^*]+\*\*/g) || []; n += m.length;
      if (m.length > 1) console.log("p" + p.n + ": víc tučných v jednom odstavci");
      if (m.length && si === 0 && !s.heading) console.log("p" + p.n + ": tučné v úvodním odstavci");
    }));
    console.log("p" + p.n + " → " + n + (n < 3 || n > 6 ? "  ← mimo rozsah 3–6" : ""));
  });'
```

### Postup (krok za krokem)

1. **Ověř dostupnost Rovo MCP** — musí být k dispozici nástroje `mcp__Atlassian_Rovo__*` (Confluence). Pokud nejsou, dál nepokračuj naslepo.
2. **Vylistuj podstránky** — `getConfluencePageDescendants` na `pageId: 71204865` (`cloudId: top09ricany.atlassian.net`), `depth: 1`.
3. **Stáhni obsah** každé podstránky přes `getConfluencePage` s `contentFormat: "markdown"` a urči, které jsou vyplněné.
4. **Namapuj** obsah na strukturu z [Datového modelu](#datový-model): `title`, `lead`, `sections[].{heading, paragraphs}`. Pořadí `n` podle `childPosition`.
5. **Typografie:** české uvozovky `„…"`, em‑dash `—`, nezalomitelná mezera (` `, U+00A0) po jednopísmenných předložkách/spojkách (`k s v z o u a i`). Nezalomitelnou mezeru aplikuj **jen v upravovaných prioritách**, ať nevzniká šum v nezměněných částech souboru.
6. **Srovnej tučné** podle [pravidel výše](#pravidla-pro-tučné-zvýraznění) — syrové tučné z Confluence se nepřebírá.
7. **Zachovej všech 10 položek** v `priorities` — měň jen vyplněné, prázdné nech jako placeholder.
8. **Commit + push** na pracovní branch (`git push -u origin <branch>`), **bez** otevírání PR, pokud o něj není výslovně požádáno. Do commit message stručně, které priority se nahrály.
9. **Reportuj** zpět: které priority naplněné, které zůstaly placeholder, a cokoliv, co v Confluence chybělo nebo nešlo jednoznačně namapovat (chybějící anotace, 2větné `lead`, garbled text, vynechané obrázky/poznámky, drobné opravené překlepy).

### Kontrola po importu

```sh
# Ověření, že data.js je validní a má 10 priorit
node -e 'global.window={}; require("./preview/data.js");
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
node -e 'global.window={}; require("./preview/data.js");
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

### Proč `ttpa/` v rootu

- **Odkazy jsou stabilní přes celý životní cyklus webu.** Cesta `/ttpa/…` žije v rootu repa, **mimo** teaser (`index.html`) i náhled (`preview/`). [Cutover z teaseru na finální web](#checklist-pro-spuštění-do-produkce) se složky `ttpa/` **vůbec nedotkne** — URL na letácích tak fungují dnes i po přepnutí, **bez jakékoli úpravy**.
- **Middleware je mimo hru.** `middleware.js` má matcher jen na `/preview` — `/ttpa/*` není heslem chráněné, je veřejně dostupné (tak to má být).

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

- **Skript** (`<script defer data-domain="ricanysrdcem.cz" src="https://plausible.io/js/script.js">`) je v `<head>` obou stránek — `index.html` (teaser) i `preview/index.html`. Na `/preview` je navíc inicializační fronta pro `window.plausible`.
- **Custom events** se posílají z `preview/app.jsx` přes helper `track(name, props)` (no-op, když skript nenaběhne / je blokovaný adblockem). Web je v podstatě jedna stránka a priority/kandidáti se otevírají v draweru/modálu **bez změny URL**, takže bez těchto událostí by se prokliky nezměřily.

### Události, které se posílají

| Událost (event name) | Kdy | Poznámka |
|---|---|---|
| `Priorita: <název priority>` | otevření karty priority | 10 samostatných událostí, název = titulek priority |
| `Kandidát otevřen` | otevření medailonku kandidáta | jméno je v props (rozpad jen na Business tarifu) |
| `Hero CTA: Priority` / `Hero CTA: Tým` | klik na tlačítka v Hero | |
| `Social: Facebook` / `Social: Instagram` | klik na ikony v navigaci | funguje i po doplnění reálných URL |
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
   - `Social: Facebook`
   - `Social: Instagram`
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

**Medailonky chodí různě dlouhé, takže se jim modal přizpůsobuje** — podle počtu slov přepne mezi třemi velikostmi (`MemberModal` v `app.jsx` nasadí třídu, zbytek je CSS v `preview/index.html`):

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
- [ ] **Reálné URL Facebooku a Instagramu** v navigaci
- [ ] **Kontaktní e‑mail** (kontaktní sekce nebo footer)
- [ ] **OG image + SEO meta** pro náhled na sociálních sítích (1200×630, srdce + nadpis)
- [ ] **Sitemap.xml + robots.txt** pro produkci
- [x] **Analytics** — nasazen **Plausible** (cookieless, EU) na teaseru i `/preview`, viz [Analytics (Plausible)](#analytics-plausible)
- [x] **Cookie banner** — **není potřeba**, Plausible je cookieless (žádné cookies ani localStorage)
- [ ] **Lightoptimalizace** — náhrada React+Babel CDN za buildovaný bundle (Vite + esbuild) — sníží time‑to‑interactive z ~1.5s na ~200ms
- [ ] **Image lazy loading** + `srcset`/`sizes` pro responsivní fotky
- [ ] **A11y audit** — kontrast, focus states, aria atributy, screen reader test
- [ ] **Lighthouse score** ≥ 95 ve všech kategoriích
- [ ] **Error/404 stránka** s odkazem zpět
- [ ] **Cross‑browser test** — Chrome / Firefox / Safari / mobilní Safari + Chrome

---

## Checklist pro spuštění do produkce

Až dorazí čas přepnout `ricanysrdcem.cz` z teaseru na finální stránku (cca pár měsíců před volbami):

### Příprava obsahu
- [x] Medailonky top10 — viz [Import medailonků](#import-medailonků-z-confluence)
- [x] Fotky top10 v `preview/photos/` (od č. 11 se fotky ani medailonky nedělají)
- [ ] Reálné URL u FB/IG ikon v `app.jsx` (Nav komponenta)
- [ ] Kontaktní e‑mail doplněn (footer / kontaktní sekce)
- [ ] Termíny voleb (9.–10. října 2026) zkontrolované všude (Hero kicker, Footer)
- [ ] Logy stran ve footeru ověřené (oficiální verze)
- [ ] Korektura jazyka — překlepy, interpunkce, jednotnost stylu

### Technická příprava
- [ ] Otestováno na **mobilu** (Safari iOS, Chrome Android) i **desktopu** (Chrome, Firefox, Safari)
- [ ] Drawer scrolluje hladce i při dlouhém obsahu na mobilu
- [ ] Modal se zavírá ESC i klikem mimo
- [ ] Všechny obrázky se načítají (žádné 404)
- [ ] Všechny interní kotvy (`#uvod`, `#priority`, `#tym`) scrollují správně
- [ ] Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO)

### SEO + analytics
- [ ] **Odstranit `<meta name="robots" content="noindex, nofollow">`** v `preview/index.html`
- [ ] Doplnit `<meta name="description">`, OG/Twitter meta, OG image (1200×630)
- [ ] Vytvořit `robots.txt` (povolit indexaci)
- [ ] Vytvořit `sitemap.xml` (root, vč. `#priority`, `#tym`)
- [ ] Submit do Google Search Console + Bing Webmaster Tools
- [x] Přidat analytics — **Plausible** nasazen (cookieless, bez cookie banneru); zbývá jen založit účet + přidat goals, viz [Analytics (Plausible)](#analytics-plausible)

### Cutover (samotné přepnutí)
- [ ] **Git tag** `v-pre-launch` na aktuálním commitu (možnost rollbacku)
- [ ] Sloučit `preview/index.html` → root `index.html` (původní teaser zazálohovat jako `teaser.html` nebo smazat)
  - [ ] **Analytics:** ve výsledném `index.html` nechat Plausible skript **právě jednou** — bývalé `preview/index.html` ho už obsahuje (vč. inicializační fronty `window.plausible`), skript ze starého teaseru zmizí s ním. Ověřit, že tam není dvakrát.
- [ ] Updatovat všechny absolutní cesty v `app.jsx` a `data.js`: `/preview/...` → `/...`
  - [ ] **Analytics:** `src` Plausible skriptu je absolutní URL na `plausible.io` — přepisu cest se **netýká**, nech ho být. Custom events v `app.jsx` jsou nezávislé na cestě, taky se nemění.
- [ ] Přesunout `preview/app.jsx`, `preview/data.js`, `preview/photos/`, `preview/images/`, `preview/top09.png`, `preview/kducsl.png` do rootu nebo do `assets/`
- [ ] **Smazat `middleware.js`** (nebo upravit matcher na nějakou staging cestu, kdyby chtěl klient nadále mít heslem chráněnou „pracovní" verzi)
- [ ] **Smazat env var `PREVIEW_PASSWORD`** ve Vercelu (a `PREVIEW_SECRET`, pokud byla)
- [ ] Smazat `package.json` (pokud nebudou potřeba další build dependencies)
- [ ] Push do `main` (nebo merge `claude/...` → `main`) a redeploy
- [ ] Otestovat `ricanysrdcem.cz` v inkognito okně (žádné cache, žádné cookie)
  - [ ] **Analytics:** v *DevTools → Network* ověřit request na `plausible.io/api/event` (status 202) a v Plausible *Realtime* živého návštěvníka; kliknout na prioritu a ověřit, že dorazí event `Priorita: …`.

### Po spuštění
- [ ] Na sociálních sítích sdílet odkaz a ověřit OG preview (Facebook Sharing Debugger, Twitter Card Validator)
- [ ] Sledovat Vercel Analytics nebo Plausible pro chyby a anomálie
- [ ] **Analytics — kontinuita dat:** `data-domain` zůstává `ricanysrdcem.cz`, takže historie navazuje. V „Top Pages" se návštěvy jen přesunou z `/preview` na `/` (cíle/prokliky priorit jsou na cestě nezávislé, neutrpí). Pokud po cutoveru `/preview` úplně zanikne, přestane se do statistik počítat interní testovací provoz — čísla se tím zpřesní.
- [ ] Připravit „post‑volební" verzi stránky (poděkování, výsledky, …) — minimálně mít hrubou šablonu, ať není tlak po volbách

### Co NEŘEŠIT (Vercel to dělá za nás)
- ✓ HTTPS / SSL certifikát (Let's Encrypt, auto‑renewal)
- ✓ CDN / edge caching
- ✓ HTTP/2 + HTTP/3
- ✓ Brotli komprese statiky

---

## Užitečné příkazy

```sh
# Lokální preview (jen statika, bez middleware)
npx serve .

# Spustit s middlewarem lokálně (vyžaduje Vercel CLI)
npm i -g vercel
vercel dev
# … pak nastav PREVIEW_PASSWORD ve `.env.local`

# Manuální deploy přes Vercel CLI (jindy GitHub push stačí)
vercel --prod
```

---

## Kontext pro budoucí session / dev

- Repo je na GitHubu jako `jgillern/ricanysrdcem`, branch **`claude/implement-ricany-teaser-QFIUX`**
- Žádný build pipeline, žádné `node_modules` — `package.json` existuje jen aby Vercel zaregistroval middleware
- Při změně `data.js` / `app.jsx` / `index.html` v `preview/` se automaticky redeployne
- Pillow + python‑docx nainstalované v sandbox prostředí pro foto/Word pipeline (bude se reinstalovat při každé nové session)
- **Hlavní reference:** tento README + chat historie. Pokud něco nedává smysl, podívat se na commit history (`git log --oneline`) — commit messages popisují, co se dělalo a proč.
