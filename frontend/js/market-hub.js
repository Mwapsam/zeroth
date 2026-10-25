/* ================================================================
   MARKET HUB — Buyer/Vendor marketplace with geolocation
   Self-contained module
   ----------------------------------------------------------------
   v3 — responsive + bugfixes
     FIXES over v2:
       • createShop() now reads #marketShopFormCategory (was reading
         the duplicate #marketShopCategory, which resolved to the
         span inside the shop-detail modal header — so shop.category
         was always undefined and creation silently failed).
       • #marketShopsCount badge is now populated on every render.
       • #marketShopProductsCount badge is now populated on openShop().
       • Shop card uses `.market-shop-card-body` (matches CSS; no
         collision with the shop-detail modal's scroll area).
       • Removed inline style="flex:1" on the View Shop button —
         the stylesheet stretches it via .market-shop-actions > *.
       • fillVendorGeo() disables its trigger button while locating.
       • Event delegation for shop cards + product cards — re-renders
         no longer accumulate listeners.
     RESPONSIVE (v2, retained):
       • Body scroll lock (with iOS scroll-position preservation)
       • Backdrop-click + ESC to close any layer
       • Scroll reset on modal open / tab change
       • Viewport + orientation change handling
       • Mobile keyboard (visualViewport) handling
       • Debounced resize for filter row height
       • Focus management (stack-based, nested-modal safe)
       • Safe-area aware modal sizing
   ================================================================ */
'use strict';

