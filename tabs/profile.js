// tabs/profile.js
// Profile tab: view info for a specific callsign (APRS/Nostr user).
// - Deep link: #profile:X1ABCD
// - If no callsign specified, it loads the CURRENT USER'S callsign automatically
//   (from GeogramAPI.getUser() or localStorage('username')).
// - Caching: localStorage "profileCache:<CALLSIGN>"
// - Live refresh: JSON first (CORS), JSONP fallback
// - Map: Leaflet (lazy-loaded), shows last known coordinates if present
//
// Expected API (adjust if your backend differs):
//   GET  https://api.geogram.info/profile?callsign=<CALLSIGN>
//   (JSON preferred; JSONP if you add ?JSONP=cb)

(function () {
  const AUTO_INTERVAL_MS = 30000;
  const LOCAL_PREFIX = 'profileCache:';
  const API_ORIGIN = (location.protocol === 'https:' ? 'https://api.geogram.info' : 'http://api.geogram.info');

  function $(selOrEl) {
    return typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl;
  }
  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function fmtClock(dt) {
    return dt
      ? new Intl.DateTimeFormat(undefined, {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(dt)
      : '—';
  }
  function fmtAgo(ts) {
    const t = Number(ts);
    if (!isFinite(t)) return '';
    const diff = Date.now() - t;
    const s = Math.max(0, Math.round(diff / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }

  // ------- Leaflet loader -------
  let leafletReady;
  function ensureLeafletLoaded() {
    if (window.L) return Promise.resolve();
    if (leafletReady) return leafletReady;

    leafletReady = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    });

    return leafletReady;
  }

  // ------- API helpers (JSON + JSONP) -------
  function profileUrlJSON(callsign) {
    const u = new URL(API_ORIGIN + '/profile', window.location.href);
    u.searchParams.set('callsign', callsign);
    return u.toString();
  }
  function profileUrlJSONP(callsign, cbName) {
    const u = new URL(API_ORIGIN + '/profile', window.location.href);
    u.searchParams.set('callsign', callsign);
    u.searchParams.set('JSONP', cbName);
    u.searchParams.set('_', Date.now().toString());
    return u.toString();
  }

  async function fetchJSON(callsign, timeoutMs = 10000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(profileUrlJSON(callsign), {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function fetchJSONP(callsign, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      const finalUrl = profileUrlJSONP(callsign, cb);
      const script = document.createElement('script');
      script.referrerPolicy = 'no-referrer-when-downgrade';

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        try { delete window[cb]; } catch {}
        script.remove();
        clearTimeout(tid);
      };

      window[cb] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('JSONP load error')); };
      script.src = finalUrl;

      const tid = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeoutMs);

      document.body.appendChild(script);
    });
  }

  // ------- cache helpers -------
  function cacheKeyFor(callsign) {
    return `${LOCAL_PREFIX}${(callsign || '').toUpperCase()}`;
  }
  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }));
    } catch { /* best effort */ }
  }

  // ------- template -------
  function template() {
    return `
      <div class="left-column">
        <h2>Profile</h2>

        <div class="card" style="padding:12px;">
          <div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; max-width:560px;">
            <input id="pf-input" type="text" class="styled-select" placeholder="Enter call sign (e.g., X1ABCD)" />
            <button id="pf-load" class="reset-button">Load</button>
          </div>
          <small style="opacity:.75;">Tip: you can also deep-link with <code>#profile:X1ABCD</code></small>
          <div id="pf-status" style="margin-top:8px; min-height:1em; opacity:.9;"></div>
        </div>

        <div id="pf-summary" class="card" style="display:none; padding:12px;"></div>
        <div id="pf-map-card" class="card" style="display:none; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div><strong>Last known position</strong></div>
            <div id="pf-map-status" style="opacity:.7;"></div>
          </div>
          <div id="pf-map" style="height: clamp(300px, 50vh, 520px); margin-top:8px; border-radius:8px; overflow:hidden;"></div>
        </div>

        <div id="pf-events" class="card" style="display:none; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div><strong>Recent activity</strong></div>
            <div id="pf-events-meta" style="opacity:.7;"></div>
          </div>
          <div class="nm-tablewrap" style="margin-top:10px; overflow:auto;">
            <table class="nm-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; border-bottom:1px solid var(--border, #ddd);">Time</th>
                  <th style="text-align:left; border-bottom:1px solid var(--border, #ddd);">Comment / Message</th>
                  <th style="text-align:right; border-bottom:1px solid var(--border, #ddd);">Lat</th>
                  <th style="text-align:right; border-bottom:1px solid var(--border, #ddd);">Lon</th>
                </tr>
              </thead>
              <tbody id="pf-events-body">
                <tr class="pf-empty"><td colspan="4" style="padding:8px; opacity:.7;">No recent packets</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="right-column">
        <h2>Actions</h2>
        <div class="card" style="padding:12px;">
          <button id="pf-copy-link" class="reset-button">Copy link to this profile</button>
          <div id="pf-copy-status" style="margin-top:8px; min-height:1em; opacity:.9;"></div>
        </div>
      </div>
    `;
  }

  function callsignFromHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#profile')) return '';
    const parts = hash.slice(1).split(':'); // ["profile", "X1ABCD"]
    const cs = (parts[1] || '').trim();
    return cs;
  }

  async function resolveOwnCallsign() {
    // Prefer app-provided API
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.getUser === 'function') {
        const u = await window.GeogramAPI.getUser();
        const cs = (u?.callsign || u?.username || '').trim();
        if (cs) return cs;
      }
    } catch (e) {
      console.warn('Profile: getUser() failed, falling back to localStorage.', e);
    }
    // Fallback to what Config tab stores
    const ls = (localStorage.getItem('username') || '').trim();
    return ls || '';
  }

  async function renderProfile(callsign) {
    const statusEl = $('#pf-status');
    const sumEl = $('#pf-summary');
    const mapCard = $('#pf-map-card');
    const mapStatus = $('#pf-map-status');
    const mapEl = $('#pf-map');
    const eventsCard = $('#pf-events');
    const eventsMeta = $('#pf-events-meta');
    const eventsBody = $('#pf-events-body');

    // Update hash so links can be shared
    const newHash = `#profile:${encodeURIComponent(callsign)}`;
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    const key = cacheKeyFor(callsign);
    const cached = readCache(key);

    // Show cached instantly if available
    if (cached?.data) {
      statusEl.textContent = `Cached ${fmtClock(new Date(cached.fetchedAt))}`;
      paint(callsign, cached.data);
    } else {
      statusEl.textContent = 'Loading…';
      sumEl.style.display = 'none';
      mapCard.style.display = 'none';
      eventsCard.style.display = 'none';
    }

    // Live refresh (JSON → JSONP fallback)
    function loadLive() {
      return fetchJSON(callsign).catch(() => fetchJSONP(callsign));
    }

    try {
      const data = await loadLive();
      writeCache(key, data);
      paint(callsign, data);
      statusEl.textContent = `Updated: ${fmtClock(new Date())}`;
    } catch (e) {
      if (!cached?.data) statusEl.textContent = `Error: ${e.message || 'Network'}`;
      else statusEl.textContent = `Error: ${e.message || 'Network'} (showing cached)`;
    }

    // Renderers
    function paint(cs, data) {
      const d = data || {};
      const name = d.name || '';
      const avatar = d.avatar || '';
      const last = d.last || d.position || null; // try common shapes
      const lastTs = last?.timestamp ?? last?.time ?? last?.updated ?? null;

      // Summary card
      sumEl.style.display = '';
      sumEl.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
          ${avatar ? `<img src="${escapeHtml(avatar)}" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` : ''}
          <div style="flex:1;">
            <div style="font-size:1.2em; font-weight:700;">${escapeHtml(cs)}</div>
            ${name ? `<div style="opacity:.8;">${escapeHtml(name)}</div>` : ''}
            ${lastTs ? `<div style="opacity:.7; font-size:.9em;">Last heard: ${fmtAgo(lastTs)}</div>` : ''}
          </div>
        </div>
      `;

      // Map (only if we have coordinates)
      const hasPos = typeof last?.lat === 'number' && typeof last?.lon === 'number';
      if (hasPos) {
        mapCard.style.display = '';
        mapStatus.textContent = lastTs ? `Fix: ${fmtClock(new Date(Number(lastTs)))}` : '';
        ensureLeafletLoaded().then(() => {
          // init or update map
          let map = mapEl._leaflet_map;
          if (!map) {
            map = L.map(mapEl).setView([last.lat, last.lon], 12);
            mapEl._leaflet_map = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
          }
          // clear & add marker
          if (!map._profileLayer) map._profileLayer = L.layerGroup().addTo(map);
          map._profileLayer.clearLayers();
          L.marker([last.lat, last.lon]).addTo(map._profileLayer)
            .bindPopup(`<strong>${escapeHtml(cs)}</strong><br/>${escapeHtml(last?.comment || 'Last position')}`);
          map.setView([last.lat, last.lon], 12);
          setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
        });
      } else {
        mapCard.style.display = 'none';
      }

      // Events table (defensive on field names)
      const packets = Array.isArray(d.packets) ? d.packets.slice().reverse() : [];
      eventsCard.style.display = packets.length ? '' : 'none';
      if (packets.length) {
        const rows = packets.slice(0, 50).map(p => {
          const ts = Number(p.timestamp ?? p.time ?? p.updated ?? 0);
          const when = isFinite(ts) ? `${fmtAgo(ts)} (${fmtClock(new Date(ts))})` : '—';
          const msg = p.comment || p.message || p.content || '';
          const lat = (typeof p.lat === 'number') ? p.lat.toFixed(5) : '—';
          const lon = (typeof p.lon === 'number') ? p.lon.toFixed(5) : '—';
          return `
            <tr>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee);">${escapeHtml(when)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee);">${escapeHtml(msg)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); text-align:right;">${lat}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); text-align:right;">${lon}</td>
            </tr>
          `;
        }).join('');
        $('#pf-events-body').innerHTML = rows || `<tr class="pf-empty"><td colspan="4" style="padding:8px; opacity:.7;">No recent packets</td></tr>`;
        eventsMeta.textContent = `Showing ${Math.min(50, packets.length)} events`;
      }
    }
  }

  // --------- Tab render() entry point ----------
  window.render = function render() {
    const root = document.getElementById('content');
    root.innerHTML = template();

    if (typeof window.setupAnchorNavigation === 'function') {
      window.setupAnchorNavigation('profile');
    }

    const input = $('#pf-input');

    // Helper to start loading
    const go = (cs) => {
      const callsign = (cs || input.value || '').trim().toUpperCase();
      if (!callsign) {
        $('#pf-status').innerHTML = `No callsign set. Go to <a href="#config">Config → User</a> to create one, or type a callsign above.`;
        return;
      }
      input.value = callsign;
      renderProfile(callsign);
    };

    // Wire search button + Enter key
    $('#pf-load').addEventListener('click', () => go());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    // Copy link button
    $('#pf-copy-link').addEventListener('click', async () => {
      const cs2 = (input.value || '').trim().toUpperCase();
      const link = `${location.origin}${location.pathname}#profile:${encodeURIComponent(cs2 || '')}`;
      try {
        await navigator.clipboard.writeText(link);
        $('#pf-copy-status').textContent = 'Link copied!';
      } catch {
        $('#pf-copy-status').textContent = link;
      }
    });

    // Decide what to load: #profile:<CS> or "my profile"
    const hashCs = callsignFromHash();
    if (hashCs) {
      input.value = hashCs.toUpperCase();
      go(hashCs);
    } else {
      // Auto-load own profile if present
      (async () => {
        const mine = (await resolveOwnCallsign()) || '';
        if (mine) {
          input.value = mine.toUpperCase();
          go(mine);
        } else {
          // Nothing configured yet – show a nudge
          $('#pf-status').innerHTML = `No callsign set. Go to <a href="#config">Config → User</a> to create one, or type a callsign above.`;
        }
      })();
    }
  };
})();
