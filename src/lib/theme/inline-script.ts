// Runs synchronously as the first thing in <body>, before paint, so there's no flash of the
// wrong theme. The root layout already applies the "dark" class server-side when the theme
// cookie explicitly says "dark" - this script only has real work to do on a first-ever visit
// (no cookie yet, must fall back to the OS preference) or if the cookie is stale/missing.
export const themeInlineScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    var theme = match ? decodeURIComponent(match[1]) : null;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;
