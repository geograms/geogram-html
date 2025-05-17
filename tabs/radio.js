// tabs/control.js
function render() {
  // Load LameJS library dynamically
  if (!window.Lame) {
    const script = document.createElement('script');
    script.src = 'lib/lame.min.js';
    script.onload = initializeControlPanel;
    document.head.appendChild(script);
  } else {
    initializeControlPanel();
  }
}

function initializeControlPanel() {
  const content = document.getElementById('content');
  content.innerHTML = `


        <div class="left-column nav-column">
      <div class="card">
        <h2>Radio</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#morsecode" class="nav-link">Morse Code Generator</a></li>
        </ul>
      </div>
    </div>

    <div class="right-column content-column" id="morsecode">
      <h2>Morse Code Generator</h2>
      Use this tool for direct communication with Walkie Talkies.
      </br></br>
      <div class="control-panel">
        <div class="control-group">
          <label for="trigger">Trigger Sequence:</label>
          <input type="text" id="trigger" value="-.-.-.">
        </div>
        <div class="control-group">
          <label for="textInput">Text to Convert (A-Z, 0-9, punctuation):</label>
          <input type="text" id="textInput" maxlength="100" pattern="[A-Za-z0-9 .,!?'/()&:;=+\-_$@\"]+">
        </div>
        <div class="control-group">
          <label for="dotDuration">Dot Duration (ms):</label>
          <input type="number" id="dotDuration" value="10">
        </div>
        <div class="control-group">
          <label for="dashDuration">Dash Duration (ms):</label>
          <input type="number" id="dashDuration" value="200">
        </div>
        <div class="control-group">
          <label for="symbolGap">Symbol Gap (ms):</label>
          <input type="number" id="symbolGap" value="130">
        </div>
        <div class="control-group">
          <label for="charGap">Char Gap (ms):</label>
          <input type="number" id="charGap" value="260">
        </div>

        <div id="morseOutput">Morse: </div>
        <div class="progress-bar" id="progressBar" style="display: none;">
          <div class="progress-bar-fill" id="progressFill"></div>
        </div>

        <div class="control-buttons">
          <button class="btn-send" id="sendMorseBtn">Send</button>
          <button class="btn-stop" id="stopMorseBtn">Stop</button>
          <button class="btn-download" id="downloadMp3Btn">Download MP3</button>
        </div>
      </div>
    </div>
  `;

  addControlPanelStyles();
  setupMorseCodeFunctionality();
}

