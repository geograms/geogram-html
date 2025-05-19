// tabs/radio.js
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

function switchPreset(preset) {
  ['preset-pmr', 'preset-aprs', 'preset-full'].forEach(id => {
    document.getElementById(id).style.display = (id === 'preset-' + preset) ? '' : 'none';
  });
}

function initializeControlPanel() {
  const content = document.getElementById('content');
  content.innerHTML = `


  <div class="left-column nav-column">
      <div class="card">
        <h2>Radio</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#programming" class="nav-link">Channel programming</a></li>
          <li><a href="#morsecode" class="nav-link">Morse Code Generator</a></li>
        </ul>
      </div>
    </div>



     <div class="right-column content-column">

<div id="programming" class="card" style="margin-bottom: 2em; padding: 1em;">
  <h2>Channel programming</h2>
  Program the walkie talkie channel frequencies:  <button style="margin-left: 1em;" id="sendToRadioBtn" class="action-button">Send to radio</button>
  <br><br>Edit the values below with the frequencies you want to use. <br>Attention: this tool only works for walkie talkies with the geogram firmware installed.
  <br>

  <div style="margin-bottom: 1em;">
    
  </div>

  <table id="channelTable" class="styled-table" style="margin-top: 1em; width: 100%;">
    <colgroup>
      <col style="width: 05%;">  <!-- Channel -->
      <col style="width: 10%;">  <!-- Frequency -->
      <col style="width: 85%;">  <!-- Description -->
    </colgroup>
    <thead>
      <tr>
        <th>Channel</th>
        <th>Frequency (MHz)</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="channel"; style="text-align: center;">1</td>
        <td><input type="text" class="channel-input" value="446.00625" /></td>
        <td><input type="text" class="channel-input" value="Emergency, truckers, baby monitors, children's use" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">2</td>
        <td><input type="text" class="channel-input" value="446.01875" /></td>
        <td><input type="text" class="channel-input" value="Geocaching, camping, mountain (DE/AT/CH)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">3</td>
        <td><input type="text" class="channel-input" value="446.03125" /></td>
        <td><input type="text" class="channel-input" value="Preppers, bicycles, mountain (Poland)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">4</td>
        <td><input type="text" class="channel-input" value="446.04375" /></td>
        <td><input type="text" class="channel-input" value="Drone intercom, off-road 4WD, boats" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">5</td>
        <td><input type="text" class="channel-input" value="446.05625" /></td>
        <td><input type="text" class="channel-input" value="Scout groups" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">6</td>
        <td><input type="text" class="channel-input" value="446.06875" /></td>
        <td><input type="text" class="channel-input" value="Events, hunters, fishermen, inland sailing (PL), Free Radio Network" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">7</td>
        <td><input type="text" class="channel-input" value="446.08125" /></td>
        <td><input type="text" class="channel-input" value="Mountain emergency (Spain: channel 7, tone 7)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">8</td>
        <td><input type="text" class="channel-input" value="446.09375" /></td>
        <td><input type="text" class="channel-input" value="DX/calling, distress, hiking (IE), mountain (IT)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">9</td>
        <td><input type="text" class="channel-input" value="446.10625" /></td>
        <td><input type="text" class="channel-input" value="DMR calling (TG99), DMR distress (TG9112), airsoft" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">10</td>
        <td><input type="text" class="channel-input" value="446.11875" /></td>
        <td><input type="text" class="channel-input" value="Fox hunting, amateur radio direction finding" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">11</td>
        <td><input type="text" class="channel-input" value="446.13125" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">12</td>
        <td><input type="text" class="channel-input" value="446.14375" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">13</td>
        <td><input type="text" class="channel-input" value="446.15625" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">14</td>
        <td><input type="text" class="channel-input" value="446.16875" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">15</td>
        <td><input type="text" class="channel-input" value="446.18125" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">16</td>
        <td><input type="text" class="channel-input" value="446.19375" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">17</td>
        <td><input type="text" class="channel-input" value="446.20625" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">18</td>
        <td><input type="text" class="channel-input" value="446.21875" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">19</td>
        <td><input type="text" class="channel-input" value="446.23125" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">20</td>
        <td><input type="text" class="channel-input" value="446.24375" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">21</td>
        <td><input type="text" class="channel-input" value="144.390" /></td>
        <td><input type="text" class="channel-input" value="APRS North America terrestrial (primary iGate frequency)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">22</td>
        <td><input type="text" class="channel-input" value="144.800" /></td>
        <td><input type="text" class="channel-input" value="APRS Europe, Africa, Asia, Oceania terrestrial" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">23</td>
        <td><input type="text" class="channel-input" value="144.575" /></td>
        <td><input type="text" class="channel-input" value="APRS Spain, Portugal terrestrial" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">24</td>
        <td><input type="text" class="channel-input" value="145.825" /></td>
        <td><input type="text" class="channel-input" value="APRS downlink: ISS, NO-84 (PSAT-1), PSAT-2, ARISS, Falconsat-3" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">25</td>
        <td><input type="text" class="channel-input" value="437.550" /></td>
        <td><input type="text" class="channel-input" value="APRS UHF downlink: LilacSat-1 (experimental)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">26</td>
        <td><input type="text" class="channel-input" value="437.100" /></td>
        <td><input type="text" class="channel-input" value="APRS UHF downlink: QIKCOM-1 (experimental)" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">27</td>
        <td><input type="text" class="channel-input" value="" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">28</td>
        <td><input type="text" class="channel-input" value="" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">29</td>
        <td><input type="text" class="channel-input" value="" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
      <tr>
        <td class="channel"; style="text-align: center;">30</td>
        <td><input type="text" class="channel-input" value="" /></td>
        <td><input type="text" class="channel-input" value="" /></td>
      </tr>
    </tbody>
  </table>

  <button id="resetChannelsBtn" class="action-button" style="margin-left: 1em;margin-top: 1em;">Reset to default channel values</button>


</div>


    <div id="morsecode">
      <h2>Morse Code Generator</h2>
      Use this tool for direct communication with walkie talkies.
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
  </div>  

  </div>
  `;

  addControlPanelStyles();
  setupMorseCodeFunctionality();
  loadChannelsFromDB();
  attachChannelInputListeners();

  // attach an action to the reset button
  document.getElementById('resetChannelsBtn').addEventListener('click', async () => {
    const confirmed = confirm("Are you sure you want to reset all channels to default?");
    if (!confirmed) return;
  
    const db = await openDB();
    const tx = db.transaction('channelData', 'readwrite');
    tx.objectStore('channelData').clear();
  
    tx.oncomplete = () => {
      restoreDefaultChannels();
      saveChannelsToDB();
    };
  });

  // attach an action to the send button
  document.getElementById('sendToRadioBtn').addEventListener('click', () => {
    sendToRadio();
  });


}

