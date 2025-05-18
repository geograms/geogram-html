const recordings = [];
let isListening = false;
let stream, mediaRecorder, audioContext, analyser, source;
let chunks = [];
let silenceTimer = null;
let recordingTimer = null;
let timerInterval = null;
let recordingStartTime = null;
let threshold = 10;
let isRecording = false;
let currentAudio = null;
let currentButton = null;
let db = null;

let recentPage = 0;
let favoritePage = 0;
const PAGE_SIZE = 10;

function initRecordingUI() {
  const toggleBtn = document.getElementById('toggle-listening');
  toggleBtn.onclick = () => {
    if (!isListening) {
      startListening();
      toggleBtn.textContent = "🛑 Stop Listening";
    } else {
      stopListening();
      toggleBtn.textContent = "🎧 Start Listening";
    }
  };

  initDB();
}

function initDB() {
  const request = indexedDB.open('voiceClipsDB', 1);

  request.onerror = (e) => {
    console.error('IndexedDB error:', e.target.error);
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    loadRecordingsFromDB();
  };

  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('clips')) {
      db.createObjectStore('clips', { keyPath: 'name' });
    }
  };
}

function createPagination(totalItems, currentPage, onPageChange) {
  const pageCount = Math.ceil(totalItems / PAGE_SIZE);
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '8px';
  container.style.margin = '10px 0';

  for (let i = 0; i < pageCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.disabled = i === currentPage;
    btn.onclick = () => onPageChange(i);
    container.appendChild(btn);
  }
  return container;
}

function saveRecordingToDB(clip) {
  if (!db) return;
  const tx = db.transaction('clips', 'readwrite');
  const store = tx.objectStore('clips');
  store.put(clip);
}

function loadRecordingsFromDB() {
  const tx = db.transaction('clips', 'readonly');
  const store = tx.objectStore('clips');
  const req = store.getAll();

  req.onsuccess = () => {
    const saved = req.result;
    recordings.length = 0;
    for (const clip of saved) {
      clip.url = URL.createObjectURL(clip.blob);
      recordings.push(clip);
    }
    recordings.reverse(); // newest first
    renderRecordings();
  };
}

function startListening() {
  isListening = true;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
    stream = s;
    audioContext = new AudioContext();
    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    monitorVolume();
  });
}

function stopListening() {
  isListening = false;

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  clearTimeout(silenceTimer);
  clearTimeout(recordingTimer);
  clearInterval(timerInterval);

  const wrapper = document.getElementById('volume-bar-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  const volumeEl = document.getElementById('volume-bar');
  if (volumeEl) volumeEl.style.width = '0%';

  updateTimer(true);
}

function monitorVolume() {
  const data = new Uint8Array(analyser.fftSize);

  const check = () => {
    if (!isListening) return;

    analyser.getByteTimeDomainData(data);
    const rms = Math.sqrt(data.reduce((sum, val) => sum + (val - 128) ** 2, 0) / data.length);

    const volumeEl = document.getElementById('volume-bar');
    const wrapper = document.getElementById('volume-bar-wrapper');
    if (volumeEl && wrapper) {
      const percent = Math.min(100, Math.floor((rms / 50) * 100));
      volumeEl.style.width = percent + '%';
      wrapper.style.display = 'block';
    }

    if (rms > threshold && !isRecording) {
      beginRecording();
    }

    if (isRecording && rms <= threshold) {
      if (!silenceTimer) {
        silenceTimer = setTimeout(() => {
          if (isRecording) stopRecording();
        }, 5000);
      }
    } else {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }

    requestAnimationFrame(check);
  };

  check();
}

function beginRecording() {
  chunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const iso = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const freq = document.getElementById('channel-selector')?.value || 'unknown';
    //const name = `clip-${iso}_${freq}MHz.webm`;
    const name = `clip-${iso}.webm`;

    const clip = { name, blob };
    recordings.unshift({ name, url, blob }); // newest first
    saveRecordingToDB(clip);
    renderRecordings();
    setRecordingIndicator(false);
    clearInterval(timerInterval);
    updateTimer(true);
  };

  mediaRecorder.start();
  isRecording = true;
  setRecordingIndicator(true);

  recordingStartTime = Date.now();
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);

  recordingTimer = setTimeout(() => {
    if (isRecording) stopRecording();
  }, 30000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

  isRecording = false;
  clearTimeout(silenceTimer);
  clearTimeout(recordingTimer);
  clearInterval(timerInterval);
  silenceTimer = null;
  recordingTimer = null;
  updateTimer(true);
}

