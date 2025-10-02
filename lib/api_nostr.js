/*
API supported here:
- createChatWriteNote
- createChatReadNote
- chatWrite({ event, baseUrl })
- chatRead({ event, baseUrl })
*/

// ---------- Shared helpers ----------
const _logOn = true;
const _log = (...a) => { if (_logOn) console.log("[api_nostr]", ...a); };
const _safeJSON = async (res) => { try { return await res.json(); } catch { return null; } };
const _headers = { "content-type": "application/json" };

// ---------- Generic Nostr kind-1 builder (kept from your version) ----------
// Assumes window.NostrTools is available (from nostr.bundle.js)
export async function createNostrNote({
  nsec, npub, content, tags = [], created_at
} = {}) {
  const { nip19, getPublicKey, finalizeEvent, validateEvent, verifyEvent, utils } = NostrTools;

  const toHex = (d) => {
    if (!d) return undefined;
    if (/^[0-9a-f]{64}$/i.test(d)) return d.toLowerCase();
    const { data } = nip19.decode(d);
    return typeof data === 'string' ? data : utils.bytesToHex(data);
  };

  const sk = toHex(nsec);
  let pubkey = toHex(npub);
  if (!sk && !pubkey) throw new Error('Provide at least nsec or npub');
  if (sk && !pubkey) pubkey = getPublicKey(sk);

  const normTags = tags.map(t => Array.isArray(t) ? t.map(String) : [String(t)]);

  const unsignedEvent = {
    kind: 1,
    created_at: Number.isFinite(created_at) ? Math.floor(created_at) : Math.floor(Date.now()/1000),
    tags: normTags,
    content: content,
    pubkey
  };

  const event = sk ? finalizeEvent(unsignedEvent, sk) : unsignedEvent;

  if (!validateEvent(event)) throw new Error('Event failed Nostr schema validation');
  if (sk && !verifyEvent(event)) throw new Error('Signature verification failed');

  return event;
}

// ---------- Specific builders ----------
export function createChatWriteNote({
  nsec, npub, callsign, lat, lon, message, created_at, app = "geogram-web", path = "/"
} = {}) {
  const { nip19, utils, getPublicKey, finalizeEvent, validateEvent, verifyEvent } = NostrTools;

  const toHex = (val) => {
    if (!val) return undefined;
    if (/^[0-9a-f]{64}$/i.test(val)) return val.toLowerCase();
    const dec = nip19.decode(val);
    const bytes = typeof dec.data === "string" ? NostrTools.utils.hexToBytes(dec.data) : dec.data;
    return utils.bytesToHex(bytes);
  };

  const sk = toHex(nsec);
  if (!sk) throw new Error("nsec is required to sign a valid Nostr note");

  const pubFromSk = getPublicKey(sk);
  const pubInput = toHex(npub);
  if (pubInput && pubInput !== pubFromSk) throw new Error("Provided npub does not match the nsec-derived pubkey");

  const tags = [
    ["app", String(app)],
    ["g", `geo:${lat},${lon}`]
  ];

  const contentObj = { action: "chat_write", callsign: String(callsign), path: String(path), message: String(message) };
  const content = JSON.stringify(contentObj);

  const unsigned = {
    kind: 1,
    created_at: Number.isFinite(created_at) ? Math.floor(created_at) : Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey: pubFromSk
  };

  const event = finalizeEvent(unsigned, sk);
  if (!validateEvent(event)) throw new Error("Event failed schema validation");
  if (!verifyEvent(event)) throw new Error("Signature verification failed");

  return event;
}

