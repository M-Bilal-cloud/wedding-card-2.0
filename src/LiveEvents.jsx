import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import BurnReveal from './BurnReveal';
import { VENUES, mapsLink, useNowTick, liveStage, getPreview } from './eventConfig';

gsap.registerPlugin(useGSAP);

/* ---- RED CARPET family-walk end point (1-2% se tweak karo) ---- */
const CARPET_END_SCALE = 0.5; // family ka final scale
const CARPET_END_Y = -24; // yPercent: paon red carpet par upar archway ki taraf chadhte hain

/* =====================================================================
   TUNING (images ke hisaab se yahin se adjust karo)
   ===================================================================== */
// Red carpet scene (ab Walima ki entrance)
export const LIVE_ASSETS = {
  barat: ['walima-road', 'walima-car', 'royal-stage-sofa'],
  walima: ['red-carpet-tunnel', 'family-walk', 'walima-stage'],
};
// Kaunsi entrance animation kis event ki (event ka data / stage / card apne hi rehte hain)
const ENTRANCE = { barat: 'road', walima: 'carpet' };
const STAGE_IMG = { barat: 'royal-stage-sofa', walima: 'walima-stage' };
const STAGE_OVERLAY = {
  barat: 'bg-gradient-to-t from-black/75 via-black/35 to-black/50',
  walima: 'bg-gradient-to-b from-black/10 via-transparent to-black/25',
};
export const LIVE_WEBP = Object.values(LIVE_ASSETS)
  .flat()
  .map((n) => `/images/${n}.webp`);

const LIVE_LOADER_BG = '#24040A'; // Live mode loader ka background (pehle frame se)
const PRELOAD_TIMEOUT = 8000; // slow mobile par bhi loader kabhi atakta nahi

const ARCH_Y = 84; // red carpet ke archway ka vertical % (burn yahin se phailta hai)
const CARPET_BG_ZOOM = 1.18; // carpet ka halka zoom
const WALK = 4.6; // chalne ka waqt (sec)
const STEP = 0.55; // ek qadam ka waqt (sec)
const CARPET_START_DELAY = 0.35; // loader fade ke baad shuru
const CARPET_BURN_AT = 4.0; // burn kab shuru ho (sec)
const CARPET_BURN_ORIGIN = [0.5, 1 - ARCH_Y / 100]; // aag archway se phailti hai

// Road + car scene (ab Barat ki entrance)
const ROAD_START_DELAY = 0.35; // loader fade ke baad shuru (Barat jaisa)
const TITLE_DROP = 0.8; // "WALIMA CELEBRATION" road par girne ka waqt (0 -> 0.8s)
const CAR_START = 0.8; // car entry shuru
const CAR_ENTRY = 1.7; // car neeche se aane mein (0.8 -> 2.5s)
const ROAD_START = 1.6; // road loop yahan se chalna shuru
const ROAD_RAMP = 1.5; // road raftar 0 se cruise tak
const TITLE_TOP = 52; // title ki road par vertical jagah (% of screen)
const ROAD_DRIVE = 4.2; // burn kab shuru ho (sec)
const BURN_DUR = 2.4;
const ROAD_SPEED = 0.6; // screen heights / sec
const ROAD_TILES = 8; // (even rakho: mirrored tiling)
const ROAD_COL_MAX = 640;
const ROAD_ZOOM = 1.7; // road image ko kitna bara karna (lane car se chauri ho)
const LANE_FRAC = 0.2 * ROAD_ZOOM; // asphalt lane ki chauraai (column ka hissa): title isi mein fit
const BURN_ORIGIN = [0.5, 0.27]; // aag yahan se phailti hai (car ki jagah, neeche se %)

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
        await i.decode(); // poori tarah decode hone ke baad hi success
      } catch {
        /* kuch browsers mein decode() reject hota hai jabke image theek load hui hoti hai */
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

// App.jsx aur LiveEventExperience dono yahi use karte hain: har decoded asset par progress + hard timeout
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
    const t = setTimeout(finish, timeoutMs); // 0% / 33% par kabhi nahi atakta
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, timeoutMs]);

  return state;
}

