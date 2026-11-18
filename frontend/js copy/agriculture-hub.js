/* ============================================================
   AGRICULTURE HUB — Full Modal Controller + Multi-Image Uploader
   Path: js/agriculture-hub.js
   v3.4.0 — Country-aware currency (per-listing), real imagery,
            self-healing modals, hardened submit,
            dropdown-based currency filter (integrated)
   ============================================================ */

(function () {
    'use strict';

    /* ==========================================================
       CONFIG
       ========================================================== */
    const CONFIG = {
        modalId:            'agricultureModal',
        gridId:             'agriLiveGrid',
        staticGridId:       'agriCategoriesGrid',
        emptyId:            'agriLiveEmpty',
        countId:            'agriLiveCount',
        searchInputId:      'agriSearchInput',
        locationTextId:     'agriLocationText',
        locationBtnId:      'agriLocationBtn',
        postModalId:        'agriPostModal',
        postFormId:         'agriPostForm',
        itemModalId:        'agriItemModal',
        cartModalId:        'agriCartModal',
        listingModalId:     'agriListingModal',
        permitModalId:      'agriPermitModal',
        permitFormId:       'agriPermitForm',
        permitSellerBodyId: 'permitSellerBody',
        permitStatusId:     'agriPermitStatus',
        permitAddRowId:     'permitAddSellerRow',
        cartBadgeId:        'agriCartBadge',
        uploadEndpoint:     '/api/upload',
        photoInputId:       'agriPostImagesInput',
        photoGridId:        'agriPhotoGrid',
        photoAddBtnId:      'agriPhotoAddBtn',
        photoCountId:       'agriPhotoCount',
        photoClearBtnId:    'agriPhotoClearBtn',
        photoPubCountId:    'agriPhotoPublishCount',
        photoFootCountId:   'agriFooterPhotoCount',
        photoFootCount2Id:  'agriFooterPhotoCount2',
        photoPubBtnId:      'agriPhotoPublishBtn',
        photoFooterPubBtnId:'agriFooterPublishBtn',
        postStatusId:       'agriPostStatus',
        countrySelectId:    'agriPostCountry',
        pricePreviewId:     'agriPricePreview',
        filterSelectId:     'agriFilterCountry',
        sortSelectId:       'agriSortFilter'
    };

    const ADMIN_KEY         = 'ZBS-ADMIN';
    const STORAGE_KEY       = 'zbs_agri_listings';
    const LOCATION_KEY      = 'zbs_agri_location';
    const CART_KEY          = 'zbs_agri_cart';
    const PERMIT_KEY        = 'zbs_agri_permits';
    const AUTH_KEY          = 'zbs_auth_user';
    const MAX_PHOTOS        = 15;
    const MAX_PHOTO_BYTES   = 8 * 1024 * 1024;
    const ACCEPTED_IMG_TYPES= /^image\//i;
    const UPLOAD_TIMEOUT_MS = 20000;
    const SUBMIT_LOCK_MS    = 30000;
    const SEARCH_DEBOUNCE   = 150;
    const DEFAULT_COUNTRY   = 'ZM';

    /* ==========================================================
       COUNTRY → CURRENCY MAP
       ========================================================== */
    const CURRENCIES = {
        ZM: { code:'ZMW', symbol:'K',   locale:'en-ZM', name:'Zambian Kwacha' },
        ZA: { code:'ZAR', symbol:'R',   locale:'en-ZA', name:'South African Rand' },
        KE: { code:'KES', symbol:'KSh', locale:'en-KE', name:'Kenyan Shilling' },
        NG: { code:'NGN', symbol:'₦',   locale:'en-NG', name:'Nigerian Naira' },
        TZ: { code:'TZS', symbol:'TSh', locale:'en-TZ', name:'Tanzanian Shilling' },
        UG: { code:'UGX', symbol:'USh', locale:'en-UG', name:'Ugandan Shilling' },
        GH: { code:'GHS', symbol:'₵',   locale:'en-GH', name:'Ghanaian Cedi' },
        BW: { code:'BWP', symbol:'P',   locale:'en-BW', name:'Botswana Pula' },
        NA: { code:'NAD', symbol:'N$',  locale:'en-NA', name:'Namibian Dollar' },
        ZW: { code:'USD', symbol:'$',   locale:'en-ZW', name:'US Dollar (Zimbabwe)' },
        MW: { code:'MWK', symbol:'MK',  locale:'en-MW', name:'Malawian Kwacha' },
        MZ: { code:'MZN', symbol:'MT',  locale:'pt-MZ', name:'Mozambican Metical' },
        US: { code:'USD', symbol:'$',   locale:'en-US', name:'US Dollar' },
        GB: { code:'GBP', symbol:'£',   locale:'en-GB', name:'British Pound' },
        EU: { code:'EUR', symbol:'€',   locale:'de-DE', name:'Euro' }
    };

    /* Map a currency code back to a country */
    const CURRENCY_TO_COUNTRY = {};
    Object.keys(CURRENCIES).forEach(cc => {
        const c = CURRENCIES[cc];
        if (!CURRENCY_TO_COUNTRY[c.code]) CURRENCY_TO_COUNTRY[c.code] = cc;
    });

    /* Zambian provinces → Zambia */
    const REGION_TO_COUNTRY = {
        'Lusaka':'ZM','Copperbelt':'ZM','Central':'ZM','Southern':'ZM','Eastern':'ZM',
        'Western':'ZM','Northern':'ZM','Muchinga':'ZM','Luapula':'ZM','North-Western':'ZM',
        'Other':'ZM'
    };

    function getAuthUser() {
        try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
        catch (e) { return null; }
    }

    function resolveCountry(obj) {
        const o = obj || {};
        const explicit = String(o.country || '').toUpperCase();
        if (explicit && CURRENCIES[explicit]) return explicit;

        const region = o.region || '';
        if (REGION_TO_COUNTRY[region]) return REGION_TO_COUNTRY[region];

        const auth = getAuthUser();
        if (auth && auth.country && CURRENCIES[auth.country]) return auth.country;

        return DEFAULT_COUNTRY;
    }

    function currencyFor(objOrCode) {
        let code;
        if (typeof objOrCode === 'string') {
            code = objOrCode.toUpperCase();
        } else {
            code = resolveCountry(objOrCode);
        }
        return CURRENCIES[code] || CURRENCIES[DEFAULT_COUNTRY];
    }

    function formatPrice(amount, objOrCode) {
        const cur = currencyFor(objOrCode);
        const n = Number(amount) || 0;
        try {
            const formatted = new Intl.NumberFormat(cur.locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(n);
            return cur.symbol + ' ' + formatted;
        } catch (e) {
            return cur.symbol + ' ' + n.toFixed(2);
        }
    }

    /* ==========================================================
       CATEGORY MAPS — real photography
       ========================================================== */
    const CAT_ICONS = {
        'meat':'🥩','eggs-dairy':'🥚','dried-foods':'🍲','livestock':'🐄',
        'farm-produce':'🌾','agro-chemicals':'🧪','farm-services':'🚜','other':'📦'
    };

    const CAT_IMAGES = {
        'meat':           'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=800&q=70',
        'eggs-dairy':     'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=800&q=70',
        'dried-foods':    'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=70',
        'livestock':      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=70',
        'farm-produce':   'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=70',
        'agro-chemicals': 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=70',
        'farm-services':  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=70',
        'other':          'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=70'
    };

    const SEED_IMAGES = {
        goats:    'https://images.unsplash.com/photo-1533318087104-0d3c8e8c3b8e?auto=format&fit=crop&w=800&q=70',
        tomatoes: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=70',
        maize:    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=70'
    };

    function categoryImage(cat) { return CAT_IMAGES[cat] || CAT_IMAGES['other']; }

    const STATIC_CATEGORIES = [
        { slug:'meat',           name:'Meat',           icon:'🥩', desc:'Beef, pork, mutton, poultry and processed meat.' },
        { slug:'eggs-dairy',     name:'Eggs & Dairy',   icon:'🥚', desc:'Table eggs, hatching eggs, milk, cheese and yoghurt.' },
        { slug:'dried-foods',    name:'Dried Foods',    icon:'🍲', desc:'Grains, legumes, dried fruits, spices and nuts.' },
        { slug:'livestock',      name:'Livestock',      icon:'🐄', desc:'Cattle, goats, pigs, poultry, fish and bees.' },
        { slug:'farm-produce',   name:'Farm Produce',   icon:'🌾', desc:'Fresh vegetables, fruits, flowers and fodder.' },
        { slug:'agro-chemicals', name:'Agro-Chemicals', icon:'🧪', desc:'Fertilizers, pesticides, herbicides and growth boosters.' },
        { slug:'farm-services',  name:'Farm Services',  icon:'🚜', desc:'Tractor hire, irrigation, soil testing, vet services.' },
        { slug:'other',          name:'Other',          icon:'📦', desc:'Any other agricultural product or service.' }
    ];

    /* ==========================================================
       STATE
       ========================================================== */
    const state = {
        listings: [],
        userLocation: null,
        searchQuery: '',
        filterCategory: '',
        filterCurrency: '',
        sortBy: 'newest',
        cart: [],
        postMode: 'user',
        selectedListingId: null,
        photos: [],
        submitting: false,
        submittingTimer: null
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
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function escapeUrl(u) {
        const s = String(u ?? '').trim();
        if (!s) return '';
        if (/^\s*javascript:/i.test(s)) return '';
        return escapeHtml(s);
    }

    function humanSize(b) {
        if (!b) return '0 B';
        const u = ['B','KB','MB','GB']; let i = 0;
        while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
        return b.toFixed(b >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
    }

    function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
                  Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
                  Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function fieldValue(id) {
        const el = document.getElementById(id);
        if (!el) return '';
        return String(el.value == null ? '' : el.value).trim();
    }

    function isChecked(id) {
        const el = document.getElementById(id);
        if (!el) return false;
        if (el.type === 'checkbox') return !!el.checked;
        return el.getAttribute('aria-checked') === 'true';
    }

    function debounce(fn, wait) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    /* ==========================================================
       SELF-HEALING MODALS
       ========================================================== */
    function ensureListingModal() {
        if (document.getElementById(CONFIG.listingModalId)) return;
        const wrap = document.createElement('div');
        wrap.className = 'agriculture-item-modal agri-listing-modal';
        wrap.id = CONFIG.listingModalId;
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'agriListingTitle');
        wrap.hidden = true;
        wrap.innerHTML = `
            <div class="agriculture-item-container">
                <header class="agriculture-item-header">
                    <div class="agriculture-item-title">
                        <span id="agriListingIcon">🌾</span>
                        <span id="agriListingTitle">Listing</span>
                    </div>
                    <button class="window-close-btn" type="button" data-action="closeAgriListing" aria-label="Close">&times;</button>
                </header>
                <div class="agriculture-item-body" id="agriListingBody"></div>
                <footer class="agriculture-item-actions">
                    <a class="agri-btn agri-btn-primary" id="agriListingCall" href="tel:">
                        <i class="fas fa-phone"></i> Call Seller
                    </a>
                    <button class="agri-btn agri-btn-ghost" type="button" data-action="agriAddToCart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="agri-btn agri-btn-ghost" type="button" data-action="closeAgriListing">
                        <i class="fas fa-times"></i> Close
                    </button>
                </footer>
            </div>
        `;
        document.body.appendChild(wrap);
    }

    function ensureCartTotals() {
        const body = document.getElementById('agriCartBody');
        if (!body) return;
        if (body.querySelector('.agri-cart-totals')) return;

        const totals = document.createElement('div');
        totals.className = 'agri-cart-totals';
        totals.innerHTML = `
            <div><span>Subtotal</span><span id="agriCartSubtotal">—</span></div>
            <div><span>VAT (16%)</span><span id="agriCartTax">—</span></div>
            <div><span>Total</span><span id="agriCartGrand">—</span></div>
            <button id="agriCheckoutBtn" type="button"
                style="width:100%;margin-top:10px;padding:12px;background:#1f7a3d;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;">
                <i class="fas fa-check"></i> Checkout
            </button>
        `;
        body.appendChild(totals);

        const checkoutBtn = totals.querySelector('#agriCheckoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutCart);
    }

    /* ==========================================================
       PERSISTENCE
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
            console.warn('[AgricultureHub] backend unavailable:', err.message);
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
        const country = resolveCountry(raw);
        return {
            id:          raw.id || raw._id || raw.listingId || ('agri_' + Math.random().toString(36).slice(2,8)),
            type:        raw.type || 'user',
            category:    raw.category || 'other',
            subcategory: raw.subcategory || '',
            name:        raw.name || raw.title || '',
            desc:        raw.desc || raw.description || '',
            price:       Number(raw.price) || 0,
            unit:        raw.unit || 'unit',
            qty:         Number(raw.qty || raw.quantity) || 0,
            country:     country,
            currency:    (CURRENCIES[country] || CURRENCIES[DEFAULT_COUNTRY]).code,
            region:      raw.region || '',
            city:        raw.city || '',
            lat:         raw.lat != null ? Number(raw.lat) : null,
            lng:         raw.lng != null ? Number(raw.lng) : null,
            seller:      raw.seller || raw.sellerName || '',
            phone:       raw.phone || raw.sellerPhone || '',
            image:       raw.image || (Array.isArray(raw.images) && raw.images[0]) || '',
            images:      Array.isArray(raw.images) ? raw.images : (raw.image ? [raw.image] : []),
            createdAt:   raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
        };
    }

    /* ==========================================================
       IMAGE UPLOAD
       ========================================================== */
    async function uploadImage(file) {
        if (!file) return '';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
        try {
            const fd = new FormData();
            fd.append('image', file, file.name);
            const res = await fetch(CONFIG.uploadEndpoint, {
                method: 'POST', body: fd, signal: controller.signal
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            return json.url || json.path || json.location || '';
        } catch (err) {
            console.warn('[AgricultureHub] upload fallback:', err.message);
            return URL.createObjectURL(file);
        } finally {
            clearTimeout(timer);
        }
    }

    /* ==========================================================
       SEED
       ========================================================== */
    function seedIfEmpty() {
        if (state.listings.length > 0) return;
        const now = Date.now();
        state.listings = [
            {
                id:'agri_seed_1', type:'admin', category:'livestock', subcategory:'Goats',
                name:'Boer Goats — 30 head available',
                desc:'Healthy Boer goats, vaccinated, 25–40 kg live weight. Ready for transport.',
                price:180, unit:'head', qty:30,
                country:'ZM', currency:'ZMW',
                region:'Central', city:'Choma',
                lat:-14.4469, lng:28.4464, seller:'ZBS Farm', phone:'+260 97 111 2222',
                image: SEED_IMAGES.goats, images: [SEED_IMAGES.goats],
                createdAt: now - 100000
            },
            {
                id:'agri_seed_2', type:'user', category:'farm-produce', subcategory:'Tomatoes',
                name:'Fresh Tomatoes — 500 kg',
                desc:'Vine-ripened Roma tomatoes, packed in 20 kg crates. Harvested this week.',
                price:0.90, unit:'kg', qty:500,
                country:'ZM', currency:'ZMW',
                region:'Lusaka', city:'Lusaka',
                lat:-15.3875, lng:28.3228, seller:'Mwansa Family Farm', phone:'+260 96 333 4444',
                image: SEED_IMAGES.tomatoes, images: [SEED_IMAGES.tomatoes],
                createdAt: now - 200000
            },
            {
                id:'agri_seed_3', type:'user', category:'dried-foods', subcategory:'Maize',
                name:'Cleaned Dry Maize — 20 tonnes',
                desc:'Moisture ≤ 13%, aflatoxin tested. Delivered in 50 kg bags.',
                price:0.32, unit:'kg', qty:20000,
                country:'ZM', currency:'ZMW',
                region:'Eastern', city:'Chipata',
                lat:-13.6333, lng:32.6500, seller:'Chipata Grain Traders', phone:'+260 95 555 6666',
                image: SEED_IMAGES.maize, images: [SEED_IMAGES.maize],
                createdAt: now - 300000
            }
        ];
        saveListingsLocal();
    }

    /* ==========================================================
       FILTER HELPERS
       ========================================================== */
    function applyFilters(list) {
        let out = list.slice();

        const q = state.searchQuery.toLowerCase().trim();
        if (q) {
            out = out.filter(l =>
                (l.name||'').toLowerCase().includes(q) ||
                (l.desc||'').toLowerCase().includes(q) ||
                (l.category||'').toLowerCase().includes(q) ||
                (l.subcategory||'').toLowerCase().includes(q) ||
                (l.seller||'').toLowerCase().includes(q) ||
                (l.region||'').toLowerCase().includes(q) ||
                (l.city||'').toLowerCase().includes(q)
            );
        }

        if (state.filterCategory) {
            out = out.filter(l => l.category === state.filterCategory);
        }

        if (state.filterCurrency) {
            out = out.filter(l => currencyFor(l).code === state.filterCurrency);
        }

        return out;
    }

    function applySort(list) {
        const sorted = list.slice();
        if (state.sortBy === 'price-asc') {
            sorted.sort((a,b) => (a.price||0) - (b.price||0));
        } else if (state.sortBy === 'price-desc') {
            sorted.sort((a,b) => (b.price||0) - (a.price||0));
        } else if (state.sortBy === 'distance' && state.userLocation) {
            sorted.sort((a,b) => {
                const da = (a.lat && a.lng) ? haversine(state.userLocation.lat, state.userLocation.lng, a.lat, a.lng) : Infinity;
                const db = (b.lat && b.lng) ? haversine(state.userLocation.lat, state.userLocation.lng, b.lat, b.lng) : Infinity;
                return da - db;
            });
        } else {
            sorted.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        }
        return sorted;
    }

    /* ==========================================================
       RENDER — LIVE LISTINGS GRID
       ========================================================== */
    function renderGrid() {
        const grid  = $('#' + CONFIG.gridId);
        const empty = $('#' + CONFIG.emptyId);
        const count = $('#' + CONFIG.countId);
        if (!grid) return;

        let list = applyFilters(state.listings);

        if (state.userLocation) {
            list = list.map(l => {
                const d = (l.lat && l.lng)
                    ? haversine(state.userLocation.lat, state.userLocation.lng, l.lat, l.lng)
                    : null;
                return Object.assign({}, l, { _distance: d });
            });
        }

        list = applySort(list);

        if (count) count.textContent = list.length;

        if (list.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.classList.add('show');
            return;
        }
        if (empty) empty.classList.remove('show');

        grid.innerHTML = list.map(l => {
            const icon = CAT_ICONS[l.category] || '📦';
            const imgSrc = escapeUrl(l.image || categoryImage(l.category));
            const fallback = escapeUrl(categoryImage(l.category));
            const cur = currencyFor(l);
            const priceStr = formatPrice(l.price, l);
            const distanceHtml = (l._distance != null)
                ? `<span class="agri-listing-distance"><i class="fas fa-location-arrow"></i> ${l._distance.toFixed(1)} km</span>`
                : '';
            const typeBadge = l.type === 'admin'
                ? '<span class="agri-listing-source admin">ADMIN</span>'
                : '<span class="agri-listing-source user">USER</span>';

            return `
                <div class="agri-listing-card" data-action="openAgriListing" data-id="${escapeHtml(l.id)}">
                    <div class="agri-listing-thumb">
                        <img src="${imgSrc}" alt="${escapeHtml(l.name)}"
                             class="agri-listing-img" loading="lazy"
                             onerror="this.onerror=null;this.src='${fallback}'">
                        ${typeBadge}
                    </div>
                    <div class="agri-listing-body">
                        <div class="agri-listing-name">${escapeHtml(l.name)}</div>
                        <div class="agri-listing-meta">
                            <span class="agri-listing-cat">${icon} ${escapeHtml(l.category)}</span>
                            <span class="agri-listing-currency" title="${escapeHtml(cur.name)}">${escapeHtml(cur.code)}</span>
                            ${distanceHtml}
                        </div>
                        <div class="agri-listing-loc">
                            <i class="fas fa-map-marker-alt"></i>
                            ${escapeHtml(l.city || l.region || '—')} · ${escapeHtml(l.seller || '—')}
                        </div>
                        <div class="agri-listing-footer">
                            <span class="agri-listing-price">${priceStr}<small> /${escapeHtml(l.unit || 'unit')}</small></span>
                            <span class="agri-listing-qty">${escapeHtml(String(l.qty || '—'))} avail.</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderStaticCategories() {
        const grid = $('#' + CONFIG.staticGridId);
        if (!grid) return;

        grid.innerHTML = STATIC_CATEGORIES.map(cat => {
            const count = state.listings.filter(l => l.category === cat.slug).length;
            return `
                <div class="agri-category-card" data-action="agriFilterCategory" data-category="${cat.slug}">
                    <div class="agri-category-thumb">
                        <img src="${escapeUrl(categoryImage(cat.slug))}" alt="${escapeHtml(cat.name)}"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='${escapeUrl(CAT_IMAGES.other)}'">
                    </div>
                    <div class="agri-category-name">${escapeHtml(cat.name)}</div>
                    <div class="agri-category-desc">${escapeHtml(cat.desc)}</div>
                    <div class="agri-category-count">${count} listing${count !== 1 ? 's' : ''}</div>
                </div>
            `;
        }).join('');
    }

    /* ==========================================================
       OPEN / CLOSE
       ========================================================== */
    function open() {
        ensureListingModal();
        const modal = $('#' + CONFIG.modalId);
        if (!modal) { toast('⚠️ Agriculture Hub modal missing'); return; }
        updateLocationText();
        updateCartBadge();
        syncFilterDropdown();
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
       CURRENCY FILTER — DROPDOWN
       ========================================================== */
    function syncFilterDropdown() {
        const sel = document.getElementById(CONFIG.filterSelectId);
        if (!sel) return;
        // Map current filterCurrency → country option
        if (!state.filterCurrency) {
            sel.value = '';
        } else {
            const country = CURRENCY_TO_COUNTRY[state.filterCurrency];
            sel.value = country || '';
        }
        sel.classList.toggle('is-filtering', !!state.filterCurrency);
    }

    function wireCurrencyFilter() {
        const sel = document.getElementById(CONFIG.filterSelectId);
        if (!sel) return;

        sel.addEventListener('change', () => {
            const opt = sel.options[sel.selectedIndex];
            const ccy = opt ? (opt.dataset.currency || '').toUpperCase() : '';
            state.filterCurrency = ccy;
            sel.classList.toggle('is-filtering', !!ccy);
            renderGrid();
        });

        document.addEventListener('agri:reset-filters', () => {
            state.filterCurrency = '';
            sel.value = '';
            sel.classList.remove('is-filtering');
            renderGrid();
        });
    }

    function wireSortFilter() {
        const sel = document.getElementById(CONFIG.sortSelectId);
        if (!sel) return;
        sel.addEventListener('change', () => {
            state.sortBy = sel.value || 'newest';
            renderGrid();
        });
    }

    /* ==========================================================
       GEOLOCATION
       ========================================================== */
    function useLocation() {
        if (!navigator.geolocation) { toast('❌ Geolocation not supported'); return; }
        const btn = $('#' + CONFIG.locationBtnId);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                saveLocation();
                updateLocationText();
                renderGrid();
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-crosshairs"></i> Update'; }
                toast('✅ Location set');
            },
            err => {
                toast('❌ ' + err.message);
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location'; }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    function updateLocationText() {
        const el = $('#' + CONFIG.locationTextId);
        if (!el) return;
        el.textContent = state.userLocation
            ? `Near ${state.userLocation.lat.toFixed(3)}, ${state.userLocation.lng.toFixed(3)}`
            : 'Location not set';
    }

    function fillPostGeo() {
        if (!navigator.geolocation) { toast('❌ Geolocation not supported'); return; }
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
       PHOTO UPLOADER
       ========================================================== */
    function photoEls() {
        return {
            input:      document.getElementById(CONFIG.photoInputId),
            grid:       document.getElementById(CONFIG.photoGridId),
            addBtn:     document.getElementById(CONFIG.photoAddBtnId),
            count:      document.getElementById(CONFIG.photoCountId),
            clearBtn:   document.getElementById(CONFIG.photoClearBtnId),
            pubCount:   document.getElementById(CONFIG.photoPubCountId),
            footCount:  document.getElementById(CONFIG.photoFootCountId),
            footCount2: document.getElementById(CONFIG.photoFootCount2Id),
            pubBtn:     document.getElementById(CONFIG.photoPubBtnId),
            footPubBtn: document.getElementById(CONFIG.photoFooterPubBtnId)
        };
    }

    function syncPhotoCounts() {
        const p = photoEls();
        const n = state.photos.length;
        if (p.count)      p.count.textContent = n;
        if (p.pubCount)   p.pubCount.textContent = n;
        if (p.footCount)  { p.footCount.hidden  = n === 0; p.footCount.textContent  = n; }
        if (p.footCount2) { p.footCount2.hidden = n === 0; p.footCount2.textContent = n; }
    }

    function renderPhotoGrid() {
        const p = photoEls();
        if (!p.grid) return;
        p.grid.innerHTML = '';
        state.photos.forEach((photo, idx) => {
            const tile = document.createElement('div');
            tile.className = 'agri-photo-tile' + (idx === 0 ? ' is-cover' : '');
            tile.dataset.id = photo.id;

            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Photo ' + (idx + 1);
            img.loading = 'lazy';

            const sizeTag = document.createElement('span');
            sizeTag.className = 'agri-photo-tile-size';
            sizeTag.textContent = humanSize(photo.file.size);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'agri-photo-remove';
            removeBtn.setAttribute('aria-label', 'Remove photo');
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                removePhoto(photo.id);
            });

            tile.appendChild(img);
            tile.appendChild(sizeTag);
            tile.appendChild(removeBtn);
            p.grid.appendChild(tile);
        });
        syncPhotoCounts();
    }

    function addPhotoFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const files = Array.from(fileList);
        const rejected = [];

        for (const file of files) {
            if (state.photos.length >= MAX_PHOTOS) {
                rejected.push(file.name + ' (limit ' + MAX_PHOTOS + ')');
                continue;
            }
            if (!ACCEPTED_IMG_TYPES.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
                rejected.push(file.name + ' (not an image)');
                continue;
            }
            if (file.size > MAX_PHOTO_BYTES) {
                rejected.push(file.name + ' (' + humanSize(file.size) + ' — max 8 MB)');
                continue;
            }
            if (state.photos.some(p => p.file.name === file.name && p.file.size === file.size)) continue;

            state.photos.push({
                id: 'p_' + Math.random().toString(36).slice(2, 9),
                file,
                url: URL.createObjectURL(file)
            });
        }

        renderPhotoGrid();

        if (rejected.length) {
            const st = document.getElementById(CONFIG.postStatusId);
            if (st) {
                st.hidden = false;
                st.textContent = 'Skipped: ' + rejected.join(', ');
                st.className = 'agri-post-status warn';
                setTimeout(() => { st.hidden = true; }, 4500);
            }
        }
    }

    function removePhoto(id) {
        const idx = state.photos.findIndex(p => p.id === id);
        if (idx === -1) return;
        try { URL.revokeObjectURL(state.photos[idx].url); } catch (e) {}
        state.photos.splice(idx, 1);
        renderPhotoGrid();
    }

    function clearPhotos() {
        state.photos.forEach(p => { try { URL.revokeObjectURL(p.url); } catch (e) {} });
        state.photos = [];
        const p = photoEls();
        if (p.input) p.input.value = '';
        renderPhotoGrid();
    }

    function wirePhotoUploader() {
        const p = photoEls();
        if (!p.addBtn || !p.input) {
            console.warn('[AgricultureHub] photo uploader elements missing');
            return;
        }

        p.addBtn.addEventListener('click', e => {
            e.preventDefault();
            p.input.click();
        });
        p.addBtn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.input.click(); }
        });

        p.input.addEventListener('change', e => {
            addPhotoFiles(e.target.files);
            p.input.value = '';
        });

        ['dragenter', 'dragover'].forEach(ev => {
            p.addBtn.addEventListener(ev, e => {
                e.preventDefault(); e.stopPropagation();
                p.addBtn.classList.add('is-dragover');
            });
        });
        ['dragleave', 'dragend'].forEach(ev => {
            p.addBtn.addEventListener(ev, e => {
                e.preventDefault(); e.stopPropagation();
                p.addBtn.classList.remove('is-dragover');
            });
        });
        p.addBtn.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation();
            p.addBtn.classList.remove('is-dragover');
            if (e.dataTransfer && e.dataTransfer.files) addPhotoFiles(e.dataTransfer.files);
        });

        if (p.clearBtn) {
            p.clearBtn.addEventListener('click', e => {
                e.preventDefault();
                clearPhotos();
            });
        }

        [p.pubBtn, p.footPubBtn].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                submitPost(null);
            });
        });
    }

    /* ==========================================================
       PRICE PREVIEW
       ========================================================== */
    function previewPrice() {
        const el = document.getElementById(CONFIG.pricePreviewId);
        if (!el) return;
        const price = parseFloat(fieldValue('agriPostPrice')) || 0;
        const unit = fieldValue('agriPostUnit') || 'unit';
        const country = fieldValue(CONFIG.countrySelectId) ||
                        REGION_TO_COUNTRY[fieldValue('agriPostRegion')] ||
                        resolveCountry({});
        const formatted = formatPrice(price, country);
        el.textContent = formatted + ' per ' + unit;
    }

    function wirePostCurrency() {
        const countrySelect = document.getElementById(CONFIG.countrySelectId);

        if (countrySelect) {
            const auth = getAuthUser();
            if (auth && auth.country && CURRENCIES[auth.country]) {
                countrySelect.value = auth.country;
            }
        }

        ['agriPostPrice','agriPostRegion','agriPostUnit'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', previewPrice);
                el.addEventListener('change', previewPrice);
            }
        });
        if (countrySelect) {
            countrySelect.addEventListener('change', () => {
                const region = fieldValue('agriPostRegion');
                if (region && REGION_TO_COUNTRY[region]) {
                    countrySelect.value = REGION_TO_COUNTRY[region];
                }
                previewPrice();
            });
        }

        const regionSelect = document.getElementById('agriPostRegion');
        if (regionSelect && countrySelect) {
            regionSelect.addEventListener('change', () => {
                const region = fieldValue('agriPostRegion');
                if (region && REGION_TO_COUNTRY[region]) {
                    countrySelect.value = REGION_TO_COUNTRY[region];
                }
                previewPrice();
            });
        }

        previewPrice();
    }

    /* ==========================================================
       POST FORM
       ========================================================== */
    function openPost(mode) {
        const modal = $('#' + CONFIG.postModalId);
        if (!modal) { toast('⚠️ Post modal missing'); return; }

        state.postMode = (mode === 'admin') ? 'admin' : 'user';
        state.submitting = false;

        const titleEl = $('#agriPostTitle');
        const badgeEl = $('#agriPostBadge');
        const iconEl  = $('#agriPostIcon');
        if (titleEl) titleEl.textContent = state.postMode === 'admin' ? 'Admin Post' : 'Post Listing';
        if (badgeEl) {
            badgeEl.textContent = state.postMode.toUpperCase();
            badgeEl.className = 'agri-post-badge ' + state.postMode;
        }
        if (iconEl) iconEl.className = state.postMode === 'admin' ? 'fas fa-lock' : 'fas fa-plus-circle';

        const adminGroup = $('#agriAdminKeyGroup');
        if (adminGroup) {
            if (state.postMode === 'admin') adminGroup.removeAttribute('hidden');
            else adminGroup.setAttribute('hidden', '');
        }

        const urlField = $('#agriPostImage');
        if (urlField) urlField.value = '';

        if (state.userLocation) {
            const lat = $('#agriPostLat');
            const lng = $('#agriPostLng');
            if (lat && !lat.value) lat.value = state.userLocation.lat.toFixed(6);
            if (lng && !lng.value) lng.value = state.userLocation.lng.toFixed(6);
        }

        renderPhotoGrid();
        previewPrice();

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
            const st = $('#' + CONFIG.postStatusId);
            if (st) st.setAttribute('hidden', '');
        }, 200);
    }

    async function submitPost(e) {
        if (e) e.preventDefault();
        if (state.submitting) return;
        state.submitting = true;

        clearTimeout(state.submittingTimer);
        state.submittingTimer = setTimeout(() => {
            if (state.submitting) {
                state.submitting = false;
                toast('⚠️ Publish timed out — please try again');
            }
        }, SUBMIT_LOCK_MS);

        const statusEl = document.getElementById(CONFIG.postStatusId);

        try {
            if (state.postMode === 'admin') {
                const key = fieldValue('agriAdminKey');
                if (key !== ADMIN_KEY) {
                    showPostStatus(statusEl, '❌ Invalid admin key.', 'error');
                    finishSubmit(); return;
                }
            }

            const required = [
                'agriPostCategory', 'agriPostName', 'agriPostDesc',
                'agriPostPrice', 'agriPostRegion', 'agriPostSeller', 'agriPostPhone'
            ];
            for (const id of required) {
                if (!fieldValue(id)) {
                    const label = ({
                        agriPostCategory:'Category', agriPostName:'Listing title',
                        agriPostDesc:'Description', agriPostPrice:'Price',
                        agriPostRegion:'Region', agriPostSeller:'Seller name',
                        agriPostPhone:'Phone'
                    })[id] || id;
                    showPostStatus(statusEl, '❌ Missing required field: ' + label, 'error');
                    finishSubmit(); return;
                }
            }

            if (!isChecked('agriPostTerms')) {
                showPostStatus(statusEl, '❌ Please tick the checkbox to confirm the listing is accurate.', 'error');
                finishSubmit(); return;
            }

            const urlFallback = fieldValue('agriPostImage');
            if (state.photos.length === 0 && !urlFallback) {
                showPostStatus(statusEl, '❌ Please add at least one product photo.', 'error');
                finishSubmit(); return;
            }

            const submitBtns = $$('#agriPostForm button[type="submit"], #agriPhotoPublishBtn, #agriFooterPublishBtn');
            submitBtns.forEach(b => {
                b.disabled = true;
                b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';
            });

            showPostStatus(statusEl, `⏳ Uploading ${state.photos.length} photo(s)…`, 'info');
            const uploadedUrls = [];
            for (let i = 0; i < state.photos.length; i++) {
                try {
                    const url = await uploadImage(state.photos[i].file);
                    if (url) uploadedUrls.push(url);
                } catch (err) {
                    console.warn('[AgricultureHub] photo ' + i + ' upload failed:', err.message);
                }
            }

            const images = uploadedUrls.slice();
            if (urlFallback && !images.includes(urlFallback)) images.push(urlFallback);
            const primaryImage = images[0] || '';

            const regionVal = fieldValue('agriPostRegion');
            const countryVal =
                fieldValue(CONFIG.countrySelectId) ||
                REGION_TO_COUNTRY[regionVal] ||
                resolveCountry({ region: regionVal });
            const cur = CURRENCIES[countryVal] || CURRENCIES[DEFAULT_COUNTRY];

            const listing = {
                id: 'agri_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                type: state.postMode,
                category: fieldValue('agriPostCategory'),
                subcategory: fieldValue('agriPostSubcategory'),
                name: fieldValue('agriPostName'),
                desc: fieldValue('agriPostDesc'),
                price: parseFloat(fieldValue('agriPostPrice')) || 0,
                unit: fieldValue('agriPostUnit') || 'unit',
                qty: parseInt(fieldValue('agriPostQty'), 10) || 0,
                country: countryVal,
                currency: cur.code,
                region: regionVal,
                city: fieldValue('agriPostCity'),
                lat: parseFloat(fieldValue('agriPostLat')) || null,
                lng: parseFloat(fieldValue('agriPostLng')) || null,
                seller: fieldValue('agriPostSeller'),
                phone: fieldValue('agriPostPhone'),
                image: primaryImage,
                images: images,
                createdAt: Date.now()
            };

            state.listings.unshift(listing);
            saveListingsLocal();
            renderGrid();
            renderStaticCategories();

            if (window.API && window.API.agriculture) {
                try {
                    const saved = await window.API.agriculture.create(listing);
                    if (saved && (saved.id || saved._id)) {
                        listing.id = saved.id || saved._id;
                        saveListingsLocal();
                    }
                } catch (err) {
                    console.warn('[AgricultureHub] server save failed:', err.message);
                }
            }

            showPostStatus(
                statusEl,
                `✅ Listing published with ${images.length} photo(s) in ${cur.code}!`,
                'success'
            );
            toast('🌾 Listing published!');

            submitBtns.forEach(b => {
                b.disabled = false;
                b.innerHTML = '<i class="fas fa-check"></i> Publish Listing';
            });

            setTimeout(() => {
                closePost();
                $('#agriPostForm')?.reset();
                clearPhotos();
                showPostStatus(statusEl, '', '');
                if (state.postMode === 'admin') {
                    $('#agriAdminKeyGroup')?.setAttribute('hidden', '');
                }
                finishSubmit();
            }, 1500);

        } catch (err) {
            console.error('[AgricultureHub] submit crashed:', err);
            showPostStatus(statusEl, '❌ Publish failed: ' + (err.message || 'unknown error'), 'error');
            finishSubmit();

            const submitBtns = $$('#agriPostForm button[type="submit"], #agriPhotoPublishBtn, #agriFooterPublishBtn');
            submitBtns.forEach(b => {
                b.disabled = false;
                b.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
            });
        }
    }

    function finishSubmit() {
        state.submitting = false;
        clearTimeout(state.submittingTimer);
    }

    function showPostStatus(el, msg, type) {
        if (!el) return;
        if (!msg) {
            el.hidden = true;
            el.setAttribute('hidden', '');
            return;
        }
        el.textContent = msg;
        el.className = 'agri-post-status ' + (type || '');
        el.hidden = false;
        el.removeAttribute('hidden');
    }

    /* ==========================================================
       LISTING DETAIL
       ========================================================== */
    function openListing(id) {
        ensureListingModal();
        const l = state.listings.find(x => x.id === id);
        if (!l) { toast('⚠️ Listing not found'); return; }
        state.selectedListingId = id;

        const modal = $('#' + CONFIG.listingModalId);
        if (!modal) return;

        const icon   = CAT_ICONS[l.category] || '📦';
        const imgSrc = escapeUrl(l.image || categoryImage(l.category));
        const fallback = escapeUrl(categoryImage(l.category));
        const cur = currencyFor(l);
        const priceStr = formatPrice(l.price, l);

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
            const galleryImages = Array.isArray(l.images) ? l.images.filter(Boolean) : [];
            const gallery = galleryImages.length > 1
                ? `<div class="agri-listing-gallery">${galleryImages.map((u, i) =>
                    `<img src="${escapeUrl(u)}" alt="Photo ${i + 1}" loading="lazy"
                          onerror="this.onerror=null;this.src='${fallback}'">`).join('')}</div>`
                : '';

            bodyEl.innerHTML = `
                <img src="${imgSrc}" alt="${escapeHtml(l.name)}"
                     style="width:100%;border-radius:10px;margin-bottom:12px;max-height:260px;object-fit:cover;background:#f1f5f9;display:block;"
                     onerror="this.onerror=null;this.src='${fallback}'">
                ${gallery}
                <div class="agri-listing-detail">
                    <div class="agri-listing-price-lg">${priceStr} <small>/${escapeHtml(l.unit)}</small></div>
                    <div class="agri-listing-tags">
                        <span class="agri-tag">${icon} ${escapeHtml(l.category)}</span>
                        ${l.subcategory ? `<span class="agri-tag">${escapeHtml(l.subcategory)}</span>` : ''}
                        <span class="agri-tag ${l.type}">${l.type === 'admin' ? '🏢 Admin' : '👤 User'}</span>
                        <span class="agri-tag currency" title="${escapeHtml(cur.name)}">${escapeHtml(cur.symbol)} ${escapeHtml(cur.code)}</span>
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

        if (callBtn) callBtn.href = 'tel:' + (l.phone || '').replace(/\s+/g, '');

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

        ensureCartTotals();

        const totals = body.querySelector('.agri-cart-totals');
        if (totals) body.removeChild(totals);

        const cartRef = state.cart[0] || { country: resolveCountry({}) };
        const cartCur = currencyFor(cartRef);

        if (state.cart.length === 0) {
            body.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:#64748b;">
                    <i class="fas fa-shopping-cart" style="font-size:2.4rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
                    <p style="font-size:0.9rem;font-weight:700;margin:0;">Your cart is empty</p>
                    <small style="font-size:0.75rem;opacity:0.75;">Browse listings and add items to get started.</small>
                </div>
            `;
        } else {
            body.innerHTML = state.cart.map(item => {
                const itemCur = currencyFor(item);
                const lineCur = itemCur.code === cartCur.code ? cartCur : itemCur;
                return `
                    <div class="agri-cart-item">
                        <div class="agri-cart-item-info">
                            <span class="agri-cart-item-name">${escapeHtml(item.name)}</span>
                            <span class="agri-cart-item-price">${formatPrice(item.price, lineCur)} × ${item.qty} ${escapeHtml(item.unit || '')}</span>
                        </div>
                        <div class="agri-cart-item-qty">
                            <button type="button" data-action="agriCartQty" data-id="${escapeHtml(item.id)}" data-delta="-1">−</button>
                            <span>${item.qty}</span>
                            <button type="button" data-action="agriCartQty" data-id="${escapeHtml(item.id)}" data-delta="1">+</button>
                        </div>
                        <button type="button" class="agri-cart-item-remove" data-action="agriCartRemove" data-id="${escapeHtml(item.id)}">&times;</button>
                    </div>
                `;
            }).join('');
        }

        if (totals) body.appendChild(totals);

        const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const subtotalEl = $('#agriCartSubtotal');
        const taxEl      = $('#agriCartTax');
        const totalEl    = $('#agriCartGrand');
        const checkout   = $('#agriCheckoutBtn');

        if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal, cartRef);
        if (taxEl)      taxEl.textContent      = formatPrice(tax, cartRef);
        if (totalEl)    totalEl.textContent    = formatPrice(total, cartRef);
        if (checkout) {
            checkout.disabled = state.cart.length === 0;
            checkout.innerHTML = state.cart.length
                ? `<i class="fas fa-check"></i> Checkout — ${formatPrice(total, cartRef)}`
                : '<i class="fas fa-check"></i> Checkout';
        }
    }

    function addToCart(listing) {
        if (state.cart.length > 0) {
            const cartCountry = state.cart[0].country || resolveCountry({});
            const itemCountry = resolveCountry(listing);
            if (cartCountry !== itemCountry) {
                const cc = CURRENCIES[cartCountry] || CURRENCIES[DEFAULT_COUNTRY];
                const ic = CURRENCIES[itemCountry] || CURRENCIES[DEFAULT_COUNTRY];
                toast(
                    '⚠️ Cart already contains items in ' + cc.code +
                    '. Clear it to add items in ' + ic.code + '.'
                );
                return;
            }
        }

        const country = resolveCountry(listing);
        const cur = CURRENCIES[country] || CURRENCIES[DEFAULT_COUNTRY];
        const existing = state.cart.find(i => i.id === listing.id);
        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                id: listing.id,
                name: listing.name,
                price: listing.price,
                unit: listing.unit,
                qty: 1,
                country: country,
                currency: cur.code
            });
        }
        saveCart();
        toast('✅ Added to cart');
    }

    function updateCartBadge() {
        const badge = $('#' + CONFIG.cartBadgeId);
        if (badge) badge.textContent = state.cart.reduce((s, i) => s + i.qty, 0);
    }

    async function checkoutCart() {
        if (!state.cart.length) { toast('⚠️ Your cart is empty'); return; }

        const cartRef = state.cart[0] || { country: resolveCountry({}) };
        const cartCur = currencyFor(cartRef);

        const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const order = {
            type: 'agriculture-order',
            country: resolveCountry(cartRef),
            currency: cartCur.code,
            items: state.cart.map(i => ({
                listingId: i.id, name: i.name, price: i.price, unit: i.unit,
                quantity: i.qty, subtotal: i.price * i.qty,
                country: i.country, currency: i.currency
            })),
            subtotal, tax, total, status: 'pending',
            placedAt: new Date().toISOString()
        };

        const checkoutBtn = $('#agriCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing order…';
        }

        if (window.API && window.API.market) {
            try { await window.API.market.create(order); }
            catch (err) { console.warn('[AgricultureHub] order save failed:', err.message); }
        }

        toast('✅ Order placed! We will contact you shortly.');
        state.cart = [];
        saveCart();
        renderCart();
        setTimeout(closeCart, 800);
    }

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
       ANIMAL PERMIT
       ========================================================== */
    function openPermit() {
        const modal = document.getElementById(CONFIG.permitModalId);
        if (!modal) { toast('⚠️ Permit form missing'); return; }
        const dateInput = document.getElementById('permitRepDate');
        if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
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
            type: 'permit', createdAt: Date.now(), status: 'pending',
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
            }))
        };

        const submitBtn = document.querySelector('#agriPermitForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
        }

        if (window.API && window.API.agriculture) {
            try { await window.API.agriculture.create(permitData); }
            catch (err) { console.warn('[AgricultureHub] permit save failed:', err.message); }
        }

        try {
            const existing = JSON.parse(localStorage.getItem(PERMIT_KEY) || '[]');
            existing.unshift(permitData);
            localStorage.setItem(PERMIT_KEY, JSON.stringify(existing));
        } catch (err) { /* silent */ }

        showPermitStatus(statusEl, '✅ Permit application submitted successfully!', 'success');

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
        const search = $('#' + CONFIG.searchInputId);
        if (search) {
            const clearBtn = document.getElementById('agriSearchClear');
            const onSearch = debounce(e => {
                state.searchQuery = e.target.value;
                if (clearBtn) clearBtn.hidden = !state.searchQuery;
                renderGrid();
            }, SEARCH_DEBOUNCE);
            search.addEventListener('input', onSearch);
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    search.value = '';
                    state.searchQuery = '';
                    clearBtn.hidden = true;
                    renderGrid();
                });
            }
        }

        const form = $('#' + CONFIG.postFormId);
        if (form) form.addEventListener('submit', submitPost);

        const permitForm = document.getElementById(CONFIG.permitFormId);
        if (permitForm) permitForm.addEventListener('submit', submitPermit);

        const permitAddRow = document.getElementById(CONFIG.permitAddRowId);
        if (permitAddRow) permitAddRow.addEventListener('click', addPermitSellerRow);

        wirePhotoUploader();
        wirePostCurrency();
        wireCurrencyFilter();
        wireSortFilter();

        const mainModal = $('#' + CONFIG.modalId);
        if (mainModal) mainModal.addEventListener('click', e => {
            if (e.target.id === CONFIG.modalId) close();
        });
        const postModal = $('#' + CONFIG.postModalId);
        if (postModal) postModal.addEventListener('click', e => {
            if (e.target.id === CONFIG.postModalId) closePost();
        });
        const cartModal = $('#' + CONFIG.cartModalId);
        if (cartModal) cartModal.addEventListener('click', e => {
            if (e.target.id === CONFIG.cartModalId) closeCart();
        });
        const permitModal = document.getElementById(CONFIG.permitModalId);
        if (permitModal) permitModal.addEventListener('click', e => {
            if (e.target.id === CONFIG.permitModalId) closePermit();
        });

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
                    if (item) { item.qty = Math.max(1, item.qty + delta); saveCart(); renderCart(); }
                    break;
                }
                case 'agriCartRemove': {
                    state.cart = state.cart.filter(i => i.id !== el.dataset.id);
                    saveCart();
                    renderCart();
                    break;
                }
                case 'agriAddToCart': {
                    const id = el.dataset.id || state.selectedListingId;
                    const listing = state.listings.find(l => l.id === id);
                    if (listing) { addToCart(listing); closeListing(); }
                    break;
                }
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
                case 'openAgriPermit': openPermit(); break;
                case 'closeAgriPermit': closePermit(); break;
                case 'printAgriPermit': window.print(); break;
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (document.getElementById(CONFIG.permitModalId)?.classList.contains('active')) { closePermit(); return; }
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
        open, close,
        openPost, closePost,
        openListing, closeListing,
        openCart, closeCart,
        closeItem,
        useLocation, fillPostGeo,
        openPermit, closePermit,

        addListing(listing) {
            state.listings.unshift(normalizeListing(Object.assign({
                id: 'agri_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                type: 'user', createdAt: Date.now()
            }, listing)));
            saveListingsLocal();
            renderGrid();
            renderStaticCategories();
        },
        getListings() { return state.listings.slice(); },
        getPermits() {
            try { return JSON.parse(localStorage.getItem(PERMIT_KEY) || '[]'); }
            catch (e) { return []; }
        },
        clearListings() {
            state.listings = [];
            saveListingsLocal();
            renderGrid();
            renderStaticCategories();
        },
        clearPhotos,
        addPhotos(files) { addPhotoFiles(files); },
        getPhotos() { return state.photos.slice(); },

        setCurrencyFilter(ccy) {
            state.filterCurrency = (ccy || '').toUpperCase();
            syncFilterDropdown();
            renderGrid();
        },
        getCurrencyFilter() { return state.filterCurrency; },

        formatPrice: formatPrice,
        currencyFor: currencyFor,
        resolveCountry: resolveCountry,
        CURRENCIES: CURRENCIES,

        async init() {
            ensureListingModal();
            await load();
            if (state.listings.length === 0) seedIfEmpty();
            bindEvents();
            updateLocationText();
            updateCartBadge();
            syncFilterDropdown();
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