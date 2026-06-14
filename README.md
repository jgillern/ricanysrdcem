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
8. [Import textů z Wordu](#import-textů-z-wordu)
9. [Limity a doporučené délky textů](#limity-a-doporučené-délky-textů)
10. [Plány do budoucna](#plány-do-budoucna)
11. [Checklist pro spuštění do produkce](#checklist-pro-spuštění-do-produkce)

---

## Aktuální stav

| URL | Co je tam | Přístup |
|---|---|---|
| `ricanysrdcem.cz/` | **Teaser** — pulzující srdce, datum voleb, countdown | veřejné |
| `ricanysrdcem.cz/preview` | **Plnohodnotný náhled** finálního webu (Hero, Priority, Tým, Footer) | heslo `Volby2026!` (jen heslo, jméno se ignoruje) |
| `ricanysrdcem.cz/preview/login` | login form pro `/preview` | volné GET, POST validuje heslo |

Všechen finální obsah na `/preview` je zatím **placeholder** (Lorem ipsum, fiktivní jména, Unsplash fotky). Reálné texty + fotky doplníme později.

---

## Struktura repa

```
/
├── README.md                  # tento dokument
├── index.html                 # teaser stránka (veřejná)
├── middleware.js              # Vercel Edge Middleware — gate na /preview
├── package.json               # marker pro Vercel, žádné deps
└── preview/
    ├── index.html             # shell stránky (CSS, React+Babel CDN, mount point)
    ├── app.jsx                # React komponenty (Nav, Hero, Priorities, Team, Footer …)
    ├── data.js                # veškerý obsah (window.RS_DATA)
    ├── top09.png              # logo TOP 09 (footer)
    └── kducsl.png             # logo KDU·ČSL (footer)
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
| `Team` + `TeamCardLeader` + `TeamCard` + `TeamRow` | Velká karta lídryně, grid kandidátů 2–7, řádkový list 8–21 |
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
    role:  'Lídryně kandidátky · kandidátka na starostku',
    job:   'ředitelka neziskové organizace',              // 1-4 slova malými písmeny
    photo: 'URL nebo /preview/photos/...',                // výchozí 4:5 portrét — použije se všude, kde není override
    photoHero: '...',                                      // VOLITELNÉ — fotka jen pro Hero (úvod)
    photoTeam: '...',                                      // VOLITELNÉ — fotka jen pro kartu v Týmu + modal
    bio:   '...',                                          // medailonek v modálu, 3-4 věty
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
      photo: '...'                                          // jen pro modal, vlastní fotka kandidáta
      // bio může být prázdný — modal použije fallback text
    },
    // … kandidáti č. 9–21
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

### Co dorazí

| Skupina | Zdroj | Pozadí | Počet |
|---|---|---|---|
| Lídryně + top6 | Studio | bílé (čisté) | 7 |
| Kandidáti 8–21 | Vlastní | různé | 14 |

### Workflow při importu

Po dropnutí surových fotek do `preview/uploads/` napíšu skript `tools/process-photos.py` (Python + Pillow + rembg + face_recognition), který udělá:

**Pro top7:**
1. Odebrání pozadí přes [`rembg`](https://github.com/danielgatis/rembg) → transparentní PNG
2. Detekce obličeje pro chytrý crop (hlava do horní třetiny)
3. Crop na poměr **4:5**
4. Resize do tří velikostí:
   - lídryně: **1200 × 1500 px** (Hero)
   - top6: **800 × 1000 px** (grid)
5. Uložení do `preview/photos/<id>.png` (transparentní)

**Pro kandidáty 8–21:**
1. Auto‑crop na **4:5** (přes střed nebo s detekcí obličeje, pokud je rozpoznatelný)
2. Resize na **600 × 750 px**
3. Uložení do `preview/photos/<id>.jpg` (zachovat původní pozadí, modal má bílou kartu)

**Pak:** update cest v `data.js` z Unsplash placeholderů na `/preview/photos/<id>.{png,jpg}`.

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

### Postup (krok za krokem)

1. **Ověř dostupnost Rovo MCP** — musí být k dispozici nástroje `mcp__Atlassian_Rovo__*` (Confluence). Pokud nejsou, dál nepokračuj naslepo.
2. **Vylistuj podstránky** — `getConfluencePageDescendants` na `pageId: 71204865` (`cloudId: top09ricany.atlassian.net`), `depth: 1`.
3. **Stáhni obsah** každé podstránky přes `getConfluencePage` s `contentFormat: "markdown"` a urči, které jsou vyplněné.
4. **Namapuj** obsah na strukturu z [Datového modelu](#datový-model): `title`, `lead`, `sections[].{heading, paragraphs}`. Pořadí `n` podle `childPosition`.
5. **Typografie:** české uvozovky `„…"`, em‑dash `—`, nezalomitelná mezera (` `, U+00A0) po jednopísmenných předložkách/spojkách (`k s v z o u a i`). Nezalomitelnou mezeru aplikuj **jen v upravovaných prioritách**, ať nevzniká šum v nezměněných částech souboru.
6. **Zachovej všech 10 položek** v `priorities` — měň jen vyplněné, prázdné nech jako placeholder.
7. **Commit + push** na pracovní branch (`git push -u origin <branch>`), **bez** otevírání PR, pokud o něj není výslovně požádáno. Do commit message stručně, které priority se nahrály.
8. **Reportuj** zpět: které priority naplněné, které zůstaly placeholder, a cokoliv, co v Confluence chybělo nebo nešlo jednoznačně namapovat (chybějící anotace, 2větné `lead`, garbled text, vynechané obrázky/poznámky, drobné opravené překlepy).

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
| `leader.bio` (medailonek lídryně) | 40–60 slov | 80 slov |
| `top6[].bio` / `rest[].bio` | 30–45 slov | 60 slov |

---

## Plány do budoucna

Seřazeno přibližně podle priority:

- [ ] **Reálné texty** priorit z Confluence (Rovo MCP), medailonky/úvod z Wordu
- [ ] **Reálné fotky** — top7 ze studia, ostatní vlastní (foto pipeline)
- [ ] **Reálné URL Facebooku a Instagramu** v navigaci
- [ ] **Kontaktní e‑mail** (kontaktní sekce nebo footer)
- [ ] **OG image + SEO meta** pro náhled na sociálních sítích (1200×630, srdce + nadpis)
- [ ] **Sitemap.xml + robots.txt** pro produkci
- [ ] **Analytics** — Plausible nebo Google Analytics 4 (s ohledem na GDPR)
- [ ] **Cookie banner**, pokud bude analytics nasazená
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
- [ ] Všechny placeholder texty (Lorem ipsum) přepsané reálnými
- [ ] Všechny placeholder fotky (Unsplash) nahrazené reálnými v `preview/photos/`
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
- [ ] Přidat analytics (Plausible doporučeno, GDPR friendly bez cookie banneru)

### Cutover (samotné přepnutí)
- [ ] **Git tag** `v-pre-launch` na aktuálním commitu (možnost rollbacku)
- [ ] Sloučit `preview/index.html` → root `index.html` (původní teaser zazálohovat jako `teaser.html` nebo smazat)
- [ ] Updatovat všechny absolutní cesty v `app.jsx` a `data.js`: `/preview/...` → `/...`
- [ ] Přesunout `preview/app.jsx`, `preview/data.js`, `preview/photos/`, `preview/images/`, `preview/top09.png`, `preview/kducsl.png` do rootu nebo do `assets/`
- [ ] **Smazat `middleware.js`** (nebo upravit matcher na nějakou staging cestu, kdyby chtěl klient nadále mít heslem chráněnou „pracovní" verzi)
- [ ] **Smazat env var `PREVIEW_PASSWORD`** ve Vercelu (a `PREVIEW_SECRET`, pokud byla)
- [ ] Smazat `package.json` (pokud nebudou potřeba další build dependencies)
- [ ] Push do `main` (nebo merge `claude/...` → `main`) a redeploy
- [ ] Otestovat `ricanysrdcem.cz` v inkognito okně (žádné cache, žádné cookie)

### Po spuštění
- [ ] Na sociálních sítích sdílet odkaz a ověřit OG preview (Facebook Sharing Debugger, Twitter Card Validator)
- [ ] Sledovat Vercel Analytics nebo Plausible pro chyby a anomálie
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
