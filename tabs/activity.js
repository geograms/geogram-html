function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Recent</h2>

      <!-- Recent GEO events (last 50) -->
      <div id="recent-geo" class="card" style="padding: 12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div>
            <strong>Last 50 events</strong>
            <small id="recent-geo-meta" style="margin-left:8px; opacity:0.7;"></small>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button id="recent-geo-refresh" class="btn" style="padding:6px 10px; border-radius:6px; border:1px solid #ddd; background:#f7f7f7; cursor:pointer;">Refresh</button>
          </div>
        </div>
        <ul id="recent-geo-list" style="margin-top:10px; list-style:none; padding:0; max-height:360px; overflow:auto;"></ul>
        <div id="recent-geo-error" style="margin-top:10px; color:#b00020; display:none;"></div>
      </div>

      <div class="card" id="voice-notes">
        <div id="recording-indicator" style="display: none; margin: 10px 0;">
          <div class="pulse-circle"></div>
          <span>Recording...</span>
          <span id="recording-timer" style="margin-left: 10px; font-weight: bold;">00:00</span>
        </div>
        <div id="volume-bar-wrapper" style="margin-top: 10px; display: none;">
          <div id="volume-bar" style="
            height: 10px;
            width: 0;
            background-color: limegreen;
            transition: width 0.1s ease;
          "></div>
        </div>
        <ul id="recording-list" class="card" style="margin-top: 10px;"></ul>
      </div>

      <h2>Favorites</h2>
      <div id="activity-feed" class="card"></div>
    </div>

    <div class="right-column">
      <button id="toggle-listening" class="card" style="
        font-size: 1.2em;
        padding: 12px;
        background-color:rgb(22, 51, 23);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        border-radius: 6px;">
        🎧 Start Listening
      </button>

      <h2>SMS</h2>
      <div id="smsDialog" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center;">
        <div style="background:#fff; padding:2em; border-radius:8px; max-width:400px; margin:auto; position:relative;">
          <h3>Send APRS Message</h3>
          <label>
            Destination Callsign:<br>
            <input type="text" id="smsDest" maxlength="9" style="width:100%;" />
          </label>
          <br><br>
          <label>
            Message:<br>
            <textarea id="smsContent" rows="4" style="width:100%;"></textarea>
          </label>
          <br><br>
          <button id="sendSmsBtn">Send</button>
          <button id="closeSmsDialog" style="margin-left:1em;">Cancel</button>
          <div id="smsStatus" style="margin-top:1em; color:green;"></div>
        </div>
      </div>

      <h2>Channel</h2>
      <select id="channel-selector" class="styled-select">
        <option value="">Not Defined</option>
        <option value="446.00625">446.00625 MHz (PMR channel 1)</option>
        <option value="446.01875">446.01875 MHz (PMR channel 2)</option>
        <option value="446.03125">446.03125 MHz (PMR channel 3)</option>
        <option value="446.04375">446.04375 MHz (PMR channel 4)</option>
        <option value="446.05625">446.05625 MHz (PMR channel 5)</option>
        <option value="446.06875">446.06875 MHz (PMR channel 6)</option>
        <option value="446.08125">446.08125 MHz (PMR channel 7)</option>
        <option value="446.09375">446.09375 MHz (PMR channel 8)</option>
      </select>

      <h2>Nearby</h2>
      <div id="nearby-stations" class="card"></div>
      <h2>Groups</h2>
      <div id="groups" class="card"></div>
      <h2>People</h2>
      <div id="people" class="card"></div>
      <h2>Things</h2>
      <div id="things" class="card"></div>
    </div>
  `;

  // Existing hooks
  document.getElementById('newSmsBtn')?.addEventListener('click', openSmsDialog);
  document.getElementById('closeSmsDialog')?.addEventListener('click', closeSmsDialog);
  document.getElementById('sendSmsBtn')?.addEventListener('click', sendAprsMessage);
  if (typeof initRecordingUI === 'function') initRecordingUI();

  // Recent GEO events
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

      // take last 50 (API returns oldest at bottom) and show newest first
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

  // Initial load + light auto-refresh (optional; 60s)
  fetchAndRenderRecent();
  // setInterval(fetchAndRenderRecent, 60000);

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
