// nearby.js
// Cached "Nearby maps" with background refresh + per-location station list.
// Public API: Nearby.renderRecentNearby(containerOrSelector)

(function () {
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const AUTO_INTERVAL_MS = 30000;
  const LOCAL_PREFIX = 'nearbyCache:';
  const MAX_LOCAL_KEYS = 50;

  // --- HTTPS-aware API origin (prevents mixed-content blocking on HTTPS pages) ---
  const API_ORIGIN = (() => {
    try {
      const base = typeof API_URL !== 'undefined' ? API_URL : '';
      const u = new URL(base, location.href);
      if (location.protocol === 'https:' && u.protocol === 'http:') u.protocol = 'https:';
      return u.toString().replace(/\/+$/, '');
    } catch {
      return typeof API_URL !== 'undefined' ? API_URL : '';
    }
  })();

  // THEME COLORS (your request)
  const COLOR_STATION_FILL = '#1e88e5';  // blue radios
  const COLOR_STATION_STROKE = '#0b2a57';
  const COLOR_CENTER_FILL  = '#2e7d32';  // green center
  const COLOR_CENTER_STROKE = '#103818';
  const COLOR_RADIUS_RING = '#2e7d32';

  const Nearby = {};
  const memResults = new Map();   // key -> { data, fetchedAt:number, serverAt:number }
  const inflight = new Map();     // key -> Promise<data>

  // ---------- utils ----------
  function $(selOrEl) { return typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl; }
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
      ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(dt)
      : '—';
  }
  function fmtLastUpdated(ts) {
    const t = Number(ts);
    if (!isFinite(t)) return '—';
    const diff = Date.now() - t;
    const s = 1000, m = 60*s, h = 60*m, d = 24*h;
    if (diff < m)  return `${Math.max(0, Math.round(diff / s))} s ago`;
    if (diff < h)  return `${Math.max(1, Math.round(diff / m))} min ago`;
    if (diff < d)  return `${Math.max(1, Math.round(diff / h))} h ago`;
    const days = Math.max(1, Math.floor(diff / d));
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  function parseCoords(coordsStr) {
    if (!coordsStr) return null;
    const parts = coordsStr.split(',').map(s => s.trim());
    const lat = parseFloat(parts[0]);
    const lon = parseFloat((parts[1] ?? '').replace(/\s+/g, ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  }

  // ---------- inject responsive CSS once (incl. muted B/W map + marker glow) ----------
  function injectResponsiveStyles() {
    if (document.getElementById('nearby-css')) return;
    const style = document.createElement('style');
    style.id = 'nearby-css';
    style.textContent = `
/* Nearby maps responsive improvements */
#recent-nearby, .nearby-list, .nearby-list .card { 
  width: 100%; 
}

.nm-map { 
  height: clamp(300px, 50vh, 520px); 
  width: 100%; 
  position: relative; 
}

.nm-tablewrap { 
  overflow-x: auto; 
}

.nm-table { 
  width: 100%; 
  table-layout: auto; 
  border-collapse: collapse;
}

.nm-table th, .nm-table td { 
  padding: 8px 10px; 
  border-bottom: 1px solid var(--border, #2a2a2a);
}

.nm-table th {
  background-color: var(--card-header-bg, #1a1a1a);
  font-weight: 600;
  text-align: left;
}

/* Mobile optimization */
@media (max-width: 768px) {
  .nm-map { 
    height: 60vh; 
  }
  
  .nm-table th:nth-child(2), .nm-table td:nth-child(2),
  .nm-table th:nth-child(3), .nm-table td:nth-child(3) { 
    white-space: nowrap; 
  }
  
  .nm-table th, .nm-table td {
    padding: 6px 8px;
    font-size: 0.9em;
  }
}

/* Enhanced map styling with subtle color retention
   Adjust --tile-filter to control color saturation and contrast */
.nm-map { 
  --tile-filter: grayscale(0.6) saturate(1.2) contrast(1.1) brightness(0.95);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nm-map .leaflet-tile {
  filter: var(--tile-filter);
  image-rendering: -webkit-optimize-contrast; /* Safari/Chrome */
  image-rendering: crisp-edges;               /* Firefox */
  image-rendering: pixelated;                 /* Modern browsers */
}

/* Map control improvements */
.nm-map .leaflet-control-zoom a {
  background-color: var(--card-bg, #1e1e1e);
  color: var(--text, #ffffff);
  border: 1px solid var(--border, #3a3a3a);
}

.nm-map .leaflet-control-zoom a:hover {
  background-color: var(--accent, #4a90e2);
  color: white;
}

/* Marker styling */
.nm-map .leaflet-marker-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* Popup styling */
.nm-map .leaflet-popup-content-wrapper {
  background: var(--card-bg, #1e1e1e);
  color: var(--text, #ffffff);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.nm-map .leaflet-popup-tip {
  background: var(--card-bg, #1e1e1e);
}

/* Table row hover effects */
.nm-table tbody tr:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  transition: background-color 0.2s ease;
}

/* Responsive text scaling */
.nm-table th, .nm-table td {
  font-size: clamp(0.8rem, 1.5vw, 0.9rem);
}

/* Zebra striping for better readability */
.nm-table tbody tr:nth-child(even) {
  background-color: var(--zebra-stripe, rgba(255, 255, 255, 0.02));
}

      /* Soft drop shadow for custom radio icons */
      .nm-map .leaflet-marker-icon { filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
    `;
    document.head.appendChild(style);
  }

  // ---------- locations: DB first, then localStorage ----------
  async function loadSavedLocations() {
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.getLocations === 'function') {
        const dbLocs = await window.GeogramAPI.getLocations();
        if (Array.isArray(dbLocs) && dbLocs.length) return dbLocs;
      }
    } catch (e) {
      console.warn('Nearby: DB locations failed, fallback to localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('locations');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch (e) {
      console.warn('Nearby: localStorage locations parse failed.', e);
    }
    return [];
  }

  async function persistNewLocation(loc) {
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.addLocation === 'function') {
        await window.GeogramAPI.addLocation(loc);
        return true;
      }
      if (window.GeogramAPI && typeof window.GeogramAPI.setLocations === 'function') {
        const existing = await loadSavedLocations();
        existing.push(loc);
        await window.GeogramAPI.setLocations(existing);
        return true;
      }
    } catch (e) {
      console.warn('Nearby: DB persist failed, falling back to localStorage.', e);
    }
    try {
      const existing = await loadSavedLocations();
      existing.push(loc);
      localStorage.setItem('locations', JSON.stringify(existing));
      return true;
    } catch (e) {
      console.error('Nearby: localStorage persist failed.', e);
      return false;
    }
  }

  // ---------- leaflet loader ----------
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

  // ---------- API helpers (FETCH-first with JSONP fallback) ----------
  function buildNearbyUrlJSONP(lat, lon, radiusKm, cbName) {
    const u = new URL(API_ORIGIN + '/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    u.searchParams.set('JSONP', cbName); // backend expects "JSONP" param
    u.searchParams.set('_', Date.now().toString());
    return u.toString();
  }
  function buildNearbyUrlJSON(lat, lon, radiusKm) {
    const u = new URL(API_ORIGIN + '/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    return u.toString();
  }

  const FETCH_TIMEOUT_MS = 2500;
  const JSONP_TIMEOUT_MS = 4000;

  function jsonpFetch(lat, lon, radiusKm, timeoutMs = JSONP_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const cb = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      const finalUrl = buildNearbyUrlJSONP(lat, lon, radiusKm, cb);

      const script = document.createElement('script');
      script.referrerPolicy = 'no-referrer-when-downgrade';

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        try { delete window[cb]; } catch {}
        if (script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(tid);
      };

      window[cb] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('JSONP load error')); };
      script.src = finalUrl;

      const tid = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, timeoutMs);

      (document.body || document.head || document.documentElement).appendChild(script);
    });
  }

  async function fetchJSON(lat, lon, radiusKm, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(buildNearbyUrlJSON(lat, lon, radiusKm), {
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

  // ---------- cache (mem + localStorage) ----------
  function keyFor(lat, lon, radiusKm) { return `${LOCAL_PREFIX}${lat.toFixed(5)},${lon.toFixed(5)}:${radiusKm}`; }
  function readLocal(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function writeLocal(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); pruneLocal(); }
    catch (e) { try { pruneLocal(true); localStorage.setItem(key, JSON.stringify(obj)); } catch {} }
  }
  function pruneLocal(aggressive = false) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_PREFIX)) keys.push(k);
    }
    if (!keys.length) return;
    if (aggressive || keys.length > MAX_LOCAL_KEYS) {
      const items = keys.map(k => {
        const v = readLocal(k);
        return { k, t: v?.serverAt ?? v?.fetchedAt ?? 0 };
      }).sort((a, b) => a.t - b.t);
      const removeCount = aggressive ? Math.ceil(items.length * 0.5) : (items.length - MAX_LOCAL_KEYS);
      for (let i = 0; i < removeCount; i++) localStorage.removeItem(items[i].k);
    }
  }
  function getCached(key) {
    if (memResults.has(key)) return memResults.get(key);
    const local = readLocal(key);
    if (local && typeof local === 'object') { memResults.set(key, local); return local; }
    return null;
  }
  function setCached(key, data) {
    const now = Date.now();
    const obj = { data, fetchedAt: now, serverAt: now };
    memResults.set(key, obj);
    writeLocal(key, obj);
    return obj;
  }

  // ----- live fetch: FETCH-first, JSONP fallback -----
  function fetchLive(key, lat, lon, radiusKm) {
    if (inflight.has(key)) return inflight.get(key);
    const p = fetchJSON(lat, lon, radiusKm)
      .catch(() => jsonpFetch(lat, lon, radiusKm))
      .then(data => { setCached(key, data); return data; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  // ---------- radio icon (SVG → data URL) ----------
  function radioIconDataUrl(fill = '#ffffff', stroke = '#000000') {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.55)"/>
          </filter>
        </defs>
        <!-- body -->
        <g filter="url(#shadow)">
          <rect x="6" y="10" rx="4" ry="4" width="20" height="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
          <!-- speaker grill -->
          <circle cx="16" cy="18" r="4.5" fill="none" stroke="${stroke}" stroke-width="1.2"/>
          <circle cx="16" cy="18" r="2.5" fill="none" stroke="${stroke}" stroke-width="1.2"/>
          <!-- dial -->
          <rect x="20.5" y="13.5" width="4" height="2.5" rx="1.2" fill="${stroke}" />
          <!-- antenna -->
          <path d="M10 12 L21 5" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="21" cy="5" r="1.6" fill="${stroke}"/>
        </g>
        <!-- pin -->
        <path d="M16 31 L12 24 H20 Z" fill="${stroke}"/>
      </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  function makeRadioIcon({ fill = '#ffffff', stroke = '#000000' } = {}) {
    return L.icon({
      iconUrl: radioIconDataUrl(fill, stroke),
      iconSize: [28, 32],
      iconAnchor: [14, 30],
      popupAnchor: [0, -28],
      className: 'nm-radio-icon'
    });
  }

  // ---------- map card ----------
  async function mountMapCard(parentEl, opts) {
    const { label, lat, lon, radiusKm = 50 } = opts;
    const cacheKey = keyFor(lat, lon, radiusKm);

    const card = document.createElement('div');
    card.className = 'card nm-card';
    card.style.padding = '12px';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div><strong>${escapeHtml(label || 'Location')}</strong>
          <small style="opacity:.7; margin-left:.5em;">${lat.toFixed(5)}, ${lon.toFixed(5)} · ${radiusKm} km</small>
        </div>
        <div class="nm-status" style="opacity:.7;"></div>
      </div>
      <div class="nm-map" style="margin-top:8px; border-radius:8px; overflow:hidden;"></div>

      <div class="nm-tablewrap" style="margin-top:10px;">
        <table class="nm-table">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid var(--border, #ddd);">Name</th>
              <th style="text-align:right; border-bottom:1px solid var(--border, #ddd);">Distance</th>
              <th style="text-align:right; border-bottom:1px solid var(--border, #ddd);">Last updated</th>
            </tr>
          </thead>
          <tbody class="nm-tbody">
            <tr class="nm-empty"><td colspan="3" style="padding:8px; opacity:.7;">No stations</td></tr>
          </tbody>
        </table>
      </div>
    `;
    parentEl.appendChild(card);
    const statusEl = card.querySelector('.nm-status');
    const mapEl = card.querySelector('.nm-map');
    const tbodyEl = card.querySelector('.nm-tbody');

    injectResponsiveStyles();

    // Create map after Leaflet loads (non-blocking)
    let map, markersLayer;
    let pendingDevices = null;
    let hasRenderedInitialData = false;

    ensureLeafletLoaded().then(() => {
      mapEl.style.height = getComputedStyle(mapEl).height || '60vh';
      map = L.map(mapEl).setView([lat, lon], 12);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);

      // Custom radio icons (blue for stations, green for center)
      const centerIcon = makeRadioIcon({ fill: COLOR_CENTER_FILL, stroke: COLOR_CENTER_STROKE });
      const stationIcon = makeRadioIcon({ fill: COLOR_STATION_FILL, stroke: COLOR_STATION_STROKE });

      L.marker([lat, lon], { icon: centerIcon }).addTo(markersLayer)
        .bindPopup(`<strong>Center</strong><br/>lat ${lat.toFixed(5)}<br/>lon ${lon.toFixed(5)}<br/>radius ${radiusKm} km`);
      L.circle([lat, lon], { radius: radiusKm * 1000, color: COLOR_RADIUS_RING, weight: 1.2, opacity: 0.9 }).addTo(map);

      if (pendingDevices) updateMap(pendingDevices, { stationIcon, centerIcon });

      const onResize = () => { try { map.invalidateSize(); } catch {} };
      window.addEventListener('resize', onResize, { passive: true });
      setTimeout(onResize, 100);
    });

    function updateTable(devices) {
      if (!tbodyEl) return;
      const arr = Array.isArray(devices) ? devices.slice() : [];
      arr.sort((a, b) => {
        const da = Number.isFinite(a?.distance) ? a.distance : Infinity;
        const db = Number.isFinite(b?.distance) ? b.distance : Infinity;
        return da - db;
      });

      if (!arr.length) {
        tbodyEl.innerHTML = `<tr class="nm-empty"><td colspan="3" style="padding:8px; opacity:.7;">No stations</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = arr.map(d => {
        const cs = (d.id ?? d.name ?? 'Station').toString();
        const name = `<a href="#profile:${encodeURIComponent(cs)}">${escapeHtml(cs)}</a>`;
        const dist = Number.isFinite(d.distance) ? `${d.distance.toFixed(1)} km` : '—';
        const last = fmtLastUpdated(d.updated);
        return `
          <tr>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee);">${name}</td>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); text-align:right;">${dist}</td>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); text-align:right;">${last}</td>
          </tr>
        `;
      }).join('');
    }

    function updateMap(devices, icons) {
      if (!map || !markersLayer) { pendingDevices = devices; return; }
      markersLayer.clearLayers();

      const bounds = [[lat, lon]];
      const stationIcon = icons?.stationIcon || makeRadioIcon({ fill: COLOR_STATION_FILL, stroke: COLOR_STATION_STROKE });
      const centerIcon = icons?.centerIcon || makeRadioIcon({ fill: COLOR_CENTER_FILL, stroke: COLOR_CENTER_STROKE });

      // center marker again after clear
      L.marker([lat, lon], { icon: centerIcon }).addTo(markersLayer);
      L.circle([lat, lon], { radius: radiusKm * 1000, color: COLOR_RADIUS_RING, weight: 1.2, opacity: 0.9 }).addTo(map);

      if (Array.isArray(devices)) {
        for (const d of devices) {
          if (typeof d.lat !== 'number' || typeof d.lon !== 'number') continue;
          const m = L.marker([d.lat, d.lon], { icon: stationIcon }).addTo(markersLayer);
          const dt = d.updated ? new Date(Number(d.updated)) : null;
          const cs = (d.id ?? 'Station').toString();
          m.bindPopup(
            `<strong><a href="#profile:${encodeURIComponent(cs)}">${escapeHtml(cs)}</a></strong><br/>
            Distance: ${Number.isFinite(d.distance) ? d.distance.toFixed(1) : '—'} km<br/>
            Updated: ${escapeHtml(dt ? dt.toLocaleString() : '—')}<br/>
            Lat: ${escapeHtml(d.lat)}<br/>
            Lon: ${escapeHtml(d.lon)}`
          );
          bounds.push([d.lat, d.lon]);
        }
      }
      if (bounds.length >= 2) map.fitBounds(bounds, { padding: [20, 20] });
      else map.setView([lat, lon], 12);
      try { map.invalidateSize(); } catch {}
    }

    // 1) show cached immediately (if any)
    const cached = getCached(cacheKey);
    if (cached?.data && !hasRenderedInitialData) {
      const serverAt = cached.serverAt || cached.fetchedAt;
      statusEl.textContent = `Updated: ${serverAt ? fmtClock(new Date(serverAt)) : '—'}`;
      updateTable(cached.data);
      pendingDevices = cached.data;
      hasRenderedInitialData = true;
    } else {
      statusEl.textContent = 'Loading…';
    }

    // 2) live refresh
    function refreshLive() {
      fetchLive(cacheKey, lat, lon, radiusKm)
        .then((data) => {
          updateTable(data);
          updateMap(data);
          statusEl.textContent = `Updated: ${fmtClock(new Date())}`;
        })
        .catch((e) => {
          if (!cached?.data) statusEl.textContent = `Error: ${e.message || 'Network'}`;
        });
    }
    setTimeout(refreshLive, 0);
    const jitter = Math.floor(Math.random() * 5000);
    const intervalId = setInterval(refreshLive, AUTO_INTERVAL_MS + jitter);
    card._nearbyIntervalId = intervalId;
  }

  // ---------- section renderer (+ first-run UX) ----------
  Nearby.renderRecentNearby = async function (containerOrSelector) {
    const root = $(containerOrSelector);
    if (!root) return;

    const rawLocations = await loadSavedLocations();

    // normalize/validate
    const normalized = [];
    for (const loc of (rawLocations || [])) {
      const c = parseCoords(loc.coords);
      const r = parseFloat(loc.radius);
      const label = (loc.label || '').trim() || 'Location';
      if (!c || !Number.isFinite(r)) continue;
      normalized.push({ label, lat: c.lat, lon: c.lon, radiusKm: r });
    }

    // First-run: no saved locations
    if (!normalized.length) {
      root.style.display = '';
      injectResponsiveStyles();
      root.innerHTML = `
        <div class="card" style="padding:12px;">
          <div style="margin-bottom:8px;">
            <strong>No locations yet.</strong>
            <div class="muted" style="margin-top:4px;">
              Add locations in the <a href="#config">Config</a> tab (Config → Locations),<br>
              or quickly start with your current position:
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 2fr auto; gap:8px; align-items:center; max-width:560px;">
            <input id="nearby-quick-label" type="text" class="styled-select" placeholder="Location name (required)" />
            <button id="nearby-quick-use" class="reset-button">Use current location</button>
          </div>
          <small style="display:block; opacity:.75; margin-top:6px;">This will create one location with a radius of 20 km.</small>
          <div id="nearby-quick-status" style="margin-top:8px; min-height:1em; opacity:.9;"></div>
        </div>
      `;

      const btn = root.querySelector('#nearby-quick-use');
      const input = root.querySelector('#nearby-quick-label');
      const stat = root.querySelector('#nearby-quick-status');

      btn?.addEventListener('click', async () => {
        const label = (input?.value || '').trim();
        if (!label) {
          input?.focus();
          stat.textContent = 'Please enter a name for this location.';
          stat.style.color = '#b00020';
          return;
        }
        if (!navigator.geolocation) {
          stat.textContent = 'Geolocation is not supported in this browser.';
          stat.style.color = '#b00020';
          return;
        }

        btn.disabled = true;
        stat.textContent = 'Detecting current position…';
        stat.style.color = '';

        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const loc = { label, coords: `${lat.toFixed(6)}, ${lon.toFixed(6)}`, radius: 20 };
            const ok = await persistNewLocation(loc);
            if (!ok) {
              stat.textContent = 'Could not save the location.';
              stat.style.color = '#b00020';
              btn.disabled = false;
              return;
            }
            stat.textContent = 'Location saved. Loading map…';
            Nearby.renderRecentNearby(root);
          } catch (e) {
            stat.textContent = 'Unexpected error while saving the location.';
            stat.style.color = '#b00020';
            btn.disabled = false;
          }
        }, (err) => {
          stat.textContent = `Unable to get your position: ${err.message || err.code}`;
          stat.style.color = '#b00020';
          btn.disabled = false;
        }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 });

      });

      return;
    }

    // Normal flow: show maps for saved locations
    root.style.display = '';
    injectResponsiveStyles();
    root.innerHTML = `
      <div class="card" style="padding:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div><strong>Nearby Maps</strong></div>
          <small style="opacity:.7;">${normalized.length} location${normalized.length > 1 ? 's' : ''}</small>
        </div>
        <div class="nearby-list" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;"></div>
      </div>
    `;
    const list = root.querySelector('.nearby-list');

    for (const n of normalized) {
      mountMapCard(list, n); // intentionally not awaited
    }
  };

  window.Nearby = Nearby;
})();