function createRecordingElement(rec) {
  const li = document.createElement('li');
  li.classList.add('recording-item');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.gap = '10px';
  li.style.padding = '8px';
  li.style.borderBottom = '1px solid var(--border)';
  li.style.justifyContent = 'flex-start';

  const actionBtn = document.createElement('button');
  actionBtn.textContent = '▶';
  actionBtn.title = 'Play / Stop';
  actionBtn.style.width = '40px';
  actionBtn.style.height = '36px';
  actionBtn.style.fontSize = '1.4em';
  actionBtn.style.borderRadius = '6px';
  actionBtn.style.backgroundColor = '#444';
  actionBtn.style.color = '#fff';
  actionBtn.style.border = 'none';
  actionBtn.style.cursor = 'pointer';
  actionBtn.style.display = 'flex';
  actionBtn.style.alignItems = 'center';
  actionBtn.style.justifyContent = 'center';
  actionBtn.style.flexShrink = '0';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = rec.name;
  nameInput.style = `
    flex: 1;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    outline: none;
    margin: 0 0.5em;
  `;
  nameInput.onkeydown = (e) => { if (e.key === 'Enter') nameInput.blur(); };
  nameInput.onblur = () => {
    const newName = nameInput.value.trim();
    if (newName && newName !== rec.name) {
      const tx = db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const getReq = store.get(rec.name);
      getReq.onsuccess = () => {
        const data = getReq.result;
        data.name = newName;
        store.delete(rec.name);
        store.put(data);
        rec.name = newName;
        renderRecordings();
      };
    }
  };

  const audio = new Audio(rec.url);

  actionBtn.onclick = () => {
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (currentButton) currentButton.textContent = '▶';
    }

    if (audio.paused) {
      audio.play();
      actionBtn.textContent = '■';
      currentAudio = audio;
      currentButton = actionBtn;
    } else {
      audio.pause();
      audio.currentTime = 0;
      actionBtn.textContent = '▶';
      currentAudio = null;
      currentButton = null;
    }
  };

  audio.onended = () => {
    if (currentAudio === audio) {
      actionBtn.textContent = '▶';
      currentAudio = null;
      currentButton = null;
    }
  };

  const downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '⬇️';
  downloadBtn.title = 'Download';
  downloadBtn.style = actionBtn.style.cssText;
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name}`;
    a.click();
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Delete';
  deleteBtn.style = actionBtn.style.cssText;
  deleteBtn.onclick = () => {
    const tx = db.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    store.delete(rec.name);
    recordings.splice(recordings.indexOf(rec), 1);
    renderRecordings();
  };

  const starBtn = document.createElement('button');
  starBtn.innerHTML = rec.favorite ? '⭐' : '☆';
  starBtn.title = 'Favorite';
  starBtn.style = actionBtn.style.cssText;
  starBtn.onclick = () => {
    rec.favorite = !rec.favorite;

    const tx = db.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    const getReq = store.get(rec.name);
    getReq.onsuccess = () => {
      const data = getReq.result;
      data.favorite = rec.favorite;
      store.put(data);
      renderRecordings();
      renderFavorites();
    };
  };

  li.appendChild(actionBtn);
  li.appendChild(nameInput);
  li.appendChild(starBtn);
  li.appendChild(downloadBtn);
  li.appendChild(deleteBtn);

  return li;
}

function renderRecordings() {
  const list = document.getElementById('recording-list');
  list.innerHTML = '';

  const start = recentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  recordings.slice(start, end).forEach(rec => {
    const li = createRecordingElement(rec);
    list.appendChild(li);
  });

  const pagination = createPagination(recordings.length, recentPage, (newPage) => {
    recentPage = newPage;
    renderRecordings();
  });
  list.appendChild(pagination);

  renderFavorites();
}




function updateTimer(reset = false) {
  const el = document.getElementById('recording-timer');
  if (!el) return;

  if (reset || !recordingStartTime) {
    el.textContent = '00:00';
    return;
  }

  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  el.textContent = `${minutes}:${seconds}`;
}

function setRecordingIndicator(visible) {
  const el = document.getElementById('recording-indicator');
  if (el) el.style.display = visible ? 'block' : 'none';
}

window.initRecordingUI = initRecordingUI;

window.renderFavorites = function () {
  const favorites = recordings.filter(r => r.favorite);
  const feed = document.getElementById('activity-feed');
  feed.innerHTML = '';
  favorites.forEach(rec => {
    const div = document.createElement('div');
    div.className = 'favorite-item';
    div.textContent = rec.name;
    feed.appendChild(div);
  });
};



function createRecordingElement(rec) {
  const li = document.createElement('li');
  li.classList.add('recording-item');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.gap = '10px';
  li.style.padding = '8px';
  li.style.borderBottom = '1px solid var(--border)';
  li.style.justifyContent = 'flex-start';

  const actionBtn = document.createElement('button');
  actionBtn.textContent = '▶';
  actionBtn.title = 'Play / Stop';
  actionBtn.style.width = '40px';
  actionBtn.style.height = '36px';
  actionBtn.style.fontSize = '1.4em';
  actionBtn.style.borderRadius = '6px';
  actionBtn.style.backgroundColor = '#444';
  actionBtn.style.color = '#fff';
  actionBtn.style.border = 'none';
  actionBtn.style.cursor = 'pointer';
  actionBtn.style.display = 'flex';
  actionBtn.style.alignItems = 'center';
  actionBtn.style.justifyContent = 'center';
  actionBtn.style.flexShrink = '0';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = rec.name;
  nameInput.style = `
    flex: 1;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    outline: none;
    margin: 0 0.5em;
  `;
  nameInput.onkeydown = (e) => {
    if (e.key === 'Enter') nameInput.blur();
  };
  nameInput.onblur = () => {
    const newName = nameInput.value.trim();
    if (newName && newName !== rec.name) {
      const tx = db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const getReq = store.get(rec.name);
      getReq.onsuccess = () => {
        const data = getReq.result;
        data.name = newName;
        store.delete(rec.name);
        store.put(data);
        rec.name = newName;
        renderRecordings();
      };
    }
  };

  const audio = new Audio(rec.url);
  actionBtn.onclick = () => {
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (currentButton) currentButton.textContent = '▶';
    }
    if (audio.paused) {
      audio.play();
      actionBtn.textContent = '■';
      currentAudio = audio;
      currentButton = actionBtn;
    } else {
      audio.pause();
      audio.currentTime = 0;
      actionBtn.textContent = '▶';
      currentAudio = null;
      currentButton = null;
    }
  };
  audio.onended = () => {
    if (currentAudio === audio) {
      actionBtn.textContent = '▶';
      currentAudio = null;
      currentButton = null;
    }
  };

  const downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '⬇️';
  downloadBtn.title = 'Download';
  downloadBtn.style = actionBtn.style.cssText;
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = rec.name;
    a.click();
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Delete';
  deleteBtn.style = actionBtn.style.cssText;
  deleteBtn.onclick = () => {
    const tx = db.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    store.delete(rec.name);
    recordings.splice(recordings.indexOf(rec), 1);
    renderRecordings();
  };

  const starBtn = document.createElement('button');
  starBtn.innerHTML = rec.favorite ? '⭐' : '☆';
  starBtn.title = 'Favorite';
  starBtn.style = actionBtn.style.cssText;
  starBtn.onclick = () => {
    rec.favorite = !rec.favorite;
    const tx = db.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    const getReq = store.get(rec.name);
    getReq.onsuccess = () => {
      const data = getReq.result;
      data.favorite = rec.favorite;
      store.put(data);
      renderRecordings();
      renderFavorites();
    };
  };

  li.appendChild(actionBtn);
  li.appendChild(nameInput);
  li.appendChild(starBtn);
  li.appendChild(downloadBtn);
  li.appendChild(deleteBtn);

  return li;
}




window.renderFavorites = function () {
  const favorites = recordings.filter(r => r.favorite);
  const feed = document.getElementById('activity-feed');
  feed.innerHTML = '';
  favorites.forEach(rec => {
    const li = createRecordingElement(rec);
    feed.appendChild(li);
  });
};