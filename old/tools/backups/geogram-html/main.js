// Tab definitions with JS module paths
const tabs = [
  { id: "activity", label: "Activity", module: "tabs/activity.js" },
  { id: "map", label: "Map", module: "tabs/map.js" },
  { id: "radio", label: "Radio", module: "tabs/radio.js" },
  { id: "downloads", label: "Downloads", module: "tabs/downloads.js" },
  { id: "config", label: "Config", module: "tabs/config.js" },
  { id: "docs", label: "Docs", module: "tabs/docs.js" }
];

function generateTabs() {
  const desktopTabs = document.getElementById('desktopTabs');
  desktopTabs.innerHTML = tabs.map(tab =>
    `<button class="tab" data-id="${tab.id}">${tab.label}</button>`
  ).join("");
}

function setupMobileMenu() {
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileTabs = document.getElementById('mobileTabs');

  // Generate mobile tabs
  mobileTabs.innerHTML = tabs.map(tab =>
    `<button class="tab" data-id="${tab.id}">${tab.label}</button>`
  ).join("");

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-menu';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.addEventListener('click', () => {
    mobileTabs.classList.remove('show');
  });
  mobileTabs.prepend(closeBtn);

  // Burger button click handler
  burgerBtn.addEventListener('click', () => {
    mobileTabs.classList.toggle('show');
    document.body.style.overflow = mobileTabs.classList.contains('show') ? 'hidden' : '';
  });

  // Mobile tab click handlers
  mobileTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabId = e.target.dataset.id;
      loadTab(tabId);
      mobileTabs.classList.remove('show');
      document.body.style.overflow = '';
    });
  });
}


function loadTab(tabId, anchorId = null) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  // Update active state for both desktop and mobile tabs
  document.querySelectorAll(".tab").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.id === tabId)
  );

  const existingScript = document.getElementById("dynamic-tab");
  if (existingScript) existingScript.remove();

  const script = document.createElement("script");
  script.src = tab.module;
  script.id = "dynamic-tab";
  script.onload = () => {
    if (typeof render === "function") {
      render();

      if (anchorId) {
        // Wait for DOM update after render()
        setTimeout(() => {
          if (!anchorId) return;
          const target = document.getElementById(anchorId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }
  };

  document.body.appendChild(script);

  localStorage.setItem("lastTab", tabId);
  const expectedHash = anchorId ? `#${tabId}:${anchorId}` : `#${tabId}`;
  if (location.hash !== expectedHash) {
    location.hash = expectedHash;
  }

}



// Global wave references
let wavesTop = [];
let wavesBottom = [];

function initWaveBackground() {
  const canvas = document.getElementById('wave-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let lastTime = 0;
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createWaves(count, centerY) {
    return Array.from({ length: count }, () => ({
      centerY,
      baseAmp: 40 + Math.random() * 30,
      baseSpeed: 0.02 + Math.random() * 0.03,
      freq: 0.0005 + Math.random() * 0.0005,
      offset: Math.random() * 1000
    }));
  }

  window.addEventListener('resize', () => {
    resize();
    wavesTop = createWaves(3, height / 3);
    wavesBottom = createWaves(3, (2 * height) / 3);
  });

  function draw(timestamp) {
    if (!timestamp || !lastTime || timestamp - lastTime > frameInterval) {
      lastTime = timestamp || performance.now();

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const waveColor = getComputedStyle(document.body).getPropertyValue("--wave-color").trim();

      const pulse = Math.sin(lastTime * 0.001) * 0.2 + 0.8;

      for (const wave of [...wavesTop, ...wavesBottom]) {
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
  requestAnimationFrame(draw);
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}

window.addEventListener("DOMContentLoaded", () => {
  // Apply theme before anything renders
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) {
    document.body.setAttribute("data-theme", storedTheme);
  }

  generateTabs();
  setupMobileMenu();
  initWaveBackground();

  document.querySelector(".tabs").addEventListener("click", e => {
    if (e.target.classList.contains("tab")) {
      const tabId = e.target.dataset.id;
      loadTab(tabId);
    }
  });

  const logo = document.getElementById("home-link");
  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.setItem("lastTab", "activity");
      loadTab("activity");
    });
  }

  const savedTab = localStorage.getItem("lastTab");
  const [hashTab, anchorId] = window.location.hash.slice(1).split(":");
  const initialTab = savedTab || hashTab || "activity";
  loadTab(initialTab, anchorId);

});

window.addEventListener("hashchange", () => {
  const [hashTab, anchorId] = window.location.hash.slice(1).split(":");
  if (tabs.some(t => t.id === hashTab)) {
    loadTab(hashTab, anchorId);
  }
});