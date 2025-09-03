// list the recent activity on the locations that were selected in nearby.js
function activityLoadStream() {
    // the URL where the API is available
    // example: https://api.geogram.info/messages?lat=40.2056&lon=-8.4196&radius=50
    const URL_BASE = API_URL + '/messages?'; // from internal.config.js

    // iterate the selected locations and fetch recent messages for each
    const container = document.getElementById('stream');
    
    // Check if we have cached data to show immediately
    const cachedData = localStorage.getItem("streamCache");
    if (cachedData) {
        try {
            const cachedResults = JSON.parse(cachedData);
            const cacheTimestamp = localStorage.getItem("streamCacheTimestamp");
            const cacheAge = Date.now() - (parseInt(cacheTimestamp) || 0);
            
            // Show cached data if it's less than 5 minutes old
            if (cacheAge < 300000) {
                renderStreamContent(cachedResults, container);
            } else {
                container.innerHTML = '<p>Loading...</p>';
            }
        } catch (e) {
            console.error('Error parsing cached data:', e);
            container.innerHTML = '<p>Loading...</p>';
        }
    } else {
        container.innerHTML = '<p>Loading...</p>';
    }

    /*

    We expect the replies to come on the following format:
        [
        {
            "timestamp": 1756900812323,
            "content": "CT4TX-14>APHPIW,TCPIP*,qAC,T2SYDNEY:@031159z4013.00N/00825.16W_285/007g008t083r000p000h39b10170Python APRS WX1 / Weather in Coimbra: nuvens quebradas"
        },
        {
            "timestamp": 1756902952728,
            "content": "CT4TX-16>APHPIB,TCPIP*,qAC,T2TAS:!4013.00N\\00824.78Wj#Obras-(Metro Mondego)"
        }
        ]

    */

    // Load selected locations from localStorage (same as config.js)
    const savedLocations = localStorage.getItem("locations");
    if (!savedLocations) {
        container.innerHTML = '<p>No locations configured. Add locations in the Config tab.</p>';
        return;
    }

    const locations = JSON.parse(savedLocations);
    if (!locations || locations.length === 0) {
        container.innerHTML = '<p>No locations configured. Add locations in the Config tab.</p>';
        return;
    }

    // Parse coordinates from the stored string format (e.g., "40.2056, -8.4196")
    const selectedLocations = locations.map(loc => {
        const [lat, lon] = loc.coords.split(',').map(coord => parseFloat(coord.trim()));
        return {
            label: loc.label,
            lat: isNaN(lat) ? 0 : lat,
            lon: isNaN(lon) ? 0 : lon,
            radius: parseInt(loc.radius) || 50
        };
    }).filter(loc => loc.lat !== 0 && loc.lon !== 0);

    if (selectedLocations.length === 0) {
        container.innerHTML = '<p>No valid locations found. Check your coordinates in Config tab.</p>';
        return;
    }

    const promises = [];
    for (const loc of selectedLocations) {
        // Make sure we're not using JSONP (remove any JSONP parameters)
        const url = `${URL_BASE}lat=${loc.lat}&lon=${loc.lon}&radius=${loc.radius}&limit=5`;
        promises.push(
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => ({ loc, data }))
                .catch(err => {
                    console.error('Error fetching stream data:', err);
                    return { loc, data: [] };
                })
        );
    }

    // Process all API responses and render the stream
    Promise.all(promises).then(results => {
        // Cache the results for future use
        try {
            localStorage.setItem("streamCache", JSON.stringify(results));
            localStorage.setItem("streamCacheTimestamp", Date.now().toString());
        } catch (e) {
            console.error('Error caching stream data:', e);
        }
        
        renderStreamContent(results, container);
    });
}

function renderStreamContent(locationResults, container) {
    if (!locationResults || locationResults.length === 0) {
        container.innerHTML = '<p>No locations selected or no data available.</p>';
        return;
    }

    let html = '';
    let hasMessages = false;

    locationResults.forEach(({ loc, data }) => {
        if (!data || data.length === 0) return;
        hasMessages = true;

        html += `
            <div class="stream-location-section">
                <h3 style="margin: 0 0 0.5em 0; color: var(--text);">${loc.label || 'Unknown Location'}</h3>
                <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 1em;">
                    ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)} (${loc.radius}km radius)
                </div>
        `;

        data.forEach(message => {
            const timestamp = message.timestamp || Date.now();
            const date = new Date(timestamp);
            const timeString = date.toISOString().substr(11, 8); // HH:MM:SS  
            const dateString = date.getUTCFullYear() + '-' +
                String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
                String(date.getUTCDate()).padStart(2, '0');
            
            html += `
                <div class="message-item" style="border: 0px solid var(--border); border-radius: 8px; background: var(--card-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.0em;">
                        <span style="font-size: 0.85em; color: var(--muted);">${timeString}</span>
                        <span style="font-size: 0.85em; color: var(--muted);">${dateString}</span>
                    </div>
                    <div style="font-family: monospace; font-size: 0.9em; line-height: 1.4; word-break: break-all; margin-left: 1.0em;">
                        ${escapeHtml(message.content || 'No content available')}
                    </div>
                    <hr style="margin: 0.5em 0; border: none; border-top: 1px solid var(--border);">
                </div>
            `;
        });

        html += `</div>`;
    });

    if (!hasMessages) {
        html = '<p>No recent activity found in selected locations.</p>';
    }

    container.innerHTML = html;
}

// Helper function to escape HTML special characters
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Auto-refresh functionality
let streamRefreshInterval = null;

function startStreamAutoRefresh() {
    // Clear any existing interval first
    if (streamRefreshInterval) {
        clearInterval(streamRefreshInterval);
    }
    
    // Load immediately and set up periodic refresh every 30 seconds
    activityLoadStream();
    streamRefreshInterval = setInterval(activityLoadStream, 30000); // 30 seconds
}

function stopStreamAutoRefresh() {
    if (streamRefreshInterval) {
        clearInterval(streamRefreshInterval);
        streamRefreshInterval = null;
    }
}