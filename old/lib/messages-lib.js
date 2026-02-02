/*
 * messages-lib.js
 * Thin client for NOSTR-backed messaging endpoints.
 * Exposes:
 *   - window.MessagesLib.messages_list(callsign, options)
 *   - window.MessagesLib.messages_get(callsign, peer, options)
 *
 * Requirements:
 *  - nostr.bundle.js must be loaded first (provides NostrTools with nip19, nip98, finalizeEvent, utils).
 *
 * Notes:
 *  - The request body is a signed Nostr event (NIP-01), and the Authorization header
 *    is a NIP-98 token that signs URL, method, and a hash of the body payload.
 */
(function(global){
  const DEFAULT_ENDPOINT = 'http://localhost:8080/nostr';
  const DEFAULT_KIND = 30000;
  const DEFAULT_PATH = '/';

  function nowSec(){ return Math.floor(Date.now()/1000); }

  function toSecretBytes(nsecOrHex){
    if (!nsecOrHex) throw new Error('Missing secret key (nsec or hex).');
    try {
      if (typeof nsecOrHex === 'string' && nsecOrHex.startsWith('nsec1')){
        const decoded = NostrTools.nip19.decode(nsecOrHex);
        return decoded.data; // Uint8Array(32)
      }
      // Assume hex
      return NostrTools.utils.hexToBytes(nsecOrHex);
    } catch(e){
      throw new Error('Invalid secret key. Expecting nsec1... or 64-hex. ' + e.message);
    }
  }

  function ensureNostr(){
    if (!global.NostrTools) throw new Error('NostrTools not found. Load nostr.bundle.js before messages-lib.js');
  }

  async function postSignedEvent(endpoint, unsigned, sk){
    const signer = (evt) => NostrTools.finalizeEvent(evt, sk);
    const bodyEvent = signer(unsigned);

    const token = await NostrTools.nip98.getToken(
      endpoint,
      'POST',
      signer,
      true,
      bodyEvent
    );

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(bodyEvent)
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch(e){ throw new Error('Server did not return JSON: ' + text); }
    return json;
  }

  /**
   * messages_list
   * @param {string} callsign - The caller's callsign.
   * @param {object} options
   * @param {string} [options.endpoint] - HTTP endpoint (default http://localhost:8080/nostr).
   * @param {string} [options.secret] - nsec (bech32) or 64-hex secret.
   * @param {number} [options.kind] - Nostr event kind (default 30000).
   * @param {string} [options.path] - Logical path in content JSON (default '/').
   * @returns {Promise<object>} - e.g. { result: "OK", content: "X1;X2;...", content_list: ["X1","X2"] }
   */
  async function messages_list(callsign, options = {}){
    ensureNostr();
    if (!callsign || typeof callsign !== 'string') throw new Error('callsign is required');

    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const kind = (typeof options.kind === 'number') ? options.kind : DEFAULT_KIND;
    const path = (typeof options.path === 'string' && options.path) ? options.path : DEFAULT_PATH;
    const sk = toSecretBytes(options.secret);

    const unsigned = {
      kind,
      created_at: nowSec(),
      tags: [
        ['client', 'geogram-proto']
      ],
      content: JSON.stringify({ action: 'messages_list', callsign, path })
    };

    const json = await postSignedEvent(endpoint, unsigned, sk);

    if (json && typeof json.content === 'string'){
      const arr = json.content.split(';').map(s => s.trim()).filter(Boolean);
      json.content_list = arr;
    }
    return json;
  }

  /**
   * messages_get
   * @param {string} callsign - The caller's callsign.
   * @param {string} peer - The other party's callsign (used to build /messages/<peer>-chat.md).
   * @param {object} options
   * @param {string} [options.endpoint] - HTTP endpoint (default http://localhost:8080/nostr).
   * @param {string} [options.secret] - nsec (bech32) or 64-hex secret.
   * @param {number} [options.kind] - Nostr event kind (default 30000).
   * @param {string} [options.path] - Optional override for the path. If omitted, auto = `/messages/${peer}-chat.md`.
   * @returns {Promise<object>} - Server JSON (e.g., { result: "OK", path, callsign, action, npub, content })
   */
  async function messages_get(callsign, peer, options = {}){
    ensureNostr();
    if (!callsign || typeof callsign !== 'string') throw new Error('callsign is required');
    if (!peer || typeof peer !== 'string') throw new Error('peer is required');

    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const kind = (typeof options.kind === 'number') ? options.kind : DEFAULT_KIND;
    const path = (typeof options.path === 'string' && options.path) ? options.path : `/messages/${peer}-chat.md`;
    const sk = toSecretBytes(options.secret);

    const unsigned = {
      kind,
      created_at: nowSec(),
      tags: [
        ['client', 'geogram-proto']
      ],
      content: JSON.stringify({ action: 'messages_get', callsign, path })
    };

    const json = await postSignedEvent(endpoint, unsigned, sk);
    return json;
  }

  const api = { messages_list, messages_get };

  // UMD-ish export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.MessagesLib = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
