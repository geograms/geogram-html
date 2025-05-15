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
      top: 30px;
      bottom: 90px;
      left: 0;
      right: 0;
      z-index: 0;
    }
    .toolbar {
      position: fixed;
      bottom: 40px;
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

    const clusterCSS = document.createElement('link');
    clusterCSS.rel = 'stylesheet';
    clusterCSS.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    document.head.appendChild(clusterCSS);

    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.onload = () => {
      const geocoderJS = document.createElement('script');
      geocoderJS.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
      geocoderJS.onload = () => {
        const clusterJS = document.createElement('script');
        clusterJS.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        clusterJS.onload = initializeMap;
        document.head.appendChild(clusterJS);
      };
      document.head.appendChild(geocoderJS);
    };
    document.head.appendChild(leafletJS);
  } else {
    initializeMap();
  }
}

function initializeMap() {
  const map = L.map('map').setView([0, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  setTimeout(() => map.invalidateSize(true), 0);

  L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', e => {
      map.fitBounds(e.geocode.bbox);
      L.marker(e.geocode.center).addTo(map)
        .bindPopup(e.geocode.name)
        .openPopup();
    }).addTo(map);

  const lastView = localStorage.getItem('mapView');
  if (lastView) {
    try {
      const { lat, lng, zoom } = JSON.parse(lastView);
      map.setView([lat, lng], zoom);
    } catch {}
  }

  map.on('moveend', () => {
    const center = map.getCenter();
    localStorage.setItem('mapView', JSON.stringify({
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom()
    }));
  });

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

  document.getElementById('addMarkerBtn').addEventListener('click', () => {
    const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
    marker.bindPopup("Drag me").openPopup();
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      marker.setPopupContent(`Lat: ${pos.lat.toFixed(5)}<br>Lng: ${pos.lng.toFixed(5)}`)
        .openPopup();
    });
  });

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

  // Weather stations with their own clustering
  const weatherIcon = L.icon({
    iconUrl: './lib/weather.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const weatherClusterGroup = L.markerClusterGroup();
  map.addLayer(weatherClusterGroup);

  const weatherScript = document.createElement('script');
  weatherScript.src = './data/WEATHER_STATION.js';
  weatherScript.onload = () => {
    if (Array.isArray(window.WEATHER_STATIONS)) {
      window.WEATHER_STATIONS.forEach(station => {
        const { lat, lon } = station.coordinates;
        const marker = L.marker([lat, lon], { icon: weatherIcon });
        marker.bindPopup(`
          <strong>${station.callsign}</strong><br>
          Temp: ${station.t}°C<br>
          Humidity: ${station.h}%<br>
          Pressure: ${station.p} hPa
        `);
        weatherClusterGroup.addLayer(marker);
      });
    }
  };
  document.body.appendChild(weatherScript);

  // iGates with separate clustering and progressive loading
  const iGateClusterGroup = L.markerClusterGroup();
  map.addLayer(iGateClusterGroup);

  const iGateScript = document.createElement('script');
  iGateScript.src = './data/IGATE.js';
  iGateScript.onload = () => {
    if (!Array.isArray(window.IGATE)) {
      console.error('IGATE is not an array');
      return;
    }

    // Progress control
    const progress = L.control({ position: 'bottomleft' });
    progress.onAdd = function() {
      this.div = L.DomUtil.create('div', 'progress-control');
      this.div.innerHTML = `
        <div style="
          background: white;
          padding: 8px;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          font-size: 14px;
          max-width: 200px;
          word-wrap: break-word;
        ">
          Loading iGates: <span id="igate-progress">0</span> / ${window.IGATE.length}
        </div>
      `;
      return this.div;
    };
    progress.addTo(map);

    // Process in batches
    const batchSize = 500;
    let processed = 0;
    const total = window.IGATE.length;

    function processBatch() {
      const batchEnd = Math.min(processed + batchSize, total);
      
      for (let i = processed; i < batchEnd; i++) {
        const igate = window.IGATE[i];
        const { lat, lon } = igate.coordinates;
        const marker = L.marker([lat, lon]);
        marker.bindPopup(`
          <div style="max-width: 300px; word-wrap: break-word;">
            <strong>${igate.callsign}</strong><br>
            ${igate.message || 'No additional info'}
          </div>
        `);
        iGateClusterGroup.addLayer(marker);
      }

      processed = batchEnd;
      document.getElementById('igate-progress').textContent = processed;

      if (processed < total) {
        setTimeout(processBatch, 0);
      } else {
        setTimeout(() => map.removeControl(progress), 2000);
      }
    }

    // Start processing
    processBatch();
  };
  document.body.appendChild(iGateScript);
}