export function createChatReadNote({
  nsec, npub, callsign, lat, lon, radius, created_at, app = "geogram-web", path = "/"
} = {}) {
  if (!nsec || !npub || !callsign || lat === undefined || lon === undefined || radius === undefined) {
    throw new Error("nsec, npub, callsign, lat, lon, and radius are all required");
  }

  const { nip19, utils, getPublicKey, finalizeEvent, validateEvent, verifyEvent } = NostrTools;

  const toHex = (val) => {
    if (/^[0-9a-f]{64}$/i.test(val)) return val.toLowerCase();
    const dec = nip19.decode(val);
    const bytes = typeof dec.data === "string" ? NostrTools.utils.hexToBytes(dec.data) : dec.data;
    return utils.bytesToHex(bytes);
  };

  const sk = toHex(nsec);
  const pubInput = toHex(npub);
  if (!sk || !pubInput) throw new Error("Invalid nsec/npub; provide bech32 or 64-hex");
  const pubFromSk = getPublicKey(sk);
  if (pubInput !== pubFromSk) throw new Error("npub does not match pubkey derived from nsec");

  const tags = [
    ["app", String(app)],
    ["g", `geo:${lat},${lon}`],
  ];

  const contentObj = { action: "chat_read", callsign: String(callsign), path: String(path), radius: String(radius) };
  const content = JSON.stringify(contentObj);

  const unsigned = {
    kind: 1,
    created_at: Number.isFinite(created_at) ? Math.floor(created_at) : Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey: pubFromSk
  };

  const event = finalizeEvent(unsigned, sk);
  if (!validateEvent(event)) throw new Error("Event failed schema validation");
  if (!verifyEvent(event)) throw new Error("Signature verification failed");

  return event;
}

// ---------- Network helpers (NEW) ----------
/**
 * Try a few plausible endpoints. Returns the first successful response JSON.
 */
async function _postFirst(baseUrl, payload, endpoints) {
  const failures = [];
  for (const path of endpoints) {
    const url = `${baseUrl.replace(/\/+$/,'')}${path}`;
    try {
      _log("POST", url, payload);
      const res = await fetch(url, { method: "POST", headers: _headers, body: JSON.stringify(payload) });
      const data = await _safeJSON(res);
      if (res.ok) {
        _log("OK", url, data);
        return { ok: true, data, url };
      }
      failures.push({ url, status: res.status, data });
    } catch (e) {
      failures.push({ url, error: String(e) });
    }
  }
  _log("All endpoints failed", failures);
  return { ok: false, failures };
}

/**
 * Send a chat_write event to the backend.
 * Returns: { ok: boolean, data?, failures? }
 */
export async function chatWrite({ event, baseUrl }) {
  // If backend expects {event}, keep that payload; adjust if your API wants raw event fields.
  return _postFirst(baseUrl, { event }, ["/api/chat_write", "/chat_write", "/api/nostr"]);
}

/**
 * Execute a chat_read request.
 * Returns: { ok: boolean, messages: kind1Events[] }  (messages may be [])
 *
 * This handler also adapts servers that reply with {details:[...]} (non-Nostr),
 * converting them into synthetic kind-1 events so geochat.js can render them.
 */
export async function chatRead({ event, baseUrl }) {
  const out = await _postFirst(baseUrl, { event }, ["/api/chat_read", "/chat_read", "/api/nostr"]);
  if (!out.ok) return { ok: false, messages: [], failures: out.failures };

  // Preferred shape: { messages: [kind1Events...] }
  if (Array.isArray(out.data?.messages)) {
    return { ok: true, messages: out.data.messages };
  }

  // Fallback: adapt { details: [ { author, timestamp, content, metadata:{lat,lon} } ] }
  if (Array.isArray(out.data?.details)) {
    const synthetic = out.data.details.map((d, i) => ({
      id: `srv-${Date.now()}-${i}`,
      kind: 1,
      pubkey: "0".repeat(64),
      created_at: Math.floor(Date.parse(d.timestamp?.replace("_",":")) / 1000) || Math.floor(Date.now()/1000),
      tags: [["app","geogram-web"], ["g", `geo:${d?.metadata?.lat ?? ""},${d?.metadata?.lon ?? ""}`]],
      content: JSON.stringify({ action: "chat_write", callsign: String(d?.author ?? ""), path: "/", message: String(d?.content ?? "") })
    }));
    return { ok: true, messages: synthetic };
  }

  return { ok: true, messages: [] };
}

// ---------- Expose to window for non-module usage ----------
const apiNostrBundle = {
  createNostrNote,
  createChatWriteNote,
  createChatReadNote,
  chatWrite,
  chatRead
};
if (typeof window !== "undefined") {
  window.api_nostr = Object.assign(window.api_nostr || {}, apiNostrBundle);
}
