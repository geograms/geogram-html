// nearby.js
// Cached "Nearby maps" with background refresh + per-location station list.
// First-run UX included (add from current location).
//
// Improvements:
//  - HTTPS-aware API origin to avoid mixed-content (fixes Brave/Android JSONP issues)
//  - JSONP -> fetch(JSON) fallback when script is blocked
//  - Responsive CSS for small screens + Leaflet invalidateSize on resize
//  - Empty-state text changed to "Config → Locations"
//
// Public API:
//   Nearby.renderRecentNearby(containerOrSelector)

(function () {
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const AUTO_INTERVAL_MS = 30000;
  const LOCAL_PREFIX = 'nearbyCache:';     // localStorage key prefix for station cache
  const MAX_LOCAL_KEYS = 50;               // light pruning for cache

  // Pick HTTPS when the page is HTTPS to avoid mixed-content blocking on mobile browsers.
  const API_ORIGIN = (location.protocol === 'https:' ? 'https://api.geogram.info' : 'http://api.geogram.info');

  const Nearby = {};
  const memResults = new Map();   // key -> { data, fetchedAt:number }
  const inflight = new Map();     // key -> Promise<data>

  // ---------- utils ----------
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
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(dt)
      : '—';
  }
  function fmtLastUpdated(ts) {
    const t = Number(ts);
    if (!isFinite(t)) return '—';
    const diff = Date.now() - t;
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff < oneDay) {
      const mins = Math.max(0, Math.round(diff / 60000));
      return `${mins} min`;
    }
    const days = Math.floor(diff / oneDay);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  function parseCoords(coordsStr) {
    if (!coordsStr) return null;
    const parts = coordsStr.split(',').map(s => s.trim());
    const lat = parseFloat(parts[0]);
    const lon = parseFloat((parts[1] ?? '').replace(/\s+/g, ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  }

  // ---------- inject responsive CSS once ----------
  function injectResponsiveStyles() {
    if (document.getElementById('nearby-css')) return;
    const style = document.createElement('style');
    style.id = 'nearby-css';
    style.textContent = `
      /* Nearby maps responsive tweaks */
      #recent-nearby, .nearby-list, .nearby-list .card { width: 100%; }
      .nm-map { height: clamp(300px, 50vh, 520px); width: 100%; }
      .nm-tablewrap { overflow-x: auto; }
      .nm-table { width: 100%; table-layout: auto; }
      .nm-table th, .nm-table td { padding: 8px 10px; }
      @media (max-width: 768px) {
        .nm-map { height: 60vh; }
        .nm-table th:nth-child(2), .nm-table td:nth-child(2),
        .nm-table th:nth-child(3), .nm-table td:nth-child(3) { white-space: nowrap; }
      }
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
      // CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // JS
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

  // ---------- API helpers (JSONP with CORS fetch fallback) ----------
  function buildNearbyUrlJSONP(lat, lon, radiusKm, cbName) {
    const u = new URL(API_ORIGIN + '/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    u.searchParams.set('JSONP', cbName);
    u.searchParams.set('_', Date.now().toString());
    return u.toString();
  }
  function buildNearbyUrlJSON(lat, lon, radiusKm) {
    const u = new URL(API_ORIGIN + '/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    // server should return application/json without the JSONP param
    return u.toString();
  }

  function jsonpFetch(lat, lon, radiusKm, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      const finalUrl = buildNearbyUrlJSONP(lat, lon, radiusKm, cb);

      const script = document.createElement('script');
      // Some mobile privacy browsers behave better if we set referrerpolicy
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

  async function fetchJSON(lat, lon, radiusKm, timeoutMs = 10000) {
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
  function keyFor(lat, lon, radiusKm) {
    return `${LOCAL_PREFIX}${lat.toFixed(5)},${lon.toFixed(5)}:${radiusKm}`;
  }
  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  function writeLocal(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      pruneLocal();
    } catch (e) {
      try { pruneLocal(true); localStorage.setItem(key, JSON.stringify(obj)); } catch {}
    }
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
        return { k, t: v?.fetchedAt ?? 0 };
      }).sort((a,b) => a.t - b.t);
      const removeCount = aggressive ? Math.ceil(items.length * 0.5) : (items.length - MAX_LOCAL_KEYS);
      for (let i = 0; i < removeCount; i++) localStorage.removeItem(items[i].k);
    }
  }
  function getCached(key) {
    if (memResults.has(key)) return memResults.get(key);
    const local = readLocal(key);
    if (local && typeof local === 'object') {
      memResults.set(key, local);
      return local;
    }
    return null;
  }
  function setCached(key, data) {
    const obj = { data, fetchedAt: Date.now() };
    memResults.set(key, obj);
    writeLocal(key, obj);
    return obj;
  }

  // deduped live fetch with JSONP->fetch fallback
  function fetchLive(key, lat, lon, radiusKm) {
    if (inflight.has(key)) return inflight.get(key);
    const p = jsonpFetch(lat, lon, radiusKm)
      .catch(() => fetchJSON(lat, lon, radiusKm)) // fallback if JSONP blocked
      .then(data => {
        setCached(key, data);
        return data;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
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

    // Create map after Leaflet loads (non-blocking for the page)
    let map, markersLayer;
    let pendingDevices = null; // data to apply to map once ready

    ensureLeafletLoaded().then(() => {
      // Ensure map has a height before init
      mapEl.style.height = getComputedStyle(mapEl).height || '60vh';

      map = L.map(mapEl).setView([lat, lon], 12);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);

      // center + radius
      L.marker([lat, lon]).addTo(map)
        .bindPopup(`<strong>Center</strong><br/>lat ${lat.toFixed(5)}<br/>lon ${lon.toFixed(5)}<br/>radius ${radiusKm} km`);
      L.circle([lat, lon], { radius: radiusKm * 1000 }).addTo(map);

      // If cached data came earlier, render now
      if (pendingDevices) updateMap(pendingDevices);

      // Resize handling for mobile: invalidateSize so Leaflet redraws properly
      const onResize = () => { try { map.invalidateSize(); } catch {} };
      window.addEventListener('resize', onResize, { passive: true });
      // Also a delayed invalidate to catch font/layout reflows
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
        const name = escapeHtml((d.id ?? d.name ?? 'Station').toString());
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

    function updateMap(devices) {
      if (!map || !markersLayer) { pendingDevices = devices; return; }
      markersLayer.clearLayers();

      const bounds = [[lat, lon]];
      if (Array.isArray(devices)) {
        for (const d of devices) {
          if (typeof d.lat !== 'number' || typeof d.lon !== 'number') continue;
          const m = L.marker([d.lat, d.lon]).addTo(markersLayer);
          const dt = d.updated ? new Date(Number(d.updated)) : null;
          m.bindPopup(
            `<strong>${escapeHtml(d.id ?? 'Station')}</strong><br/>
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

    // 1) Try cached first (instant UI)
    const cached = getCached(cacheKey);
    if (cached?.data) {
      statusEl.textContent = `Cached ${fmtClock(new Date(cached.fetchedAt))}`;
      updateTable(cached.data);
      updateMap(cached.data);
    } else {
      statusEl.textContent = 'Loading…';
    }

    // 2) Live refresh (JSONP with CORS fetch fallback)
    function refreshLive() {
      fetchLive(cacheKey, lat, lon, radiusKm)
        .then((data) => {
          updateTable(data);
          updateMap(data);
          statusEl.textContent = `Updated: ${fmtClock(new Date())}`;
        })
        .catch((e) => {
          // Keep cached view; show brief hint if nothing cached
          if (!cached?.data) {
            statusEl.textContent = `Error: ${e.message || 'Network'}. If you use Brave, try enabling HTTPS and/or allowing cross-site scripts for this page.`;
          } else {
            statusEl.textContent = `Error: ${e.message || 'Network'}`;
          }
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

    // First-run: no saved locations -> show guidance + quick-add
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

      const btn   = root.querySelector('#nearby-quick-use');
      const input = root.querySelector('#nearby-quick-label');
      const stat  = root.querySelector('#nearby-quick-status');

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
            const loc = {
              label,
              coords: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
              radius: 20
            };
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
          <small style="opacity:.7;">${normalized.length} location${normalized.length>1?'s':''}</small>
        </div>
        <div class="nearby-list" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;"></div>
      </div>
    `;
    const list = root.querySelector('.nearby-list');

    for (const n of normalized) {
      mountMapCard(list, n); // intentionally not awaited
    }
  };

  // (no-op export)
  window.Nearby = Nearby;
})();
