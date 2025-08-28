// ping.js
// Sends current location as a valid APRS "Position without timestamp, with messaging" packet every minute.
// API example: https(s)://api.geogram.info/send?from=CR7XXX&content=<APRS_PACKET>
//
// No external wiring needed:
//  - Auto-starts on load
//  - Re-starts on online/hashchange/storage updates
//  - Requests a Screen Wake Lock after first user interaction (best-effort)
//  - Aligns sends to the next minute boundary with small jitter
//  - Uses APRS '=' data type identifier (position w/o timestamp, with messaging)
//  - Comment text is "geogram+ping" (lowercase)
//
// Callsign source: DB via GeogramAPI.getUser().callsign (or .username), then localStorage('username').

(function () {
  const API_ORIGIN = (location.protocol === 'https:' ? 'https://api.geogram.info' : 'http://api.geogram.info');

  // Cadence
  const BASE_INTERVAL_MS = 60_000;      // ~1 minute
  const JITTER_MS = 3_000;              // small random offset on each tick
  const GEO_REFRESH_MS = 2 * 60_000;    // refresh fix every 2 minutes alongside watchPosition

  // APRS symbol settings (primary table '/' + code '-': "House")
  const APRS_SYMBOL_TABLE = '/';
  const APRS_SYMBOL_CODE  = '-';
  const APRS_COMMENT      = 'geogram+ping'; // <-- lowercase per request

  const state = {
    callsign: '',
    watchId: null,
    lastPos: null,
    lastSendAt: 0,
    nextTimer: null,
    geoRefresher: null,
    enabled: false,
    wakeLock: null,
    wakeLockRequested: false,
    eventsBound: false,
  };

  // ---------- Public control ----------
  const Ping = {
    get status() {
      return {
        enabled: state.enabled,
        callsign: state.callsign,
        lastPos: state.lastPos ? {
          time: state.lastPos.timestamp || Date.now(),
          lat: state.lastPos.coords?.latitude,
          lon: state.lastPos.coords?.longitude,
          acc: state.lastPos.coords?.accuracy
        } : null,
        lastSendAt: state.lastSendAt,
        timerActive: !!state.nextTimer,
        wakeLockActive: !!state.wakeLock
      };
    },
    async start() {
      if (state.enabled) return;
      state.enabled = true;

      bindEventsOnce();
      bindImplicitWakeLockOnce();

      // Resolve callsign (DB → localStorage)
      state.callsign = (await resolveCallsign()) || '';
      if (!state.callsign) {
        console.warn('[Ping] No callsign found. Configure one in Config → User.');
        state.enabled = false;
        return;
      }

      // Start/ensure geolocation
      ensureGeoWatch();
      ensureGeoRefresher();

      // Kick the schedule loop
      scheduleNextSend();
    },
    stop() {
      state.enabled = false;
      if (state.nextTimer) { clearTimeout(state.nextTimer); state.nextTimer = null; }
      if (state.geoRefresher) { clearInterval(state.geoRefresher); state.geoRefresher = null; }
      if (state.watchId != null) {
        try { navigator.geolocation.clearWatch(state.watchId); } catch {}
        state.watchId = null;
      }
      releaseWakeLock();
    }
  };
  window.Ping = Ping;

  // ---------- Callsign resolution ----------
  async function resolveCallsign() {
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.getUser === 'function') {
        const u = await window.GeogramAPI.getUser();
        const cs = (u?.callsign || u?.username || '').trim().toUpperCase();
        if (cs) return cs;
      }
    } catch (e) {
      console.warn('[Ping] GeogramAPI.getUser() failed, falling back to localStorage.', e);
    }
    const ls = (localStorage.getItem('username') || '').trim().toUpperCase();
    return ls || '';
  }

  // ---------- Event binding ----------
  function bindEventsOnce() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    window.addEventListener('load', () => maybeRestart('[load]'));
    window.addEventListener('online', () => maybeRestart('[online]'));
    window.addEventListener('hashchange', () => maybeRestart('[hashchange]'));
    window.addEventListener('storage', (e) => {
      if (e.key === 'username') maybeRestart('[storage username]');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (state.wakeLockRequested && !state.wakeLock) requestWakeLock(); // re-request if dropped
        if (state.enabled && !state.nextTimer) scheduleNextSend();
      }
    });
  }

  // Try to start/restart if callsign changed or we were disabled
  async function maybeRestart(reason) {
    if (!state.enabled) {
      const cs = (await resolveCallsign()) || '';
      if (cs) {
        console.log('[Ping] Starting', reason);
        Ping.start();
      }
      return;
    }
    // If enabled, but callsign changed, update in place
    const cs = (await resolveCallsign()) || '';
    if (cs && cs !== state.callsign) {
      console.log('[Ping] Callsign changed →', state.callsign, '→', cs, reason);
      state.callsign = cs;
    }
    // Ensure everything is ticking
    ensureGeoWatch();
    ensureGeoRefresher();
    if (!state.nextTimer) scheduleNextSend();
  }

  // ---------- Wake Lock (best-effort) ----------
  function bindImplicitWakeLockOnce() {
    if (state._boundWakeInteractions) return;
    state._boundWakeInteractions = true;
    const handler = () => {
      state.wakeLockRequested = true;
      requestWakeLock();
      // Remove after first attempt; we'll re-request on visibilitychange later
      document.removeEventListener('click', handler, true);
      document.removeEventListener('keydown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
    document.addEventListener('click', handler, true);
    document.addEventListener('keydown', handler, true);
    document.addEventListener('touchstart', handler, true);
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      state.wakeLock = await navigator.wakeLock.request('screen');
      state.wakeLock.addEventListener('release', () => {
        state.wakeLock = null; // will re-request on next visibilitychange if desired
      });
    } catch (e) {
      console.warn('[Ping] Wake Lock not granted', e?.message || e);
    }
  }
  function releaseWakeLock() {
    try { state.wakeLock?.release(); } catch {}
    state.wakeLock = null;
  }

  // ---------- Geolocation ----------
  function ensureGeoWatch() {
    if (!('geolocation' in navigator)) {
      console.warn('[Ping] Geolocation not supported.');
      return;
    }
    if (state.watchId != null) return;
    try {
      state.watchId = navigator.geolocation.watchPosition(
        (pos) => { state.lastPos = pos; },
        (err) => { console.warn('[Ping] watchPosition error:', err?.message || err); },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
      );
    } catch (e) {
      console.warn('[Ping] Failed to start geolocation watch.', e);
    }
  }
  function ensureGeoRefresher() {
    if (state.geoRefresher) return;
    if (!('geolocation' in navigator)) return;
    state.geoRefresher = setInterval(() => {
      // Opportunistic refresh (helps devices where watchPosition gets stale)
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => { state.lastPos = pos; },
          () => {},
          { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
        );
      } catch {}
    }, GEO_REFRESH_MS);
  }

  // ---------- Scheduling ----------
  function scheduleNextSend() {
    if (!state.enabled) return;
    if (state.nextTimer) { clearTimeout(state.nextTimer); state.nextTimer = null; }

    // Align to the next minute boundary
    const now = Date.now();
    const next = Math.ceil((now + 200) / BASE_INTERVAL_MS) * BASE_INTERVAL_MS; // small guard then ceil
    const delay = Math.max(500, next - now) + Math.floor(Math.random() * JITTER_MS);

    state.nextTimer = setTimeout(async () => {
      state.nextTimer = null;
      try { await trySend(); } catch (e) { /* already logged */ }
      // Reschedule again
      scheduleNextSend();
    }, delay);
  }

  // ---------- Sending ----------
  async function trySend() {
    if (!state.enabled) return;
    if (!navigator.onLine) return; // skip offline

    if (!state.callsign) {
      state.callsign = (await resolveCallsign()) || '';
      if (!state.callsign) return;
    }

    const p = state.lastPos;
    const lat = p?.coords?.latitude;
    const lon = p?.coords?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      // No fix yet — skip this tick
      return;
    }

    // Build a VALID APRS position (uncompressed), with messaging (data type '=')
    const aprs = buildAprsPositionPacket(lat, lon, APRS_SYMBOL_TABLE, APRS_SYMBOL_CODE, APRS_COMMENT);
    const url = buildSendUrl(state.callsign, aprs);

    try {
      await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      state.lastSendAt = Date.now();
      // console.debug(`[Ping] Sent ${state.callsign}: ${aprs}`);
    } catch (e) {
      console.warn('[Ping] Send failed:', e?.message || e);
    }
  }

  function buildSendUrl(from, content) {
    const u = new URL(API_ORIGIN + '/send', window.location.href);
    u.searchParams.set('from', from);
    u.searchParams.set('content', content);
    return u.toString();
  }

  // ---------- APRS formatting ----------
  // Position WITHOUT timestamp, WITH messaging capability:
  //   =DDMM.mmN/DDDMM.mmE<symbolCode><comment>
  // Where '/' is the primary symbol table selector, and <symbolCode> is one ASCII symbol (e.g., '-' = House).
  function buildAprsPositionPacket(lat, lon, table, symbolCode, comment) {
    const latStr = formatAprsLat(lat);  // DDMM.mmN
    const lonStr = formatAprsLon(lon);  // DDDMM.mmE
    const tableChar = table === '\\' ? '\\' : '/'; // sanitize; default primary table
    const sym = (symbolCode && typeof symbolCode === 'string' && symbolCode.length) ? symbolCode[0] : '-';
    // Per spec, comment follows immediately after symbol. (A leading space is okay but not required.)
    const cmt = comment ? String(comment) : '';
    return `=${latStr}${tableChar}${lonStr}${sym}${cmt}`;
  }

  function formatAprsLat(lat) {
    const hemi = lat >= 0 ? 'N' : 'S';
    const abs = Math.abs(lat);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    // DDMM.mm (two decimals)
    return `${pad(deg, 2)}${pad(min.toFixed(2), 5)}${hemi}`;
  }

  function formatAprsLon(lon) {
    const hemi = lon >= 0 ? 'E' : 'W';
    const abs = Math.abs(lon);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    // DDDMM.mm (two decimals)
    return `${pad(deg, 3)}${pad(min.toFixed(2), 5)}${hemi}`;
  }

  function pad(n, width) {
    const s = String(n);
    return s.length >= width ? s : ('0'.repeat(width - s.length) + s);
  }

  // ---------- Auto-start ----------
  // Start immediately; module keeps itself going thereafter.
  Ping.start();
})();
