async function activityStartLocalMaps() {
const mapContainer = document.getElementById('map');
const chatContainer = document.getElementById('recent-nearby');
if (!mapContainer || !chatContainer) return;

    mapContainer.innerHTML = `
        <div id="nearbyMap" style="height: 350px; width: 100%; min-width:300px; border-radius: 8px; border: 1px solid #ccc;"></div>
    `;

chatContainer.innerHTML = `
  <div class="nearby-tabs" style="margin-bottom: 1em;">
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
  <div id="nearby-tab-content">
    <div id="tab-chat" class="nearby-tab-panel" style="display:block;">
      <!-- Chat box code here -->
      <div id="chat-area" class="chat-area" style="background:#000; padding:12px; border-radius:4px; width:100%; min-width:300px; min-height:400px; display:flex; flex-direction:column;">
        <!-- ...existing chat markup... -->
        <div style="margin-bottom: 1em;">
            <button id="locateBtn" title="Use my location"><i class="fa-solid fa-location-crosshairs"></i></button>
            <label style="margin-left:1em;">
                <i class="fa-solid fa-ruler"></i>
                <input type="range" id="radiusInput" value="100" min="1" max="500" style="width: 10em; vertical-align: middle;" />
                <span id="radiusValue">100</span> km
            </label>
        </div>
        <div class="chat-messages" id="chatMessages" style="overflow-y:scroll;flex:1;padding-right:4px;"></div>
        <div class="chat-input" style="margin-top:12px;display:flex;align-items:center;position:relative;background:inherit;">
          <button id="emojiBtn" class="action-button" title="Emoticons" style="margin-right:8px;position:relative;"><i class="fa-regular fa-face-smile"></i></button>
          <input id="chatInput" type="text" placeholder="Type a message..." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card);color:var(--text,#fff);" />
          <button id="sendChatBtn" class="action-button" title="Send" style="margin-left:8px;"><i class="fa-solid fa-paper-plane"></i></button>
          <div id="emoji-picker" style="display:none;position:absolute;left:0;bottom:48px;background:var(--card);border:1px solid var(--border);padding:8px;border-radius:6px;z-index:10;max-width:200px;">
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${['😊','😂','😍','😢','😎','👍','🙏','😉','🎉','😡','🤔','😴'].map(e => `<span style="cursor:pointer;font-size:1.5rem;" onclick="insertNearbyEmoji('${e}')">${e}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="tab-topic1" class="nearby-tab-panel" style="display:none;">
      <div style="background:#111; color:#fff; padding:24px; border-radius:8px;">Topic 1 content goes here.</div>
    </div>
    <div id="tab-topic2" class="nearby-tab-panel" style="display:none;">
      <div style="background:#111; color:#fff; padding:24px; border-radius:8px;">Topic 2 content goes here.</div>
    </div>
  </div>
`;

// Tab switching logic
setTimeout(() => {
  const tabBtns = Array.from(document.querySelectorAll('.nearby-tab-btn'));
  const tabPanels = {
    chat: document.getElementById('tab-chat'),
    topic1: document.getElementById('tab-topic1'),
    topic2: document.getElementById('tab-topic2')
  };
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.keys(tabPanels).forEach(key => {
        tabPanels[key].style.display = (btn.dataset.tab === key) ? 'block' : 'none';
      });
    };
  });
  // Re-attach chat events after tab markup
  const sendBtn = document.getElementById('sendChatBtn');
  if (sendBtn) sendBtn.onclick = sendNearbyMessage;
  const emojiBtn = document.getElementById('emojiBtn');
  if (emojiBtn) emojiBtn.onclick = toggleNearbyEmojiPicker;
  const input = document.getElementById('chatInput');
  if (input) input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendNearbyMessage();
    }
  };
  renderNearbyChatMessages();
}, 200);

  // Load Leaflet if not already loaded
  if (typeof L === "undefined") {
    await new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  // Default center: Coimbra, Portugal
  let center = { lat: 40.2056, lng: -8.4137 };
  let radius = 100; // km

  // Initialize map
  const map = L.map('nearbyMap').setView([center.lat, center.lng], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Circle overlay
  let circle = L.circle([center.lat, center.lng], {
    radius: radius * 1000, // meters
    color: 'blue',
    fillColor: '#3fa9f5',
    fillOpacity: 0.2
  }).addTo(map);

  // Custom icon for draggable marker
  const markerIcon = L.divIcon({
    html: '<span class="custom-center-marker-icon"><i class="fa-solid fa-map-pin" style="font-size:2rem;color:#d01;"></i></span>',
    iconSize: [32, 32],
    className: 'custom-center-marker',
    popupAnchor: [0, -16]
  });

  // Add CSS for cursor:grab only on the icon, and default everywhere else including the circle
  const style = document.createElement('style');
  style.textContent = `
    #nearbyMap, #nearbyMap .leaflet-container, #nearbyMap .leaflet-interactive { cursor: default !important; }
    .custom-center-marker-icon { cursor: grab; }
  `;
  document.head.appendChild(style);

  // Draggable marker for circle center
  let centerMarker = L.marker([center.lat, center.lng], { draggable: true, icon: markerIcon }).addTo(map);
  centerMarker.on('dragend', function(e) {
    const pos = e.target.getLatLng();
    center = { lat: pos.lat, lng: pos.lng };
    updateCircle();
  });

  // Update circle and map view
  function updateCircle() {
    circle.setLatLng([center.lat, center.lng]);
    circle.setRadius((radius / 2) * 1000); // Show radius as half the input value
    centerMarker.setLatLng([center.lat, center.lng]);
    map.setView([center.lat, center.lng], getZoomForRadius(radius));
  }

  // Helper to estimate zoom for radius
  function getZoomForRadius(r) {
    if (r <= 2) return 13;
    if (r <= 10) return 11;
    if (r <= 30) return 9;
    if (r <= 100) return 7;
    if (r <= 300) return 6;
    return 5;
  }

  // Handle location button
  document.getElementById('locateBtn').onclick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      updateCircle();
    }, err => {
      alert("Could not get your location.");
    });
  };

  // Handle radius input
  const radiusInput = document.getElementById('radiusInput');
  const radiusValue = document.getElementById('radiusValue');
  radiusInput.oninput = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 500) val = 500;
    radiusInput.value = val;
    radiusValue.textContent = val;
    radius = val;
    updateCircle();
  };

  // Chat logic for Nearby
  window.insertNearbyEmoji = function(emoji) {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const newPos = start + emoji.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = 'none';
  };

  const chatMessages = [];

  function renderNearbyChatMessages() {
    const chatMessagesDiv = document.getElementById('chatMessages');
    if (!chatMessagesDiv) return;
    chatMessagesDiv.innerHTML = chatMessages.map(msg => {
      const alignment = msg.outgoing ? 'flex-end' : 'flex-start';
      const bubbleBg = msg.outgoing ? '#222' : '#111';
      const textColor = msg.outgoing ? '#fff' : 'var(--text)';
      return `
        <div class="chat-message" style="margin-bottom:12px; display:flex; flex-direction:column; align-items:${alignment};">
          <div style="background:${bubbleBg};color:${textColor};padding:10px 14px;border-radius:14px;max-width:70%; align-self:${alignment};font-size:0.9em;">
            ${msg.text}
            <div style="font-size:0.6em;color:var(--muted,#888);margin-top:3px;text-align:right; width:100%;">
              ${msg.timestamp}
            </div>
          </div>
        </div>`;
    }).join('');
    setTimeout(() => {
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }, 0);
  }

  function sendNearbyMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    chatMessages.push({ text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), outgoing: true });
    renderNearbyChatMessages();
  }

  function toggleNearbyEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = (picker.style.display === 'none' || picker.style.display === '') ? 'block' : 'none';
  }

  // Event listeners for chat
  setTimeout(() => {
    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) sendBtn.onclick = sendNearbyMessage;
    const emojiBtn = document.getElementById('emojiBtn');
    if (emojiBtn) emojiBtn.onclick = toggleNearbyEmojiPicker;
    const input = document.getElementById('chatInput');
    if (input) input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendNearbyMessage();
      }
    };
    renderNearbyChatMessages();
  }, 200);

  // Force normal cursor inside the map
  const mapStyle = document.createElement('style');
  mapStyle.textContent = `#nearbyMap, #nearbyMap .leaflet-container { cursor: default !important; }`;
  document.head.appendChild(mapStyle);

  // Initial draw
  updateCircle();
}