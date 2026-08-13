/* global React, ReactDOM */
const { useState, useEffect, useRef } = React;
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

function renderRichText(text) {
  if (!text.includes('**')) return text;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
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
  return (
    <div className={'drawer-backdrop ' + (priority ? 'is-open' : '')} onClick={onClose} aria-hidden={!priority}>
      <aside className={'drawer ' + (priority ? 'is-open' : '')} onClick={(e) => e.stopPropagation()} role="dialog">
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

function MemberModal({ member, onClose }) {
  useEffect(() => {
    if (!member) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [member, onClose]);
  if (!member) return null;
  const num = member.n != null ? String(member.n).padStart(2, '0') : '01';
  const bio = (member.bio || '').trim();
  // Medailonky chodí různě dlouhé — podle počtu slov se modal rozšíří (CSS).
  const words = bio ? bio.split(/\s+/).length : 0;
  const size = words > 130 ? ' is-xlong' : words > 70 ? ' is-long' : '';
  // Odstavce lze v data.js oddělit prázdným řádkem.
  const paragraphs = bio ? bio.split(/\n\s*\n/) : [];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'modal' + size} onClick={(e) => e.stopPropagation()}>
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
  const hasDetail = !!(m.photo || (m.bio && m.bio.trim()));
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

function App() {
  const [member, setMember] = useState(null);
  const [priority, setPriority] = useState(null);
  const openPriority = (p) => { track('Priorita: ' + p.title, { n: p.n, title: p.title }); setPriority(p); };
  const openMember = (m) => { track('Kandidát otevřen', { name: m.name }); setMember(m); };
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
      <MemberModal member={member} onClose={() => setMember(null)} />
      <PriorityDrawer priority={priority} onClose={() => setPriority(null)} />
    </>
  );
}

const root = document.getElementById('app');
ReactDOM.createRoot(root).render(<App />);
