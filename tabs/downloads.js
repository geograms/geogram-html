// tabs/downloads.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="full-width">
      <h2>Downloads</h2>
      <div class="downloads-list card">
        <table id="downloads-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Size</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Downloads will populate here -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Add your downloads functionality here
  console.log("Downloads tab loaded");
}