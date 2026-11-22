/* ================================================================
   js/advert-hub.js
   Opens/closes the Advert Hub modal, handles tab switching,
   pricing selection and ad posting. No dependency on app.js.

   Uses a CAPTURE-phase delegated listener with
   stopImmediatePropagation() so that later-loaded dispatchers
   (global-actions.js, enhancements.js, etc.) cannot swallow
   the open/close events for [data-action="openAdvertHub"] and
   [data-action="closeAdvertHub"].
   ================================================================ */
(function () {
    'use strict';

    function whenReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    whenReady(function () {
        const modal = document.getElementById('advertHubModal');
        if (!modal) {
            console.warn('[advert-hub] #advertHubModal not found — nothing to open.');
            return;
        }

        /* ------------------------------------------------------------
           Open / close helpers
           ------------------------------------------------------------ */
        function openHub(e) {
            if (e) {
                e.preventDefault();
                /* Do NOT stopPropagation here — the capture listener
                   already did that before other document handlers ran. */
            }
            modal.hidden = false;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            const c = modal.querySelector('.window-close-btn');
            if (c) c.focus();
        }

        function closeHub(e) {
            if (e) e.preventDefault();
            modal.classList.remove('active');
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function isOpen() {
            return modal.classList.contains('active') && !modal.hidden;
        }

        /* ------------------------------------------------------------
           Capture-phase delegated click handler
           Runs BEFORE any bubble-phase document listener that
           global-actions.js / enhancements.js might register.
           ------------------------------------------------------------ */
        document.addEventListener('click', function (e) {
            const openBtn = e.target.closest('[data-action="openAdvertHub"]');
            if (openBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                openHub(e);
                return;
            }

            const closeBtn = e.target.closest('[data-action="closeAdvertHub"]');
            if (closeBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                closeHub(e);
                return;
            }

            /* Backdrop click — click landed directly on the modal wrapper */
            if (e.target === modal && isOpen()) {
                closeHub(e);
            }
        }, true); /* ← capture phase */

        /* ------------------------------------------------------------
           Esc key closes the hub
           ------------------------------------------------------------ */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) closeHub(e);
        });

        /* ------------------------------------------------------------
           Tab switching (delegated inside the modal)
           ------------------------------------------------------------ */
        modal.addEventListener('click', function (e) {
            const tab = e.target.closest('.advert-hub-tab');
            if (!tab) return;
            const target = tab.dataset.advTab;
            if (!target) return;

            modal.querySelectorAll('.advert-hub-tab')
                .forEach(t => {
                    const active = t === tab;
                    t.classList.toggle('active', active);
                    t.setAttribute('aria-selected', active ? 'true' : 'false');
                });

            modal.querySelectorAll('.advert-hub-panel')
                .forEach(p => p.classList.toggle('active', p.dataset.advPanel === target));
        });

        /* ------------------------------------------------------------
           Pricing pick → jump to Post tab + preselect tier
           ------------------------------------------------------------ */
        modal.addEventListener('click', function (e) {
            const pick = e.target.closest('[data-action="advertHubPickTier"]');
            if (!pick) return;

            const tier = pick.dataset.tier;
            const tierSelect = document.getElementById('advTier');
            if (tierSelect) tierSelect.value = tier;

            /* Switch to Post tab */
            modal.querySelectorAll('.advert-hub-tab').forEach(t => {
                const active = t.dataset.advTab === 'post';
                t.classList.toggle('active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            modal.querySelectorAll('.advert-hub-panel').forEach(p =>
                p.classList.toggle('active', p.dataset.advPanel === 'post'));
        });

        /* ------------------------------------------------------------
           Post form
           ------------------------------------------------------------ */
        const form = document.getElementById('advPostForm');
        const status = document.getElementById('advPostStatus');

        function showStatus(msg, kind) {
            if (!status) return;
            status.textContent = msg;
            status.className = 'advert-hub-status ' + (kind || '');
            status.hidden = !msg;
        }

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                /* Guard against a partial form (missing fields) */
                const get = (name) => (form.elements[name] ? form.elements[name].value : '');

                const data = {
                    title:       get('advTitle').trim(),
                    category:    get('advCategory'),
                    description: get('advDescription').trim(),
                    price:       get('advPrice'),
                    contact:     get('advContact').trim(),
                    location:    get('advLocation').trim(),
                    image:       get('advImageUrl').trim(),
                    tier:        get('advTier')
                };

                if (!data.title || !data.category || !data.description || !data.contact) {
                    showStatus('Please fill in all required fields.', 'error');
                    return;
                }

                showStatus('Submitting…', 'info');

                /* TODO: replace with your API call */
                setTimeout(function () {
                    showStatus('✓ Your ad is live!', 'success');
                    form.reset();
                    setTimeout(function () { showStatus(''); }, 2500);
                }, 700);
            });
        }

        console.log('[advert-hub] ready');
    });
})();