

  // --- Callsign derivation helpers ---
  function extractNpubData(npub) {
    if (!npub) return '';
    // Get the bech32 data part after 'npub1'
    const m = npub.toLowerCase().match(/^npub1([0-9a-z]+)$/);
    return m ? m[1] : '';
  }
  function deriveCallsignFromNpub(npub) {
    const data = extractNpubData(npub);
    const suffix = (data.slice(0, 4) || 'XXXX').toUpperCase(); // fallback if anything odd
    return `X1${suffix}`;
  }

function getChatIdentityFromCache() {
  
  // Flat-string fallbacks
  const npub = localStorage.getItem("pubkey");
  const nsec = localStorage.getItem("privkey");
  const callsign = localStorage.getItem("username");

  return { npub, nsec, callsign };
}

/*
 * Generate a Nostr keypair and save to localStorage
 * Callsign is derived from npub as X1 + first 4 chars after 'npub1'
 */
function generateNewNostrAndCallsign() {
    if (!window.NostrTools) {
      alert("Nostr library not loaded.");
      return;
    }

    function bytesToHex(bytes) {
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const privateKeyBytes = window.NostrTools.generateSecretKey();
    const privateKeyHex = bytesToHex(privateKeyBytes);
    const publicKeyHex = window.NostrTools.getPublicKey(privateKeyHex);

    const nsec = window.NostrTools.nip19.nsecEncode(privateKeyBytes);
    const npub = window.NostrTools.nip19.npubEncode(publicKeyHex);

    // Fill fields
    if (document.getElementById('privkey') && document.getElementById('pubkey')) {
      document.getElementById('privkey').value = nsec;
      document.getElementById('pubkey').value = npub;
    }

    localStorage.setItem('privkey', nsec);
    localStorage.setItem('pubkey', npub);

    // Derive and set callsign from npub
    const callsign = deriveCallsignFromNpub(npub);
    if (document.getElementById('username')) {
      const callsignInput = document.getElementById('username');
      callsignInput.value = callsign;
    }
    localStorage.setItem('username', callsign);
  }