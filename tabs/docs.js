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
          <li><a href="#configuration" class="nav-link">Configuration</a></li>
          <li><a href="#privacy" class="nav-link">Privacy & Security</a></li>
          <li><a href="#troubleshooting" class="nav-link">Troubleshooting</a></li>
          <li><a href="#contact" class="nav-link">Contact & Support</a></li>
          <li><a href="#license" class="nav-link">License</a></li>
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
    </div>
  `;

  // Navigation link functionality (same as config.js)
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Add temporary highlight
        targetElement.style.transition = 'background-color 0.5s ease';
        targetElement.style.backgroundColor = 'var(--wave-color)';
        setTimeout(() => {
          targetElement.style.backgroundColor = '';
        }, 1000);
      }
    });
  });

  // Set initial scroll position if hash exists
  if (window.location.hash) {
    const targetElement = document.getElementById(window.location.hash.substring(1));
    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView();
      }, 100);
    }
  }
}