export function Pic({ name, alt = '', className = '', style, imgRef }) {
  const [format, setFormat] = useState('webp'); // webp -> png -> failed
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
    // key: fallback par naya <picture>/<img> mount hota hai (Safari <source> hatne par dobara load nahi karta)
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
   STAGE CARD (2-stage countdown)
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

// Sunehri chamak ke zarre (Barat)
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

// Girte hue patte (Walima)
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
  const entrance = ENTRANCE[kind]; // 'carpet' | 'road'
  const root = useRef(null);
  const tlRef = useRef(null);
  // Har asset decode hone par progress; 8s timeout par bhi loader hat jata hai
  const { progress, ready } = usePreloadImages(LIVE_ASSETS[kind]);

  // Barat refs
  const famRef = useRef(null);
  const swayRef = useRef(null);
  const bobRef = useRef(null);
  // Walima refs
  const s1Ref = useRef(null);
  const camRef = useRef(null);
  const trackRef = useRef(null);
  const carRef = useRef(null);
  const carSwayRef = useRef(null);
  const carVibRef = useRef(null);
  const cardLayerRef = useRef(null);
  const titleRef = useRef(null); // road par ek baar ka title (outer: road ke saath scroll)
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
         BARAT: camera archway ki taraf chalta hai, family qadam-ba-qadam
         (travel / weight-shift / step-bob alag layers), phir archway ki roshni
         mein ghul kar royal stage khulta hai
         ---------------------------------------------------------- */
      if (entrance === 'carpet') {
        const fam = famRef.current;
        const sway = swayRef.current;
        const bob = bobRef.current;
        const s1 = s1Ref.current;

        burnRef.current = 0;
        gsap.set(s1, { autoAlpha: 1 });
        gsap.set(cardLayerRef.current, { autoAlpha: 0 });
        gsap.set('.live-bg1', { scale: 1, transformOrigin: '50% 60%' });
        gsap.set(fam, { autoAlpha: 1, xPercent: -50, yPercent: 0, scale: 1, transformOrigin: '50% 90%' });
        gsap.set(sway, { rotation: 0, transformOrigin: '50% 100%' });
        gsap.set(bob, { y: 0 });
        gsap.set('.live-item', { opacity: 0, y: 16 });
        gsap.set('.live-pill', { opacity: 0, y: -10 });

        // Qadam: ek gait cycle = 2 qadam (left, right); bob har qadam par
        const steps = Math.round(WALK / STEP);
        const gait = Array.from({ length: steps }, (_, i) => ({ rotation: i % 2 ? 1.4 : -1.4, duration: STEP }));
        gait.push({ rotation: 0, duration: STEP / 2 });
        const bobIters = 2 * steps; // even => bob 0px par wapas aata hai

        const tl = gsap.timeline({ delay: CARPET_START_DELAY });
        tl
          // top live pill
          .to('.live-pill', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.2)
          // carpet halka zoom
          .to('.live-bg1', { scale: CARPET_BG_ZOOM, duration: WALK, ease: 'power1.inOut' }, 0)
          // family: zameen par chalti hui door jaati hai
          .to(fam, { scale: CARPET_END_SCALE, yPercent: CARPET_END_Y, duration: WALK, ease: 'power1.inOut' }, 0)
          // gait sway (+-1.4deg)
          .to(sway, { keyframes: gait, easeEach: 'sine.inOut' }, 0)
          // footstep bob (0 -> -5px)
          .fromTo(bob, { y: 0 }, { y: -5, duration: STEP / 2, repeat: bobIters - 1, yoyo: true, ease: 'sine.inOut' }, 0)
          // Walima wala burn dissolve, archway se: carpet jal kar royal stage dikhta hai
          .fromTo(burnRef, { current: 0 }, { current: 1, duration: BURN_DUR, ease: 'power1.inOut' }, CARPET_BURN_AT)
          .fromTo(
            s1,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: BURN_DUR, ease: (p) => (glOkRef.current ? (p >= 1 ? 1 : 0) : p) },
            CARPET_BURN_AT
          )
          .to(cardLayerRef.current, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, CARPET_BURN_AT + BURN_DUR * 0.55)
          .to('.live-item', { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, CARPET_BURN_AT + BURN_DUR * 0.6);
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
         WALIMA: car dheere dheere raftar pakadti hai (road speed ramp),
         lane mein halka drift + yaw, camera push, phir car ki jagah se
         aag phailti hai aur stage nazar aata hai
         ---------------------------------------------------------- */
      const s1 = s1Ref.current;
      const cam = camRef.current;
      const track = trackRef.current;
      const car = carRef.current;
      const sway = carSwayRef.current;
      const vib = carVibRef.current;
      const titleEl = titleRef.current;
      const imgs = track.querySelectorAll('img');

      // 2 tiles (original + mirrored) = ek seamless period
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
        // Title road ke saath EXACT usi raftar se neeche behta hai (road ka hi st.y), aur 120vh par hamesha ke liye gayab
        if (!titleGone) {
          titleEl.style.transform = `translate3d(-50%, ${st.y.toFixed(1)}px, 0)`;
          if (st.y > window.innerHeight * 1.2) {
            titleGone = true;
            titleEl.style.visibility = 'hidden';
          }
        }
        const k = Math.min(1, st.speed / ROAD_SPEED);
        const sx = Math.sin(st.t * 0.9) * 9 * k;
        const yaw = Math.cos(st.t * 0.9) * 1.1 * k; // raftar ke saath nose ghoomti hai
        sway.style.transform = `translate3d(${sx.toFixed(2)}px,0,0) rotate(${yaw.toFixed(3)}deg)`;
        const j = k * 0.8;
        vib.style.transform = `translate3d(${((Math.random() - 0.5) * j).toFixed(2)}px,${((Math.random() - 0.5) * j).toFixed(2)}px,0)`;
      };
      gsap.ticker.add(tick);
      window.addEventListener('resize', measure);
      // Replay ke liye: road + title dobara shuru
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
      gsap.set(cardLayerRef.current, { autoAlpha: 0 });
      gsap.set('.live-heat', { opacity: 0 });
      gsap.set(cam, { scale: 1, transformOrigin: '50% 80%' });
      gsap.set('.live-item', { opacity: 0, y: 16 });
      gsap.set('.road-title', { scale: 2.2, opacity: 0, transformOrigin: '50% 50%' });
      titleEl.style.visibility = 'visible';
      titleEl.style.transform = 'translate3d(-50%, 0, 0)';

      const tl = gsap.timeline({ delay: ROAD_START_DELAY });
      tl
        // STEP 1 (0 -> 0.8s): "WALIMA CELEBRATION" road par thappa ban kar girta hai
        .fromTo('.road-title', { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: TITLE_DROP, ease: 'back.out(1.6)' }, 0)
        // STEP 2 (0.8 -> 2.5s): car neeche se aati hai (z-index title se upar), phir cruise mein thora aage
        .fromTo(car, { xPercent: -50, yPercent: 110 }, { xPercent: -50, yPercent: 0, duration: CAR_ENTRY, ease: 'power3.out' }, CAR_START)
        .to(car, { y: -vh * 0.08, duration: BURN_AT + BURN_DUR * 0.6 - (CAR_START + CAR_ENTRY), ease: 'sine.inOut' }, CAR_START + CAR_ENTRY)
        // STEP 3 (1.6s+): road loop shuru (title usi raftar se neeche nikalta hai), phir burn ke samay tezi -> ruk jao
        .fromTo(st, { speed: 0 }, { speed: ROAD_SPEED, duration: ROAD_RAMP, ease: 'power2.inOut' }, ROAD_START)
        .to(st, { speed: ROAD_SPEED * 1.8, duration: BURN_DUR + 0.4, ease: 'power1.in' }, BURN_AT - 0.4)
        .to(st, { speed: 0, duration: 0.4, ease: 'power1.out' }, BURN_AT + BURN_DUR)
        // camera peeche se dhakka (push-in)
        .fromTo(cam, { scale: 1 }, { scale: 1.1, duration: BURN_AT + BURN_DUR, ease: 'power1.in' }, 0)
        // aag se pehle car ke ird gird garmi ki chamak
        .fromTo('.live-heat', { opacity: 0 }, { opacity: 0.75, duration: BURN_DUR * 0.6, ease: 'power1.in' }, BURN_AT - 0.2)
        // burn dissolve (time based)
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

  /* ============================ WALIMA (red carpet + family walk) ============================ */
  if (entrance === 'carpet') {
    return (
      <div ref={root} className="fixed inset-0 overflow-hidden bg-[#2A050D]">
        <LiveLoader ready={ready} progress={progress} bg={LIVE_LOADER_BG} text="#F3E2A9" accent="#D4AF37" />

        {/* STAGE (neeche): burn ke baad / WebGL na ho to yahi */}
        <div className="absolute inset-0 z-10">
          <Pic name={STAGE_IMG[kind]} className="h-full w-full object-cover" />
        </div>

        {/* SCENE 1: red carpet + family walk */}
        <div ref={s1Ref} className="absolute inset-0 z-20 overflow-hidden bg-[#2A050D]">
          <div className="live-bg1 absolute inset-0 will-change-transform">
            <Pic name="red-carpet-tunnel" className="w-full h-full object-cover" />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 70%, transparent 45%, rgba(20,2,6,0.55) 100%)' }}
          ></div>

          {/* travel layer (GSAP xPercent/yPercent/scale) -> gait sway -> footstep bob.
              z-20 + opacity 1: family-walk kabhi chhup / clip nahi hota */}
          <div
            ref={famRef}
            className="absolute bottom-0 left-1/2 z-20 w-[88vw] max-w-[460px] sm:max-w-[540px] md:max-w-[600px] will-change-transform"
            style={{ opacity: 1 }}
          >
            <div ref={swayRef} className="will-change-transform">
              <div ref={bobRef} className="will-change-transform">
                <Pic name="family-walk" alt="Family walking" className="w-full h-auto block object-contain bg-transparent" />
              </div>
            </div>
          </div>

          {/* sparks family ke upar hi rahein */}
          <div className="absolute inset-0 z-[25] pointer-events-none">
            <Sparks />
          </div>

          {/* Top live pill (red carpet walk ke dauran) */}
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

        {/* BURN DISSOLVE: archway se phailta hai (Walima wala hi shader) */}
        <BurnReveal
          name={STAGE_IMG[kind]}
          progressRef={burnRef}
          origin={CARPET_BURN_ORIGIN}
          onStatus={(ok) => {
            glOkRef.current = ok;
          }}
          className="absolute inset-0 z-30"
        />

        {/* WALIMA CARD */}
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

  /* ============================ BARAT (road + car) ============================ */
  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-[#10180f]">
      <LiveLoader ready={ready} progress={progress} bg={LIVE_LOADER_BG} text="#F3E2A9" accent="#D4AF37" />

      {/* STAGE (neeche): burn ke baad / WebGL na ho to yahi */}
      <div className="absolute inset-0 z-10">
        <Pic name={STAGE_IMG[kind]} className="h-full w-full object-cover" />
      </div>

      {/* SCENE 1: forest road + car */}
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
            {/* Zoomed track: road lane image ke beech mein hai, isliye centered rehta hai.
                Alternate tiles mirror hote hain -> joint par seam nahi dikhti. */}
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

          {/* ROAD TITLE: ek baar ka (repeating tiles se bahar). Outer = road ke saath scroll (ticker), inner = drop (GSAP).
              z-[5]: car (z-10) is ke upar se guzarti hai */}
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

          {/* Car: outer = entry/cruise (GSAP), middle = lane drift+yaw, inner = engine vibration (ticker) */}
          <div
            ref={carRef}
            className="absolute bottom-[8%] left-1/2 z-10 will-change-transform"
            style={{ width: `clamp(88px, ${Math.round(0.24 * 100)}vw, ${Math.round(ROAD_COL_MAX * 0.24)}px)` }}
          >
            <div ref={carSwayRef} className="will-change-transform">
              <div ref={carVibRef} className="will-change-transform">
                <Pic name="walima-car" className="block h-auto w-full select-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.45)]" />
              </div>
            </div>
          </div>

          {/* garmi ki chamak (burn se pehle) */}
          <div
            className="live-heat absolute inset-0 pointer-events-none opacity-0"
            style={{
              background: `radial-gradient(circle at ${BURN_ORIGIN[0] * 100}% ${(1 - BURN_ORIGIN[1]) * 100}%, rgba(255,205,120,0.85) 0%, rgba(255,150,60,0.35) 28%, transparent 62%)`,
              mixBlendMode: 'screen',
            }}
          ></div>
        </div>
      </div>

      {/* BURN DISSOLVE: car ki jagah se phailta hai */}
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