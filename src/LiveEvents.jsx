import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import BurnReveal from './BurnReveal';
import { VENUES, mapsLink, useNowTick, liveStage, getPreview } from './eventConfig';

gsap.registerPlugin(useGSAP);

/* ---- RED CARPET family-walk end point (1-2% se tweak karo) ---- */
const CARPET_END_SCALE = 0.5;
const CARPET_END_Y = -24;

/* =====================================================================
   TUNING (images ke hisaab se yahin se adjust karo)
   ===================================================================== */
export const LIVE_ASSETS = {
  barat: ['walima-road', 'walima-car', 'jiya-hall-exterior', 'barat-car-arriving', 'royal-stage-sofa'],
  walima: ['walima-hall', 'sky-lanterns', 'family-walk', 'walima-stage'],
};

const ENTRANCE = { barat: 'road', walima: 'carpet' };
const STAGE_IMG = { barat: 'royal-stage-sofa', walima: 'walima-stage' };
const STAGE_OVERLAY = {
  barat: 'bg-gradient-to-t from-black/75 via-black/35 to-black/50',
  walima: 'bg-gradient-to-b from-black/10 via-transparent to-black/25',
};
export const LIVE_WEBP = Object.values(LIVE_ASSETS)
  .flat()
  .map((n) => `/images/${n}.webp`);

const LIVE_LOADER_BG = '#24040A';
const PRELOAD_TIMEOUT = 8000;

const WALIMA_START_DELAY = 0.3;
const WALIMA_PAN_DUR = 4.2;
const WALIMA_BURN_AT = 4.05;
const WALIMA_BURN_ORIGIN = [0.5, 0.36]; // Center-archway / fountain focal point

const SKY_LANTERNS = [
  { id: 1, left: '7%', top: '52%', size: 'w-8 sm:w-11 md:w-13', delay: 0.15, dur: 3.7, dx: 20, dy: -46, peak: 0.92, rot: -5 },
  { id: 2, left: '16%', top: '58%', size: 'w-11 sm:w-15 md:w-18', delay: 0.05, dur: 3.9, dx: 28, dy: -54, peak: 1.0, rot: 4 },
  { id: 3, left: '25%', top: '48%', size: 'w-6 sm:w-8 md:w-10', delay: 0.45, dur: 3.5, dx: 16, dy: -40, peak: 0.85, rot: -3 },
  { id: 4, left: '33%', top: '56%', size: 'w-9 sm:w-12 md:w-14', delay: 0.25, dur: 3.8, dx: 24, dy: -48, peak: 0.94, rot: 5 },
  { id: 5, left: '42%', top: '50%', size: 'w-7 sm:w-9 md:w-11', delay: 0.65, dur: 3.4, dx: 18, dy: -42, peak: 0.86, rot: -4 },
  { id: 6, left: '50%', top: '55%', size: 'w-11 sm:w-14 md:w-17', delay: 0.2, dur: 3.9, dx: 26, dy: -52, peak: 0.98, rot: 3 },
  { id: 7, left: '59%', top: '47%', size: 'w-6 sm:w-8 md:w-10', delay: 0.75, dur: 3.3, dx: 16, dy: -38, peak: 0.82, rot: -3 },
  { id: 8, left: '67%', top: '57%', size: 'w-12 sm:w-16 md:w-20', delay: 0.1, dur: 4.0, dx: 30, dy: -55, peak: 1.0, rot: -4 },
  { id: 9, left: '76%', top: '51%', size: 'w-8 sm:w-11 md:w-13', delay: 0.5, dur: 3.6, dx: 22, dy: -44, peak: 0.9, rot: 4 },
  { id: 10, left: '85%', top: '56%', size: 'w-10 sm:w-13 md:w-16', delay: 0.3, dur: 3.8, dx: 24, dy: -48, peak: 0.95, rot: -5 },
  { id: 11, left: '12%', top: '62%', size: 'w-6 sm:w-8 md:w-9', delay: 0.9, dur: 3.2, dx: 14, dy: -36, peak: 0.8, rot: 2 },
  { id: 12, left: '29%', top: '63%', size: 'w-8 sm:w-10 md:w-12', delay: 0.8, dur: 3.4, dx: 20, dy: -42, peak: 0.88, rot: 3 },
  { id: 13, left: '55%', top: '61%', size: 'w-7 sm:w-9 md:w-11', delay: 1.0, dur: 3.3, dx: 18, dy: -40, peak: 0.84, rot: -2 },
  { id: 14, left: '72%', top: '62%', size: 'w-9 sm:w-11 md:w-13', delay: 0.85, dur: 3.5, dx: 22, dy: -44, peak: 0.9, rot: 4 },
  { id: 15, left: '89%', top: '49%', size: 'w-6 sm:w-8 md:w-10', delay: 0.95, dur: 3.2, dx: 15, dy: -38, peak: 0.82, rot: -3 },
];

