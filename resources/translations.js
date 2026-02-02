// Geogram translations loader
// Dynamically loads only the needed language file
const translations = {};
const availableLanguages = ['en', 'de', 'es', 'pt', 'fr', 'it', 'nl', 'sv', 'he', 'ar', 'tr', 'zh', 'ko', 'ja'];

function detectLanguage() {
  // Check saved preference first
  const saved = localStorage.getItem('geogram-lang');
  if (saved && availableLanguages.includes(saved)) {
    return saved;
  }

  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    const lang = browserLang.toLowerCase();
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('it')) return 'it';
    if (lang.startsWith('nl')) return 'nl';
    if (lang.startsWith('sv')) return 'sv';
    if (lang.startsWith('he') || lang.startsWith('iw')) return 'he';
    if (lang.startsWith('ar')) return 'ar';
    if (lang.startsWith('tr')) return 'tr';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('ja')) return 'ja';
  }

  return 'en';
}

function loadLanguage(lang, callback) {
  // If already loaded, just callback
  if (translations[lang]) {
    if (callback) callback();
    return;
  }

  const script = document.createElement('script');
  script.src = `resources/lang/${lang}.js`;
  script.onload = function() {
    if (callback) callback();
  };
  script.onerror = function() {
    console.error(`Failed to load language: ${lang}`);
    // Fallback to English if load fails and not already English
    if (lang !== 'en') {
      loadLanguage('en', callback);
    }
  };
  document.head.appendChild(script);
}
