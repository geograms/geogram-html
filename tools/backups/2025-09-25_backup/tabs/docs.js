// tabs/docs.js
function render() {
  document.getElementById('content').innerHTML = `
    <div class="left-column nav-column">
      <div class="card">
        <h2>Documentation</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#introduction" class="nav-link">Introduction</a></li>
          <li><a href="#features" class="nav-link">Features</a></li>
          <li><a href="#getting-started" class="nav-link">Getting Started</a></li>
          <li><a href="#hardware" class="nav-link">Hardware</a></li>
          <li><a href="#upload-firmware" class="nav-link">Upload firmware to Walkie Talkie</a></li>
          <li><a href="#configuration" class="nav-link">Configuration</a></li>
          <li><a href="#privacy" class="nav-link">Privacy & Security</a></li>
          <li><a href="#troubleshooting" class="nav-link">Troubleshooting</a></li>
          <li><a href="#contact" class="nav-link">Contact & Support</a></li>
          <li><a href="#license" class="nav-link">License</a></li>
        </ul>
      </div>

      <div class="card">
        <h2>Downloads</h2>
        <ul class="nav-links" style="list-style: none; padding-left: 0;">
          <li><a href="#android-app" class="nav-link">Android App</a></li>
          <li><a href="#uvk5-firmware" class="nav-link">Quansheng UV-K5 Firmware</a></li>
          <li><a href="#esp32-tdongle" class="nav-link">ESP32 T-Dongle</a></li>
          <li><a href="#html" class="nav-link">HTML app</a></li>
        </ul>
      </div>

    </div>



    <div class="right-column content-column">
      <div id="introduction">
        <h2>Introduction</h2>
        <div class="card">
          <p>Welcome to the documentation for geogram. This application allows you to connect with others while maintaining control over your data and privacy.</p>
          
          <h3>Key Principles</h3>
          <ul>
            <li><strong>Decentralized:</strong> No central servers control your communications</li>
            <li><strong>Private:</strong> Your data stays on your devices</li>
            <li><strong>Open:</strong> Built on open standards and protocols</li>
            <li><strong>User-controlled:</strong> You decide what to share and with whom</li>
          </ul>
        </div>
      </div>

      <div id="features">
        <h2>Features</h2>
        <div class="card">
          <h3>Core Functionality</h3>
          <ul>
            <li>Secure peer-to-peer messaging</li>
            <li>Location-based alerts and notifications</li>
            <li>Customizable user profiles</li>
            <li>Multiple theme options</li>
            <li>Country and coordinate-based filtering</li>
          </ul>
          
          <h3>Technical Highlights</h3>
          <ul>
            <li>Built on APRS and NOSTR protocols for decentralized communication</li>
            <li>All data stored locally in your browser</li>
            <li>No server-side storage of personal information</li>
            <li>End-to-end encrypted where applicable</li>
          </ul>
        </div>
      </div>

      <div id="getting-started">
        <h2>Getting Started</h2>
        <div class="card">
          <h3>First Time Setup</h3>
          <ol>
            <li>Set your username or callsign in the Configuration tab</li>
            <li>Generate or enter your NOSTR private key</li>
            <li>Configure your locations of interest (countries or coordinates)</li>
            <li>Select your preferred color theme</li>
          </ol>
          
          <h3>Browser Requirements</h3>
          <p>This application works best with modern browsers that support:</p>
          <ul>
            <li>JavaScript ES6+</li>
            <li>LocalStorage API</li>
            <li>Geolocation API (for location features)</li>
            <li>WebSocket connections</li>
          </ul>
        </div>
      </div>

      
      <div id="hardware">
        <h2>Hardware</h2>
        <div class="card">
        This is a list of material you need for using this web application.
          <ul>
            <li><a href="https://www.aliexpress.com/wholesale?SearchText=quansheng+uv-k5" target="_blank">Walkie-Talkie -> Buy Quansheng UV-K5 on AliExpress</a></li>
            <li><a href="https://www.aliexpress.com/wholesale?SearchText=usb+serial+programming+cable+baofeng" target="_blank">USB serial cable (for flashing) -> on AliExpress</a></li>
            <li><a href="https://www.aliexpress.com/wholesale?SearchText=quangsheng-kenwood male connector" target="_blank">Buy the audio cable on AliExpress</a></li>
          </ul>
        </div>
      </div>




      <div id="upload-firmware">
        <h2>Flashing the Quansheng UV-K5 Walkie Talkie</h2>
        <div class="card">
          <h3>Instructions</h3>
          <ol>
            <li>Connect a USB-to-Serial cable (Baofeng/Kenwood 2-pin compatible) to your PC and the radio.</li>
            <li>Press the PTT button and turn ON the power. The flashlight Led must turn ON</li>
            <li>Use a browser like Chrome or Edge. Firefox is not supported.</li>
            <li>If Chrome doesn't work, check the admin rights (in Ubuntu, you need to install Chrome from the source)</li>
            <li>Open this web app and go to the programming or flashing section.</li>
            <li>When prompted, select the correct serial port (you should see "USB-SERIAL CH340" or similar).</li>
            <li>Click the button to start the flashing process. Watch the progress bar to follow the upload.</li>
            <li>After the process completes, the radio will reboot with the new firmware.</li>
          </ol>

          <h3>Browser Requirements</h3>
          <ul>
            <li>Use Chromium-based browsers (Chrome, Edge, Brave, etc.)</li>
            <li>When it works, you will be prompted to choose a serial device.</li>
            <li>If nothing appears, verify your USB cable and drivers (CH340 or CP2102).</li>
          </ul>

          <h3>Video Tutorial</h3>
          <iframe width="100%" height="315" src="https://www.youtube.com/embed/-m2_gXkR5VE" title="Flashing UV-K5 Walkie Talkie" frameborder="0" allowfullscreen></iframe>
          <p><a href="https://www.youtube.com/watch?v=-m2_gXkR5VE" target="_blank">Watch on YouTube</a></p>
        </div>
      </div>


      <div id="configuration">
        <h2>Configuration</h2>
        <div class="card">
          <h3>User Settings</h3>
          <p>In the Configuration tab you can:</p>
          <ul>
            <li>Set your display name</li>
            <li>Manage your NOSTR keys (generate new or use existing)</li>
            <li>View your public key for sharing</li>
          </ul>
          
          <h3>Location Settings</h3>
          <p>You can configure:</p>
          <ul>
            <li>Countries you want to monitor</li>
            <li>Specific coordinates with radius for alerts</li>
            <li>Use your current location</li>
          </ul>
          
          <h3>Appearance</h3>
          <p>Choose from several color themes to customize the application's look and feel.</p>
        </div>
      </div>

      <div id="privacy">
        <h2>Privacy & Security</h2>
        <div class="card">
          <h3>Data Handling</h3>
          <p>This application follows strict privacy principles:</p>
          <ul>
            <li>All user data is stored locally in your browser</li>
            <li>No personal information is sent to or stored on any servers</li>
            <li>NOSTR private keys never leave your device</li>
            <li>Location data is only used when explicitly requested</li>
          </ul>
          
          <h3>Security Features</h3>
          <ul>
            <li>End-to-end encryption for private messages</li>
            <li>Client-side key generation and management</li>
            <li>No tracking or analytics</li>
            <li>Open source code for transparency</li>
          </ul>
        </div>
      </div>

      <div id="troubleshooting">
        <h2>Troubleshooting</h2>
        <div class="card">
          <h3>Common Issues</h3>
          
          <h4>Messages not sending/receiving</h4>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify your NOSTR relays are accessible</li>
            <li>Ensure your system clock is accurate</li>
          </ul>
          
          <h4>Location features not working</h4>
          <ul>
            <li>Make sure you've granted location permissions</li>
            <li>Check if your browser supports geolocation</li>
            <li>Try refreshing the page</li>
          </ul>
          
          <h4>Settings not saving</h4>
          <ul>
            <li>Ensure cookies/local storage isn't disabled</li>
            <li>Try clearing site data and reconfiguring</li>
            <li>Check for browser updates</li>
          </ul>
        </div>
      </div>

      <div id="contact">
        <h2>Contact & Support</h2>
        <div class="card">
          <h3>Community Support</h3>
          <p>For help and community discussions:</p>
          <ul>
            <li>GitHub Discussions: <a href="https://github.com/orgs/geograms/discussions" target="_blank">https://github.com/orgs/geograms/discussions</a></li>
          </ul>
          
          <h3>Reporting Issues</h3>
          <p>To report bugs or security issues:</p>
          <ul>
            <li>GitHub Issues: <a href="https://github.com/geograms/geogram-html/issues" target="_blank">https://github.com/geograms/geogram-html/issues</a></li>
            <li>Security reports: Please open a new issue</li>
          </ul>
        </div>
      </div>

      <div id="license">
        <h2>License</h2>
        <div class="card">
          <h3>Apache License 2.0</h3>
          <pre>
Copyright 2025 Geogram

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
          </pre>
          <p>The complete license text is available at <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank">apache.org/licenses/LICENSE-2.0</a></p>
        </div>
      </div>


<div id="android-app">
        <h2>Android App</h2>
        <div class="card">
          <p>The official Geogram Android app allows you to connect your radio hardware, receive APRS data, record transmissions, and sync with your browser instance (when online).</p>
          <p><strong>Status:</strong> Only communicating with ESP32 T-Dongle</p>
          <p> View the source or contribute on GitHub: 
          <a href="https://github.com/geograms/geogram-android" target="_blank">https://github.com/geograms/geogram-android</a>
          </p>
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
        ⬇ Download Firmware
      </a>

      <a href="https://egzumer.github.io/uvtools/?firmwareURL=https://github.com/geograms/geogram-k5/raw/refs/heads/main/compiled-firmware/firmware.packed.bin"
         class="action-button" download>
        ⚡ Flash Firmware
      </a>

    </div>


    <p style="margin-top: 1em;">
      View the source or contribute on GitHub: 
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


      <div id="html">
        <h2>HTML app</h2>
        <div class="card">
          <p>Run this web page directly from your computer or phone without need for an internet connection</p>
          <div style="margin: 0em 0;">
            <a href="./tools/geogram-html.zip" class="action-button" download> ⬇ Download HTML app</a>
          </div>
        </div>
      </div>



    </div>



    
  `;

    setupAnchorNavigation("docs");
}