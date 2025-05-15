// tabs/config.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column nav-column">
      <div class="card">
        <h2>Sections</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#user" class="nav-link">User</a></li>
          <li><a href="#location" class="nav-link">Location</a></li>
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
              <label for="privkey">NOSTR Private Key</label>
              <input type="password" id="privkey" class="styled-select" maxlength="64" style="width: 100%;" />
              <small>Used to sign messages — keep this private.</small>
            </div>
            <div>
              <label for="pubkey">NOSTR Public Key</label>
              <input type="text" id="pubkey" class="styled-select" maxlength="64" style="width: 100%;" />
              <small>Visible identifier for your profile.</small>
            </div>
            <div>
              <label for="username">User Name</label>
              <input type="text" id="username" class="styled-select" maxlength="30" style="width: 100%;" />
              <small>Name shown to others in chats.</small>
            </div>

    <div>
      <label>Call Signs</label>
      <small>Add operator identifiers from radio licensing platforms.</small>
      <div style="display: flex; gap: 0.5em; margin-top: 0.5em; align-items: center;">
        <select id="callsign-type-select" class="styled-select" style="flex: 1; height: 2.8em; font-size: 0.9em;">
          <option value="">Select a call sign type...</option>
        </select>
        <input id="callsign-id-input" class="styled-select" type="text" maxlength="20" placeholder="Call Sign ID"
          style="flex: 1; height: 2em; font-size: 0.9em;" />
        <button id="add-callsign" class="reset-button" style="height: 2em; padding: 0 0.75em; font-size: 0.9em;">
          Add Call Sign
        </button>
      </div>
      <table class="styled-table" style="margin-top: 1em; width: 100%;">
        <thead>
          <tr>
            <th>Type</th>
            <th>ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="callsign-table"></tbody>
      </table>
    </div>



            
            
          </div>
        </div>
      </div>

      <div id="location" style="margin-bottom: 4em;">
        <h2>Locations of interest</h2>
        <div class="card">
          <div style="display: flex; flex-direction: column; gap: 1em;">
            <div style="margin-bottom: 3em;">
              <label>Countries</label>
              <div style="display: flex; gap: 0.5em; margin-top: 0.5em; align-items: flex-start;">
                <div style="flex: 1;">
                  <select id="country-select" class="styled-select" style="width: 100%;">
                    <option value="">Select a country...</option>
                    <!-- Countries will be populated by JavaScript -->
                  </select>
                  <small style="display: block; margin-top: 0.5em;">Select countries you want to receive updates about.</small>
                </div>
                <button id="add-country" class="reset-button" style="margin-top: 0;">Add Country</button>
              </div>
              <table class="styled-table" style="margin-top: 1em; width: 100%;">
                <tbody id="country-table"></tbody>
              </table>
            </div>

            <div style="margin-bottom: 4em;">
              <label>Coordinates</label>
              <div style="display: flex; gap: 0.5em; margin-top: 0.5em;">
                <input type="text" id="location-coords" class="styled-select" placeholder="Latitude, Longitude" style="flex: 2;" />
                <input type="number" id="location-radius" class="styled-select" placeholder="Radius (km)" min="1" style="flex: 1;" />
                <button id="get-coords" class="reset-button" style="margin-top: 0">Use My Current Location</button>
                <button id="add-location" class="reset-button" style="margin-top: 0">Add Location</button>
              </div>
              <small style="display: block; margin-top: 0.5em;">Add specific locations with radius for alerts.</small>
              <table class="styled-table" style="margin-top: 0.5em; width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Coordinates</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Radius (km)</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Actions</th>
                  </tr>
                </thead>
                <tbody id="location-table">
                  <!-- Rows will be added dynamically -->
                </tbody>
              </table>
            </div>

            <div id="customization">
              <h2>Customization</h2>
              <div class="card">
                <label for="theme-select">Color Theme</label>
                <div class="custom-select-wrapper">
                  <select id="theme-select" class="styled-select">
                    <option value="green">Green</option>
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                    <option value="brown">Brown</option>
                    <option value="grey">Grey</option>
                    <option value="red">Red</option>
                    <option value="lightblue">Light Blue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="location" style="margin-bottom: 4em;">
        <h2>Locations of interest</h2>
        <div class="card">
          <div style="display: flex; flex-direction: column; gap: 1em;">
            <div style="margin-bottom: 3em;">
              <label>Countries</label>
              <div style="display: flex; gap: 0.5em; margin-top: 0.5em; align-items: flex-start;">
                <div style="flex: 1;">
                  <select id="country-select" class="styled-select" style="width: 100%;">
                    <option value="">Select a country...</option>
                    <!-- Countries will be populated by JavaScript -->
                  </select>
                  <small style="display: block; margin-top: 0.5em;">Select countries you want to receive updates about.</small>
                </div>
                <button id="add-country" class="reset-button" style="margin-top: 0;">Add Country</button>
              </div>
              <table class="styled-table" style="margin-top: 1em; width: 100%;">
                <tbody id="country-table"></tbody>
              </table>
            </div>

            <div style="margin-bottom: 4em;">
              <label>Coordinates</label>
              <div style="display: flex; gap: 0.5em; margin-top: 0.5em;">
                <input type="text" id="location-coords" class="styled-select" placeholder="Latitude, Longitude" style="flex: 2;" />
                <input type="number" id="location-radius" class="styled-select" placeholder="Radius (km)" min="1" style="flex: 1;" />
                <button id="get-coords" class="reset-button" style="margin-top: 0">Use My Current Location</button>
                <button id="add-location" class="reset-button" style="margin-top: 0">Add Location</button>
              </div>
              <small style="display: block; margin-top: 0.5em;">Add specific locations with radius for alerts.</small>
              <table class="styled-table" style="margin-top: 0.5em; width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Coordinates</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Radius (km)</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);">Actions</th>
                  </tr>
                </thead>
                <tbody id="location-table">
                  <!-- Rows will be added dynamically -->
                </tbody>
              </table>
            </div>

            <div id="customization">
              <h2>Customization</h2>
              <div class="card">
                <label for="theme-select">Color Theme</label>
                <div class="custom-select-wrapper">
                  <select id="theme-select" class="styled-select">
                    <option value="green">Green</option>
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                    <option value="brown">Brown</option>
                    <option value="grey">Grey</option>
                    <option value="red">Red</option>
                    <option value="lightblue">Light Blue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Navigation link functionality
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        targetElement.style.transition = 'background-color 0.5s ease';
        targetElement.style.backgroundColor = 'var(--wave-color)';
        setTimeout(() => {
          targetElement.style.backgroundColor = '';
        }, 1000);
      }
    });
  });

  // Theme selection
  const currentTheme = localStorage.getItem('theme') || 'green';
  document.getElementById('theme-select').value = currentTheme;
  applyTheme(currentTheme);
  document.getElementById('theme-select').addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  });

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

  // Call Sign setup
  const callsignTypes = [
    "Amateur", "GMRS", "Commercial", "Marine", "Aviation",
    "Military Tactical", "Police", "Fire", "Custom"
  ];
  const callsignSelect = document.getElementById('callsign-type-select');
  callsignTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    callsignSelect.appendChild(option);
  });

  function saveCallsigns() {
    const rows = Array.from(document.querySelectorAll('#callsign-table tr'));
    const data = rows.map(row => ({
      type: row.querySelector('td:first-child select').value,
      id: row.querySelector('td:nth-child(2) input').value
    }));
    localStorage.setItem("callsigns", JSON.stringify(data));
  }

  document.getElementById('add-callsign').addEventListener('click', () => {
    const type = document.getElementById('callsign-type-select').value;
    const id = document.getElementById('callsign-id-input').value.trim();
    if (!type || !id) return;

    const row = document.createElement('tr');
    const typeCell = document.createElement('td');
    const idCell = document.createElement('td');
    const actionCell = document.createElement('td');

    const typeSelect = document.createElement('select');
    typeSelect.className = 'styled-select';
    callsignTypes.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === type) option.selected = true;
      typeSelect.appendChild(option);
    });

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'styled-select';
    idInput.maxLength = 20;
    idInput.style.width = '100%';
    idInput.value = id;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-callsign reset-button';
    removeBtn.textContent = 'Remove';
    removeBtn.style.padding = '0.2em 0.5em';
    removeBtn.addEventListener('click', () => {
      row.remove();
      saveCallsigns();
    });

    typeSelect.addEventListener('change', saveCallsigns);
    idInput.addEventListener('input', saveCallsigns);

    typeCell.appendChild(typeSelect);
    idCell.appendChild(idInput);
    actionCell.appendChild(removeBtn);

    row.appendChild(typeCell);
    row.appendChild(idCell);
    row.appendChild(actionCell);
    document.getElementById('callsign-table').appendChild(row);

    saveCallsigns();
  });

  const savedCallsigns = localStorage.getItem("callsigns");
  if (savedCallsigns) {
    JSON.parse(savedCallsigns).forEach(item => {
      const row = document.createElement('tr');
      const typeCell = document.createElement('td');
      const idCell = document.createElement('td');
      const actionCell = document.createElement('td');

      const typeSelect = document.createElement('select');
      typeSelect.className = 'styled-select';
      callsignTypes.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === item.type) option.selected = true;
        typeSelect.appendChild(option);
      });

      const idInput = document.createElement('input');
      idInput.type = 'text';
      idInput.className = 'styled-select';
      idInput.maxLength = 20;
      idInput.style.width = '100%';
      idInput.value = item.id;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-callsign reset-button';
      removeBtn.textContent = 'Remove';
      removeBtn.style.padding = '0.2em 0.5em';
      removeBtn.addEventListener('click', () => {
        row.remove();
        saveCallsigns();
      });

      typeSelect.addEventListener('change', saveCallsigns);
      idInput.addEventListener('input', saveCallsigns);

      typeCell.appendChild(typeSelect);
      idCell.appendChild(idInput);
      actionCell.appendChild(removeBtn);

      row.appendChild(typeCell);
      row.appendChild(idCell);
      row.appendChild(actionCell);
      document.getElementById('callsign-table').appendChild(row);
    });
  }

  // Geolocation
  document.getElementById('get-coords').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        document.getElementById('location-coords').value = `${lat}, ${lon}`;
      });
    }
  });
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

