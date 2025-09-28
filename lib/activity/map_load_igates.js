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

    /**
     * Main initialization function - call this when map is ready
     * @param {L.Map} map - Leaflet map instance
     */
    window.loadIGateStations = function(map) {
        if (!map || !window.L) {
            console.error('Map or Leaflet not available');
            return;
        }

        currentMap = map;
        initializeClusterGroup();
        loadIGateData();
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
     */
    function loadIGateData() {
        if (isLoading || loadedOnce) {
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

    /**
     * Load data using IndexedDB for better performance with large datasets
     */
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

    /**
     * Check cache validity and decide whether to load from cache or fetch fresh data
     * @param {IDBDatabase} db - IndexedDB database instance
     */
    function checkCacheAndLoad(db) {
        const transaction = db.transaction(['igates'], 'readonly');
        const store = transaction.objectStore('igates');
        
        // Check if we have cached data and when it was stored
        const timestampKey = localStorage.getItem(CONFIG.TIMESTAMP_KEY);
        const cacheAge = timestampKey ? Date.now() - parseInt(timestampKey) : Infinity;

        if (cacheAge < CONFIG.CACHE_DURATION) {
            console.log('Loading IGATE data from IndexedDB cache...');
            loadFromCache(store);
        } else {
            console.log('Cache expired or missing, fetching fresh data...');
            // Load cache first if available, then fetch fresh data
            loadFromCache(store, true); // true = also fetch fresh
            fetchFreshData(db);
        }
    }

    /**
     * Load data from IndexedDB cache
     * @param {IDBObjectStore} store - IndexedDB object store
     * @param {boolean} alsoFetchFresh - Whether to also fetch fresh data after cache
     */
    function loadFromCache(store, alsoFetchFresh = false) {
        const request = store.getAll();
        
        request.onsuccess = function() {
            const cachedData = request.result;
            if (cachedData && cachedData.length > 0) {
                console.log(`Found ${cachedData.length} cached IGATE entries`);
                processBatchedData(cachedData.map(item => item.data));
            } else if (!alsoFetchFresh) {
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

    /**
     * Fallback to localStorage for caching (limited storage)
     */
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

    /**
     * Fetch fresh data from the API endpoint
     * Handles network errors and invalid JSON gracefully
     * @param {IDBDatabase} db - Optional IndexedDB instance for caching
     */
    function fetchFreshData(db = null) {
        console.log('Fetching fresh IGATE data from API...');
        
        // Create script element to load JSONP-style data
        const script = document.createElement('script');
        script.src = CONFIG.DATA_URL;
        
        script.onload = function() {
            try {
                if (window.IGATE && Array.isArray(window.IGATE)) {
                    console.log(`Received ${window.IGATE.length} fresh IGATE entries`);
                    const processedData = preprocessData(window.IGATE);
                    processBatchedData(processedData);
                    cacheData(processedData, db);
                    loadedOnce = true;
                } else {
                    console.error('Invalid IGATE data format received');
                    handleLoadError();
                }
            } catch (e) {
                console.error('Error processing fresh IGATE data:', e);
                handleLoadError();
            } finally {
                document.body.removeChild(script);
                isLoading = false;
            }
        };

        script.onerror = function() {
            console.warn('Failed to fetch fresh data, using cached version if available');
            document.body.removeChild(script);
            handleLoadError();
        };

        document.body.appendChild(script);
    }

    /**
     * Preprocess raw data to extract only needed fields and validate entries
     * @param {Array} rawData - Raw IGATE data from API
     * @returns {Array} Processed data with only required fields
     */
    function preprocessData(rawData) {
        const processed = [];
        
        for (let i = 0; i < rawData.length; i++) {
            try {
                const entry = rawData[i];
                
                // Validate required fields
                if (!entry.coordinates || !entry.callsign) {
                    continue;
                }
                
                const { lat, lon } = entry.coordinates;
                if (typeof lat !== 'number' || typeof lon !== 'number' || 
                    isNaN(lat) || isNaN(lon) || 
                    lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    continue;
                }

                // Extract only needed data
                processed.push({
                    callsign: entry.callsign,
                    lat: lat,
                    lon: lon,
                    message: entry.message || 'No additional info',
                    date: entry.date || Date.now()
                });
            } catch (e) {
                console.warn(`Error processing entry ${i}:`, e);
                continue;
            }
        }
        
        console.log(`Processed ${processed.length} valid entries from ${rawData.length} raw entries`);
        return processed;
    }

    /**
     * Process data in batches to avoid blocking the browser
     * @param {Array} data - Processed IGATE data
     */
    function processBatchedData(data) {
        if (!data || data.length === 0) {
            isLoading = false;
            return;
        }

        processedCount = 0;
        console.log(`Starting batched processing of ${data.length} IGATE entries...`);

        function processBatch() {
            const batchEnd = Math.min(processedCount + CONFIG.BATCH_SIZE, data.length);
            
            try {
                for (let i = processedCount; i < batchEnd; i++) {
                    addIGateMarker(data[i]);
                }
                
                processedCount = batchEnd;
                
                if (processedCount < data.length) {
                    // Continue with next batch asynchronously
                    setTimeout(processBatch, 0);
                } else {
                    console.log(`Completed processing ${data.length} IGATE entries`);
                    isLoading = false;
                    loadedOnce = true;
                }
            } catch (e) {
                console.error('Error in batch processing:', e);
                // Try to continue with next batch
                processedCount = batchEnd;
                if (processedCount < data.length) {
                    setTimeout(processBatch, 10);
                } else {
                    isLoading = false;
                }
            }
        }

        processBatch();
    }

    /**
     * Add individual IGATE marker to the map
     * Creates clean circular dots without icons or squares
     * @param {Object} station - IGATE station data
     */
    function addIGateMarker(station) {
        if (!currentMap || !station || typeof station.lat !== 'number' || typeof station.lon !== 'number') {
            return;
        }

        try {
            // Create simple circular dot marker
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
            
            // Format date for display
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

    /**
     * Cache processed data for future use
     * @param {Array} data - Processed data to cache
     * @param {IDBDatabase} db - Optional IndexedDB instance
     */
    function cacheData(data, db = null) {
        const timestamp = Date.now();
        
        if (db) {
            // Use IndexedDB for large datasets
            try {
                const transaction = db.transaction(['igates'], 'readwrite');
                const store = transaction.objectStore('igates');
                
                // Clear old data
                const clearRequest = store.clear();
                clearRequest.onsuccess = function() {
                    // Add new data in batches
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
            // Fallback to localStorage (with size limitations)
            try {
                const sampleData = data.slice(0, Math.min(1000, data.length)); // Limit size for localStorage
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sampleData));
                localStorage.setItem(CONFIG.TIMESTAMP_KEY, timestamp.toString());
                console.log(`Cached ${sampleData.length} entries in localStorage`);
            } catch (e) {
                console.warn('Failed to cache in localStorage (quota exceeded?):', e);
            }
        }
    }

    /**
     * Handle loading errors gracefully
     */
    function handleLoadError() {
        isLoading = false;
        console.warn('Failed to load IGATE data, will retry on next page load');
        
        // Try to load any existing cache as fallback
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

    /**
     * Clean up resources when switching pages
     */
    window.cleanupIGateStations = function() {
        if (clusterGroup && currentMap) {
            currentMap.removeLayer(clusterGroup);
            clusterGroup = null;
        }
        currentMap = null;
        isLoading = false;
        processedCount = 0;
        // Note: don't reset loadedOnce to avoid reloading when coming back
    };

    console.log('IGATE loader module initialized');
})();