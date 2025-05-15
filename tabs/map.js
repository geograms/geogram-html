// tabs/map.js
function render() {
  // Clear existing content and recreate the exact structure from map.html
  document.getElementById('content').innerHTML = `
    <div id="map"></div>
    <div class="toolbar">
      <button id="measureBtn">Measure Distance</button>
      <button id="addMarkerBtn">Add Marker</button>
      <label><input type="checkbox" id="trackToggle"> Track Me</label>
      <div id="geocoder" style="flex: 1;"></div>
    </div>
  `;

  // Add critical styles immediately
  const style = document.createElement('style');
  style.textContent = `
    #map {
      position: absolute;
      top: 30px; /* header + tabs height */
      bottom: 90px; /* toolbar + footer height */
      left: 0;
      right: 0;
      z-index: 0;
    }
    .toolbar {
      position: fixed;
      bottom: 40px; /* footer height */
      left: 0;
      right: 0;
      padding: 10px;
      background: var(--card);
      display: flex;
      gap: 10px;
      z-index: 1000;
      border-top: 1px solid var(--border);
    }
    .toolbar button {
      padding: 8px 12px;
      background: var(--accent);
      color: var(--bg);
      border: none;
      border-radius: 4px;
    }

    .leaflet-top.leaflet-left {
     top: 60px; 
}
  `;
  document.head.appendChild(style);

  // Load Leaflet only once
  if (!window.L) {
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
      geocoderJS.onload = initializeMap;
      document.head.appendChild(geocoderJS);
    };
    document.head.appendChild(leafletJS);
  } else {
    initializeMap();
  }
}

function initializeMap() {
  // Create map with full size
  const map = L.map('map').setView([0, 0], 2);
  
  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Force proper sizing
  setTimeout(() => map.invalidateSize(true), 0);

  // Add geocoder
  L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', e => {
      map.fitBounds(e.geocode.bbox);
      L.marker(e.geocode.center).addTo(map)
        .bindPopup(e.geocode.name)
        .openPopup();
    }).addTo(map);

  // Restore saved view
  const lastView = localStorage.getItem('mapView');
  if (lastView) {
    try {
      const { lat, lng, zoom } = JSON.parse(lastView);
      map.setView([lat, lng], zoom);
    } catch {}
  }

  // Save view on move
  map.on('moveend', () => {
    const center = map.getCenter();
    localStorage.setItem('mapView', JSON.stringify({
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom()
    }));
  });

  // Measurement tool
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

  // Marker tool
  document.getElementById('addMarkerBtn').addEventListener('click', () => {
    const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
    marker.bindPopup("Drag me").openPopup();
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      marker.setPopupContent(`Lat: ${pos.lat.toFixed(5)}<br>Lng: ${pos.lng.toFixed(5)}`)
        .openPopup();
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
        alert("Geolocation not supported");
        e.target.checked = false;
      }
    } else {
      if (trackId) navigator.geolocation.clearWatch(trackId);
      if (trackMarker) map.removeLayer(trackMarker);
      trackId = null;
      trackMarker = null;
    }
  });

  // Lazy-load weather station data
  const weatherScript = document.createElement('script');
  weatherScript.src = './data/WEATHER_STATION.js';
  weatherScript.onload = () => {
    if (Array.isArray(window.WEATHER_STATIONS)) {
      window.WEATHER_STATIONS.forEach(station => {
        const { lat, lon } = station.coordinates;
        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`
          <strong>${station.callsign}</strong><br>
          Temp: ${station.t}°C<br>
          Humidity: ${station.h}%<br>
          Pressure: ${station.p} hPa
        `);
      });
    } else {
      console.error('WEATHER_STATIONS is not an array');
    }
  };
  document.body.appendChild(weatherScript);



}
