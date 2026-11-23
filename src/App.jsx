import { useCallback, useEffect, useRef, useState } from 'react';
import './css/style.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger'; // 'gsap/all' poora bundle kheench leta tha
import { useGSAP } from '@gsap/react';
import LiveEventExperience, { LIVE_WEBP, Pic } from './LiveEvents';
import {
  BARAT_START,
  BARAT_UNLOCK,
  WALIMA_UNLOCK,
  BARAT_END_REAL,
  WALIMA_START,
  WALIMA_END_REAL,
  WEDDING_START,
  VENUES,
  mapsLink,
  clearPreview,
  currentPhase,
  defaultMode,
  getPreview,
  isUnlocked,
  liveEndOf,
  nowMs,
  syncServerClock,
  useNowTick,
  usePhase,
} from './eventConfig';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Refresh par hamesha top se start
ScrollTrigger.clearScrollMemory('manual');
if (typeof window !== 'undefined') window.scrollTo(0, 0);

/* =====================================================================
   IMAGES
   ===================================================================== */
const GATE_IMG = '/images/door.png';
const GROUND_IMG = '/images/ground.png';

// Loader sirf in par rukta hai (+ timeout). Live .webp background mein garam hoti hain.
const CRITICAL_IMAGES = [GATE_IMG, GROUND_IMG, '/images/stamp-1.png', '/images/left.png'];
const PRELOAD_TIMEOUT = 7000;

/* =====================================================================
   GATE GEOMETRY (gate image 2048 x 768)
   ===================================================================== */
const GATE_W = 2048;
const GATE_H = 768;
const SEAM_X = 1023.5;
const LEAF_LEFT_X = 789;
const LEAF_BOTTOM = 619;
const LOCK_Y = 460;
const LEAF_TOP = [
  [789, 276],
  [812, 266],
  [854, 261],
  [905, 249],
  [955, 229],
  [1000, 225],
  [1007, 200],
  [1014, 190],
  [SEAM_X, 197],
];

const mirror = ([x, y]) => [2 * SEAM_X - x, y];
const grow = (pts, sx, sy) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
};
const toPath = (pts) =>
  'M' + pts.map(([x, y]) => `${(x / GATE_W).toFixed(5)},${(y / GATE_H).toFixed(5)}`).join('L') + 'Z';

const LEFT_POLY = [[LEAF_LEFT_X, LEAF_BOTTOM], ...LEAF_TOP, [SEAM_X, LEAF_BOTTOM]];
const RIGHT_POLY = LEFT_POLY.map(mirror);
const HOLE_POLY = [
  [LEAF_LEFT_X, LEAF_BOTTOM],
  ...LEAF_TOP,
  ...LEAF_TOP.slice(0, -1).reverse().map(mirror),
  mirror([LEAF_LEFT_X, LEAF_BOTTOM]),
];
const HOLE_CLIP_D = `M0,0H1V1H0Z ${toPath(HOLE_POLY)}`;
const LEFT_CLIP_D = toPath(grow(LEFT_POLY, 1.01, 1.006));
const RIGHT_CLIP_D = toPath(grow(RIGHT_POLY, 1.01, 1.006));

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
const LEFT_HINGE = pct(LEAF_LEFT_X, GATE_W);
const RIGHT_HINGE = pct(2 * SEAM_X - LEAF_LEFT_X, GATE_W);
const HOLE_CX = SEAM_X / GATE_W;
const HOLE_CY = (190 + LEAF_BOTTOM) / 2 / GATE_H;
const HOLE_WF = (2 * (SEAM_X - LEAF_LEFT_X)) / GATE_W;
const HOLE_HF = (LEAF_BOTTOM - 190) / GATE_H;

