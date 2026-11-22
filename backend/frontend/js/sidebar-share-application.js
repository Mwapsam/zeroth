/* ================================================================
   ZEROTH BUSINESS SOLUTIONS — SIDEBAR → SHARE APPLICATION BRIDGE
   Version 1.0.0
   ----------------------------------------------------------------
   Makes the sidebar "Share Application" nav link behave EXACTLY
   like the "Share Purchase Application" button that lives inside
   the Brokerage Services card (#shareApplicationWrapper).

   Behaviour:
     • Closes the sidebar first (so the form is fully visible)
     • Expands the brokerage card if it was collapsed
     • Adds .active to #shareApplicationWrapper — the same class
       app.js's openShareApplication() uses
     • Smooth-scrolls the wrapper into view and focuses the first
       input field
     • Wires the Cancel button (#shareCancelBtn) to close it
     • Presses ESC anywhere to close it
     • Re-binds automatically if the sidebar DOM is re-rendered

   Safety:
     • Capture-phase listener + stopPropagation means the delegated
       app.js dispatcher does NOT fire a second time for the
       sidebar link — no double-open, no race.
     • The Brokerage Services button (also
       data-action="openShareApplication") is left untouched so
       app.js still owns it.
     • Guarded by window.__ZBS_SIDEBAR_SHARE__ so a double <script>
       include can never double-bind.

   Public API (optional, for other modules):
     window.SidebarShareApplication.open()
     window.SidebarShareApplication.close()
     window.SidebarShareApplication.isOpen()
     window.SidebarShareApplication.toggle()
   ================================================================ */
