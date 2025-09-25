function setupAnchorNavigation(tabId) {
  // Rewrite hrefs to #tab:anchor so right-click "Copy Link Address" works
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const anchor = link.getAttribute("href").slice(1);
    const fullHash = `#${tabId}:${anchor}`;
    link.setAttribute("href", fullHash);

    link.addEventListener("click", (e) => {
      const el = document.getElementById(anchor);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", fullHash);

        // Optional highlight
        el.style.transition = 'background-color 0.5s ease';
        el.style.backgroundColor = 'var(--wave-color)';
        setTimeout(() => {
          el.style.backgroundColor = '';
        }, 1000);
      }
    });
  });

  // Scroll to anchor on direct load (e.g. #docs:section)
  const hash = window.location.hash;
  if (hash.startsWith(`#${tabId}:`)) {
    const anchorId = hash.split(":")[1];
    const target = document.getElementById(anchorId);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

// Expose globally for inline script usage
window.setupAnchorNavigation = setupAnchorNavigation;