const MarketHub = (() => {

    /* ============ STORAGE ============ */
    const KEY      = 'zbs_market_hub';
    const USER_KEY = 'zbs_market_user';
    const CART_KEY = 'zbs_market_cart';

    function loadDB() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : { users: [], shops: [], products: [], orders: [] };
        } catch (e) {
            return { users: [], shops: [], products: [], orders: [] };
        }
    }

    function saveDB(db) {
        try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
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

    /* Focus is tracked as a stack so nested modals (hub → shop detail →
       vendor auth) return focus to the right element when they close. */
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

    /**
     * Lock body scroll while any modal is open. Uses `overflow:hidden`
     * plus `position:fixed` preservation for iOS Safari, which
     * otherwise still scrolls the page behind the modal.
     */
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

    /**
     * Bring a newly opened modal into view and reset its inner scroll
     * positions. Without this, mobile users re-open a modal and land
     * half-way down the previous scroll position.
     */
    function resetModalScroll(modal) {
        if (!modal) return;
        modal.scrollTop = 0;
        modal.querySelectorAll('.market-content, .market-shop-modal .market-shop-body, .market-auth-container')
             .forEach(el => { el.scrollTop = 0; });
    }

    /**
     * Focus the first focusable element inside the modal. Skips hidden
     * or disabled elements. preventScroll avoids an iOS "jump to focused
     * field" stutter when the modal opens.
     */
    function focusFirst(modal) {
        if (!modal) return;
        const focusable = modal.querySelector(
            'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable) return;
        try { focusable.focus({ preventScroll: true }); }
        catch (e) { focusable.focus(); }
    }

    /**
     * Open a modal the responsive way: track it, lock scroll, reset
     * scroll, and add `.active` on the next frame so the CSS transition
     * fires cleanly. Also pushes the previously focused element onto the
     * focus stack for restoration on close.
     */
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
            // Only hide if no other modal re-opened in the meantime.
            if (!modal.classList.contains('active')) {
                modal.hidden = true;
                modal.setAttribute('hidden', '');
            }
            unlockBodyScroll();
            // Restore focus to the element that opened this modal, but
            // only if it still exists in the DOM.
            if (previous instanceof HTMLElement && document.contains(previous)) {
                try { previous.focus({ preventScroll: true }); } catch (e) {}
            }
        }, 200);
    }

    /* ============ OPEN / CLOSE ============ */
    function open() {
        const modal = $('#marketModal');
        if (!modal) return;
        renderAll();
        showModal(modal);
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
    function renderShops() {
        const grid  = $('#marketShopsGrid');
        const empty = $('#marketShopsEmpty');
        const count = $('#marketShopsCount');
        if (!grid) return;

        const db     = loadDB();
        const q      = state.filters.q.toLowerCase();
        const cat    = state.filters.category;
        const radius = Number(state.filters.radius);

        let shops = db.shops.slice();

        if (cat) shops = shops.filter(s => s.category === cat);
        if (q) {
            const productShopIds = db.products
                .filter(p => p.name.toLowerCase().includes(q))
                .map(p => p.shopId);
            shops = shops.filter(s =>
                s.name.toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q) ||
                productShopIds.includes(s.id)
            );
        }

        if (state.userLocation) {
            shops = shops
                .map(s => ({
                    ...s,
                    distanceKm: haversine(state.userLocation.lat, state.userLocation.lng, s.lat, s.lng),
                    products: db.products.filter(p => p.shopId === s.id)
                }))
                .filter(s => radius >= 500 || s.distanceKm <= radius)
                .sort((a, b) => a.distanceKm - b.distanceKm);
        } else {
            shops = shops.map(s => ({
                ...s,
                products: db.products.filter(p => p.shopId === s.id)
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
                        ${shop.distanceKm !== undefined ?
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

    /* Event delegation — attached once. Re-renders of the grid replace
       innerHTML, but the listener on the grid container survives. */
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
    function openShop(shopId) {
        const db   = loadDB();
        const shop = db.shops.find(s => s.id === shopId);
        if (!shop) return;

        state.activeShop = shop;
        const products = db.products.filter(p => p.shopId === shopId);

        const modal = $('#marketShopModal');
        if (!modal) return;

        // This is the span inside the shop-detail modal header — NOT the
        // vendor form's <select>. See createShop() for the form field.
        $('#marketShopCategory').textContent = shop.category;
        $('#marketShopTitle').textContent    = shop.name;

        const productsCount = $('#marketShopProductsCount');
        if (productsCount) productsCount.textContent = products.length;

        const dist = state.userLocation
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

    /* Event delegation for the product grid inside the shop-detail modal. */
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

    function addToCart(productId) {
        const db      = loadDB();
        const product = db.products.find(p => p.id === productId);
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

    function submitVendorAuth(e) {
        e.preventDefault();
        const email    = $('#marketAuthEmail').value.trim().toLowerCase();
        const password = $('#marketAuthPassword').value;
        const db       = loadDB();

        if (currentAuthMode === 'register') {
            const name = $('#marketAuthName').value.trim();
            if (!name || !email || !password) return toast('❌ Fill all fields');
            if (db.users.find(u => u.email === email)) return toast('❌ Email already registered');

            const user = {
                id: 'u_' + Date.now().toString(36),
                name, email, password,
                role: 'vendor',
                createdAt: Date.now()
            };
            db.users.push(user);
            saveDB(db);
            setCurrentUser(user);
            toast(`✅ Welcome, ${name}!`);
        } else {
            const user = db.users.find(u => u.email === email && u.password === password);
            if (!user) return toast('❌ Invalid credentials');
            setCurrentUser(user);
            toast(`✅ Welcome back, ${user.name}!`);
        }

        closeVendorAuth();
        renderVendorPanel();
    }

    function logoutVendor() {
        setCurrentUser(null);
        toast('👋 Logged out');
        renderVendorPanel();
    }

    function renderVendorPanel() {
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

        const db      = loadDB();
        const myShops = db.shops.filter(s => s.vendorId === user.id);
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
            const products = db.products.filter(p => p.shopId === shop.id);
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
            btn.onclick = () => {
                if (!confirm('Delete this shop and all its products?')) return;
                const db2 = loadDB();
                db2.shops    = db2.shops.filter(s => s.id !== btn.dataset.shopId);
                db2.products = db2.products.filter(p => p.shopId !== btn.dataset.shopId);
                saveDB(db2);
                toast('🗑️ Shop deleted');
                renderVendorPanel();
                renderShops();
            };
        });
    }

    /* ============ CREATE SHOP ============ */
    function createShop(e) {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user || user.role !== 'vendor') return toast('❌ Login as vendor first');

        // IMPORTANT: form field is #marketShopFormCategory. The other
        // #marketShopCategory lives inside the shop-detail modal header
        // (a <span>), and querySelector('#marketShopCategory') would
        // resolve to that span — returning undefined here and silently
        // failing shop creation.
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

        const db = loadDB();
        db.shops.push(shop);
        saveDB(db);
        toast(`✅ Shop "${shop.name}" created!`);
        e.target.reset();
        renderVendorPanel();
        renderShops();
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
    function createProduct(e) {
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

        const db = loadDB();
        db.products.push(product);
        saveDB(db);
        toast(`✅ Product "${product.name}" added!`);
        e.target.reset();
        renderVendorPanel();
    }

    /* ============ PLACE ORDER ============ */
    function placeOrder() {
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

        const db = loadDB();
        db.orders.push(order);

        cart.forEach(item => {
            const p = db.products.find(x => x.id === item.productId);
            if (p) p.stock = Math.max(0, p.stock - item.quantity);
        });

        saveDB(db);
        saveCart([]);
        toast(`✅ Order placed! Total ${money(total)}`);
        renderCart();
        renderOrders();
        renderShops();
    }

    function renderOrders() {
        const user  = getCurrentUser();
        const list  = $('#marketOrdersList');
        const empty = $('#marketOrdersEmpty');
        if (!list) return;

        const db     = loadDB();
        const orders = user ? db.orders.filter(o => o.userId === user.id) : [];

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
                    ${o.items.map(i => `<div>${escapeHtml(i.name)} × ${i.quantity} — ${money(i.subtotal)}</div>`).join('')}
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
            tab.addEventListener('click', () => {
                const target = tab.dataset.marketTab;
                $$('.market-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                $$('.market-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));

                // Hide filters on non-browse tabs
                const filters = $('#marketFilters');
                if (filters) filters.style.display = target === 'browse' ? 'flex' : 'none';

                // Reset content scroll so users don't land mid-panel
                const content = $('.market-content');
                if (content) content.scrollTop = 0;

                // Keep active tab visible in the horizontal scroll strip
                try { tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}

                if (target === 'vendor') renderVendorPanel();
                if (target === 'orders') renderOrders();
                if (target === 'cart')   renderCart();
            });

            // Keyboard navigation for the tab strip
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

    /**
     * Close any open modal when the user clicks the dimmed backdrop, but
     * NOT when the click is inside the modal content. Also tracks where
     * the press started so a drag from inside doesn't count as a
     * backdrop click.
     */
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

    /**
     * Mobile browsers resize the viewport when the on-screen keyboard
     * opens. Use visualViewport when available to keep the focused
     * field visible inside the modal.
     */
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

    /**
     * Debounced resize handler. Preserves scroll positions of inner
     * scroll areas across breakpoint changes.
     */
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
    function renderAll() {
        updateLocationText();
        updateCartBadge();
        renderShops();
        renderCart();
        renderVendorPanel();
        renderOrders();
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