(function () {
    'use strict';

    /* ---- Double-include guard ---------------------------------- */
    if (window.__ZBS_SIDEBAR_SHARE__) return;
    window.__ZBS_SIDEBAR_SHARE__ = true;

    /* ---- Shorthands -------------------------------------------- */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ---- Element IDs (must match index.html) ------------------- */
    const WRAPPER_ID    = 'shareApplicationWrapper';
    const SIDEBAR_ID    = 'sidebar';
    const OVERLAY_ID    = 'sidebarOverlay';
    const CANCEL_BTN_ID = 'shareCancelBtn';

    /* Sidebar selector — matches both the data-action form and the
       plain href form so this keeps working even if index.html is
       edited to drop the data-action attribute.                     */
    const SIDEBAR_LINK_SELECTOR =
        '.sidebar-nav-link[data-action="openShareApplication"], ' +
        '.sidebar-nav-link[href="#share-application"]';

    /* Brokerage card selector — the wrapper lives inside this card. */
    const BROKERAGE_CARD_SELECTOR = '.category-card.service-brokerage';

    /* =============================================================
       HELPERS
       ============================================================= */
    function getWrapper()   { return document.getElementById(WRAPPER_ID); }
    function getSidebar()   { return document.getElementById(SIDEBAR_ID); }
    function getOverlay()   { return document.getElementById(OVERLAY_ID); }

    /**
     * Force-close the sidebar without triggering app.js's own
     * closeSidebar() (we do it manually to avoid recursion and to
     * guarantee it happens BEFORE we scroll).
     */
    function closeSidebarHard() {
        const sidebar = getSidebar();
        const overlay = getOverlay();

        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');

        // Release the body scroll-lock the sidebar applied.
        document.body.style.overflow = '';

        // Also clear the toggle button's active state.
        const toggle = document.getElementById('sidebarToggleBtn');
        if (toggle) toggle.classList.remove('active');
    }

    /**
     * Ensure the Brokerage category card is expanded so the form is
     * actually visible when we scroll to it (the card may have been
     * collapsed by the user via toggleCategory()).
     */
    function ensureBrokerageExpanded(wrapper) {
        if (!wrapper) return;
        const card = wrapper.closest(BROKERAGE_CARD_SELECTOR)
                   || wrapper.closest('.category-card');
        if (!card) return;

        card.classList.add('expanded');

        const list = card.querySelector('.service-list-container');
        if (list) {
            list.removeAttribute('hidden');
            // Some styles set display:none via the [hidden] attribute;
            // clearing it inline guarantees the card is visible.
            if (list.style.display === 'none') list.style.display = '';
        }
    }

    /**
     * Is the share-application form currently open?
     */
    function isOpen() {
        const wrapper = getWrapper();
        return !!(wrapper && wrapper.classList.contains('active'));
    }

    /* =============================================================
       OPEN
       ============================================================= */
    function open() {
        const wrapper = getWrapper();

        /* If the wrapper isn't in the DOM, fall back to whatever
           app.js registered on window (keeps us resilient if the
           share form is ever moved into its own modal). */
        if (!wrapper) {
            if (typeof window.openShareApplication === 'function') {
                window.openShareApplication();
            } else {
                console.warn('[SidebarShare] #' + WRAPPER_ID + ' not found.');
            }
            return;
        }

        /* 1. Close the sidebar first so the page is scrollable. */
        closeSidebarHard();

        /* 2. Make sure the brokerage card is expanded. */
        ensureBrokerageExpanded(wrapper);

        /* 3. Reveal the wrapper using the SAME class app.js uses. */
        wrapper.classList.add('active');
        wrapper.removeAttribute('hidden');

        /* 4. Wait for the sidebar close transition, then scroll
              smoothly and focus the first field.                     */
        requestAnimationFrame(function () {
            window.setTimeout(function () {
                try {
                    wrapper.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                } catch (err) {
                    /* Older browsers: fall back to a jump. */
                    wrapper.scrollIntoView(true);
                }

                /* Focus the first empty field a moment after the
                   scroll starts so mobile keyboards don't fight it. */
                window.setTimeout(function () {
                    const firstField = wrapper.querySelector(
                        'input:not([type="hidden"]):not([readonly]), select, textarea'
                    );
                    if (firstField && typeof firstField.focus === 'function') {
                        try { firstField.focus({ preventScroll: true }); }
                        catch (err) { firstField.focus(); }
                    }
                }, 320);
            }, 280); /* match sidebar CSS transition duration */
        });
    }

    /* =============================================================
       CLOSE
       ============================================================= */
    function close() {
        const wrapper = getWrapper();
        if (!wrapper) return;

        wrapper.classList.remove('active');

        /* Also call app.js's own closer if present, purely so its
           internal state (if any) stays in sync. */
        if (typeof window.closeShareApplication === 'function') {
            try { window.closeShareApplication(); } catch (err) {}
        }
    }

    function toggle() {
        if (isOpen()) close();
        else open();
    }

    /* =============================================================
       BINDINGS
       ============================================================= */

    /* ---- Sidebar link (capture phase) --------------------------
       Runs before app.js's document-level delegated listener, so
       stopPropagation() prevents app.js from calling its own
       openShareApplication() a second time for the SAME click.
       ----------------------------------------------------------- */
    document.addEventListener('click', function (e) {
        const link = e.target.closest(SIDEBAR_LINK_SELECTOR);
        if (!link) return;

        /* Only intercept the SIDEBAR link — leave the brokerage
           services .service-item button alone so app.js owns it. */
        if (!link.closest('.sidebar')) return;

        e.preventDefault();
        e.stopPropagation();

        open();
    }, true /* capture */);

    /* ---- Cancel button ---------------------------------------- */
    function bindCancel() {
        const btn = document.getElementById(CANCEL_BTN_ID);
        if (!btn || btn.dataset.sidebarShareBound === '1') return;
        btn.dataset.sidebarShareBound = '1';

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            close();
        });
    }

    /* ---- ESC to close ----------------------------------------- */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        if (isOpen()) {
            /* Let other handlers finish first (app.js closes the
               topmost modal on ESC); only close the share form if
               nothing above it is currently active. */
            window.setTimeout(function () {
                if (isOpen()) close();
            }, 0);
        }
    });

    /* ---- Idempotent bootstrap --------------------------------- */
    function bindAll() {
        bindCancel();
    }

    /* ---- Watch for DOM changes (e.g. sidebar re-render) ------- */
    function watchDom() {
        if (typeof MutationObserver !== 'function') return;
        const mo = new MutationObserver(function () {
            bindAll();
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    /* ---- Init -------------------------------------------------- */
    function init() {
        bindAll();
        watchDom();
        console.log('✅ SidebarShareApplication v1.0.0 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* =============================================================
       PUBLIC API
       ============================================================= */
    window.SidebarShareApplication = {
        open:    open,
        close:   close,
        toggle:  toggle,
        isOpen:  isOpen,
        /* Convenience: expose the wrapper so other modules can
           query it without re-selecting. */
        getWrapper: getWrapper
    };

    /* Expose top-level functions so other scripts (or inline
       onclick handlers) can call them directly. */
    if (typeof window.openShareApplication !== 'function') {
        window.openShareApplication  = open;
    }
    if (typeof window.closeShareApplication !== 'function') {
        window.closeShareApplication = close;
    }

})();