const gateBg = {
  backgroundImage: `url(${GATE_IMG})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
};

/* =====================================================================
   DATA (venues / times eventConfig se aate hain: ek hi source of truth)
   ===================================================================== */
const celebrations = [
  {
    key: 'barat',
    title: 'BARAT',
    day: 'Sunday',
    date: '29',
    month: 'Nov 2026',
    time: '7:00 PM Onwards',
    venue: VENUES.barat.name,
    address: VENUES.barat.area,
    link: mapsLink(VENUES.barat.mapQuery),
    start: BARAT_START,
    end: BARAT_END_REAL, // calendar mein hamesha asli waqt (?live test se mutasir nahi)
  },
  {
    key: 'walima',
    title: 'WALIMA',
    day: 'Monday',
    date: '30',
    month: 'Nov 2026',
    time: '8:00 PM Onwards',
    venue: VENUES.walima.name,
    address: VENUES.walima.area,
    link: mapsLink(VENUES.walima.mapQuery),
    start: WALIMA_START,
    end: WALIMA_END_REAL,
  },
];

const BG_POS = { hero: 50, date: 14, families: 86, celebrations: 34, footer: 64 };

const GLASS =
  'rounded-3xl border border-white/50 bg-white/30 backdrop-blur-md shadow-[0_10px_40px_rgba(90,62,43,0.16)]';

/* =====================================================================
   ICONS
   ===================================================================== */
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

/* =====================================================================
   LENIS
   ===================================================================== */
function useLenis(lenisRef) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    lenis.stop(); // gate open hone tak scroll band

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP ka default wapas (Walima ticker ko zaroorat hai)
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [lenisRef]);
}

/* =====================================================================
   SCRATCH TO REVEAL
   ===================================================================== */
function ScratchCard({ children }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const moves = useRef(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;

    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, '#B8860B');
    g.addColorStop(0.5, '#F3E2A9');
    g.addColorStop(1, '#C9A227');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * rect.width, Math.random() * rect.height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(90,62,43,0.8)';
    ctx.font = '600 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  Scratch to reveal  ✦', rect.width / 2, rect.height / 2 + 5);
  }, []);

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const scratchAt = (x, y) => {
    const ctx = ctxRef.current;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkRevealed = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 64) {
      total += 1;
      if (data[i] === 0) cleared += 1;
    }
    if (cleared / total > 0.45) setRevealed(true);
  };

  const onDown = (e) => {
    drawing.current = true;
    canvasRef.current.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const { x, y } = getPos(e);
    scratchAt(x, y);
    moves.current += 1;
    if (moves.current % 8 === 0) checkRevealed();
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    checkRevealed();
  };

  return (
    <div className="relative w-full h-[170px] rounded-2xl overflow-hidden border border-[#D4AF37]/50 shadow-lg bg-white/25 backdrop-blur-sm">
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-700 ${
          revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}

/* =====================================================================
   COUNTDOWN
   ===================================================================== */
function Countdown({ target }) {
  const now = useNowTick();

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const mins = Math.floor(diff / 60000) % 60;
  const secs = Math.floor(diff / 1000) % 60;
  const pad = (n) => String(n).padStart(2, '0');

  const tiles = [
    { label: 'Days', value: pad(days) },
    { label: 'Hours', value: pad(hours) },
    { label: 'Mins', value: pad(mins) },
    { label: 'Secs', value: pad(secs) },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex flex-col items-center bg-white/30 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm py-3"
        >
          <span className="font-serif text-2xl font-bold text-[#2C1D12] tabular-nums">{t.value}</span>
          <span className="text-[9px] uppercase tracking-widest text-[#5A3E2B] font-semibold">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   ADD TO CALENDAR (.ics): waqt aur venue config se, lines RFC ke mutabiq fold
   ===================================================================== */
const icsText = (s) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
const fold = (line) => {
  const out = [];
  let l = line;
  while (l.length > 74) {
    out.push(l.slice(0, 74));
    l = ' ' + l.slice(74);
  }
  out.push(l);
  return out.join('\r\n');
};

const downloadIcs = () => {
  const stamp = icsDate(Date.now());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mohsin and Iqra//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  celebrations.forEach((c) => {
    const name = c.title.charAt(0) + c.title.slice(1).toLowerCase();
    lines.push(
      'BEGIN:VEVENT',
      `UID:${c.key}-2026@mohsin-iqra-wedding`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(c.start)}`,
      `DTEND:${icsDate(c.end)}`,
      `SUMMARY:${icsText(`${name} - Mohsin & Iqra`)}`,
      `LOCATION:${icsText(`${c.venue}, ${c.address}`)}`,
      `DESCRIPTION:${icsText(`${name} of Mohsin & Iqra. ${c.time}. Venue: ${c.venue}. Directions: ${c.link}`)}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.map(fold).join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mohsin-Iqra-Wedding.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* =====================================================================
   PREVIEWS MENU
   ===================================================================== */
const PREVIEW_ITEMS = [
  { kind: 'barat', label: 'Barat Experience', date: '29 Nov' },
  { kind: 'walima', label: 'Walima Experience', date: '30 Nov' },
];

function PreviewsMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const now = useNowTick();
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="fixed z-40"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-full border border-white/50 bg-white/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#3A2B1C] shadow-[0_6px_24px_rgba(90,62,43,0.2)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
      >
        Previews ✦
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[min(15rem,calc(100vw-2rem))] rounded-2xl border border-white/50 bg-white/55 p-2 shadow-[0_14px_40px_rgba(90,62,43,0.25)] backdrop-blur-xl"
        >
          {PREVIEW_ITEMS.map((it) => {
            const unlocked = isUnlocked(it.kind, now);
            return unlocked ? (
              <button
                key={it.kind}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect(it.kind);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#2C1D12] transition-colors hover:bg-white/70"
              >
                <span>{it.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#B8860B]">Open ▸</span>
              </button>
            ) : (
              <div
                key={it.kind}
                role="menuitem"
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-[#5A3E2B]/70"
              >
                <span>{it.label}</span>
                <span className="text-[10px] tracking-wide">🔒 Unlocks {it.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   APP (pastel garden website)
   ===================================================================== */
function App({ phase, onPreview, skipIntro, onGateOpen }) {
  // Events khatam (POST) hon to gate hota hi nahi: shuru se unlocked
  const [unlocked, setUnlocked] = useState(skipIntro || phase === 'POST');
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.85
  );
  const container = useRef(null);
  const lenisRef = useRef(null);
  const openedRef = useRef(false);
  const eventsOver = phase === 'POST';

  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const leftLeafRef = useRef(null);
  const rightLeafRef = useRef(null);
  const stampBtnRef = useRef(null);
  const labelRef = useRef(null);
  const radarPulsesRef = useRef([]);
  const bgZoomRef = useRef(null);
  const topFlowerRef = useRef(null);
  const bottomFlowerRef = useRef(null);
  const familyContentRef = useRef(null);

  useLenis(lenisRef);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth / window.innerHeight < 0.85);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Critical images preload: error ya timeout par bhi loader hat jata hai (slow mobile data)
  useEffect(() => {
    let alive = true;
    let count = 0;
    let finished = false;
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      setProgress(100);
      setLoaded(true);
    };
    const step = () => {
      if (!alive) return;
      count += 1;
      setProgress(Math.round((count / CRITICAL_IMAGES.length) * 100));
      if (count === CRITICAL_IMAGES.length) finish();
    };
    CRITICAL_IMAGES.forEach((src) => {
      const img = new Image();
      img.onload = step;
      img.onerror = step;
      img.src = src;
    });
    const timer = setTimeout(finish, PRELOAD_TIMEOUT);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // Live .webp images background mein (idle par), slow / data-saver network par skip
  useEffect(() => {
    if (!loaded) return undefined;
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return undefined;
    const run = () =>
      LIVE_WEBP.forEach((src) => {
        const i = new Image();
        i.src = src;
      });
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const id = hasIdle ? window.requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 2500);
    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    }
  }, [loaded]);

  // POST layout (sirf Concluded + Footer): runtime par bhi aaye to gate unlock, top par, aur triggers dobara naapo
  useEffect(() => {
    if (!eventsOver) return undefined;
    setUnlocked(true);
    window.scrollTo(0, 0);
    lenisRef.current?.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [eventsOver]);

  // Gate khulne tak scroll lock; har state / unmount par reset
  useEffect(() => {
    if (!unlocked) {
      window.scrollTo(0, 0);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      lenisRef.current?.stop();
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      lenisRef.current?.start();
      ScrollTrigger.refresh();
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [unlocked]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    const goTop = () => window.scrollTo(0, 0);
    window.addEventListener('beforeunload', goTop);
    window.addEventListener('pageshow', goTop);
    return () => {
      window.removeEventListener('beforeunload', goTop);
      window.removeEventListener('pageshow', goTop);
    };
  }, []);

  // eventsOver badalne par context revert + dobara build (sections unmount ho jate hain)
  const { contextSafe } = useGSAP(
    () => {
      if (skipIntro || eventsOver) gsap.set(bgZoomRef.current, { scale: 1.14 });

      if (!eventsOver) {
        if (skipIntro) {
          gsap.set('.intro-card', { opacity: 1, y: 0, scale: 1 });
          gsap.set('.intro-item', { opacity: 1, y: 0 });
        }

        // Radar pulse + stamp glow
        gsap.to(radarPulsesRef.current.filter(Boolean), {
          scale: 2.2,
          opacity: 0,
          duration: 2,
          repeat: -1,
          stagger: 0.6,
          ease: 'power1.out',
        });
        gsap.to('.stamp-seal', {
          boxShadow: '0 0 25px rgba(212, 175, 55, 0.6)',
          repeat: -1,
          yoyo: true,
          duration: 1.5,
          ease: 'sine.inOut',
        });
      }

      // Background pan (jo sections maujood hain unhi par)
      const panTo = (x) =>
        gsap.to(bgZoomRef.current, {
          backgroundPosition: `${x}% 60%`,
          duration: 2,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      gsap.utils.toArray('[data-bgx]').forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 60%',
          end: 'bottom 60%',
          onToggle: (self) => {
            if (self.isActive) panTo(Number(sec.dataset.bgx));
          },
        });
      });

      if (!eventsOver) {
        // Save the date
        gsap.from('.save-item', {
          opacity: 0,
          y: 30,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: { trigger: '#date-section', start: 'top 65%', toggleActions: 'play none none reverse' },
        });

        // Families
        const famTrigger = { trigger: '#families-section', start: 'top 65%', toggleActions: 'play none none reverse' };
        gsap.fromTo(
          [topFlowerRef.current, bottomFlowerRef.current],
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: famTrigger }
        );
        gsap.fromTo(
          familyContentRef.current,
          { opacity: 0, y: 40, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power2.out', scrollTrigger: famTrigger }
        );
        gsap.from('.family-item', {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.18,
          delay: 0.25,
          ease: 'power2.out',
          scrollTrigger: famTrigger,
        });

        // Celebration cards
        gsap.from('.celeb-head', {
          opacity: 0,
          y: 24,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: '#celebrations-section', start: 'top 70%', toggleActions: 'play none none reverse' },
        });

        gsap.utils.toArray('.celeb-card').forEach((card) => {
          const items = card.querySelectorAll('.reveal-item');
          const num = card.querySelector('.date-num');
          const target = Number(num.dataset.value);
          const counter = { v: 0 };

          const tl = gsap.timeline({
            scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' },
          });

          tl.fromTo(
            card,
            { opacity: 0, y: 90, rotationX: -28, scale: 0.88, transformPerspective: 900, transformOrigin: '50% 100%' },
            { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 1.2, ease: 'back.out(1.4)' }
          )
            .from(items, { opacity: 0, y: 20, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, '-=0.6')
            .to(
              counter,
              {
                v: target,
                duration: 1.2,
                ease: 'power2.out',
                onUpdate: () => {
                  num.textContent = Math.round(counter.v);
                },
              },
              '<'
            );
        });

        gsap.utils.toArray('.card-shine').forEach((shine, i) => {
          gsap.fromTo(
            shine,
            { xPercent: 0 },
            { xPercent: 600, duration: 1.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.5, delay: 1.5 + i * 1.2 }
          );
        });

        gsap.to('.card-star', { y: -4, scale: 1.15, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.4 });
      }

      // Footer (dono layouts mein)
      const footTrigger = { trigger: '#footer-section', start: 'top 85%', toggleActions: 'play none none reverse' };
      gsap.from('.foot-item', { opacity: 0, y: 30, duration: 0.9, stagger: 0.15, ease: 'power2.out', scrollTrigger: footTrigger });
      gsap.from('.foot-flower', { opacity: 0, scale: 0.8, duration: 1.2, ease: 'power3.out', scrollTrigger: footTrigger });
    },
    { scope: container, dependencies: [eventsOver], revertOnUpdate: true }
  );

  // Concluded section: ScrollTrigger ke bina (top par hai, opacity 0 par atak nahi sakta).
  // Loader hatne tak chhupa rehta hai, phir smooth entrance.
  useGSAP(
    () => {
      if (!eventsOver) return;
      gsap.set('.concl-item', { opacity: 0, y: 26 });
      if (!loaded) return;
      gsap.to('.concl-item', { opacity: 1, y: 0, duration: 0.9, stagger: 0.14, delay: 0.25, ease: 'power2.out' });
    },
    { scope: container, dependencies: [eventsOver, loaded] }
  );

  // GATE OPEN: contextSafe => unmount par timeline khud kill (stale setState / onComplete nahi)
  const handleOpen = contextSafe(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    onGateOpen?.(); // user gesture: music yahin se shuru

    const scene = sceneRef.current;
    const stage = stageRef.current;
    const r = stage.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = r.left + r.width * HOLE_CX;
    const cy = r.top + r.height * HOLE_CY;
    const k = Math.max(vw / (r.width * HOLE_WF), vh / (r.height * HOLE_HF)) * 1.7;
    gsap.set(scene, { transformOrigin: `${cx}px ${cy}px` });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(scene, { display: 'none' });
        setUnlocked(true);
      },
    });

    tl.to([stampBtnRef.current, labelRef.current], { opacity: 0, scale: 0.7, duration: 0.5, ease: 'power2.in' }, 0)
      .to(leftLeafRef.current, { rotationY: 82, duration: 1.8, ease: 'power2.inOut' }, 0.3)
      .to(rightLeafRef.current, { rotationY: -82, duration: 1.8, ease: 'power2.inOut' }, 0.3)
      .to([leftLeafRef.current, rightLeafRef.current], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 1.5)
      .fromTo(bgZoomRef.current, { scale: 1 }, { scale: 1.14, duration: 4, ease: 'power2.out' }, 0.9)
      .to(scene, { scale: k, duration: 2, ease: 'power2.in' }, 1.1)
      .to(scene, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 2.4)
      .fromTo(
        '.intro-card',
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 1.3, ease: 'power3.out' },
        2.6
      )
      .from('.intro-item', { opacity: 0, y: 16, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, 3.0);
  });

  const cdLabel = phase === 'PRE_BARAT' ? 'Barat' : 'Walima';
  const cdTarget = phase === 'PRE_BARAT' ? WEDDING_START : WALIMA_START;

  return (
    <div ref={container} className="min-h-screen w-full overflow-x-hidden">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="gate-hole" clipPathUnits="objectBoundingBox">
            <path clipRule="evenodd" d={HOLE_CLIP_D} />
          </clipPath>
          <clipPath id="gate-left" clipPathUnits="objectBoundingBox">
            <path d={LEFT_CLIP_D} />
          </clipPath>
          <clipPath id="gate-right" clipPathUnits="objectBoundingBox">
            <path d={RIGHT_CLIP_D} />
          </clipPath>
        </defs>
      </svg>

      {/* Loading screen */}
      <div
        className={`fixed inset-0 z-[100] bg-[#F4EFEB] flex flex-col items-center justify-center gap-4 transition-opacity duration-700 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span className="text-[#D4AF37] text-3xl animate-pulse">✦</span>
        <p className="font-serif italic text-amber-900 text-lg tracking-wide">Loading Invitation...</p>
        <div className="w-40 h-[3px] bg-[#D4AF37]/25 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4AF37] transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-[10px] tracking-[0.3em] text-[#7E5C38] font-semibold">{progress}%</span>
      </div>

      <PreviewsMenu onSelect={onPreview} />

      {/* GROUND BACKGROUND */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#E9DCC7]">
        <div
          ref={bgZoomRef}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${GROUND_IMG})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `${BG_POS.hero}% 60%`,
            transformOrigin: '50% 60%',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#5A3E2B]/10"></div>
      </div>

      {/* GATE SCENE (events ke baad nahi) */}
      {!eventsOver && (
      <div
        ref={sceneRef}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Tap to open the invitation"
        className="fixed inset-0 z-50 overflow-hidden cursor-pointer"
        style={{
          display: skipIntro ? 'none' : undefined,
          touchAction: 'none', // iOS par gate ke peeche page rubber-band na ho
          '--sw': 'max(100vw, min(266.67svh, 312.5vw))',
          '--sh': 'calc(var(--sw) * 0.375)',
          '--fh': 'calc((100svh - var(--sh)) / 2)',
          '--fe': 'calc(var(--fh) + var(--sh) * 0.09 + 20px)',
        }}
      >
        {narrow && (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-20px',
                left: '-20px',
                right: '-20px',
                height: 'var(--fe)',
                backgroundImage: `url(${GATE_IMG})`,
                backgroundSize: 'var(--sw) calc(var(--fe) * 12)',
                backgroundPosition: 'center top',
                backgroundRepeat: 'no-repeat',
                transform: 'scaleY(-1)',
                filter: 'blur(10px)',
              }}
            ></div>
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '-20px',
                left: '-20px',
                right: '-20px',
                height: 'var(--fe)',
                backgroundImage: `url(${GATE_IMG})`,
                backgroundSize: 'var(--sw) calc(var(--fe) * 12)',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                transform: 'scaleY(-1)',
                filter: 'blur(10px)',
              }}
            ></div>
          </>
        )}

        <div
          ref={stageRef}
          className="absolute"
          style={{
            left: 'calc(50% - var(--sw) / 2)',
            top: 'calc(50% - var(--sh) / 2)',
            width: 'var(--sw)',
            height: 'var(--sh)',
            perspective: '1500px',
            perspectiveOrigin: '50% 52%',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-hole)',
              ...(narrow
                ? {
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)',
                  }
                : null),
            }}
          ></div>

          <div
            ref={leftLeafRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-left)',
              transformOrigin: `${LEFT_HINGE} 50%`,
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
          ></div>

          <div
            ref={rightLeafRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-right)',
              transformOrigin: `${RIGHT_HINGE} 50%`,
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
          ></div>

          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pct(SEAM_X, GATE_W), top: pct(LOCK_Y, GATE_H) }}
          >
            <button
              ref={stampBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen();
              }}
              aria-label="Tap to open"
              className="relative flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
              style={{ width: 'clamp(52px, calc(var(--sw) * 0.036), 92px)', aspectRatio: '1' }}
            >
              <span ref={(el) => { radarPulsesRef.current[0] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-600/70 opacity-80 pointer-events-none"></span>
              <span ref={(el) => { radarPulsesRef.current[1] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-500/70 opacity-80 pointer-events-none"></span>
              <span ref={(el) => { radarPulsesRef.current[2] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-400/60 opacity-80 pointer-events-none"></span>

              <img
                src="/images/stamp-1.png"
                className="stamp-seal w-full h-full rounded-full object-cover relative z-10 shadow-lg"
                alt="Stamp Seal"
                draggable={false}
              />
            </button>
          </div>
        </div>

        <div
          ref={labelRef}
          className="absolute inset-x-0 flex flex-col items-center pointer-events-none z-20"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5svh)' }}
        >
          <span className="px-5 py-2 rounded-full bg-white/70 backdrop-blur-md text-[11px] uppercase tracking-[0.35em] text-[#5A3E2B] font-semibold shadow-lg">
            Tap to Open
          </span>
          <span className="text-[11px] italic font-serif text-[#5A3E2B] mt-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
            An Invitation Awaits
          </span>
        </div>
      </div>
      )}

      {!eventsOver && (
      <>
      {/* ============ SECTION 1: INVITATION CARD ============ */}
      <section
        data-bgx={BG_POS.hero}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 pb-[14svh]"
        style={{ minHeight: '100svh' }}
      >
        <div className={`intro-card ${GLASS} opacity-0 w-full max-w-sm px-6 sm:px-8 py-10 text-center flex flex-col items-center gap-4`}>
          <h1 className="text-xl md:text-2xl font-serif text-[#7E5C38] tracking-wide" style={{ direction: 'rtl' }}>
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </h1>
          <span className="text-sm md:text-base font-serif text-[#5C4532] italic leading-relaxed block px-2 sm:px-4" style={{ direction: 'rtl' }}>
            بَارَكَ ٱللَّهُ لَكِ وَبَارَكَ عَلَيْكِ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
          </span>
          <span className="intro-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">
            The Wedding Celebration
          </span>
          <p className="intro-item text-xs text-[#4A3B2C] italic font-serif">
            You are cordially invited to celebrate the union of
          </p>
          <div className="intro-item text-3xl font-serif font-bold text-[#2C1D12] tracking-wide flex items-center justify-center gap-3">
            <span>Mohsin</span>
            <span className="text-[#8A6232] font-light italic text-2xl">&amp;</span>
            <span>Iqra</span>
          </div>
          <div className="intro-item w-16 h-[1px] bg-[#7E5C38]/50"></div>

          <p className="intro-item text-[11px] text-[#5A3E2B] italic font-serif">
            Your presence will make our day complete.
          </p>
        </div>

        <div className="intro-item mt-6 flex flex-col items-center animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#3A2B1C] font-sans font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            Scroll Down
          </span>
          <span className="text-lg text-[#3A2B1C] mt-1">↓</span>
        </div>
      </section>

      {/* ============ SECTION 2: SAVE THE DATE ============ */}
      <section
        id="date-section"
        data-bgx={BG_POS.date}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20"
      >
        <div className={`${GLASS} w-full max-w-sm p-5 sm:p-6 flex flex-col items-center text-center gap-6`}>
          <div className="save-item">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">SAVE THE DATE</span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] mt-1">Mark Your Calendar</h2>
            <div className="w-12 h-[1px] bg-[#7E5C38]/50 mx-auto mt-2"></div>
          </div>

          <div className="save-item w-full">
            <ScratchCard>
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#4A3B2C] font-medium">Sunday &amp; Monday</span>
              <span className="font-serif text-5xl font-bold leading-tight my-1 bg-gradient-to-b from-[#B8860B] to-[#6E4E2B] bg-clip-text text-transparent">
                29 · 30
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-[#4A3B2C] font-medium">November 2026</span>
            </ScratchCard>
            <p className="text-[10px] text-[#5A3E2B] italic font-serif mt-2">Scratch the gold to reveal the date ✦</p>
          </div>

          <div className="save-item w-full">
            {eventsOver ? (
              <div className="py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">Celebrations Concluded</p>
                <p className="font-serif italic text-sm text-[#2C1D12] mt-1">Thank you for your blessings</p>
              </div>
            ) : phase === 'WALIMA_LIVE' ? (
              <div className="py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">Walima Is Happening Now</p>
                <p className="font-serif italic text-sm text-[#2C1D12] mt-1">Open Previews ✦ to join the live celebration</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold mb-2">
                  Counting down to the {cdLabel}
                </p>
                <Countdown target={cdTarget} />
              </>
            )}
          </div>

          {!eventsOver && (
            <button
              onClick={downloadIcs}
              className="save-item flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-[#5A3E2B] to-[#7E5C38] text-white text-xs uppercase tracking-widest rounded-full shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-sans font-medium"
            >
              <CalendarIcon />
              Add to Calendar
            </button>
          )}
        </div>
      </section>

      {/* ============ SECTION 3: THE FAMILIES ============ */}
      <section
        id="families-section"
        data-bgx={BG_POS.families}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20 overflow-hidden"
      >
        <div ref={topFlowerRef} className="absolute top-0 right-0 w-[160px] sm:w-[220px] md:w-[280px] opacity-0 pointer-events-none z-10">
          <Pic name="left" className="w-full h-full object-contain rotate-180" alt="Corner Flower Top" />
        </div>

        <div ref={bottomFlowerRef} className="absolute bottom-0 left-0 w-[160px] sm:w-[220px] md:w-[280px] opacity-0 pointer-events-none z-10">
          <Pic name="left" className="w-full h-full object-contain" alt="Corner Flower Bottom" />
        </div>

        <div
          ref={familyContentRef}
          className={`${GLASS} w-full max-w-sm px-6 sm:px-8 py-10 flex flex-col items-center text-center gap-5 z-20 opacity-0`}
        >
          <span className="family-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">THE FAMILIES</span>

          <div className="space-y-6 w-full">
            <div className="family-item space-y-1">
              <h3 className="font-serif text-2xl text-[#2C1D12] font-medium tracking-wide">Mohsin</h3>
              <p className="text-[11px] text-[#5A3E2B] uppercase tracking-widest font-semibold">Son of</p>
              <p className="text-xs text-[#2F2318] font-serif">Mr. Muhammad Islam &amp; Mrs. Rehana Kosar</p>
            </div>

            <div className="family-item text-[#7E5C38] font-serif italic text-lg">&amp;</div>

            <div className="family-item space-y-1">
              <h3 className="font-serif text-2xl text-[#2C1D12] font-medium tracking-wide">Iqra</h3>
              <p className="text-[11px] text-[#5A3E2B] uppercase tracking-widest font-semibold">Daughter of</p>
              <p className="text-xs text-[#2F2318] font-serif">Mr. Shokat &amp; Mrs. Nusrat</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 4: THE CELEBRATIONS ============ */}
      <section
        id="celebrations-section"
        data-bgx={BG_POS.celebrations}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20 gap-10"
      >
        <div className={`celeb-head ${GLASS} px-8 py-4 text-center z-20`}>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">SCHEDULE &amp; VENUES</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] mt-1">The Celebrations</h2>
          <div className="w-12 h-[1px] bg-[#7E5C38]/50 mx-auto mt-2"></div>
        </div>

        <div className="w-full max-w-md flex flex-col gap-10 z-20 items-center">
          {celebrations.map((c) => (
            <div key={c.key} className="celeb-card w-[95%] max-w-[360px] relative opacity-0">
              <div className="rounded-t-[140px] rounded-b-3xl p-[3px] bg-gradient-to-b from-[#D4AF37] via-[#F3E2A9] to-[#B8860B] shadow-[0_20px_50px_rgba(90,62,43,0.28)]">
                <div className="relative overflow-hidden rounded-t-[137px] rounded-b-[21px] bg-gradient-to-b from-white/45 to-white/20 backdrop-blur-md px-5 sm:px-6 pt-12 pb-7 text-center flex flex-col items-center min-h-[440px]">
                  <div className="absolute inset-2 rounded-t-[130px] rounded-b-2xl border border-[#D4AF37]/50 pointer-events-none"></div>

                  <div className="card-shine pointer-events-none absolute top-0 -left-1/2 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent z-10"></div>

                  <div className="reveal-item flex flex-col items-center gap-2">
                    <span className="card-star text-[#B8860B] text-base leading-none">✦</span>
                    <span className="text-[10px] uppercase tracking-[0.35em] text-[#5A3E2B] font-semibold">{c.title}</span>
                    {(c.key === 'barat' ? phase === 'BETWEEN' || phase === 'WALIMA_LIVE' || phase === 'POST' : phase === 'POST') && (
                      <span className="mt-1 rounded-full border border-[#B8860B]/60 bg-white/40 px-3 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[#6E4E2B] font-semibold">
                        {c.title.charAt(0) + c.title.slice(1).toLowerCase()} Celebrated ✓
                      </span>
                    )}
                  </div>

                  <div className="reveal-item mt-4 flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-[0.3em] text-[#4A3B2C] font-medium">{c.day}</span>
                    <span
                      data-value={c.date}
                      className="date-num text-7xl font-serif font-bold leading-none my-1 bg-gradient-to-b from-[#B8860B] to-[#6E4E2B] bg-clip-text text-transparent"
                    >
                      {c.date}
                    </span>
                    <span className="text-xs uppercase tracking-[0.25em] text-[#4A3B2C] font-medium">{c.month}</span>
                  </div>

                  <div className="reveal-item flex items-center gap-2 my-5 w-full px-6">
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#B8860B]/70"></span>
                    <span className="text-[#B8860B] text-[10px]">◆</span>
                    <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#B8860B]/70"></span>
                  </div>

                  <div className="space-y-2 w-full">
                    <p className="reveal-item flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4A2E12]">
                      <ClockIcon />
                      {c.time}
                    </p>
                    <h3 className="reveal-item font-serif font-bold text-xl text-[#2C1D12]">{c.venue}</h3>
                    <p className="reveal-item flex items-start justify-center gap-1.5 text-[11px] text-[#2F2318] px-2 sm:px-4 leading-relaxed">
                      <span className="mt-[2px] text-[#8A6232] shrink-0"><PinIcon /></span>
                      <span>{c.address}</span>
                    </p>
                  </div>

                  <div className="reveal-item w-full mt-auto pt-6 relative z-20">
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full py-2.5 px-4 bg-gradient-to-r from-[#5A3E2B] to-[#7E5C38] text-white text-xs uppercase tracking-widest rounded-full shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-sans font-medium text-center"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      </>
      )}

      {/* ============ EVENTS CONCLUDED ============ */}
      {eventsOver && (
        <section
          id="concluded-section"
          data-bgx={BG_POS.footer}
          className="relative z-10 w-full flex flex-col justify-center items-center px-4 pt-28 pb-10"
          style={{ minHeight: '80svh' }}
        >
          <div className={`${GLASS} w-full max-w-sm px-6 sm:px-8 py-10 flex flex-col items-center text-center gap-4`}>
            <span className="concl-item text-[#B8860B] text-2xl leading-none">✦</span>
            <h2 className="concl-item text-xl font-serif text-[#7E5C38]" style={{ direction: 'rtl' }}>
              جَزَاكُمُ ٱللَّٰهُ خَيْرًا
            </h2>
            <span className="concl-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">
              Alhamdulillah
            </span>
            <h3 className="concl-item text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] leading-tight">
              Celebrations Concluded
            </h3>
            <div className="concl-item w-12 h-[1px] bg-[#7E5C38]/50"></div>

            <div className="concl-item flex flex-col gap-2 w-full">
              {celebrations.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between rounded-full border border-[#D4AF37]/50 bg-white/30 px-5 py-2"
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#4A3B2C] font-semibold">{c.title}</span>
                  <span className="text-[11px] font-serif text-[#2C1D12]">
                    {c.date} Nov <span className="text-[#B8860B]">✓</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="concl-item text-xs text-[#4A3B2C] italic font-serif leading-relaxed">
              Both of our celebrations have been completed. Thank you for your presence, prayers and love. Mohsin &amp; Iqra
              are grateful for your blessings.
            </p>
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer
        id="footer-section"
        data-bgx={BG_POS.footer}
        className="relative z-10 w-full overflow-hidden px-4 py-20 flex flex-col items-center text-center"
      >
        <div className="foot-flower absolute top-0 right-0 w-[130px] sm:w-[180px] md:w-[220px] pointer-events-none">
          <Pic name="left" className="w-full h-full object-contain rotate-180" alt="Corner Flower Top" />
        </div>

        <div className="foot-flower absolute bottom-0 left-0 w-[130px] sm:w-[180px] md:w-[220px] pointer-events-none">
          <Pic name="left" className="w-full h-full object-contain" alt="Corner Flower Bottom" />
        </div>

        <div className={`${GLASS} relative z-20 px-10 py-8 flex flex-col items-center gap-3`}>
          <span className="foot-item text-[#B8860B] text-base leading-none">✦</span>

          <p className="foot-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">
            Designed &amp; Developed by
          </p>
          <p className="foot-item font-serif text-lg text-[#2C1D12] font-medium tracking-wide -mt-2">Muhammad Bilal</p>

          <div className="foot-item w-12 h-[1px] bg-[#7E5C38]/50 my-2"></div>

          <a
            href="https://www.instagram.com/bilal.env0/"
            target="_blank"
            rel="noopener noreferrer"
            className="foot-item flex items-center gap-2 text-xs text-[#4A2E12] hover:text-[#2C1D12] transition-colors font-sans font-medium tracking-wide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
            </svg>
            @bilal.env0
          </a>
        </div>
      </footer>
    </div>
  );
}

/* =====================================================================
   BACKGROUND AUDIO + SOUND TOGGLE
   Audio Root level par rehta hai: pastel site aur live mode ke beech switch par bhi chalta rehta hai.
   YouTube IFrame API (postMessage): mute / unMute / playVideo, aur asli state wapas sunte hain.
   ===================================================================== */
const YT_ID = 'RpE-hVumiDI';
const YT_ORIGIN = 'https://www.youtube.com';

function useBackgroundAudio() {
  const iframeRef = useRef(null);
  const [started, setStarted] = useState(false); // iframe mount hua (user gesture ke baad)
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const post = useCallback((func, args = []) => {
    const w = iframeRef.current && iframeRef.current.contentWindow;
    if (w) w.postMessage(JSON.stringify({ event: 'command', func, args }), YT_ORIGIN);
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    let heard = false;
    let tries = 0;
    const onMsg = (e) => {
      if (e.origin !== YT_ORIGIN || e.source !== (iframeRef.current && iframeRef.current.contentWindow)) return;
      let d = e.data;
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      const info = d && d.info;
      if (!info) return;
      heard = true;
      if (typeof info.playerState === 'number') setPlaying(info.playerState === 1 || info.playerState === 3);
      if (typeof info.muted === 'boolean') setMuted(info.muted);
    };
    window.addEventListener('message', onMsg);
    // Player ready hone tak "listening" handshake dohrao (max ~15s)
    const listen = () => {
      const w = iframeRef.current && iframeRef.current.contentWindow;
      if (w) w.postMessage(JSON.stringify({ event: 'listening', id: 'bg-audio', channel: 'widget' }), YT_ORIGIN);
    };
    const id = setInterval(() => {
      tries += 1;
      if (heard || tries > 15) clearInterval(id);
      else listen();
    }, 1000);
    // Agar API se koi state na aaye (blocker wagera), maan lo music chal raha hai
    const fallback = setTimeout(() => {
      if (!heard) setPlaying(true);
    }, 4000);
    return () => {
      window.removeEventListener('message', onMsg);
      clearInterval(id);
      clearTimeout(fallback);
    };
  }, [started]);

  const start = useCallback(() => {
    setStarted(true);
    setMuted(false);
  }, []);

  const toggle = useCallback(() => {
    if (!started) {
      start();
      return;
    }
    if (!playing) {
      post('playVideo');
      post('unMute');
      setMuted(false);
      return;
    }
    if (muted) {
      post('unMute');
      post('setVolume', [100]);
      setMuted(false);
    } else {
      post('mute');
      setMuted(true);
    }
  }, [started, playing, muted, post, start]);

  return { iframeRef, started, on: started && playing && !muted, start, toggle };
}

const SOUND_THEME = {
  ivory: 'border-white/60 bg-white/40 text-[#5A3E2B] shadow-[0_8px_28px_rgba(90,62,43,0.25)] hover:bg-white/55',
  crimson: 'border-[#D4AF37]/60 bg-[#2A050D]/55 text-[#F3E2A9] shadow-[0_8px_28px_rgba(0,0,0,0.45)] hover:bg-[#2A050D]/70',
};

function SoundToggle({ on, theme, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Mute background music' : 'Turn on background music'}
      aria-pressed={on}
      title={on ? 'Sound On' : 'Sound Off'}
      className={`fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition-transform duration-200 hover:scale-110 active:scale-95 ${SOUND_THEME[theme]}`}
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity="0.18" />
        {on ? (
          <>
            <path className="animate-pulse" d="M15.5 9a4 4 0 0 1 0 6" />
            <path className="animate-pulse" style={{ animationDelay: '0.25s' }} d="M18 6.5a8 8 0 0 1 0 11" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}

/* =====================================================================
   ROOT
   - Event ka din: seedha Live experience (auto)
   - Auto-opened live experience event ke end (10 PM PKT) par khud pastel site par aa jata hai
   - Previews menu se kholi hui experience (replay) user ke Exit Preview tak rehti hai
   ===================================================================== */
function RootInner() {
  usePhase(); // phase badalne par re-render (App ko currentPhase() milta hai)
  const [mode, setMode] = useState(defaultMode); // null | 'barat' | 'walima'
  const [auto, setAuto] = useState(() => !getPreview() && defaultMode() !== null);
  const [skipIntro, setSkipIntro] = useState(false);
  const [unlockTick, setUnlockTick] = useState(0);
  const dismissed = useRef(new Set()); // jo live experiences user ne khud band kar di: auto dobara na khulen
  const audio = useBackgroundAudio();

  const leaveLive = useCallback(() => {
    clearPreview(); // ?preview param + module state dono saaf
    setSkipIntro(true);
    setAuto(false);
    setMode(null);
  }, []);

  // User ka khud ka Exit: us event ko "dismissed" mark karo
  const exitManual = useCallback(() => {
    if (mode) dismissed.current.add(mode);
    leaveLive();
  }, [mode, leaveLive]);

  const openPreview = useCallback((kind) => {
    setAuto(false); // user ne khud khola: auto-exit nahi
    setMode(kind);
  }, []);

  // 1) Event ke end (10 PM PKT) par auto-opened live mode se bahar
  useEffect(() => {
    if (!mode || !auto) return undefined;
    const end = liveEndOf(mode);
    const check = () => {
      if (nowMs() >= end) leaveLive();
    };
    const wait = Math.min(Math.max(end - nowMs(), 0) + 250, 2 ** 31 - 1);
    const id = setTimeout(check, wait);
    const onVis = () => {
      if (!document.hidden) check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mode, auto, leaveLive]);

  // 2) Pastel site par hon to unlock (12 AM PKT) par khud live mode mein dakhil (bina refresh)
  useEffect(() => {
    if (mode || getPreview()) return undefined;
    const tryEnter = () => {
      const k = defaultMode();
      if (k && !dismissed.current.has(k)) {
        setAuto(true);
        setMode(k);
        return true;
      }
      return false;
    };
    const now = nowMs();
    const next = [BARAT_UNLOCK, WALIMA_UNLOCK].find((t) => t > now);
    let id;
    if (next != null) {
      // timeout cap ~24 din: pehle fire par agle unlock ke liye dobara schedule
      id = setTimeout(() => {
        tryEnter();
        setUnlockTick((n) => n + 1);
      }, Math.min(next - now + 250, 2 ** 31 - 1));
    }
    const onVis = () => {
      if (!document.hidden) tryEnter();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mode, unlockTick]);

  return (
    <>
      {mode && (
        <button
          type="button"
          onClick={exitManual}
          className="fixed z-[300] cursor-pointer rounded-full border-none bg-black/60 px-3 py-1 text-[10px] uppercase tracking-widest text-white backdrop-blur-sm"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
          }}
        >
          {auto ? 'Invitation' : 'Exit Preview'}
        </button>
      )}
      {mode ? (
        <LiveEventExperience key={mode} kind={mode} />
      ) : (
        // currentPhase() render par taza: auto-exit ke foran baad POST layout (1s ka purana phase nahi)
        <App phase={currentPhase()} skipIntro={skipIntro} onPreview={openPreview} onGateOpen={audio.start} />
      )}

      {/* Background audio: Root level, mode switch par bhi chalta rehta hai */}
      {audio.started && (
        <iframe
          ref={audio.iframeRef}
          src={`${YT_ORIGIN}/embed/${YT_ID}?autoplay=1&loop=1&playlist=${YT_ID}&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(
            window.location.origin
          )}`}
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          title="Background Audio"
          id="bg-audio"
          style={{ position: 'fixed', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', border: 0 }}
        ></iframe>
      )}

      <SoundToggle on={audio.on} theme={mode === 'barat' ? 'crimson' : 'ivory'} onClick={audio.toggle} />
    </>
  );
}

export default function Root() {
  // Pehle server clock se sync (max ~1.5s), taake galat device clock se unlock / live galat na ho
  const [clockReady, setClockReady] = useState(false);
  useEffect(() => {
    let alive = true;
    syncServerClock().finally(() => {
      if (alive) setClockReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!clockReady) return <div className="fixed inset-0 bg-[#F4EFEB]" />;
  return <RootInner />;
}