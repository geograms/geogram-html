// tabs/profile.js
// Profile tab: view info for a specific callsign.
// Deep link: #profile:X1ABCD
// Auto-loads the user's callsign if no deep link is set.
//
// API:
//   GET  https://api.geogram.radio/profile/<CALLSIGN>
//   POST https://api.geogram.radio/nostr  (Nostr-signed event)

(function () {
  const LOCAL_PREFIX = 'profileCache:'; // localStorage key prefix
  const API_ORIGIN = API_URL; // from internal.config.js

  // state

  let currentCallsign = '';
  let ownCallsign = '';
  let pendingAvatarDataUrl = null; // previewed avatar (data URL) for own profile

  // ---------- small helpers ----------
  function $(selOrEl) {
    return typeof selOrEl === 'string'
      ? document.querySelector(selOrEl)
      : selOrEl;
  }
  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function fmtClock(tsOrDate) {
    const d = tsOrDate instanceof Date ? tsOrDate : new Date(Number(tsOrDate));
    if (!isFinite(d.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
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

  // ---------- Canonical JSON (OPTION A to match server) ----------
  // Must match server's canonicalJson(): sort object keys; arrays kept in order;
  // escape only backslash and double quote; no extra spaces.
  function cjEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
  function cjWrite(el) {
    if (el === null || el === undefined) return 'null';
    if (Array.isArray(el)) {
      return '[' + el.map(cjWrite).join(',') + ']';
    }
    const t = typeof el;
    if (t === 'string') return `"${cjEscape(el)}"`;
    if (t === 'number' || t === 'boolean') return String(el);
    // object: sort keys recursively
    const keys = Object.keys(el).sort();
    return (
      '{' +
      keys.map((k) => `"${cjEscape(k)}":` + cjWrite(el[k])).join(',') +
      '}'
    );
  }
  async function sha256HexUtf8(str) {
    if (window.NostrTools?.utils?.sha256 && window.NostrTools?.utils?.bytesToHex) {
      const enc = new TextEncoder().encode(str);
      const bytes = await window.NostrTools.utils.sha256(enc);
      return window.NostrTools.utils.bytesToHex(bytes);
    }
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = new Uint8Array(buf);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Basic hex helpers (fallbacks if NostrTools.utils isn't present)
  function hexToBytes(hex) {
    const s = hex.startsWith('0x') ? hex.slice(2) : hex;
    const out = new Uint8Array(s.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(s.substr(i * 2, 2), 16);
    }
    return out;
  }
  function bytesToHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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
  function nostrUrl() {
    return `${API_ORIGIN}/nostr`;
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
        headers: { Accept: 'application/json' }
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        /* non-JSON or empty */
      }

      if (!res.ok) {
        const msg =
          (payload && (payload.comment || payload.error)) ||
          `HTTP ${res.status}`;
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
    } catch {
      return null;
    }
  }
  function writeCache(key, data) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ data, fetchedAt: Date.now() })
      );
    } catch {
      /* best effort */
    }
  }

  // ---------- data normalization ----------
  function normalizeProfileData(d, callsign) {
    const out = { ...d };
    if (out.firsTimeSeen != null && out.firstTimeSeen == null) {
      out.firstTimeSeen = out.firsTimeSeen;
    }
    if (out.messagesArchived == null && out.messagesSent != null) {
      out.messagesArchived = out.messagesSent;
    }
    if (!out.callsign) out.callsign = callsign.toUpperCase();
    if (out.profileType) out.profileType = String(out.profileType).toUpperCase();
    if (out.profileVisibility)
      out.profileVisibility = String(out.profileVisibility).toUpperCase();
    if (!Array.isArray(out.profilesAssociated)) out.profilesAssociated = [];
    return out;
  }

  function defaultOwnProfile(cs) {
    return {
      callsign: cs.toUpperCase(),
      name: '',
      npub: '', // filled from localStorage 'pubkey'
      description: '',
      messagesArchived: '',
      lastUpdated: '',
      firstTimeSeen: '',
      profileType: 'PERSON',
      profileVisibility: 'PUBLIC',
      profilesAssociated: []
    };
  }

  // ---------- signing helpers ----------
  function getLocalKeys() {
    const pubkey = (localStorage.getItem('pubkey') || '').trim();
    const nsec = (localStorage.getItem('nsec') || '').trim();
    let skHex = '';
    if (nsec) {
      if (/^nsec/i.test(nsec) && window.NostrTools?.nip19) {
        try {
          const dec = window.NostrTools.nip19.decode(nsec);
          if (dec.type === 'nsec') skHex = dec.data;
        } catch (e) {
          console.warn('nsec decode failed:', e);
        }
      } else {
        skHex = nsec; // assume hex
      }
    }
    return { pubkey, skHex };
  }

  // Fallback event-hash if NostrTools.getEventHash is missing (NIP-01 serialization)
  async function getEventHashCompat(ev) {
    if (window.NostrTools?.getEventHash) {
      return window.NostrTools.getEventHash(ev);
    }
    const payload = JSON.stringify([
      0,
      ev.pubkey || '',
      ev.created_at || 0,
      ev.kind || 0,
      Array.isArray(ev.tags) ? ev.tags : [],
      ev.content ?? ''
    ]);
    return sha256HexUtf8(payload);
  }

  // Manual finalize if finalizeEvent/signEvent are missing but schnorr is available
  async function finalizeWithSchnorr(ev, skHex) {
    const out = { ...ev };
    if (!out.pubkey) {
      if (window.NostrTools?.getPublicKey) {
        out.pubkey = window.NostrTools.getPublicKey(skHex);
      } else {
        throw new Error('No getPublicKey available for manual finalize');
      }
    }
    const idHex = await getEventHashCompat(out);

    let sigHex;
    if (window.NostrTools?.schnorr?.sign) {
      // Try (hex, hex)
      try {
        const tryHex = await window.NostrTools.schnorr.sign(idHex, skHex);
        if (typeof tryHex === 'string') {
          sigHex = tryHex;
        }
      } catch (_) { /* fall through */ }
      if (!sigHex) {
        // Try (bytes, bytes)
        const h2b = window.NostrTools?.utils?.hexToBytes || hexToBytes;
        const b2h = window.NostrTools?.utils?.bytesToHex || bytesToHex;
        const sigBytes = await window.NostrTools.schnorr.sign(
          h2b(idHex),
          h2b(skHex)
        );
        sigHex = typeof sigBytes === 'string' ? sigBytes : b2h(sigBytes);
      }
    } else {
      throw new Error('No schnorr.sign available for manual finalize');
    }

    out.id = idHex;
    out.sig = sigHex;
    return out;
  }

  async function signEventLocal(event) {
    const { pubkey, skHex } = getLocalKeys();

    // 1) Use NostrTools.finalizeEvent if present
    if (skHex && window.NostrTools?.finalizeEvent) {
      const signed = window.NostrTools.finalizeEvent(event, skHex);
      if (!signed.pubkey) {
        signed.pubkey =
          pubkey ||
          (window.NostrTools.getPublicKey
            ? window.NostrTools.getPublicKey(skHex)
            : undefined);
      }
      return signed;
    }

    // 2) Use NostrTools.signEvent if present
    if (skHex && window.NostrTools?.signEvent) {
      const ev = { ...event };
      if (!ev.pubkey) {
        ev.pubkey =
          pubkey ||
          (window.NostrTools.getPublicKey
            ? window.NostrTools.getPublicKey(skHex)
            : undefined);
      }
      return window.NostrTools.signEvent(ev, skHex);
    }

    // 3) Manual finalize using schnorr.sign + getPublicKey + getEventHash
    if (skHex && (window.NostrTools?.schnorr || window.NostrTools?.getPublicKey)) {
      const ev = { ...event, pubkey: event.pubkey || pubkey || '' };
      return await finalizeWithSchnorr(ev, skHex);
    }

    // 4) NIP-07 provider as a last resort
    if (window.nostr?.signEvent) {
      const ev = { ...event };
      if (!ev.pubkey) ev.pubkey = pubkey || undefined;
      return await window.nostr.signEvent(ev);
    }

    throw new Error('No signing method available');
  }

  async function buildSignedEventForProfileEdit(callsign, profileData) {
    const tsSec = Math.floor(Date.now() / 1000);
    const { pubkey } = getLocalKeys();

    // Create the content with action and profile data
    const content = JSON.stringify({
      callsign: callsign,
      action: "profile-edit",
      ...profileData
    });

    const event = {
      kind: 1, // kind 1 for text notes as per the sample
      created_at: tsSec,
      tags: [
        ["request", "profile-edit"],
        ["client", "geogram"]
      ],
      content: content,
      pubkey: pubkey || undefined
    };

    // Sign the event
    const signed = await signEventLocal(event);
    return signed;
  }

  // ---------- UI template ----------
  function template() {
    return `
      <div class="left-column">
        <h2 id="pf-title">—</h2>

        <div id="pf-status" class="card" style="padding:12px; min-height:2.2em; display:flex; align-items:center;"></div>

        <!-- DETAILS -->
        <div id="pf-details" class="card" style="padding:12px; display:none; margin-top:10px;"></div>

        <!-- SUMMARY (picture + compact text) -->
        <div id="pf-summary" class="card" style="padding:12px; display:none; margin-top:10px;"></div>

        <div id="pf-associated" class="card" style="padding:12px; display:none; margin-top:10px;">
          <div style="font-weight:700; margin-bottom:6px;">Associated profiles</div>
          <ul id="pf-associated-list" style="margin:0; padding-left:18px;"></ul>
        </div>
      </div>

      <div class="right-column">
        <h2>Actions</h2>
        <div class="card" style="padding:12px;">
          <button id="pf-save" class="reset-button" style="display:none;">Save changes</button>
          <div id="pf-save-status" style="margin-top:6px; min-height:1em; opacity:.9;"></div>
        </div>
      </div>
    `;
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

    titleEl.textContent = callsign;

    const newHash = `#profile:${encodeURIComponent(callsign)}`;
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    const isOwn =
      ownCallsign && ownCallsign.toUpperCase() === callsign.toUpperCase();

    // cache-first paint
    const key = cacheKeyFor(callsign);
    const cached = readCache(key);
    let shownFromCache = false;
    if (cached?.data) {
      const n = normalizeProfileData(cached.data, callsign);
      paint(n, isOwn);
      statusEl.textContent = `Cached copy from ${fmtClock(
        cached.fetchedAt
      )} (${fmtAgo(cached.fetchedAt)})`;
      shownFromCache = true;
    } else {
      statusEl.textContent = 'Loading…';
      summaryEl.style.display = 'none';
      detailsEl.style.display = 'none';
      assocCard.style.display = 'none';
    }

    // live fetch
    try {
      const live = await fetchJSON(callsign);
      writeCache(key, live);
      const nLive = normalizeProfileData(live, callsign);
      paint(nLive, isOwn);
      statusEl.textContent = `Live data • Updated ${fmtClock(Date.now())}`;
    } catch (e) {
      if (isOwn) {
        const base = cached?.data
          ? normalizeProfileData(cached.data, callsign)
          : defaultOwnProfile(callsign);
        paint(base, true);
        const when = cached?.fetchedAt;
        const msg =
          'There is no API data yet for your profile. You can edit your details below if you wish and save them.';
        statusEl.textContent = when
          ? `${msg} • cached copy from ${fmtClock(when)} (${fmtAgo(when)})`
          : msg;
      } else if (!shownFromCache) {
        const msg = e?.message || 'Network error';
        statusEl.innerHTML = `<span style="color:var(--danger, #b00);">Error:</span> ${escapeHtml(
          msg
        )}`;
      } else {
        const when = cached?.fetchedAt ?? null;
        const extra = navigator.onLine ? 'Server unreachable' : 'Offline';
        statusEl.textContent = `${extra}: showing cached copy${
          when ? ` from ${fmtClock(when)} (${fmtAgo(when)})` : ''
        }`;
      }
    }

    function paint(d, editable) {
      const cs = d.callsign || callsign;

      // npub source: if own, take from config/localStorage; else from API
      const npubOwn = (localStorage.getItem('pubkey') || '').trim();
      if (editable) d.npub = npubOwn || d.npub || '';

      const lastUpd = d.lastUpdated ?? d.updated ?? null;
      const firstSeen = d.firstTimeSeen ?? null;

      const label = (txt) =>
        `<span style="color:var(--muted,#666);">${escapeHtml(txt)}</span>`;
      const row = (labelText, valueHtml) => `
        <tr>
          <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee); width: 200px;">${label(
            labelText
          )}</td>
          <td style="padding:8px 10px; border-bottom:1px solid var(--border, #eee);">${valueHtml}</td>
        </tr>
      `;
      const inputText = (id, val, placeholder = '') =>
        `<input id="${id}" type="text" class="styled-input" value="${escapeHtml(
          val || ''
        )}" placeholder="${escapeHtml(placeholder)}" style="width:100%;">`;
      const textarea = (id, val, placeholder = '') =>
        `<textarea id="${id}" class="styled-input" placeholder="${escapeHtml(
          placeholder
        )}" style="width:100%; min-height:90px;">${escapeHtml(
          val || ''
        )}</textarea>`;
      const select = (id, options, current) => `
        <select id="${id}" class="styled-input" style="width:100%;">
          ${options
            .map(
              (opt) =>
                `<option value="${escapeHtml(opt)}"${
                  String(current).toUpperCase() === opt ? ' selected' : ''
                }>${escapeHtml(opt)}</option>`
            )
            .join('')}
        </select>
      `;

      const nameCell = editable
        ? inputText('pf-edit-name', d.name, 'Your display name')
        : escapeHtml(d.name || '');
      const npubCell = `<code style="word-break:break-all;">${escapeHtml(
        editable ? (localStorage.getItem('pubkey') || '').trim() : d.npub || ''
      )}</code>`;
      const descCell = editable
        ? textarea(
            'pf-edit-description',
            d.description,
            'Describe yourself, device or place…'
          )
        : escapeHtml(d.description || '');

      const typeOptions = ['PERSON', 'DEVICE', 'STATION'];
      const visOptions = ['PUBLIC', 'PRIVATE'];
      const profileTypeValue = String(d.profileType || 'PERSON').toUpperCase();
      const profileVisibilityValue = String(
        d.profileVisibility || 'PUBLIC'
      ).toUpperCase();

      const typeCell = editable
        ? select('pf-edit-type', typeOptions, profileTypeValue)
        : escapeHtml(profileTypeValue);
      const visibilityCell = editable
        ? select('pf-edit-visibility', visOptions, profileVisibilityValue)
        : escapeHtml(profileVisibilityValue);

      const rowsHtml = [
        row('Name', nameCell),
        row('NPUB', npubCell),
        row('Description', descCell),
        row(
          'Messages Archived',
          d.messagesArchived != null && d.messagesArchived !== ''
            ? escapeHtml(String(d.messagesArchived))
            : '—'
        ),
        row(
          'Last Updated',
          lastUpd != null && lastUpd !== ''
            ? `${escapeHtml(fmtClock(lastUpd))} (${escapeHtml(fmtAgo(lastUpd))})`
            : '—'
        ),
        row(
          'First Time Seen',
          firstSeen != null && firstSeen !== ''
            ? `${escapeHtml(fmtClock(firstSeen))} (${escapeHtml(fmtAgo(firstSeen))})`
            : '—'
        ),
        row('Profile Type', typeCell),
        row('Profile Visibility', visibilityCell)
      ].join('');

      detailsEl.style.display = '';
      detailsEl.innerHTML = `
        <table class="nm-table" style="width:100%; border-collapse:collapse;">
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      // SUMMARY: image + text (no placeholder when none)
      const imgSrc = pendingAvatarDataUrl || d.avatar || '';
      const showImage = !!imgSrc;
      const showChooser = editable;

      let leftBlocks = '';
      if (showImage) {
        leftBlocks += `
          <div id="pf-avatar-slot" style="flex:0 0 auto;">
            <img id="pf-avatar-preview" src="${escapeHtml(
              imgSrc
            )}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px var(--border,#ddd);">
          </div>`;
      } else if (editable) {
        leftBlocks += `<div id="pf-avatar-slot" style="display:none;"></div>`;
      }

      const chooserBlock = showChooser
        ? `
        <div style="display:flex; flex-direction:column; align-items:flex-start;">
          <label for="pf-avatar-file" style="font-weight:600; margin-bottom:6px;">Choose a profile picture</label>
          <input id="pf-avatar-file" type="file" accept="image/*" class="styled-input" style="width:280px;">
        </div>
      `
        : ``;

      const textBlock = `
        <div style="flex:1; min-width:240px;">
          ${d.name ? `<div style="font-size:1.05em; font-weight:600;">${escapeHtml(d.name)}</div>` : ''}
          ${d.description ? `<div style="opacity:.85; margin-top:4px;">${escapeHtml(d.description)}</div>` : ''}
        </div>
      `;

      const blocks = [leftBlocks, chooserBlock, textBlock]
        .filter(Boolean)
        .join('');

      if (blocks.trim()) {
        summaryEl.style.display = '';
        summaryEl.innerHTML = `
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            ${blocks}
          </div>
        `;
      } else {
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
      }

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
                const parent = fileEl.closest('div.card') || summaryEl;
                slot = document.createElement('div');
                slot.id = 'pf-avatar-slot';
                if (fileEl.parentElement && fileEl.parentElement.parentElement) {
                  fileEl.parentElement.parentElement.insertAdjacentElement(
                    'beforebegin',
                    slot
                  );
                } else {
                  summaryEl.firstElementChild?.insertAdjacentElement(
                    'afterbegin',
                    slot
                  );
                }
              }
              slot.style.display = '';
              slot.innerHTML = `
                <img id="pf-avatar-preview" src="${escapeHtml(
                  dataUrl
                )}" alt=""
                     style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px var(--border,#ddd);">
              `;
            } catch (err) {
              console.warn('Avatar preview failed:', err);
            }
          });
        }
      }

      // Associated
      const assoc = Array.isArray(d.profilesAssociated)
        ? d.profilesAssociated
        : [];
      if (assoc.length) {
        $('#pf-associated').style.display = '';
        assocList.innerHTML = assoc
          .map((item) => {
            let cs2 = '',
              ds = '';
            if (typeof item === 'string') cs2 = item;
            else if (item && typeof item === 'object') {
              cs2 = item.callsign || '';
              if (item.dateStarted != null)
                ds = ` — since ${fmtClock(item.dateStarted)} (${fmtAgo(
                  item.dateStarted
                )})`;
            }
            return `<li><a href="#profile:${encodeURIComponent(
              cs2
            )}">${escapeHtml(cs2)}</a>${escapeHtml(ds)}</li>`;
          })
          .join('');
      } else {
        $('#pf-associated').style.display = 'none';
        assocList.innerHTML = '';
      }

      // Save (POST with Nostr-signed event)
      saveBtn.style.display = editable ? '' : 'none';
      saveStatus.textContent = '';
      if (editable && !saveBtn._wired) {
        saveBtn._wired = true;
        saveBtn.addEventListener('click', async () => {
          saveStatus.textContent = 'Saving…';
          try {
            const profile = {
              name: $('#pf-edit-name')?.value?.trim() || '',
              description: $('#pf-edit-description')?.value?.trim() || '',
              profileType: ($('#pf-edit-type')?.value || 'PERSON').toUpperCase(),
              profileVisibility: (
                $('#pf-edit-visibility')?.value || 'PUBLIC'
              ).toUpperCase()
            };

            // Include avatar if changed
            if (pendingAvatarDataUrl) {
              profile.avatarDataUrl = pendingAvatarDataUrl;
            }

            // Build the signed NOSTR event
            const signedEvent = await buildSignedEventForProfileEdit(cs, profile);

            // Send to the new endpoint
            const res = await fetch(nostrUrl(), {
              method: 'POST',
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signedEvent)
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok || (json && json.value && json.value !== 200)) {
              const msg =
                (json && (json.comment || json.error)) ||
                `HTTP ${res.status}`;
              throw new Error(msg);
            }

            saveStatus.textContent = 'Saved.';
            // refresh cache by grabbing live again
            try {
              const fresh = await fetchJSON(cs);
              writeCache(cacheKeyFor(cs), fresh);
              const norm = normalizeProfileData(fresh, cs);
              paint(norm, true);
              statusEl.textContent = `Live data • Updated ${fmtClock(Date.now())}`;
            } catch {
              /* ignore refresh error */
            }
          } catch (err) {
            console.error('Save failed:', err);
            saveStatus.textContent = `Save failed: ${err.message || err}`;
          }
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
    } catch {
      /* ignore */
    }
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