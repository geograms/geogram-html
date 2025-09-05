// tabs/activity.js

/**
 * Render the Activity tab. This function populates the content area
 * with the local activity UI, including maps and the stream.
 */
function render() {
  document.getElementById("content").innerHTML = `
    <div class="left-column">
      <h2>Local activity</h2>
      <!-- Nearby maps and points of interest (rendered by nearby.js) -->
      <div id="recent-nearby"></div>
    </div>

    <div class="right-column">
      <h2>Actions</h2>
      <div id="actions" class="card">
        <!-- Clicking this link loads the Messages page via loadMessages() -->
          <a href="#messages" style="display: flex; align-items: center;">
            <i class="fas fa-envelope" aria-hidden="true" style="margin-right: 0.5rem;"></i>
            <span>Messages</span>
        </a>
      </div>
      
      <h2>Stream</h2>
      <div id="stream" class="card"></div>
    </div>
  `;

  // Start the maps (handled by nearby.js)
  activityStartLocalMaps();

  // Load the stream after the DOM is ready
  setTimeout(() => {
    activityLoadStream();
    startStreamAutoRefresh(); // refresh the stream every 30 seconds
  }, 100);

  console.log("Activity tab loaded");
}

/**
 * Optional cleanup if needed when leaving the Activity tab. Stops the
 * stream auto-refresh to avoid memory leaks.
 */
function cleanupActivity() {
  stopStreamAutoRefresh();
}
