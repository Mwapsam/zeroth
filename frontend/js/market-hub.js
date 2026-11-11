/* ================================================================
   MARKET HUB — Buyer/Vendor marketplace with geolocation
   Self-contained module
   ----------------------------------------------------------------
   v4 — Backend integration
     • loadDB() is now async — pulls shops/products/orders from
       API.market.* in parallel, falls back to localStorage cache
     • saveDB() persists changes to the backend
     • createShop() → API.market.create({ type:'shop', ... })
     • createProduct() → API.market.create({ type:'product', ... })
     • placeOrder() → API.market.create({ type:'order', ... })
     • submitVendorAuth() — unchanged (local vendor session)
     • cart stays in localStorage (buyer-side state)
     • All callers of loadDB() are now `async` and `await` it

   v3 (retained) — responsive + bugfixes
   v2 (retained) — responsive hardening
   ================================================================ */
'use strict';

const MarketHub = (() => {

    /* ============ STORAGE ============ */
    const KEY      = 'zbs_market_hub';
    const USER_KEY = 'zbs_market_user';
    const CART_KEY = 'zbs_market_cart';

    /* --------------------------------------------------------------
       Async DB loader — hits backend, falls back to local cache.
       Returns { users, shops, products, orders }.
       -------------------------------------------------------------- */
    async function loadDB() {
        const fallback = () => {
            try {
                const raw = localStorage.getItem(KEY);
                return raw ? JSON.parse(raw) : { users: [], shops: [], products: [], orders: [] };
            } catch (e) {
                return { users: [], shops: [], products: [], orders: [] };
            }
        };

        if (!window.API || !window.API.market) return fallback();

        try {
            const [shopsR, productsR, ordersR] = await Promise.all([
                window.API.market.list({ type: 'shop' }),
                window.API.market.list({ type: 'product' }),
                window.API.market.list({ type: 'order' })
            ]);

            const shops    = Array.isArray(shopsR)    ? shopsR    : (shopsR.data    || shopsR.shops    || []);
            const products = Array.isArray(productsR) ? productsR : (productsR.data || productsR.products || []);
            const orders   = Array.isArray(ordersR)   ? ordersR   : (ordersR.data   || ordersR.orders   || []);

            const cached = fallback();

            const db = {
                users: cached.users || [],
                shops:    shops.map(normalizeShop),
                products: products.map(normalizeProduct),
                orders:   orders.map(normalizeOrder)
            };

            // Refresh the local cache
            try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
            return db;
        } catch (err) {
            console.warn('[MarketHub] backend unavailable, using local cache:', err.message);
            return fallback();
        }
    }

    function saveDB(db) {
        try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    }

    /* Normalize server records to match the UI fields. */
    function normalizeShop(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            id:          raw.id || raw._id || raw.shopId || ('sh_' + Math.random().toString(36).slice(2, 8)),
            vendorId:    raw.vendorId || raw.vendor || '',
            name:        raw.name || '',
            category:    raw.category || '',
            address:     raw.address || '',
            lat:         raw.lat != null ? Number(raw.lat) : null,
            lng:         raw.lng != null ? Number(raw.lng) : null,
            description: raw.description || '',
            createdAt:   raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
        };
    }

    function normalizeProduct(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            id:        raw.id || raw._id || raw.productId || ('p_' + Math.random().toString(36).slice(2, 8)),
            shopId:    raw.shopId || raw.shop || '',
            name:      raw.name || raw.title || '',
            category:  raw.category || '',
            price:     Number(raw.price) || 0,
            stock:     Number(raw.stock || raw.quantity) || 0,
            unit:      raw.unit || '',
            createdAt: raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
        };
    }

    function normalizeOrder(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            id:              raw.id || raw._id || raw.orderId || ('o_' + Math.random().toString(36).slice(2, 8)),
            userId:          raw.userId || raw.user || '',
            items:           Array.isArray(raw.items) ? raw.items : [],
            subtotal:        Number(raw.subtotal) || 0,
            deliveryFee:     Number(raw.deliveryFee) || 0,
            total:           Number(raw.total) || 0,
            deliveryType:    raw.deliveryType || 'pickup',
            deliveryAddress: raw.deliveryAddress || '',
            paymentMethod:   raw.paymentMethod || 'cash',
            status:          raw.status || 'pending',
            createdAt:       raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
        };
    }

    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
        catch (e) { return null; }
    }

    function setCurrentUser(user) {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_KEY);
    }

    /* ============ STATE ============ */
    const state = {
        userLocation: null,
        activeShop: null,
        filters: { q: '', category: '', radius: 10 },
        deliveryType: 'pickup',
        openModals: new Set()
    };

    /* Focus is tracked as a stack so nested modals (hub → shop detail → */
    /* vendor auth) return focus to the right element when they close.  */
    const focusStack = [];

    const DELIVERY_OPTIONS = {
        pickup:        { label: '🏬 Pickup',           fee: 0  },
        home_delivery: { label: '🏠 Home Delivery',    fee: 15 },
        courier:       { label: '📦 Courier',          fee: 25 },
        ride:          { label: '🛵 Ride (Bike/Car)',  fee: 40 }
    };

    /* ============ HELPERS ============ */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function toast(msg) {
        if (typeof showToast === 'function') showToast(msg);
        else console.log(msg);
    }

    function money(n) { return 'ZMW ' + (Number(n) || 0).toFixed(2); }

    function debounce(fn, wait = 150) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    /* ============ RESPONSIVE HELPERS ============ */

    let _savedScrollY = 0;
    function lockBodyScroll() {
        if (state.openModals.size > 0) return;
        _savedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.classList.add('market-modal-open');
        document.body.style.top = `-${_savedScrollY}px`;
    }

    function unlockBodyScroll() {
        if (state.openModals.size > 0) return;
        document.body.classList.remove('market-modal-open');
        document.body.style.top = '';
        if (_savedScrollY) {
            window.scrollTo(0, _savedScrollY);
            _savedScrollY = 0;
        }
    }

    function resetModalScroll(modal) {
        if (!modal) return;
        modal.scrollTop = 0;
        modal.querySelectorAll('.market-content, .market-shop-modal .market-shop-body, .market-auth-container')
             .forEach(el => { el.scrollTop = 0; });
    }

    function focusFirst(modal) {
        if (!modal) return;
        const focusable = modal.querySelector(
            'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable) return;
        try { focusable.focus({ preventScroll: true }); }
        catch (e) { focusable.focus(); }
    }

    function showModal(modal) {
        if (!modal) return;
        focusStack.push(document.activeElement);
        state.openModals.add(modal.id || modal);
        modal.hidden = false;
        modal.removeAttribute('hidden');
        lockBodyScroll();
        resetModalScroll(modal);
        requestAnimationFrame(() => {
            modal.classList.add('active');
            focusFirst(modal);
        });
    }

    function hideModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        state.openModals.delete(modal.id || modal);

        const previous = focusStack.pop();

        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.hidden = true;
                modal.setAttribute('hidden', '');
            }
            unlockBodyScroll();
            if (previous instanceof HTMLElement && document.contains(previous)) {
                try { previous.focus({ preventScroll: true }); } catch (e) {}
            }
        }, 200);
    }

    /* ============ OPEN / CLOSE ============ */
    async function open() {
        const modal = $('#marketModal');
        if (!modal) return;
        showModal(modal);
        await renderAll();
    }

    function close() {
        hideModal($('#marketModal'));
    }

    /* ============ GEOLOCATION ============ */
    function requestLocation() {
        if (!navigator.geolocation) {
            toast('❌ Geolocation not supported');
            return;
        }
        const btn = $('#marketLocationBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                updateLocationText();
                renderShops();
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Update Location';
                }
                toast('✅ Location set — showing nearby shops');
            },
            (err) => {
                toast('❌ Location denied: ' + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    function updateLocationText() {
        const el = $('#marketLocationText');
        if (!el) return;
        if (state.userLocation) {
            el.textContent = `Location set: ${state.userLocation.lat.toFixed(4)}, ${state.userLocation.lng.toFixed(4)}`;
        } else {
            el.textContent = 'Location not set — Enable to find nearby shops';
        }
    }

    /* ============ RENDER SHOPS ============ */
    async function renderShops() {
        const grid  = $('#marketShopsGrid');
        const empty = $('#marketShopsEmpty');
        const count = $('#marketShopsCount');
        if (!grid) return;

        const db     = await loadDB();
        const q      = state.filters.q.toLowerCase();
        const cat    = state.filters.category;
        const radius = Number(state.filters.radius);

        let shops = (db.shops || []).slice();

        if (cat) shops = shops.filter(s => s.category === cat);
        if (q) {
            const productShopIds = (db.products || [])
                .filter(p => (p.name || '').toLowerCase().includes(q))
                .map(p => p.shopId);
            shops = shops.filter(s =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q) ||
                productShopIds.includes(s.id)
            );
        }

        if (state.userLocation) {
            shops = shops
                .map(s => ({
                    ...s,
                    distanceKm: (s.lat && s.lng)
                        ? haversine(state.userLocation.lat, state.userLocation.lng, s.lat, s.lng)
                        : null,
                    products: (db.products || []).filter(p => p.shopId === s.id)
                }))
                .filter(s => radius >= 500 || s.distanceKm == null || s.distanceKm <= radius)
                .sort((a, b) => {
                    if (a.distanceKm == null && b.distanceKm == null) return 0;
                    if (a.distanceKm == null) return 1;
                    if (b.distanceKm == null) return -1;
                    return a.distanceKm - b.distanceKm;
                });
        } else {
            shops = shops.map(s => ({
                ...s,
                products: (db.products || []).filter(p => p.shopId === s.id)
            }));
        }

        if (count) count.textContent = shops.length;

        if (shops.length === 0) {
            grid.innerHTML = '';
            empty?.classList.add('show');
            return;
        }
        empty?.classList.remove('show');

        grid.innerHTML = shops.map(shop => `
            <div class="market-shop-card" data-action="openMarketShop" data-shop-id="${shop.id}">
                <div class="market-shop-thumb">🏬</div>
                <div class="market-shop-card-body">
                    <div class="market-shop-name">${escapeHtml(shop.name)}</div>
                    <div class="market-shop-meta">
                        <span class="market-shop-cat-badge">${escapeHtml(shop.category)}</span>
                        ${shop.distanceKm != null ?
                            `<span class="market-shop-distance"><i class="fas fa-location-arrow"></i> ${shop.distanceKm.toFixed(2)} km</span>` :
                            ''}
                    </div>
                    <div class="market-shop-products-count">
                        <i class="fas fa-box"></i> ${shop.products.length} product${shop.products.length !== 1 ? 's' : ''}
                    </div>
                    <div class="market-shop-actions">
                        <button class="market-btn market-btn-primary"
                                data-action="openMarketShop"
                                data-shop-id="${shop.id}">
                            <i class="fas fa-eye"></i> View Shop
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function initShopsGridDelegate() {
        const grid = $('#marketShopsGrid');
        if (!grid) return;
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('[data-action="openMarketShop"]');
            if (!card || !grid.contains(card)) return;
            e.stopPropagation();
            openShop(card.dataset.shopId);
        });
    }

    /* ============ SHOP DETAIL ============ */
    async function openShop(shopId) {
        const db   = await loadDB();
        const shop = (db.shops || []).find(s => s.id === shopId);
        if (!shop) return;

        state.activeShop = shop;
        const products = (db.products || []).filter(p => p.shopId === shopId);

        const modal = $('#marketShopModal');
        if (!modal) return;

        $('#marketShopCategory').textContent = shop.category;
        $('#marketShopTitle').textContent    = shop.name;

        const productsCount = $('#marketShopProductsCount');
        if (productsCount) productsCount.textContent = products.length;

        const dist = (state.userLocation && shop.lat && shop.lng)
            ? `<i class="fas fa-location-arrow"></i> ${haversine(state.userLocation.lat, state.userLocation.lng, shop.lat, shop.lng).toFixed(2)} km away<br>`
            : '';

        $('#marketShopInfo').innerHTML = `
            <div><strong>${escapeHtml(shop.name)}</strong></div>
            <div style="margin-top:6px; color: var(--color-text-muted);">
                ${dist}
                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(shop.address)}<br>
                ${shop.description ? `<i class="fas fa-info-circle"></i> ${escapeHtml(shop.description)}` : ''}
            </div>
        `;

        const grid  = $('#marketShopProducts');
        const empty = $('#marketShopProductsEmpty');

        if (products.length === 0) {
            grid.innerHTML = '';
            empty?.removeAttribute('hidden');
        } else {
            empty?.setAttribute('hidden', '');
            grid.innerHTML = products.map(p => `
                <div class="market-product-card">
                    <div class="market-product-name">${escapeHtml(p.name)}</div>
                    ${p.category ? `<div class="market-product-cat">${escapeHtml(p.category)}</div>` : ''}
                    <div class="market-product-price">${money(p.price)}</div>
                    <div class="market-product-stock">
                        <i class="fas fa-cubes"></i> ${p.stock} ${escapeHtml(p.unit || '')} in stock
                    </div>
                    <button class="market-add-to-cart-btn"
                            data-action="marketAddToCart"
                            data-product-id="${p.id}"
                            ${p.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> ${p.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            `).join('');
        }

        showModal(modal);
    }

    function closeShop() {
        hideModal($('#marketShopModal'));
    }

    function initShopProductsDelegate() {
        const grid = $('#marketShopProducts');
        if (!grid) return;
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="marketAddToCart"]');
            if (!btn || btn.disabled || !grid.contains(btn)) return;
            addToCart(btn.dataset.productId);
        });
    }

    /* ============ CART ============ */
    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartBadge();
    }

    async function addToCart(productId) {
        const db      = await loadDB();
        const product = (db.products || []).find(p => p.id === productId);
        if (!product) return;

        const cart     = getCart();
        const existing = cart.find(i => i.productId === productId);
        if (existing) {
            if (existing.quantity + 1 > product.stock) {
                toast('❌ Not enough stock');
                return;
            }
            existing.quantity++;
        } else {
            cart.push({
                productId,
                shopId: product.shopId,
                name: product.name,
                price: product.price,
                quantity: 1,
                unit: product.unit || ''
            });
        }
        saveCart(cart);
        toast(`✅ Added "${product.name}" to cart`);
    }

    function changeQty(productId, delta) {
        const cart = getCart();
        const item = cart.find(i => i.productId === productId);
        if (!item) return;
        item.quantity = Math.max(1, item.quantity + delta);
        saveCart(cart);
        renderCart();
    }

    function removeFromCart(productId) {
        saveCart(getCart().filter(i => i.productId !== productId));
        renderCart();
    }

    function clearCart() {
        saveCart([]);
        renderCart();
    }

    function cartTotal() {
        const cart     = getCart();
        const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const fee      = DELIVERY_OPTIONS[state.deliveryType]?.fee || 0;
        return { subtotal, fee, total: subtotal + fee };
    }

    function updateCartBadge() {
        const count = getCart().reduce((s, i) => s + i.quantity, 0);
        const el    = $('#marketCartCount');
        if (el) el.textContent = count;
    }

    /* ============ RENDER CART ============ */
    function renderCart() {
        const items    = $('#marketCartItems');
        const empty    = $('#marketCartEmpty');
        const checkout = $('#marketCheckoutSection');
        const clearBtn = $('#marketClearCartBtn');
        if (!items) return;

        const cart = getCart();

        if (cart.length === 0) {
            items.innerHTML = '';
            empty?.classList.add('show');
            checkout?.setAttribute('hidden', '');
            clearBtn?.setAttribute('hidden', '');
            return;
        }

        empty?.classList.remove('show');
        clearBtn?.removeAttribute('hidden');
        checkout?.removeAttribute('hidden');

        items.innerHTML = cart.map(item => `
            <div class="market-cart-item">
                <div class="market-cart-item-info">
                    <span class="market-cart-item-name">${escapeHtml(item.name)}</span>
                    <span class="market-cart-item-price">${money(item.price)} × ${item.quantity} ${escapeHtml(item.unit)}</span>
                </div>
                <div class="market-cart-item-qty">
                    <button data-action="marketChangeQty" data-product-id="${item.productId}" data-delta="-1" aria-label="Decrease quantity">−</button>
                    <span>${item.quantity}</span>
                    <button data-action="marketChangeQty" data-product-id="${item.productId}" data-delta="1" aria-label="Increase quantity">+</button>
                </div>
                <div class="market-cart-item-total">${money(item.price * item.quantity)}</div>
                <button class="market-cart-item-remove" data-action="marketRemoveItem" data-product-id="${item.productId}" aria-label="Remove item">&times;</button>
            </div>
        `).join('');

        const deliveryOpts = $('#marketDeliveryOptions');
        if (deliveryOpts) {
            deliveryOpts.innerHTML = Object.entries(DELIVERY_OPTIONS).map(([id, opt]) => `
                <label class="market-delivery-option">
                    <span>${opt.label}</span>
                    <span>
                        <strong>${opt.fee === 0 ? 'Free' : money(opt.fee)}</strong>
                        <input type="radio" name="marketDelivery" value="${id}" ${id === state.deliveryType ? 'checked' : ''}>
                    </span>
                </label>
            `).join('');

            deliveryOpts.querySelectorAll('input[name="marketDelivery"]').forEach(r => {
                r.onchange = () => {
                    state.deliveryType = r.value;
                    renderCheckoutSummary();
                };
            });
        }

        renderCheckoutSummary();

        items.querySelectorAll('[data-action="marketChangeQty"]').forEach(btn => {
            btn.onclick = () => changeQty(btn.dataset.productId, Number(btn.dataset.delta));
        });
        items.querySelectorAll('[data-action="marketRemoveItem"]').forEach(btn => {
            btn.onclick = () => removeFromCart(btn.dataset.productId);
        });
    }

    function renderCheckoutSummary() {
        const el = $('#marketCheckoutSummary');
        if (!el) return;
        const cart = getCart();
        if (cart.length === 0) { el.innerHTML = ''; return; }

        const { subtotal, fee, total } = cartTotal();

        el.innerHTML = `
            <h3><i class="fas fa-receipt"></i> Order Summary</h3>
            ${cart.map(i => `
                <div class="market-checkout-line">
                    <span>${escapeHtml(i.name)} × ${i.quantity}</span>
                    <span>${money(i.price * i.quantity)}</span>
                </div>
            `).join('')}
            <div class="market-checkout-line"><span>Subtotal</span><span>${money(subtotal)}</span></div>
            <div class="market-checkout-line"><span>Delivery (${DELIVERY_OPTIONS[state.deliveryType].label})</span><span>${money(fee)}</span></div>
            <div class="market-checkout-line total"><span>Total</span><span>${money(total)}</span></div>
        `;
    }

    /* ============ VENDOR AUTH ============ */
    function openVendorAuth(mode = 'login') {
        const modal = $('#marketAuthModal');
        if (!modal) return;
        setAuthMode(mode);
        $('#marketAuthForm')?.reset();
        showModal(modal);
    }

    function closeVendorAuth() {
        hideModal($('#marketAuthModal'));
    }

    let currentAuthMode = 'login';
    function setAuthMode(mode) {
        currentAuthMode = mode;
        const title      = $('#marketAuthTitle');
        const nameField  = $('#marketAuthNameField');
        const submitText = $('#marketAuthSubmitText');
        const toggle     = $('#marketAuthToggle');

        if (mode === 'register') {
            if (title) title.textContent = 'Vendor Register';
            nameField?.removeAttribute('hidden');
            if (submitText) submitText.textContent = 'Register';
            if (toggle) toggle.textContent = 'Already have an account? Login';
        } else {
            if (title) title.textContent = 'Vendor Login';
            nameField?.setAttribute('hidden', '');
            if (submitText) submitText.textContent = 'Login';
            if (toggle) toggle.textContent = 'Need an account? Register';
        }
    }

    async function submitVendorAuth(e) {
        e.preventDefault();
        const email    = $('#marketAuthEmail').value.trim().toLowerCase();
        const password = $('#marketAuthPassword').value;
        const db       = await loadDB();

        if (currentAuthMode === 'register') {
            const name = $('#marketAuthName').value.trim();
            if (!name || !email || !password) return toast('❌ Fill all fields');
            if ((db.users || []).find(u => u.email === email)) return toast('❌ Email already registered');

            const user = {
                id: 'u_' + Date.now().toString(36),
                name, email, password,
                role: 'vendor',
                createdAt: Date.now()
            };
            db.users = db.users || [];
            db.users.push(user);
            saveDB(db);
            setCurrentUser(user);
            toast(`✅ Welcome, ${name}!`);
        } else {
            const user = (db.users || []).find(u => u.email === email && u.password === password);
            if (!user) return toast('❌ Invalid credentials');
            setCurrentUser(user);
            toast(`✅ Welcome back, ${user.name}!`);
        }

        closeVendorAuth();
        await renderVendorPanel();
    }

    function logoutVendor() {
        setCurrentUser(null);
        toast('👋 Logged out');
        renderVendorPanel();
    }

    async function renderVendorPanel() {
        const auth = $('#marketVendorAuth');
        const dash = $('#marketVendorDashboard');
        const user = getCurrentUser();

        if (!user || user.role !== 'vendor') {
            auth?.removeAttribute('hidden');
            dash?.setAttribute('hidden', '');
            return;
        }
        auth?.setAttribute('hidden', '');
        dash?.removeAttribute('hidden');

        const nameEl = $('#marketVendorName');
        if (nameEl) nameEl.textContent = user.name;

        const db      = await loadDB();
        const myShops = (db.shops || []).filter(s => s.vendorId === user.id);
        const productCard = $('#marketProductFormCard');
        if (myShops.length > 0) productCard?.removeAttribute('hidden');
        else productCard?.setAttribute('hidden', '');

        const shopSel = $('#marketProductShop');
        if (shopSel) {
            shopSel.innerHTML = '<option value="">Select Shop</option>' +
                myShops.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        }

        renderMyShops(myShops, db);
    }

    function renderMyShops(myShops, db) {
        const el = $('#marketMyShops');
        if (!el) return;
        if (myShops.length === 0) {
            el.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:14px;">No shops yet. Create your first shop above.</p>';
            return;
        }
        el.innerHTML = myShops.map(shop => {
            const products = (db.products || []).filter(p => p.shopId === shop.id);
            return `
                <div class="market-my-shop">
                    <div class="market-my-shop-info">
                        <span class="market-my-shop-name">🏬 ${escapeHtml(shop.name)}</span>
                        <span class="market-my-shop-meta">${escapeHtml(shop.category)} · ${escapeHtml(shop.address)} · ${products.length} product${products.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="market-my-shop-actions">
                        <button data-action="marketDeleteShop" data-shop-id="${shop.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        el.querySelectorAll('[data-action="marketDeleteShop"]').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm('Delete this shop and all its products?')) return;

                // Try to delete on the server first
                if (window.API && window.API.market) {
                    try {
                        await window.API.market.remove(btn.dataset.shopId);
                    } catch (err) {
                        console.warn('[MarketHub] server delete failed:', err.message);
                    }
                }

                const db2 = await loadDB();
                db2.shops    = (db2.shops    || []).filter(s => s.id !== btn.dataset.shopId);
                db2.products = (db2.products || []).filter(p => p.shopId !== btn.dataset.shopId);
                saveDB(db2);
                toast('🗑️ Shop deleted');
                await renderVendorPanel();
                await renderShops();
            };
        });
    }

    /* ============ CREATE SHOP ============ */
    async function createShop(e) {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user || user.role !== 'vendor') return toast('❌ Login as vendor first');

        const shop = {
            id: 'sh_' + Date.now().toString(36),
            vendorId: user.id,
            name:        $('#marketShopName').value.trim(),
            category:    $('#marketShopFormCategory').value,
            address:     $('#marketShopAddress').value.trim(),
            lat: parseFloat($('#marketShopLat').value),
            lng: parseFloat($('#marketShopLng').value),
            description: $('#marketShopDesc').value.trim(),
            createdAt: Date.now()
        };

        if (!shop.name || !shop.category || !shop.address || !shop.lat || !shop.lng) {
            return toast('❌ Please fill all required fields');
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';
        }

        if (window.API && window.API.market) {
            try {
                const saved = await window.API.market.create({ type: 'shop', ...shop });
                if (saved && (saved.id || saved._id)) {
                    shop.id = saved.id || saved._id;
                }
            } catch (err) {
                console.warn('[MarketHub] server save failed:', err.message);
            }
        }

        const db = await loadDB();
        db.shops = db.shops || [];
        db.shops.push(shop);
        saveDB(db);

        toast(`✅ Shop "${shop.name}" created!`);
        e.target.reset();
        await renderVendorPanel();
        await renderShops();

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Shop';
        }
    }

    function fillVendorGeo() {
        if (!navigator.geolocation) return toast('❌ Geolocation not supported');

        const btn = document.querySelector('[data-action="fillVendorGeo"]');
        const original = btn ? btn.innerHTML : null;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        }

        const restore = () => {
            if (btn && original !== null) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        };

        navigator.geolocation.getCurrentPosition(
            pos => {
                $('#marketShopLat').value = pos.coords.latitude.toFixed(6);
                $('#marketShopLng').value = pos.coords.longitude.toFixed(6);
                toast('✅ Location filled');
                restore();
            },
            err => {
                toast('❌ ' + err.message);
                restore();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    /* ============ CREATE PRODUCT ============ */
    async function createProduct(e) {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user || user.role !== 'vendor') return toast('❌ Login as vendor first');

        const product = {
            id: 'p_' + Date.now().toString(36),
            shopId:   $('#marketProductShop').value,
            name:     $('#marketProductName').value.trim(),
            category: $('#marketProductCategory').value.trim(),
            price:    parseFloat($('#marketProductPrice').value),
            stock:    parseInt($('#marketProductStock').value) || 0,
            unit:     $('#marketProductUnit').value.trim(),
            createdAt: Date.now()
        };

        if (!product.shopId || !product.name || !(product.price >= 0) || product.stock < 0) {
            return toast('❌ Fill all required fields');
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding…';
        }

        if (window.API && window.API.market) {
            try {
                const saved = await window.API.market.create({ type: 'product', ...product });
                if (saved && (saved.id || saved._id)) {
                    product.id = saved.id || saved._id;
                }
            } catch (err) {
                console.warn('[MarketHub] server save failed:', err.message);
            }
        }

        const db = await loadDB();
        db.products = db.products || [];
        db.products.push(product);
        saveDB(db);

        toast(`✅ Product "${product.name}" added!`);
        e.target.reset();
        await renderVendorPanel();

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product';
        }
    }

    /* ============ PLACE ORDER ============ */
    async function placeOrder() {
        const user = getCurrentUser();
        const cart = getCart();

        if (!user) return toast('❌ Please login as vendor/buyer first');
        if (cart.length === 0) return toast('❌ Cart is empty');

        const { subtotal, fee, total } = cartTotal();
        const order = {
            id: 'o_' + Date.now().toString(36),
            userId: user.id,
            items: cart.map(i => ({
                productId: i.productId,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                subtotal: i.price * i.quantity
            })),
            subtotal,
            deliveryFee: fee,
            total,
            deliveryType: state.deliveryType,
            deliveryAddress: $('#marketDeliveryAddress')?.value.trim() || '',
            paymentMethod:   $('#marketPaymentMethod')?.value || 'cash',
            status: 'pending',
            createdAt: Date.now()
        };

        const btn = document.querySelector('[data-action="marketPlaceOrder"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing order…';
        }

        if (window.API && window.API.market) {
            try {
                const saved = await window.API.market.create({ type: 'order', ...order });
                if (saved && (saved.id || saved._id)) {
                    order.id = saved.id || saved._id;
                }
            } catch (err) {
                console.warn('[MarketHub] server save failed:', err.message);
            }
        }

        const db = await loadDB();
        db.orders = db.orders || [];
        db.orders.push(order);

        cart.forEach(item => {
            const p = (db.products || []).find(x => x.id === item.productId);
            if (p) p.stock = Math.max(0, p.stock - item.quantity);
        });

        saveDB(db);
        saveCart([]);
        toast(`✅ Order placed! Total ${money(total)}`);
        renderCart();
        await renderOrders();
        await renderShops();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Place Order';
        }
    }

    async function renderOrders() {
        const user  = getCurrentUser();
        const list  = $('#marketOrdersList');
        const empty = $('#marketOrdersEmpty');
        if (!list) return;

        const db     = await loadDB();
        const orders = user ? (db.orders || []).filter(o => o.userId === user.id) : [];

        const count = $('#marketOrdersCount');
        if (count) count.textContent = orders.length;

        if (orders.length === 0) {
            list.innerHTML = '';
            empty?.classList.add('show');
            return;
        }
        empty?.classList.remove('show');

        list.innerHTML = orders.slice().reverse().map(o => `
            <div class="market-order-card">
                <div class="market-order-header">
                    <span>Order ${o.id}</span>
                    <span class="market-order-status ${o.status}">${o.status}</span>
                </div>
                <div class="market-order-items">
                    ${(o.items || []).map(i => `<div>${escapeHtml(i.name)} × ${i.quantity} — ${money(i.subtotal)}</div>`).join('')}
                </div>
                <div class="market-order-total">${money(o.total)}</div>
                <div style="font-size: 0.7rem; color: var(--color-text-muted);">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHtml(o.deliveryAddress || 'N/A')}
                    · <i class="fas fa-credit-card"></i> ${escapeHtml(o.paymentMethod)}
                </div>
            </div>
        `).join('');
    }

    /* ============ TABS ============ */
    function initTabs() {
        $$('.market-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                const target = tab.dataset.marketTab;
                $$('.market-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                $$('.market-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));

                const filters = $('#marketFilters');
                if (filters) filters.style.display = target === 'browse' ? 'flex' : 'none';

                const content = $('.market-content');
                if (content) content.scrollTop = 0;

                try { tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}

                if (target === 'vendor') await renderVendorPanel();
                if (target === 'orders') await renderOrders();
                if (target === 'cart')   renderCart();
            });

            tab.addEventListener('keydown', (e) => {
                const tabs = $$('.market-tab');
                const i = tabs.indexOf(tab);
                if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(i + 1) % tabs.length]?.focus(); }
                if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(i - 1 + tabs.length) % tabs.length]?.focus(); }
            });
        });
    }

    function initFilters() {
        $('#marketSearchInput')?.addEventListener('input', (e) => {
            state.filters.q = e.target.value;
            renderShops();
        });
        $('#marketCategoryFilter')?.addEventListener('change', (e) => {
            state.filters.category = e.target.value;
            renderShops();
        });
        $('#marketRadiusFilter')?.addEventListener('change', (e) => {
            state.filters.radius = Number(e.target.value);
            renderShops();
        });
    }

    /* ============ RESPONSIVE EVENT WIRING ============ */
    function initBackdropClose() {
        [
            { sel: '#marketModal',     close: close },
            { sel: '#marketShopModal', close: closeShop },
            { sel: '#marketAuthModal', close: closeVendorAuth }
        ].forEach(({ sel, close: closeFn }) => {
            const modal = $(sel);
            if (!modal) return;
            modal.addEventListener('mousedown', (e) => {
                modal._downTarget = e.target;
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal && modal._downTarget === modal) closeFn();
                modal._downTarget = null;
            });
            modal.addEventListener('touchend', (e) => {
                if (e.target === modal && modal._downTarget === modal) {
                    e.preventDefault();
                    closeFn();
                }
                modal._downTarget = null;
            }, { passive: false });
        });
    }

    function initVisualViewport() {
        if (!window.visualViewport) return;
        const onVV = debounce(() => {
            const active = document.activeElement;
            if (!active) return;
            const modal = active.closest('.market-modal, .market-shop-modal, .market-auth-modal');
            if (modal && modal.classList.contains('active')) {
                try { active.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
            }
        }, 120);
        window.visualViewport.addEventListener('resize', onVV);
        window.visualViewport.addEventListener('scroll', onVV);
    }

    function initResizeHandler() {
        const onResize = debounce(() => {
            if (state.openModals.size === 0) return;
            const content  = document.querySelector('.market-content');
            const shopBody = document.querySelector('.market-shop-modal .market-shop-body');
            const contentTop = content ? content.scrollTop : 0;
            const shopTop    = shopBody ? shopBody.scrollTop : 0;
            requestAnimationFrame(() => {
                if (content)  content.scrollTop  = contentTop;
                if (shopBody) shopBody.scrollTop = shopTop;
            });
        }, 180);

        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(onResize, 250);
        });
    }

    /* ============ RENDER ALL ============ */
    async function renderAll() {
        updateLocationText();
        updateCartBadge();
        renderCart();
        await Promise.all([
            renderShops(),
            renderVendorPanel(),
            renderOrders()
        ]);
    }

    /* ============ INIT ============ */
    function init() {
        initTabs();
        initFilters();
        initBackdropClose();
        initVisualViewport();
        initResizeHandler();
        initShopsGridDelegate();
        initShopProductsDelegate();

        $('#marketLocationBtn')?.addEventListener('click', requestLocation);

        $('#marketAuthForm')?.addEventListener('submit', submitVendorAuth);
        $('#marketAuthToggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            setAuthMode(currentAuthMode === 'login' ? 'register' : 'login');
        });

        $('#marketShopForm')?.addEventListener('submit', createShop);
        $('#marketProductForm')?.addEventListener('submit', createProduct);

        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            switch (action) {
                case 'openMarketHub':      open(); break;
                case 'closeMarketHub':     close(); break;
                case 'openMarketShop':     openShop(el.dataset.shopId); break;
                case 'closeMarketShop':    closeShop(); break;
                case 'marketAddToCart':    addToCart(el.dataset.productId); break;
                case 'marketClearCart':    clearCart(); break;
                case 'marketPlaceOrder':   placeOrder(); break;
                case 'openMarketAuth':     openVendorAuth(el.dataset.mode || 'login'); break;
                case 'closeMarketAuth':    closeVendorAuth(); break;
                case 'marketVendorLogout': logoutVendor(); break;
                case 'fillVendorGeo':      fillVendorGeo(); break;
                default: break;
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if ($('#marketAuthModal')?.classList.contains('active')) { closeVendorAuth(); return; }
            if ($('#marketShopModal')?.classList.contains('active')) { closeShop();       return; }
            if ($('#marketModal')?.classList.contains('active'))     { close();           return; }
        });
    }

    return { init, open, close };
})();

/* Auto-init when DOM ready */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MarketHub.init());
} else {
    MarketHub.init();
}