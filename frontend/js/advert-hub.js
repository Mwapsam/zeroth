/* ================================================================
   js/advert-hub.js
   Self-contained Advert Hub — open/close, tabs, pricing, posting,
   persistence, rendering, filtering, and responsive behaviour.

   • No dependency on app.js or any global dispatcher.
   • Capture-phase delegated listener prevents later scripts
     (global-actions.js, enhancements.js) from stealing
     [data-action="openAdvertHub"] / [data-action="closeAdvertHub"].
   • Stores ads in localStorage under ZBS_ADVERTS_KEY.
   • Renders into #advertHubGrid (Browse) and #advertHubMyAds (My Ads).
   ================================================================ */
(function () {
    'use strict';

    /* ------------------------------------------------------------
       Configuration
       ------------------------------------------------------------ */
    const ZBS_ADVERTS_KEY = 'zbs_adverts_v1';
    const TIER_DAYS = { free: 7, silver: 30, gold: 90 };
    const TIER_LABEL = { free: 'Free', silver: 'Silver', gold: 'Gold' };

    /* ------------------------------------------------------------
       Utilities
       ------------------------------------------------------------ */
    function whenReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function uid() {
        return 'adv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatMoney(n, currency) {
        const num = Number(n);
        if (!isFinite(num) || num <= 0) return '';
        const cur = currency || (window.CURRENCY && window.CURRENCY.code) || 'ZMW';
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency', currency: cur, maximumFractionDigits: 2
            }).format(num);
        } catch (_) {
            return cur + ' ' + num.toFixed(2);
        }
    }

    function timeAgo(ts) {
        const diff = Math.floor((Date.now() - Number(ts || 0)) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        const d = Math.floor(diff / 86400);
        return d + 'd ago';
    }

    /* ------------------------------------------------------------
       Storage layer
       ------------------------------------------------------------ */
    function loadAds() {
        try {
            const raw = localStorage.getItem(ZBS_ADVERTS_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function saveAds(ads) {
        try {
            localStorage.setItem(ZBS_ADVERTS_KEY, JSON.stringify(ads));
        } catch (_) { /* quota */ }
    }

    function addAd(ad) {
        const list = loadAds();
        list.unshift(ad);
        saveAds(list);
        return ad;
    }

    function expireIfNeeded(ads) {
        const now = Date.now();
        let changed = false;
        ads.forEach(a => {
            if (a.status === 'active' && a.expiresAt && Number(a.expiresAt) < now) {
                a.status = 'expired';
                changed = true;
            }
        });
        if (changed) saveAds(ads);
        return ads;
    }

    /* ------------------------------------------------------------
       Boot
       ------------------------------------------------------------ */
    whenReady(function () {
        const modal = document.getElementById('advertHubModal');
        if (!modal) {
            console.warn('[advert-hub] #advertHubModal not found — nothing to open.');
            return;
        }

        /* ============================================================
           Open / close helpers
           ============================================================ */
        function openHub(e) {
            if (e) e.preventDefault();
            modal.hidden = false;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            /* Refresh views whenever the hub is opened */
            refreshAllViews();
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

        /* ============================================================
           Capture-phase delegated open/close
           ============================================================ */
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
            if (e.target === modal && isOpen()) {
                closeHub(e);
            }
        }, true);

        /* Esc key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) closeHub(e);
        });

        /* ============================================================
           Tab switching
           ============================================================ */
        function activateTab(target) {
            modal.querySelectorAll('.advert-hub-tab').forEach(t => {
                const on = t.dataset.advTab === target;
                t.classList.toggle('active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            modal.querySelectorAll('.advert-hub-panel').forEach(p => {
                p.classList.toggle('active', p.dataset.advPanel === target);
            });

            /* Lazy render each tab on activation */
            if (target === 'browse')  renderBrowseGrid();
            if (target === 'myads')   renderMyAds();
        }

        modal.addEventListener('click', function (e) {
            const tab = e.target.closest('.advert-hub-tab');
            if (!tab || !tab.dataset.advTab) return;
            activateTab(tab.dataset.advTab);
        });

        /* ============================================================
           Pricing pick → switch to Post tab + preselect tier
           ============================================================ */
        modal.addEventListener('click', function (e) {
            const pick = e.target.closest('[data-action="advertHubPickTier"]');
            if (!pick) return;
            const tier = pick.dataset.tier;
            const tierSelect = document.getElementById('advTier');
            if (tierSelect) tierSelect.value = tier;
            activateTab('post');
        });

        /* ============================================================
           Toast helper (safe if #advert-hub-toast absent)
           ============================================================ */
        function hubToast(msg, kind) {
            const el = document.getElementById('advert-hub-toast');
            if (!el) return;
            el.textContent = msg;
            el.className = 'show ' + (kind || '');
            clearTimeout(hubToast._t);
            hubToast._t = setTimeout(() => { el.className = ''; }, 2600);
        }

        /* ============================================================
           IMAGE UPLOADER
           ============================================================ */
        (function initAdvertImageUploader() {
            const drop        = document.getElementById('advImageDrop');
            const input       = document.getElementById('advImageInput');
            const dataInput   = document.getElementById('advImageData');
            const placeholder = document.getElementById('advImagePlaceholder');
            const preview     = document.getElementById('advImagePreview');
            const previewImg  = document.getElementById('advImagePreviewImg');
            const removeBtn   = document.getElementById('advImageRemoveBtn');
            const urlInput    = document.getElementById('advImageUrl');

            if (!drop || !input) return;

            const MAX_BYTES = 5 * 1024 * 1024;
            const statusEl  = document.getElementById('advPostStatus');

            function flashStatus(msg, kind) {
                if (!statusEl) return;
                statusEl.textContent = msg;
                statusEl.className = 'advert-hub-status ' + (kind || '');
                statusEl.hidden = !msg;
                if (msg) {
                    clearTimeout(flashStatus._t);
                    flashStatus._t = setTimeout(() => {
                        statusEl.hidden = true;
                        statusEl.textContent = '';
                    }, 3000);
                }
            }

            function showPreview(src) {
                if (!previewImg || !preview || !placeholder) return;
                previewImg.src = src;
                preview.hidden = false;
                placeholder.hidden = true;
            }

            function clearImage() {
                input.value = '';
                if (dataInput) dataInput.value = '';
                if (urlInput) urlInput.value = '';
                if (previewImg) previewImg.removeAttribute('src');
                if (preview) preview.hidden = true;
                if (placeholder) placeholder.hidden = false;
            }

            function handleFile(file) {
                if (!file) return;
                if (!file.type || !file.type.startsWith('image/')) {
                    flashStatus('Please choose an image file (JPG, PNG, WEBP).', 'error');
                    return;
                }
                if (file.size > MAX_BYTES) {
                    flashStatus('Image must be 5 MB or smaller.', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const src = ev.target.result;
                    if (dataInput) dataInput.value = src;
                    showPreview(src);
                    flashStatus('✓ Image attached.', 'success');
                };
                reader.onerror = function () {
                    flashStatus('Could not read that file. Please try again.', 'error');
                };
                reader.readAsDataURL(file);
            }

            drop.addEventListener('click', function () { input.click(); });
            drop.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    input.click();
                }
            });

            input.addEventListener('change', function () {
                handleFile(input.files && input.files[0]);
            });

            ['dragenter', 'dragover'].forEach(function (ev) {
                drop.addEventListener(ev, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    drop.classList.add('dragover');
                });
            });
            ['dragleave', 'drop'].forEach(function (ev) {
                drop.addEventListener(ev, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    drop.classList.remove('dragover');
                });
            });
            drop.addEventListener('drop', function (e) {
                const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) handleFile(file);
            });

            if (removeBtn) {
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    clearImage();
                    flashStatus('Image removed.', 'info');
                });
            }

            if (urlInput) {
                urlInput.addEventListener('change', function () {
                    const url = urlInput.value.trim();
                    if (url) {
                        if (dataInput) dataInput.value = '';
                        if (input) input.value = '';
                        showPreview(url);
                    }
                });
            }

            const form = document.getElementById('advPostForm');
            if (form) {
                form.addEventListener('reset', function () {
                    setTimeout(clearImage, 0);
                });
            }

            window.__getAdvertImage = function () {
                if (dataInput && dataInput.value) return dataInput.value;
                if (urlInput && urlInput.value.trim()) return urlInput.value.trim();
                return '';
            };
        })();

        /* ============================================================
           RENDER — Browse grid
           ============================================================ */
        const browseGrid  = document.getElementById('advertHubGrid');
        const browseEmpty = document.getElementById('advertHubEmpty');
        const searchInput = document.getElementById('advertHubSearchInput');
        const categorySel = document.getElementById('advertHubCategoryFilter');

        function getActiveFilters() {
            return {
                q: (searchInput ? searchInput.value.trim().toLowerCase() : ''),
                category: (categorySel ? categorySel.value : '')
            };
        }

        function adMatches(ad, f) {
            if (f.category && ad.category !== f.category) return false;
            if (!f.q) return true;
            const hay = [ad.title, ad.description, ad.location, ad.contact, ad.category]
                .filter(Boolean).join(' ').toLowerCase();
            return hay.indexOf(f.q) !== -1;
        }

        function adCardHtml(ad) {
            const price = formatMoney(ad.price);
            const img = ad.image
                ? `<img src="${escapeHtml(ad.image)}" alt="" loading="lazy"
                        onerror="this.parentElement.classList.add('advert-card-noimg'); this.remove();" />`
                : '';
            const tierPill = ad.tier && ad.tier !== 'free'
                ? `<span class="advert-card-tier advert-card-tier--${escapeHtml(ad.tier)}">${escapeHtml(TIER_LABEL[ad.tier] || ad.tier)}</span>`
                : '';

            return `
                <article class="advert-card" data-ad-id="${escapeHtml(ad.id)}">
                    <div class="advert-card-media ${ad.image ? '' : 'advert-card-noimg'}">
                        ${img}
                        <span class="advert-card-cat">${escapeHtml(ad.category || 'other')}</span>
                        ${tierPill}
                    </div>
                    <div class="advert-card-body">
                        <h4 class="advert-card-title">${escapeHtml(ad.title)}</h4>
                        <p class="advert-card-desc">${escapeHtml((ad.description || '').slice(0, 140))}${
                            (ad.description || '').length > 140 ? '…' : ''
                        }</p>
                        <div class="advert-card-meta">
                            ${price ? `<span class="advert-card-price">${escapeHtml(price)}</span>` : ''}
                            ${ad.location ? `<span class="advert-card-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ad.location)}</span>` : ''}
                        </div>
                        <div class="advert-card-foot">
                            <a class="advert-card-contact" href="tel:${escapeHtml(ad.contact)}">
                                <i class="fas fa-phone"></i> ${escapeHtml(ad.contact)}
                            </a>
                            <span class="advert-card-time">${escapeHtml(timeAgo(ad.createdAt))}</span>
                        </div>
                    </div>
                </article>
            `;
        }

        function renderBrowseGrid() {
            if (!browseGrid) return;
            const ads = expireIfNeeded(loadAds()).filter(a => a.status === 'active');
            const filters = getActiveFilters();
            const filtered = ads.filter(a => adMatches(a, filters));

            if (!filtered.length) {
                browseGrid.innerHTML = '';
                if (browseEmpty) browseEmpty.classList.add('show');
                return;
            }
            if (browseEmpty) browseEmpty.classList.remove('show');

            browseGrid.innerHTML = filtered.map(adCardHtml).join('');
        }

        /* Live filters */
        if (searchInput) searchInput.addEventListener('input', renderBrowseGrid);
        if (categorySel) categorySel.addEventListener('change', renderBrowseGrid);

        /* ============================================================
           RENDER — My Ads + stats
           ============================================================ */
        const myAdsList   = document.getElementById('advertHubMyAds');
        const myAdsEmpty  = document.getElementById('advertHubMyAdsEmpty');
        const myAdsCount  = document.getElementById('advertHubMyAdsCount');

        const statActive  = document.getElementById('advertHubStatActive');
        const statPending = document.getElementById('advertHubStatPending');
        const statExpired = document.getElementById('advertHubStatExpired');
        const statViews   = document.getElementById('advertHubStatViews');

        function myAdRowHtml(ad) {
            const badge = `<span class="advert-myad-status advert-myad-status--${escapeHtml(ad.status || 'active')}">${escapeHtml(ad.status || 'active')}</span>`;
            const price = formatMoney(ad.price);
            const thumb = ad.image
                ? `<img src="${escapeHtml(ad.image)}" alt="" loading="lazy"
                        onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'advert-myad-thumb-fallback',textContent:'📢'}))" />`
                : `<div class="advert-myad-thumb-fallback">📢</div>`;

            return `
                <div class="advert-myad-row" data-ad-id="${escapeHtml(ad.id)}">
                    <div class="advert-myad-thumb">${thumb}</div>
                    <div class="advert-myad-main">
                        <div class="advert-myad-title-row">
                            <h4>${escapeHtml(ad.title)}</h4>
                            ${badge}
                        </div>
                        <p class="advert-myad-meta">
                            ${escapeHtml(ad.category || 'other')}
                            ${price ? ' • ' + escapeHtml(price) : ''}
                            • ${escapeHtml(timeAgo(ad.createdAt))}
                        </p>
                    </div>
                    <div class="advert-myad-actions">
                        <button type="button" class="advert-myad-btn advert-myad-btn--del"
                                data-action="advertHubDeleteAd"
                                data-ad-id="${escapeHtml(ad.id)}"
                                title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }

        function renderMyAds() {
            if (!myAdsList) return;
            const all = expireIfNeeded(loadAds());

            /* stats */
            if (statActive)  statActive.textContent  = all.filter(a => a.status === 'active').length;
            if (statPending) statPending.textContent = all.filter(a => a.status === 'pending').length;
            if (statExpired) statExpired.textContent = all.filter(a => a.status === 'expired').length;
            if (statViews)   statViews.textContent   = all.reduce((s, a) => s + (Number(a.views) || 0), 0);

            if (myAdsCount) myAdsCount.textContent = all.length;

            if (!all.length) {
                myAdsList.innerHTML = '';
                if (myAdsEmpty) myAdsEmpty.classList.add('show');
                return;
            }
            if (myAdsEmpty) myAdsEmpty.classList.remove('show');

            myAdsList.innerHTML = all.map(myAdRowHtml).join('');
        }

        /* Delete handler (delegated) */
        modal.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action="advertHubDeleteAd"]');
            if (!btn) return;
            e.preventDefault();
            const id = btn.dataset.adId;
            if (!id) return;
            if (!confirm('Delete this ad?')) return;
            const list = loadAds().filter(a => a.id !== id);
            saveAds(list);
            renderMyAds();
            renderBrowseGrid();
            hubToast('Ad deleted', 'info');
        });

        /* ============================================================
           POST FORM
           ============================================================ */
        const form   = document.getElementById('advPostForm');
        const status = document.getElementById('advPostStatus');

        function showStatus(msg, kind) {
            if (!status) return;
            status.textContent = msg;
            status.className = 'advert-hub-status ' + (kind || '');
            status.hidden = !msg;
        }

        function getAdvertImage() {
            if (typeof window.__getAdvertImage === 'function') {
                return window.__getAdvertImage();
            }
            const u = document.getElementById('advImageUrl');
            return u ? u.value.trim() : '';
        }

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                const get = (name) => (form.elements[name] ? form.elements[name].value : '');

                const data = {
                    title:       get('advTitle').trim(),
                    category:    get('advCategory'),
                    description: get('advDescription').trim(),
                    price:       get('advPrice'),
                    contact:     get('advContact').trim(),
                    location:    get('advLocation').trim(),
                    image:       getAdvertImage(),
                    tier:        get('advTier') || 'free'
                };

                if (!data.title || !data.category || !data.description || !data.contact) {
                    showStatus('Please fill in all required fields.', 'error');
                    return;
                }

                showStatus('Submitting…', 'info');

                const now = Date.now();
                const tier = TIER_DAYS[data.tier] ? data.tier : 'free';
                const days = TIER_DAYS[tier];

                const ad = {
                    id:          uid(),
                    title:       data.title,
                    category:    data.category,
                    description: data.description,
                    price:       data.price,
                    contact:     data.contact,
                    location:    data.location,
                    image:       data.image,
                    tier:        tier,
                    /* Paid tiers require payment → pending; free goes live immediately */
                    status:      tier === 'free' ? 'active' : 'pending',
                    views:       0,
                    createdAt:   now,
                    expiresAt:   now + days * 24 * 60 * 60 * 1000
                };

                addAd(ad);

                /* Switch to Browse so the user sees their new ad immediately */
                renderBrowseGrid();
                renderMyAds();

                const msg = tier === 'free'
                    ? '✓ Your ad is live!'
                    : '✓ Submitted! Awaiting payment confirmation.';
                showStatus(msg, 'success');

                form.reset();
                /* clear uploader previews */
                const input  = document.getElementById('advImageInput');
                const dataIx = document.getElementById('advImageData');
                const prev   = document.getElementById('advImagePreview');
                const ph     = document.getElementById('advImagePlaceholder');
                const pimg   = document.getElementById('advImagePreviewImg');
                if (input)  input.value = '';
                if (dataIx) dataIx.value = '';
                if (pimg)   pimg.removeAttribute('src');
                if (prev)   prev.hidden = true;
                if (ph)     ph.hidden = false;

                /* After 1.5s, jump to Browse tab so user sees it */
                setTimeout(function () {
                    showStatus('');
                    activateTab('browse');
                }, 1500);
            });
        }

        /* ============================================================
           Refresh helper — called on open
           ============================================================ */
        function refreshAllViews() {
            renderBrowseGrid();
            renderMyAds();
        }

        /* Initial render (safe even if modal is closed) */
        refreshAllViews();

        console.log('[advert-hub] ready');
    });
})();