// --- map_load_igates.js (updated) ---
/**
 * IGATE Data Loader for APRS Station Maps
 * 
 * Configuration URLs and Settings:
 * - Data Source: https://api.geogram.radio/files/IGATE.js
 * - Cache Duration: 1 hour (3600000 ms)
 * - Batch Processing Size: 1000 entries per batch
 * - Icon: Antenna icon for APRS stations
 * - Color Scheme: Fluorescent green for dark theme compatibility
 */

(function() {
    'use strict';

    // Configuration constants
    const CONFIG = {
        DATA_URL: 'https://api.geogram.radio/files/IGATE.js',
        CACHE_DURATION: 3600000, // 1 hour in milliseconds
        BATCH_SIZE: 1000, // Process entries in batches to avoid blocking
        STORAGE_KEY: 'igate_cache_data',
        TIMESTAMP_KEY: 'igate_cache_timestamp',
        // Individual marker settings - adjust SINGLE_MARKER_SIZE to change dot size
        SINGLE_MARKER_SIZE: 8, // Change this value to make dots smaller/larger
        SINGLE_MARKER_COLOR: '#00ff41', // Green for single stations
        // Cluster color scheme
        CLUSTER_COLORS: {
            small: '#ffff00',  // Yellow for 2-5 stations
            medium: '#ff4400', // Red for 6+ stations
            large: '#ff0000'   // Bright red for large clusters
        },
        CLUSTER_SIZES: {
            small: 20,   // 2-5 stations
            medium: 30,  // 6-20 stations
            large: 40    // 21+ stations
        },
        CLUSTER_OPTIONS: {
            maxClusterRadius: 50,
            disableClusteringAtZoom: 15,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        }
    };

    // Global state management
    let isLoading = false;
    let loadedOnce = false;
    let currentMap = null;
    let clusterGroup = null;
    let processedCount = 0;
    let loadingCallCount = 0; // Track number of times loading is called

    /**
     * Main initialization function - call this when map is ready
     * @param {L.Map} map - Leaflet map instance
     * @param {boolean} forceReload - Force reload even if already loaded once
     */
    window.loadIGateStations = function(map, forceReload = false) {
        loadingCallCount++;
        
        // Prevent multiple simultaneous loading attempts
        if (isLoading && !forceReload) {
            console.log(`IGATE loading already in progress (call #${loadingCallCount}), skipping...`);
            return;
        }
        
        // Wrap in try-catch to prevent external errors from breaking loading
        try {
            if (!map || !window.L) {
                console.error('Map or Leaflet not available for IGATE loading');
                return;
            }

            // If we're switching to a new map instance or forcing reload, reset state
            if (currentMap !== map || forceReload) {
                console.log(`Initializing IGATE loader (call #${loadingCallCount}) - forceReload: ${forceReload}, new map: ${currentMap !== map}`);

                // --- FIX: detach previous clusterGroup from old map and allow clean re-init ---
                if (clusterGroup && currentMap) {
                    try { currentMap.removeLayer(clusterGroup); } catch (_) {}
                    clusterGroup = null; // force fresh cluster group on the new map
                }

                currentMap = map;
                isLoading = false;
                if (forceReload) {
                    loadedOnce = false;
                    processedCount = 0;
                    console.log('Reset loading state for forced reload');
                }
            }

            // Only initialize cluster group if not already done
            if (!clusterGroup) {
                initializeClusterGroup();
            }
            
            // Use setTimeout to isolate from any external JavaScript errors and prevent double calls
            setTimeout(() => {
                try {
                    loadIGateData();
                } catch (isolatedError) {
                    console.error('Isolated error in IGATE data loading:', isolatedError);
                    isLoading = false;
                }
            }, 100);
            
        } catch (externalError) {
            console.error('External error prevented IGATE loading:', externalError);
            isLoading = false;
            // Don't retry automatically to prevent infinite loops
        }
    };

    /**
     * Initialize the marker cluster group for IGATE stations
     * Uses color-coded clustering: green (1), yellow (2-5), red (6+)
     */
    function initializeClusterGroup() {
        if (!window.L || !window.L.markerClusterGroup) {
            console.warn('MarkerClusterGroup not available, loading stations without clustering');
            return;
        }

        // Create cluster group with custom color-coded styling
        clusterGroup = L.markerClusterGroup({
            ...CONFIG.CLUSTER_OPTIONS,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let color, size;
                
                if (count === 1) {
                    // This shouldn't happen in clusters, but just in case
                    color = CONFIG.SINGLE_MARKER_COLOR;
                    size = CONFIG.SINGLE_MARKER_SIZE;
                } else if (count <= 5) {
                    color = CONFIG.CLUSTER_COLORS.small;
                    size = CONFIG.CLUSTER_SIZES.small;
                } else if (count <= 20) {
                    color = CONFIG.CLUSTER_COLORS.medium;
                    size = CONFIG.CLUSTER_SIZES.medium;
                } else {
                    color = CONFIG.CLUSTER_COLORS.large;
                    size = CONFIG.CLUSTER_SIZES.large;
                }

                return L.divIcon({
                    html: `<div style="
                        width: ${size}px;
                        height: ${size}px;
                        background: ${color};
                        border-radius: 50%;
                        border: 2px solid rgba(255,255,255,0.3);
                        box-shadow: 0 0 6px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${size > 25 ? '12px' : '10px'};
                        font-weight: bold;
                        color: ${count <= 5 ? '#000' : '#fff'};
                        line-height: 1;
                    ">${count}</div>`,
                    className: 'igate-cluster-marker',
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2]
                });
            }
        });

        currentMap.addLayer(clusterGroup);
    }

    /**
     * Main data loading orchestrator
     * Handles cache checking, fresh data loading, and fallback scenarios
     * Reset loading state if we encounter errors to allow retry on next navigation
     */
    function loadIGateData() {
        if (isLoading) {
            console.log('IGATE loading already in progress, skipping...');
            return;
        }
        
        if (loadedOnce && clusterGroup && clusterGroup.getLayers().length > 0) {
            console.log('IGATE stations already loaded and visible, skipping...');
            return;
        }
        
        isLoading = true;
        console.log('Starting IGATE data load process...');

        // Try IndexedDB first for large datasets, fallback to localStorage
        if ('indexedDB' in window) {
            loadFromIndexedDB();
        } else {
            loadFromLocalStorage();
        }
    }

    // --- rest of file unchanged below ---

    function loadFromIndexedDB() {
        const request = indexedDB.open('APRSCache', 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('igates')) {
                db.createObjectStore('igates', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            checkCacheAndLoad(db);
        };

        request.onerror = function(event) {
            console.warn('IndexedDB not available, falling back to localStorage');
            loadFromLocalStorage();
        };
    }

    function checkCacheAndLoad(db) {
        const transaction = db.transaction(['igates'], 'readonly');
        const store = transaction.objectStore('igates');
        
        const timestampKey = localStorage.getItem(CONFIG.TIMESTAMP_KEY);
        const cacheAge = timestampKey ? Date.now() - parseInt(timestampKey) : Infinity;

        if (cacheAge < CONFIG.CACHE_DURATION) {
            console.log('Loading IGATE data from IndexedDB cache...');
            loadFromCache(store);
        } else {
            console.log('Cache expired or missing, fetching fresh data...');
            loadFromCache(store, true); // true = also fetch fresh
            fetchFreshData(db);
        }
    }

    function loadFromCache(store, alsoFetchFresh = false) {
        const request = store.getAll();
        
        request.onsuccess = function() {
            const cachedData = request.result;
            if (cachedData && cachedData.length > 0) {
                console.log(`Found ${cachedData.length} cached IGATE entries`);
                const processedData = cachedData.map(item => item.data);
                
                if (cachedData.length < 1000 && !alsoFetchFresh) {
                    console.warn(`Cache has only ${cachedData.length} entries, fetching fresh data`);
                    fetchFreshData();
                } else {
                    processBatchedData(processedData);
                    if (alsoFetchFresh) {
                        setTimeout(() => fetchFreshData(), 2000);
                    }
                }
            } else if (!alsoFetchFresh) {
                console.log('No cached data found, fetching fresh');
                fetchFreshData();
            }
        };

        request.onerror = function() {
            console.warn('Failed to load from cache, fetching fresh data');
            if (!alsoFetchFresh) {
                fetchFreshData();
            }
        };
    }

    function loadFromLocalStorage() {
        const cached = localStorage.getItem(CONFIG.STORAGE_KEY);
        const timestamp = localStorage.getItem(CONFIG.TIMESTAMP_KEY);
        
        const cacheAge = timestamp ? Date.now() - parseInt(timestamp) : Infinity;
        
        if (cached && cacheAge < CONFIG.CACHE_DURATION) {
            try {
                const data = JSON.parse(cached);
                console.log(`Loading ${data.length} IGATE entries from localStorage cache`);
                processBatchedData(data);
                return;
            } catch (e) {
                console.warn('Failed to parse cached data:', e);
            }
        }
        
        fetchFreshData();
    }

    function fetchFreshData(db = null) {
        console.log('Fetching fresh IGATE data from API...');
        
        const script = document.createElement('script');
        script.src = CONFIG.DATA_URL;
        
        script.onload = function() {
            try {
                if (window.IGATE && Array.isArray(window.IGATE)) {
                    console.log(`✅ Received ${window.IGATE.length} fresh IGATE entries from API`);
                    const processedData = preprocessData(window.IGATE);
                    
                    if (processedData.length > 0) {
                        processBatchedData(processedData);
                        cacheData(processedData, db);
                    } else {
                        console.warn('No valid IGATE data after preprocessing');
                        handleLoadError();
                    }
                } else {
                    console.error('Invalid IGATE data format received:', typeof window.IGATE);
                    handleLoadError();
                }
            } catch (e) {
                console.error('Error processing fresh IGATE data:', e);
                handleLoadError();
            } finally {
                try {
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                } catch (cleanupError) {
                    console.warn('Error cleaning up script element:', cleanupError);
                }
                
                if (isLoading) {
                    setTimeout(() => {
                        isLoading = false;
                    }, 1000);
                }
            }
        };

        script.onerror = function() {
            console.warn('❌ Failed to fetch fresh IGATE data from API, using cached version if available');
            try {
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
            } catch (e) {
                console.warn('Error removing failed script:', e);
            }
            handleLoadError();
        };

        const timeout = setTimeout(() => {
            console.warn('IGATE data fetch timeout, cancelling request');
            script.onerror();
        }, 30000); // 30 second timeout

        script.onload = ((originalOnload) => {
            return function() {
                clearTimeout(timeout);
                originalOnload.apply(this, arguments);
            };
        })(script.onload);

        script.onerror = ((originalOnerror) => {
            return function() {
                clearTimeout(timeout);
                originalOnerror.apply(this, arguments);
            };
        })(script.onerror);

        document.body.appendChild(script);
    }

    function preprocessData(rawData) {
        const processed = [];
        
        for (let i = 0; i < rawData.length; i++) {
            try {
                const entry = rawData[i];
                
                if (!entry.coordinates || !entry.callsign) {
                    continue;
                }
                
                const { lat, lon } = entry.coordinates;
                if (typeof lat !== 'number' || typeof lon !== 'number' || 
                    isNaN(lat) || isNaN(lon) || 
                    lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    continue;
                }

                processed.push({
                    callsign: entry.callsign,
                    lat: lat,
                    lon: lon,
                    message: entry.message || 'No additional info',
                    date: entry.date || Date.now()
                });
            } catch (e) {
                console.warn(`Error processing entry ${i}:`, e);
            }
        }
        
        console.log(`Processed ${processed.length} valid entries from ${rawData.length} raw entries`);
        return processed;
    }

    function processBatchedData(data) {
        if (!data || data.length === 0) {
            console.warn('No IGATE data to process');
            isLoading = false;
            return;
        }

        processedCount = 0;
        console.log(`Starting batched processing of ${data.length} IGATE entries...`);

        function processBatch() {
            if (!currentMap || !clusterGroup) {
                console.warn('Map or cluster group not available, stopping processing');
                isLoading = false;
                return;
            }

            const batchEnd = Math.min(processedCount + CONFIG.BATCH_SIZE, data.length);
            let batchSuccessCount = 0;
            
            try {
                for (let i = processedCount; i < batchEnd; i++) {
                    try {
                        addIGateMarker(data[i]);
                        batchSuccessCount++;
                    } catch (markerError) {
                        console.warn(`Failed to add marker ${i}:`, markerError);
                    }
                }
                
                processedCount = batchEnd;
                console.log(`Processed batch: ${processedCount}/${data.length} (${batchSuccessCount} successful in this batch)`);
                
                if (processedCount < data.length) {
                    setTimeout(processBatch, 5);
                } else {
                    console.log(`✅ Completed processing all ${data.length} IGATE entries (${clusterGroup.getLayers().length} markers added)`);
                    isLoading = false;
                    loadedOnce = true;
                }
            } catch (e) {
                console.error('Error in batch processing:', e);
                processedCount = batchEnd;
                if (processedCount < data.length) {
                    console.log('Retrying next batch after error...');
                    setTimeout(processBatch, 100);
                } else {
                    console.warn('Processing completed with errors');
                    isLoading = false;
                    loadedOnce = true;
                }
            }
        }

        processBatch();
    }

    function addIGateMarker(station) {
        if (!currentMap || !station || typeof station.lat !== 'number' || typeof station.lon !== 'number') {
            return;
        }

        try {
            const icon = L.divIcon({
                html: `<div style="
                    width: ${CONFIG.SINGLE_MARKER_SIZE}px;
                    height: ${CONFIG.SINGLE_MARKER_SIZE}px;
                    background: ${CONFIG.SINGLE_MARKER_COLOR};
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.4);
                    box-shadow: 0 0 4px rgba(0,255,65,0.6);
                "></div>`,
                className: 'igate-single-marker',
                iconSize: [CONFIG.SINGLE_MARKER_SIZE, CONFIG.SINGLE_MARKER_SIZE],
                iconAnchor: [CONFIG.SINGLE_MARKER_SIZE/2, CONFIG.SINGLE_MARKER_SIZE/2],
                popupAnchor: [0, -CONFIG.SINGLE_MARKER_SIZE/2]
            });

            const marker = L.marker([station.lat, station.lon], { icon });
            const dateStr = station.date ? new Date(station.date).toLocaleString() : 'Unknown';
            
            marker.bindPopup(`
                <div style="max-width: 300px; word-wrap: break-word; background: #1a1a1a; color: #fff; padding: 8px; border-radius: 4px;">
                    <strong style="color: ${CONFIG.SINGLE_MARKER_COLOR};">${station.callsign}</strong><br>
                    <small style="color: #ccc;">Last seen: ${dateStr}</small><br>
                    <div style="margin-top: 8px; font-size: 0.9em;">
                        ${station.message}
                    </div>
                </div>
            `);

            if (clusterGroup) {
                clusterGroup.addLayer(marker);
            } else {
                marker.addTo(currentMap);
            }
        } catch (e) {
            console.warn('Error adding marker for station:', station.callsign, e);
        }
    }

    function cacheData(data, db = null) {
        const timestamp = Date.now();
        
        if (db) {
            try {
                const transaction = db.transaction(['igates'], 'readwrite');
                const store = transaction.objectStore('igates');
                
                const clearRequest = store.clear();
                clearRequest.onsuccess = function() {
                    let batchIndex = 0;
                    function addBatch() {
                        const batchEnd = Math.min(batchIndex + 500, data.length);
                        
                        for (let i = batchIndex; i < batchEnd; i++) {
                            store.add({ data: data[i] });
                        }
                        
                        batchIndex = batchEnd;
                        if (batchIndex < data.length) {
                            setTimeout(addBatch, 0);
                        }
                    }
                    addBatch();
                };
                
                localStorage.setItem(CONFIG.TIMESTAMP_KEY, timestamp.toString());
                console.log('Data cached successfully in IndexedDB');
            } catch (e) {
                console.warn('Failed to cache in IndexedDB:', e);
            }
        } else {
            try {
                const sampleData = data.slice(0, Math.min(1000, data.length));
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sampleData));
                localStorage.setItem(CONFIG.TIMESTAMP_KEY, timestamp.toString());
                console.log(`Cached ${sampleData.length} entries in localStorage`);
            } catch (e) {
                console.warn('Failed to cache in localStorage (quota exceeded?):', e);
            }
        }
    }

    function handleLoadError() {
        isLoading = false;
        console.warn('Failed to load IGATE data, will retry on next page load');
        
        if (!loadedOnce) {
            const cached = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    console.log('Using stale cache as fallback');
                    processBatchedData(data);
                } catch (e) {
                    console.error('Stale cache is also corrupted');
                }
            }
        }
    }

    window.cleanupIGateStations = function() {
        if (clusterGroup && currentMap) {
            currentMap.removeLayer(clusterGroup);
            clusterGroup.clearLayers();
            clusterGroup = null; // ensure re-init next time
        }
        currentMap = null;
        isLoading = false;
        processedCount = 0;
        loadedOnce = false;
        console.log('IGATE stations cleanup completed');
    };

    window.clearIGateCache = function() {
        console.log('Clearing IGATE cache...');
        
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            localStorage.removeItem(CONFIG.TIMESTAMP_KEY);
            console.log('localStorage cache cleared');
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }
        
        if ('indexedDB' in window) {
            try {
                const deleteRequest = indexedDB.deleteDatabase('APRSCache');
                deleteRequest.onsuccess = function() {
                    console.log('IndexedDB cache cleared successfully');
                };
                deleteRequest.onerror = function(e) {
                    console.warn('Failed to clear IndexedDB:', e);
                };
            } catch (e) {
                console.warn('Error clearing IndexedDB:', e);
            }
        }
        
        loadedOnce = false;
        isLoading = false;
        processedCount = 0;
        
        console.log('Cache clearing initiated. Refresh the page to reload fresh data.');
    };

    console.log('IGATE loader module initialized');
})();
