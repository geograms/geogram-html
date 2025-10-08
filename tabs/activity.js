// tabs/activity.js

/**
 * Render the Activity tab. This function populates the content area
 * with the local activity UI, including maps and the stream.
 */
function render() {
  document.getElementById("content").innerHTML = `
      <div id="map"></div>
      <div id="recent-nearby"></div>
  `;

  // Start the maps (handled by nearby.js)
  activityStartLocalMaps();

  // Load the stream after the DOM is ready
  /*setTimeout(() => {
    activityLoadStream();
    startStreamAutoRefresh(); // refresh the stream every 30 seconds
  }, 100);
  */
  // Remove the hash from the URL without reloading
  history.replaceState(null, "", location.pathname);
  console.log("Activity tab loaded");
}

/**
 * Cleanup when leaving the Activity tab. Stops the nearby map and cleans up resources.
 */
function cleanupActivity() {
  // Clean up the nearby map
  if (typeof window.cleanupNearbyMap === 'function') {
    window.cleanupNearbyMap();
  }

  // Clear the content area
  const contentEl = document.getElementById('content');
  if (contentEl) {
    contentEl.innerHTML = '';
  }

  console.log('[activity] Cleaned up');
}

// Expose cleanup function globally
window.cleanupActivity = cleanupActivity;