// Act 1 (Road) + Act 2 (Jiya Banquet Hall Arrival & Car Stop)
const ROAD_START_DELAY = 0.35;
const TITLE_DROP = 0.7;
const TITLE_FROM_SCALE = 1.9;
const CAR_START = 0.65;
const CAR_ENTRY = 1.35;
const ROAD_START = 1.25;
const ROAD_RAMP = 1.0;
const TITLE_TOP = 52;
const HALL_CUT_AT = 2.75;   // Act 2: Jiya Banquet Hall scene fade-in
const HALL_CAR_STOP = 4.75; // Car hall ke bahar mukammal rukti hai
const ROAD_DRIVE = 5.15;    // Brief pause ke baad WebGL BurnReveal shuru
const BURN_DUR = 2.4;
const ROAD_SPEED = 0.65;
const ROAD_TILES = 8;
const ROAD_COL_MAX = 640;
const ROAD_ZOOM = 1.7;
const LANE_FRAC = 0.2 * ROAD_ZOOM;
const BURN_ORIGIN = [0.48, 0.22]; // Seedha parked car ke upar se aag phail kar stage khulega

/* =====================================================================
   COPY / THEME
   ===================================================================== */
const LIVE = {
  barat: {
    name: 'Barat',
    dayBadge: 'BARAT DAY • TODAY',
    startLabel: 'BARAT STARTS IN',
    endLabel: 'BARAT CELEBRATION ENDS IN',
    headline: {
      today: "Mohsin & Iqra's Barat Is Today!",
      live: "Mohsin & Iqra's Barat Has Begun!",
      done: 'Thank You For Celebrating With Us',
    },
    msg: {
      today:
        'Alhamdulillah, the blessed day has arrived! Join us this evening as we celebrate the Barat of Mohsin & Iqra. Your presence and prayers will make it complete.',
      live: 'With the grace of Almighty Allah, the Barat ceremony is now underway. Your presence and prayers will make our joyous evening complete.',
      done: 'Alhamdulillah, the Barat has been completed. Thank you for your presence, prayers and love.',
    },
  },
  walima: {
    name: 'Walima',
    dayBadge: 'WALIMA DAY • TODAY',
    startLabel: 'WALIMA STARTS IN',
    endLabel: 'WALIMA CELEBRATION ENDS IN',
    headline: {
      today: "Mohsin & Iqra's Walima Is Today!",
      live: "Welcome to Mohsin & Iqra's Walima!",
      done: 'Thank You For Celebrating With Us',
    },
    msg: {
      today:
        'Alhamdulillah, the Walima day is here! Join us this evening for a warm and joyful reception in honour of Mohsin & Iqra.',
      live: 'Praise be to Allah, the Walima reception is now live. Join us as we celebrate this blessed union with love, warmth, and gratitude.',
      done: 'Alhamdulillah, the Walima has been completed. Thank you for your presence, prayers and love.',
    },
  },
};

const THEME = {
  barat: {
    card: 'border-[#D4AF37]/60 bg-[#2A050D]/45 shadow-[0_20px_60px_rgba(0,0,0,0.5)]',
    bismillah: 'text-[#D4AF37]',
    badge: 'border-[#D4AF37]/50 bg-black/30',
    badgeText: 'text-[#F3E2A9]',
    dot: 'bg-[#D4AF37]',
    title: 'text-[#FFF4DC]',
    body: 'text-[#FFF4DC]/85',
    label: 'text-[#F3E2A9]',
    tile: 'border-[#D4AF37]/50 bg-black/30',
    tileNum: 'text-[#FFF4DC]',
    rule: 'bg-[#D4AF37]/60',
    dua: 'text-[#F3E2A9]',
    duaEn: 'text-[#FFF4DC]/80',
    venue: 'text-[#FFF4DC]',
    btn: 'shadow-[0_0_24px_rgba(212,175,55,0.55)]',
    replay: 'text-[#F3E2A9]/90',
  },
  walima: {
    card: 'border-[#C9A227]/70 bg-[#FFF8EA]/70 shadow-[0_20px_60px_rgba(90,62,43,0.35)]',
    bismillah: 'text-[#9A7414]',
    badge: 'border-[#C9A227]/60 bg-white/55',
    badgeText: 'text-[#6E4E2B]',
    dot: 'bg-[#B8860B]',
    title: 'text-[#3A2B1C]',
    body: 'text-[#4A3B2C]',
    label: 'text-[#7E5C38]',
    tile: 'border-[#C9A227]/50 bg-white/60',
    tileNum: 'text-[#3A2B1C]',
    rule: 'bg-[#B8860B]/50',
    dua: 'text-[#7E5C38]',
    duaEn: 'text-[#4A3B2C]',
    venue: 'text-[#3A2B1C]',
    btn: 'shadow-[0_0_22px_rgba(201,162,39,0.5)]',
    replay: 'text-[#5A3E2B]',
  },
};

/* =====================================================================
   IMAGES: webp pehle, png fallback, aur decode() ke baad hi "ready"
   ===================================================================== */
const loadDecoded = (src) =>
  new Promise((resolve) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = async () => {
      try {
        await i.decode();
      } catch {
        /* fallback */
      }
      resolve(true);
    };
    i.onerror = () => resolve(false);
    i.src = src;
  });

export const preloadPic = async (name, cb) => {
  let ok = await loadDecoded(`/images/${name}.webp`);
  if (!ok) ok = await loadDecoded(`/images/${name}.png`);
  if (cb) cb(ok);
};

