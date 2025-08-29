// tabs/profile.js
// Profile tab: view info for a specific callsign.
// Deep link: #profile:X1ABCD
// Auto-loads the user's callsign if no deep link is set.
//
// Expected API:
//   GET  https://api.geogram.info/profile/<CALLSIGN>

(function () {
  const LOCAL_PREFIX = 'profileCache:';         // localStorage key prefix
  const API_ORIGIN = (location.protocol === 'https:' ? 'https://api.geogram.info' : 'http://api.geogram.info');

  let currentCallsign = '';
  let ownCallsign = '';
  let pendingAvatarDataUrl = null; // for own profile picture selection (preview & save payload)

  // ---------- small helpers ----------
  function $(selOrEl) {
    return typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl;
  }
  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
  function fmtClock(tsOrDate) {
    const d = tsOrDate instanceof Date ? tsOrDate : new Date(Number(tsOrDate));
    if (!isFinite(d.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(d);
  }
  function fmtAgo(ts) {
    const t = Number(ts);
    if (!isFinite(t)) return '';
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ---------- URL / API ----------
  function callsignFromHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#profile')) return '';
    const parts = hash.slice(1).split(':'); // ["profile", "<CS>"]
    return (parts[1] || '').trim().toUpperCase();
  }
  function profileUrlJSON(callsign) {
    return `${API_ORIGIN}/profile/${encodeURIComponent(callsign)}`;
  }

  // Fetch JSON; surface server JSON error bodies (e.g., {comment, value})
  async function fetchJSON(callsign, timeoutMs = 12000) {
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

      let payload = null;
      try { payload = await res.json(); } catch { /* non-JSON or empty */ }

      if (!res.ok) {
        const msg = (payload && (payload.comment || payload.error)) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }
      return payload;
    } finally {
      clearTimeout(t);
    }
  }

  // ---------- cache ----------
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

  // ---------- UI template ----------
  function template() {
    return `
      <div class="left-column">
        <h2 id="pf-title">—</h2>

        <div id="pf-status" class="card" style="padding:12px; min-height:2.2em; display:flex; align-items:center;"></div>

        <!-- DETAILS (moved up) -->
        <div id="pf-details" class="card" style="padding:12px; display:none; margin-top:10px;"></div>

        <!-- SUMMARY (picture + compact text) below details to avoid big blank space -->
        <div id="pf-summary" class="card" style="padding:12px; display:none; margin-top:10px;"></div>

        <div id="pf-associated" class="card" style="padding:12px; display:none; margin-top:10px;">
          <div style="font-weight:700; margin-bottom:6px;">Associated profiles</div>
          <ul id="pf-associated-list" style="margin:0; padding-left:18px;"></ul>
        </div>
      </div>

      <div class="right-column">
        <h2>Actions</h2>
        <div class="card" style="padding:12px;">
          <!-- No copy-link button -->
          <button id="pf-save" class="reset-button" style="display:none;">Save changes</button>
          <div id="pf-save-status" style="margin-top:6px; min-height:1em; opacity:.9;"></div>
        </div>
      </div>
    `;
  }

  // ---------- data normalization ----------
  function normalizeProfileData(d, callsign) {
    const out = { ...d };
    // Map server variations to canonical keys
    if (out.firsTimeSeen != null && out.firstTimeSeen == null) {
      out.firstTimeSeen = out.firsTimeSeen;
    }
    if (out.messagesArchived == null && out.messagesSent != null) {
      out.messagesArchived = out.messagesSent;
    }
    if (!out.callsign) out.callsign = callsign.toUpperCase();
    // Types as strings
    if (out.profileType) out.profileType = String(out.profileType).toUpperCase();
    if (out.profileVisibility) out.profileVisibility = String(out.profileVisibility).toUpperCase();
    // Ensure array
    if (!Array.isArray(out.profilesAssociated)) out.profilesAssociated = [];
    return out;
  }

  function defaultOwnProfile(cs) {
    return {
      callsign: cs.toUpperCase(),
      name: "",
      npub: "", // will be filled from config (localStorage 'pubkey')
      description: "",
      // picture controlled separately (no placeholder)
      messagesArchived: "",           // not editable; unknown offline
      lastUpdated: "",                // not editable; unknown offline
      firstTimeSeen: "",              // not editable; unknown offline
      profileType: "PERSON",
      profileVisibility: "PUBLIC",
      profilesAssociated: []
    };
  }

  // ---------- render ----------
  async function renderProfile(callsign) {
    currentCallsign = callsign;
    pendingAvatarDataUrl = null;

    const statusEl = $('#pf-status');
    const titleEl = $('#pf-title');
    const summaryEl = $('#pf-summary');
    const detailsEl = $('#pf-details');
    const assocCard = $('#pf-associated');
    const assocList = $('#pf-associated-list');
    const saveBtn = $('#pf-save');
    const saveStatus = $('#pf-save-status');

    // Title should be just the callsign
    titleEl.textContent = callsign;

    // Update hash so links can be shared/bookmarked
    const newHash = `#profile:${encodeURIComponent(callsign)}`;
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    // Identify if this is our own profile
    const isOwn = (ownCallsign && ownCallsign.toUpperCase() === callsign.toUpperCase());

    // read cache
    const key = cacheKeyFor(callsign);
    const cached = readCache(key);

    // show cached immediately if present
    let shownFromCache = false;
    if (cached?.data) {
      const n = normalizeProfileData(cached.data, callsign);
      paint(n, isOwn);
      statusEl.textContent = `Cached copy from ${fmtClock(cached.fetchedAt)} (${fmtAgo(cached.fetchedAt)})`;
      shownFromCache = true;
    } else {
      statusEl.textContent = 'Loading…';
      summaryEl.style.display = 'none';
      detailsEl.style.display = 'none';
      assocCard.style.display = 'none';
    }

    // try live
    try {
      const live = await fetchJSON(callsign);
      writeCache(key, live);
      const nLive = normalizeProfileData(live, callsign);
      paint(nLive, isOwn);
      statusEl.textContent = `Live data • Updated ${fmtClock(Date.now())}`;
    } catch (e) {
      if (isOwn) {
        // Our own profile may not exist on the API; show editable defaults.
        const base = cached?.data ? normalizeProfileData(cached.data, callsign) : defaultOwnProfile(callsign);
        paint(base, true);
        const when = cached?.fetchedAt;
        const extraMsg = `There is no API data yet for your profile. You can edit your details below if you wish and save them.`;
        statusEl.textContent = when
          ? `${extraMsg} • cached copy from ${fmtClock(when)} (${fmtAgo(when)})`
          : extraMsg;
      } else if (!shownFromCache) {
        const msg = e?.message || 'Network error';
        statusEl.innerHTML = `<span style="color:var(--danger, #b00);">Error:</span> ${escapeHtml(msg)}`;
      } else {
        const when = cached?.fetchedAt ?? cached?.fetched_at ?? null;
        const extra = navigator.onLine ? 'Server unreachable' : 'Offline';
        statusEl.textContent = `${extra}: showing cached copy${when ? ` from ${fmtClock(when)} (${fmtAgo(when)})` : ''}`;
      }
    }

    // paint function: fills DETAILS (top), SUMMARY (below), associated
    function paint(d, editable) {
      const cs = d.callsign || callsign;

      // npub source: if own, take from config/localStorage; else from API
      const npubOwn = (localStorage.getItem('pubkey') || '').trim();
      if (editable) d.npub = npubOwn || d.npub || '';

      // DETAILS (core fields; editable name/description + dropdowns if own)
      const lastUpd = d.lastUpdated ?? d.updated ?? null;
      const firstSeen = d.firstTimeSeen ?? null;

      const label = (txt) => `<span style="color:var(--muted,#666);">${escapeHtml(txt)}</span>`;

      const row = (labelText, valueHtml) => `
        <tr>
          <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); width: 200px;">${label(labelText)}</td>
          <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee);">${valueHtml}</td>
        </tr>
      `;

      const inputText = (id, val, placeholder='') =>
        `<input id="${id}" type="text" class="styled-input" value="${escapeHtml(val || '')}" placeholder="${escapeHtml(placeholder)}" style="width:100%;">`;

      const textarea = (id, val, placeholder='') =>
        `<textarea id="${id}" class="styled-input" placeholder="${escapeHtml(placeholder)}" style="width:100%; min-height:90px;">${escapeHtml(val || '')}</textarea>`;

      const select = (id, options, current) => `
        <select id="${id}" class="styled-input" style="width:100%;">
          ${options.map(opt => `<option value="${escapeHtml(opt)}"${String(current).toUpperCase() === opt ? ' selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
        </select>
      `;

      // Editable fields when it's our own profile
      const nameCell = editable ? inputText('pf-edit-name', d.name, 'Your display name') : escapeHtml(d.name || '');
      const npubCell = `<code style="word-break:break-all;">${escapeHtml(editable ? (localStorage.getItem('pubkey') || '').trim() : (d.npub || ''))}</code>`; // read-only
      const descCell = editable ? textarea('pf-edit-description', d.description, 'Describe yourself, device or place…') : escapeHtml(d.description || '');

      const typeOptions = ['PERSON', 'DEVICE', 'STATION'];
      const visOptions = ['PUBLIC', 'PRIVATE'];
      const profileTypeValue = (String(d.profileType || 'PERSON').toUpperCase());
      const profileVisibilityValue = (String(d.profileVisibility || 'PUBLIC').toUpperCase());

      const typeCell = editable ? select('pf-edit-type', typeOptions, profileTypeValue) : escapeHtml(profileTypeValue);
      const visibilityCell = editable ? select('pf-edit-visibility', visOptions, profileVisibilityValue) : escapeHtml(profileVisibilityValue);

      const rowsHtml = [
        row('Name', nameCell),
        row('NPUB', npubCell),
        row('Description', descCell),
        row('Messages Archived', (d.messagesArchived != null && d.messagesArchived !== '') ? escapeHtml(String(d.messagesArchived)) : '—'),
        row('Last Updated', lastUpd != null && lastUpd !== '' ? `${escapeHtml(fmtClock(lastUpd))} (${escapeHtml(fmtAgo(lastUpd))})` : '—'),
        row('First Time Seen', firstSeen != null && firstSeen !== '' ? `${escapeHtml(fmtClock(firstSeen))} (${escapeHtml(fmtAgo(firstSeen))})` : '—'),
        row('Profile Type', typeCell),
        row('Profile Visibility', visibilityCell),
      ].join('');

      detailsEl.style.display = '';
      detailsEl.innerHTML = `
        <table class="nm-table" style="width:100%; border-collapse:collapse;">
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      // SUMMARY (below details): show profile picture & compact info
      const imgSrc = pendingAvatarDataUrl || d.avatar || '';
      const showImage = !!imgSrc;
      const showChooser = editable; // still allow choosing a picture even if none is present

      // Build summary content without placeholder holder when no image.
      let leftBlocks = '';
      if (showImage) {
        leftBlocks += `
          <div id="pf-avatar-slot" style="flex:0 0 auto;">
            <img id="pf-avatar-preview" src="${escapeHtml(imgSrc)}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px var(--border,#ddd);">
          </div>`;
      } else if (editable) {
        // Create a hidden slot to insert the image upon choosing a file (no visual space taken)
        leftBlocks += `<div id="pf-avatar-slot" style="display:none;"></div>`;
      }

      const chooserBlock = showChooser ? `
        <div style="display:flex; flex-direction:column; align-items:flex-start;">
          <label for="pf-avatar-file" style="font-weight:600; margin-bottom:6px;">Choose a profile picture</label>
          <input id="pf-avatar-file" type="file" accept="image/*" class="styled-input" style="width:280px;">
        </div>
      ` : ``;

      const textBlock = `
        <div style="flex:1; min-width:240px;">
          ${d.name ? `<div style="font-size:1.05em; font-weight:600;">${escapeHtml(d.name)}</div>` : ''}
          ${d.description ? `<div style="opacity:.85; margin-top:4px;">${escapeHtml(d.description)}</div>` : ''}
        </div>
      `;

      const blocks = [leftBlocks, chooserBlock, textBlock].filter(Boolean).join('');

      if (blocks.trim()) {
        summaryEl.style.display = '';
        summaryEl.innerHTML = `
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            ${blocks}
          </div>
        `;
      } else {
        // No image, no chooser, no text -> hide summary entirely to avoid blank space
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
      }

      // Wire avatar file input for own profile (preview only; not saved yet)
      if (editable) {
        const fileEl = $('#pf-avatar-file');
        if (fileEl && !fileEl._wired) {
          fileEl._wired = true;
          fileEl.addEventListener('change', async () => {
            const f = fileEl.files && fileEl.files[0];
            if (!f) return;
            try {
              const dataUrl = await readFileAsDataURL(f);
              pendingAvatarDataUrl = dataUrl;

              let slot = $('#pf-avatar-slot');
              if (!slot) {
                // If summary was hidden or lacked a slot, create one now just before chooser
                const parent = fileEl.closest('div.card') || summaryEl;
                slot = document.createElement('div');
                slot.id = 'pf-avatar-slot';
                // insert before chooser block if possible
                if (fileEl.parentElement && fileEl.parentElement.parentElement) {
                  fileEl.parentElement.parentElement.insertAdjacentElement('beforebegin', slot);
                } else {
                  summaryEl.firstElementChild?.insertAdjacentElement('afterbegin', slot);
                }
              }
              slot.style.display = '';
              slot.innerHTML = `
                <img id="pf-avatar-preview" src="${escapeHtml(dataUrl)}" alt=""
                     style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px var(--border,#ddd);">
              `;
            } catch (err) {
              console.warn('Avatar preview failed:', err);
            }
          });
        }
      }

      // Associated profiles
      const assoc = Array.isArray(d.profilesAssociated) ? d.profilesAssociated : [];
      if (assoc.length) {
        $('#pf-associated').style.display = '';
        assocList.innerHTML = assoc.map(item => {
          // Support either strings or {callsign, dateStarted}
          let cs2 = '', ds = '';
          if (typeof item === 'string') cs2 = item;
          else if (item && typeof item === 'object') {
            cs2 = item.callsign || '';
            if (item.dateStarted != null) ds = ` — since ${fmtClock(item.dateStarted)} (${fmtAgo(item.dateStarted)})`;
          }
          return `<li><a href="#profile:${encodeURIComponent(cs2)}">${escapeHtml(cs2)}</a>${escapeHtml(ds)}</li>`;
        }).join('');
      } else {
        $('#pf-associated').style.display = 'none';
        assocList.innerHTML = '';
      }

      // Save button visibility & click (no backend yet)
      saveBtn.style.display = editable ? '' : 'none';
      saveStatus.textContent = '';
      if (editable && !saveBtn._wired) {
        saveBtn._wired = true;
        saveBtn.addEventListener('click', () => {
          const payload = {
            callsign: cs,
            npub: (localStorage.getItem('pubkey') || '').trim(), // read-only source
            name: $('#pf-edit-name')?.value?.trim() || '',
            description: $('#pf-edit-description')?.value?.trim() || '',
            profileType: ($('#pf-edit-type')?.value || 'PERSON').toUpperCase(),
            profileVisibility: ($('#pf-edit-visibility')?.value || 'PUBLIC').toUpperCase(),
            // Optional avatar (data URL if selected this session)
            avatarDataUrl: pendingAvatarDataUrl || null
          };
          // In a future iteration we will POST this payload.
          console.log('Profile save (pending backend):', payload);
          saveStatus.textContent = 'Changes prepared (saving not implemented yet).';
        });
      }
    }
  }

  // ---------- resolve default callsign ----------
  async function resolveOwnCallsign() {
    try {
      if (window.GeogramAPI && typeof window.GeogramAPI.getUser === 'function') {
        const u = await window.GeogramAPI.getUser();
        const cs = (u?.callsign || u?.username || '').trim();
        if (cs) return cs.toUpperCase();
      }
    } catch {/* ignore */}
    const ls = (localStorage.getItem('username') || '').trim();
    return (ls || '').toUpperCase();
  }

  // ---------- entry ----------
  window.render = function render() {
    const root = document.getElementById('content');
    root.innerHTML = template();

    if (typeof window.setupAnchorNavigation === 'function') {
      window.setupAnchorNavigation('profile');
    }

    // Decide which callsign to load
    (async () => {
      ownCallsign = await resolveOwnCallsign();
      const fromHash = callsignFromHash();
      let cs = fromHash || ownCallsign;
      if (!cs) {
        $('#pf-status').innerHTML = `No callsign set. Go to <a href="#config">Config → User</a> to create one.`;
        return;
      }
      await renderProfile(cs);
    })();
  };
})();
