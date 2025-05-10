// Tab definitions with JS module paths
const tabs = [
  { id: "nearby", label: "Nearby", module: "tabs/nearby.js" },
  { id: "messages", label: "Messages", module: "tabs/messages.js" },
  { id: "map", label: "Map", module: "tabs/map.js" },
  { id: "radio", label: "Radio", module: "tabs/radio.js" },
  { id: "control", label: "Control", module: "tabs/control.js" },
  { id: "docs", label: "Docs", module: "tabs/docs.js" }
];

// Generate the tabs
function generateTabs() {
  const tabContainer = document.querySelector(".tabs");
  tabContainer.innerHTML = tabs.map(tab =>
    `<button class="tab" data-id="${tab.id}">${tab.label}</button>`
  ).join("");
}

// Load tab module by injecting <script>
function loadTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  document.querySelectorAll(".tab").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.id === tabId)
  );

  const existingScript = document.getElementById("dynamic-tab");
  if (existingScript) existingScript.remove();

  const script = document.createElement("script");
  script.src = tab.module;
  script.id = "dynamic-tab";
  script.onload = () => {
    if (typeof render === "function") render();
  };
  document.body.appendChild(script);
}

// Wave background animation
function initWaveBackground() {
  const canvas = document.getElementById('wave-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, t = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createWaves(count, centerY) {
    return Array.from({ length: count }, () => ({
      centerY,
      baseAmp: 40 + Math.random() * 30,
      baseSpeed: 0.05 + Math.random() * 0.07,
      freq: 0.001 + Math.random() * 0.0015,
      offset: Math.random() * 1000,
      color: "rgba(0,255,0,0.15)"
    }));
  }

  let wavesTop, wavesBottom;

  window.addEventListener('resize', () => {
    resize();
    wavesTop = createWaves(3, height / 3);
    wavesBottom = createWaves(3, (2 * height) / 3);
  });

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    const pulse = Math.sin(t * 0.005) * 0.5 + 1;
    for (const wave of [...wavesTop, ...wavesBottom]) {
      ctx.beginPath();
      const amp = wave.baseAmp * pulse;
      const speed = wave.baseSpeed * pulse;
      for (let x = 0; x < width; x++) {
        const y = wave.centerY + Math.sin((x + wave.offset + t * speed) * wave.freq * 2 * Math.PI) * amp;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    t += 1;
    requestAnimationFrame(draw);
  }

  resize();
  wavesTop = createWaves(3, window.innerHeight / 3);
  wavesBottom = createWaves(3, (2 * window.innerHeight) / 3);
  draw();
}

// Initialize app
window.addEventListener("DOMContentLoaded", () => {
  generateTabs();
  initWaveBackground();

  document.querySelector(".tabs").addEventListener("click", e => {
    if (e.target.classList.contains("tab")) {
      const tabId = e.target.dataset.id;
      loadTab(tabId);
    }
  });

  const initialTab = window.location.hash.slice(1) || "nearby";
  loadTab(initialTab);
});

