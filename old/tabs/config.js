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
          <li><a href="#backup" class="nav-link">Backup & Restore</a></li>
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

          <div id="backup" style="margin-top: 3em;">
            <h2>Backup & Restore</h2>
            <div class="card">
              <div style="display: flex; flex-direction: column; gap: 1em;">

                <div>
                  <h3 style="margin-top: 0; margin-bottom: 0.5em;">Export Backups</h3>
                  <p style="font-size: 0.9em; color: var(--muted); margin-bottom: 1em;">
                    Download your data as a ZIP archive. Backups include settings, messages, and contacts.
                  </p>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5em;">
                    <button id="export-full" class="reset-button" style="flex: 1; min-width: 150px;">
                      <i class="fas fa-download"></i> Export Full Backup
                    </button>
                    <button id="export-messages" class="reset-button" style="flex: 1; min-width: 150px;">
                      <i class="fas fa-envelope"></i> Export Messages Only
                    </button>
                    <button id="export-settings" class="reset-button" style="flex: 1; min-width: 150px;">
                      <i class="fas fa-cog"></i> Export Settings Only
                    </button>
                  </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 1em;">
                  <h3 style="margin-top: 0; margin-bottom: 0.5em;">Import Backup</h3>
                  <p style="font-size: 0.9em; color: var(--muted); margin-bottom: 1em;">
                    Restore data from a ZIP backup file. Your current data will be backed up automatically before importing.
                  </p>
                  <input type="file" id="import-file" accept=".zip" style="display: none;" />
                  <button id="import-backup" class="reset-button">
                    <i class="fas fa-upload"></i> Import Backup
                  </button>
                </div>

                <div id="backup-status" style="margin-top: 1em; padding: 1em; border-radius: 4px; display: none;"></div>
              </div>
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
    //recomputeCallsignFromExistingNpub();
  }

  // Backup & Restore handlers
  setupBackupHandlers();
}

function setupBackupHandlers() {
  const statusDiv = document.getElementById('backup-status');

  function showStatus(message, isError = false) {
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)';
      statusDiv.style.border = isError ? '1px solid #e74c3c' : '1px solid #2ecc71';
      statusDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
      statusDiv.innerHTML = message.replace(/\n/g, '<br>');

      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }

  // Export Full Backup
  document.getElementById('export-full').addEventListener('click', async () => {
    showStatus('Creating backup...', false);
    const result = await window.GeogramBackup.exportFullBackup();
    showStatus(result.message, !result.success);
  });

  // Export Messages Only
  document.getElementById('export-messages').addEventListener('click', async () => {
    showStatus('Exporting messages...', false);
    const result = await window.GeogramBackup.exportMessagesOnly();
    showStatus(result.message, !result.success);
  });

  // Export Settings Only
  document.getElementById('export-settings').addEventListener('click', async () => {
    showStatus('Exporting settings...', false);
    const result = await window.GeogramBackup.exportSettingsOnly();
    showStatus(result.message, !result.success);
  });

  // Import Backup
  const importFileInput = document.getElementById('import-file');
  const importButton = document.getElementById('import-backup');

  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Analyze backup first
      showStatus('Analyzing backup file...', false);
      const analysis = await window.GeogramBackup.analyzeBackup(file);

      if (!analysis.success) {
        showStatus(analysis.message, true);
        return;
      }

      // Show confirmation dialog
      const confirmMessage =
        `Found backup from: ${new Date(analysis.exportDate).toLocaleString()}\n` +
        `Username: ${analysis.username}\n` +
        `Settings: ${analysis.settingsCount} items\n` +
        `Messages: ${analysis.messagesCount} conversations\n` +
        `Cache: ${analysis.cacheCount} items\n\n` +
        `Your current data will be backed up automatically before importing.\n` +
        `Do you want to proceed with the restore?`;

      if (!confirm(confirmMessage)) {
        showStatus('Import cancelled', false);
        importFileInput.value = '';
        return;
      }

      // Import the backup
      showStatus('Importing backup... This may take a moment.', false);
      const result = await window.GeogramBackup.importBackup(file);

      if (result.success) {
        showStatus(result.message + '\n\nPage will reload in 3 seconds...', false);
        setTimeout(() => {
          location.reload();
        }, 3000);
      } else {
        showStatus(result.message, true);
      }
    } catch (error) {
      showStatus('Import failed: ' + error.message, true);
    } finally {
      importFileInput.value = '';
    }
  });
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}
