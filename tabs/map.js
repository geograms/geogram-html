// tabs/map.js
function render() {
  // Clear existing content and create map-specific structure
  document.getElementById('content').innerHTML = `
    <div id="map-container">
      <div id="map"></div>
      <div class="map-toolbar">
        <button id="measureBtn">Measure Distance</button>
        <button id="addMarkerBtn">Add Marker</button>
        <label><input type="checkbox" id="trackToggle"> Track Me</label>
        <div id="geocoder"></div>
      </div>
    </div>
  `;

  // Load Leaflet resources if needed
  if (!window.L) {
    loadLeafletResources().then(initializeMap);
  } else {
    initializeMap();
  }
}

function loadLeafletResources() {
  return new Promise((resolve) => {
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const geocoderCSS = document.createElement('link');
    geocoderCSS.rel = 'stylesheet';
    geocoderCSS.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
    document.head.appendChild(geocoderCSS);

    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.onload = () => {
      const geocoderJS = document.createElement('script');
      geocoderJS.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
      geocoderJS.onload = resolve;
      document.head.appendChild(geocoderJS);
    };
    document.head.appendChild(leafletJS);
  });
}

function initializeMap() {
  // Add map-specific styles
  addMapStyles();

  // Initialize the map
  const map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Geocoder control
  L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', e => {
      const bbox = e.geocode.bbox;
      map.fitBounds(bbox);
      L.marker(e.geocode.center).addTo(map).bindPopup(e.geocode.name).openPopup();
    }).addTo(map);

  // Restore last view
  const lastView = localStorage.getItem('mapView');
  if (lastView) {
    try {
      const { lat, lng, zoom } = JSON.parse(lastView);
      map.setView([lat, lng], zoom);
    } catch {}
  }

  // Save view on move
  map.on('moveend', () => {
    const c = map.getCenter();
    localStorage.setItem('mapView', JSON.stringify({
      lat: c.lat,
      lng: c.lng,
      zoom: map.getZoom()
    }));
  });

  // Measurement functionality
  let measureState = 0;
  let startLatLng = null;
  let measureLine = null;

  document.getElementById('measureBtn').addEventListener('click', () => {
    measureState = 1;
    alert('Click the first point on the map.');
  });

  map.on('click', e => {
    if (measureState === 1) {
      startLatLng = e.latlng;
      measureState = 2;
      alert('Now click the second point.');
    } else if (measureState === 2) {
      const distance = startLatLng.distanceTo(e.latlng) / 1000;
      if (measureLine) map.removeLayer(measureLine);
      measureLine = L.polyline([startLatLng, e.latlng], { color: 'lime' }).addTo(map);
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`Distance: ${distance.toFixed(2)} km`)
        .openOn(map);
      measureState = 0;
    }
  });

  // Marker functionality
  document.getElementById('addMarkerBtn').addEventListener('click', () => {
    const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
    marker.bindPopup("Drag me").openPopup();
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      marker.setPopupContent(`Lat: ${pos.lat.toFixed(5)}<br>Lng: ${pos.lng.toFixed(5)}`).openPopup();
    });
  });

  // Location tracking
  let trackId = null;
  let trackMarker = null;
  document.getElementById('trackToggle').addEventListener('change', e => {
    if (e.target.checked) {
      if (navigator.geolocation) {
        trackId = navigator.geolocation.watchPosition(pos => {
          const { latitude, longitude } = pos.coords;
          if (!trackMarker) {
            trackMarker = L.marker([latitude, longitude]).addTo(map);
            map.setView([latitude, longitude], 13);
          } else {
            trackMarker.setLatLng([latitude, longitude]);
          }
        }, null, { enableHighAccuracy: true });
      } else {
        alert("Geolocation is not supported by your browser");
        e.target.checked = false;
      }
    } else {
      if (trackId) navigator.geolocation.clearWatch(trackId);
      if (trackMarker) map.removeLayer(trackMarker);
      trackId = null;
      trackMarker = null;
    }
  });
}

function addMapStyles() {
  if (document.getElementById('map-styles')) return;

  const style = document.createElement('style');
  style.id = 'map-styles';
  style.textContent = `
    #map-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: calc(100vh - 120px); /* Adjust based on header/footer height */
    }
    
    #map {
      flex: 1;
      width: 100%;
      z-index: 0;
    }
    
    .map-toolbar {
      padding: 0.8em;
      background: var(--card);
      display: flex;
      flex-wrap: wrap;
      gap: 1em;
      align-items: center;
      border-top: 1px solid var(--border);
    }
    
    .map-toolbar button {
      padding: 0.5em 1em;
      background-color: var(--accent);
      color: var(--bg);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
    }
    
    .map-toolbar label {
      display: flex;
      align-items: center;
      gap: 0.5em;
      font-size: 0.9em;
    }
    
    #geocoder {
      flex: 1;
      min-width: 200px;
    }
    
    .leaflet-control-geocoder {
      background: var(--card);
      border: 1px solid var(--border);
    }
    
    .leaflet-control-geocoder a {
      background-color: var(--accent);
    }
    
    .leaflet-control-geocoder-form input {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
    }
    
    @media (max-width: 768px) {
      .map-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      
      #geocoder {
        min-width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}
