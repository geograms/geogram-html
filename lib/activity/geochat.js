/*
  geochat.js — Nostr geochat UI/data layer
  - Uses window.api_nostr.* (from api_nostr.js)
  - Caches messages
  - Polls periodically, appends new to bottom, cap 1000
  - Strong console logging for sends/reads
*/

export const GEOCHAT_DEBUG = true; // toggle
export const GEOCHAT_URL_DEBUG = "http://localhost:8080";
export const GEOCHAT_URL_PROD  = "https://api.geogram.radio";
export const GEOCHAT_BASE_URL  = GEOCHAT_DEBUG ? GEOCHAT_URL_DEBUG : GEOCHAT_URL_PROD;

const MAX_MESSAGES = 1000;
const DEFAULT_POLL_MS = 60_000;
const CACHE_KEY = "geochat-cache-v1";

const log  = (...a) => { if (GEOCHAT_DEBUG) console.log("[GeoChat]", ...a); };
const warn = (...a) => { if (GEOCHAT_DEBUG) console.warn("[GeoChat]", ...a); };
const err  = (...a) => { console.error("[GeoChat]", ...a); };

const safeParse = (s, d=undefined) => { try { return JSON.parse(s); } catch { return d; } };

function loadCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  const data = safeParse(raw, { messages: [] });
  if (!Array.isArray(data.messages)) data.messages = [];
  data.messages.sort((a,b) => (a.created_at||0) - (b.created_at||0));
  return data;
}
function saveCache(messages) {
  const trimmed = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ messages: trimmed }));
  return trimmed;
}
function mergeNewMessages(existing, incoming) {
  const seen = new Set(existing.map(m => m.id));
  const onlyNew = incoming.filter(m => !seen.has(m.id));
  if (!onlyNew.length) return { next: existing, added: [] };
  const next = existing.concat(onlyNew).sort((a,b) => (a.created_at||0) - (b.created_at||0));
  const over = Math.max(0, next.length - MAX_MESSAGES);
  const pruned = over ? next.slice(over) : next;
  return { next: pruned, added: onlyNew };
}

