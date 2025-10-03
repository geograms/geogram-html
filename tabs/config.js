// tabs/config.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column nav-column">
      <div class="card">
        <h2>Sections</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#user" class="nav-link">User</a></li>
           <!-- 
          <li><a href="#locations" class="nav-link">Locations</a></li>
          -->
          <li><a href="#customization" class="nav-link">Customization</a></li>
        </ul>
        <button id="reset-settings" class="reset-button">Reset to Default</button>
      </div>
    </div>

    <div class="right-column content-column">
      <div id="user">
        <h2>User</h2>
        <div class="card">
          <div style="display: flex; flex-direction: column; gap: 1em;">

<div>
  <label for="username" style="display: block; margin-bottom: 0.25em;">Geogram Id / Call Sign</label>
  <div style="display: flex; gap: 0.5em;">
    <input type="text" id="username" class="styled-select" maxlength="30" style="flex: 1;" />
    <button id="generate-callsign" class="reset-button" style="margin-top: 0">Generate Id</button>
  </div>
  <small>Name shown to others in chats.</small>
</div>

<div>
  <label for="privkey" style="display: block; margin-bottom: 0.25em;">NOSTR Private Key</label>
  <div style="display: flex; gap: 0.5em;">
    <input type="text" id="privkey" class="styled-select" maxlength="64" style="flex: 1;" />
    <button id="generate-key" class="reset-button" style="margin-top: 0">Generate Key</button>
  </div>
  <small>Used to sign messages, you can either use yours or generate a new one — keep this private.</small>
</div>

<div style="margin-bottom: 2em;">
  <label for="pubkey" style="display: block; margin-bottom: 0.25em;">NOSTR Public Key (read-only)</label>
  <input type="text" id="pubkey" class="styled-select" maxlength="64" style="width: 100%;" readonly />
  <small>Pubic identifier of your profile on NOSTR — can be shared.</small>
</div>

          </div>
        </div>
      </div>

      <!-- 
      <div id="locations" style="margin-bottom: 4em;">
        <h2>Locations of interest</h2>
        <div class="card">
          <div style="display: flex; flex-direction: column; gap: 1em;">

            <div style="margin-bottom: 4em;">
              <label>Coordinates</label>
              <div style="display: grid; grid-template-columns: 2fr 2fr 1fr auto auto; gap: 0.5em; margin-top: 0.5em; align-items: center;">
                <input type="text" id="location-label" class="styled-select" placeholder="Label (required)" />
                <input type="text" id="location-coords" class="styled-select" placeholder="Latitude, Longitude" />
                <input type="number" id="location-radius" value="50" class="styled-select" placeholder="Radius (km)" min="1" />
                <button id="get-coords" class="reset-button" style="margin-top: 0">Use My Current Location</button>
                <button id="add-location" class="reset-button" style="margin-top: 0">Add Location</button>
              </div>
              <small style="display: block; margin-top: 0.5em;">Add specific locations with radius for alerts. Labels are required and editable.</small>

              <table class="styled-table" style="margin-top: 0.5em; width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Label</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Coordinates</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Radius (km)</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Actions</th>
                  </tr>
                </thead>
                <tbody id="location-table">
                </tbody>
              </table>
            </div>

          </div>
          -->

          <div id="customization">
            <h2>Customization</h2>
            <div class="card">
              <div style="display: flex; flex-direction: column; gap: 1em; margin-bottom: 2em">
                <label for="theme-select">Color Theme</label>
                <div class="custom-select-wrapper">
                  <select id="theme-select" class="styled-select">
                    <option value="blue">Low-light Blue</option>
                    <option value="monster">Monster Energy</option>
                    <option value="red">Red Alert</option>
                    <option value="yellow">Bruce Lee</option>
                    <option value="evangelion">Evangelion</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label for="brand-text">Header Text</label>
              <input type="text" id="brand-text" class="styled-select" maxlength="20" 
                     value="GEOGRAM" style="width: 100%;">
              <small style="display: block; margin-top: 0.5em;">Custom text to display next to logo</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  //setupAnchorNavigation("config");

  // Theme selection
  const currentTheme = localStorage.getItem('theme') || 'green';
  document.getElementById('theme-select').value = currentTheme;
  applyTheme(currentTheme);
  document.getElementById('theme-select').addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  });

  // Brand text input
  const brandTextInput = document.getElementById('brand-text');
  const savedBrandText = localStorage.getItem('brandText');
  if (savedBrandText) {
    brandTextInput.value = savedBrandText;
    updateBrandText(savedBrandText);
  }
  brandTextInput.addEventListener('input', (e) => {
    const text = e.target.value.trim();//.toUpperCase();
    localStorage.setItem('brandText', text);
    updateBrandText(text);
  });
  function updateBrandText(text) {
    const brandElement = document.querySelector('.radio-brand');
    if (brandElement) {
      brandElement.textContent = text || 'GEOGRAM';
    }
  }

  // Reset button
  document.getElementById('reset-settings').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
  });

  // User data inputs
  const inputs = ["privkey", "pubkey", "username"];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    const saved = localStorage.getItem(id);
    if (saved) el.value = saved;
    el.addEventListener("input", () => {
      localStorage.setItem(id, el.value);
    });
  });

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

  // Generate a normal Nostr keypair and set callsign from npub
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
    document.getElementById('privkey').value = nsec;
    document.getElementById('pubkey').value = npub;

    localStorage.setItem('privkey', nsec);
    localStorage.setItem('pubkey', npub);

    // Derive and set callsign from npub
    const callsign = deriveCallsignFromNpub(npub);
    const callsignInput = document.getElementById('username');
    callsignInput.value = callsign;
    localStorage.setItem('username', callsign);
  }

  // For completeness: recompute callsign from existing npub (no regen)
  function recomputeCallsignFromExistingNpub() {
    const npub = document.getElementById('pubkey').value.trim() || localStorage.getItem('pubkey') || '';
    if (!npub) return;
    const callsign = deriveCallsignFromNpub(npub);
    document.getElementById('username').value = callsign;
    localStorage.setItem('username', callsign);
  }

  // Buttons
  document.getElementById('generate-callsign').addEventListener('click', () => {
    // Create a normal pair, then set callsign = X1 + first 4 after 'npub1'
    generateNewNostrAndCallsign();
  });

  document.getElementById('generate-key').addEventListener('click', () => {
    // Keep keys + callsign in sync
    generateNewNostrAndCallsign();
  });

  // Auto-generate values if first visit and fields are empty
  const username = localStorage.getItem('username');
  const privkey = localStorage.getItem('privkey');
  const pubkey = localStorage.getItem('pubkey');
  if ((!username || username.trim() === '') && (!privkey || privkey.trim() === '') && (!pubkey || pubkey.trim() === '')) {
    generateNewNostrAndCallsign();
  } else if (username && (!username.startsWith('X1') || username.length < 6)) {
    // keep old keys but ensure callsign matches new scheme
    recomputeCallsignFromExistingNpub();
  }
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}
