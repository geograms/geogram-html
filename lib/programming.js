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


function restoreDefaultChannels() {
  const defaults = [
    ["446.00625", "Emergency, truckers, baby monitors, children's use"],
    ["446.01875", "Geocaching, camping, mountain (DE/AT/CH)"],
    ["446.03125", "Preppers, bicycles, mountain (Poland)"],
    ["446.04375", "Drone intercom, off-road 4WD, boats"],
    ["446.05625", "Scout groups"],
    ["446.06875", "Events, hunters, fishermen, inland sailing (PL), Free Radio Network"],
    ["446.08125", "Mountain emergency (Spain: channel 7, tone 7)"],
    ["446.09375", "DX/calling, distress, hiking (IE), mountain (IT)"],
    ["446.10625", "DMR calling (TG99), DMR distress (TG9112), airsoft"],
    ["446.11875", "Fox hunting, amateur radio direction finding"],
    ["446.13125", ""], ["446.14375", ""], ["446.15625", ""], ["446.16875", ""], ["446.18125", ""],
    ["446.19375", ""], ["446.20625", ""], ["446.21875", ""], ["446.23125", ""], ["446.24375", ""],
    ["144.390", "APRS North America terrestrial (primary iGate frequency)"],
    ["144.800", "APRS Europe, Africa, Asia, Oceania terrestrial"],
    ["144.575", "APRS Spain, Portugal terrestrial"],
    ["145.825", "APRS downlink: ISS, NO-84 (PSAT-1), PSAT-2, ARISS, Falconsat-3"],
    ["437.550", "APRS UHF downlink: LilacSat-1 (experimental)"],
    ["437.100", "APRS UHF downlink: QIKCOM-1 (experimental)"],
    ["", ""], ["", ""], ["", ""], ["", ""]
  ];

  const rows = document.querySelectorAll('#channelTable tbody tr');
  rows.forEach((row, i) => {
    row.cells[1].querySelector('input').value = defaults[i][0];
    row.cells[2].querySelector('input').value = defaults[i][1];
  });
}



  // Load saved data on page load
  window.addEventListener('DOMContentLoaded', () => {
    loadChannelsFromDB();
  });
