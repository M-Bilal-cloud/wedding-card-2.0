import { useEffect, useState } from 'react';

/* =====================================================================
   EVENT CONFIG: times (PKT, UTC+5), venues, test hooks, clock hooks
   Saare timestamps absolute (ms since epoch) hain, isliye visitor ka device timezone matter nahi karta.
   ===================================================================== */
export const T = (s) => new Date(s).getTime();

export const BARAT_UNLOCK = T('2026-11-29T00:00:00+05:00');
export const BARAT_START = T('2026-11-29T19:00:00+05:00');
export const BARAT_END_REAL = T('2026-11-29T22:00:00+05:00');
export const WALIMA_UNLOCK = T('2026-11-30T00:00:00+05:00');
export const WALIMA_START = T('2026-11-30T20:00:00+05:00');
export const WALIMA_END_REAL = T('2026-11-30T22:00:00+05:00');
export const WEDDING_START = BARAT_START;

/* Venues: SINGLE source of truth (cards, live cards, .ics sab yahin se)
   NOTE: purane code mein Walima ka area "St Nagar" aur "Islampura" dono the. Sahi wala yahan likho. */
export const VENUES = {
  barat: {
    name: 'Jiya Banquet Hall',
    area: 'Taragarh Road, Shahdara Town, Shahdara, Lahore',
    mapQuery: 'Jiya Banquet Hall Taragarh Road Shahdara Town Lahore',
  },
  walima: {
    name: 'Sardar Banquet Hall',
    area: 'Outfall Road, St Nagar, Lahore',
    mapQuery: 'Sardar Banquet Hall Outfall Rd St Nagar Lahore',
  },
};
export const mapsLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const PARAMS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

// TEST: ?live=5 -> har live event sirf 5 minute ka
const liveMin = Number(PARAMS.get('live'));
export const LIVE_MIN = liveMin > 0 ? liveMin : null;
export const BARAT_END = LIVE_MIN ? BARAT_START + LIVE_MIN * 60000 : BARAT_END_REAL;
export const WALIMA_END = LIVE_MIN ? WALIMA_START + LIVE_MIN * 60000 : WALIMA_END_REAL;

// TEST: ?sim=barat | barat-day | between | walima | walima-day | over
const SIM_START = {
  barat: BARAT_START,
  'barat-day': BARAT_START - 90000,
  between: BARAT_END,
  walima: WALIMA_START,
  'walima-day': WALIMA_START - 90000,
  over: WALIMA_END,
}[PARAMS.get('sim')];
const SIM_OFFSET = SIM_START != null ? SIM_START - Date.now() : 0;

/* Device clock galat ho to server ki "Date" header se offset nikalo (sirf sim ke bina) */
let syncOffset = 0;
export const nowMs = () => Date.now() + SIM_OFFSET + syncOffset;

export async function syncServerClock(timeoutMs = 1500) {
  if (SIM_START != null || typeof fetch === 'undefined') return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const t0 = Date.now();
    const res = await fetch(window.location.pathname || '/', { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    const t1 = Date.now();
    const server = Date.parse(res.headers.get('date') || '');
    if (Number.isFinite(server)) syncOffset = server - (t0 + t1) / 2;
  } catch {
    /* offline / blocked: device clock hi chalega */
  } finally {
    clearTimeout(timer);
  }
}

/* TEST: ?preview=barat | walima | between | over  (mutable: Exit Preview par clear hota hai) */
let preview = ['barat', 'walima', 'between', 'over'].includes(PARAMS.get('preview')) ? PARAMS.get('preview') : null;
export const getPreview = () => preview;
export const PREVIEW_T0 = Date.now();

const cleanPath = (p) => p.replace(/\/{2,}/g, '/');
export const clearPreview = () => {
  preview = null;
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  if (!u.searchParams.has('preview')) return;
  u.searchParams.delete('preview');
  window.history.replaceState(null, '', (cleanPath(u.pathname) || '/') + u.search + u.hash);
};

// URL mein '//' aaye to '/' kar do (dev server blank page deta hai)
if (typeof window !== 'undefined' && /\/{2,}/.test(window.location.pathname)) {
  window.history.replaceState(null, '', cleanPath(window.location.pathname) + window.location.search + window.location.hash);
}

export const phaseAt = (t) => {
  if (t < BARAT_START) return 'PRE_BARAT';
  if (t < BARAT_END) return 'BARAT_LIVE';
  if (t < WALIMA_START) return 'BETWEEN';
  if (t < WALIMA_END) return 'WALIMA_LIVE';
  return 'POST';
};
export const currentPhase = () => (preview === 'over' ? 'POST' : preview === 'between' ? 'BETWEEN' : phaseAt(nowMs()));

// Website khulte hi kaunsa experience (null = pastel garden)
export const defaultMode = () => {
  if (preview === 'barat' || preview === 'walima') return preview;
  if (preview) return null;
  const t = nowMs();
  if (t >= BARAT_UNLOCK && t < BARAT_END) return 'barat';
  if (t >= WALIMA_UNLOCK && t < WALIMA_END) return 'walima';
  return null;
};

export const liveEndOf = (kind) => (kind === 'barat' ? BARAT_END : WALIMA_END);

export const isUnlocked = (kind, t) => {
  if (preview) return preview !== 'between' || kind === 'barat';
  return t >= (kind === 'barat' ? BARAT_UNLOCK : WALIMA_UNLOCK);
};

// today (din shuru -> start) | live (start -> end) | done (end ke baad)
export const liveStage = (kind, t) => {
  const start = kind === 'barat' ? BARAT_START : WALIMA_START;
  const end = liveEndOf(kind);
  if (preview === kind) {
    const target = PREVIEW_T0 + (end - start);
    return t < target ? { stage: 'live', target } : { stage: 'done', target };
  }
  if (t < start) return { stage: 'today', target: start };
  if (t < end) return { stage: 'live', target: end };
  return { stage: 'done', target: end };
};

/* Hooks: dono apna interval cleanup karte hain, aur tab wapas aate hi foran tick */
export function useNowTick() {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const tick = () => setNow(nowMs());
    const id = setInterval(tick, 1000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return now;
}

export function usePhase() {
  const [phase, setPhase] = useState(currentPhase);
  useEffect(() => {
    const tick = () => setPhase(currentPhase());
    const id = setInterval(tick, 1000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return phase;
}