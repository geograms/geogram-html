function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Local activity</h2>
      <!-- Nearby Maps section is now fully rendered by nearby.js -->
      <div id="recent-nearby"></div>
    </div>

    <div class="right-column">
      <h2>Stream</h2>
      <div id="stream" class="card"></div>
    </div>
  `;

  // Recent GEO events list (left as-is, independent of maps)
  activityStartLocalMaps();

  // Initialize the stream - wait a bit for DOM to be fully ready
  setTimeout(() => {
    activityLoadStream();
  }, 100);
  
  console.log("Activity tab loaded");
}

// Optional: Add cleanup function if you navigate away from activity tab
function cleanupActivity() {
  stopStreamAutoRefresh();
}