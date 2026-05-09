/* global React, ReactDOM */
const { useState, useEffect, useRef } = React;
const D = window.RS_DATA;

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
    { id: 'tym', label: 'Náš tým' }
  ];
  const click = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    setOpen(false);
  };
  return (
    <header className={'nav ' + (scrolled ? 'is-scrolled' : '')}>
      <div className="nav-inner">
        <a className="nav-logo" href="#uvod" onClick={(e) => click(e, 'uvod')}>
          <Heart className="nav-heart" />
          <span className="nav-name">
            <span>Říčany</span>
            <span>srdcem</span>
          </span>
        </a>
        <div className="nav-end">
          <nav className={'nav-links ' + (open ? 'open' : '')}>
            {items.map(i => (
              <a key={i.id} href={'#' + i.id} onClick={(e) => click(e, i.id)}>{i.label}</a>
            ))}
          </nav>
          <div className="nav-social">
            <a href="#" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
          </div>
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
        <div className="hero-text">
          <div className="kicker">
            <span className="kicker-line"></span>
            <span>Komunální volby · 9.–10. října 2026</span>
          </div>
          <h1 className="hero-title">Říčany<br /><em>srdcem</em></h1>
          <p className="hero-lead">{D.leader.intro}</p>
          <div className="hero-sign">
            <div className="sig-name">{D.leader.name}</div>
            <div className="sig-role">{D.leader.role}</div>
          </div>
          <div className="hero-ctas">
            <a href="#priority" className="hero-cta" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('priority');
              if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
            }}>
              Naše priority
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </a>
            <a href="#tym" className="hero-cta hero-cta-secondary" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('tym');
              if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
            }}>
              Náš tým
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </a>
          </div>
        </div>
        <div className="hero-photo">
          <img src={D.leader.photo} alt={D.leader.name} />
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
                      return <p key={j} className="drawer-p">{item}</p>;
                    }
                    if (item && item.image) {
                      return (
                        <figure key={j} className="drawer-figure">
                          <img src={item.image} alt={item.alt || ''} />
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
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
            <p className="modal-bio">
              {member.bio || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Krátký medailonek doplníme po obdržení podkladů od kandidáta.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCardLeader({ leader, onOpen }) {
  return (
    <button className="team-leader" onClick={onOpen}>
      <div className="team-leader-photo">
        <img src={leader.photo} alt={leader.name} />
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
        <img src={m.photo} alt={m.name} />
      </div>
      <div className="team-card-num">{String(m.n).padStart(2, '0')}</div>
      <div className="team-card-name">{m.name}</div>
      <div className="team-card-role">{m.role}</div>
    </button>
  );
}

function TeamRow({ m, onOpen }) {
  return (
    <button className="team-row" onClick={onOpen}>
      <span className="team-row-num">{String(m.n).padStart(2, '0')}</span>
      <span className="team-row-name">{m.name}</span>
      <span className="team-row-dots" aria-hidden="true"></span>
      <span className="team-row-role">{m.role}</span>
      <span className="team-row-arrow" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </button>
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

      <TeamCardLeader leader={D.leader} onOpen={() => onOpen(D.leader)} />

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

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-partners">
        <span className="footer-partners-label">Společná kandidátka</span>
        <img className="footer-partner-logo footer-partner-logo--top09" src="/preview/top09.png" alt="TOP 09" />
        <img className="footer-partner-logo footer-partner-logo--kdu" src="/preview/kducsl.png" alt="KDU·ČSL" />
        <span className="footer-partners-tail">a&nbsp;nezávislých kandidátů</span>
      </div>
    </footer>
  );
}

function App() {
  const [member, setMember] = useState(null);
  const [priority, setPriority] = useState(null);
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Priorities onOpen={setPriority} />
        <Team onOpen={setMember} />
      </main>
      <Footer />
      <MemberModal member={member} onClose={() => setMember(null)} />
      <PriorityDrawer priority={priority} onClose={() => setPriority(null)} />
    </>
  );
}

const root = document.getElementById('app');
ReactDOM.createRoot(root).render(<App />);