// ----- (unchanged) Recent events helpers used elsewhere -----
async function fetchAndRenderRecent() {
  const listEl = document.getElementById('recent-geo-list');
  const metaEl = document.getElementById('recent-geo-meta');
  const errEl = document.getElementById('recent-geo-error');
  if (!listEl) return;

  errEl.style.display = 'none';
  metaEl.textContent = 'Loading…';

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = (Array.isArray(data) ? data : []).slice(-50).reverse();

    listEl.innerHTML = items.map((e) => {
      const ts = Number(e.timestamp);
      const d = isFinite(ts) ? new Date(ts) : null;
      const iso = d ? d.toISOString() : '';
      const rel = d ? formatRelative(d) : '';
      return `
          <li style="padding:6px 0; border-bottom:1px solid #eee;">
            <div style="display:flex; gap:8px; align-items:baseline; flex-wrap:wrap;">
              <span style="font-weight:600;">${rel || '—'}</span>
              <span style="opacity:.6; font-size:.9em;" title="${iso}">${iso}</span>
            </div>
            <div style="margin-top:4px;"><code style="white-space:pre-wrap; word-break:break-word;">${escapeHtml(e.content || '')}</code></div>
          </li>
        `;
    }).join('');

    metaEl.textContent = `Showing ${items.length} / 50 · source: ${API_URL}`;
  } catch (err) {
    metaEl.textContent = '';
    errEl.textContent = `Failed to load events: ${err.message}`;
    errEl.style.display = 'block';
    listEl.innerHTML = '';
  }
}

async function activityStartLocalMaps() {
  document.getElementById('recent-geo-refresh')?.addEventListener('click', fetchAndRenderRecent);
  fetchAndRenderRecent();

  if (window.Nearby && typeof window.Nearby.renderRecentNearby === 'function') {
    window.Nearby.renderRecentNearby('#recent-nearby');
  } else {
    console.warn('nearby.js not loaded; no Nearby Maps will be shown.');
    const cont = document.getElementById('recent-nearby');
    if (cont) cont.style.display = 'none';
  }
}
