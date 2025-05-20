// tabs/downloads.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column nav-column">
      <div class="card">
        <h2>Downloads</h2>
         <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#android-app" class="nav-link">Android App</a></li>
          <li><a href="#uvk5-firmware" class="nav-link">Quansheng UV-K5 Firmware</a></li>
          <li><a href="#esp32-tdongle" class="nav-link">ESP32 T-Dongle</a></li>
        </ul>
      </div>
    </div>

    <div class="right-column content-column">
        
        On this page you find links to the Geograms apps running in different devices.
        These are just meant as preview and to permit following the development and volunteer.
        </br></br>
        Please be pacient as we only aim for full interoperability/release on the 17th of July 2025.

       
      <div id="android-app">
        <h2>Android App</h2>
        <div class="card">
          <p>The official Geogram Android app allows you to connect your radio hardware, receive APRS data, record transmissions, and sync with your browser instance (when online).</p>
          <p><strong>Status:</strong> Only communicating with ESP32 T-Dongle</p>
          <p><a href="https://github.com/geograms/geogram-android" target="_blank">https://github.com/geograms/geogram-android</a></p>
        </div>
      </div>

  <div id="uvk5-firmware">
  <h2>Quansheng UV-K5 Firmware</h2>
  <div class="card" style="padding: 0em;">
    <p>
      Custom firmware for the UV-K5 and UV-K5(8) walkie-talkies enabling digital data relay, APRS compatibility, and enhanced voice monitoring features tailored for Geogram integration.
    </p>
    <p><strong>Updated:</strong> 2025-05-20</p>

    <div style="margin: 0em 0;">
      <a href="https://github.com/geograms/geogram-k5/raw/refs/heads/main/compiled-firmware/firmware.packed.bin"
         class="action-button" download>
        ⬇ Download Latest Firmware
      </a>
    </div>

    <p style="margin-top: 1em;">
      View source or contribute on GitHub:<br>
      <a href="https://github.com/geograms/geogram-k5" target="_blank">
        github.com/geograms/geogram-k5
      </a>
    </p>
  </div>
</div>


      <div id="esp32-tdongle">
        <h2>ESP32 T-Dongle</h2>
        <div class="card">
          <p>Firmware and wiring guide for the ESP32 T-Dongle S3 to act as a serial APRS decoder and Geogram-compatible micro-gateway.</p>
          <p><strong>Status:</strong> Only communicating with Android app</p>
          <p><a href="https://github.com/geograms/geogram-tdongle" target="_blank">https://github.com/geograms/geogram-tdongle</a></p>
        </div>
      </div>


    </div>
  `;

  // Navigation smooth scroll and highlight
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetElement.style.transition = 'background-color 0.5s ease';
        targetElement.style.backgroundColor = 'var(--wave-color)';
        setTimeout(() => {
          targetElement.style.backgroundColor = '';
        }, 1000);
      }
    });
  });
}
