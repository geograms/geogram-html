// tabs/config.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column nav-column">
      <div class="card">
        <h2>Sections</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#user" class="nav-link">User</a></li>
          <li><a href="#locations" class="nav-link">Locations</a></li>
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
  <label for="username" style="display: block; margin-bottom: 0.25em;">User Name or Call Sign</label>
  <input type="text" id="username" class="styled-select" maxlength="30" style="width: 100%;" />
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


      <div id="locations" style="margin-bottom: 4em;">
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
            
            
          </div>
          
          <div id="customization">
        <h2>Customization</h2>
        <div class="card">
          <label for="theme-select">Color Theme</label>
          <div class="custom-select-wrapper">
            <select id="theme-select" class="styled-select">
              <option value="green">Eco-Green</option>
              <option value="monster">Monster Energy</option>
              <option value="red">Red Alert</option>
              <option value="yellow">Bruce Lee</option>
              <option value="blue">Low-light Blue</option>
              <option value="evangelion">Evangelion</option>
            </select>
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
        
        // Add temporary highlight
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
  

document.getElementById('generate-key').addEventListener('click', () => {
  if (!window.NostrTools) {
    alert("Nostr library not loaded.");
    return;
  }

  const privateKey = window.NostrTools.generatePrivateKey();
  const publicKey = window.NostrTools.getPublicKey(privateKey);

  document.getElementById('privkey').value = privateKey;
  document.getElementById('pubkey').value = publicKey;

  localStorage.setItem('privkey', privateKey);
  localStorage.setItem('pubkey', publicKey);
});

 

  // Countries functionality
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];


  const countrySelect = document.getElementById('country-select');
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });

  function saveCountries() {
    const rows = Array.from(document.querySelectorAll('#country-table tr'));
    const data = rows.map(row => row.querySelector('td:first-child').textContent);
    localStorage.setItem("countries", JSON.stringify(data));
  }

  document.getElementById('add-country').addEventListener('click', () => {
    const country = countrySelect.value;
    if (!country) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${country}</td>
      <td><button class="remove-country reset-button" style="padding: 0.2em 0.5em;">Remove</button></td>
    `;
    row.querySelector('.remove-country').addEventListener('click', () => {
      row.remove();
      saveCountries();
    });
    document.getElementById('country-table').appendChild(row);
    saveCountries();
  });

  const savedCountries = localStorage.getItem("countries");
  if (savedCountries) {
    JSON.parse(savedCountries).forEach(country => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${country}</td>
        <td><button class="remove-country reset-button" style="padding: 0.2em 0.5em;">Remove</button></td>
      `;
      row.querySelector('.remove-country').addEventListener('click', () => {
        row.remove();
        saveCountries();
      });
      document.getElementById('country-table').appendChild(row);
    });
  }

  // Locations functionality
  function saveLocations() {
    const rows = Array.from(document.querySelectorAll('#location-table tr'));
    const data = rows.map(row => ({
      coords: row.querySelector('td:first-child').textContent,
      radius: row.querySelector('td:nth-child(2)').textContent
    }));
    localStorage.setItem("locations", JSON.stringify(data));
  }

  document.getElementById('add-location').addEventListener('click', () => {
    const coords = document.getElementById('location-coords').value.trim();
    const radius = document.getElementById('location-radius').value.trim();
    
    if (!coords || !radius) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${coords}</td>
      <td>${radius}</td>
      <td><button class="remove-location reset-button" style="padding: 0.2em 0.5em;">Remove</button></td>
    `;
    row.querySelector('.remove-location').addEventListener('click', () => {
      row.remove();
      saveLocations();
    });
    document.getElementById('location-table').appendChild(row);
    saveLocations();

    // Clear inputs
    document.getElementById('location-coords').value = '';
    document.getElementById('location-radius').value = '';
  });

  const savedLocations = localStorage.getItem("locations");
  if (savedLocations) {
    JSON.parse(savedLocations).forEach(location => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${location.coords}</td>
        <td>${location.radius}</td>
        <td><button class="remove-location reset-button" style="padding: 0.2em 0.5em;">Remove</button></td>
      `;
      row.querySelector('.remove-location').addEventListener('click', () => {
        row.remove();
        saveLocations();
      });
      document.getElementById('location-table').appendChild(row);
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
