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


/*
let sending = false;
let progressInterval = null;
let progressValue = 0;

function sendToRadio() {
  const button = document.getElementById('sendToRadioBtn');
  const wrap = document.getElementById('radioProgressWrap');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressPercent');

  if (sending) {
    clearInterval(progressInterval);
    button.textContent = 'Send to radio';
    wrap.style.display = 'none';
    bar.style.width = '0%';
    label.textContent = '0%';
    sending = false;
    progressValue = 0;
    return;
  }

  sending = true;
  progressValue = 0;
  button.textContent = 'Stop sending';
  wrap.style.display = 'flex';

  progressInterval = setInterval(() => {
    progressValue += 10;
    bar.style.width = `${progressValue}%`;
    label.textContent = `${progressValue}%`;

    if (progressValue >= 100) {
      clearInterval(progressInterval);
      button.textContent = 'Send to radio';
      wrap.style.display = 'none';
      bar.style.width = '0%';
      label.textContent = '0%';
      sending = false;
      progressValue = 0;
    }
  }, 1000);
}

*/

let sending = false;
let progressValue = 0;


function sendToRadio() {
  const button = document.getElementById('sendToRadioBtn');
  const wrap = document.getElementById('radioProgressWrap');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressPercent');

  if (sending) {
    sending = false;
    stopMorse();
    button.textContent = 'Send to radio';
    wrap.style.display = 'none';
    bar.style.width = '0%';
    label.textContent = '0%';
    return;
  }

  // Collect messages to send
  const trigger = document.getElementById('trigger').value;
  const charGap = parseInt(document.getElementById('charGap').value) || 200;
  const rows = document.querySelectorAll('#channelTable tbody tr');
  const messages = [];

  rows.forEach((row, index) => {
    const ch = (index + 1).toString().padStart(2, '0');
    const freq = row.cells[1].querySelector('input').value.trim();
    if (!freq) return;

    const parts = freq.split('.');
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

    const pre = parts[0].padStart(3, '0');
    const post = parts[1].padEnd(5, '0');
    const cmd = `M${ch}${pre}${post}`;
    messages.push(`${trigger}${' '.repeat(charGap > 0 ? 1 : 0)}${cmd}`);
  });

  if (messages.length === 0) {
    alert('No valid channels to send.');
    return;
  }

  // Start sending
  sending = true;
  progressValue = 0;
  button.textContent = 'Stop';
  wrap.style.display = 'flex';

  // Helper function to introduce a delay
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sequentially send messages via sendMorse from morsecode.js
  async function transmit(index) {
    if (!sending || index >= messages.length) {
      finalize();
      return;
    }

    const percent = Math.round((index / messages.length) * 100);
    bar.style.width = `${percent}%`;
    label.textContent = `${percent}%`;

    await sendMorseFromText(messages[index]);
    console.log(`Sent: ${messages[index]}`);
    await delay(3000); // Wait for 3 seconds before sending the next message
    transmit(index + 1);


  }

  function finalize() {
    button.textContent = 'Send to radio';
    wrap.style.display = 'none';
    bar.style.width = '0%';
    label.textContent = '0%';
    sending = false;
    progressValue = 0;
  }

  transmit(0);
}

