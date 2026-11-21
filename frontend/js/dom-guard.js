/* ==========================================================================
   ZEROTH BUSINESS SOLUTIONS — DOM GUARD
   File: js/dom-guard.js
   Load: <script src="js/dom-guard.js" defer></script>
   --------------------------------------------------------------------------
   Fails loudly in development and fails silently in production if any
   critical DOM anchor is missing. "Critical" here = anything your app
   code calls .getElementById() on at boot.

   Behaviour
     • Localhost (or ?debug=1) → console.warn with the missing IDs
     • > 3 missing anywhere   → <html data-fatal="id1,id2,…">
       (the CSS already styles `[data-fatal]` to show a maintenance
        screen — see enhancements.css)
     • Never throws — a broken DOM must not take the whole page down.
   ========================================================================== */

(function () {
  'use strict';

  /* IDs that must exist for the core app to function. Update this list
     whenever you add a new modal or hub that boot code touches. */
  var REQUIRED = [
    'sidebar',
    'main-content',
    'walletModal',
    'loginModal',
    'searchOverlay',
    'betModal',
    'financialModal',
    'agricultureModal',
    'educationModal',
    'etfModal',
    'marketModal',
    'rentalModal',
    'prohireModal'
  ];

  /* Threshold at which the page is considered too broken to run. */
  var FATAL_THRESHOLD = 3;

  function isDev() {
    /* localhost | 127.0.0.1 | *.local | file:// | ?debug=1 */
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') return true;
    if (/\.local$/i.test(host)) return true;
    if (/[?&]debug=1\b/.test(location.search)) return true;
    return false;
  }

  function run() {
    var missing = REQUIRED.filter(function (id) {
      return !document.getElementById(id);
    });

    if (!missing.length) return;

    if (isDev()) {
      /* Loud but non-fatal — dev needs to see this immediately. */
      console.warn(
        '%c[ZBS] Missing required DOM nodes (%d):',
        'color:#c0392b;font-weight:bold',
        missing.length,
        missing
      );
      /* Also drop an inline banner so mobile dev tools can't hide it. */
      try {
        var banner = document.createElement('div');
        banner.setAttribute('role', 'alert');
        banner.style.cssText =
          'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
          'background:#c0392b;color:#fff;padding:10px 14px;' +
          'font:600 13px/1.4 system-ui,sans-serif;text-align:center;';
        banner.textContent =
          '[ZBS dev] Missing DOM: ' + missing.join(', ');
        document.body.appendChild(banner);
      } catch (err) { /* body might not exist yet in exotic cases */ }
    }

    if (missing.length > FATAL_THRESHOLD) {
      /* Trip the kill-switch so CSS can show a maintenance screen.
         Also stash the list for analytics/monitoring. */
      document.documentElement.setAttribute('data-fatal', missing.join(','));
      window.__ZBS_MISSING_NODES__ = missing;

      /* If Sentry / Bugsnag / etc. is installed, report non-fatally. */
      try {
        if (window.Sentry && typeof window.Sentry.captureMessage === 'function') {
          window.Sentry.captureMessage(
            '[ZBS] Critical DOM nodes missing: ' + missing.join(', '),
            'error'
          );
        }
      } catch (err) { /* monitoring must never break the page */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();