/* chat.js — Geogram Nearby chat over NOSTR
 *
 * 1) Toggle environment with a single flag:
 *      - debug = true  → DEV  → http://localhost:8080/nostr
 *      - debug = false → PROD → https://api.geogram.radio/nostr
 * 2) This file assumes nostr.bundle.js has already loaded and exposes window.NostrTools.
 * 3) Zero/low-touch integration: it binds to #chatMessages, #chatInput, #sendChatBtn, #radiusInput, #locateBtn.
 * 4) DEDUP FIX: readMessages() now de-duplicates by (author|timestamp|content) and prevents double-binding and double-render.
 */

const debug = true; // ← set false for production
const NOSTR_ENDPOINT = debug
  ? "http://localhost:8080/nostr"
  : "https://api.geogram.radio/nostr";

/* -------- Singleton guard to avoid multiple initializations (and duplicates) ----- */
if (!window.__GeogramChatInitialized) {
  window.__GeogramChatInitialized = true;

  (function () {
    // ---- Nostr helpers -------------------------------------------------------
    const { finalizeEvent, nip19 } = (window.NostrTools || {});
    if (debug) console.debug("[chat] NOSTR endpoint:", NOSTR_ENDPOINT);

    function getChatIdentityFromCache() {
      const npub = localStorage.getItem("pubkey");
      const nsec = localStorage.getItem("privkey");
      const callsign = localStorage.getItem("username");
      return { npub, nsec, callsign };
    }

    function getGeoFromCacheOrUI() {
      const lat = parseFloat(localStorage.getItem("nearby.lat"));
      const lon = parseFloat(localStorage.getItem("nearby.lng"));
      const radiusLS = parseInt(localStorage.getItem("nearby.radius") || "", 10);
      const radiusUI = parseInt((document.getElementById("radiusInput") || {}).value || "100", 10);

      const radius = Number.isFinite(radiusLS) ? radiusLS : (Number.isFinite(radiusUI) ? radiusUI : 100);
      return {
        lat: Number.isFinite(lat) ? lat : 40.2056,
        lon: Number.isFinite(lon) ? lon : -8.4137,
        radius
      };
    }

    function setGeoCache(lat, lon, radius) {
      if (Number.isFinite(lat))   localStorage.setItem("nearby.lat", String(lat));
      if (Number.isFinite(lon))   localStorage.setItem("nearby.lng", String(lon));
      if (Number.isFinite(radius)) localStorage.setItem("nearby.radius", String(radius));
    }

    function nowSec() { return Math.floor(Date.now() / 1000); }

    function ensureHexPriv(nsecOrHex) {
      if (!nsecOrHex) return null;
      const trimmed = nsecOrHex.trim();
      if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
      if (trimmed.startsWith("nsec")) {
        try {
          const decoded = nip19.decode(trimmed);
          if (decoded?.data instanceof Uint8Array) {
            return Array.from(decoded.data).map(b => b.toString(16).padStart(2, "0")).join("");
          }
          if (typeof decoded?.data === "string") return decoded.data.toLowerCase();
        } catch { /* ignore */ }
      }
      return null;
    }

    function buildEvent({ content }) {
      const { lat, lon } = getGeoFromCacheOrUI();
      return {
        kind: 1,
        created_at: nowSec(),
        tags: [
          ["app", "geogram-web"],
          ["g", `geo:${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`]
        ],
        content: JSON.stringify(content || {})
      };
    }

    async function signEvent(evt) {
      const { nsec } = getChatIdentityFromCache();
      const sk = ensureHexPriv(nsec);
      if (!finalizeEvent || !sk) {
        throw new Error("Missing NostrTools.finalizeEvent or private key (privkey/nsec) in localStorage.");
      }
      return finalizeEvent(evt, sk);
    }

    async function postNostrEvent(evt) {
      const res = await fetch(NOSTR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }
      return res.json();
    }

    // ---- DOM helpers ---------------------------------------------------------
    function getChatDiv() { return document.getElementById("chatMessages"); }

    function escapeHtml(s) {
      return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }

    function formatTs(tsStr) {
      if (typeof tsStr === "string" && tsStr.length >= 10) return tsStr;
      return new Date().toISOString().replace("T", " ").replace("Z", "").replace(/\.\d{3}/, "");
    }

    function appendMessage({ text, timestamp, outgoing, pendingId = null }) {
      const container = getChatDiv();
      if (!container) return;

      const alignment = outgoing ? "flex-end" : "flex-start";
      const bubbleBg = outgoing ? "#222" : "#111";
      const textColor = outgoing ? "#fff" : "var(--text)";

      const wrapper = document.createElement("div");
      wrapper.className = "chat-message";
      wrapper.style.marginBottom = "12px";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = alignment;
      if (pendingId) wrapper.dataset.pendingId = pendingId;

      wrapper.innerHTML = `
        <div style="background:${bubbleBg};color:${textColor};padding:10px 14px;border-radius:14px;max-width:70%; align-self:${alignment};font-size:0.9em;">
          ${escapeHtml(text)}
          <div style="font-size:0.6em;color:var(--muted,#888);margin-top:3px;text-align:right; width:100%;">${timestamp}</div>
        </div>
      `;
      container.appendChild(wrapper);
      container.scrollTop = container.scrollHeight;
    }

    function removePendingBubble(pendingId) {
      if (!pendingId) return;
      const container = getChatDiv();
      if (!container) return;
      const el = container.querySelector(`.chat-message[data-pending-id="${CSS.escape(pendingId)}"]`);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ---- De-duplication + state ---------------------------------------------
    // key = AUTHOR|TIMESTAMP|CONTENT (normalized)
    function keyForMessage(author, timestamp, content) {
      const a = (author || "").trim().toUpperCase();
      const t = (timestamp || "").trim();
      const c = (content || "").trim().replace(/\s+/g, " ");
      return `${a}|${t}|${c}`;
    }

    // Set of keys that are already rendered
    const renderedKeys = new Set();
    // Pending optimistic messages: { id, author, content, tsLocal }
    const pending = new Map(); // id -> record

    // Only one read at a time; ignore stale results
    let readSeq = 0;

    // ---- Network ops ---------------------------------------------------------
    async function readMessages() {
      const chatEl = getChatDiv();
      if (!chatEl) return;

      const seq = ++readSeq;
      const { callsign } = getChatIdentityFromCache();
      const { radius } = getGeoFromCacheOrUI();

      const payload = {
        action: "chat_read",
        callsign: callsign || "UNKNOWN",
        path: "/",
        message: "",
        radius: String(radius)
      };

      const evt = buildEvent({ content: payload });
      const signed = await signEvent(evt);
      const json = await postNostrEvent(signed);

      if (seq !== readSeq) return; // a newer read finished; drop this result

      const details = Array.isArray(json?.details) ? json.details : [];

      // Build a unique, sorted list (if server returns duplicates)
      const unique = [];
      const seen = new Set();
      for (const d of details) {
        const k = keyForMessage(d?.author, d?.timestamp, d?.content);
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(d);
      }

      // FULL RECONCILE: Clear UI and re-render only unique server messages
      chatEl.innerHTML = "";
      renderedKeys.clear();

      // If any of these match an optimistic pending (same author+content), drop the pending bubble
      for (const d of unique) {
        const a = (d?.author || "").trim();
        const c = (d?.content || "").trim();
        for (const [pid, p] of pending) {
          if (p.author.toUpperCase() === a.toUpperCase() && p.content.trim() === c) {
            removePendingBubble(pid);
            pending.delete(pid);
          }
        }
      }

      for (const d of unique) {
        const k = keyForMessage(d?.author, d?.timestamp, d?.content);
        if (renderedKeys.has(k)) continue;
        renderedKeys.add(k);

        appendMessage({
          text: d?.content ?? "",
          timestamp: formatTs(d?.timestamp),
          outgoing: (d?.author || "").toUpperCase() === (callsign || "").toUpperCase()
        });
      }

      if (debug) console.debug(`[chat] readMessages(): rendered ${unique.length} messages (seq ${seq})`);
    }

    async function writeMessage(text) {
      const { callsign } = getChatIdentityFromCache();

      const payload = {
        action: "chat_write",
        callsign: callsign || "UNKNOWN",
        path: "/",
        message: text
      };

      const evt = buildEvent({ content: payload });
      const signed = await signEvent(evt);
      return postNostrEvent(signed);
    }

    // ---- Handlers ------------------------------------------------------------
    async function onSendClick() {
      const input = document.getElementById("chatInput");
      if (!input) return;
      const text = (input.value || "").trim();
      if (!text) return;

      const { callsign } = getChatIdentityFromCache();

      // Optimistic bubble with a pending id (so we can replace it)
      const pendingId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      pending.set(pendingId, { id: pendingId, author: callsign || "UNKNOWN", content: text, tsLocal: Date.now() });

      const tsLocal = new Date().toISOString().replace("T", " ").replace("Z", "").replace(/\.\d{3}/, "");
      appendMessage({ text, timestamp: tsLocal, outgoing: true, pendingId });
      input.value = "";

      try {
        const res = await writeMessage(text);
        if (res?.result !== "OK") {
          throw new Error(typeof res?.details === "string" ? res.details : "Write failed");
        }
        // After a successful write, force a fresh read that will replace/remove optimistic bubble(s)
        readMessages().catch(() => {});
      } catch (err) {
        removePendingBubble(pendingId);
        pending.delete(pendingId);
        const ts = new Date().toISOString().replace("T", " ").replace("Z", "").replace(/\.\d{3}/, "");
        appendMessage({ text: `⚠️ Send failed: ${err.message}`, timestamp: ts, outgoing: false });
      }
    }

    function bindUI() {
      // Prevent double-binding if chat.js is hot-reloaded
      const sendBtn = document.getElementById("sendChatBtn");
      const input = document.getElementById("chatInput");
      const radiusInput = document.getElementById("radiusInput");
      const locateBtn = document.getElementById("locateBtn");

      if (sendBtn) {
        sendBtn.onclick = null;
        sendBtn.addEventListener("click", onSendClick, { once: false });
      }
      if (input) {
        input.onkeydown = null;
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSendClick();
          }
        }, { once: false });
      }
      if (radiusInput) {
        radiusInput.oninput = null;
        radiusInput.addEventListener("input", () => {
          const r = parseInt(radiusInput.value || "100", 10);
          const { lat, lon } = getGeoFromCacheOrUI();
          setGeoCache(lat, lon, r);
          // Refresh messages when radius changes
          readMessages().catch(console.warn);
        }, { once: false });
      }
      if (locateBtn) {
        locateBtn.onclick = null;
        locateBtn.addEventListener("click", () => {
          // Mirror geolocation into cache shortly after nearby.js updates map
          setTimeout(() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                pos => setGeoCache(pos.coords.latitude, pos.coords.longitude, getGeoFromCacheOrUI().radius),
                () => {}
              );
            }
          }, 1200);
        }, { once: false });
      }
    }

    // ---- Bootstrap -----------------------------------------------------------
    function ready(fn) {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 0);
      } else {
        document.addEventListener("DOMContentLoaded", fn, { once: true });
      }
    }

    ready(() => {
      setTimeout(() => {
        bindUI();
        // Initial radius cache sync
        const rEl = document.getElementById("radiusInput");
        if (rEl) {
          const r = parseInt(rEl.value || "100", 10);
          const g = getGeoFromCacheOrUI();
          setGeoCache(g.lat, g.lon, r);
        }
        // Initial load
        readMessages().catch(err => {
          const div = getChatDiv();
          if (div) {
            appendMessage({
              text: `⚠️ Load failed: ${err.message}`,
              timestamp: new Date().toISOString(),
              outgoing: false
            });
          }
        });
      }, 300);
    });

    // ---- Public API ----------------------------------------------------------
    window.GeogramChat = {
      refresh: () => readMessages().catch(console.warn),
      write: (msg) => writeMessage(msg)
    };
  })();
}
