// tabs/activity.js

/**
 * Render the Activity tab. This function populates the content area
 * with the local activity UI, including maps and the stream.
 */
function render() {
  document.getElementById("content").innerHTML = `
    <div class="left-column">
      <h2>Activity</h2>
      <div id="map"></div>
    </div>

    <div class="right-column">
      <h2>Chat</h2>
      <div id="recent-nearby"></div>
    </div>
  `;

  // Start the maps (handled by nearby.js)
  activityStartLocalMaps();

  // Load the stream after the DOM is ready
  setTimeout(() => {
    activityLoadStream();
    startStreamAutoRefresh(); // refresh the stream every 30 seconds
  }, 100);

  // Remove the hash from the URL without reloading
  history.replaceState(null, "", location.pathname);
  console.log("Activity tab loaded");
}

/**
 * Optional cleanup if needed when leaving the Activity tab. Stops the
 * stream auto-refresh to avoid memory leaks.
 */
function cleanupActivity() {
  stopStreamAutoRefresh();
}
