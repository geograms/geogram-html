function render() {
  // Create the map with devices around the world (it is does not work as offline yet)
  document.getElementById('content').innerHTML = `
    <div id="map-container">
      <div id="map"></div>
      <div class="map-toolbar">
        <button id="measureBtn">Measure</button>
        <button id="addMarkerBtn">Marker</button>
        <label><input type="checkbox" id="trackToggle"> Track</label>
        <div id="geocoder" style="flex: 1;"></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #map-container {
      position: fixed;
      top: 60px; /* Header height */
      left: 0;
      right: 0;
      bottom: 0;
    }
    
    #map {
      position: absolute;
      top: 0;
      bottom: 60px; /* Toolbar height */
      left: 0;
      right: 0;
    }
    
    .map-toolbar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      padding: 10px;
      background: var(--card);
      display: flex;
      gap: 8px;
      align-items: center;
      z-index: 1000;
      border-top: 1px solid var(--border);
      overflow-x: auto;
    }
    
    .leaflet-top.leaflet-left {
      top: 70px !important;
    }
    
    @media (max-width: 768px) {
      #map-container {
        top: 50px; /* Smaller header on mobile */
      }
      
      .map-toolbar {
        height: 50px;
        padding: 8px;
      }
      
      .leaflet-top.leaflet-left {
        top: 60px !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Load Leaflet only once
  if (!window.L) {
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    // https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
    leafletCSS.href = 'lib/map/leaflet.css';
    document.head.appendChild(leafletCSS);

    const geocoderCSS = document.createElement('link');
    geocoderCSS.rel = 'stylesheet';
    // https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css
    geocoderCSS.href = 'lib/map/Control.Geocoder.css';
    document.head.appendChild(geocoderCSS);

    const clusterCSS = document.createElement('link');
    clusterCSS.rel = 'stylesheet';
    // https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css
    clusterCSS.href = 'lib/map/MarkerCluster.Default.css';
    document.head.appendChild(clusterCSS);

    const leafletJS = document.createElement('script');
    // https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
    leafletJS.src = 'lib/map/leaflet.js';
    leafletJS.onload = () => {
      const geocoderJS = document.createElement('script');
      // https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js
      geocoderJS.src = 'lib/map/Control.Geocoder.js';
      geocoderJS.onload = () => {
        const clusterJS = document.createElement('script');
        // https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js
        clusterJS.src = 'lib/map/leaflet.markercluster.js';
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

  // Geocoder control
  L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', e => {
      map.fitBounds(e.geocode.bbox);
      L.marker(e.geocode.center).addTo(map)
        .bindPopup(e.geocode.name)
        .openPopup();
    }).addTo(map);

  // Restore last view
  const lastView = localStorage.getItem('mapView');
  if (lastView) {
    try {
      const { lat, lng, zoom } = JSON.parse(lastView);
      map.setView([lat, lng], zoom);
    } catch (e) {
      console.warn("Failed to parse saved map view", e);
    }
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

  // Measurement tools
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

  // Marker tools
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

  // Weather stations cluster
  const weatherClusterGroup = L.markerClusterGroup();
  map.addLayer(weatherClusterGroup);

  function loadWeatherStations() {
    const cachedWeather = localStorage.getItem('cachedWeatherStations');
    const cacheExpiry = localStorage.getItem('weatherCacheExpiry');
    const now = Date.now();

    if (cachedWeather && cacheExpiry && now < parseInt(cacheExpiry)) {
      // Load from cache
      try {
        const stations = JSON.parse(cachedWeather);
        addWeatherStations(stations, true);
      } catch (e) {
        console.error("Failed to parse cached weather data", e);
        loadFreshWeatherStations();
      }
    } else {
      // Load fresh data
      loadFreshWeatherStations();
    }
  }

  function loadFreshWeatherStations() {
    const weatherScript = document.createElement('script');
    weatherScript.src = './data/WEATHER_STATION.js';
    weatherScript.onload = () => {
      if (Array.isArray(window.WEATHER_STATIONS)) {
        // Cache for 1 hour
        localStorage.setItem('cachedWeatherStations', JSON.stringify(window.WEATHER_STATIONS));
        localStorage.setItem('weatherCacheExpiry', Date.now() + 3600000);
        addWeatherStations(window.WEATHER_STATIONS, false);
      }
    };
    document.body.appendChild(weatherScript);
  }

  function addWeatherStations(stations, fromCache) {
    const weatherIcon = L.icon({
      iconUrl: './lib/map/images/weather.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    if (fromCache) {
      console.log(`Loaded ${stations.length} weather stations from cache`);
    }

    stations.forEach(station => {
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

  // iGates cluster with progressive loading
  const iGateClusterGroup = L.markerClusterGroup();
  map.addLayer(iGateClusterGroup);

  function loadIGates() {
    if ('indexedDB' in window) {
      // Use IndexedDB for large dataset
      const request = indexedDB.open('APRSCache', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('igates')) {
          db.createObjectStore('igates', { keyPath: 'callsign' });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        checkIGateCache(db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        fallbackIGateLoad();
      };
    } else {
      // Fallback to localStorage
      fallbackIGateLoad();
    }
  }

  function checkIGateCache(db) {
    const transaction = db.transaction('igates', 'readonly');
    const store = transaction.objectStore('igates');
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      if (countRequest.result > 0) {
        // We have cached data
        const cacheTime = localStorage.getItem('igateCacheTime');
        const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity;

        if (cacheAge < 3600000) { // 1 hour
          // Load from cache
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            processIGates(getAllRequest.result, true);
          };
        } else {
          // Cache expired, load fresh but show cached data first
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            if (getAllRequest.result.length > 0) {
              processIGates(getAllRequest.result, true);
            }
            loadFreshIGates(db);
          };
        }
      } else {
        // No cache, load fresh
        loadFreshIGates(db);
      }
    };
  }

  function loadFreshIGates(db = null) {
    const iGateScript = document.createElement('script');
    iGateScript.src = './data/IGATE.js';
    iGateScript.onload = () => {
      if (Array.isArray(window.IGATE)) {
        processIGates(window.IGATE, false);

        // Cache the data
        if (db) {
          cacheIGatesInIndexedDB(db, window.IGATE);
        } else {
          cacheIGatesInLocalStorage(window.IGATE);
        }
      }
    };
    document.body.appendChild(iGateScript);
  }

  function cacheIGatesInIndexedDB(db, igates) {
    const transaction = db.transaction('igates', 'readwrite');
    const store = transaction.objectStore('igates');

    // Clear old data first
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      // Add in batches to avoid blocking
      const batchSize = 2000;
      let i = 0;

      function addBatch() {
        const batch = igates.slice(i, i + batchSize);
        if (batch.length === 0) {
          localStorage.setItem('igateCacheTime', Date.now());
          return;
        }

        batch.forEach(igate => {
          store.put(igate);
        });

        i += batchSize;
        setTimeout(addBatch, 0);
      }

      addBatch();
    };
  }

  function cacheIGatesInLocalStorage(igates) {
    try {
      // Try to save a sample to check if we have space
      const sample = igates.slice(0, 100);
      localStorage.setItem('igateSampleTest', JSON.stringify(sample));

      // If successful, save all (or in chunks if needed)
      localStorage.setItem('cachedIGates', JSON.stringify(igates));
      localStorage.setItem('igateCacheTime', Date.now());
    } catch (e) {
      console.warn("Couldn't cache iGates in localStorage:", e);
    }
  }

  function fallbackIGateLoad() {
    const cachedIGates = localStorage.getItem('cachedIGates');
    const cacheTime = localStorage.getItem('igateCacheTime');

    if (cachedIGates && cacheTime && (Date.now() - parseInt(cacheTime) < 3600000)) {
      try {
        const igates = JSON.parse(cachedIGates);
        processIGates(igates, true);
      } catch (e) {
        console.error("Failed to parse cached iGates", e);
        loadFreshIGates();
      }
    } else {
      loadFreshIGates();
    }
  }

  function processIGates(igates, fromCache) {
    if (fromCache) {
      console.log(`Loaded ${igates.length} iGates from cache`);
    } else {
      console.log(`Processing ${igates.length} fresh iGates`);
    }

    // Progress control for fresh load
    let progressControl;
    if (!fromCache) {
      progressControl = L.control({ position: 'bottomleft' });
      progressControl.onAdd = function () {
        this.div = L.DomUtil.create('div', 'progress-control');
        this.div.innerHTML = `
          <div style="
            background: white;
            padding: 8px;
            border-radius: 4px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            font-size: 14px;
          ">
            Loading iGates: <span id="igate-progress">0</span> / ${igates.length}
            ${fromCache ? '<br>(cached)' : ''}
          </div>
        `;
        return this.div;
      };
      progressControl.addTo(map);
    }

    // Process in batches
    const batchSize = 500;
    let processed = 0;

    function processBatch() {
      const batchEnd = Math.min(processed + batchSize, igates.length);

      const iGateIcon = L.icon({
        iconUrl: 'lib/map/images/antenna.png',  // Path to antenna icon
        iconSize: [25, 25],              // Size of the icon in pixels [width, height]
        iconAnchor: [12, 25],            // Point of the icon that will correspond to marker's location
        popupAnchor: [0, -25]            // Point from which the popup should open relative to the iconAnchor
      });

      for (let i = processed; i < batchEnd; i++) {
        const igate = igates[i];
        if (!igate.coordinates) continue;

        const { lat, lon } = igate.coordinates;
        //const marker = L.marker([lat, lon]);
        const marker = L.marker([lat, lon], {
          icon: iGateIcon  // Add this option to use the custom icon
        });
        marker.bindPopup(`
          <div style="max-width: 300px; word-wrap: break-word;">
            <strong>${igate.callsign}</strong><br>
            ${igate.message || 'No additional info'}
          </div>
        `);
        iGateClusterGroup.addLayer(marker);
      }

      processed = batchEnd;
      if (!fromCache && document.getElementById('igate-progress')) {
        document.getElementById('igate-progress').textContent = processed;
      }

      if (processed < igates.length) {
        setTimeout(processBatch, 0);
      } else if (!fromCache && progressControl) {
        setTimeout(() => map.removeControl(progressControl), 2000);
      }
    }

    processBatch();
  }

  // Start loading both datasets
  loadWeatherStations();
  loadIGates();
}
