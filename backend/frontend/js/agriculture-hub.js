/* ============================================================
   AGRICULTURE HUB — Full Modal Controller
   Path: js/agriculture-hub.js
   Handles: main hub, live listings, post form (user + admin),
            listing detail, cart, geolocation, search, permits
   Exposes: open(), close(), openPost(), closePost(),
            openListing(), closeListing(), useLocation(),
            fillPostGeo(), openCart(), closeCart(), closeItem(),
            openPermit(), closePermit()
   ------------------------------------------------------------
   v2.1.0 — Real imagery + backend integration
     • CAT_IMAGES map: real photography for every category
     • renderGrid() / renderStaticCategories() always render
       real <img> tags with lazy-loading + onerror fallback
     • seedIfEmpty() ships with real Unsplash photos
     • submitPost() supports file upload via /api/upload
       (falls back to URL field if no file / endpoint missing)
     • load() now calls API.agriculture.list() (async)
     • submitPost() posts to API.agriculture.create()
     • submitPermit() posts to API.agriculture.create({type:'permit'})
     • checkoutCart() posts to API.market.create()
     • localStorage retained as an offline cache fallback
     • init() is async
   ============================================================ */

(function () {
    'use strict';

    /* ==========================================================
       CONFIG
       ========================================================== */
    const CONFIG = {
        modalId:        'agricultureModal',
        gridId:         'agriLiveGrid',
        staticGridId:   'agriCategoriesGrid',
        emptyId:        'agriLiveEmpty',
        countId:        'agriLiveCount',
        searchInputId:  'agriSearchInput',
        locationTextId: 'agriLocationText',
        locationBtnId:  'agriLocationBtn',
        postModalId:    'agriPostModal',
        postFormId:     'agriPostForm',
        itemModalId:    'agriItemModal',
        cartModalId:    'agriCartModal',
        listingModalId: 'agriListingModal',
        permitModalId:  'agriPermitModal',
        permitFormId:   'agriPermitForm',
        permitSellerBodyId: 'permitSellerBody',
        permitStatusId: 'agriPermitStatus',
        permitAddRowId: 'permitAddSellerRow',
        cartBadgeId:    'agriCartBadge',
        uploadEndpoint: '/api/upload'
    };

    const ADMIN_KEY    = 'ZBS-ADMIN';
    const STORAGE_KEY  = 'zbs_agri_listings';
    const LOCATION_KEY = 'zbs_agri_location';
    const CART_KEY     = 'zbs_agri_cart';
    const PERMIT_KEY   = 'zbs_agri_permits';

    /* ==========================================================
       CATEGORY ICON MAP (fallback glyphs)
       ========================================================== */
    const CAT_ICONS = {
        'meat':           '🥩',
        'eggs-dairy':     '🥚',
        'dried-foods':    '🍲',
        'livestock':      '🐄',
        'farm-produce':   '🌾',
        'agro-chemicals': '🧪',
        'farm-services':  '🚜',
        'other':          '📦'
    };

    /* ==========================================================
       CATEGORY IMAGE MAP — real photography
       Swap these for your own /assets/agri/*.webp files when ready.
       ========================================================== */
    const CAT_IMAGES = {
        'meat':           'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=70',
        'eggs-dairy':     'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=800&q=70',
        'dried-foods':    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=70',
        'livestock':      'https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=800&q=70',
        'farm-produce':   'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=70',
        'agro-chemicals': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=70',
        'farm-services':  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=70',
        'other':          'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=70'
    };

    function categoryImage(cat) {
        return CAT_IMAGES[cat] || CAT_IMAGES['other'];
    }

    /* ==========================================================
       STATIC CATEGORY GRID
       ========================================================== */
    const STATIC_CATEGORIES = [
        { slug: 'meat',           name: 'Meat',            icon: '🥩', desc: 'Beef, pork, mutton, poultry and processed meat.' },
        { slug: 'eggs-dairy',     name: 'Eggs & Dairy',    icon: '🥚', desc: 'Table eggs, hatching eggs, milk, cheese and yoghurt.' },
        { slug: 'dried-foods',    name: 'Dried Foods',     icon: '🍲', desc: 'Grains, legumes, dried fruits, spices and nuts.' },
        { slug: 'livestock',      name: 'Livestock',       icon: '🐄', desc: 'Cattle, goats, pigs, poultry, fish and bees.' },
        { slug: 'farm-produce',   name: 'Farm Produce',    icon: '🌾', desc: 'Fresh vegetables, fruits, flowers and fodder.' },
        { slug: 'agro-chemicals', name: 'Agro-Chemicals',  icon: '🧪', desc: 'Fertilizers, pesticides, herbicides and growth boosters.' },
        { slug: 'farm-services',  name: 'Farm Services',   icon: '🚜', desc: 'Tractor hire, irrigation, soil testing, vet services.' },
        { slug: 'other',          name: 'Other',           icon: '📦', desc: 'Any other agricultural product or service.' }
    ];

    /* ==========================================================
       STATE
       ========================================================== */
    const state = {
        listings: [],
        userLocation: null,
        searchQuery: '',
        filterCategory: '',
        cart: [],
        postMode: 'user',
        selectedListingId: null
    };

    /* ==========================================================
       HELPERS
       ========================================================== */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    function toast(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[AgricultureHub]', msg);
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function money(n) {
        return '$' + (Number(n) || 0).toFixed(2);
    }

    function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /* ==========================================================
       PERSISTENCE (offline cache + backend)
       ========================================================== */
    function saveListingsLocal() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.listings)); } catch (e) {}
    }
    function saveCart() {
        try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {}
        updateCartBadge();
    }
    function saveLocation() {
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(state.userLocation)); } catch (e) {}
    }

    async function load() {
        try {
            if (window.API && window.API.agriculture) {
                const r = await window.API.agriculture.list();
                const list = Array.isArray(r) ? r : (r.listings || r.data || []);
                if (Array.isArray(list) && list.length) {
                    state.listings = list.map(normalizeListing);
                    saveListingsLocal();
                }
            }
        } catch (err) {
            console.warn('[AgricultureHub] backend unavailable, using offline cache:', err.message);
        }

        if (!state.listings.length) {
            try { state.listings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
            catch (e) { state.listings = []; }
        }

        try { state.userLocation = JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null'); }
        catch (e) { state.userLocation = null; }

        try { state.cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
        catch (e) { state.cart = []; }
    }

    function normalizeListing(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            id:          raw.id || raw._id || raw.listingId || ('agri_' + Math.random().toString(36).slice(2, 8)),
            type:        raw.type || 'user',
            category:    raw.category || 'other',
            subcategory: raw.subcategory || '',
            name:        raw.name || raw.title || '',
            desc:        raw.desc || raw.description || '',
            price:       Number(raw.price) || 0,
            unit:        raw.unit || 'unit',
            qty:         Number(raw.qty || raw.quantity) || 0,
            region:      raw.region || '',
            city:        raw.city || '',
            lat:         raw.lat != null ? Number(raw.lat) : null,
            lng:         raw.lng != null ? Number(raw.lng) : null,
            seller:      raw.seller || raw.sellerName || '',
            phone:       raw.phone || raw.sellerPhone || '',
            image:       raw.image || '',
            createdAt:   raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
        };
    }

    /* ==========================================================
       IMAGE UPLOAD
       ========================================================== */
    async function uploadImage(file) {
        if (!file) return '';
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(CONFIG.uploadEndpoint, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed: ' + res.status);
        const json = await res.json();
        return json.url || json.path || json.location || '';
    }

    /* ==========================================================
       SEED DEMO LISTINGS (with real photos)
       ========================================================== */
    function seedIfEmpty() {
        if (state.listings.length > 0) return;
        const now = Date.now();
        state.listings = [
            {
                id: 'agri_seed_1',
                type: 'admin',
                category: 'livestock',
                subcategory: 'Goats',
                name: 'Boer Goats — 30 head available',
                desc: 'Healthy Boer goats, vaccinated, 25–40 kg live weight. Ready for transport.',
                price: 180,
                unit: 'head',
                qty: 30,
                region: 'Central',
                city: 'Choma',
                lat: -14.4469,
                lng: 28.4464,
                seller: 'ZBS Farm',
                phone: '+260 97 111 2222',
                image: 'https://images.unsplash.com/photo-1533318087104-0d3c8e8c3b8e?auto=format&fit=crop&w=800&q=70',
                createdAt: now - 100000
            },
            {
                id: 'agri_seed_2',
                type: 'user',
                category: 'farm-produce',
                subcategory: 'Tomatoes',
                name: 'Fresh Tomatoes — 500 kg',
                desc: 'Vine-ripened Roma tomatoes, packed in 20 kg crates. Harvested this week.',
                price: 0.90,
                unit: 'kg',
                qty: 500,
                region: 'Lusaka',
                city: 'Lusaka',
                lat: -15.3875,
                lng: 28.3228,
                seller: 'Mwansa Family Farm',
                phone: '+260 96 333 4444',
                image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=70',
                createdAt: now - 200000
            },
            {
                id: 'agri_seed_3',
                type: 'user',
                category: 'dried-foods',
                subcategory: 'Maize',
                name: 'Cleaned Dry Maize — 20 tonnes',
                desc: 'Moisture ≤ 13%, aflatoxin tested. Delivered in 50 kg bags.',
                price: 0.32,
                unit: 'kg',
                qty: 20000,
                region: 'Eastern',
                city: 'Chipata',
                lat: -13.6333,
                lng: 32.6500,
                seller: 'Chipata Grain Traders',
                phone: '+260 95 555 6666',
                image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=70',
                createdAt: now - 300000
            }
        ];
        saveListingsLocal();
    }

    /* ==========================================================
       RENDER — LIVE LISTINGS GRID
       ========================================================== */
    function renderGrid() {
        const grid  = $('#' + CONFIG.gridId);
        const empty = $('#' + CONFIG.emptyId);
        const count = $('#' + CONFIG.countId);
        if (!grid) return;

        const q = state.searchQuery.toLowerCase().trim();

        let list = state.listings.slice();

        if (q) {
            list = list.filter(l =>
                (l.name || '').toLowerCase().includes(q) ||
                (l.desc || '').toLowerCase().includes(q) ||
                (l.category || '').toLowerCase().includes(q) ||
                (l.subcategory || '').toLowerCase().includes(q) ||
                (l.seller || '').toLowerCase().includes(q) ||
                (l.region || '').toLowerCase().includes(q) ||
                (l.city || '').toLowerCase().includes(q)
            );
        }

        if (state.filterCategory) {
            list = list.filter(l => l.category === state.filterCategory);
        }

        if (state.userLocation) {
            list = list.map(l => {
                const d = (l.lat && l.lng)
                    ? haversine(state.userLocation.lat, state.userLocation.lng, l.lat, l.lng)
                    : null;
                return Object.assign({}, l, { _distance: d });
            }).sort((a, b) => {
                if (a._distance == null && b._distance == null) return 0;
                if (a._distance == null) return 1;
                if (b._distance == null) return -1;
                return a._distance - b._distance;
            });
        } else {
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        if (count) count.textContent = list.length;

        if (list.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.classList.add('show');
            return;
        }
        if (empty) empty.classList.remove('show');

        grid.innerHTML = list.map(l => {
            const icon = CAT_ICONS[l.category] || '📦';
            const imgSrc = l.image || categoryImage(l.category);
            const distanceHtml = (l._distance != null)
                ? `<span class="agri-listing-distance"><i class="fas fa-location-arrow"></i> ${l._distance.toFixed(1)} km</span>`
                : '';
            const typeBadge = l.type === 'admin'
                ? '<span class="agri-listing-source admin">ADMIN</span>'
                : '<span class="agri-listing-source user">USER</span>';

            return `
                <div class="agri-listing-card" data-action="openAgriListing" data-id="${l.id}">
                    <div class="agri-listing-thumb">
                        <img src="${escapeHtml(imgSrc)}"
                             alt="${escapeHtml(l.name)}"
                             class="agri-listing-img"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='${CAT_IMAGES.other}'">
                        ${typeBadge}
                    </div>
                    <div class="agri-listing-body">
                        <div class="agri-listing-name">${escapeHtml(l.name)}</div>
                        <div class="agri-listing-meta">
                            <span class="agri-listing-cat">${icon} ${escapeHtml(l.category)}</span>
                            ${distanceHtml}
                        </div>
                        <div class="agri-listing-loc">
                            <i class="fas fa-map-marker-alt"></i>
                            ${escapeHtml(l.city || l.region || '—')} · ${escapeHtml(l.seller || '—')}
                        </div>
                        <div class="agri-listing-footer">
                            <span class="agri-listing-price">${money(l.price)}<small> /${escapeHtml(l.unit || 'unit')}</small></span>
                            <span class="agri-listing-qty">${escapeHtml(String(l.qty || '—'))} avail.</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ==========================================================
       RENDER — STATIC CATEGORY GRID
       ========================================================== */
    function renderStaticCategories() {
        const grid = $('#' + CONFIG.staticGridId);
        if (!grid) return;

        grid.innerHTML = STATIC_CATEGORIES.map(cat => {
            const count = state.listings.filter(l => l.category === cat.slug).length;
            return `
                <div class="agri-category-card" data-action="agriFilterCategory" data-category="${cat.slug}">
                    <div class="agri-category-thumb">
                        <img src="${categoryImage(cat.slug)}"
                             alt="${escapeHtml(cat.name)}"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='${CAT_IMAGES.other}'">
                    </div>
                    <div class="agri-category-name">${escapeHtml(cat.name)}</div>
                    <div class="agri-category-desc">${escapeHtml(cat.desc)}</div>
                    <div class="agri-category-count">${count} listing${count !== 1 ? 's' : ''}</div>
                </div>
            `;
        }).join('');
    }

    /* ==========================================================
       OPEN / CLOSE MAIN MODAL
       ========================================================== */
    function open() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) {
            console.warn('[AgricultureHub] #' + CONFIG.modalId + ' not found in DOM');
            toast('⚠️ Agriculture Hub modal missing');
            return;
        }
        updateLocationText();
        updateCartBadge();
        renderGrid();
        renderStaticCategories();
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function close() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }

    /* ==========================================================
       GEOLOCATION
       ========================================================== */
    function useLocation() {
        if (!navigator.geolocation) {
            toast('❌ Geolocation not supported');
            return;
        }
        const btn = $('#' + CONFIG.locationBtnId);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                state.userLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                saveLocation();
                updateLocationText();
                renderGrid();
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Update';
                }
                toast('✅ Location set — nearest listings first');
            },
            err => {
                toast('❌ ' + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    function updateLocationText() {
        const el = $('#' + CONFIG.locationTextId);
        if (!el) return;
        el.textContent = state.userLocation
            ? `Near ${state.userLocation.lat.toFixed(3)}, ${state.userLocation.lng.toFixed(3)}`
            : 'Location not set — enable to sort by distance';
    }

    function fillPostGeo() {
        if (!navigator.geolocation) {
            toast('❌ Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = $('#agriPostLat');
                const lng = $('#agriPostLng');
                if (lat) lat.value = pos.coords.latitude.toFixed(6);
                if (lng) lng.value = pos.coords.longitude.toFixed(6);
                toast('✅ Coordinates filled');
            },
            err => toast('❌ ' + err.message),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    /* ==========================================================
       POST FORM
       ========================================================== */
    function openPost(mode) {
        const modal = $('#' + CONFIG.postModalId);
        if (!modal) {
            console.warn('[AgricultureHub] #' + CONFIG.postModalId + ' not found');
            toast('⚠️ Post modal missing');
            return;
        }

        state.postMode = (mode === 'admin') ? 'admin' : 'user';

        const titleEl = $('#agriPostTitle');
        const badgeEl = $('#agriPostBadge');
        const iconEl  = $('#agriPostIcon');

        if (titleEl) titleEl.textContent = state.postMode === 'admin' ? 'Admin Post' : 'Post Listing';
        if (badgeEl) {
            badgeEl.textContent = state.postMode.toUpperCase();
            badgeEl.className = 'agri-post-badge ' + state.postMode;
        }
        if (iconEl) {
            iconEl.className = state.postMode === 'admin'
                ? 'fas fa-lock'
                : 'fas fa-plus-circle';
        }

        const adminGroup = $('#agriAdminKeyGroup');
        if (adminGroup) {
            if (state.postMode === 'admin') adminGroup.removeAttribute('hidden');
            else adminGroup.setAttribute('hidden', '');
        }

        if (state.userLocation) {
            const lat = $('#agriPostLat');
            const lng = $('#agriPostLng');
            if (lat && !lat.value) lat.value = state.userLocation.lat.toFixed(6);
            if (lng && !lng.value) lng.value = state.userLocation.lng.toFixed(6);
        }

        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));

        setTimeout(() => $('#agriPostCategory')?.focus(), 200);
    }

    function closePost() {
        const modal = $('#' + CONFIG.postModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
            const st = $('#agriPostStatus');
            if (st) st.setAttribute('hidden', '');
        }, 200);
    }

    async function submitPost(e) {
        e.preventDefault();
        const statusEl = $('#agriPostStatus');

        if (state.postMode === 'admin') {
            const key = $('#agriAdminKey')?.value.trim();
            if (key !== ADMIN_KEY) {
                showPostStatus(statusEl, '❌ Invalid admin key.', 'error');
                return;
            }
        }

        const required = [
            'agriPostCategory',
            'agriPostName',
            'agriPostDesc',
            'agriPostPrice',
            'agriPostRegion',
            'agriPostSeller',
            'agriPostPhone'
        ];
        for (const id of required) {
            const el = $('#' + id);
            if (!el || !el.value.trim()) {
                showPostStatus(statusEl, '❌ Please fill all required fields.', 'error');
                return;
            }
        }

        if (!$('#agriPostTerms')?.checked) {
            showPostStatus(statusEl, '❌ Please confirm the listing is accurate.', 'error');
            return;
        }

        const submitBtn = document.querySelector('#agriPostForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';
        }

        // Resolve image: uploaded file first, then URL fallback
        let imageUrl = $('#agriPostImage')?.value.trim() || '';
        const fileInput = $('#agriPostImageFile');
        if (fileInput?.files?.[0]) {
            try {
                const uploaded = await uploadImage(fileInput.files[0]);
                if (uploaded) imageUrl = uploaded;
            } catch (err) {
                console.warn('[AgricultureHub] image upload failed:', err.message);
                showPostStatus(statusEl, '⚠️ Image upload failed — publishing without image.', 'error');
            }
        }

        const listing = {
            id: 'agri_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            type: state.postMode,
            category: $('#agriPostCategory').value,
            subcategory: $('#agriPostSubcategory')?.value.trim() || '',
            name: $('#agriPostName').value.trim(),
            desc: $('#agriPostDesc').value.trim(),
            price: parseFloat($('#agriPostPrice').value) || 0,
            unit: $('#agriPostUnit')?.value || 'unit',
            qty: parseInt($('#agriPostQty')?.value) || 0,
            region: $('#agriPostRegion').value,
            city: $('#agriPostCity')?.value.trim() || '',
            lat: parseFloat($('#agriPostLat')?.value) || null,
            lng: parseFloat($('#agriPostLng')?.value) || null,
            seller: $('#agriPostSeller').value.trim(),
            phone: $('#agriPostPhone').value.trim(),
            image: imageUrl,
            createdAt: Date.now()
        };

        if (window.API && window.API.agriculture) {
            try {
                const saved = await window.API.agriculture.create(listing);
                if (saved && (saved.id || saved._id)) {
                    listing.id = saved.id || saved._id;
                }
            } catch (err) {
                console.warn('[AgricultureHub] server save failed, saving locally:', err.message);
            }
        }

        state.listings.unshift(listing);
        saveListingsLocal();
        renderGrid();
        renderStaticCategories();

        showPostStatus(statusEl, '✅ Listing published successfully!', 'success');
        toast('🌾 Listing published!');

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Publish Listing';
        }

        setTimeout(() => {
            closePost();
            $('#agriPostForm')?.reset();
            showPostStatus(statusEl, '', '');
            if (state.postMode === 'admin') {
                $('#agriAdminKeyGroup')?.setAttribute('hidden', '');
            }
        }, 1500);
    }

    function showPostStatus(el, msg, type) {
        if (!el) return;
        if (!msg) {
            el.hidden = true;
            el.setAttribute('hidden', '');
            return;
        }
        el.textContent = msg;
        el.className = 'agri-post-status ' + type;
        el.hidden = false;
        el.removeAttribute('hidden');
    }

    /* ==========================================================
       LISTING DETAIL
       ========================================================== */
    function openListing(id) {
        const l = state.listings.find(x => x.id === id);
        if (!l) {
            toast('⚠️ Listing not found');
            return;
        }
        state.selectedListingId = id;

        const modal = $('#' + CONFIG.listingModalId);
        if (!modal) {
            console.warn('[AgricultureHub] #' + CONFIG.listingModalId + ' not found');
            return;
        }

        const icon = CAT_ICONS[l.category] || '📦';
        const imgSrc = l.image || categoryImage(l.category);

        const iconEl  = $('#agriListingIcon');
        const titleEl = $('#agriListingTitle');
        const bodyEl  = $('#agriListingBody');
        const callBtn = $('#agriListingCall');

        if (iconEl)  iconEl.textContent = icon;
        if (titleEl) titleEl.textContent = l.name;

        const dist = (state.userLocation && l.lat && l.lng)
            ? `${haversine(state.userLocation.lat, state.userLocation.lng, l.lat, l.lng).toFixed(1)} km from you`
            : '—';

        if (bodyEl) {
            bodyEl.innerHTML = `
                <img src="${escapeHtml(imgSrc)}"
                     alt="${escapeHtml(l.name)}"
                     style="width:100%;border-radius:10px;margin-bottom:12px;max-height:260px;object-fit:cover;background:#f1f5f9;"
                     onerror="this.onerror=null;this.src='${CAT_IMAGES.other}'">
                <div class="agri-listing-detail">
                    <div class="agri-listing-price-lg">
                        ${money(l.price)} <small>/${escapeHtml(l.unit)}</small>
                    </div>
                    <div class="agri-listing-tags">
                        <span class="agri-tag">${icon} ${escapeHtml(l.category)}</span>
                        ${l.subcategory ? `<span class="agri-tag">${escapeHtml(l.subcategory)}</span>` : ''}
                        <span class="agri-tag ${l.type}">${l.type === 'admin' ? '🏢 Admin' : '👤 User'}</span>
                    </div>
                    <p class="agri-listing-desc">${escapeHtml(l.desc)}</p>
                    <div class="agri-listing-fields">
                        <div><i class="fas fa-cubes"></i> <strong>${escapeHtml(String(l.qty || '—'))}</strong> ${escapeHtml(l.unit)} available</div>
                        <div><i class="fas fa-map-marker-alt"></i> ${escapeHtml(l.city || '—')}, ${escapeHtml(l.region)} · ${escapeHtml(dist)}</div>
                        <div><i class="fas fa-user"></i> ${escapeHtml(l.seller)}</div>
                        <div><i class="fas fa-phone"></i> ${escapeHtml(l.phone)}</div>
                        <div><i class="fas fa-clock"></i> Posted ${new Date(l.createdAt).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }

        if (callBtn) {
            callBtn.href = 'tel:' + (l.phone || '').replace(/\s+/g, '');
        }

        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function closeListing() {
        const modal = $('#' + CONFIG.listingModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
            state.selectedListingId = null;
        }, 200);
    }

    /* ==========================================================
       CART
       ========================================================== */
    function openCart() {
        const modal = $('#' + CONFIG.cartModalId);
        if (!modal) return;
        renderCart();
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function closeCart() {
        const modal = $('#' + CONFIG.cartModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }

    function renderCart() {
        const body = $('#agriCartBody');
        if (!body) return;

        if (state.cart.length === 0) {
            body.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:#64748b;">
                    <i class="fas fa-shopping-cart" style="font-size:2.4rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
                    <p style="font-size:0.9rem;font-weight:700;margin:0;">Your cart is empty</p>
                    <small style="font-size:0.75rem;opacity:0.75;">Browse listings and add items to get started.</small>
                </div>
            `;
        } else {
            body.innerHTML = state.cart.map(item => `
                <div class="agri-cart-item">
                    <div class="agri-cart-item-info">
                        <span class="agri-cart-item-name">${escapeHtml(item.name)}</span>
                        <span class="agri-cart-item-price">${money(item.price)} × ${item.qty} ${escapeHtml(item.unit || '')}</span>
                    </div>
                    <div class="agri-cart-item-qty">
                        <button data-action="agriCartQty" data-id="${item.id}" data-delta="-1">−</button>
                        <span>${item.qty}</span>
                        <button data-action="agriCartQty" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                    <button class="agri-cart-item-remove" data-action="agriCartRemove" data-id="${item.id}">&times;</button>
                </div>
            `).join('');
        }

        const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const subtotalEl = $('#agriCartSubtotal');
        const taxEl      = $('#agriCartTax');
        const totalEl    = $('#agriCartGrand');
        const checkout   = $('#agriCheckoutBtn');

        if (subtotalEl) subtotalEl.textContent = money(subtotal);
        if (taxEl)      taxEl.textContent      = money(tax);
        if (totalEl)    totalEl.textContent    = money(total);
        if (checkout)   checkout.disabled      = state.cart.length === 0;
    }

    function addToCart(listing) {
        const existing = state.cart.find(i => i.id === listing.id);
        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                id: listing.id,
                name: listing.name,
                price: listing.price,
                unit: listing.unit,
                qty: 1
            });
        }
        saveCart();
        toast('✅ Added to cart');
    }

    function updateCartBadge() {
        const badge = $('#' + CONFIG.cartBadgeId);
        if (badge) badge.textContent = state.cart.reduce((s, i) => s + i.qty, 0);
    }

    /* ==========================================================
       CART CHECKOUT — place order via API
       ========================================================== */
    async function checkoutCart() {
        if (!state.cart.length) {
            toast('⚠️ Your cart is empty');
            return;
        }

        const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const order = {
            type: 'agriculture-order',
            items: state.cart.map(i => ({
                listingId: i.id,
                name: i.name,
                price: i.price,
                unit: i.unit,
                quantity: i.qty,
                subtotal: i.price * i.qty
            })),
            subtotal,
            tax,
            total,
            status: 'pending',
            placedAt: new Date().toISOString()
        };

        const checkoutBtn = $('#agriCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing order…';
        }

        if (window.API && window.API.market) {
            try {
                await window.API.market.create(order);
            } catch (err) {
                console.warn('[AgricultureHub] order save failed:', err.message);
                toast('⚠️ Order saved locally only');
            }
        }

        toast('✅ Order placed! We will contact you shortly.');
        state.cart = [];
        saveCart();
        renderCart();
        setTimeout(closeCart, 800);

        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-check"></i> Checkout';
        }
    }

    /* ==========================================================
       ITEM MODAL STUB
       ========================================================== */
    function closeItem() {
        const modal = $('#' + CONFIG.itemModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }

    /* ==========================================================
       ANIMAL ACQUISITION PERMIT
       ========================================================== */
    function openPermit() {
        const modal = document.getElementById(CONFIG.permitModalId);
        if (!modal) {
            console.warn('[AgricultureHub] #' + CONFIG.permitModalId + ' not found');
            toast('⚠️ Permit form missing');
            return;
        }
        const dateInput = document.getElementById('permitRepDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().slice(0, 10);
        }
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function closePermit() {
        const modal = document.getElementById(CONFIG.permitModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
            const st = document.getElementById(CONFIG.permitStatusId);
            if (st) st.setAttribute('hidden', '');
        }, 200);
    }

    function addPermitSellerRow() {
        const tbody = document.getElementById(CONFIG.permitSellerBodyId);
        if (!tbody) return;
        const rowCount = tbody.querySelectorAll('tr').length + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="agri-permit-sn">${rowCount}</td>
            <td><input type="text" data-field="seller_name" required /></td>
            <td><input type="text" data-field="seller_nrc" required /></td>
            <td><input type="tel" data-field="seller_phone" required /></td>
            <td><input type="text" data-field="animal_desc" required /></td>
            <td><input type="text" data-field="animal_colour" /></td>
            <td><input type="text" data-field="village" required /></td>
            <td><input type="text" data-field="district" required /></td>
            <td><input type="text" data-field="province" required /></td>
            <td><input type="text" data-field="seller_sign" /></td>
            <td><input type="date" data-field="seller_date" /></td>
        `;
        tbody.appendChild(tr);
    }

    async function submitPermit(e) {
        e.preventDefault();
        const statusEl = document.getElementById(CONFIG.permitStatusId);
        const fromEl = document.getElementById('permitFrom');
        const toEl = document.getElementById('permitTo');
        const repEl = document.getElementById('permitRepName');

        if (!fromEl?.value.trim() || !toEl?.value.trim() || !repEl?.value.trim()) {
            showPermitStatus(statusEl, '❌ Please fill Origin, Destination and ZBS Rep Name.', 'error');
            return;
        }

        const firstRow = document.querySelector('#' + CONFIG.permitSellerBodyId + ' tr');
        const requiredFields = ['seller_name', 'seller_nrc', 'seller_phone', 'animal_desc', 'village', 'district', 'province'];
        for (const field of requiredFields) {
            const input = firstRow?.querySelector(`[data-field="${field}"]`);
            if (!input?.value.trim()) {
                showPermitStatus(statusEl, '❌ Please complete all required fields in the seller table.', 'error');
                return;
            }
        }

        const permitData = {
            id: 'permit_' + Date.now().toString(36),
            type: 'permit',
            createdAt: Date.now(),
            status: 'pending',
            from: fromEl.value.trim(),
            to: toEl.value.trim(),
            zbsRep: repEl.value.trim(),
            zbsRepDate: document.getElementById('permitRepDate')?.value || '',
            sellers: Array.from(document.querySelectorAll('#' + CONFIG.permitSellerBodyId + ' tr')).map(row => ({
                name: row.querySelector('[data-field="seller_name"]')?.value || '',
                nrc: row.querySelector('[data-field="seller_nrc"]')?.value || '',
                phone: row.querySelector('[data-field="seller_phone"]')?.value || '',
                animalDesc: row.querySelector('[data-field="animal_desc"]')?.value || '',
                colour: row.querySelector('[data-field="animal_colour"]')?.value || '',
                village: row.querySelector('[data-field="village"]')?.value || '',
                district: row.querySelector('[data-field="district"]')?.value || '',
                province: row.querySelector('[data-field="province"]')?.value || '',
                sign: row.querySelector('[data-field="seller_sign"]')?.value || '',
                date: row.querySelector('[data-field="seller_date"]')?.value || ''
            })),
            clearance: {
                chief: {
                    name: document.querySelector('[data-field="chief_name"]')?.value || '',
                    nrc: document.querySelector('[data-field="chief_nrc"]')?.value || '',
                    phone: document.querySelector('[data-field="chief_phone"]')?.value || '',
                    comment: document.querySelector('[data-field="chief_comment"]')?.value || '',
                    village: document.querySelector('[data-field="chief_village"]')?.value || '',
                    district: document.querySelector('[data-field="chief_district"]')?.value || '',
                    province: document.querySelector('[data-field="chief_province"]')?.value || '',
                    sign: document.querySelector('[data-field="chief_sign"]')?.value || '',
                    date: document.querySelector('[data-field="chief_date"]')?.value || ''
                },
                vet: {
                    name: document.querySelector('[data-field="vet_name"]')?.value || '',
                    nrc: document.querySelector('[data-field="vet_nrc"]')?.value || '',
                    phone: document.querySelector('[data-field="vet_phone"]')?.value || '',
                    comment: document.querySelector('[data-field="vet_comment"]')?.value || '',
                    village: document.querySelector('[data-field="vet_village"]')?.value || '',
                    district: document.querySelector('[data-field="vet_district"]')?.value || '',
                    province: document.querySelector('[data-field="vet_province"]')?.value || '',
                    sign: document.querySelector('[data-field="vet_sign"]')?.value || '',
                    date: document.querySelector('[data-field="vet_date"]')?.value || ''
                },
                police: {
                    name: document.querySelector('[data-field="police_name"]')?.value || '',
                    nrc: document.querySelector('[data-field="police_nrc"]')?.value || '',
                    phone: document.querySelector('[data-field="police_phone"]')?.value || '',
                    comment: document.querySelector('[data-field="police_comment"]')?.value || '',
                    village: document.querySelector('[data-field="police_village"]')?.value || '',
                    district: document.querySelector('[data-field="police_district"]')?.value || '',
                    province: document.querySelector('[data-field="police_province"]')?.value || '',
                    sign: document.querySelector('[data-field="police_sign"]')?.value || '',
                    date: document.querySelector('[data-field="police_date"]')?.value || ''
                }
            }
        };

        const submitBtn = document.querySelector('#agriPermitForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
        }

        if (window.API && window.API.agriculture) {
            try {
                await window.API.agriculture.create(permitData);
            } catch (err) {
                console.warn('[AgricultureHub] permit save failed:', err.message);
            }
        }

        try {
            const existing = JSON.parse(localStorage.getItem(PERMIT_KEY) || '[]');
            existing.unshift(permitData);
            localStorage.setItem(PERMIT_KEY, JSON.stringify(existing));
        } catch (err) { /* silent */ }

        showPermitStatus(statusEl, '✅ Permit application submitted successfully! Our team will contact you within 24 hours.', 'success');

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Permit Application';
        }

        setTimeout(() => {
            closePermit();
            document.getElementById(CONFIG.permitFormId)?.reset();
            const st = document.getElementById(CONFIG.permitStatusId);
            if (st) st.setAttribute('hidden', '');
        }, 2500);
    }

    function showPermitStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'agri-permit-status ' + type;
        el.hidden = false;
        el.removeAttribute('hidden');
    }

    /* ==========================================================
       EVENT BINDINGS
       ========================================================== */
    function bindEvents() {
        // Search input
        const search = $('#' + CONFIG.searchInputId);
        if (search) {
            search.addEventListener('input', e => {
                state.searchQuery = e.target.value;
                renderGrid();
            });
        }

        // Post form submit
        const form = $('#' + CONFIG.postFormId);
        if (form) form.addEventListener('submit', submitPost);

        // Permit form
        const permitForm = document.getElementById(CONFIG.permitFormId);
        if (permitForm) permitForm.addEventListener('submit', submitPermit);

        const permitAddRow = document.getElementById(CONFIG.permitAddRowId);
        if (permitAddRow) permitAddRow.addEventListener('click', addPermitSellerRow);

        // Cart checkout
        const checkoutBtn = $('#agriCheckoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutCart);

        // Backdrop clicks
        const mainModal = $('#' + CONFIG.modalId);
        if (mainModal) {
            mainModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.modalId) close();
            });
        }
        const postModal = $('#' + CONFIG.postModalId);
        if (postModal) {
            postModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.postModalId) closePost();
            });
        }
        const listModal = $('#' + CONFIG.listingModalId);
        if (listModal) {
            listModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.listingModalId) closeListing();
            });
        }
        const cartModal = $('#' + CONFIG.cartModalId);
        if (cartModal) {
            cartModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.cartModalId) closeCart();
            });
        }
        const permitModal = document.getElementById(CONFIG.permitModalId);
        if (permitModal) {
            permitModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.permitModalId) closePermit();
            });
        }

        // ==========================================================
        // DELEGATED CLICKS — handles all agriculture actions
        // ==========================================================
        document.addEventListener('click', e => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            switch (action) {
                case 'agriFilterCategory': {
                    const cat = el.dataset.category;
                    state.filterCategory = (state.filterCategory === cat) ? '' : cat;
                    renderGrid();
                    break;
                }
                case 'agriCartQty': {
                    const id = el.dataset.id;
                    const delta = Number(el.dataset.delta);
                    const item = state.cart.find(i => i.id === id);
                    if (item) {
                        item.qty = Math.max(1, item.qty + delta);
                        saveCart();
                        renderCart();
                    }
                    break;
                }
                case 'agriCartRemove': {
                    const id = el.dataset.id;
                    state.cart = state.cart.filter(i => i.id !== id);
                    saveCart();
                    renderCart();
                    break;
                }
                case 'agriAddToCart': {
                    const id = el.dataset.id || state.selectedListingId;
                    const listing = state.listings.find(l => l.id === id);
                    if (listing) {
                        addToCart(listing);
                        closeListing();
                    }
                    break;
                }

                /* ============ HUB MODALS ============ */
                case 'openAgricultureHub': open(); break;
                case 'closeAgricultureHub': close(); break;

                case 'openAgriPost': openPost(el.dataset.postType || 'user'); break;
                case 'closeAgriPost': closePost(); break;

                case 'openAgriListing': openListing(el.dataset.id); break;
                case 'closeAgriListing': closeListing(); break;

                case 'openAgricultureCart': openCart(); break;
                case 'closeAgricultureCart': closeCart(); break;

                case 'closeAgricultureItem': closeItem(); break;

                case 'agriUseLocation': useLocation(); break;
                case 'agriFillPostGeo': fillPostGeo(); break;

                /* ============ ANIMAL PERMIT ============ */
                case 'openAgriPermit': openPermit(); break;
                case 'closeAgriPermit': closePermit(); break;
                case 'printAgriPermit': window.print(); break;
            }
        });

        // ESC key — closes topmost agriculture modal
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;

            if (document.getElementById(CONFIG.permitModalId)?.classList.contains('active')) {
                closePermit();
                return;
            }
            if ($('#' + CONFIG.listingModalId)?.classList.contains('active')) { closeListing(); return; }
            if ($('#' + CONFIG.postModalId)?.classList.contains('active'))    { closePost();    return; }
            if ($('#' + CONFIG.cartModalId)?.classList.contains('active'))    { closeCart();    return; }
            if ($('#' + CONFIG.itemModalId)?.classList.contains('active'))    { closeItem();    return; }
            if ($('#' + CONFIG.modalId)?.classList.contains('active'))        { close();        return; }
        });
    }

    /* ==========================================================
       PUBLIC API
       ========================================================== */
    window.AgricultureHub = {
        open,
        close,
        openPost,
        closePost,
        openListing,
        closeListing,
        openCart,
        closeCart,
        closeItem,
        useLocation,
        fillPostGeo,
        openPermit,
        closePermit,

        /** Add a listing programmatically */
        addListing(listing) {
            state.listings.unshift(Object.assign({
                id: 'agri_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                type: 'user',
                createdAt: Date.now()
            }, listing));
            saveListingsLocal();
            renderGrid();
            renderStaticCategories();
        },

        /** Get all listings (copy) */
        getListings() {
            return state.listings.slice();
        },

        /** Get all permit submissions (copy) */
        getPermits() {
            try {
                return JSON.parse(localStorage.getItem(PERMIT_KEY) || '[]');
            } catch (e) { return []; }
        },

        /** Clear all listings (admin utility) */
        clearListings() {
            state.listings = [];
            saveListingsLocal();
            renderGrid();
            renderStaticCategories();
        },

        /** Init — called once on page load */
        async init() {
            await load();
            if (state.listings.length === 0) seedIfEmpty();
            bindEvents();
            updateLocationText();
            updateCartBadge();
            renderGrid();
            renderStaticCategories();
            console.log('[AgricultureHub] Initialized with', state.listings.length, 'listings');
        }
    };

    /* ==========================================================
       AUTO-INIT
       ========================================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AgricultureHub.init());
    } else {
        window.AgricultureHub.init();
    }

})();
/* ================================================================
   AGRICULTURE HUB — v3.4 enhancements
   Wires: sort dropdown, currency chips, search clear, stats,
   cart footer/checkout, keyboard close.
   ================================================================ */
