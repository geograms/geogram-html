// tabs/config.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="full-width">
      <h2>Configuration</h2>
      <div class="config-sections">
        <div class="config-section card">
          <h3>User Preferences</h3>
          <!-- Config form elements -->
        </div>
        <div class="config-section card">
          <h3>System Settings</h3>
          <!-- Config form elements -->
        </div>
      </div>
    </div>
  `;

  // Add your configuration functionality here
  console.log("Config tab loaded");
}