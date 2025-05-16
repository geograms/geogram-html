function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Recent</h2>
      <div id="activity-feed" class="card"></div>

      <h2>Voice Notes</h2>
      <div class="card" id="voice-notes">
        <div id="recording-indicator" style="display: none; margin: 10px 0;">
          <div class="pulse-circle"></div>
          <span>Recording...</span>
          <span id="recording-timer" style="margin-left: 10px; font-weight: bold;">00:00</span>
        </div>
        <div id="volume-bar-wrapper" style="margin-top: 10px; display: none;">
          <div id="volume-bar" style="
            height: 10px;
            width: 0;
            background-color: limegreen;
            transition: width 0.1s ease;
          "></div>
        </div>
        <ul id="recording-list" class="card" style="margin-top: 10px;"></ul>
      </div>
    </div>

    <div class="right-column">
      <button id="toggle-listening" class="card" style="
        font-size: 1.2em;
        padding: 12px;
        background-color:rgb(22, 51, 23);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        border-radius: 6px;
      ">
        🎧 Start Listening
      </button>

      <h2>Channel</h2>
      <select id="channel-selector" class="styled-select">
        <option value="446.00625">446.00625 MHz (PMR channel 1)</option>
        <option value="446.01875">446.01875 MHz (PMR channel 2)</option>
        <option value="446.03125">446.03125 MHz (PMR channel 3)</option>
        <option value="446.04375">446.04375 MHz (PMR channel 4)</option>
        <option value="446.05625">446.05625 MHz (PMR channel 5)</option>
        <option value="446.06875">446.06875 MHz (PMR channel 6)</option>
        <option value="446.08125">446.08125 MHz (PMR channel 7)</option>
        <option value="446.09375">446.09375 MHz (PMR channel 8)</option>
      </select>

      <h2>Nearby</h2>
      <div id="nearby-stations" class="card"></div>
      <h2>Groups</h2>
      <div id="groups" class="card"></div>
      <h2>People</h2>
      <div id="people" class="card"></div>
      <h2>Things</h2>
      <div id="things" class="card"></div>
    </div>
  `;

  console.log("Activity tab loaded");

  if (typeof initRecordingUI === 'function') {
    initRecordingUI();
  }
}
