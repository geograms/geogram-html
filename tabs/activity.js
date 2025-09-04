// tabs/activity.js (unchanged)
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Local activity</h2>
      <!-- Nearby Maps section is now fully rendered by nearby.js -->
      <div id="recent-nearby"></div>
    </div>

    <div class="right-column">
      <h2>Actions</h2>
      <div id="actions" class="card">
          <a href="#messages" onclick="loadTab('messages'); return false;" style="display: flex; align-items: center;">
            <i class="fas fa-envelope" aria-hidden="true" style="margin-right: 0.5rem;"></i>
            <span>Messages</span>
          </a>      
      </div>
        
      <h2>Stream</h2>
      <div id="stream" class="card"></div>
    </div>
  `;

  // Recent GEO events list (left as-is, independent of maps)
  activityStartLocalMaps();

  // Initialize the stream - wait a bit for DOM to be fully ready
  setTimeout(() => {
    activityLoadStream();
    // Start auto-refresh when the activity tab is loaded
    startStreamAutoRefresh();
  }, 100);

  console.log("Activity tab loaded");
}

// Optional: Add cleanup function if you navigate away from activity tab
function cleanupActivity() {
  stopStreamAutoRefresh();
}