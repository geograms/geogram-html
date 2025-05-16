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
  if (wrapper) {
    wrapper.style.display = 'none';
  }
  const volumeEl = document.getElementById('volume-bar');
  if (volumeEl) {
    volumeEl.style.width = '0%';
  }

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
    const name = `clip-${iso}_${freq}MHz.mp3`;

    recordings.push({ name, url, blob });
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

function renderRecordings() {
  const list = document.getElementById('recording-list');
  list.innerHTML = '';

  recordings.forEach(rec => {
    const li = document.createElement('li');
    li.textContent = rec.name + ' ';

    const actionBtn = document.createElement('button');
    actionBtn.textContent = 'Play';

    const audio = new Audio(rec.url);

    actionBtn.onclick = () => {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentButton) currentButton.textContent = 'Play';
      }

      if (audio.paused) {
        audio.play();
        actionBtn.textContent = 'Stop';
        currentAudio = audio;
        currentButton = actionBtn;

        audio.onended = () => {
          actionBtn.textContent = 'Play';
          currentAudio = null;
          currentButton = null;
        };
      } else {
        audio.pause();
        audio.currentTime = 0;
        actionBtn.textContent = 'Play';
        currentAudio = null;
        currentButton = null;
      }
    };

    li.appendChild(actionBtn);
    list.appendChild(li);
  });
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
