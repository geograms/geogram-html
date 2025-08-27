// nearby.js
// Cached "Nearby maps" with background refresh + per-location station list.
// Also provides a first-run UX: when there are no locations, show guidance,
// a link to Config, and a "Use current location" quick-add (20 km radius).
//
// Public API:
//   Nearby.renderRecentNearby(containerOrSelector)

(function () {
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const AUTO_INTERVAL_MS = 30000;
  const LOCAL_PREFIX = 'nearbyCache:';     // localStorage key prefix for station cache
  const MAX_LOCAL_KEYS = 50;               // light pruning for cache

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
      ? dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';
  }
  // For table: minutes, or days when >= 1 day
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
    // Try DB first if your app provides it
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.addLocation === 'function') {
        await window.GeogramAPI.addLocation(loc);
        return true;
      }
      if (window.GeogramAPI && typeof window.GeogramAPI.setLocations === 'function') {
        // fallback if API expects a full list
        const existing = await loadSavedLocations();
        existing.push(loc);
        await window.GeogramAPI.setLocations(existing);
        return true;
      }
    } catch (e) {
      console.warn('Nearby: DB persist failed, falling back to localStorage.', e);
    }

    // Fallback: localStorage
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

  // ---------- JSONP ----------
  function buildJsonpUrl(baseUrl, cbName) {
    const u = new URL(baseUrl, window.location.href);
    u.searchParams.set('JSONP', cbName);
    u.searchParams.set('_', Date.now().toString()); // cache-bust
    return u.toString();
  }
  function jsonpFetch(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      const finalUrl = buildJsonpUrl(url, cb);

      const script = document.createElement('script');
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        try { delete window[cb]; } catch {}
        script.remove();
        clearTimeout(tid);
      };

      window[cb] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('Network/script error')); };
      script.src = finalUrl;

      const tid = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for JSONP'));
      }, timeoutMs);

      document.body.appendChild(script);
    });
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

  function fetchLive(key, lat, lon, radiusKm) {
    if (inflight.has(key)) return inflight.get(key);
    const url = buildNearbyUrl(lat, lon, radiusKm);
    const p = jsonpFetch(url)
      .then(data => {
        setCached(key, data);
        return data;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  // ---------- map card ----------
  function buildNearbyUrl(lat, lon, radiusKm) {
    const u = new URL('http://api.geogram.info/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    return u.toString();
  }

  async function mountMapCard(parentEl, opts) {
    const { label, lat, lon, radiusKm = 50 } = opts;
    const cacheKey = keyFor(lat, lon, radiusKm);

    // Build the card immediately (no blocking)
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '12px';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div><strong>${escapeHtml(label || 'Location')}</strong>
          <small style="opacity:.7; margin-left:.5em;">${lat.toFixed(5)}, ${lon.toFixed(5)} · ${radiusKm} km</small>
        </div>
        <div class="nm-status" style="opacity:.7;"></div>
      </div>
      <div class="nm-map" style="height: 350px; margin-top: 8px; border-radius: 8px; overflow: hidden;"></div>

      <div class="nm-tablewrap" style="margin-top:10px; overflow:auto;">
        <table class="nm-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border, #ddd);">Name</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border, #ddd);">Distance</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border, #ddd);">Last updated</th>
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

    // Create map after Leaflet loads (non-blocking for the page)
    let map, markersLayer, centerMarker, radiusCircle;
    let pendingDevices = null; // data to apply to map once ready

    ensureLeafletLoaded().then(() => {
      map = L.map(mapEl).setView([lat, lon], 12);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);

      // center + radius
      centerMarker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<strong>Center</strong><br/>lat ${lat.toFixed(5)}<br/>lon ${lon.toFixed(5)}<br/>radius ${radiusKm} km`);
      radiusCircle = L.circle([lat, lon], { radius: radiusKm * 1000 }).addTo(map);

      // if we got cached data before map was ready, apply now
      if (pendingDevices) {
        updateMap(pendingDevices);
        updateTable(pendingDevices);
      }
    });

    function updateTable(devices) {
      if (!tbodyEl) return;
      const arr = Array.isArray(devices) ? devices.slice() : [];
      // sort by distance asc when available
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
            <td style="padding:6px 8px; border-bottom:1px solid var(--border, #eee);">${name}</td>
            <td style="padding:6px 8px; border-bottom:1px solid var(--border, #eee); text-align:right;">${dist}</td>
            <td style="padding:6px 8px; border-bottom:1px solid var(--border, #eee); text-align:right;">${last}</td>
          </tr>
        `;
      }).join('');
    }

    function updateMap(devices) {
      if (!map || !markersLayer) {
        pendingDevices = devices;
        return;
      }
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

    // 2) Kick off live refresh (non-blocking)
    function refreshLive() {
      fetchLive(cacheKey, lat, lon, radiusKm)
        .then((data) => {
          updateTable(data);
          updateMap(data);
          statusEl.textContent = `Live ${fmtClock(new Date())}`;
        })
        .catch((e) => {
          // keep cached view; show error but don't disrupt UI
          statusEl.textContent = `Error: ${e.message}`;
        });
    }
    // immediate live refresh, but don't await (non-blocking for page)
    setTimeout(refreshLive, 0);

    // 3) Auto-refresh with jitter
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
      root.innerHTML = `
        <div class="card" style="padding:12px;">
          <div style="margin-bottom:8px;">
            <strong>No locations yet.</strong>
            <div class="muted" style="margin-top:4px;">
              Add locations in the <a href="#config">Config</a> tab (Settings → Locations),<br>
              or quickly start with your current position:
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 2fr auto; gap:8px; align-items:center; max-width:520px;">
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
            // Re-render section with the newly saved location
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

    // Create all cards immediately; each handles its own cache + live refresh
    for (const n of normalized) {
      mountMapCard(list, n); // intentionally not awaited
    }
  };

  // ------- cache helpers (shared) -------
  function buildNearbyUrl(lat, lon, radiusKm) {
    const u = new URL('http://api.geogram.info/nearby', window.location.href);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', radiusKm);
    return u.toString();
  }

  window.Nearby = Nearby;
})();
