const themeButton = document.querySelector('#theme-toggle');
if (themeButton) {
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('watbook-theme'); } catch { /* storage can be unavailable in privacy-restricted contexts */ }
  const initialTheme = savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = initialTheme;
  themeButton.setAttribute('aria-pressed', String(initialTheme === 'dark'));
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    themeButton.setAttribute('aria-pressed', String(next === 'dark'));
    try { localStorage.setItem('watbook-theme', next); } catch { /* theme still changes for this page */ }
  });
}
