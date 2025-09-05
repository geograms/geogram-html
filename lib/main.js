// lib/main.js

// -----------------------------------------------------------------------------
// Tab definitions and dynamic module loader
// -----------------------------------------------------------------------------

// These are the main navigation tabs. Each entry must specify its id,
// user-visible label, and the path to its JavaScript module (relative to index).
const tabs = [
  { id: "activity", label: "Activity", module: "tabs/activity.js" },
  { id: "docs",     label: "Docs/Files", module: "tabs/docs.js" },
  { id: "config",   label: "Config", module: "tabs/config.js" },
  { id: "profile",  label: "Profile", module: "tabs/profile.js" }
];

// Pages that aren’t visible as tabs but can still be loaded via loadTab().
// Each entry maps a page id to the path of its module.
const additionalPages = {
  messages: 'tabs/messages.js'
};


/**
 * Generate the tab buttons for the desktop view. Called on DOMContentLoaded.
 */
function generateTabs() {
  const desktopTabs = document.getElementById("desktopTabs");
  desktopTabs.innerHTML = tabs.map(
    tab => `<button class="tab" data-id="${tab.id}">${tab.label}</button>`
  ).join("");
}

/**
 * Setup the burger menu and mobile tab list. Adds a close button to the top.
 */
function setupMobileMenu() {
  const burgerBtn = document.getElementById("burgerBtn");
  const mobileTabs = document.getElementById("mobileTabs");

  // Generate buttons for mobile view
  mobileTabs.innerHTML = tabs.map(
    tab => `<button class="tab" data-id="${tab.id}">${tab.label}</button>`
  ).join("");

  // Close button at top of mobile menu
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-menu";
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.addEventListener("click", () => {
    mobileTabs.classList.remove("show");
  });
  mobileTabs.prepend(closeBtn);

  // Burger icon toggles the mobile menu
  burgerBtn.addEventListener("click", () => {
    mobileTabs.classList.toggle("show");
    // Prevent body scroll when menu is open
    document.body.style.overflow = mobileTabs.classList.contains("show") ? "hidden" : "";
  });

  // Mobile buttons load the selected tab and close the menu
  mobileTabs.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", e => {
      const tabId = e.target.dataset.id;
      loadTab(tabId);
      mobileTabs.classList.remove("show");
      document.body.style.overflow = "";
    });
  });
}

/**
 * Load a tab or additional page module.
 *
 * @param {string} tabId The id of the tab (or additional page).
 * @param {string|null} anchorId Optional anchor id within the page.
 */