export function usePreloadImages(names, timeoutMs = PRELOAD_TIMEOUT) {
  const [state, setState] = useState({ progress: 0, ready: false });
  const key = names.join('|');

  useEffect(() => {
    let alive = true;
    let finished = false;
    let count = 0;
    const total = names.length;
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      setState({ progress: 100, ready: true });
    };
    names.forEach((n) =>
      preloadPic(n, () => {
        if (!alive || finished) return;
        count += 1;
        setState({ progress: Math.round((count / total) * 100), ready: false });
        if (count === total) finish();
      })
    );
    const t = setTimeout(finish, timeoutMs);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, timeoutMs]);

  return state;
}

export function Pic({ name, alt = '', className = '', style, imgRef }) {
  const [format, setFormat] = useState('webp');
  const onError = () =>
    setFormat((f) => {
      if (f === 'webp') return 'png';
      if (f === 'png') {
        console.warn(`[Pic] "${name}": na .webp load hui na .png`);
        return 'failed';
      }
      return f;
    });
  if (format === 'failed') return null;
  return (
    <picture key={format} className="contents">
      {format === 'webp' && <source srcSet={`/images/${name}.webp`} type="image/webp" />}
      <img
        ref={imgRef}
        src={`/images/${name}.png`}
        alt={alt}
        className={className}
        style={style}
        loading="eager"
        decoding="async"
        draggable={false}
        onError={onError}
      />
    </picture>
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   STAGE CARD
   ===================================================================== */
function StageCard({ kind, onReplay }) {
  const clock = useNowTick();
  const ev = LIVE[kind];
  const th = THEME[kind];
  const v = VENUES[kind];
  const now = getPreview() === kind ? Date.now() : clock;
  const { stage, target } = liveStage(kind, now);
  const diff = Math.max(0, target - now);
  const pad = (n) => String(n).padStart(2, '0');
  const tiles = [
    { label: 'Hours', value: pad(Math.floor(diff / 3600000)) },
    { label: 'Mins', value: pad(Math.floor(diff / 60000) % 60) },
    { label: 'Secs', value: pad(Math.floor(diff / 1000) % 60) },
  ];
  const badge =
    stage === 'today' ? ev.dayBadge : stage === 'live' ? 'LIVE CELEBRATION • NOW HAPPENING' : 'CELEBRATION CONCLUDED • ALHAMDULILLAH ✓';

  return (
    <>
      <div className={`w-full max-w-sm rounded-3xl border backdrop-blur-md px-6 sm:px-7 py-8 text-center flex flex-col items-center gap-4 ${th.card}`}>
        <h1 className={`live-item text-xl font-serif ${th.bismillah}`} style={{ direction: 'rtl' }}>
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
        </h1>

        <div className={`live-item inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 ${th.badge}`}>
          {stage !== 'done' && (
            <span className="relative flex h-2 w-2 shrink-0">
              {stage === 'live' && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${th.dot}`}></span>}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${th.dot}`}></span>
            </span>
          )}
          <span className={`text-[9px] uppercase tracking-[0.2em] font-semibold ${th.badgeText}`}>{badge}</span>
        </div>

        <h2 className={`live-item text-2xl sm:text-3xl font-serif font-bold leading-tight ${th.title}`}>{ev.headline[stage]}</h2>
        <p className={`live-item text-xs italic font-serif leading-relaxed ${th.body}`}>{ev.msg[stage]}</p>

        <div className={`live-item w-full ${stage === 'done' ? 'hidden' : ''}`} data-testid="live-countdown">
          <p className={`text-[9px] uppercase tracking-[0.3em] font-semibold mb-2 ${th.label}`}>
            {stage === 'today' ? ev.startLabel : ev.endLabel}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className={`flex flex-col items-center rounded-xl border py-2 ${th.tile}`}>
                <span className={`font-serif text-xl font-bold tabular-nums ${th.tileNum}`}>{t.value}</span>
                <span className={`text-[8px] uppercase tracking-widest font-semibold ${th.label}`}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`live-item w-14 h-[1px] ${th.rule}`}></div>

        <div className="live-item flex flex-col gap-1">
          <span className={`text-base font-serif ${th.dua}`} style={{ direction: 'rtl' }}>
            بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
          </span>
          <span className={`text-[11px] italic font-serif ${th.duaEn}`}>
            May Allah bless you, shower His blessings upon you, and unite you both in goodness.
          </span>
        </div>

        <div className={`live-item text-xs font-serif leading-relaxed ${th.venue}`}>
          <p className="font-bold">{v.name}</p>
          <p>{v.area}</p>
        </div>

        <a
          href={mapsLink(v.mapQuery)}
          target="_blank"
          rel="noopener noreferrer"
          className={`live-item inline-block w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#F3E2A9] text-[#2A050D] text-xs font-bold uppercase tracking-widest text-center ${th.btn}`}
        >
          Get Hall Directions 📍
        </a>
      </div>

      <button
        type="button"
        onClick={onReplay}
        className={`live-item mt-5 text-[11px] tracking-[0.2em] underline underline-offset-4 bg-transparent border-none cursor-pointer ${th.replay}`}
      >
        ↺ Replay Entrance
      </button>
    </>
  );
}

function LiveLoader({ ready, progress, bg, text, accent }) {
  return (
    <div
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center gap-4 transition-opacity duration-700 ${
        ready ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: bg }}
    >
      <span className="text-[#D4AF37] text-3xl animate-pulse">✦</span>
      <p className="font-serif italic text-lg tracking-wide" style={{ color: text }}>
        Loading Celebration...
      </p>
      <div className="w-40 h-[3px] bg-[#D4AF37]/25 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4AF37] transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>
      <span className="text-[10px] tracking-[0.3em] font-semibold" style={{ color: accent }}>
        {progress}%
      </span>
    </div>
  );
}