(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else fn();
  }

  onReady(() => {
    /* ---- Currency chips ---- */
    $$('#agriCurrencyFilters .agri-ccy-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('#agriCurrencyFilters .agri-ccy-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const ccy = chip.dataset.ccy || '';
        // If your main hub exposes a filter method, call it:
        if (window.ZBS_AGRI && typeof window.ZBS_AGRI.filterCurrency === 'function') {
          window.ZBS_AGRI.filterCurrency(ccy);
        } else {
          document.dispatchEvent(new CustomEvent('agri:filterCurrency', { detail: { ccy } }));
        }
      });
    });

    /* ---- Search clear ---- */
    const search  = $('#agriSearchInput');
    const clearBtn = $('#agriSearchClear');
    if (search && clearBtn) {
      search.addEventListener('input', () => {
        clearBtn.hidden = !search.value;
      });
      clearBtn.addEventListener('click', () => {
        search.value = '';
        clearBtn.hidden = true;
        search.dispatchEvent(new Event('input', { bubbles: true }));
        search.focus();
      });
    }

    /* ---- Sort select ---- */
    const sort = $('#agriSortFilter');
    if (sort) {
      sort.addEventListener('change', () => {
        document.dispatchEvent(new CustomEvent('agri:sort', { detail: { sort: sort.value } }));
      });
    }

    /* ---- Cart footer / checkout ---- */
    const checkout = $('#agriCartCheckoutBtn');
    if (checkout) {
      checkout.addEventListener('click', () => {
        // If your hub exposes a checkout method, call it:
        if (window.ZBS_AGRI && typeof window.ZBS_AGRI.checkout === 'function') {
          window.ZBS_AGRI.checkout();
          return;
        }
        // Fallback: open payment gateway if present
        const payModal = document.getElementById('paymentGatewayModal');
        if (payModal) {
          const totalEl = document.getElementById('agriCartTotal');
          const amountEl = document.getElementById('paymentAmount');
          const payAmtEl = document.getElementById('paymentPayAmount');
          const amount = parseFloat((totalEl?.textContent || '').replace(/[^\d.]/g, '')) || 0;
          if (amountEl) amountEl.textContent = totalEl?.textContent || 'ZMW 0.00';
          if (payAmtEl) payAmtEl.textContent = totalEl?.textContent || 'ZMW 0.00';
          payModal.hidden = false;
        }
      });
    }

    /* ---- ESC closes top-most agri modal ---- */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const openModal = ['#agriItemModal', '#agriCartModal', '#agriPostModal', '#agricultureModal']
        .map(sel => document.querySelector(sel))
        .find(m => m && !m.hidden);
      if (openModal) {
        const closer = openModal.querySelector('[data-action^="close"]');
        if (closer) closer.click();
      }
    });

    /* ---- Stats: recompute from visible cards ---- */
    function recomputeStats() {
      const grid = document.getElementById('agriLiveGrid');
      if (!grid) return;
      const cards = grid.querySelectorAll('.agri-live-card');
      const sellers = new Set();
      const regions = new Set();
      cards.forEach(card => {
        const sellerEl = card.querySelector('[data-seller]') || card.querySelector('.agri-live-card-seller');
        const regionEl = card.querySelector('[data-region]') || card.querySelector('.agri-live-card-region');
        if (sellerEl?.textContent) sellers.add(sellerEl.textContent.trim());
        if (regionEl?.textContent) regions.add(regionEl.textContent.trim());
      });
      const setStat = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setStat('agriStatListings', cards.length);
      setStat('agriStatSellers', sellers.size);
      setStat('agriStatRegions', regions.size);
      const liveCount = document.getElementById('agriLiveCount');
      if (liveCount) liveCount.textContent = cards.length;
    }

    // Observe the live grid for changes (cards added/removed/filtered)
    const grid = document.getElementById('agriLiveGrid');
    if (grid) {
      new MutationObserver(recomputeStats).observe(grid, { childList: true, subtree: true });
      recomputeStats();
    }
  });
})();
