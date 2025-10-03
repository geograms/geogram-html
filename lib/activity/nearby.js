// nearby.js — full, modified source
// Purpose: build Nearby map + chat UI shells; leave all chat network logic to chat.js
// Minimal integration points:
//   - Provides DOM ids: #chatMessages, #chatInput, #sendChatBtn, #radiusInput, #radiusValue, #locateBtn
//   - Updates browser cache keys for chat.js to read: nearby.lat, nearby.lng, nearby.radius
//   - Calls window.GeogramChat?.refresh() after location/radius changes (if chat.js is loaded)

async function activityStartLocalMaps() {
  const mapContainer = document.getElementById('map');
  const sideContainer = document.getElementById('recent-nearby');
  if (!mapContainer || !sideContainer) return;

  // Tear down previous map if exists
  if (window.currentNearbyMap) {
    try { window.currentNearbyMap.remove(); } catch (_) {}
    window.currentNearbyMap = null;
  }

  // Map mount
  mapContainer.innerHTML = `
    <div id="nearbyMap"
         style="height: 100vh; width: 100vw; min-width: 300px; position: absolute; top: 0; left: 0; z-index: 1;">
    </div>
  `;

  // Right-side: tabs + chat UI shell (chat.js will wire logic)
  sideContainer.innerHTML = `
    <div class="nearby-tabs" style="margin-bottom: 1em; display:flex; gap:.5rem;">
      <button class="nearby-tab-btn active" data-tab="chat" title="Chat">
        <i class="fa-solid fa-comments"></i>
      </button>
      <button class="nearby-tab-btn" data-tab="topic1" title="Stations">
        <i class="fa-solid fa-tower-cell"></i>
      </button>
      <button class="nearby-tab-btn" data-tab="topic2" title="Places">
        <i class="fa-solid fa-landmark"></i>
      </button>
    </div>

    <div id="tab-chat" class="nearby-tab-panel" style="display:block;width:100%;height:100%;">
      <div id="chat-area" class="chat-area"
           style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #000; border-radius: 4px; padding: 12px; box-sizing: border-box;">
        <div style="margin-bottom: 1em; display:flex; align-items:center; gap: 1rem;">
          <button id="locateBtn" title="Use my location"><i class="fa-solid fa-location-crosshairs"></i></button>
          <label style="display:flex; align-items:center; gap:.5rem;">
            <i class="fa-solid fa-ruler"></i>
            <input type="range" id="radiusInput" value="100" min="1" max="500" style="width: 10em; vertical-align: middle;" />
            <span id="radiusValue">100</span> km
          </label>
        </div>

        <div class="chat-messages" id="chatMessages"
             style="flex:1; overflow-y:auto; min-height:0; padding-right:4px;"></div>

        <div class="chat-input"
             style="margin-top:auto; height:120px; display:flex; align-items:center; position:relative; background:inherit;">
          <button id="emojiBtn" class="action-button" title="Emoticons" style="margin-right:8px;position:relative;">
            <i class="fa-regular fa-face-smile"></i>
          </button>
          <input id="chatInput" type="text" placeholder="Type a message..."
                 style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card);color:var(--text,#fff);" />
          <button id="sendChatBtn" class="action-button" title="Send" style="margin-left:8px;">
            <i class="fa-solid fa-paper-plane"></i>
          </button>

          <div id="emoji-picker"
               style="display:none;position:absolute;left:0;bottom:48px;background:var(--card);border:1px solid var(--border);padding:8px;border-radius:6px;z-index:10;max-width:220px;">
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${['😊','😂','😍','😢','😎','👍','🙏','😉','🎉','😡','🤔','😴','📻','🛰️','🗺️','📍'].map(e => `
                <span style="cursor:pointer;font-size:1.4rem;" onclick="insertNearbyEmoji('${e}')">${e}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="tab-topic1" class="nearby-tab-panel" style="display:none;width:100%;height:100%;">
      <div style="background:#111; color:#fff; padding:24px; border-radius:8px;">
        <h3 style="margin-top:0;">APRS Stations</h3>
        <p>IGATE stations are shown on the map as fluorescent green dots with antenna symbols. Click a station for details.</p>
        <div style="margin-top:1em; font-size:0.9em; color:#ccc;">
          <div style="margin:8px 0;"><span style="color:#00ff41;">●</span> Active IGATE stations</div>
        </div>
      </div>
    </div>

    <div id="tab-topic2" class="nearby-tab-panel" style="display:none;width:100%;height:100%;">
      <div style="background:#111; color:#fff; padding:24px; border-radius:8px;">Landmarks coming soon…</div>
    </div>
  `;

  // Tabs
  setTimeout(() => {
    const tabBtns = Array.from(document.querySelectorAll('.nearby-tab-btn'));
    const panels = {
      chat: document.getElementById('tab-chat'),
      topic1: document.getElementById('tab-topic1'),
      topic2: document.getElementById('tab-topic2')
    };
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.keys(panels).forEach(k => {
          panels[k].style.display = (btn.dataset.tab === k) ? 'block' : 'none';
        });
      };
    });
  }, 0);

  // Load map libs
  await loadMapLibraries();

  // Defaults; try to restore from cache used by chat.js
  let center = {
    lat: parseFloat(localStorage.getItem('nearby.lat')) || 40.2056,
    lng: parseFloat(localStorage.getItem('nearby.lng')) || -8.4137
  };
  let radiusKm = parseInt(localStorage.getItem('nearby.radius') || '100', 10);

  // Initialize radius control from cache
  const radiusInput = document.getElementById('radiusInput');
  const radiusValue = document.getElementById('radiusValue');
  if (radiusInput) radiusInput.value = String(radiusKm);
  if (radiusValue) radiusValue.textContent = String(radiusKm);

  // Map
  const map = L.map('nearbyMap', {
    center: [center.lat, center.lng],
    zoom: getZoomForRadius(radiusKm),
    zoomControl: false,
    worldCopyJump: false,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0
  });
  window.currentNearbyMap = map;

  // Tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
  }).addTo(map);

  // IGATE layer (optional external loader)
  setTimeout(() => {
    if (typeof window.loadIGateStations === 'function') {
      window.loadIGateStations(map);
    }
  }, 500);

  // Circle + marker
  let circle = L.circle([center.lat, center.lng], {
    radius: (radiusKm / 2) * 1000, // show half visually
    color: 'blue',
    fillColor: '#3fa9f5',
    fillOpacity: 0.2
  }).addTo(map);

  const markerIcon = L.divIcon({
    html: '<span class="custom-center-marker-icon"><i class="fa-solid fa-map-pin" style="font-size:2rem;color:#d01;"></i></span>',
    iconSize: [32, 32],
    className: 'custom-center-marker',
    popupAnchor: [0, -16]
  });

  let centerMarker = L.marker([center.lat, center.lng], { draggable: true, icon: markerIcon }).addTo(map);
  centerMarker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    center = { lat: pos.lat, lng: pos.lng };
    persistCenter();
    updateCircle();
    // Let chat.js re-read messages for new center
    if (window.GeogramChat?.refresh) window.GeogramChat.refresh();
  });

  // Styles (cursor + clean divIcon backgrounds)
  const style = document.createElement('style');
  style.textContent = `
    #nearbyMap, #nearbyMap .leaflet-container, #nearbyMap .leaflet-interactive { cursor: default !important; }
    .custom-center-marker-icon { cursor: grab; }
    .igate-single-marker, .igate-cluster-marker { background: none !important; border: none !important; box-shadow: none !important; }
    .leaflet-div-icon { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(style);

  // Locate button → update center + cache + refresh chat
  const locateBtn = document.getElementById('locateBtn');
  if (locateBtn) {
    locateBtn.onclick = () => {
      if (!navigator.geolocation) {
        alert("Geolocation not supported by your browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(pos => {
        center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        persistCenter();
        updateCircle();
        if (window.GeogramChat?.refresh) window.GeogramChat.refresh();
      }, () => {
        alert("Could not get your location.");
      });
    };
  }

  // Radius input → update cache + circle + refresh chat
  if (radiusInput) {
    radiusInput.oninput = (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 500) val = 500;
      radiusKm = val;
      if (radiusValue) radiusValue.textContent = String(val);
      localStorage.setItem('nearby.radius', String(radiusKm));
      updateCircle();
      if (window.GeogramChat?.refresh) window.GeogramChat.refresh();
    };
  }

  // Persist helpers
  function persistCenter() {
    localStorage.setItem('nearby.lat', String(center.lat));
    localStorage.setItem('nearby.lng', String(center.lng));
  }

  // Update visuals
  function updateCircle() {
    circle.setLatLng([center.lat, center.lng]);
    circle.setRadius((radiusKm / 2) * 1000);
    centerMarker.setLatLng([center.lat, center.lng]);
    map.setView([center.lat, center.lng], getZoomForRadius(radiusKm));
  }

  function getZoomForRadius(r) {
    if (r <= 2) return 13;
    if (r <= 10) return 11;
    if (r <= 30) return 9;
    if (r <= 100) return 7;
    if (r <= 300) return 6;
    return 5;
  }

  // Emoji helpers (used by chat UI; neutral to chat.js)
  window.insertNearbyEmoji = function(emoji) {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const newPos = start + emoji.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = 'none';
  };

  function toggleNearbyEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    const isHidden = (picker.style.display === 'none' || picker.style.display === '');
    picker.style.display = isHidden ? 'block' : 'none';
  }

  const emojiBtn = document.getElementById('emojiBtn');
  if (emojiBtn) emojiBtn.onclick = toggleNearbyEmojiPicker;

  document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    const btn = document.getElementById('emojiBtn');
    if (!picker || !btn) return;
    if (!picker.contains(e.target) && !btn.contains(e.target)) picker.style.display = 'none';
  });

  // Final initial sync for chat.js consumers
  persistCenter();
  localStorage.setItem('nearby.radius', String(radiusKm));
  // Let chat.js re-bind and perform initial read if present
  if (window.GeogramChat?.refresh) {
    try { window.GeogramChat.refresh(); } catch (_) {}
  }

  // Cleanup for navigation away
  window.cleanupNearbyMap = function() {
    if (typeof window.cleanupIGateStations === 'function') {
      window.cleanupIGateStations();
    }
    if (window.currentNearbyMap) {
      try { window.currentNearbyMap.remove(); } catch (_) {}
      window.currentNearbyMap = null;
    }
  };
}

/**
 * Load Leaflet + MarkerCluster libraries if missing
 */
async function loadMapLibraries() {
  if (typeof L === "undefined") {
    await loadLibrary('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'css');
    await loadLibrary('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'js');
  }
  if (typeof L !== "undefined" && !L.markerClusterGroup) {
    await loadLibrary('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'css');
    await loadLibrary('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css', 'css');
    await loadLibrary('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'js');
  }
}

/**
 * Dynamically load CSS/JS
 * @param {string} url
 * @param {'css'|'js'} type
 */
function loadLibrary(url, type) {
  return new Promise((resolve, reject) => {
    let el;
    if (type === 'css') {
      el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = url;
    } else {
      el = document.createElement('script');
      el.src = url;
    }
    el.onload = resolve;
    el.onerror = reject;
    (type === 'css' ? document.head : document.body).appendChild(el);
  });
}
