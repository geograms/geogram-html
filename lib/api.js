
const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Talks withe the backend API to fetch messages on a specific location.
 * It will cache results in localStorage to avoid excessive API calls
 * and provide the cached data while waiting for the network.
 * @param {*} loc 
 * @param {*} URL_BASE 
 * @param {*} MAX_MESSAGES_PER_LOCATION 
 * @returns 
 */
function fetchMessagesForLocation(loc, URL_BASE, MAX_MESSAGES_PER_LOCATION) {
  try {
    const cachedData = getCachedData(loc);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
  } catch (e) {
    console.error('Error fetching cached data:', e);
  }

  const url = `${URL_BASE}lat=${loc.lat}&lon=${loc.lon}&radius=${loc.radius}&limit=${MAX_MESSAGES_PER_LOCATION}`;
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return response.json();
    })
    .then(data => {
      saveDataToCache(loc, data);
      return data;
    })
    .catch(err => {
      console.error('Error fetching stream data:', err);
      return null;
    });
}

function getCachedData(loc) {
  try {
    const cacheTimestamp = localStorage.getItem("streamCacheTimestamp");
    if (!cacheTimestamp) return null;

    const cacheData = localStorage.getItem("streamCache");
    if (!cacheData) return null;

    const cachedData = JSON.parse(cacheData);
    const currentTime = Date.now();
    const cacheTime = parseInt(cacheTimestamp);

    if (currentTime - cacheTime < CACHE_EXPIRATION_TIME) {
      const cachedResult = cachedData.find(item => item.loc.label === loc.label);
      if (cachedResult) {
        return cachedResult.data;
      }
    }
  } catch (e) {
    console.error('Error fetching cached data:', e);
  }

  return null;
}

function saveDataToCache(loc, data) {
  try {
    const cachedData = getCachedData(loc);
    const combinedData = cachedData ? [...cachedData, { loc, data }] : [{ loc, data }];
    localStorage.setItem("streamCache", JSON.stringify(combinedData));
    localStorage.setItem("streamCacheTimestamp", Date.now().toString());
  } catch (e) {
    console.error('Error caching stream data:', e);
  }
}
