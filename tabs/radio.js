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
          <li><a href="#remotecontrol" class="nav-link">Remote Control</a></li>
          <li><a href="#programming" class="nav-link">Channel programming</a></li>
          <li><a href="#morsecode" class="nav-link">Morse Code Tunning</a></li>
        </ul>
      </div>
  </div>



     <div class="right-column content-column">




<div id="remotecontrol" class="card" style="margin-bottom: 2em; padding: 1em;">
  <h2>Remote Control</h2>
  <p>Send commands to the walkie talkie remotely via morse code.</p>

  <!-- Ping -->
  <div class="remote-control-group">
    <label style="grid-column: 1;">Ping</label>
    <div style="display: flex; gap: 0.5em; grid-column: 2;">
      <button class="action-button">Send</button>
    </div>
    <div style="grid-column: 2;">
      <small>Discover which compatible devices are nearby</small>
    </div>
  </div>

  <!-- Memorize Channel -->
  <div class="remote-control-group">
    <label style="grid-column: 1;">Memorize Channel</label>
    <div style="display: flex; gap: 0.5em; grid-column: 2;">
      <select class="channel-input">
        ${Array.from({ length: 30 }, (_, i) => {
    const ch = (i + 1).toString().padStart(2, '0');
    return `<option value="${ch}">${ch}</option>`;
  }).join('')}
    </select>
      <input type="text" placeholder="Frequency (MHz)" class="channel-input" />
      <button class="action-button">Send</button>
    </div>
    <div style="grid-column: 2;">
      <small>Defines a channel with a specific frequency, such as 415.12345</small>
    </div>
  </div>

  <!-- Change Channel -->
  <div class="remote-control-group">
    <label style="grid-column: 1;">Change Channel</label>
    <div style="display: flex; gap: 0.5em; grid-column: 2;">
      <select class="channel-input">
        ${Array.from({ length: 30 }, (_, i) => {
    const ch = (i + 1).toString().padStart(2, '0');
    return `<option value="${ch}">${ch}</option>`;
  }).join('')}
    </select>      <button class="action-button">Send</button>
    </div>
    <div style="grid-column: 2;">
      <small>Changes to a channel saved in memory</small>
    </div>
  </div>

  <!-- Select Channel -->
  <div class="remote-control-group">
    <label style="grid-column: 1;">Select Channel</label>
    <div style="display: flex; gap: 0.5em; grid-column: 2;">
      <select class="channel-input">
        ${Array.from({ length: 30 }, (_, i) => {
    const ch = (i + 1).toString().padStart(2, '0');
    return `<option value="${ch}">${ch}</option>`;
  }).join('')}
    </select>      <button class="action-button">Send</button>
    </div>
    <div style="grid-column: 2;">
      <small>Selects channel to be used</small>
    </div>
  </div>

  <!-- Broadcast Message -->
  <div class="remote-control-group">
    <label style="grid-column: 1;">Broadcast Message</label>
    <div style="display: flex; gap: 0.5em; grid-column: 2;">
      <input type="text" maxlength="30" placeholder="Message text" class="channel-input" style="flex: 1;" />
      <button class="action-button">Send</button>
    </div>
    <div style="grid-column: 2;">
      <small>Sends a digital message to everyone in reach</small>
    </div>
  </div>

<!-- Monitor Channels -->
<div class="remote-control-group">
  <label style="grid-column: 1;">Monitor Channels</label>
  <div style="grid-column: 2;">
    <div style="display: flex; align-items: flex-start; gap: 1em; flex-wrap: wrap;">
      <div id="monitor-channel-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 0.5em; flex: 1;">
        ${Array.from({ length: 30 }, (_, i) => {
          const ch = (i + 1).toString().padStart(2, '0');
          return `<label><input type="checkbox" value="${ch}" /> ${ch}</label>`;
        }).join('')}
      </div>
      <div>
        <button class="action-button">Send</button>
      </div>
    </div>
    <small>Listen for voice or data on the selected channels (e.g.: 01, 05, 07)</small>
  </div>
</div>











     

<div id="programming" class="card" style="margin-bottom: 2em; padding: 1em;">
  <h2>Channel programming</h2>
  

  Edit the values below with the frequencies you want to use. When you are ready, send the values to the radio. 

  <div style="display: flex; align-items: center; gap: 1em; margin-top: 2em;">
    <button style="margin-left: 1em;" id="sendToRadioBtn" class="action-button">Send to radio</button>
    <div id="radioProgressWrap" style="display: none; align-items: center; gap: 0.5em; margin-left: 1em;">
      <div id="progressContainer" style="width: 120px; height: 8px; background: #444; border-radius: 4px; overflow: hidden;">
        <div id="progressBar" style="height: 100%; width: 0%; background-color: var(--accent); transition: width 0.2s;"></div>
    </div>
  <span id="progressPercent" style="font-size: 0.9em; color: var(--text);">0%</span>
