/* ==========================================================================
   ZEROTH BUSINESS SOLUTIONS — IMAGE FALLBACK (delegated)
   File: js/image-fallback.js
   Load: <script src="js/image-fallback.js" defer></script>
   --------------------------------------------------------------------------
   When a brand advert image 404s (Airtel / MTN / ZESCO / …) the browser
   fires an `error` event on the <img>. This listener catches it once
   (capture phase — because error events don't bubble), swaps the broken
   image for an emoji glyph, and marks the node so we never loop.

   Replaces the previous inline `onerror="..."` handlers, which:
     • were repeated on every advert
     • blocked CSP `script-src 'self'`
     • were hard to maintain
     • could throw if `this.parentNode` was already detached
   ========================================================================== */

(function () {
  'use strict';

  /* Keyword → emoji map. Matched case-insensitively against the image's
     `src` so `images/adverts/airtel.png` and `airtel_logo.png` both hit
     the same rule. Longest keys first is NOT required (we return on the
     first match) but keep them specific to avoid false positives. */
  var EMOJI = {
    'airtel'   : '📱',
    'mtn'      : '📶',
    'zamtel'   : '📞',
    'zesco'    : '⚡',
    'zanaco'   : '🏦',
    'zambeef'  : '🥩',
    'shoprite' : '🛒',
    'boom'     : '🧴',
    'picknpay' : '🎯',
    'bee-hive' : '🥩',
    'tomatoes' : '🥩'
  };

  /* Look up an emoji for a given image src. Returns null if no match. */
  function emojiFor(src) {
    if (!src) return null;
    var lower = src.toLowerCase();
    for (var key in EMOJI) {
      if (!Object.prototype.hasOwnProperty.call(EMOJI, key)) continue;
      if (lower.indexOf(key) !== -1) return EMOJI[key];
    }
    return null;
  }

  /* Swap the broken <img> for an emoji <span>. Safe if the parent has
     already been removed from the DOM (replaceWith is a no-op then). */
  function swapForEmoji(img, emoji) {
    var span = document.createElement('span');
    span.className = 'advert-emoji';
    span.textContent = emoji;
    span.setAttribute('aria-hidden', 'true');
    /* Preserve sizing so the marquee doesn't jump */
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.width  = (img.getAttribute('width')  || '40') + 'px';
    span.style.height = (img.getAttribute('height') || '40') + 'px';
    span.style.fontSize = '22px';
    span.style.lineHeight = '1';

    try {
      img.replaceWith(span);
    } catch (err) {
      /* Parent detached mid-flight — nothing to do. */
    }
  }

  /* Capture phase: `error` does not bubble, so we must listen on
     document with `true`. */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    /* One repair per image — prevents infinite swap loops if the
       replacement source also fails to load. */
    if (img.dataset.fallbackApplied === '1') return;
    img.dataset.fallbackApplied = '1';

    var emoji = emojiFor(img.getAttribute('src') || '');
    if (emoji) {
      swapForEmoji(img, emoji);
      return;
    }

    /* No keyword match: hide the broken image but keep its space so
       the advert track doesn't collapse. */
    img.style.visibility = 'hidden';
  }, true);

  /* Public hook so other modules (e.g. dynamically injected adverts)
     can flush any already-broken images that pre-date this listener. */
  window.ZBS = window.ZBS || {};
  window.ZBS.imageFallback = {
    emojiFor: emojiFor
  };
})();