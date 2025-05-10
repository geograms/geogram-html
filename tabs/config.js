// tabs/config.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column">
      <h2>Customization</h2>
      <div class="card">
        <label for="theme-select">Color Theme</label>
        <div class="custom-select-wrapper">
          <select id="theme-select" class="styled-select">
            <option value="green">Green</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="brown">Brown</option>
            <option value="grey">Grey</option>
            <option value="red">Red</option>
            <option value="lightblue">Light Blue</option>
          </select>
        </div>
      </div>
    </div>
    <div class="right-column">
      <div class="card">
        <h2>Sections</h2>
        <ul class="nav-links">
          <li><a href="#" class="nav-link">Customization</a></li>
        </ul>
        <button id="reset-settings" class="reset-button">Reset to Default</button>
      </div>
    </div>
  `;

  // Apply immediately
  const currentTheme = localStorage.getItem('theme') || 'green';
  document.getElementById('theme-select').value = currentTheme;
  applyTheme(currentTheme);

  // Handle theme changes
  document.getElementById('theme-select').addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  });

  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
  });
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

