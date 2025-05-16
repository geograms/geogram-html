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
        <ul id="recording-list" style="margin-top: 10px;"></ul>
      </div>
    </div>

    <div class="right-column">
      <button id="toggle-listening" class="card">🎧 Start Listening</button>

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
