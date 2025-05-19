  const DB_NAME = 'geogramChannels';
  const STORE_NAME = 'channelData';
  const DB_VERSION = 1;

  // Initialize or open IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (e) => reject(e);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'channel' });
        }
      };
    });
  }

  // Save current channel table to IndexedDB
  async function saveChannelsToDB() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const rows = document.querySelectorAll('#channelTable tbody tr');

    store.clear(); // Reset all rows before saving new ones
    rows.forEach((row) => {
      const channel = parseInt(row.cells[0].textContent.trim());
      const freq = row.cells[1].querySelector('input').value.trim();
      const desc = row.cells[2].querySelector('input').value.trim();
      store.put({ channel, freq, desc });
    });

    tx.oncomplete = () => console.log('Channels saved to IndexedDB');
  }

  // Load from IndexedDB and apply to DOM
  async function loadChannelsFromDB() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const rows = document.querySelectorAll('#channelTable tbody tr');

    rows.forEach((row) => {
      const channel = parseInt(row.cells[0].textContent.trim());
      const request = store.get(channel);
      request.onsuccess = () => {
        if (request.result) {
          row.cells[1].querySelector('input').value = request.result.freq || '';
          row.cells[2].querySelector('input').value = request.result.desc || '';
        }
      };
    });
    tx.oncomplete = () => {
    attachChannelInputListeners();
};
  }

  // save automatically on blur
function attachChannelInputListeners() {
  document.querySelectorAll('#channelTable input').forEach(input => {
    input.addEventListener('blur', () => {
      saveChannelsToDB();
    });
  });
}

  // Load saved data on page load
  window.addEventListener('DOMContentLoaded', () => {
    loadChannelsFromDB();
  });