function Sparks({ count = 16 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="spark absolute left-0 top-0 h-[3px] w-[3px] rounded-full bg-[#FFE9A8] opacity-0 shadow-[0_0_8px_2px_rgba(255,214,120,0.8)]"
        />
      ))}
    </div>
  );
}

const LEAF_COLORS = ['#9BBF3A', '#D7B043', '#5F8F3A', '#C9962E'];

function Leaves({ count = 9 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="leaf absolute left-0 top-0 h-[9px] w-[5px] opacity-90"
          style={{ background: LEAF_COLORS[i % LEAF_COLORS.length], borderRadius: '100% 0 100% 0' }}
        />
      ))}
    </div>
  );
}

/* =====================================================================
   LIVE EXPERIENCE
   ===================================================================== */
export default function LiveEventExperience({ kind }) {
  const entrance = ENTRANCE[kind];
  const root = useRef(null);
  const tlRef = useRef(null);
  const { progress, ready } = usePreloadImages(LIVE_ASSETS[kind]);

  // Walima refs
  const famRef = useRef(null);
  const swayRef = useRef(null);
  const bobRef = useRef(null);

  // Barat (road + Jiya Banquet Hall arrival) refs
  const s1Ref = useRef(null);
  const camRef = useRef(null);
  const trackRef = useRef(null);
  const carRef = useRef(null);
  const carSwayRef = useRef(null);
  const carVibRef = useRef(null);
  const hallLayerRef = useRef(null);
  const hallBgRef = useRef(null);
  const hallCarRef = useRef(null);
  const hallCarBodyRef = useRef(null);
  const cardLayerRef = useRef(null);
  const titleRef = useRef(null);
  const resetRoadRef = useRef(null);
  const burnRef = useRef(0);
  const glOkRef = useRef(false);

  useGSAP(
    () => {
      if (!ready) return undefined;
      const reduce = prefersReducedMotion();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      /* ----------------------------------------------------------
         WALIMA SKY LANTERNS + PALACE COURTYARD ENTRANCE
         1. Static full-frame palace hall (no zoom/pan).
         2. Couple/family stands steadily centered outside the hall.
         3. 15 responsive sky lanterns rise from mid-screen upward with
            opacity 0 -> 1 and gentle left-to-right drift.
         4. Golden BurnReveal transitions into walima-stage + Walima card.
         ---------------------------------------------------------- */
      if (entrance === 'carpet') {
        const fam = famRef.current;
        const sway = swayRef.current;
        const bob = bobRef.current;
        const s1 = s1Ref.current;
        const lanternEls = gsap.utils.toArray('.walima-lantern');

        burnRef.current = 0;
        gsap.set(s1, { autoAlpha: 1 });
        gsap.set(cardLayerRef.current, { autoAlpha: 0 });
        gsap.set('.live-bg1', { scale: 1, yPercent: 0, transformOrigin: '50% 50%' });
        gsap.set(fam, { autoAlpha: 1, xPercent: -50, yPercent: 0, scale: 1, transformOrigin: '50% 90%' });
        gsap.set(sway, { rotation: 0, transformOrigin: '50% 100%' });
        gsap.set(bob, { y: 0 });
        gsap.set('.live-heat', { opacity: 0 });
        gsap.set('.live-item', { opacity: 0, y: 16 });
        gsap.set('.live-pill', { opacity: 0, y: -10 });

        lanternEls.forEach((el) => {
          gsap.set(el, { opacity: 0, x: 0, y: 0, scale: 0.65, rotation: 0 });
        });

        const tl = gsap.timeline({ delay: WALIMA_START_DELAY });

        // Top badge + subtle natural breathing motion for family standing outside the hall
        tl.to('.live-pill', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.15)
          .to(sway, { rotation: 0.9, duration: 2.0, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.2)
          .to(bob, { y: -2.5, duration: 1.4, yoyo: true, repeat: 2, ease: 'sine.inOut' }, 0.2);

        // Multiple Sky Lanterns rising from mid-screen upward with opacity 0 -> 1 & left-to-right drift
        lanternEls.forEach((el, idx) => {
          const cfg = SKY_LANTERNS[idx % SKY_LANTERNS.length];
          const dxPx = (cfg.dx / 100) * Math.min(vw, 520);
          const dyPx = (cfg.dy / 100) * vh;

          tl.fromTo(
            el,
            { opacity: 0, x: 0, y: 0, scale: 0.65, rotation: -cfg.rot },
            {
              x: dxPx,
              y: dyPx,
              scale: 1.08,
              rotation: cfg.rot,
              duration: cfg.dur,
              ease: 'power1.out',
            },
            cfg.delay
          ).to(
            el,
            {
              opacity: cfg.peak,
              duration: cfg.dur * 0.38,
              ease: 'power2.out',
            },
            cfg.delay
          );
        });

        // Warm golden glow before burn
        tl.fromTo('.live-heat', { opacity: 0 }, { opacity: 0.72, duration: BURN_DUR * 0.5, ease: 'power1.in' }, WALIMA_BURN_AT - 0.25)
          // BurnReveal transition into walima-stage
          .fromTo(burnRef, { current: 0 }, { current: 1, duration: BURN_DUR, ease: 'power1.inOut' }, WALIMA_BURN_AT)
          .fromTo(
            s1,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: BURN_DUR, ease: (p) => (glOkRef.current ? (p >= 1 ? 1 : 0) : p) },
            WALIMA_BURN_AT
          )
          .to(cardLayerRef.current, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, WALIMA_BURN_AT + BURN_DUR * 0.55)
          .to('.live-item', { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, WALIMA_BURN_AT + BURN_DUR * 0.6);

        tlRef.current = tl;

        if (!reduce) {
          gsap.utils.toArray('.spark').forEach((el) => {
            gsap.set(el, { x: gsap.utils.random(0, vw), y: gsap.utils.random(vh * 0.1, vh), scale: gsap.utils.random(0.6, 1.8) });
            gsap.to(el, {
              y: `-=${gsap.utils.random(120, 320)}`,
              x: `+=${gsap.utils.random(-40, 40)}`,
              duration: gsap.utils.random(3.5, 6.5),
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });
            gsap.to(el, {
              opacity: gsap.utils.random(0.5, 1),
              duration: gsap.utils.random(0.8, 1.8),
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
              delay: gsap.utils.random(0, 2),
            });
          });
        }
        return undefined;
      }

      /* ----------------------------------------------------------
         BARAT ENTRANCE (2 ACTS):
         Act 1: Road par BARAT CELEBRATION stamp + car drive
         Act 2: Jiya Banquet Hall exterior crossfade + rear-3/4 "Just Married"
                car brick driveway par chhoti hoti hui hall ke bahar ja kar stop
                hoti hai -> phir BurnReveal se stage card khulta hai
         ---------------------------------------------------------- */
      const s1 = s1Ref.current;
      const cam = camRef.current;
      const track = trackRef.current;
      const car = carRef.current;
      const sway = carSwayRef.current;
      const vib = carVibRef.current;
      const titleEl = titleRef.current;
      const hallLayer = hallLayerRef.current;
      const hallBg = hallBgRef.current;
      const hallCar = hallCarRef.current;
      const hallCarBody = hallCarBodyRef.current;
      const imgs = track.querySelectorAll('img');

      let period = 0;
      const measure = () => {
        const im = imgs[0];
        const ratio = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 0;
        period = ratio ? 2 * (track.clientWidth * ratio - 1) : 0;
      };
      measure();

      const st = { y: 0, speed: 0, t: 0 };
      let titleGone = false;
      const apply = () => {
        if (!period) {
          measure();
          if (!period) return;
        }
        track.style.transform = `translate3d(0, ${(-period + (st.y % period)).toFixed(2)}px, 0)`;
      };
      const tick = () => {
        const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 0.05);
        st.t += dt;
        st.y += st.speed * window.innerHeight * dt;
        apply();
        if (!titleGone) {
          titleEl.style.transform = `translate3d(-50%, ${st.y.toFixed(2)}px, 0)`;
          if (st.y > window.innerHeight * 1.2) {
            titleGone = true;
            titleEl.style.visibility = 'hidden';
          }
        }
        const k = Math.min(1, st.speed / ROAD_SPEED);
        const sx = Math.sin(st.t * 0.9) * 7 * k;
        const yaw = Math.cos(st.t * 0.9) * 0.9 * k;
        sway.style.transform = `translate3d(${sx.toFixed(2)}px,0,0) rotate(${yaw.toFixed(3)}deg)`;
        const bounce = (Math.sin(st.t * 23) * 0.6 + Math.sin(st.t * 37 + 1.3) * 0.4) * 1.5 * k;
        const roll = (Math.sin(st.t * 17 + 0.7) * 0.6 + Math.sin(st.t * 29) * 0.4) * 0.35 * k;
        vib.style.transform = `translate3d(0,${bounce.toFixed(2)}px,0) rotate(${roll.toFixed(3)}deg)`;
      };
      gsap.ticker.add(tick);
      window.addEventListener('resize', measure);

      resetRoadRef.current = () => {
        st.y = 0;
        st.t = 0;
        titleGone = false;
        titleEl.style.visibility = 'visible';
        titleEl.style.transform = 'translate3d(-50%, 0, 0)';
      };

      const BURN_AT = ROAD_DRIVE;
      burnRef.current = 0;
      apply();

      gsap.set(s1, { autoAlpha: 1 });
      gsap.set(hallLayer, { autoAlpha: 0 });
      gsap.set(hallBg, { scale: 1.07, transformOrigin: '55% 42%' });
      gsap.set(hallCar, {
        xPercent: -66,
        yPercent: 52,
        scale: 1.48,
        transformOrigin: '50% 85%',
      });
      gsap.set(hallCarBody, { y: 0, rotation: 0, transformOrigin: '50% 85%' });
      gsap.set(cardLayerRef.current, { autoAlpha: 0 });
      gsap.set('.live-heat', { opacity: 0 });
      gsap.set('.car-glow', { opacity: 0 });
      gsap.set(cam, { scale: 1, transformOrigin: '50% 80%' });
      gsap.set('.live-item', { opacity: 0, y: 16 });
      gsap.set('.road-title', { scale: TITLE_FROM_SCALE, opacity: 0, transformOrigin: '50% 50%' });
      titleEl.style.visibility = 'visible';
      titleEl.style.transform = 'translate3d(-50%, 0, 0)';

      const tl = gsap.timeline({ delay: ROAD_START_DELAY });
      tl
        // ACT 1: Road title stamp + top-down car drive
        .fromTo(
          '.road-title',
          { scale: TITLE_FROM_SCALE, opacity: 0 },
          { scale: 1, opacity: 1, duration: TITLE_DROP, ease: 'back.out(1.5)' },
          0
        )
        .fromTo(
          car,
          { xPercent: -50, yPercent: 115 },
          { xPercent: -50, yPercent: 4, duration: CAR_ENTRY, ease: 'power2.out' },
          CAR_START
        )
        .to(car, { y: -vh * 0.08, duration: HALL_CUT_AT - (CAR_START + CAR_ENTRY) + 0.4, ease: 'sine.inOut' }, CAR_START + CAR_ENTRY)
        .fromTo('.car-glow', { opacity: 0 }, { opacity: 0.9, duration: 0.7, ease: 'power1.out' }, CAR_START + CAR_ENTRY * 0.55)
        .fromTo(st, { speed: 0 }, { speed: ROAD_SPEED * 1.25, duration: ROAD_RAMP, ease: 'power2.inOut' }, ROAD_START)
        .fromTo(cam, { scale: 1 }, { scale: 1.08, duration: HALL_CUT_AT + 0.5, ease: 'power1.in' }, 0)

        // ACT 2: Crossfade to Jiya Banquet Hall exterior & "Just Married" car arrives & stops outside
        .to(hallLayer, { autoAlpha: 1, duration: 0.65, ease: 'power2.inOut' }, HALL_CUT_AT)
        .set(st, { speed: 0 }, HALL_CUT_AT + 0.65)
        .to(hallBg, { scale: 1.0, duration: BURN_AT - HALL_CUT_AT + 0.4, ease: 'power2.out' }, HALL_CUT_AT)
        .to(
          hallCar,
          {
            xPercent: -53,
            yPercent: -2,
            scale: 1.02,
            duration: HALL_CAR_STOP - HALL_CUT_AT,
            ease: 'power3.out',
          },
          HALL_CUT_AT + 0.05
        )
        // Subtle forward brake dip & suspension settle right as the car comes to a complete stop
        .to(
          hallCarBody,
          {
            y: 3.5,
            rotation: -0.7,
            duration: 0.14,
            yoyo: true,
            repeat: 1,
            ease: 'sine.inOut',
          },
          HALL_CAR_STOP - 0.05
        )
        // Warm golden heat bloom around the parked car outside Jiya Banquet Hall before burn
        .fromTo('.live-heat', { opacity: 0 }, { opacity: 0.75, duration: BURN_DUR * 0.55, ease: 'power1.in' }, BURN_AT - 0.25)

        // ACT 3: Golden BurnReveal -> Royal Stage Card
        .fromTo(burnRef, { current: 0 }, { current: 1, duration: BURN_DUR, ease: 'power1.inOut' }, BURN_AT)
        .fromTo(
          s1,
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: BURN_DUR, ease: (p) => (glOkRef.current ? (p >= 1 ? 1 : 0) : p) },
          BURN_AT
        )
        .to(cardLayerRef.current, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, BURN_AT + BURN_DUR * 0.55)
        .to('.live-item', { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, BURN_AT + BURN_DUR * 0.6);
      tlRef.current = tl;

      if (!reduce) {
        gsap.utils.toArray('.leaf').forEach((el) => {
          gsap.fromTo(
            el,
            { x: () => gsap.utils.random(0, vw), y: -30, rotation: () => gsap.utils.random(0, 360) },
            {
              x: '-=90',
              y: vh + 30,
              rotation: '+=360',
              duration: gsap.utils.random(3.5, 6.5),
              ease: 'none',
              repeat: -1,
              repeatRefresh: true,
              delay: gsap.utils.random(0, 4),
            }
          );
        });
      }

      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener('resize', measure);
      };
    },
    { scope: root, dependencies: [ready] }
  );

  const replay = () => {
    if (!tlRef.current) return;
    burnRef.current = 0;
    if (resetRoadRef.current) resetRoadRef.current();
    tlRef.current.restart();
  };

  /* ============================ WALIMA (Sky Lanterns + Palace Courtyard + Couple Center) ============================ */
  if (entrance === 'carpet') {
    return (
      <div ref={root} className="fixed inset-0 overflow-hidden bg-[#140B1A]">
        <LiveLoader ready={ready} progress={progress} bg={LIVE_LOADER_BG} text="#F3E2A9" accent="#D4AF37" />

        {/* Stage background revealed by BurnReveal */}
        <div className="absolute inset-0 z-10">
          <Pic name={STAGE_IMG[kind]} className="h-full w-full object-cover" />
        </div>

        {/* Scene 1: Static Palace Courtyard + Rising Sky Lanterns + Centered Couple */}
        <div ref={s1Ref} className="absolute inset-0 z-20 overflow-hidden bg-[#140B1A]">
          <div className="live-bg1 absolute inset-0 will-change-transform">
            <Pic
              name="walima-hall"
              alt="Walima Palace Courtyard"
              className="h-full w-full object-cover object-center"
            />
          </div>

          {/* Soft cinematic night vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(12,6,20,0.52) 100%)' }}
          ></div>

          {/* Responsive Couple / Family centered in courtyard */}
          <div
            ref={famRef}
            className="absolute bottom-[3%] sm:bottom-[5%] left-1/2 z-20 w-[64vw] max-w-[260px] sm:max-w-[330px] md:max-w-[390px] will-change-transform"
            style={{ opacity: 1 }}
          >
            <div ref={swayRef} className="will-change-transform">
              <div ref={bobRef} className="will-change-transform">
                <Pic
                  name="family-walk"
                  alt="Couple at Walima"
                  className="w-full h-auto block object-contain bg-transparent drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]"
                />
              </div>
            </div>
          </div>

          {/* Multiple Responsive Sky Lanterns rising from mid-screen upward + left-to-right drift */}
          <div className="absolute inset-0 z-[24] pointer-events-none overflow-hidden" aria-hidden="true">
            {SKY_LANTERNS.map((l) => (
              <div
                key={l.id}
                className={`walima-lantern absolute ${l.size} will-change-transform`}
                style={{ left: l.left, top: l.top, opacity: 0 }}
              >
                <Pic
                  name="sky-lanterns"
                  alt=""
                  className="w-full h-auto block object-contain drop-shadow-[0_0_16px_rgba(255,175,65,0.85)]"
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 z-[25] pointer-events-none">
            <Sparks />
          </div>

          {/* Warm golden heat bloom right before burn */}
          <div
            className="live-heat absolute inset-0 z-[28] pointer-events-none opacity-0"
            style={{
              background: `radial-gradient(circle at ${WALIMA_BURN_ORIGIN[0] * 100}% ${(1 - WALIMA_BURN_ORIGIN[1]) * 100}%, rgba(255,205,120,0.85) 0%, rgba(255,150,60,0.35) 28%, transparent 62%)`,
              mixBlendMode: 'screen',
            }}
          ></div>

          <div
            className="live-pill absolute inset-x-0 z-30 flex justify-center pointer-events-none"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 52px)', opacity: 0 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/60 bg-black/35 px-4 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75 animate-ping"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D4AF37]"></span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#F3E2A9]">
                {LIVE[kind].name} Celebration • Live
              </span>
            </div>
          </div>
        </div>

        <BurnReveal
          name={STAGE_IMG[kind]}
          progressRef={burnRef}
          origin={WALIMA_BURN_ORIGIN}
          onStatus={(ok) => {
            glOkRef.current = ok;
          }}
          className="absolute inset-0 z-30"
        />

        <div ref={cardLayerRef} className="absolute inset-0 z-40" style={{ visibility: 'hidden', opacity: 0 }}>
          <div className={`absolute inset-0 pointer-events-none ${STAGE_OVERLAY[kind]}`}></div>
          <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
            <div className="min-h-full flex flex-col items-center justify-center px-4 pt-10 pb-24">
              <StageCard kind={kind} onReplay={replay} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================ BARAT (Act 1: Road -> Act 2: Jiya Banquet Hall Stop) ============================ */
  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-[#10180f]">
      <LiveLoader ready={ready} progress={progress} bg={LIVE_LOADER_BG} text="#F3E2A9" accent="#D4AF37" />

      {/* STAGE (neeche): burn ke baad / WebGL na ho to yahi */}
      <div className="absolute inset-0 z-10">
        <Pic name={STAGE_IMG[kind]} className="h-full w-full object-cover" />
      </div>

      {/* SCENE 1 (z-20): Act 1 (Road) + Act 2 (Jiya Banquet Hall Exterior) dono is mein hain taake BurnReveal (z-30) seedha hall scene ko jalaye */}
      <div ref={s1Ref} className="absolute inset-0 z-20 overflow-hidden bg-[#10180f]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <Pic name="walima-road" className="h-full w-full scale-110 object-cover blur-md" />
          <div className="absolute inset-0 bg-black/35"></div>
        </div>

        <div ref={camRef} className="absolute inset-0 will-change-transform">
          {/* Road column */}
          <div
            className="absolute inset-y-0 left-1/2 w-full -translate-x-1/2 overflow-hidden sm:[-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
            style={{ maxWidth: ROAD_COL_MAX }}
          >
            <div
              ref={trackRef}
              className="absolute top-0 will-change-transform"
              style={{ width: `${ROAD_ZOOM * 100}%`, left: `${(1 - ROAD_ZOOM) * 50}%` }}
            >
              {Array.from({ length: ROAD_TILES }).map((_, i) => (
                <Pic
                  key={i}
                  name="walima-road"
                  className="-mb-px block h-auto w-full select-none"
                  style={i % 2 ? { transform: 'scaleY(-1)' } : undefined}
                />
              ))}
            </div>
          </div>

          {/* ROAD TITLE */}
          <div
            ref={titleRef}
            className="absolute left-1/2 z-[5] pointer-events-none"
            style={{
              top: `${TITLE_TOP}%`,
              width: 'var(--lane)',
              transform: 'translate3d(-50%, 0, 0)',
              '--lane': `calc(min(100vw, ${ROAD_COL_MAX}px) * ${LANE_FRAC})`,
            }}
          >
            <div
              className="road-title flex flex-col items-center text-center will-change-transform"
              style={{ opacity: 0, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.65)) drop-shadow(0 0 6px rgba(0,0,0,0.35))' }}
            >
              <span
                className="font-serif font-bold uppercase leading-none"
                style={{
                  fontSize: 'calc(var(--lane) * 0.3)',
                  letterSpacing: '0.06em',
                  backgroundImage: 'linear-gradient(180deg, #FFF4DC 0%, #F3E2A9 30%, #D4AF37 65%, #B8860B 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {LIVE[kind].name}
              </span>
              <div className="my-[calc(var(--lane)*0.04)] flex w-full items-center gap-1.5">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#F3E2A9]"></span>
                <span className="text-[#F3E2A9]" style={{ fontSize: 'calc(var(--lane) * 0.06)', lineHeight: 1 }}>◆</span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#F3E2A9]"></span>
              </div>
              <span
                className="font-serif font-semibold uppercase leading-none text-[#FFF4DC]"
                style={{ fontSize: 'calc(var(--lane) * 0.095)', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}
              >
                Celebration
              </span>
            </div>
          </div>

          <Leaves />

          {/* Act 1 Top-Down Car */}
          <div
            ref={carRef}
            className="absolute bottom-[8%] left-1/2 z-10 will-change-transform"
            style={{ width: `clamp(88px, ${Math.round(0.24 * 100)}vw, ${Math.round(ROAD_COL_MAX * 0.24)}px)` }}
          >
            <div ref={carSwayRef} className="will-change-transform">
              <div
                className="car-glow pointer-events-none absolute left-1/2 -translate-x-1/2"
                style={{
                  bottom: '85%',
                  width: '210%',
                  height: '160%',
                  opacity: 0,
                  mixBlendMode: 'screen',
                  background:
                    'radial-gradient(ellipse at 50% 100%, rgba(255,214,140,0.55) 0%, rgba(255,190,100,0.22) 38%, transparent 70%)',
                }}
              ></div>
              <div ref={carVibRef} className="will-change-transform">
                <Pic name="walima-car" className="block h-auto w-full select-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.45)]" />
              </div>
            </div>
          </div>
        </div>

        {/* ACT 2: Jiya Banquet Hall Exterior + Rear-3/4 "Just Married" Car Stopping Outside */}
        <div
          ref={hallLayerRef}
          className="absolute inset-0 z-20 overflow-hidden bg-[#140c08]"
          style={{ visibility: 'hidden', opacity: 0 }}
        >
          <div ref={hallBgRef} className="absolute inset-0 will-change-transform">
            <Pic
              name="jiya-hall-exterior"
              alt="Jiya Banquet Hall"
              className="h-full w-full object-cover object-[56%_center] sm:object-center"
            />
          </div>

          {/* Subtle golden warm vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 55% 45%, transparent 48%, rgba(16,8,4,0.45) 100%)' }}
          ></div>

          {/* Arriving "Just Married" Vintage Car */}
          <div
            ref={hallCarRef}
            className="absolute bottom-[4%] sm:bottom-[6%] left-1/2 z-10 w-[92vw] max-w-[350px] sm:max-w-[430px] md:max-w-[480px] will-change-transform"
          >
            <div ref={hallCarBodyRef} className="will-change-transform">
              <Pic
                name="barat-car-arriving"
                alt="Just Married Car"
                className="block h-auto w-full select-none drop-shadow-[0_18px_22px_rgba(0,0,0,0.68)]"
              />
            </div>
          </div>
        </div>

        {/* Garmi ki chamak (burn se pehle parked car ke ird gird) */}
        <div
          className="live-heat absolute inset-0 z-30 pointer-events-none opacity-0"
          style={{
            background: `radial-gradient(circle at ${BURN_ORIGIN[0] * 100}% ${(1 - BURN_ORIGIN[1]) * 100}%, rgba(255,205,120,0.85) 0%, rgba(255,150,60,0.35) 28%, transparent 62%)`,
            mixBlendMode: 'screen',
          }}
        ></div>
      </div>

      {/* BURN DISSOLVE: hall ke bahar khari car ki jagah se phailta hai */}
      <BurnReveal
        name={STAGE_IMG[kind]}
        progressRef={burnRef}
        origin={BURN_ORIGIN}
        onStatus={(ok) => {
          glOkRef.current = ok;
        }}
        className="absolute inset-0 z-30"
      />

      {/* BARAT CARD */}
      <div ref={cardLayerRef} className="absolute inset-0 z-40" style={{ visibility: 'hidden', opacity: 0 }}>
        <div className={`absolute inset-0 pointer-events-none ${STAGE_OVERLAY[kind]}`}></div>
        <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
          <div className="min-h-full flex flex-col items-center justify-center px-4 pt-10 pb-24">
            <StageCard kind={kind} onReplay={replay} />
          </div>
        </div>
      </div>
    </div>
  );
}