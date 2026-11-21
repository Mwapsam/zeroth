/* ==========================================================================
   ZEROTH BUSINESS SOLUTIONS — MOBILE PARTNER GRID
   File: js/mobile-partners.js
   Load: <script src="js/mobile-partners.js" defer></script>  (before </body>)
   --------------------------------------------------------------------------
   Purpose
     Mirrors every desktop partner slot inside #partnerSlotsContainer into
     #partnersGridMobile so that — when the desktop radial 30-slot star is
     hidden by CSS below 1024px — mobile and tablet users still see the full
     partner roster as a clean responsive grid.

   Guarantees
     • Idempotent — safe to call repeatedly, never duplicates cells.
     • Self-healing — MutationObserver rebuilds when desktop slots are
       added, removed or replaced (e.g. loaded from an API).
     • Accessible — keyboard reachable, aria-labels, 44px touch targets.
     • Safe — no innerHTML, no globals leaked except window.ZBS hook.
     • Dependency-free — no jQuery, no frameworks, works in every
       evergreen browser (Chrome, Edge, Firefox, Safari, Samsung Internet).
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Configuration
     ------------------------------------------------------------------ */
  var DESKTOP_CONTAINER_ID = 'partnerSlotsContainer';
  var MOBILE_GRID_ID       = 'partnersGridMobile';
  var SLOT_SELECTOR        = '.partner-slot:not(.partner-slot-mobile)';
  var FALLBACK_LOGO        = 'images/logo-zbsfltgheader.png';
  var REBUILD_DEBOUNCE_MS  = 120;

  /* ------------------------------------------------------------------
     Internal state
     ------------------------------------------------------------------ */
  var rebuildTimer   = null;
  var observer       = null;

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */

  /**
   * Copy every data-* attribute from source to target, preserving
   * things like data-partner-id, data-category, data-region, etc.,
   * so downstream handlers that read them keep working on mobile.
   * data-slot is skipped because we set it explicitly.
   */
  function copyDataAttributes(source, target) {
    Array.prototype.forEach.call(source.attributes, function (attr) {
      if (attr.name.indexOf('data-') !== 0) return;
      if (attr.name === 'data-slot') return;
      if (target.hasAttribute(attr.name)) return;
      target.setAttribute(attr.name, attr.value);
    });
  }

  /**
   * Build a single mobile partner cell from a desktop slot element.
   * Uses createElement (not innerHTML) so partner names are never
   * interpolated into markup — immune to accidental XSS if a partner
   * name ever contains a quote or angle bracket.
   */
  function buildCellFromSlot(slot) {
    var code = slot.getAttribute('data-slot');
    if (!code) return null; // star-center or malformed node

    var img  = slot.querySelector('.partner-logo-img');
    var src  = (img && img.getAttribute('src')) || FALLBACK_LOGO;
    var alt  = (img && img.getAttribute('alt')) || ('Partner ' + code);
    var label = slot.getAttribute('aria-label') ||
                ('View details and services for partner ' + code);

    var cell = document.createElement('div');
    cell.className = 'partner-slot partner-slot-mobile';
    cell.setAttribute('data-slot', code);
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-label', label);

    copyDataAttributes(slot, cell);

    var inner = document.createElement('div');
    inner.className = 'partner-slot-inner';

    var logo = document.createElement('img');
    logo.className = 'partner-logo-img';
    logo.src = src;
    logo.alt = alt;
    logo.loading = 'lazy';
    logo.decoding = 'async';
    logo.width = 64;
    logo.height = 64;

    var codeEl = document.createElement('span');
    codeEl.className = 'slot-code';
    codeEl.textContent = code;

    inner.appendChild(logo);
    inner.appendChild(codeEl);
    cell.appendChild(inner);

    return cell;
  }

  /* ------------------------------------------------------------------
     Public build function
     ------------------------------------------------------------------ */

  /**
   * Rebuild #partnersGridMobile from scratch using the current contents
   * of #partnerSlotsContainer. Safe to call any time.
   */
  function buildMobilePartnerGrid() {
    var grid      = document.getElementById(MOBILE_GRID_ID);
    var container = document.getElementById(DESKTOP_CONTAINER_ID);

    if (!grid || !container) {
      // One of the anchors isn't on the page — nothing to do.
      return;
    }

    var slots = container.querySelectorAll(SLOT_SELECTOR);

    // If desktop slots aren't rendered yet, don't overwrite an existing
    // mobile grid — let the observer fire again when they arrive.
    if (!slots.length) return;

    var frag = document.createDocumentFragment();
    var built = 0;

    Array.prototype.forEach.call(slots, function (slot) {
      var cell = buildCellFromSlot(slot);
      if (cell) {
        frag.appendChild(cell);
        built += 1;
      }
    });

    // Single atomic swap — avoids flicker and layout thrash.
    grid.textContent = '';
    grid.appendChild(frag);

    // Announce readiness. Any delegated click/keydown handler on
    // document.body will automatically pick up the new nodes because
    // events bubble from .partner-slot-mobile → .partners-grid-mobile
    // → body.
    try {
      grid.dispatchEvent(new CustomEvent('zbs:mobilePartnerGridReady', {
        bubbles: true,
        detail: { count: built }
      }));
    } catch (err) {
      // CustomEvent unsupported (ancient browsers) — silently ignore.
    }

    return built;
  }

  /* ------------------------------------------------------------------
     MutationObserver — keep mobile grid in sync with desktop slots
     ------------------------------------------------------------------ */

  function scheduleRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(buildMobilePartnerGrid, REBUILD_DEBOUNCE_MS);
  }

  function observeDesktopSlots() {
    var container = document.getElementById(DESKTOP_CONTAINER_ID);
    if (!container) return;
    if (typeof MutationObserver === 'undefined') return; // IE10-safe fallback
    if (observer) return; // already attached

    observer = new MutationObserver(scheduleRebuild);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-slot', 'src', 'alt']
    });
  }

  /* ------------------------------------------------------------------
     Delegated keyboard support for the mobile grid
     ------------------------------------------------------------------
     The desktop slots may already be wired for keyboard via a global
     handler. If that handler only binds to .partner-slot on the star
     container, our cloned cells would be unreachable via keyboard.
     This tiny delegated listener covers that gap without interfering
     with any existing click handler (clicks bubble to the same
     openPartnerModal function used by desktop slots).
     ------------------------------------------------------------------ */

  function attachKeyboardSupport() {
    var grid = document.getElementById(MOBILE_GRID_ID);
    if (!grid || grid.dataset.zbsKbBound === '1') return;

    grid.addEventListener('keydown', function (e) {
      var cell = e.target.closest && e.target.closest('.partner-slot-mobile');
      if (!cell) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        cell.click(); // dispatches a real click → existing handler fires
      }
    });

    grid.dataset.zbsKbBound = '1';
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function boot() {
    buildMobilePartnerGrid();
    observeDesktopSlots();
    attachKeyboardSupport();
  }

  if (document.readyState === 'loading') {
    // Script was loaded without defer — wait for DOM.
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // defer / already-parsed — boot immediately.
    boot();
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------
     window.ZBS.refreshMobilePartnerGrid()
       → Force an immediate rebuild. Useful right after fetching
         partners from an API and injecting them into the desktop
         container, if you want the mobile grid to update before the
         MutationObserver's 120 ms debounce fires.
     ------------------------------------------------------------------ */
  window.ZBS = window.ZBS || {};
  window.ZBS.refreshMobilePartnerGrid = buildMobilePartnerGrid;
})();