</div>
</div>

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

  <div style="margin-left: 1em; margin-top: 1em; display: flex; gap: 1em;">
    <button id="resetChannelsBtn" class="action-button">Reset to default values</button>
    <button id="exportChannelsBtn" class="action-button">Export</button>
    <button id="importChannelsBtn" class="action-button">Import</button>
    <input type="file" id="importFileInput" accept=".json" style="display: none;" />
  </div>

  

</div>


    <div id="morsecode">
      <h2>Morse Code Tuning</h2>
      Use this tool for communication tuning with walkie talkies.
      </br></br>
      <div>
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
    <button id="resetMorseBtn" class="action-button" style="margin-top: 1em;">Reset to default values</button>
  </div>  

  </div>
  `;

  addControlPanelStyles();
  setupMorseCodeFunctionality();
  loadChannelsFromDB();
  attachChannelInputListeners();
  setupAnchorNavigation("radio");

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

  const trigger = () => document.getElementById('trigger').value;
  const charGap = () => parseInt(document.getElementById('charGap').value || '200');

  // Helper to send command as Morse
  async function transmitCommand(code) {
    stopMorse(); // Stop previous before triggering
    //const full = `${trigger()} ${code}`;
    const full = `${code}`;
    await sendMorseFromText(full);
  }


  // Attach handlers to Remote Control buttons

  const remoteGroups = document.querySelectorAll('#remotecontrol .remote-control-group');

  remoteGroups.forEach(group => {
    const label = group.querySelector('label')?.textContent?.toLowerCase() || '';
    const btn = group.querySelector('button');

    let sending = false; // Track sending state for each button

    btn.addEventListener('click', async () => {
      if (sending) {
        // Stop sending
        sending = false;
        btn.textContent = 'Send';
        stopMorse(); // Stop the Morse code transmission
        return;
      }

      let cmd = '';

      if (label.includes('ping')) {
        cmd = 'P:';
      }

      else if (label.includes('memorize')) {
      const inputs = group.querySelectorAll('.channel-input');
      const ch = inputs[0].value.padStart(2, '0');
      let freq = inputs[1].value.trim();

      // Validate and format frequency
      const freqRegex = /^\d{3}\.\d{5}$/;
      if (!freqRegex.test(freq)) {
        return alert('Invalid frequency format. Please use the format NNN.nnnnn (e.g., 446.00625).');
      }

      if (!ch || !freq) return alert('Invalid input.');
      cmd = `M${ch}:${freq}`;


      }else if (label.includes('change')) {
        const ch = group.querySelector('input[type="number"]').value.padStart(2, '0');
        if (!ch) return alert('Invalid input.');
        cmd = `C:${ch}`;
      }

      else if (label.includes('select')) {
        const ch = group.querySelector('input[type="number"]').value.padStart(2, '0');
        if (!ch) return alert('Invalid input.');
        cmd = `S:${ch}`;
      }

      else if (label.includes('broadcast')) {
        const msg = group.querySelector('input[type="text"]').value.trim();
        if (!msg) return alert('Message empty.');
        cmd = `B:${msg}`;
      }

      else if (label.includes('monitor')) {
        const checkboxes = group.querySelectorAll('input[type="checkbox"]:checked');
        const val = Array.from(checkboxes).map(cb => cb.value).join(',');
        if (!val) return alert('Select at least one channel');
        cmd = `O:${val}`;
      }

    if (cmd) {
      sending = true;
      btn.textContent = 'Stop'; // Change button text to "Stop"
      btn.classList.add('running'); // Add the "running" class
      await transmitCommand(cmd);
      sending = false;
      btn.textContent = 'Send'; // Reset button text to "Send" after completion
      btn.classList.remove('running'); // Remove the "running" class
    }

    });
  });



  document.getElementById('exportChannelsBtn').addEventListener('click', () => {
    const rows = document.querySelectorAll('#channelTable tbody tr');
    const data = Array.from(rows).map(row => ({
      channel: row.cells[0].textContent.trim(),
      freq: row.cells[1].querySelector('input').value.trim(),
      desc: row.cells[2].querySelector('input').value.trim(),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'channels.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  document.getElementById('importChannelsBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  
  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return alert("Invalid JSON");
    }
  
    const rows = document.querySelectorAll('#channelTable tbody tr');
    data.forEach((item, i) => {
      if (!rows[i]) return;
      rows[i].cells[1].querySelector('input').value = item.freq || '';
      rows[i].cells[2].querySelector('input').value = item.desc || '';
    });
  
    saveChannelsToDB();
  });
  


}

