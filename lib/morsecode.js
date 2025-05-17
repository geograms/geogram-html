function addControlPanelStyles() {
  if (document.getElementById('control-panel-styles')) return;

  const style = document.createElement('style');
  style.id = 'control-panel-styles';
  style.textContent = `
    .control-panel {
      background-color: var(--card);
      border-radius: 8px;
      padding: 20px;
      margin: 0 auto;
      max-width: 600px;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .control-group {
      margin: 15px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .control-group label {
      width: 45%;
      text-align: left;
    }
    .control-group input {
      width: 50%;
      padding: 8px;
      background-color: #2d2d2d;
      border: 1px solid #444;
      border-radius: 4px;
      color: white;
    }
    .control-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .control-buttons button {
      flex: 1;
      padding: 10px;
      font-size: 1em;
      border-radius: 5px;
      cursor: pointer;
      border: none;
    }
    .btn-send { background-color: #228822; color: white; }
    .btn-stop { background-color: #663333; color: white; }
    .btn-download { background-color: #224466; color: white; }
    #morseOutput {
      font-family: monospace;
      font-size: 18px;
      margin-top: 10px;
      word-wrap: break-word;
    }
    .progress-bar {
      width: 100%;
      height: 10px;
      background-color: #333;
      border-radius: 5px;
      margin-top: 10px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0;
      background-color: #44cc44;
      transition: width 0.1s linear;
    }
  `;
  document.head.appendChild(style);
}

function setupMorseCodeFunctionality() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  let oscillators = [], timeoutHandles = [], progressTimer = null;
  const CUSTOM_SPACE = '--..-';
  const morseCodeMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
    '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
    '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
    '$': '...-..-', '@': '.--.-.'
  };

  function textToMorse(text) {
    return text.toUpperCase().split('').map(char => {
      if (char === ' ') return CUSTOM_SPACE;
      return morseCodeMap[char] || '';
    }).join(' ');
  }

  function updateMorseOutput() {
    const input = document.getElementById('textInput').value;
    const trigger = document.getElementById('trigger').value || '-.-.-.';
    const morse = textToMorse(input);
    document.getElementById('morseOutput').textContent = 'Morse: ' + trigger + ' ' + morse;
  }

  function playTone(duration) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.value = 0.5;
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration / 1000);
    oscillators.push(osc);
  }

  function stopMorse() {
    oscillators.forEach(osc => osc.stop());
    oscillators = [];
    timeoutHandles.forEach(id => clearTimeout(id));
    timeoutHandles = [];
    clearInterval(progressTimer);
    document.getElementById('progressBar').style.display = 'none';
  }

  function sendMorse() {
    stopMorse();
    const input = document.getElementById('textInput').value;
    const trigger = document.getElementById('trigger').value || '-.-.-.';
    const dot = parseInt(document.getElementById('dotDuration').value);
    const dash = parseInt(document.getElementById('dashDuration').value);
    const symbolGap = parseInt(document.getElementById('symbolGap').value);
    const charGap = parseInt(document.getElementById('charGap').value);
    const warmup = '--';
    const morse = `${warmup} ${trigger} ${textToMorse(input)}`;
    let time = 0;

    const totalTime = morse.split('').reduce((t, char) => {
      if (char === '.') return t + dot + symbolGap;
      if (char === '-') return t + dash + symbolGap;
      if (char === ' ') return t + charGap;
      return t;
    }, 0);

    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    let elapsed = 0;
    progressTimer = setInterval(() => {
      elapsed += 100;
      const percent = Math.min(100, (elapsed / totalTime) * 100);
      progressFill.style.width = percent + '%';
      if (elapsed >= totalTime) {
        clearInterval(progressTimer);
        setTimeout(() => progressBar.style.display = 'none', 300);
      }
    }, 100);

    for (let i = 0; i < morse.length; i++) {
      const char = morse[i];
      if (char === '.') {
        timeoutHandles.push(setTimeout(() => playTone(dot), time));
        time += dot + symbolGap;
      } else if (char === '-') {
        timeoutHandles.push(setTimeout(() => playTone(dash), time));
        time += dash + symbolGap;
      } else if (char === ' ') {
        time += charGap;
      }
    }
  }

  function generateMp3Blob(morseString, dotDuration, dashDuration, symbolGap, charGap) {
    const mp3encoder = new Lame.Mp3Encoder(1, 44100, 128);
    const samples = new Int16Array(44100 * 10); // 10 seconds max
    let sampleOffset = 0;
    let time = 0;

    const addTone = (duration) => {
      const toneSamples = duration * 44.1; // Convert ms to samples
      const freq = 800; // Hz
      for (let i = 0; i < toneSamples; i++) {
        samples[sampleOffset + i] = 32767 * Math.sin(2 * Math.PI * freq * (time + i) / 44100);
      }
      sampleOffset += toneSamples;
      time += toneSamples;
    };

    const addSilence = (duration) => {
      const silenceSamples = duration * 44.1;
      sampleOffset += silenceSamples;
      time += silenceSamples;
    };

    for (const char of morseString) {
      if (char === '.') {
        addTone(dotDuration);
        addSilence(symbolGap);
      } else if (char === '-') {
        addTone(dashDuration);
        addSilence(symbolGap);
      } else if (char === ' ') {
        addSilence(charGap);
      }
    }

    const actualSamples = samples.slice(0, sampleOffset);
    const mp3Data = mp3encoder.encodeBuffer(actualSamples);
    mp3Data.push(mp3encoder.flush());
    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  function downloadMP3() {
    const input = document.getElementById('textInput').value;
    const trigger = document.getElementById('trigger').value || '-.-.-.';
    const dot = parseInt(document.getElementById('dotDuration').value);
    const dash = parseInt(document.getElementById('dashDuration').value);
    const symbolGap = parseInt(document.getElementById('symbolGap').value);
    const charGap = parseInt(document.getElementById('charGap').value);
    const warmup = '--';
    const morse = `${warmup} ${trigger} ${textToMorse(input)}`;

    const blob = generateMp3Blob(morse, dot, dash, symbolGap, charGap);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'morse-code.mp3';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Set up event listeners
  document.getElementById('textInput').addEventListener('input', updateMorseOutput);
  document.getElementById('trigger').addEventListener('input', updateMorseOutput);
  document.getElementById('sendMorseBtn').addEventListener('click', sendMorse);
  document.getElementById('stopMorseBtn').addEventListener('click', stopMorse);
  document.getElementById('downloadMp3Btn').addEventListener('click', downloadMP3);

  // Initialize with default values
  document.getElementById('textInput').value = 'hello world!';
  updateMorseOutput();
}
