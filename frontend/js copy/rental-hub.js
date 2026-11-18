/* ==========================================================================
   RENTAL PROPERTY HUB — Zeroth Business Solutions
   Self-contained module: seeds demo data, renders the modal, handles
   filters, favorites, applications, and landlord listing creation.
   All data is persisted in localStorage.

   v2 — exposes window.RentalHub so app.js's MODULE_FALLBACKS can
        resolve it via window[name] / resolveModule(). Previously the
        module only set window.openRentalHub / window.closeRentalHub,
        so app.js's fallback thought the module was missing and its
        capture-phase listener blocked the real handler.
   ========================================================================== */
(function () {
    'use strict';

    /* ==============================================================
       STORAGE
       ============================================================== */
    const LS_KEY = 'zbs_rental_hub_v1';

    function load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) {
                const fresh = seed();
                localStorage.setItem(LS_KEY, JSON.stringify(fresh));
                return fresh;
            }
            return JSON.parse(raw);
        } catch {
            const fresh = seed();
            localStorage.setItem(LS_KEY, JSON.stringify(fresh));
            return fresh;
        }
    }
    function save(data) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }
    function uid(prefix) {
        return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    }

    /* ==============================================================
       SEED DATA
       ============================================================== */
    function seed() {
        const now = Date.now();
        const day = 86400000;
        const iso = (d) => new Date(now + d * day).toISOString();

        return {
            listings: [
                {
                    id: 'r1',
                    landlordId: 'seed_landlord',
                    landlordName: 'Mwape Properties',
                    landlordPhone: '+260 97 111 2233',
                    landlordEmail: 'mwape@example.com',
                    title: 'Modern 2BR Apartment in Kabulonga',
                    type: 'apartment',
                    address: 'Plot 42, Kabulonga Road',
                    city: 'Lusaka', province: 'Lusaka', area: 'Kabulonga',
                    description: 'Bright two-bedroom apartment in the heart of Kabulonga. Newly renovated kitchen with granite counters, borehole water, backup power, and 24-hour security. Walking distance to Manda Hill.',
                    rent: 8500,
                    deposit: 8500,
                    bedrooms: 2, bathrooms: 2, sqm: 120,
                    availableFrom: iso(7),
                    pets: true, furnished: false, parking: true, laundry: true,
                    water: true, power: true, security: true,
                    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
                    createdAt: iso(-1)
                },
                {
                    id: 'r2',
                    landlordId: 'seed_landlord',
                    landlordName: 'Chanda Rentals',
                    landlordPhone: '+260 96 555 4433',
                    landlordEmail: 'chanda@example.com',
                    title: 'Cozy Studio in Roma',
                    type: 'studio',
                    address: '12 Roma Park',
                    city: 'Lusaka', province: 'Lusaka', area: 'Roma',
                    description: 'Perfect for a student or young professional. Furnished studio with a kitchenette, WiFi included, secure gated compound.',
                    rent: 3200,
                    deposit: 3200,
                    bedrooms: 0, bathrooms: 1, sqm: 45,
                    availableFrom: iso(3),
                    pets: false, furnished: true, parking: true, laundry: false,
                    water: true, power: true, security: true,
                    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
                    createdAt: iso(-2)
                },
                {
                    id: 'r3',
                    landlordId: 'seed_landlord',
                    landlordName: 'Banda Estates',
                    landlordPhone: '+260 95 777 1188',
                    landlordEmail: 'banda@example.com',
                    title: 'Spacious 4BR Family House in Woodlands',
                    type: 'house',
                    address: '88 Woodlands Extension',
                    city: 'Lusaka', province: 'Lusaka', area: 'Woodlands',
                    description: 'Large family home with a mature garden, double garage, servant quarters, and a swimming pool. Zoned for top schools.',
                    rent: 18000,
                    deposit: 18000,
                    bedrooms: 4, bathrooms: 3, sqm: 320,
                    availableFrom: iso(14),
                    pets: true, furnished: false, parking: true, laundry: true,
                    water: true, power: true, security: true,
                    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
                    createdAt: iso(-3)
                },
                {
                    id: 'r4',
                    landlordId: 'seed_landlord',
                    landlordName: 'Copperbelt Homes',
                    landlordPhone: '+260 97 222 4455',
                    landlordEmail: 'cbh@example.com',
                    title: 'Executive 3BR Townhouse in Riverside',
                    type: 'house',
                    address: '7 Riverside Gardens',
                    city: 'Kitwe', province: 'Copperbelt', area: 'Riverside',
                    description: 'Executive townhouse in a gated community. Open-plan living, modern kitchen, private patio, and full security.',
                    rent: 12500,
                    deposit: 12500,
                    bedrooms: 3, bathrooms: 2.5, sqm: 210,
                    availableFrom: iso(5),
                    pets: false, furnished: false, parking: true, laundry: true,
                    water: true, power: true, security: true,
                    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
                    createdAt: iso(-4)
                },
                {
                    id: 'r5',
                    landlordId: 'seed_landlord',
                    landlordName: 'Siavonga Beach Homes',
                    landlordPhone: '+260 96 333 7766',
                    landlordEmail: 'sbh@example.com',
                    title: 'Lakeside 1BR Cottage',
                    type: 'house',
                    address: 'Lake Kariba Shoreline',
                    city: 'Siavonga', province: 'Southern', area: 'Lakeside',
                    description: 'Charming lakeside cottage, ideal for weekends or long-term. Sunset views over Lake Kariba, private jetty access.',
                    rent: 6500,
                    deposit: 6500,
                    bedrooms: 1, bathrooms: 1, sqm: 70,
                    availableFrom: iso(2),
                    pets: true, furnished: true, parking: true, laundry: false,
                    water: true, power: true, security: false,
                    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
                    createdAt: iso(-5)
                },
                {
                    id: 'r6',
                    landlordId: 'seed_landlord',
                    landlordName: 'Nkana Business Park',
                    landlordPhone: '+260 95 444 9988',
                    landlordEmail: 'nkana@example.com',
                    title: 'Ground Floor Office Space — CBD',
                    type: 'office',
                    address: 'Plot 200, Independence Ave',
                    city: 'Lusaka', province: 'Lusaka', area: 'CBD',
                    description: 'Ground-floor office space in prime CBD location. Open plan, air-conditioned, with parking for 6 vehicles. Fibre internet available.',
                    rent: 22000,
                    deposit: 22000,
                    bedrooms: 0, bathrooms: 2, sqm: 240,
                    availableFrom: iso(10),
                    pets: false, furnished: false, parking: true, laundry: false,
                    water: true, power: true, security: true,
                    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
                    createdAt: iso(-6)
                }
            ],
            favorites: {},        // { listingId: true }
            applications: [],     // [{ id, listingId, ... applicant details, status, createdAt }]
            landlordSession: null // { name, email }
        };
    }

    /* ==============================================================
       STATE
       ============================================================== */
    let data = load();
    let activeDetailId = null;

    /* ==============================================================
       UTILS
       ============================================================== */
    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const fmtZMW = (n) => 'ZMW ' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    function listingById(id) { return data.listings.find(l => l.id === id); }

    function isFav(id) { return !!data.favorites[id]; }

    function toggleFav(id) {
        if (data.favorites[id]) delete data.favorites[id];
        else data.favorites[id] = true;
        save(data);
        return isFav(id);
    }

    /* ==============================================================
       OPEN / CLOSE MODAL
       ============================================================== */
    const modal = () => document.getElementById('rentalModal');

    function openModal(tab) {
        const m = modal();
        if (!m) return;
        m.hidden = false;
        document.body.style.overflow = 'hidden';
        if (tab) activateTab(tab);
        else renderAll();
    }
    function closeModal() {
        const m = modal();
        if (!m) return;
        m.hidden = true;
        document.body.style.overflow = '';
    }

    function activateTab(name) {
        const m = modal();
        if (!m) return;
        $$('.rental-tab', m).forEach(t => {
            const active = t.dataset.rentalTab === name;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        $$('.rental-panel', m).forEach(p => {
            p.classList.toggle('active', p.dataset.rentalPanel === name);
        });
        if (name === 'favorites') renderFavorites();
        if (name === 'myapplications') renderApplications();
        if (name === 'landlord') renderLandlordPanel();
    }

    /* ==============================================================
       RENDER: ALL
       ============================================================== */
    function renderAll() {
        renderCityFilter();
        renderBrowse();
        renderFavorites();
        renderApplications();
        renderLandlordPanel();
        updateCounts();
    }

    function updateCounts() {
        const favEl = document.getElementById('rentalFavCount');
        const appsEl = document.getElementById('rentalAppsCount');
        if (favEl) favEl.textContent = Object.keys(data.favorites).length;
        if (appsEl) appsEl.textContent = data.applications.length;
    }

    /* ==============================================================
       RENDER: CITY FILTER
       ============================================================== */
    function renderCityFilter() {
        const sel = document.getElementById('rentalCityFilter');
        if (!sel) return;
        const cities = [...new Set(data.listings.map(l => l.city))].sort();
        const current = sel.value;
        sel.innerHTML = '<option value="">All Cities</option>' +
            cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        sel.value = current;
    }

    /* ==============================================================
       RENDER: BROWSE GRID
       ============================================================== */
    function getFilters() {
        const m = modal();
        if (!m) return {};
        return {
            q: (document.getElementById('rentalSearchInput') || {}).value?.trim().toLowerCase() || '',
            type: (document.getElementById('rentalTypeFilter') || {}).value || '',
            beds: (document.getElementById('rentalBedsFilter') || {}).value ?? '',
            city: (document.getElementById('rentalCityFilter') || {}).value || '',
            sort: (document.getElementById('rentalSortFilter') || {}).value || 'newest',
            maxPrice: Number((document.getElementById('rentalMaxPrice') || {}).value || 50000),
            pets: (document.getElementById('rentalPetsFilter') || {}).checked || false,
            furnished: (document.getElementById('rentalFurnishedFilter') || {}).checked || false
        };
    }

    function applyFilters(list) {
        const f = getFilters();
        let out = list.filter(l => {
            if (f.q) {
                const hay = (l.title + ' ' + l.address + ' ' + l.city + ' ' + (l.area || '') + ' ' + l.description).toLowerCase();
                if (!hay.includes(f.q)) return false;
            }
            if (f.type && l.type !== f.type) return false;
            if (f.beds !== '' && l.bedrooms < Number(f.beds)) return false;
            if (f.city && l.city !== f.city) return false;
            if (l.rent > f.maxPrice) return false;
            if (f.pets && !l.pets) return false;
            if (f.furnished && !l.furnished) return false;
            return true;
        });

        if (f.sort === 'price-asc') out.sort((a, b) => a.rent - b.rent);
        else if (f.sort === 'price-desc') out.sort((a, b) => b.rent - a.rent);
        else out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return out;
    }

    function renderBrowse() {
        const grid = document.getElementById('rentalGrid');
        const empty = document.getElementById('rentalEmpty');
        const count = document.getElementById('rentalResultsCount');
        if (!grid) return;

        const results = applyFilters(data.listings);
        if (count) count.textContent = results.length;

        if (!results.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        grid.innerHTML = results.map(cardHTML).join('');
        wireCardButtons(grid);
    }

    /* ==============================================================
       LISTING CARD
       ============================================================== */
    function cardHTML(l) {
        const fav = isFav(l.id);
        const media = l.image
            ? `<img src="${esc(l.image)}" alt="${esc(l.title)}" loading="lazy" />`
            : `<div class="rental-card-media-placeholder"><i class="fas fa-house"></i></div>`;
        const typeLabel = (l.type || '').charAt(0).toUpperCase() + (l.type || '').slice(1);
        const beds = l.bedrooms === 0 ? 'Studio' : l.bedrooms + ' bed';
        const pill = l.pets ? '<span class="rental-card-pill">🐾 Pets</span>'
                   : l.furnished ? '<span class="rental-card-pill furnished">🛋️ Furnished</span>'
                   : '';
        return `
            <article class="rental-card-listing" data-listing-id="${esc(l.id)}">
                <div class="rental-card-media">
                    <span class="rental-card-type-badge">${esc(typeLabel)}</span>
                    <button class="rental-card-fav ${fav ? 'active' : ''}" data-fav-id="${esc(l.id)}" aria-label="Save">
                        <i class="${fav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    ${media}
                </div>
                <div class="rental-card-body">
                    <div class="rental-card-title">${esc(l.title)}</div>
                    <div class="rental-card-loc"><i class="fas fa-location-dot"></i> ${esc(l.area ? l.area + ', ' : '')}${esc(l.city)}</div>
                    <div class="rental-card-meta">
                        <span><i class="fas fa-bed"></i> ${esc(beds)}</span>
                        <span><i class="fas fa-bath"></i> ${esc(l.bathrooms)}</span>
                        ${l.sqm ? `<span><i class="fas fa-ruler-combined"></i> ${esc(l.sqm)} m²</span>` : ''}
                    </div>
                    <div class="rental-card-foot">
                        <div class="rental-card-price">${fmtZMW(l.rent)}<small> /mo</small></div>
                        ${pill}
                    </div>
                </div>
            </article>
        `;
    }

    function wireCardButtons(root) {
        $$('[data-fav-id]', root).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.favId;
                const active = toggleFav(id);
                btn.classList.toggle('active', active);
                btn.innerHTML = `<i class="${active ? 'fas' : 'far'} fa-heart"></i>`;
                updateCounts();
                renderFavorites();
                toast(active ? '♥ Saved to favorites' : 'Removed from favorites');
            });
        });

        $$('.rental-card-listing', root).forEach(card => {
            card.addEventListener('click', () => openDetail(card.dataset.listingId));
        });
    }

    /* ==============================================================
       FAVORITES
       ============================================================== */
    function renderFavorites() {
        const grid = document.getElementById('rentalFavGrid');
        const empty = document.getElementById('rentalFavEmpty');
        const count = document.getElementById('rentalFavResultsCount');
        if (!grid) return;

        const favs = data.listings.filter(l => isFav(l.id));
        if (count) count.textContent = favs.length;

        if (!favs.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        grid.innerHTML = favs.map(cardHTML).join('');
        wireCardButtons(grid);
    }

    /* ==============================================================
       APPLICATIONS
       ============================================================== */
    function renderApplications() {
        const list = document.getElementById('rentalAppsList');
        const empty = document.getElementById('rentalAppsEmpty');
        const count = document.getElementById('rentalAppsResultsCount');
        if (!list) return;

        const apps = [...data.applications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (count) count.textContent = apps.length;

        if (!apps.length) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        list.innerHTML = apps.map(a => {
            const l = listingById(a.listingId);
            if (!l) return '';
            const statusClass = (a.status || 'pending').toLowerCase();
            const statusLabel = (a.status || 'pending').charAt(0).toUpperCase() + (a.status || 'pending').slice(1);
            return `
                <div class="rental-app-row">
                    <div>
                        <h4>${esc(l.title)}</h4>
                        <p><i class="fas fa-location-dot"></i> ${esc(l.area ? l.area + ', ' : '')}${esc(l.city)} · ${fmtZMW(l.rent)}/mo</p>
                        <p style="margin-top:4px;"><i class="fas fa-calendar"></i> Applied ${esc(fmtDate(a.createdAt))}</p>
                        <p><i class="fas fa-user"></i> ${esc(a.fullName || '—')} · ${esc(a.phone || '—')}</p>
                    </div>
                    <span class="rental-app-badge ${esc(statusClass)}">${esc(statusLabel)}</span>
                </div>
            `;
        }).join('');
    }

    /* ==============================================================
       LANDLORD PANEL
       ============================================================== */
    function renderLandlordPanel() {
        const authWrap = document.getElementById('rentalLandlordAuth');
        const dashWrap = document.getElementById('rentalLandlordDashboard');
        const nameEl = document.getElementById('rentalLandlordName');
        if (!authWrap || !dashWrap) return;

        if (data.landlordSession) {
            authWrap.hidden = true;
            dashWrap.hidden = false;
            if (nameEl) nameEl.textContent = data.landlordSession.name || 'Landlord';
            renderMyListings();
        } else {
            authWrap.hidden = false;
            dashWrap.hidden = true;
        }
    }

    function renderMyListings() {
        const wrap = document.getElementById('rentalMyListings');
        const empty = document.getElementById('rentalMyListingsEmpty');
        if (!wrap) return;

        const mine = data.listings
            .filter(l => l.landlordId === data.landlordSession?.email)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (!mine.length) {
            wrap.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        wrap.innerHTML = mine.map(l => `
            <div class="rental-app-row" style="margin-bottom:8px;">
                <div>
                    <h4>${esc(l.title)}</h4>
                    <p>${esc(l.city)} · ${fmtZMW(l.rent)}/mo · ${l.bedrooms} bed · ${l.bathrooms} bath</p>
                    <p style="margin-top:4px;">Listed ${esc(fmtDate(l.createdAt))}</p>
                </div>
                <button class="rental-btn rental-btn-outline" data-delete-listing="${esc(l.id)}" style="align-self:flex-start;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `).join('');

        $$('[data-delete-listing]', wrap).forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.deleteListing;
                data.listings = data.listings.filter(x => x.id !== id);
                save(data);
                renderAll();
                toast('Listing removed');
            });
        });
    }

    function promptLandlordAuth(mode) {
        const title = mode === 'register' ? 'Landlord Registration' : 'Landlord Login';
        const html = `
            <div class="rental-apply-container" style="max-width:460px;">
                <header class="rental-apply-header">
                    <div class="rental-apply-title"><i class="fas fa-user-tie"></i> <span>${esc(title)}</span></div>
                    <button class="window-close-btn" data-close-landlord>&times;</button>
                </header>
                <form id="rentalLandlordAuthForm" class="rental-form" style="padding:18px 22px;">
                    <div class="rental-form-group">
                        <label>Name *</label>
                        <input type="text" name="name" required maxlength="120" />
                    </div>
                    <div class="rental-form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required maxlength="120" />
                    </div>
                    <div class="rental-form-group">
                        <label>Phone *</label>
                        <input type="tel" name="phone" required maxlength="40" />
                    </div>
                    <div class="rental-form-actions">
                        <button type="submit" class="rental-btn rental-btn-primary">Continue</button>
                        <button type="button" class="rental-btn rental-btn-outline" data-close-landlord>Cancel</button>
                    </div>
                </form>
            </div>
        `;
        openOverlay(html, (root) => {
            $$('[data-close-landlord]', root).forEach(b => b.addEventListener('click', () => closeOverlay(root)));
            $('#rentalLandlordAuthForm', root).addEventListener('submit', (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                data.landlordSession = {
                    name: fd.get('name').toString().trim(),
                    email: fd.get('email').toString().trim().toLowerCase(),
                    phone: fd.get('phone').toString().trim()
                };
                save(data);
                closeOverlay(root);
                renderLandlordPanel();
                toast('Welcome, ' + data.landlordSession.name);
            });
        });
    }

    /* ==============================================================
       PROPERTY DETAIL
       ============================================================== */
    function openDetail(id) {
        const l = listingById(id);
        if (!l) return;
        activeDetailId = id;

        const m = document.getElementById('rentalDetailModal');
        if (!m) return;

        // Hero
        const hero = document.getElementById('rentalDetailHero');
        hero.innerHTML = l.image
            ? `<img src="${esc(l.image)}" alt="${esc(l.title)}" />`
            : `<div class="rental-detail-hero-placeholder"><i class="fas fa-image"></i></div>`;

        // Header
        $('#rentalDetailType').textContent = (l.type || 'Property').toUpperCase();
        $('#rentalDetailTitle').textContent = l.title;

        // Price + fav
        $('#rentalDetailPrice').textContent = fmtZMW(l.rent);
        const favBtn = $('#rentalDetailFavBtn');
        const fav = isFav(l.id);
        favBtn.classList.toggle('active', fav);
        favBtn.innerHTML = `<i class="${fav ? 'fas' : 'far'} fa-heart"></i> <span>${fav ? 'Saved' : 'Save'}</span>`;
        favBtn.dataset.favId = l.id;

        // Chips
        const chips = [];
        chips.push(`<span class="rental-chip"><i class="fas fa-bed"></i> ${l.bedrooms === 0 ? 'Studio' : l.bedrooms + ' bed'}</span>`);
        chips.push(`<span class="rental-chip"><i class="fas fa-bath"></i> ${esc(l.bathrooms)} bath</span>`);
        if (l.sqm) chips.push(`<span class="rental-chip"><i class="fas fa-ruler-combined"></i> ${esc(l.sqm)} m²</span>`);
        chips.push(`<span class="rental-chip"><i class="fas fa-calendar"></i> Available ${esc(fmtDate(l.availableFrom))}</span>`);
        $('#rentalDetailChips').innerHTML = chips.join('');

        // Address / description
        $('#rentalDetailAddress').textContent = `${l.address}, ${l.area ? l.area + ', ' : ''}${l.city}${l.province ? ', ' + l.province : ''}`;
        $('#rentalDetailDesc').textContent = l.description || 'No description provided.';

        // Amenities
        const amen = [];
        if (l.pets) amen.push(['🐾', 'Pets Allowed']);
        if (l.furnished) amen.push(['🛋️', 'Furnished']);
        if (l.parking) amen.push(['🚗', 'Parking']);
        if (l.laundry) amen.push(['🧺', 'Laundry']);
        if (l.water) amen.push(['💧', 'Water Included']);
        if (l.power) amen.push(['⚡', 'Power Backup']);
        if (l.security) amen.push(['🔒', '24/7 Security']);
        $('#rentalDetailAmenities').innerHTML = amen.length
            ? amen.map(([e, t]) => `<div class="rental-amenity">${e} ${esc(t)}</div>`).join('')
            : '<p style="color:#94a3b8;font-size:0.85rem;">No amenities listed.</p>';

        // Landlord
        const initials = (l.landlordName || 'L').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        $('#rentalDetailLandlord').innerHTML = `
            <div class="rental-landlord-avatar">${esc(initials)}</div>
            <div class="rental-landlord-info">
                <strong>${esc(l.landlordName || 'Landlord')}</strong>
                <span><i class="fas fa-phone"></i> ${esc(l.landlordPhone || '—')}</span>
                <span><i class="fas fa-envelope"></i> ${esc(l.landlordEmail || '—')}</span>
            </div>
        `;

        // Costs
        $('#rentalDetailCosts').innerHTML = `
            <div class="rental-cost-row"><span>Monthly Rent</span><span>${fmtZMW(l.rent)}</span></div>
            <div class="rental-cost-row"><span>Deposit</span><span>${fmtZMW(l.deposit || 0)}</span></div>
            <div class="rental-cost-row"><span>Total Move-in</span><span>${fmtZMW((l.rent || 0) + (l.deposit || 0))}</span></div>
            <div class="rental-cost-row"><span>Lease Term</span><span>12 months</span></div>
        `;

        // Call button
        const callBtn = $('#rentalDetailCallBtn');
        callBtn.onclick = () => {
            if (l.landlordPhone) window.location.href = 'tel:' + l.landlordPhone.replace(/\s+/g, '');
            else toast('No phone number available');
        };

        // Apply button — carry the listing id
        const applyBtn = $('#rentalDetailApplyBtn');
        applyBtn.dataset.listingId = l.id;

        m.hidden = false;
    }

    function closeDetail() {
        const m = document.getElementById('rentalDetailModal');
        if (m) m.hidden = true;
        activeDetailId = null;
    }

    /* ==============================================================
       APPLY FORM
       ============================================================== */
    function openApplyForm(listingId) {
        const l = listingById(listingId);
        if (!l) return;

        const m = document.getElementById('rentalApplyModal');
        if (!m) return;

        $('#rentalApplyProperty').textContent = l.title + ' · ' + fmtZMW(l.rent) + '/mo';
        const form = $('#rentalApplyForm');
        form.reset();
        form.dataset.listingId = listingId;
        $('#rentalApplyStatus').hidden = true;

        m.hidden = false;
    }

    function closeApplyForm() {
        const m = document.getElementById('rentalApplyModal');
        if (m) m.hidden = true;
    }

    function handleApplySubmit(e) {
        e.preventDefault();
        const form = e.target;
        const listingId = form.dataset.listingId;
        if (!listingId) return;

        const fd = new FormData(form);
        const status = $('#rentalApplyStatus');

        const app = {
            id: uid('app'),
            listingId,
            fullName: fd.get('fullName')?.toString().trim() || '',
            phone: fd.get('phone')?.toString().trim() || '',
            email: fd.get('email')?.toString().trim() || '',
            idNumber: fd.get('idNumber')?.toString().trim() || '',
            employment: fd.get('employment')?.toString() || '',
            employer: fd.get('employer')?.toString().trim() || '',
            income: Number(fd.get('income') || 0),
            moveIn: fd.get('moveIn') || '',
            occupants: Number(fd.get('occupants') || 1),
            pets: fd.get('pets')?.toString().trim() || '',
            refName: fd.get('refName')?.toString().trim() || '',
            refPhone: fd.get('refPhone')?.toString().trim() || '',
            message: fd.get('message')?.toString().trim() || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        data.applications.push(app);
        save(data);

        if (status) {
            status.classList.remove('error');
            status.textContent = '✅ Application submitted! The landlord will contact you soon.';
            status.hidden = false;
        }
        updateCounts();

        setTimeout(() => {
            closeApplyForm();
            activateTab('myapplications');
            toast('Application submitted ✓');
        }, 1200);
    }

    /* ==============================================================
       NEW LISTING (LANDLORD)
       ============================================================== */
    function handleNewListing(e) {
        e.preventDefault();
        if (!data.landlordSession) return;

        const status = $('#rentalListingStatus');
        const listing = {
            id: uid('r'),
            landlordId: data.landlordSession.email,
            landlordName: data.landlordSession.name,
            landlordPhone: document.getElementById('rentalListingPhone').value.trim(),
            landlordEmail: data.landlordSession.email,
            title: document.getElementById('rentalListingTitle').value.trim(),
            type: document.getElementById('rentalListingType').value,
            address: document.getElementById('rentalListingAddress').value.trim(),
            city: document.getElementById('rentalListingCity').value.trim(),
            province: document.getElementById('rentalListingProvince').value,
            area: document.getElementById('rentalListingZip').value.trim(),
            description: document.getElementById('rentalListingDesc').value.trim(),
            rent: Number(document.getElementById('rentalListingRent').value),
            deposit: Number(document.getElementById('rentalListingDeposit').value || 0),
            bedrooms: Number(document.getElementById('rentalListingBeds').value),
            bathrooms: Number(document.getElementById('rentalListingBaths').value),
            sqm: Number(document.getElementById('rentalListingSqft').value || 0) || null,
            availableFrom: document.getElementById('rentalListingAvail').value || new Date().toISOString(),
            pets: document.getElementById('rentalListingPets').checked,
            furnished: document.getElementById('rentalListingFurnished').checked,
            parking: document.getElementById('rentalListingParking').checked,
            laundry: document.getElementById('rentalListingLaundry').checked,
            water: document.getElementById('rentalListingWater').checked,
            power: document.getElementById('rentalListingPower').checked,
            security: document.getElementById('rentalListingSecurity').checked,
            image: document.getElementById('rentalListingImage').value.trim() || null,
            createdAt: new Date().toISOString()
        };

        data.listings.push(listing);
        save(data);

        if (status) {
            status.classList.remove('error');
            status.textContent = '✅ Listing published!';
            status.hidden = false;
        }

        e.target.reset();
        renderAll();
        activateTab('landlord');

        setTimeout(() => {
            if (status) status.hidden = true;
            toast('Listing published ✓');
        }, 1400);
    }

    /* ==============================================================
       OVERLAY HELPER (for landlord auth modal)
       ============================================================== */
    let overlayEl = null;
    function openOverlay(innerHTML, onMount) {
        closeOverlay();
        overlayEl = document.createElement('div');
        overlayEl.className = 'rental-apply-modal';
        overlayEl.style.zIndex = '10060';
        overlayEl.innerHTML = innerHTML;
        document.body.appendChild(overlayEl);
        overlayEl.addEventListener('click', (e) => {
            if (e.target === overlayEl) closeOverlay();
        });
        onMount && onMount(overlayEl);
    }
    function closeOverlay(root) {
        if (root && root.parentNode) root.parentNode.removeChild(root);
        else if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
    }

    /* ==============================================================
       TOAST HELPER
       ============================================================== */
    function toast(msg, type) {
        let el = document.getElementById('rental-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'rental-toast';
            el.style.cssText =
                'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);' +
                'padding:12px 20px;background:#1e293b;color:#fff;border-radius:10px;' +
                'font-size:0.85rem;font-family:system-ui,sans-serif;z-index:100070;' +
                'box-shadow:0 8px 24px rgba(0,0,0,0.3);opacity:0;' +
                'transition:opacity 0.25s ease, transform 0.25s ease;' +
                'pointer-events:none;max-width:90vw;text-align:center;';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#1e293b');
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        });
        clearTimeout(el._t);
        el._t = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(10px)';
        }, 2400);
    }

    /* ==============================================================
       WIRE EVENTS
       ============================================================== */
    function wireEvents() {
        const m = modal();
        if (!m) return;

        // Tabs
        $$('.rental-tab', m).forEach(t => {
            t.addEventListener('click', () => activateTab(t.dataset.rentalTab));
        });

        // Filters
        ['rentalSearchInput', 'rentalTypeFilter', 'rentalBedsFilter', 'rentalCityFilter', 'rentalSortFilter']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', renderBrowse);
                if (el) el.addEventListener('change', renderBrowse);
            });
        ['rentalPetsFilter', 'rentalFurnishedFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', renderBrowse);
        });
        const maxPrice = document.getElementById('rentalMaxPrice');
        if (maxPrice) {
            maxPrice.addEventListener('input', () => {
                const label = document.getElementById('rentalMaxPriceLabel');
                if (label) label.textContent = fmtZMW(maxPrice.value);
                renderBrowse();
            });
        }

        // Clear
        const clearBtn = m.querySelector('[data-action="rentalClearFilters"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                ['rentalSearchInput','rentalTypeFilter','rentalBedsFilter','rentalCityFilter','rentalSortFilter'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                if (maxPrice) { maxPrice.value = 50000; }
                const label = document.getElementById('rentalMaxPriceLabel');
                if (label) label.textContent = fmtZMW(50000);
                const pets = document.getElementById('rentalPetsFilter');
                const furn = document.getElementById('rentalFurnishedFilter');
                if (pets) pets.checked = false;
                if (furn) furn.checked = false;
                renderBrowse();
            });
        }

        // Landlord auth buttons
        const loginBtn = m.querySelector('[data-action="rentalLandlordLogin"]');
        const registerBtn = m.querySelector('[data-action="rentalLandlordRegister"]');
        const logoutBtn = m.querySelector('[data-action="rentalLandlordLogout"]');
        if (loginBtn) loginBtn.addEventListener('click', () => promptLandlordAuth('login'));
        if (registerBtn) registerBtn.addEventListener('click', () => promptLandlordAuth('register'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            data.landlordSession = null;
            save(data);
            renderLandlordPanel();
            toast('Signed out');
        });

        // New listing form
        const listingForm = document.getElementById('rentalListingForm');
        if (listingForm) listingForm.addEventListener('submit', handleNewListing);

        // Close rental modal
        const closeBtn = m.querySelector('[data-action="closeRentalHub"]');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        m.addEventListener('mousedown', (e) => {
            if (e.target === m) closeModal();
        });

        // Detail modal
        const detailModal = document.getElementById('rentalDetailModal');
        if (detailModal) {
            detailModal.querySelectorAll('[data-action="closeRentalDetail"]').forEach(b => {
                b.addEventListener('click', closeDetail);
            });
            detailModal.addEventListener('mousedown', (e) => {
                if (e.target === detailModal) closeDetail();
            });

            const favBtn = document.getElementById('rentalDetailFavBtn');
            if (favBtn) {
                favBtn.addEventListener('click', () => {
                    const id = favBtn.dataset.favId;
                    if (!id) return;
                    const active = toggleFav(id);
                    favBtn.classList.toggle('active', active);
                    favBtn.innerHTML = `<i class="${active ? 'fas' : 'far'} fa-heart"></i> <span>${active ? 'Saved' : 'Save'}</span>`;
                    updateCounts();
                    renderBrowse();
                    renderFavorites();
                    toast(active ? '♥ Saved' : 'Removed from favorites');
                });
            }

            const applyBtn = document.getElementById('rentalDetailApplyBtn');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const id = applyBtn.dataset.listingId;
                    if (id) openApplyForm(id);
                });
            }
        }

        // Apply modal
        const applyModal = document.getElementById('rentalApplyModal');
        if (applyModal) {
            applyModal.querySelectorAll('[data-action="closeRentalApply"]').forEach(b => {
                b.addEventListener('click', closeApplyForm);
            });
            applyModal.addEventListener('mousedown', (e) => {
                if (e.target === applyModal) closeApplyForm();
            });
            const applyForm = document.getElementById('rentalApplyForm');
            if (applyForm) applyForm.addEventListener('submit', handleApplySubmit);
        }

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (overlayEl) return closeOverlay();
            const applyModal = document.getElementById('rentalApplyModal');
            if (applyModal && !applyModal.hidden) return closeApplyForm();
            const detailModal = document.getElementById('rentalDetailModal');
            if (detailModal && !detailModal.hidden) return closeDetail();
            const m = modal();
            if (m && !m.hidden) return closeModal();
        });
    }

    /* ==============================================================
       PUBLIC API (used by data-action in the rest of the page)
       --------------------------------------------------------------
       Both forms are exposed:
         • window.RentalHub = { open, close }  ← app.js MODULE_FALLBACKS
                                                  checks this via
                                                  resolveModule('RentalHub')
         • window.openRentalHub / closeRentalHub  ← legacy callers and
                                                     ad-hoc scripts
       ============================================================== */
    window.RentalHub = {
        open: openModal,
        close: closeModal
    };

    window.openRentalHub = function (tab) { openModal(tab); };
    window.closeRentalHub = closeModal;

    // Hook into global click delegation for data-action="openRentalHub"
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="openRentalHub"]');
        if (btn) {
            e.preventDefault();
            openModal();
        }
    });

    /* ==============================================================
       INIT
       ============================================================== */
    document.addEventListener('DOMContentLoaded', () => {
        wireEvents();
        // Set default max price label
        const label = document.getElementById('rentalMaxPriceLabel');
        if (label) label.textContent = fmtZMW(50000);
        // Re-render in case the modal was opened before listeners were wired
        updateCounts();
    });

})();