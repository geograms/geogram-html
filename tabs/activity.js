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
  //const API_URL = 'http://api.geogram.info/messages?lat=40.2056&lon=-8.4196&radius=50';

  activityStartLocalMaps();

  
  console.log("Activity tab loaded");
}

/* Utils */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRelative(dateObj) {
  try {
    const diff = Date.now() - dateObj.getTime();
    if (!isFinite(diff)) return '';
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.round(hr / 24);
    return `${d}d ago`;
  } catch {
    return '';
  }
}
