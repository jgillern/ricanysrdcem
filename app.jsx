/* global React, ReactDOM */
const { useState, useEffect, useLayoutEffect, useRef } = React;
const D = window.RS_DATA;

// Plausible custom event (cookieless). No-op, pokud skript ještě nenaběhl nebo je blokovaný.
function track(name, props) {
  if (typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }
}

// Odskok na kotvu. Offset se měří z reálné výšky hlavičky — ta je jinak vysoká
// na mobilu a na desktopu, natvrdo zapsané číslo by část sekce schovalo pod ni.
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const nav = document.querySelector('.nav');
  const offset = (nav ? nav.offsetHeight : 80) + 12;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - offset,
    behavior: reduce ? 'auto' : 'smooth'
  });
}

// Sdílená mechanika „táhni a zavři" pro drawer i modal. Hook řeší jen
// rozpoznání gesta — osu, směr, prahy pro zavření. Jak prvek při tažení
// vypadá a co se stane po puštění, si každá komponenta říká sama
// v `paint` / `release`.
//
// Listenery se věší ručně, ne přes `onTouchMove`: React registruje touch
// handlery jako pasivní, takže by v nich `preventDefault()` mlčky nefungoval
// a stránka by při gestu zároveň scrollovala.
function useDragToDismiss(elRef, { active, axis, canDrag, paint, release }) {
  // Callbacky se mění s každým renderem; přes ref je efekt nemusí mít
  // v závislostech a listenery zůstávají navěšené po celou dobu gesta.
  const fns = useRef(null);
  fns.current = { canDrag, paint, release };

  useEffect(() => {
    const el = elRef.current;
    if (!el || !active) return;

    let startX = 0, startY = 0, startT = 0, dist = 0;
    let locked = false, tracking = false;

    const onStart = (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = Date.now();
      dist = 0; locked = false; tracking = true;
    };

    const onMove = (e) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      const along = axis === 'x' ? dx : dy;
      const across = axis === 'x' ? dy : dx;
      if (!locked) {
        // Směr se pozná až po pár pixelech, ať krátké ťuknutí nic nerozjede.
        if (Math.abs(along) < 8 && Math.abs(across) < 8) return;
        // Gesto napříč — nebo směr, který prvek zrovna nepřijímá — patří
        // prohlížeči (scroll uvnitř panelu).
        if (Math.abs(along) <= Math.abs(across) * 1.3 || !fns.current.canDrag(Math.sign(along))) {
          tracking = false;
          return;
        }
        locked = true;
        // Žádný `return` — prvek se má rozjet hned v tomhle gestu.
      }
      dist = along;
      if (e.cancelable) e.preventDefault();
      fns.current.paint(dist);
    };

    const onEnd = () => {
      if (!tracking || !locked) { tracking = false; return; }
      tracking = false;
      const speed = Math.abs(dist) / Math.max(1, Date.now() - startT);   // px/ms
      fns.current.release(dist, speed);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [elRef, active, axis]);
}

// Vrátí řízení CSS tranzici: nejdřív obnovit `transition`, pak si vynutit
// přepočet stylu (aby se posunutá pozice brala jako výchozí) a teprve pak
// pustit inline transform — jinak by prvek skočil bez animace.
function releaseToCss(el, backdrop) {
  el.style.transition = '';
  if (backdrop) backdrop.style.transition = '';
  void el.offsetWidth;
  el.style.transform = '';
  if (backdrop) backdrop.style.background = '';
}

function renderRichText(text) {
  if (!text.includes('**')) return text;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Modal (a tím i listování v něm) má smysl jen u kandidáta, o kterém je co
// ukázat — v praxi top10. Stejné pravidlo používá řádkový seznam i `App`.
function hasMemberDetail(m) {
  return !!(m.photo || (m.bio && m.bio.trim()));
}

function Heart({ className, fill = '#d93434' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 92 C 14 68, 2 44, 10 24 C 18 8, 38 6, 48 18 C 49 19, 49.5 20, 50 22 C 50.5 20, 51 19, 52 18 C 62 6, 82 8, 90 24 C 98 44, 86 68, 50 92 Z"
        fill={fill}
      />
    </svg>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const items = [
    { id: 'uvod', label: 'Úvod' },
    { id: 'priority', label: 'Priority' },
    { id: 'tym', label: 'Náš tým' },
    { id: 'kontakt', label: 'Kontakt' }
  ];
  const click = (e, id) => {
    e.preventDefault();
    scrollToId(id);
    setOpen(false);
  };
  return (
    <header className={'nav ' + (scrolled ? 'is-scrolled' : '')}>
      <div className="nav-inner">
        <a className="nav-logo" href="#uvod" onClick={(e) => click(e, 'uvod')} aria-label="Říčany srdcem">
          <img className="nav-logo-img" src="/assets/logo-new.webp" alt="Říčany srdcem" />
        </a>
        <div className="nav-end">
          <nav className={'nav-links ' + (open ? 'open' : '')}>
            {items.map(i => (
              <a key={i.id} href={'#' + i.id} onClick={(e) => click(e, i.id)}>{i.label}</a>
            ))}
          </nav>
          {/* Ikony sociálních sítí (FB/IG) jsou dočasně pryč — reálné URL zatím
              nemáme a odkaz na „#" nikam nevede. Až profily vzniknou, vrátí se
              sem <div className="nav-social"> s odkazy; CSS `.nav-social`
              v index.html i Plausible eventy `Social: …` na to čekají
              připravené (viz README, sekce Plány do budoucna). */}
          <button className="nav-burger" aria-label="Menu" onClick={() => setOpen(o => !o)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="uvod" className="hero">
      <div className="hero-grid">
        {/* `.hero-text` je na desktopu normální sloupec, na mobilu se z něj přes
            `display: contents` stane průhledný obal — hlavička a tělo se pak
            řadí jako samostatné buňky gridu a fotka se vejde mezi ně (CSS). */}
        <div className="hero-text">
          <div className="hero-head">
            <div className="kicker">
              <span className="kicker-line"></span>
              <span>Komunální volby · 9.–10. října 2026</span>
            </div>
            <h1 className="hero-title">Říčany<br /><em>srdcem</em></h1>
          </div>
          <div className="hero-body">
            <p className="hero-lead">{D.leader.intro}</p>
            <div className="hero-sign">
              <div className="sig-name">{D.leader.name}</div>
              <div className="sig-role">{D.leader.role}</div>
            </div>
            <div className="hero-ctas">
              <a href="#priority" className="hero-cta" onClick={(e) => {
                e.preventDefault();
                track('Hero CTA: Priority');
                scrollToId('priority');
              }}>
                Naše priority
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </a>
              <a href="#tym" className="hero-cta hero-cta-secondary" onClick={(e) => {
                e.preventDefault();
                track('Hero CTA: Tým');
                scrollToId('tym');
              }}>
                Náš tým
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="hero-photo">
          <img src={D.leader.photoHero || D.leader.photo} alt={D.leader.name} width="1024" height="1536" fetchpriority="high" />
        </div>
      </div>
    </section>
  );
}

function PriorityCard({ p, onOpen }) {
  return (
    <button className="pri-card" onClick={onOpen}>
      <div className="pri-card-num">{String(p.n).padStart(2, '0')}</div>
      <div className="pri-card-title">{p.title}</div>
      <div className="pri-card-lead">{p.lead}</div>
      <div className="pri-card-more">
        Více
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </button>
  );
}

function PriorityDrawer({ priority, onClose }) {
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (!priority) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [priority, onClose]);

  // Zavření swipem doprava. Panel drží prst, po puštění se buď dozavře
  // (CSS tranzice ho dotáhne za okraj), nebo pruží zpátky.
  useDragToDismiss(drawerRef, {
    active: !!priority,
    axis: 'x',
    canDrag: (dir) => dir > 0,          // doleva panel netáhneme, tam už žádný není
    paint: (dx) => {
      const el = drawerRef.current, bd = backdropRef.current;
      el.style.transition = 'none';
      el.style.transform = `translateX(${Math.max(0, dx)}px)`;
      if (bd) {
        // Podklad má vlastní .3s tranzici — po dobu gesta musí pryč, jinak by
        // ztmavení kulhalo za prstem.
        bd.style.transition = 'none';
        const t = Math.min(1, Math.max(0, dx) / (el.offsetWidth || 1));
        bd.style.background = `rgba(20, 34, 53, ${(0.45 * (1 - t)).toFixed(3)})`;
      }
    },
    release: (dx, speed) => {
      const el = drawerRef.current;
      const width = el.offsetWidth || 1;
      releaseToCss(el, backdropRef.current);
      // Zavře se po třetině šířky, nebo po rychlém švihnutí i z kratší dráhy.
      if (dx > width * 0.33 || speed > 0.5) onClose();
    }
  });

  // Panel je v DOM i zavřený a sdílí se mezi otevřeními — nesmí si nést
  // posun z minulého gesta.
  useEffect(() => {
    if (priority) return;
    const el = drawerRef.current, bd = backdropRef.current;
    if (el) { el.style.transition = ''; el.style.transform = ''; }
    if (bd) { bd.style.transition = ''; bd.style.background = ''; }
  }, [priority]);

  return (
    <div ref={backdropRef} className={'drawer-backdrop ' + (priority ? 'is-open' : '')} onClick={onClose} aria-hidden={!priority}>
      <aside ref={drawerRef} className={'drawer ' + (priority ? 'is-open' : '')} onClick={(e) => e.stopPropagation()} role="dialog">
        {priority && (
          <>
            <div className="drawer-head">
              <div className="drawer-num">{String(priority.n).padStart(2, '0')}</div>
              <button className="drawer-close" onClick={onClose} aria-label="Zavřít">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
              </button>
            </div>
            <div className="drawer-body">
              <h3 className="drawer-title">{priority.title}</h3>
              <p className="drawer-lead">{priority.lead}</p>
              {priority.sections.map((s, i) => (
                <div key={i} className="drawer-section">
                  {s.heading && <h4 className="drawer-section-h">{s.heading}</h4>}
                  {s.paragraphs.map((item, j) => {
                    if (typeof item === 'string') {
                      return <p key={j} className="drawer-p">{renderRichText(item)}</p>;
                    }
                    if (item && item.image) {
                      return (
                        <figure key={j} className="drawer-figure">
                          <img src={item.image} alt={item.alt || ''} loading="lazy" decoding="async" />
                          {item.caption && <figcaption>{item.caption}</figcaption>}
                        </figure>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Priorities({ onOpen }) {
  return (
    <section id="priority" className="section section-priority">
      <div className="section-head">
        <div className="kicker">
          <span className="kicker-line"></span>
          <span>Naše priority</span>
        </div>
        <h2 className="section-title">S&nbsp;čím do toho jdeme</h2>
        <p className="section-sub">
          Konkrétní věci, na kterých se shodneme a&nbsp;za&nbsp;které ručíme. Klikněte na kteroukoliv prioritu pro&nbsp;detail.
        </p>
      </div>
      <div className="pri-grid">
        {D.priorities.map(p => (
          <PriorityCard key={p.n} p={p} onOpen={() => onOpen(p)} />
        ))}
      </div>
    </section>
  );
}

function MemberModal({ member, onClose, onNavigate, hasPrev, hasNext }) {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const exitTimer = useRef(null);
  const enterFrom = useRef(0);   // odkud má přijet nově vybraný medailonek
  // Aktuální obsluha kláves; přes ref, aby se listener nepřevěšoval s každým
  // renderem (a `slideTo` níž se stihlo definovat).
  const keys = useRef(null);

  useEffect(() => {
    if (!member) return;
    const onKey = (e) => {
      const n = keys.current;
      if (e.key === 'Escape') n.onClose();
      // Totéž co swipe do stran, jen z klávesnice (na desktopu myš swipe nemá).
      if (e.key === 'ArrowRight' && n.hasNext) n.slideTo(1);
      if (e.key === 'ArrowLeft' && n.hasPrev) n.slideTo(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(exitTimer.current);
    };
  }, [member]);

  // Zavření tažením — na obou koncích scrollu. Medailonek se roluje, takže
  // gesto nesmí soupeřit se scrollem: nahoře zabírá tah dolů, dole tah nahoru
  // (krátký text scroll nemá, tam fungují oba směry). Využívá se tím přesně
  // ten „přetah", který by jinak jen gumově odskočil.
  useDragToDismiss(modalRef, {
    active: !!member,
    axis: 'y',
    canDrag: (dir) => {
      const el = modalRef.current;
      if (!el) return false;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      return dir > 0 ? atTop : atBottom;
    },
    paint: (dy) => {
      const el = modalRef.current, bd = backdropRef.current;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      if (bd) {
        bd.style.transition = 'none';
        const t = Math.min(1, Math.abs(dy) / 260);
        bd.style.background = `rgba(20, 34, 53, ${(0.55 * (1 - t)).toFixed(3)})`;
      }
    },
    release: (dy, speed) => {
      const el = modalRef.current, bd = backdropRef.current;
      // Modal nemá odchozí CSS stav (po zavření mizí z DOM), takže si cestu
      // za okraj musí odanimovat sám a zavřít se až potom.
      if (Math.abs(dy) > 110 || speed > 0.5) {
        const out = dy > 0 ? window.innerHeight : -window.innerHeight;
        el.style.transition = 'transform .2s ease-out';
        el.style.transform = `translateY(${out}px)`;
        if (bd) {
          bd.style.transition = 'background .2s ease-out';
          bd.style.background = 'rgba(20, 34, 53, 0)';
        }
        exitTimer.current = setTimeout(onClose, 200);
        return;
      }
      releaseToCss(el, bd);
    }
  });

  // Listování mezi kandidáty tažením do stran. Vodorovně se v modalu nic
  // neroluje, takže gesto nemá s čím soupeřit a nepotřebuje podmínku na konec
  // scrollu jako svislé zavírání. Tažení doleva odsouvá kartu pryč a přivádí
  // dalšího v pořadí, doprava předchozího.
  const stepFor = (dx) => (dx < 0 ? 1 : -1);
  const canGo = (dx) => (stepFor(dx) > 0 ? hasNext : hasPrev);

  // Přepnutí kandidáta: karta odjede ven, prohodí se obsah a přijede z druhé
  // strany. Sdílí to swipe, šipky v liště i klávesnice, ať to vypadá stejně.
  const slideTo = (step) => {
    const el = modalRef.current;
    if (!el) return;
    const out = (el.offsetWidth + 40) * (step > 0 ? -1 : 1);   // další odjíždí doleva
    el.style.transition = 'transform .18s ease-in';
    el.style.transform = `translateX(${out}px)`;
    enterFrom.current = -out;
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => onNavigate(step), 180);
  };
  keys.current = { slideTo, onClose, hasPrev, hasNext };

  useDragToDismiss(modalRef, {
    active: !!member,
    axis: 'x',
    canDrag: () => true,
    paint: (dx) => {
      const el = modalRef.current;
      // Na konci seznamu klade tažení odpor, ať je poznat, že dál už se nejde.
      const shift = canGo(dx) ? dx : dx * 0.25;
      el.style.transition = 'none';
      el.style.transform = `translateX(${shift}px)`;
    },
    release: (dx, speed) => {
      if (canGo(dx) && (Math.abs(dx) > 80 || speed > 0.5)) {
        slideTo(stepFor(dx));
        return;
      }
      releaseToCss(modalRef.current, null);
    }
  });

  // Přepnutí kandidáta nechává stejný DOM prvek, takže se o dvě věci musíme
  // postarat sami: nový medailonek začíná odshora a přijede z boku.
  useLayoutEffect(() => {
    const el = modalRef.current;
    if (!el || !member) return;
    el.scrollTop = 0;
    const from = enterFrom.current;
    enterFrom.current = 0;
    if (!from) return;
    el.style.transition = 'none';
    el.style.transform = `translateX(${from}px)`;
    void el.offsetWidth;
    el.style.transition = 'transform .22s ease-out';
    el.style.transform = 'translateX(0)';
    const t = setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 240);
    return () => clearTimeout(t);
  }, [member]);

  if (!member) return null;
  const num = member.n != null ? String(member.n).padStart(2, '0') : '01';
  const bio = (member.bio || '').trim();
  // Medailonky chodí různě dlouhé — podle počtu slov se modal rozšíří (CSS).
  const words = bio ? bio.split(/\s+/).length : 0;
  const size = words > 130 ? ' is-xlong' : words > 70 ? ' is-long' : '';
  // Odstavce lze v data.js oddělit prázdným řádkem.
  const paragraphs = bio ? bio.split(/\n\s*\n/) : [];
  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} className={'modal' + size} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zavřít">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
        <div className="modal-grid">
          {member.photo ? (
            <div className="modal-photo">
              <img src={member.photo} alt={member.name} />
            </div>
          ) : (
            <div className="modal-photo modal-photo-placeholder">
              <Heart className="modal-photo-heart" />
            </div>
          )}
          <div className="modal-text">
            <div className="modal-num">{num}</div>
            <h3 className="modal-name">{member.name}</h3>
            <div className="modal-role">{member.role || ''}</div>
            {paragraphs.length
              ? paragraphs.map((p, i) => <p key={i} className="modal-bio">{p}</p>)
              : <p className="modal-bio">Medailonek zatím připravujeme, brzy ho tu najdete.</p>}
          </div>
        </div>
        {(hasPrev || hasNext) && (
          // Lišta drží u spodní hrany i u dlouhého medailonku — jinak by se
          // o listování dozvěděl jen ten, kdo dočte až na konec.
          <div className="modal-nav">
            <button
              className="modal-nav-btn"
              onClick={() => slideTo(-1)}
              disabled={!hasPrev}
              aria-label="Předchozí kandidát"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5l-7 7 7 7"/></svg>
            </button>
            <button
              className="modal-nav-btn"
              onClick={() => slideTo(1)}
              disabled={!hasNext}
              aria-label="Další kandidát"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCardLeader({ leader, onOpen }) {
  const photo = leader.photoTeam || leader.photo;
  return (
    <button className="team-leader" onClick={() => onOpen({ ...leader, photo })}>
      <div className="team-leader-photo">
        <img src={photo} alt={leader.name} width="1000" height="1250" loading="lazy" decoding="async" />
      </div>
      <div className="team-leader-text">
        <div className="team-num">01</div>
        <h3 className="team-leader-name">{leader.name}</h3>
        <div className="team-leader-role">{leader.role}</div>
        {leader.job && <div className="team-leader-job">{leader.job}</div>}
        <div className="team-leader-link">
          Přečíst medailonek
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </button>
  );
}

function TeamCard({ m, onOpen }) {
  return (
    <button className="team-card" onClick={onOpen}>
      <div className="team-card-photo">
        <img src={m.photo} alt={m.name} loading="lazy" decoding="async" />
      </div>
      <div className="team-card-num">{String(m.n).padStart(2, '0')}</div>
      <div className="team-card-name">{m.name}</div>
      <div className="team-card-role">{m.role}</div>
    </button>
  );
}

function TeamRow({ m, onOpen }) {
  // Klikací (s modalem) je řádek, jakmile má kandidát fotku nebo medailonek —
  // v praxi top10, tj. č. 8–10. Ostatní řádky zůstávají statické.
  const hasDetail = hasMemberDetail(m);
  const content = (
    <>
      <span className="team-row-num">{String(m.n).padStart(2, '0')}</span>
      <span className="team-row-name">{m.name}</span>
      <span className="team-row-dots" aria-hidden="true"></span>
      <span className="team-row-role">{m.role}</span>
      {hasDetail && (
        <span className="team-row-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      )}
    </>
  );
  if (!hasDetail) {
    return <div className="team-row team-row--static">{content}</div>;
  }
  return (
    <button className="team-row" onClick={onOpen}>{content}</button>
  );
}

function Team({ onOpen }) {
  return (
    <section id="tym" className="section section-team">
      <div className="section-head">
        <div className="kicker">
          <span className="kicker-line"></span>
          <span>Náš tým</span>
        </div>
        <h2 className="section-title">Naši kandidáti</h2>
        <p className="section-sub">
          Sousedé, lidé z místních škol, spolků a&nbsp;firem. Lidé, které potkáváte v&nbsp;Říčanech každý den.
        </p>
      </div>

      <TeamCardLeader leader={D.leader} onOpen={onOpen} />

      <div className="team-grid">
        {D.top6.map(m => (
          <TeamCard key={m.id} m={m} onOpen={() => onOpen(m)} />
        ))}
      </div>

      <div className="team-rest">
        <div className="team-rest-head">Další kandidáti</div>
        <div className="team-rest-list">
          {D.rest.map(m => (
            <TeamRow key={m.id} m={m} onOpen={() => onOpen(m)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="kontakt" className="section section-contact">
      <div className="section-head">
        <div className="kicker">
          <span className="kicker-line"></span>
          <span>Kontakt</span>
        </div>
        <h2 className="section-title">Chcete se nás na&nbsp;cokoli zeptat?</h2>
        <p className="section-sub">
          Neváhejte nás kontaktovat na&nbsp;
          <a href="mailto:info@ricanysrdcem.cz" onClick={() => track('Kontakt e-mail')}>info@ricanysrdcem.cz</a>.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-partners">
        <span className="footer-partners-label">Společná kandidátka</span>
        <img className="footer-partner-logo footer-partner-logo--top09" src="/assets/top09.png" alt="TOP 09" />
        <img className="footer-partner-logo footer-partner-logo--kdu" src="/assets/lidovci_logo_rgb_black-kdu.svg" alt="KDU·ČSL" />
        <span className="footer-partners-tail">a&nbsp;nezávislých kandidátů</span>
      </div>
    </footer>
  );
}

// Pořadí, ve kterém jde v modalu listovat: lídryně, karty 2–7 a ti z dalších
// kandidátů, kdo mají medailonek (č. 8–10). U lídryně se stejně jako v kartě
// použije `photoTeam`, ať v modalu nevyskočí jiná fotka než po kliku.
const MODAL_MEMBERS = [
  { ...D.leader, photo: D.leader.photoTeam || D.leader.photo },
  ...D.top6,
  ...D.rest.filter(hasMemberDetail)
];

function App() {
  const [member, setMember] = useState(null);
  const [priority, setPriority] = useState(null);
  const openPriority = (p) => { track('Priorita: ' + p.title, { n: p.n, title: p.title }); setPriority(p); };
  const openMember = (m) => { track('Kandidát otevřen', { name: m.name }); setMember(m); };

  const index = member ? MODAL_MEMBERS.findIndex(m => m.id === member.id) : -1;
  const goToMember = (step) => {           // +1 další v pořadí, -1 předchozí
    const next = MODAL_MEMBERS[index + step];
    if (next) openMember(next);
  };

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Priorities onOpen={openPriority} />
        <Team onOpen={openMember} />
        <Contact />
      </main>
      <Footer />
      <MemberModal
        member={member}
        onClose={() => setMember(null)}
        onNavigate={goToMember}
        hasPrev={index > 0}
        hasNext={index >= 0 && index < MODAL_MEMBERS.length - 1}
      />
      <PriorityDrawer priority={priority} onClose={() => setPriority(null)} />
    </>
  );
}

const root = document.getElementById('app');
ReactDOM.createRoot(root).render(<App />);