function loadTab(tabId, anchorId = null) {
  // Determine if the tab is part of the main nav or additional pages
  const tab = tabs.find(t => t.id === tabId);
  let modulePath;
  let isNavigationTab = false;

  if (tab) {
    modulePath = tab.module;
    isNavigationTab = true;
  } else if (Object.prototype.hasOwnProperty.call(additionalPages, tabId)) {
    modulePath = additionalPages[tabId];
  } else {
    // Tab not found; do nothing
    return;
  }

  // Highlight only the visible navigation tabs; hide highlight otherwise
  document.querySelectorAll(".tab").forEach(btn => {
    if (isNavigationTab) {
      btn.classList.toggle("active", btn.dataset.id === tabId);
    } else {
      btn.classList.remove("active");
    }
  });

  // Remove previously loaded module
  const existingScript = document.getElementById("dynamic-tab");
  if (existingScript) {
    existingScript.remove();
  }

  // Dynamically load the new module
  const script = document.createElement("script");
  script.id = "dynamic-tab";
  script.src = modulePath;
  script.onload = () => {
    // After loading, call its render() function if defined
    if (typeof render === "function") {
      render();
      // If an anchor is provided, scroll to it after the page renders
      if (anchorId) {
        setTimeout(() => {
          const target = document.getElementById(anchorId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }
  };
  script.onerror = e => {
    console.error("Failed to load module:", modulePath, e);
  };
  document.body.appendChild(script);

  // Save the last active tab for return visits, but only for visible tabs
  if (isNavigationTab) {
    localStorage.setItem("lastTab", tabId);
  }

  // Update URL hash; omit hash for additional pages to avoid navigation issues
  const expectedHash = anchorId && isNavigationTab ? `#${tabId}:${anchorId}` : `#${tabId}`;
  if (location.hash !== expectedHash) {
    location.hash = expectedHash;
  }
}

/**
 * Draw animated wave background on the canvas.
 * Continues to animate with requestAnimationFrame.
 */
function initWaveBackground() {
  const canvas = document.getElementById('wave-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let lastTime = 0;
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;
  let wavesTop = [];
  let wavesBottom = [];

  /**
   * Resize the canvas to window size.
   */
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  /**
   * Create a set of waves with randomized properties.
   *
   * @param {number} count The number of waves.
   * @param {number} centerY The vertical center for the waves.
   */
  function createWaves(count, centerY) {
    return Array.from({ length: count }, () => ({
      centerY,
      baseAmp: 40 + Math.random() * 30,
      baseSpeed: 0.02 + Math.random() * 0.03,
      freq: 0.0005 + Math.random() * 0.0005,
      offset: Math.random() * 1000
    }));
  }

  /**
   * Draw the waves on each animation frame.
   */
  function draw(timestamp) {
    if (!timestamp || !lastTime || timestamp - lastTime > frameInterval) {
      lastTime = timestamp || performance.now();

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      // The color for the waves is defined by CSS variable --wave-color
      const waveColor = getComputedStyle(document.body).getPropertyValue("--wave-color").trim();
      // Slight variation to wave amplitude
      const pulse = Math.sin(lastTime * 0.001) * 0.2 + 0.8;

      // Draw top and bottom waves
      for (const wave of wavesTop.concat(wavesBottom)) {
        ctx.beginPath();
        const amp = wave.baseAmp * pulse;
        const speed = wave.baseSpeed;
        for (let x = 0; x < width; x++) {
          const y = wave.centerY +
            Math.sin((x + wave.offset + lastTime * speed) * wave.freq * 2 * Math.PI) * amp;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  wavesTop = createWaves(3, window.innerHeight / 3);
  wavesBottom = createWaves(3, (2 * window.innerHeight) / 3);

  window.addEventListener('resize', () => {
    resize();
    wavesTop = createWaves(3, height / 3);
    wavesBottom = createWaves(3, (2 * height) / 3);
  });

  requestAnimationFrame(draw);
}

/**
 * Set the theme data attribute on the body.
 */
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}

// -----------------------------------------------------------------------------

// Initialization: run after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme (default theme is set in index.html or internal.config.js)
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) {
    document.body.setAttribute("data-theme", storedTheme);
  }

  generateTabs();
  setupMobileMenu();
  initWaveBackground();

  // Click events for desktop tab bar
  document.querySelector(".tabs").addEventListener("click", e => {
    if (e.target.classList.contains("tab")) {
      const tabId = e.target.dataset.id;
      loadTab(tabId);
    }
  });

  // Clicking the logo returns to the Activity tab
const logo = document.getElementById("home-link");
if (logo) {
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.setItem("lastTab", "activity");
    loadTab("activity");
    // Remove the hash from the URL without reloading
    history.replaceState(null, "", location.pathname);
  });
}


  // Load the initial tab based on saved state or hash
  const savedTab = localStorage.getItem("lastTab");
  const [hashTab, anchorId] = window.location.hash.slice(1).split(":");
  const initialTab = savedTab || hashTab || "activity";
  loadTab(initialTab, anchorId);
});

// Respond to URL hash changes (e.g. from external links)
window.addEventListener("hashchange", () => {
  const [hashTab, anchorId] = window.location.hash.slice(1).split(":");
  if (tabs.some(t => t.id === hashTab) || additionalPages[hashTab]) {
    loadTab(hashTab, anchorId);
  }
});