function normalizeEventToMessage(evt) {
  const content = safeParse(evt.content, {});
  const text = content?.message ?? evt.content;
  const ts = new Date((evt.created_at || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    id: evt.id,
    created_at: evt.created_at,
    pubkey: evt.pubkey,
    callsign: content?.callsign || "",
    text: String(text ?? ""),
    timestamp: ts,
    outgoing: false
  };
}

function getApi() {
  const api = (window.api_nostr ?? window.API_NOSTR ?? {});
  const { createChatWriteNote, createChatReadNote, chatWrite, chatRead, publish, request } = api;
  if (typeof createChatWriteNote !== "function" || typeof createChatReadNote !== "function") {
    throw new Error("api_nostr.js is missing createChatWriteNote/createChatReadNote");
  }
  return { createChatWriteNote, createChatReadNote, chatWrite, chatRead, publish, request };
}

async function readMessages({ nsec, npub, callsign, lat, lon, radius }) {
  const api = getApi();
  const readEvt = api.createChatReadNote({ nsec, npub, callsign, lat, lon, radius });
  log("read->event", readEvt);

  if (typeof api.chatRead === "function") {
    const res = await api.chatRead({ event: readEvt, baseUrl: GEOCHAT_BASE_URL });
    log("read<-response", res);
    const normalized = Array.isArray(res?.messages) ? res.messages.map(normalizeEventToMessage) : [];
    return { messages: normalized };
  }
  if (typeof api.request === "function") {
    const res = await api.request({ event: readEvt, baseUrl: GEOCHAT_BASE_URL });
    log("read<-response(request)", res);
    const normalized = Array.isArray(res?.messages) ? res.messages.map(normalizeEventToMessage) : [];
    return { messages: normalized };
  }
  throw new Error("api_nostr.js: no chatRead/request method available");
}

async function writeMessage({ nsec, npub, callsign, lat, lon, message }) {
  const api = getApi();
  const writeEvt = api.createChatWriteNote({ nsec, npub, callsign, lat, lon, message });
  console.log("[GeoChat] SEND", { message, lat, lon, callsign, pubkey: writeEvt.pubkey, id: writeEvt.id });

  if (typeof api.chatWrite === "function") {
    const res = await api.chatWrite({ event: writeEvt, baseUrl: GEOCHAT_BASE_URL });
    console.log("[GeoChat] SEND RESULT", res);
    if (!res?.ok) throw new Error("chatWrite failed");
    return res;
  }
  if (typeof api.publish === "function") {
    const ack = await api.publish(writeEvt, { baseUrl: GEOCHAT_BASE_URL });
    console.log("[GeoChat] PUBLISH ACK", ack);
    return { ok: true, ack };
  }
  throw new Error("api_nostr.js: no chatWrite/publish method available");
}

// -----------------------------
// GeoChat public module
// -----------------------------
export const GeoChat = (() => {
  let state = {
    npub: null,
    nsec: null,
    callsign: null,
    getLocation: null,
    getRadius: null,
    pollMs: DEFAULT_POLL_MS,
    timer: null,
    messagesEl: null,
    inputEl: null,
    sendBtnEl: null,
    onRender: null,
    messages: []
  };

  function render({ onlyAppend = null } = {}) {
    if (!state.messagesEl) return;
    const buildBubble = (m) => {
      const alignment = m.outgoing ? 'flex-end' : 'flex-start';
      const bubbleBg = m.outgoing ? '#222' : '#111';
      const textColor = m.outgoing ? '#fff' : 'var(--text)';
      return `
        <div class="chat-message" style="margin-bottom:12px; display:flex; flex-direction:column; align-items:${alignment};">
          <div style="background:${bubbleBg};color:${textColor};padding:10px 14px;border-radius:14px;max-width:70%; align-self:${alignment};font-size:0.9em;">
            ${escapeHtml(m.text)}
            <div style="font-size:0.6em;color:var(--muted,#888);margin-top:3px;text-align:right; width:100%;">${m.timestamp}</div>
          </div>
        </div>`;
    };

    if (Array.isArray(onlyAppend) && onlyAppend.length) {
      state.messagesEl.insertAdjacentHTML("beforeend", onlyAppend.map(buildBubble).join(""));
    } else {
      state.messagesEl.innerHTML = state.messages.map(buildBubble).join("");
    }
    state.messagesEl.scrollTop = state.messagesEl.scrollHeight;
    if (typeof state.onRender === "function") { try { state.onRender({ count: state.messages.length }); } catch {} }
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function hydrateFromCache() {
    const data = loadCache();
    state.messages = data.messages;
    render();
  }

  async function pollOnce() {
    if (!state.getLocation || !state.getRadius) return;
    const { lat, lon } = state.getLocation() || {};
    const radius = state.getRadius?.() ?? 100;
    if (lat == null || lon == null) return;
    if (!state.npub || !state.nsec || !state.callsign) return;

    try {
      const res = await readMessages({ nsec: state.nsec, npub: state.npub, callsign: state.callsign, lat, lon, radius });
      const incoming = res.messages || [];
      const { next, added } = mergeNewMessages(state.messages, incoming);
      if (added.length) {
        state.messages = saveCache(next);
        render({ onlyAppend: added });
        log(`poll: +${added.length} new (total ${state.messages.length})`);
      } else {
        log("poll: 0 new");
      }
    } catch (e) {
      err("poll error:", e?.message || e);
    }
  }

  async function startTimer() { stopTimer(); state.timer = setInterval(pollOnce, state.pollMs); }
  function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }

  return {
    init(opts = {}) {
      Object.assign(state, {
        npub: opts.npub,
        nsec: opts.nsec,
        callsign: opts.callsign,
        getLocation: opts.getLocation,
        getRadius: opts.getRadius,
        messagesEl: opts.messagesEl || null,
        inputEl: opts.inputEl || null,
        sendBtnEl: opts.sendBtnEl || null,
        onRender: opts.onRender || null
      });

      if (state.sendBtnEl && state.inputEl) {
        state.sendBtnEl.onclick = async () => {
          const text = state.inputEl.value.trim();
          if (!text) return;
          await this.post(text);
        };
        state.inputEl.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            state.sendBtnEl.click();
          }
        };
      }

      hydrateFromCache();
      this.refresh();
      startTimer();
      log("initialized", { baseUrl: GEOCHAT_BASE_URL, pollMs: state.pollMs });
    },

    async post(text) {
      if (!state.getLocation) return;
      const { lat, lon } = state.getLocation() || {};
      if (lat == null || lon == null) return;

      console.log("[GeoChat] USER SEND", { text, lat, lon, callsign: state.callsign });

      const outgoing = {
        id: `local-${Date.now()}`,
        created_at: Math.floor(Date.now()/1000),
        pubkey: state.npub,
        callsign: state.callsign,
        text: String(text),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        outgoing: true
      };
      const { next, added } = mergeNewMessages(state.messages, [outgoing]);
      state.messages = saveCache(next);
      render({ onlyAppend: added });

      try {
        const res = await writeMessage({ nsec: state.nsec, npub: state.npub, callsign: state.callsign, lat, lon, message: text });
        console.log("[GeoChat] USER SEND OK", res);
        state.inputEl && (state.inputEl.value = "");
      } catch (e) {
        err("send error:", e?.message || e);
      }
    },

    async refresh() { await pollOnce(); },
    configure({ pollMs } = {}) {
      if (Number.isFinite(pollMs) && pollMs > 0) {
        state.pollMs = pollMs; log("pollMs set", pollMs);
        (async () => { stopTimer(); await pollOnce(); startTimer(); })();
      }
    },
    destroy() { stopTimer(); }
  };
})();

// Expose to window for non-module usage
if (typeof window !== "undefined") {
  window.GeoChat = window.GeoChat || GeoChat;
}
