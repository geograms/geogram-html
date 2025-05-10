// tabs/activity.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Recent</h2>
      <div id="activity-feed" class="card">
        <!-- Activity items will be loaded here -->
      </div>
    </div>
    <div class="right-column">
      <h2>Nearby</h2>
      <div id="nearby-stations" class="card">
        <!-- Nearby stations will be loaded here -->
      </div>
      <h2>Groups</h2>
      <div id="groups" class="card">
        <!-- Groups will be loaded here -->
      </div>
      <h2>People</h2>
      <div id="people" class="card">
        <!-- People will be loaded here -->
      </div>
      <h2>Things</h2>
      <div id="things" class="card">
        <!-- Things will be loaded here -->
      </div>
    </div>
  `;

  // Add your combined activity/nearby functionality here
  console.log("Activity tab loaded");
}
