(function () {
  var theme = 'dark';
  try {
    var stored = localStorage.getItem('runcast.theme');
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'light';
    }
  } catch {
    theme = 'dark';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f1a' : '#f7f8fa');
})();
