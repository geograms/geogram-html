// lib/activity/streams.js

/**
 * Fetch and display recent messages for each configured location.
 * Uses caching to reduce API calls and displays a loading message while waiting.
 */
function activityLoadStream() {
  const URL_BASE = API_URL + '/messages?';
  const container = document.getElementById('stream');

  // Try to use cached data if it was saved within the last 5 minutes
  const cachedData = localStorage.getItem("streamCache");
  if (cachedData) {
    try {
      const cachedResults = JSON.parse(cachedData);
      const cacheTime = parseInt(localStorage.getItem("streamCacheTimestamp") || "0", 10);
      if (Date.now() - cacheTime < 300000) {
        renderStreamContent(cachedResults, container);
      } else {
        container.innerHTML = '<p>Loading...</p>';
      }
    } catch (e) {
      console.error('Error parsing cached stream data:', e);
      container.innerHTML = '<p>Loading...</p>';
    }
  } else {
    container.innerHTML = '<p>Loading...</p>';
  }

  // Retrieve stored locations
  const savedLocations = localStorage.getItem("locations");
  if (!savedLocations) {
    container.innerHTML = '<p>No locations configured. Add locations in the Config tab.</p>';
    return;
  }

  const locations = JSON.parse(savedLocations);
  if (!Array.isArray(locations) || locations.length === 0) {
    container.innerHTML = '<p>No locations configured. Add locations in the Config tab.</p>';
    return;
  }

  // Convert each configured location into coordinates and radius
  const selected = locations.map(loc => {
    const [lat, lon] = loc.coords.split(',').map(coord => parseFloat(coord.trim()));
    return {
      label: loc.label,
      lat: isNaN(lat) ? 0 : lat,
      lon: isNaN(lon) ? 0 : lon,
      radius: parseInt(loc.radius) || 50
    };
  }).filter(loc => loc.lat !== 0 && loc.lon !== 0);

  if (selected.length === 0) {
    container.innerHTML = '<p>No valid locations found. Check your coordinates in Config tab.</p>';
    return;
  }

  // Fetch messages for each location concurrently
  const fetches = selected.map(loc => {
    const url = `${URL_BASE}lat=${loc.lat}&lon=${loc.lon}&radius=${loc.radius}&limit=5`;
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
      })
      .then(data => ({ loc, data }))
      .catch(err => {
        console.error('Error fetching stream data:', err);
        return { loc, data: [] };
      });
  });

  // After all fetches complete, render the combined results
  Promise.all(fetches).then(results => {
    try {
      localStorage.setItem("streamCache", JSON.stringify(results));
      localStorage.setItem("streamCacheTimestamp", Date.now().toString());
    } catch (e) {
      console.error('Error caching stream data:', e);
    }
    renderStreamContent(results, container);
  });
}

/**
 * Render the stream data into the specified container.
 *
 * @param {Array} locationResults Array of {loc, data} objects.
 * @param {HTMLElement} container The DOM element for displaying the stream.
 */
function renderStreamContent(locationResults, container) {
  if (!locationResults || locationResults.length === 0) {
    container.innerHTML = '<p>No locations selected or no data available.</p>';
    return;
  }

  let html = '';
  let hasMessages = false;

  locationResults.forEach(({ loc, data }) => {
    if (!Array.isArray(data) || data.length === 0) return;
    hasMessages = true;

    html += `
      <div class="stream-location-section">
        <h3 style="margin: 0 0 0.5em 0; color: var(--text);">${loc.label || 'Unknown Location'}</h3>
        <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 1em;">
          ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)} (${loc.radius}km radius)
        </div>
    `;

    data.forEach(msg => {
      const timestamp = msg.timestamp || Date.now();
      const date = new Date(timestamp);
      // Use the user's local timezone or fallback to Europe/Berlin
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
      const timeString = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: tz
      });
      const dateString = date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz
      }).replace(/\//g, '-');

      html += `
        <div class="message-item" style="border-radius: 8px; background: var(--card-bg);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85em; color: var(--muted);">${timeString}</span>
            <span style="font-size: 0.85em; color: var(--muted);">${dateString}</span>
          </div>
          <div style="font-family: monospace; font-size: 0.9em; line-height: 1.4; word-break: break-all; margin-left: 1em;">
            ${escapeHtml(msg.content || 'No content available')}
          </div>
        </div>
      `;
    });

    html += '</div>';
  });

  if (!hasMessages) {
    html = '<p>No recent activity found in selected locations.</p>';
  }
  container.innerHTML = html;
}

/**
 * Escape special characters in a string to avoid HTML injection.
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -----------------------------------------------------------------------------
// Auto-refresh control
// -----------------------------------------------------------------------------

let streamRefreshInterval = null;

/**
 * Start automatically refreshing the stream every 30 seconds.
 */
function startStreamAutoRefresh() {
  // Clear any existing interval
  if (streamRefreshInterval) {
    clearInterval(streamRefreshInterval);
  }
  activityLoadStream();
  streamRefreshInterval = setInterval(activityLoadStream, 30000);
}

/**
 * Stop the auto-refresh interval (e.g. when leaving the Activity tab).
 */
function stopStreamAutoRefresh() {
  if (streamRefreshInterval) {
    clearInterval(streamRefreshInterval);
    streamRefreshInterval = null;
  }
}

// Expose functions globally for activity.js to call
window.activityLoadStream = activityLoadStream;
window.startStreamAutoRefresh = startStreamAutoRefresh;
window.stopStreamAutoRefresh = stopStreamAutoRefresh;
