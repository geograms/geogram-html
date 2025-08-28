function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Local activity</h2>
      <!-- Nearby Maps section is now fully rendered by nearby.js -->
      <div id="recent-nearby"></div>
    </div>

    <div class="right-column">
     
    
    
      <h2>Stream</h2>
      <div id="stream" class="card"></div>
   

    </div>
  `;

  // Recent GEO events list (left as-is, independent of maps)
  const API_URL = 'http://api.geogram.info/messages?lat=40.2056&lon=-8.4196&radius=50';

  async function fetchAndRenderRecent() {
    const listEl = document.getElementById('recent-geo-list');
    const metaEl = document.getElementById('recent-geo-meta');
    const errEl  = document.getElementById('recent-geo-error');
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
        const d  = isFinite(ts) ? new Date(ts) : null;
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
  document.getElementById('recent-geo-refresh')?.addEventListener('click', fetchAndRenderRecent);
  fetchAndRenderRecent();

  // NEW: Let nearby.js render the whole Nearby Maps section (or hide it if no locations)
  if (window.Nearby && typeof window.Nearby.renderRecentNearby === 'function') {
    window.Nearby.renderRecentNearby('#recent-nearby');
  } else {
    console.warn('nearby.js not loaded; no Nearby Maps will be shown.');
    // If you want, you could hide the container:
    const cont = document.getElementById('recent-nearby');
    if (cont) cont.style.display = 'none';
  }

  console.log("Activity tab loaded");
}

/* Utils */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRelative(dateObj) {
  try {
    const diff = Date.now() - dateObj.getTime();
    if (!isFinite(diff)) return '';
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.round(hr / 24);
    return `${d}d ago`;
  } catch {
    return '';
  }
}
