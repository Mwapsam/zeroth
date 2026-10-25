/* ================================================================
   ZEROTH BUSINESS SOLUTIONS - MAIN APPLICATION SCRIPT
   Version 3.3.7
   ----------------------------------------------------------------
   v3.3.7 — LuSE Market Trends charts integrated:
            • Added `ensureLuSEPanel()` — critical helper previously
              referenced by `renderLuSETrends()` but never defined,
              so charts never rendered. Now creates #etf-panel-luse
              and #etfLuseGrid on demand.
            • Added `buildLuSETrendChart()` — SVG line/area chart
              builder for the LuSE All-Share Index (7-day and
              monthly) and USD/ZMW FX monthly trend.
            • Added `renderLuSETrends()` — orchestrator that builds
              three responsive charts. Data source:
              window.LUSE_DATA.trends, with PDF-sourced fallback.
            • Added `setLuseData()` — runtime data injector so live
              LuSE data can replace the fallback without reload.
            • `openETF()` now calls `renderLuSETrends()` — charts
              appear whenever the ETF Trading Hub opens.
            • Added 'LuSE Market Trends' to SERVICE_INDEX and the
              `openLuSETrends` case in handleAction().

   v3.3.6 — Button-responsiveness & parsing fixes:
            • FIXED: SyntaxError caused by HTML comments (<!-- -->)
              accidentally embedded in this JS file. Converted to
              block comments. This alone was breaking the whole app.
            • FIXED: `$('#shareApplicationForm')` — no such element.
              HTML uses `id="ZBS-StocksForm"`. Submit was silently
              dead. Now bound to the correct ID (with legacy fallback).
            • FIXED: `openLoanApplication` had no handler — now
              opens FinancialHub on the loan-application section
              (with graceful fallback when the module is absent).
            • FIXED: `openProHireHub` / `openProHireVehicles` were
              dead buttons. Added to MODULE_ACTIONS + a module
              fallback that resolves `ProHireHub` lazily.
            • FIXED: `headerNavHome/About/Partners` and the header
              services menu (toggle/close) could silently die when
              `header-nav-adverts.js` was missing or late. Added
              native fallbacks that scroll / toggle the dropdown.
            • FIXED: `renderEducation()` looked up count-IDs
              `countHighschools` / `countPrimaryschools` but the HTML
              uses `countHighSchools` / `countPrimarySchools`, so the
              tab counters never updated. Now uses an explicit map.
            • FIXED: `bindCompanyCardEvents()` opened the ETF detail
              modal twice per click (card listener + global
              dispatcher). Added `e.stopPropagation()`.
            • Hardened: added `?.` on several DOM lookups that could
              fire before the modal markup exists.

   v3.3.5 — Hub-module fallback fix (critical):
            • `resolveModule(name)` resolves const-scope modules.
            • Fallbacks no-op when the module IS loaded.
            • Removed redundant X.init() calls at the end of init().
   ================================================================ */

'use strict';

/* ================================================================
   SHORTHAND HELPERS
   ================================================================ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ================================================================
   SERVICE INDEX (used by search)
   ================================================================ */
const SERVICE_INDEX = [
    { name: 'Meat (Beef, Pork, Mutton, etc.)', icon: '🥩', cat: 'agricultural', action: null },
    { name: 'Eggs & Dairy', icon: '🥚', cat: 'agricultural', action: null },
    { name: 'Dried Foods (Beans, Nuts, Maize)', icon: '🍲', cat: 'agricultural', action: null },
    { name: 'Livestock (Chicks, Broilers, Goats)', icon: '🐔', cat: 'agricultural', action: null },
    { name: 'Farm Produce (Vegetables, Fruits)', icon: '🌾', cat: 'agricultural', action: null },
    { name: 'Agro-Chemicals', icon: '🧪', cat: 'agricultural', action: null },
    { name: 'Farm Services', icon: '🚜', cat: 'agricultural', action: null },
    { name: 'Incubation Services', icon: '🥚', cat: 'agricultural', action: null },
    { name: 'Insurance', icon: '🛡️', cat: 'brokerage', action: null },
    { name: 'Advertisement', icon: '📢', cat: 'brokerage', action: null },
    { name: 'Consultations', icon: '💼', cat: 'brokerage', action: null },
    { name: 'Stationary Services', icon: '📄', cat: 'brokerage', action: null },
    { name: 'Educational Institutions', icon: '🎓', cat: 'brokerage', action: 'openEducation' },
    { name: 'Construction & Survey', icon: '🏗️', cat: 'brokerage', action: 'openConstructionHub' },
    { name: 'Health Care', icon: '🏥', cat: 'brokerage', action: null },
    { name: 'Auctioning', icon: '🔨', cat: 'brokerage', action: null },
    { name: 'Security', icon: '🔒', cat: 'brokerage', action: null },
    { name: 'Transport', icon: '🚚', cat: 'brokerage', action: null },
    { name: 'Hardware Store', icon: '🔧', cat: 'brokerage', action: null },
    { name: 'ETF Trading Hub (24/7)', icon: '📈', cat: 'brokerage', action: 'openETF' },
    { name: 'LuSE Market Trends', icon: '📈', cat: 'brokerage', action: 'openLuSETrends' },
    { name: 'Bet & Gaming Hub', icon: '🎲', cat: 'brokerage', action: 'openBetting' },
    { name: 'Animal Acquisition Permit', icon: '🐄', cat: 'brokerage', action: 'openAgriPermit' },
    { name: 'Share Purchase Application', icon: '📊', cat: 'brokerage', action: 'openShareApplication' },
    { name: 'Entertainment Hub', icon: '🎬', cat: 'brokerage', action: 'openEntertainment' },
    { name: 'Consultation Hub', icon: '🧠', cat: 'brokerage', action: 'openConsultationHub' },
    { name: 'Market Hub', icon: '🛒', cat: 'brokerage', action: 'openMarketHub' },
    { name: 'Advertisement Hub', icon: '📢', cat: 'brokerage', action: 'openAdvertHub' },
    { name: 'Rental Property Hub', icon: '🏘️', cat: 'brokerage', action: 'openRentalHub' },
    { name: 'ProHire — Hire a Pro (24/7)', icon: '🔨', cat: 'brokerage', action: 'openProHireHub' },
    { name: 'Vehicles for Hire', icon: '🚗', cat: 'brokerage', action: 'openProHireVehicles' },
    { name: 'Loan Application', icon: '📝', cat: 'financial', action: 'openLoanApplication' },
    { name: 'Salary Advance', icon: '💳', cat: 'financial', action: null },
    { name: 'Vehicle Financing', icon: '🚗', cat: 'financial', action: null },
    { name: 'Business Venture Loans', icon: '🏢', cat: 'financial', action: null },
    { name: 'Food Wallet Loans', icon: '🛒', cat: 'financial', action: null },
    { name: 'Group Loans', icon: '👥', cat: 'financial', action: null },
    { name: 'Payroll Based Loans', icon: '📋', cat: 'financial', action: null },
    { name: 'Payday Loans', icon: '💰', cat: 'financial', action: null },
    { name: 'Emergency Loans', icon: '🚨', cat: 'financial', action: null },
    { name: 'Building Loans', icon: '🏠', cat: 'financial', action: null },
    { name: 'Savings', icon: '🏦', cat: 'financial', action: null },
    { name: 'Financial Hub', icon: '🏦', cat: 'financial', action: 'openFinancialHub' },
    { name: 'Betting Hub', icon: '🎲', cat: 'financial', action: 'openBetting' },
    { name: 'Loan Calculator', icon: '🧮', cat: 'financial', action: 'openLoanApplication' }
];

/* ================================================================
   MODULE-OWNED ACTIONS — these must be skipped by the global
   dispatcher (their own module binds them).
   ================================================================ */
const MODULE_ACTIONS = new Set([
    'openAdvertHub', 'closeAdvertHub',
    'openRentalHub', 'closeRentalHub',
    'openConsultationHub', 'closeConsultation',
    'openConsultationBooking', 'closeConsultationBooking',
    'openMarketHub', 'closeMarketHub',
    'openMarketShop', 'closeMarketShop',
    'marketAddToCart', 'marketClearCart', 'marketPlaceOrder',
    'openMarketAuth', 'closeMarketAuth', 'marketVendorLogout',
    'fillVendorGeo', 'requestMarketLocation',
    'openConstructionHub', 'closeConstructionHub',
    'openAgricultureHub', 'closeAgricultureHub',
    'openAgriPost', 'closeAgriPost',
    'openAgriListing', 'closeAgriListing',
    'agriUseLocation', 'agriFillPostGeo',
    'openAgricultureCart', 'closeAgricultureCart',
    'openAgricultureItem', 'closeAgricultureItem',
    'openAgriPermit', 'closeAgriPermit', 'printAgriPermit',
    'openFinancialHub', 'closeFinancialHub',
    'finSelectService', 'finCalculate', 'finVoiceSearch',
    'finOpenSelfie', 'finCloseSelfie', 'finCaptureSelfie', 'finSwitchCamera',
    'finOpenVideoCall', 'finEndCall', 'finToggleMic', 'finToggleCam',
    'finSwitchCallCamera', 'finSendChat',
    /* ProHire — module-owned so its own listener wins */
    'openProHireHub', 'closeProHireHub', 'openProHireVehicles'
]);

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */
function show(el) {
    if (!el) return;
    el.hidden = false;
    el.removeAttribute('hidden');
}
function hide(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute('hidden', '');
}
function showToast(msg, duration = 3000) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.removeAttribute('hidden');
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = 'slideUp 0.3s ease';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.hidden = true;
        toast.setAttribute('hidden', '');
    }, duration);
}
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function money(n) {
    return 'ZMW ' + (Number(n) || 0).toFixed(2);
}
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================
   APP STATE
   ================================================================ */
const AppState = {
    user: null,
    wallet: { currency: 'ZMW', balance: 0 },
    notifications: [],
    activeSection: 'home',
    searchSeen: false,
    etf: {
        companies: [],
        exchanges: [],
        watchlist: [],
        portfolio: {},
        commission: 1.5
    },
    bets: {
        active: [],
        history: [],
        totalWon: 0
    },
    entertainment: {
        cartoons: [],
        music: [],
        movies: []
    },
    education: {
        universities: [],
        colleges: [],
        highschools: [],
        primaryschools: [],
        library: []
    }
};

/* ================================================================
   LOCAL STORAGE
   ================================================================ */
const STORAGE_KEYS = {
    user: 'zbs_user',
    wallet: 'zbs_wallet',
    watchlist: 'zbs_watchlist',
    portfolio: 'zbs_portfolio',
    bets: 'zbs_bets',
    entertainment: 'zbs_entertainment',
    notifications: 'zbs_notifications',
    searchSeen: 'zbs_search_seen'
};

function loadFromStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
}
function saveToStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* ================================================================
   INITIAL DATA SEEDING
   ================================================================ */
function seedETFData() {
    AppState.etf.exchanges = [
        {
            id: 'lusaka',
            name: 'Lusaka Securities Exchange',
            symbol: 'LuSE',
            flag: '🇿🇲',
            currency: 'ZMW',
            companies: [
                { symbol: 'ZANACO', name: 'Zambia National Commercial Bank', price: 4.20, change: 1.8, open: 4.15, high: 4.25, low: 4.10, volume: '125K', marketCap: 'ZMW 1.2B', pe: 6.8, about: 'Leading commercial bank in Zambia offering retail and corporate banking services.' },
                { symbol: 'ZMBF', name: 'Zambia Breweries', price: 12.50, change: -0.5, open: 12.60, high: 12.75, low: 12.40, volume: '48K', marketCap: 'ZMW 3.4B', pe: 14.2, about: 'Largest brewer and distributor of alcoholic and non-alcoholic beverages in Zambia.' },
                { symbol: 'SHOPRITE', name: 'Shoprite Holdings', price: 185.00, change: 0.9, open: 183.50, high: 186.20, low: 182.80, volume: '22K', marketCap: 'ZMW 8.9B', pe: 18.5, about: 'Africa\'s largest food retailer with operations across the continent.' },
                { symbol: 'CFB', name: 'Copperbelt Energy', price: 8.75, change: 2.3, open: 8.55, high: 8.90, low: 8.50, volume: '67K', marketCap: 'ZMW 2.1B', pe: 9.4, about: 'Power transmission and distribution company serving the Copperbelt region.' }
            ]
        },
        {
            id: 'jse',
            name: 'Johannesburg Stock Exchange',
            symbol: 'JSE',
            flag: '🇿🇦',
            currency: 'ZAR',
            companies: [
                { symbol: 'NPN', name: 'Naspers Limited', price: 3250.00, change: 1.2, open: 3210.00, high: 3275.00, low: 3205.00, volume: '340K', marketCap: 'ZAR 1.4T', pe: 22.1, about: 'Global internet group and one of the largest technology investors in the world.' },
                { symbol: 'SOL', name: 'Sasol Limited', price: 185.40, change: -1.8, open: 188.50, high: 189.20, low: 184.10, volume: '1.2M', marketCap: 'ZAR 118B', pe: 8.9, about: 'Integrated energy and chemical company with operations in 30+ countries.' },
                { symbol: 'MTN', name: 'MTN Group', price: 92.75, change: 0.6, open: 92.20, high: 93.40, low: 91.80, volume: '890K', marketCap: 'ZAR 174B', pe: 12.4, about: 'Leading mobile telecommunications operator in Africa and the Middle East.' },
                { symbol: 'SBK', name: 'Standard Bank Group', price: 178.30, change: 1.1, open: 176.50, high: 179.10, low: 176.00, volume: '560K', marketCap: 'ZAR 295B', pe: 9.8, about: 'One of Africa\'s largest financial services groups with global reach.' }
            ]
        },
        {
            id: 'nse',
            name: 'Nairobi Securities Exchange',
            symbol: 'NSE',
            flag: '🇰🇪',
            currency: 'KES',
            companies: [
                { symbol: 'SCOM', name: 'Safaricom PLC', price: 28.50, change: 2.5, open: 27.80, high: 28.90, low: 27.75, volume: '2.4M', marketCap: 'KES 1.1T', pe: 16.8, about: 'Leading telecommunications company in Kenya, pioneer of M-Pesa mobile money.' },
                { symbol: 'EQTY', name: 'Equity Group Holdings', price: 42.75, change: 0.8, open: 42.40, high: 43.20, low: 42.10, volume: '1.1M', marketCap: 'KES 161B', pe: 7.2, about: 'Pan-African financial services group operating in 7 African countries.' },
                { symbol: 'KCB', name: 'KCB Group', price: 35.20, change: -0.4, open: 35.35, high: 35.60, low: 34.90, volume: '780K', marketCap: 'KES 113B', pe: 5.9, about: 'Largest bank in East Africa by asset base with regional presence.' },
                { symbol: 'EABL', name: 'East African Breweries', price: 158.00, change: 1.5, open: 155.75, high: 159.25, low: 155.50, volume: '420K', marketCap: 'KES 125B', pe: 15.3, about: 'Leading branded alcohol beverage business in East Africa.' }
            ]
        },
        {
            id: 'ngx',
            name: 'Nigerian Exchange Group',
            symbol: 'NGX',
            flag: '🇳🇬',
            currency: 'NGN',
            companies: [
                { symbol: 'DANGCEM', name: 'Dangote Cement', price: 485.20, change: 1.7, open: 477.10, high: 488.50, low: 476.80, volume: '3.2M', marketCap: 'NGN 8.3T', pe: 14.6, about: 'Africa\'s largest cement producer with operations in 10 countries.' },
                { symbol: 'MTNN', name: 'MTN Nigeria', price: 225.50, change: -0.9, open: 227.60, high: 228.40, low: 224.10, volume: '1.8M', marketCap: 'NGN 4.6T', pe: 11.2, about: 'Leading mobile telecommunications provider in Nigeria.' },
                { symbol: 'ZENITHBANK', name: 'Zenith Bank', price: 38.75, change: 2.1, open: 37.95, high: 39.10, low: 37.80, volume: '5.6M', marketCap: 'NGN 1.2T', pe: 4.8, about: 'One of Nigeria\'s largest and most profitable commercial banks.' },
                { symbol: 'GTCO', name: 'Guaranty Trust Holding', price: 42.30, change: 1.4, open: 41.70, high: 42.85, low: 41.55, volume: '4.1M', marketCap: 'NGN 1.2T', pe: 5.2, about: 'Leading African financial institution with operations in multiple countries.' }
            ]
        }
    ];
    AppState.etf.companies = AppState.etf.exchanges.flatMap(ex =>
        ex.companies.map(c => ({ ...c, exchange: ex.name, exchangeSymbol: ex.symbol, currency: ex.currency }))
    );
}

function seedBetData() {
    AppState.bets.active = [
        {
            id: 'bet_' + Date.now().toString(36),
            type: 'pvp',
            event: 'Zambia vs Kenya',
            eventIcon: '⚽',
            pick: 'Zambia Win',
            amount: 100,
            status: 'pending',
            createdAt: Date.now() - 3600000
        }
    ];
    AppState.bets.history = [
        {
            id: 'bet_hist_1',
            type: 'company',
            event: 'Arsenal vs Chelsea',
            eventIcon: '⚽',
            pick: 'Arsenal Win',
            amount: 150,
            odds: 2.10,
            payout: 315,
            status: 'won',
            createdAt: Date.now() - 86400000
        }
    ];
    AppState.bets.totalWon = 315;
}

function seedEntertainment() {
    if (AppState.entertainment.cartoons.length === 0) {
        AppState.entertainment.cartoons = [
            { id: 'c1', title: 'Safari Adventures', artist: 'ZBS Studios', type: 'cartoon', source: 'admin', duration: '12:34' },
            { id: 'c2', title: 'Kalulu the Hare', artist: 'African Tales', type: 'cartoon', source: 'admin', duration: '08:20' }
        ];
        AppState.entertainment.music = [
            { id: 'm1', title: 'Zambezi Flow', artist: 'DJ Bwalya', type: 'music', source: 'admin', duration: '03:45' },
            { id: 'm2', title: 'Copperbelt Nights', artist: 'The Mighty Z', type: 'music', source: 'admin', duration: '04:10' }
        ];
        AppState.entertainment.movies = [
            { id: 'mv1', title: 'The Lusaka Heist', artist: 'ZBS Films', type: 'movie', source: 'admin', duration: '1:45:00' }
        ];
    }
}

function seedEducation() {
    if (AppState.education.universities.length === 0) {
        AppState.education.universities = [
            {
                id: 'unza',
                name: 'University of Zambia',
                type: 'University',
                icon: 'fas fa-university',
                location: 'Lusaka, Zambia',
                rating: '4.7',
                programs: '120+',
                established: '1966',
                students: '30,000+',
                description: 'The University of Zambia is the largest and oldest university in Zambia, offering a wide range of undergraduate and postgraduate programs across multiple faculties.',
                highlights: ['Top-ranked in Zambia', 'Research-intensive', 'Diverse student body'],
                programList: [
                    { name: 'Bachelor of Medicine', duration: '5 years' },
                    { name: 'Bachelor of Engineering', duration: '4 years' },
                    { name: 'Bachelor of Laws', duration: '4 years' },
                    { name: 'Bachelor of Education', duration: '4 years' }
                ],
                address: 'Great East Road, Lusaka',
                phone: '+260 211 250 000',
                email: 'info@unza.zm',
                website: 'www.unza.zm',
                fees: [
                    { program: 'Medicine', amount: 'ZMW 45,000/year' },
                    { program: 'Engineering', amount: 'ZMW 32,000/year' },
                    { program: 'Laws', amount: 'ZMW 28,000/year' },
                    { program: 'Education', amount: 'ZMW 18,000/year' }
                ]
            },
            {
                id: 'cbu',
                name: 'Copperbelt University',
                type: 'University',
                icon: 'fas fa-university',
                location: 'Kitwe, Zambia',
                rating: '4.5',
                programs: '80+',
                established: '1987',
                students: '15,000+',
                description: 'The Copperbelt University is a public university located in Kitwe, Zambia, specializing in engineering, business, and applied sciences.',
                highlights: ['Strong engineering focus', 'Industry partnerships', 'Modern facilities'],
                programList: [
                    { name: 'Bachelor of Mining Engineering', duration: '5 years' },
                    { name: 'Bachelor of Business Administration', duration: '4 years' },
                    { name: 'Bachelor of Computer Science', duration: '4 years' }
                ],
                address: 'Jambo Drive, Riverside, Kitwe',
                phone: '+260 212 224 955',
                email: 'info@cbu.ac.zm',
                website: 'www.cbu.ac.zm',
                fees: [
                    { program: 'Mining Engineering', amount: 'ZMW 38,000/year' },
                    { program: 'Business Admin', amount: 'ZMW 22,000/year' },
                    { program: 'Computer Science', amount: 'ZMW 25,000/year' }
                ]
            }
        ];
        AppState.education.colleges = [
            {
                id: 'evelyn',
                name: 'Evelyn Hone College',
                type: 'College',
                icon: 'fas fa-user-graduate',
                location: 'Lusaka, Zambia',
                rating: '4.4',
                programs: '45+',
                established: '1963',
                students: '8,000+',
                description: 'Evelyn Hone College is a leading technical and vocational college in Zambia, offering courses in applied arts, business, and technology.',
                highlights: ['Hands-on training', 'Creative arts programs', 'Industry linkages'],
                programList: [
                    { name: 'Diploma in Journalism', duration: '3 years' },
                    { name: 'Diploma in Graphic Design', duration: '3 years' },
                    { name: 'Diploma in Business Administration', duration: '3 years' }
                ],
                address: 'Church Road, Lusaka',
                phone: '+260 211 227 512',
                email: 'info@evelynhone.edu.zm',
                website: 'www.evelynhone.edu.zm',
                fees: [
                    { program: 'Journalism', amount: 'ZMW 12,000/year' },
                    { program: 'Graphic Design', amount: 'ZMW 14,000/year' },
                    { program: 'Business Admin', amount: 'ZMW 10,000/year' }
                ]
            }
        ];
        AppState.education.highschools = [];
        AppState.education.primaryschools = [];
        AppState.education.library = [
            { id: 'bk1', title: 'Introduction to Zambian History', author: 'Dr. M. Banda', type: 'book', free: true, price: 0 },
            { id: 'bk2', title: 'Mathematics for Grade 12', author: 'P. Mwansa', type: 'book', free: false, price: 85 },
            { id: 'bk3', title: 'Agricultural Science Handbook', author: 'ZBS Publications', type: 'book', free: true, price: 0 }
        ];
    }
}

/* ================================================================
   SIDEBAR
   ================================================================ */
function openSidebar() {
    $('#sidebar')?.classList.add('open');
    $('#sidebarOverlay')?.classList.add('active');
    $('#sidebarToggleBtn')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    $('#sidebar')?.classList.remove('open');
    $('#sidebarOverlay')?.classList.remove('active');
    $('#sidebarToggleBtn')?.classList.remove('active');
    document.body.style.overflow = '';
}

/* ================================================================
   SEARCH
   ================================================================ */
function openSearch() {
    const overlay = $('#searchOverlay');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.removeAttribute('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
    setTimeout(() => $('#searchInput')?.focus(), 100);
    markSearchAsSeen();
}
function closeSearch() {
    const overlay = $('#searchOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.hidden = true;
        overlay.setAttribute('hidden', '');
    }, 200);
}

function markSearchAsSeen() {
    if (AppState.searchSeen) return;
    AppState.searchSeen = true;
    saveToStorage(STORAGE_KEYS.searchSeen, true);
    const badge = $('#footerSearchBadge');
    if (badge) badge.style.display = 'none';
}

function performSearch() {
    const query = $('#searchInput')?.value.trim().toLowerCase();
    const resultsEl = $('#searchResults');
    if (!resultsEl) return;

    if (!query) {
        resultsEl.innerHTML = '<p style="padding:12px;color:#666;font-size:0.85rem;">Type to search services…</p>';
        return;
    }

    const matches = SERVICE_INDEX.filter(s =>
        s.name.toLowerCase().includes(query) || s.cat.includes(query)
    );

    if (!matches.length) {
        resultsEl.innerHTML = '<p style="padding:12px;color:#666;font-size:0.85rem;">No results. Try "loan", "ETF", "education", or "betting".</p>';
        return;
    }

    resultsEl.innerHTML = matches.map((m) => {
        const idx = SERVICE_INDEX.indexOf(m);
        return `<div class="result-item" data-name="${escapeHtml(m.name)}" data-cat="${m.cat}" data-idx="${idx}">
            <span>${m.icon}</span>
            <span>${escapeHtml(m.name)}</span>
            <span style="margin-left:auto;font-size:0.7rem;color:#888;text-transform:capitalize;">${m.cat}</span>
        </div>`;
    }).join('');

    $$('.result-item', resultsEl).forEach(el => {
        el.addEventListener('click', () => {
            const item = SERVICE_INDEX[parseInt(el.dataset.idx)];
            const action = item?.action;
            if (action) {
                closeSearch();
                setTimeout(() => {
                    handleSearchAction(action);
                }, 250);
                return;
            }
            showToast(`🔍 Opening: ${el.dataset.name}`);
            closeSearch();
        });
    });
}

function handleSearchAction(action) {
    switch (action) {
        case 'openEducation':         openEducation(); break;
        case 'openETF':               openETF(); break;
        case 'openLuSETrends':        openETF(); setTimeout(renderLuSETrends, 300); break;
        case 'openBetting':           openBetting(); break;
        case 'openEntertainment':     openEntertainment(); break;
        case 'openShareApplication':  openShareApplication(); break;
        case 'openLoanApplication':   openLoanApplication(); break;
        case 'openPortfolio':         openPortfolio(); break;
        case 'openProHireHub':        openProHireHub(); break;
        case 'openProHireVehicles':   openProHireVehicles(); break;
        case 'openConsultationHub':   openConsultationHub(); break;
        case 'openFinancialHub':      openFinancialHub(); break;
        case 'openMarketHub':         openMarketHub(); break;
        case 'openAgriPermit':        openAgriPermit(); break;
        case 'openConstructionHub':   openConstructionHub(); break;
        case 'openAdvertHub':         openAdvertHub(); break;
        case 'openRentalHub':         openRentalHub(); break;
        default: showToast('🔍 Service: ' + action);
    }
}

/* ================================================================
   AUTHENTICATION
   ================================================================ */
function openLoginModal() {
    const modal = $('#loginModal');
    if (!modal) return;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
    $('#authEmail')?.focus();
}
function closeLoginModal() {
    const modal = $('#loginModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function handleLogin(e) {
    e.preventDefault();
    const email = $('#authEmail')?.value.trim();
    const password = $('#authPassword')?.value;
    const errorEl = $('#authError');
    const successEl = $('#authSuccess');

    if (!email || !password) {
        if (errorEl) {
            errorEl.textContent = 'Please enter email and password.';
            errorEl.hidden = false;
            errorEl.removeAttribute('hidden');
        }
        return;
    }

    if (email === 'demo@zeroth.com' && password === 'demo123') {
        AppState.user = {
            name: 'Demo User',
            email: 'demo@zeroth.com',
            avatar: 'images/default-avatar.png'
        };
        AppState.wallet.balance = 2500;
        saveToStorage(STORAGE_KEYS.user, AppState.user);
        saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);

        if (successEl) {
            successEl.textContent = '✅ Login successful!';
            successEl.hidden = false;
            successEl.removeAttribute('hidden');
        }
        if (errorEl) errorEl.hidden = true;

        setTimeout(() => {
            closeLoginModal();
            updateAuthUI();
            showToast('✅ Welcome back, Demo User!');
        }, 800);
    } else {
        if (errorEl) {
            errorEl.textContent = 'Invalid credentials. Use demo@zeroth.com / demo123';
            errorEl.hidden = false;
            errorEl.removeAttribute('hidden');
        }
    }
}

function logout() {
    AppState.user = null;
    AppState.wallet.balance = 0;
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.wallet);
    updateAuthUI();
    showToast('👋 Logged out successfully');
}

function updateAuthUI() {
    const loggedIn = !!AppState.user;

    const floatLogin = $('#floatingLoginBtn');
    const userWrap = $('#userInfoWrapper');
    const photoWrap = $('#profilePhotoWrapper');
    if (floatLogin) floatLogin.style.display = loggedIn ? 'none' : 'inline-flex';
    if (userWrap) userWrap.style.display = loggedIn ? 'flex' : 'none';
    if (photoWrap) photoWrap.style.display = loggedIn ? 'block' : 'none';

    if (loggedIn) {
        const un = $('#userDisplayName');
        const wb = $('#walletBalance');
        const dn = $('#dropdownUserName');
        const de = $('#dropdownUserEmail');
        const dwb = $('#dropdownWalletBalance');
        if (un) un.textContent = AppState.user.name;
        if (wb) wb.textContent = AppState.wallet.balance.toFixed(2);
        if (dn) dn.textContent = AppState.user.name;
        if (de) de.textContent = AppState.user.email;
        if (dwb) dwb.textContent = `ZMW ${AppState.wallet.balance.toFixed(2)}`;
    }

    const sbUser = $('#sidebarUserProfile');
    const sbGuest = $('#sidebarGuestProfile');
    if (sbUser) sbUser.style.display = loggedIn ? 'flex' : 'none';
    if (sbGuest) sbGuest.style.display = loggedIn ? 'none' : 'flex';

    if (loggedIn) {
        const sn = $('#sidebarUserName');
        const se = $('#sidebarUserEmail');
        const sb = $('#sidebarUserBalance');
        if (sn) sn.textContent = AppState.user.name;
        if (se) se.textContent = AppState.user.email;
        if (sb) sb.textContent = `ZMW ${AppState.wallet.balance.toFixed(2)}`;
    }

    const etfBal = $('#etfWalletBalance');
    if (etfBal) etfBal.textContent = `ZMW ${AppState.wallet.balance.toFixed(2)}`;
    const betBal = $('#betWalletBalance');
    if (betBal) betBal.textContent = `ZMW ${AppState.wallet.balance.toFixed(2)}`;
    const finBal = $('#finWalletBalance');
    if (finBal) finBal.textContent = `ZMW ${AppState.wallet.balance.toFixed(2)}`;
}

/* ================================================================
   PROFILE MENU
   ================================================================ */
function openProfileMenu() {
    const dropdown = $('#profileDropdown');
    if (!dropdown) return;
    dropdown.hidden = false;
    dropdown.removeAttribute('hidden');
}
function closeProfileMenu() {
    const dropdown = $('#profileDropdown');
    if (!dropdown) return;
    dropdown.hidden = true;
    dropdown.setAttribute('hidden', '');
}

/* ================================================================
   FOOTER MENU
   ================================================================ */
function toggleFooterMenu() {
    const content = $('#footerMenuContent');
    const btn = document.querySelector('[data-action="toggleFooterMenu"]');
    if (!content) return;
    const isOpen = !content.hidden;
    if (isOpen) {
        content.hidden = true;
        content.setAttribute('hidden', '');
        btn?.setAttribute('aria-expanded', 'false');
    } else {
        content.hidden = false;
        content.removeAttribute('hidden');
        btn?.setAttribute('aria-expanded', 'true');
    }
}
function closeFooterMenu() {
    const content = $('#footerMenuContent');
    if (!content) return;
    content.hidden = true;
    content.setAttribute('hidden', '');
    document.querySelector('[data-action="toggleFooterMenu"]')?.setAttribute('aria-expanded', 'false');
}

/* ================================================================
   HEADER SERVICES MENU — fallback when header-nav-adverts.js is
   absent or late. The module, if present, will already have its own
   listener; ours no-ops in that case.
   ================================================================ */
function toggleHeaderServicesMenu() {
    const dd = $('#headerServicesDropdown');
    const btn = $('#headerServicesBtn');
    if (!dd || !btn) return;
    const isOpen = !dd.hidden;
    if (isOpen) {
        dd.hidden = true;
        dd.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
    } else {
        dd.hidden = false;
        dd.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
    }
}
function closeHeaderServicesMenu() {
    const dd = $('#headerServicesDropdown');
    const btn = $('#headerServicesBtn');
    if (!dd) return;
    dd.hidden = true;
    dd.setAttribute('hidden', '');
    btn?.setAttribute('aria-expanded', 'false');
}

/* ================================================================
   NOTIFICATIONS
   ================================================================ */
function toggleNotifications() {
    const dropdown = $('#notificationDropdown');
    if (!dropdown) return;
    const isOpen = !dropdown.hidden;
    if (isOpen) {
        dropdown.hidden = true;
        dropdown.setAttribute('hidden', '');
    } else {
        dropdown.hidden = false;
        dropdown.removeAttribute('hidden');
    }
}
function closeNotifications() {
    const dropdown = $('#notificationDropdown');
    if (!dropdown) return;
    dropdown.hidden = true;
    dropdown.setAttribute('hidden', '');
}
function markAllRead() {
    $$('.notification-item').forEach(item => {
        item.classList.remove('unread');
        item.classList.add('read');
    });
    const badge = $('#footerNotifBadge');
    if (badge) badge.textContent = '0';
    const dot = $('#footerNotifDot');
    if (dot) dot.classList.remove('show');
    showToast('✅ All notifications marked as read');
}

/* ================================================================
   CATEGORY CARDS
   ================================================================ */
function toggleCategory(headerEl) {
    const card = headerEl.closest('.category-card');
    if (!card) return;
    const listContainer = card.querySelector('.service-list-container');
    const isExpanded = card.classList.toggle('expanded');
    if (listContainer) {
        if (isExpanded) listContainer.removeAttribute('hidden');
        else listContainer.setAttribute('hidden', '');
    }
}

/* ================================================================
   SHARE APPLICATION FORM — FLOATING MODAL (v3.3.4 → 3.3.6)
   ================================================================ */

let shareAppLastFocused = null;

function isShareApplicationModal(wrapper) {
    if (!wrapper) return false;
    try {
        return getComputedStyle(wrapper).position === 'fixed';
    } catch (_) {
        return false;
    }
}

function openShareApplication() {
    const wrapper = $('#shareApplicationWrapper');
    if (!wrapper) return;

    shareAppLastFocused = document.activeElement;

    wrapper.hidden = false;
    wrapper.removeAttribute('hidden');
    wrapper.classList.add('active');

    if (isShareApplicationModal(wrapper)) {
        document.body.classList.add('share-app-open');
        setTimeout(() => {
            const firstField = wrapper.querySelector(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button'
            );
            if (firstField) firstField.focus();
        }, 120);
    } else {
        setTimeout(() => wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
}

function closeShareApplication() {
    const wrapper = $('#shareApplicationWrapper');
    if (!wrapper) return;

    wrapper.classList.remove('active');
    document.body.classList.remove('share-app-open');

    if (shareAppLastFocused && typeof shareAppLastFocused.focus === 'function') {
        try { shareAppLastFocused.focus(); } catch (_) {}
    }

    if (isShareApplicationModal(wrapper)) {
        setTimeout(() => {
            if (!wrapper.classList.contains('active')) {
                wrapper.hidden = true;
                wrapper.setAttribute('hidden', '');
            }
        }, 320);
    }
}

function handleShareApplication(e) {
    e.preventDefault();
    const form = e.target;
    const statusEl = $('#shareFormStatus');

    const required = ['shareFullName', 'shareNrc', 'shareCountry', 'sharePhone', 'shareEmail', 'shareCompany', 'shareQuantity', 'sharePaymentMethod'];
    for (const id of required) {
        if (!$('#' + id)?.value.trim()) {
            showStatus(statusEl, 'Please fill all required fields.', 'error');
            return;
        }
    }
    if (!$('#shareAgreeTerms')?.checked || !$('#shareDeclare')?.checked) {
        showStatus(statusEl, 'Please accept the terms and declaration.', 'error');
        return;
    }

    showStatus(statusEl, '✅ Application submitted successfully! We will contact you soon.', 'success');
    setTimeout(() => {
        form.reset();
        closeShareApplication();
        showStatus(statusEl, '', '');
    }, 2500);
}

function updateShareAmount() {
    const company = $('#shareCompany')?.value;
    const qty = parseInt($('#shareQuantity')?.value) || 0;
    const prices = {
        'ZBS Limited': 5.00,
        'ZBS Agro Holdings': 3.50,
        'ZBS Financial Partners': 8.00,
        'ZBS Tech Solutions': 6.50,
        'ZBS Energy Resources': 4.00
    };
    const price = prices[company] || 0;
    const amountEl = $('#shareAmount');
    if (amountEl) amountEl.value = price && qty ? `ZMW ${(price * qty).toFixed(2)}` : '';
}

function showStatus(el, msg, type) {
    if (!el) return;
    if (!msg) {
        el.hidden = true;
        el.setAttribute('hidden', '');
        return;
    }
    el.textContent = msg;
    el.className = 'share-status ' + type;
    el.hidden = false;
    el.removeAttribute('hidden');
}

function initShareApplication() {
    const wrapper = $('#shareApplicationWrapper');
    if (!wrapper) return;

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!wrapper.classList.contains('active')) return;
        e.stopPropagation();
        closeShareApplication();
    }, true);

    wrapper.addEventListener('click', (e) => {
        if (!isShareApplicationModal(wrapper)) return;
        if (e.target === wrapper) {
            closeShareApplication();
        }
    });

    wrapper.querySelectorAll('[data-action="closeShareApplication"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeShareApplication();
        }, true);
    });
}

/* ================================================================
   MODULE OPENERS — graceful fallbacks so buttons are never dead
   ================================================================ */

function openFinancialHub() {
    const M = resolveModule('FinancialHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Financial Hub is loading — please try again in a moment.');
}

function openLoanApplication() {
    const M = resolveModule('FinancialHub');
    if (M && typeof M.open === 'function') {
        M.open();
        setTimeout(() => {
            if (typeof M.openLoanApplication === 'function') M.openLoanApplication();
            else document.querySelector('[data-fin-tab="loans"], #finLoanForm')?.scrollIntoView({ behavior: 'smooth' });
        }, 220);
        return;
    }
    openFinancialHub();
}

function openConsultationHub() {
    const M = resolveModule('ConsultationHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Consultation Hub is loading…');
}

function openMarketHub() {
    const M = resolveModule('MarketHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Market Hub is loading…');
}

function openAgriPermit() {
    const M = resolveModule('AgricultureHub');
    if (M && typeof M.openPermit === 'function') { M.openPermit(); return; }
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Agriculture Hub is loading…');
}

function openConstructionHub() {
    const M = resolveModule('ConstructionHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Construction Hub is loading…');
}

function openAdvertHub() {
    if (typeof window.openAdvertHub === 'function' && window.openAdvertHub !== openAdvertHub) {
        window.openAdvertHub();
        return;
    }
    const M = resolveModule('AdvertHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    showToast('⚠️ Advert Hub is loading…');
}

function openRentalHub() {
    const M = resolveModule('RentalHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    if (window.RentalHub?.open) { window.RentalHub.open(); return; }
    showToast('⚠️ Rental Hub is loading…');
}

function openProHireHub() {
    const M = resolveModule('ProHireHub');
    if (M && typeof M.open === 'function') { M.open(); return; }
    const fallback = $('#prohireModal');
    if (fallback) { fallback.hidden = false; return; }
    showToast('⚠️ ProHire Hub is loading…');
}

function openProHireVehicles() {
    const M = resolveModule('ProHireHub');
    if (M && typeof M.openVehicles === 'function') { M.openVehicles(); return; }
    if (M && typeof M.open === 'function') {
        M.open();
        setTimeout(() => {
            document.getElementById('prohireVehiclesSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 260);
        return;
    }
    openProHireHub();
}

/* ================================================================
   ENTERTAINMENT HUB
   ================================================================ */
function openEntertainment() {
    const modal = $('#entertainmentModal');
    if (!modal) return;
    seedEntertainment();
    renderEntertainment();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeEntertainment() {
    const modal = $('#entertainmentModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderEntertainment() {
    const countMap = {
        cartoons: 'countCartoons',
        music: 'countMusic',
        movies: 'countMovies'
    };

    ['cartoons', 'music', 'movies'].forEach(type => {
        const grid = $(`#grid-${type}`);
        const empty = $(`#empty-${type}`);
        const countEl = document.getElementById(countMap[type]);
        if (!grid) return;

        const items = AppState.entertainment[type] || [];
        if (countEl) countEl.textContent = items.length;

        if (items.length === 0) {
            grid.innerHTML = '';
            empty?.classList.add('show');
            return;
        }
        empty?.classList.remove('show');

        const typeIcon = type === 'cartoons' ? 'fa-tv' : type === 'music' ? 'fa-music' : 'fa-film';
        grid.innerHTML = items.map(item => `
            <div class="ent-card" data-id="${item.id}">
                <div class="ent-card-thumb">
                    <i class="fas ${typeIcon} ent-type-icon"></i>
                    <span class="ent-card-source ${item.source}">${item.source}</span>
                    <div class="ent-card-play"><i class="fas fa-play"></i></div>
                </div>
                <div class="ent-card-body">
                    <div class="ent-card-title">${escapeHtml(item.title)}</div>
                    <div class="ent-card-artist">${escapeHtml(item.artist || 'Unknown')}</div>
                    <div class="ent-card-meta">
                        <span>${escapeHtml(item.duration || '—')}</span>
                        <span>${type}</span>
                    </div>
                </div>
            </div>
        `).join('');
    });
}

function openUploadModal(isAdmin = false) {
    const modal = $('#entUploadModal');
    if (!modal) return;
    const adminGroup = $('#adminKeyGroup');
    if (adminGroup) {
        if (isAdmin) adminGroup.removeAttribute('hidden');
        else adminGroup.setAttribute('hidden', '');
    }
    const icon = $('#uploadIcon');
    const title = $('#uploadTitle');
    if (icon) icon.className = isAdmin ? 'fas fa-lock' : 'fas fa-cloud-upload-alt';
    if (title) title.textContent = isAdmin ? 'Admin Upload' : 'Upload Content';
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeUploadModal() {
    const modal = $('#entUploadModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function handleUpload(e) {
    e.preventDefault();
    const statusEl = $('#uploadStatus');
    const type = $('#uploadType')?.value;
    const title = $('#uploadTitleInput')?.value.trim();
    const file = $('#uploadFile')?.files[0];

    if (!statusEl) return;
    if (!title) {
        statusEl.textContent = '❌ Please enter a title.';
        statusEl.className = 'upload-status error';
        statusEl.hidden = false;
        return;
    }
    if (!file) {
        statusEl.textContent = '❌ Please select a file.';
        statusEl.className = 'upload-status error';
        statusEl.hidden = false;
        return;
    }
    if (!$('#uploadRights')?.checked) {
        statusEl.textContent = '❌ You must confirm you have rights to this content.';
        statusEl.className = 'upload-status error';
        statusEl.hidden = false;
        return;
    }

    const progress = $('#uploadProgress');
    const bar = $('#uploadProgressBar');
    const text = $('#uploadProgressText');
    if (progress) progress.removeAttribute('hidden');
    let pct = 0;
    const interval = setInterval(() => {
        pct += 10;
        if (bar) bar.style.width = pct + '%';
        if (text) text.textContent = pct + '%';
        if (pct >= 100) {
            clearInterval(interval);
            const newItem = {
                id: 'ent_' + Date.now().toString(36),
                title,
                artist: $('#uploadArtist')?.value.trim() || 'Unknown',
                description: $('#uploadDescription')?.value.trim() || '',
                type,
                source: 'user',
                duration: '—'
            };
            AppState.entertainment[type].push(newItem);
            saveToStorage(STORAGE_KEYS.entertainment, AppState.entertainment);
            renderEntertainment();
            statusEl.textContent = '✅ Upload successful!';
            statusEl.className = 'upload-status success';
            statusEl.hidden = false;
            setTimeout(() => {
                closeUploadModal();
                $('#uploadForm')?.reset();
                if (progress) progress.setAttribute('hidden', '');
                if (bar) bar.style.width = '0%';
                statusEl.hidden = true;
            }, 1500);
        }
    }, 150);
}

/* ================================================================
   EDUCATION HUB
   ================================================================ */
function openEducation() {
    const modal = $('#educationModal');
    if (!modal) return;
    seedEducation();
    renderEducation();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeEducation() {
    const modal = $('#educationModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderEducation() {
    /* FIX: explicit count-ID map — JS used to build the ID via
       `'count' + Capitalize(type)` which produced `countHighschools`
       and `countPrimaryschools`, but the HTML uses `countHighSchools`
       and `countPrimarySchools`. */
    const countMap = {
        universities:   'countUniversities',
        colleges:       'countColleges',
        highschools:    'countHighSchools',
        primaryschools: 'countPrimarySchools',
        library:        'countLibrary'
    };

    const types = ['universities', 'colleges', 'highschools', 'primaryschools', 'library'];
    types.forEach(type => {
        const grid = $(`#grid-${type}`);
        const empty = $(`#empty-${type}`);
        const countEl = document.getElementById(countMap[type]);
        if (!grid) return;

        const items = AppState.education[type] || [];
        if (countEl) countEl.textContent = items.length;

        if (items.length === 0) {
            grid.innerHTML = '';
            empty?.classList.add('show');
            return;
        }
        empty?.classList.remove('show');

        if (type === 'library') {
            grid.innerHTML = items.map(item => `
                <div class="edu-card" data-id="${item.id}">
                    <div class="edu-card-thumb">
                        <i class="fas fa-book edu-type-icon"></i>
                        <span class="edu-card-type">Book</span>
                        <span class="edu-card-badge ${item.free ? 'free' : 'paid'}">${item.free ? 'FREE' : 'PAID'}</span>
                    </div>
                    <div class="edu-card-body">
                        <div class="edu-card-title">${escapeHtml(item.title)}</div>
                        <div class="edu-card-sub">${escapeHtml(item.author)}</div>
                        <div class="edu-card-meta">
                            <span class="edu-card-price ${item.free ? 'free' : ''}">${item.free ? 'Free' : money(item.price)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = items.map(item => `
                <div class="edu-card" data-id="${item.id}" data-type="${type}">
                    <div class="edu-card-thumb">
                        <i class="${item.icon || 'fas fa-university'} edu-type-icon"></i>
                        <span class="edu-card-type">${item.type}</span>
                    </div>
                    <div class="edu-card-body">
                        <div class="edu-card-title">${escapeHtml(item.name)}</div>
                        <div class="edu-card-sub">${escapeHtml(item.location)}</div>
                        <div class="edu-card-desc">${escapeHtml((item.description || '').slice(0, 80))}...</div>
                        <div class="edu-card-meta">
                            <span>⭐ ${item.rating}</span>
                            <span>${item.programs} programs</span>
                        </div>
                        <div class="edu-card-actions">
                            <button class="edu-card-action-btn apply" data-action="aboutApply" data-id="${item.id}"><i class="fas fa-file-signature"></i> Apply</button>
                            <button class="edu-card-action-btn fees" data-action="aboutFees" data-id="${item.id}"><i class="fas fa-money-bill-wave"></i> Fees</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    });
}

function openAboutInst(instId) {
    const all = [
        ...AppState.education.universities,
        ...AppState.education.colleges,
        ...AppState.education.highschools,
        ...AppState.education.primaryschools
    ];
    const inst = all.find(i => i.id === instId);
    if (!inst) return;

    const modal = $('#aboutInstModal');
    if (!modal) return;

    const set = (id, txt) => { const el = $('#' + id); if (el) el.textContent = txt; };
    const iconEl = $('#aboutInstIcon');
    if (iconEl) iconEl.className = inst.icon || 'fas fa-university';

    set('aboutInstType', inst.type);
    set('aboutInstTitle', inst.name);
    const locEl = $('#aboutInstLocation');
    if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(inst.location)}</span>`;
    set('aboutInstRating', inst.rating || '—');
    set('aboutInstPrograms', inst.programs || '—');
    set('aboutInstEstablished', inst.established || '—');
    set('aboutInstStudents', inst.students || '—');
    set('aboutInstDescription', inst.description || '—');

    const highlightsEl = $('#aboutInstHighlights');
    if (highlightsEl) {
        highlightsEl.innerHTML = (inst.highlights || []).map(h =>
            `<span class="about-inst-highlight"><i class="fas fa-check-circle"></i> ${escapeHtml(h)}</span>`
        ).join('');
    }

    const programsEl = $('#aboutInstProgramList');
    if (programsEl) {
        programsEl.innerHTML = (inst.programList || []).map(p =>
            `<div class="about-inst-program-item"><i class="fas fa-graduation-cap"></i> ${escapeHtml(p.name)}<span class="program-duration">${escapeHtml(p.duration)}</span></div>`
        ).join('');
    }

    set('aboutInstAddress', inst.address || '—');
    set('aboutInstPhone', inst.phone || '—');
    set('aboutInstEmail', inst.email || '—');
    set('aboutInstWebsite', inst.website || '—');

    modal._instId = instId;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeAboutInst() {
    const modal = $('#aboutInstModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function openFeeModal(instId) {
    const all = [
        ...AppState.education.universities,
        ...AppState.education.colleges,
        ...AppState.education.highschools,
        ...AppState.education.primaryschools
    ];
    const inst = all.find(i => i.id === instId);
    if (!inst) return;

    const modal = $('#feeModal');
    if (!modal) return;

    const instEl = $('#feeInstitution');
    if (instEl) instEl.textContent = inst.name;
    const content = $('#feeContent');
    if (content) {
        content.innerHTML = `
            <table class="fee-table">
                <thead><tr><th>Program</th><th>Annual Fee</th></tr></thead>
                <tbody>
                    ${(inst.fees || []).map(f => `
                        <tr>
                            <td><span class="fee-program-icon"><i class="fas fa-book"></i></span> ${escapeHtml(f.program)}</td>
                            <td class="fee-amount"><span class="fee-currency">ZMW</span>${escapeHtml(f.amount.replace('ZMW ', ''))}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    modal._instId = instId;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeFeeModal() {
    const modal = $('#feeModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function openAppForm(instId) {
    const all = [
        ...AppState.education.universities,
        ...AppState.education.colleges,
        ...AppState.education.highschools,
        ...AppState.education.primaryschools
    ];
    const inst = all.find(i => i.id === instId);
    if (!inst) return;

    const modal = $('#appFormModal');
    if (!modal) return;

    const instEl = $('#appFormInstitution');
    if (instEl) instEl.textContent = inst.name;
    modal._instId = instId;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeAppForm() {
    const modal = $('#appFormModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function handleInstitutionApp(e) {
    e.preventDefault();
    const statusEl = $('#appFormStatus');
    if (!statusEl) return;
    const required = ['afSurname', 'afFirstName', 'afDob', 'afSex', 'afNationality', 'afIdNumber', 'afCountry', 'afPhone', 'afEmail', 'afProgram1'];
    for (const id of required) {
        if (!$('#' + id)?.value.trim()) {
            statusEl.textContent = '❌ Please fill all required fields.';
            statusEl.className = 'app-form-status error';
            statusEl.hidden = false;
            return;
        }
    }
    if (!$('#afAttachConfirm')?.checked || !$('#afDeclare')?.checked) {
        statusEl.textContent = '❌ Please confirm attachments and declaration.';
        statusEl.className = 'app-form-status error';
        statusEl.hidden = false;
        return;
    }
    statusEl.textContent = '✅ Application submitted successfully!';
    statusEl.className = 'app-form-status success';
    statusEl.hidden = false;
    setTimeout(() => {
        closeAppForm();
        e.target.reset();
        statusEl.hidden = true;
    }, 2500);
}

function openTutorModal() {
    const modal = $('#tutorModal');
    if (!modal) return;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeTutorModal() {
    const modal = $('#tutorModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}
function handleTutorRequest(e) {
    e.preventDefault();
    const statusEl = $('#tutorStatus');
    if (!statusEl) return;
    const required = ['tutorSubject', 'tutorLevel', 'tutorName', 'tutorContact'];
    for (const id of required) {
        if (!$('#' + id)?.value.trim()) {
            statusEl.textContent = '❌ Please fill all required fields.';
            statusEl.className = 'tutor-status error';
            statusEl.hidden = false;
            return;
        }
    }
    statusEl.textContent = '✅ Tutor request submitted! We will contact you soon.';
    statusEl.className = 'tutor-status success';
    statusEl.hidden = false;
    setTimeout(() => {
        closeTutorModal();
        e.target.reset();
        statusEl.hidden = true;
    }, 2500);
}

/* ================================================================
   ETF TRADING HUB
   ================================================================ */

/* ---------------------------------------------------------------
   LuSE MARKET TRENDS  (v3.3.7)
   ---------------------------------------------------------------
   Renders three SVG charts inside the ETF Trading Hub:
     • LuSE All-Share Index — 7-day rolling trend
     • LuSE All-Share Index — monthly trend
     • USD/ZMW foreign-exchange — monthly trend

   Data is read from window.LUSE_DATA.trends. If absent, a fallback
   dataset (sourced from the LuSE weekly PDF, page 3) is used so the
   charts always render something useful. Call setLuseData(trends)
   from anywhere at runtime to replace the fallback with live data.
   --------------------------------------------------------------- */

/**
 * Ensure the LuSE trends panel exists inside the ETF modal.
 * Creates it (and #etfLuseGrid) on first call if missing.
 */
function ensureLuSEPanel() {
    let panel = document.getElementById('etf-panel-luse');
    if (panel) return panel;

    const host = document.querySelector('#etfModal .etf-content')
              || document.querySelector('#etfModal .etf-panels')
              || document.querySelector('#etfModal .etf-body')
              || document.querySelector('#etfModal');
    if (!host) return null;

    panel = document.createElement('div');
    panel.id = 'etf-panel-luse';
    panel.className = 'etf-panel';
    panel.innerHTML = `
        <div class="etf-section">
            <h3 style="font-size:1rem;margin:0 0 12px;color:#1a202c;">
                <i class="fas fa-chart-line" style="color:#1f7a3d;"></i>
                LuSE Market Trends
            </h3>
            <div id="etfLuseTrends" class="etf-luse-trends"></div>
            <div class="etf-companies-list" id="etfLuseGrid"></div>
        </div>
    `;
    host.appendChild(panel);
    return panel;
}

function buildLuSETrendChart({ title, data, color, prefix = '', suffix = '', height = 200 }) {
    if (!data || data.length < 2) {
        console.warn('[LuSE-Chart] Skipped "' + title + '" — data length ' + (data?.length || 0));
        return '';
    }

    const values = data.map(d => Number(d.value) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const pad    = (maxVal - minVal) * 0.15 || Math.abs(maxVal) * 0.1 || 1;
    const yMin   = minVal - pad;
    const yMax   = maxVal + pad;
    const range  = yMax - yMin || 1;

    const W = 500, H = height;
    const P = { top: 15, right: 15, bottom: 32, left: 54 };
    const iW = W - P.left - P.right;
    const iH = H - P.top - P.bottom;
    const xStep = iW / (data.length - 1);

    const points = data.map((d, i) => ({
        x: P.left + i * xStep,
        y: P.top + iH - ((Number(d.value) - yMin) / range) * iH,
        date: d.date
    }));

    const linePath = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
    ).join(' ');

    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(P.top + iH).toFixed(1)} L${points[0].x.toFixed(1)},${(P.top + iH).toFixed(1)} Z`;

    const yTicks = 4;
    const yLabels = [];
    for (let i = 0; i <= yTicks; i++) {
        const v = yMin + (range * i) / yTicks;
        const y = P.top + iH - (iH * i) / yTicks;
        const dec = Math.abs(v) >= 100 ? 0 : 2;
        yLabels.push({ y, label: `${prefix}${v.toFixed(dec)}${suffix}` });
    }

    const step = Math.max(1, Math.ceil(data.length / 6));
    const xLabels = points.filter((_, i) =>
        i === 0 || i === points.length - 1 || i % step === 0
    );

    const gradId = 'luseGrad-' + Math.random().toString(36).slice(2, 9);

    return `
        <div class="etf-luse-chart"
             style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:12px 14px 8px;box-sizing:border-box;width:100%;display:block;margin:0;">
            <div class="etf-luse-chart-title"
                 style="font-size:.78rem;font-weight:800;color:#1a202c;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.06);display:block;">
                ${title}
            </div>
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"
                 class="etf-luse-chart-svg" role="img"
                 style="width:100%;height:auto;display:block;min-height:${height}px;max-width:100%;overflow:visible;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.28" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
                    </linearGradient>
                </defs>
                ${yLabels.map(l => `
                    <line x1="${P.left}" y1="${l.y.toFixed(1)}" x2="${W - P.right}" y2="${l.y.toFixed(1)}"
                        stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3" />
                    <text x="${P.left - 6}" y="${(l.y + 3).toFixed(1)}"
                        text-anchor="end" font-size="9.5" fill="#6b7280">${escapeHtml(l.label)}</text>
                `).join('')}
                <path d="${areaPath}" fill="url(#${gradId})" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.2"
                    stroke-linejoin="round" stroke-linecap="round" />
                ${points.map((p, i) => `
                    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}"
                        r="${i === points.length - 1 ? 4 : 2.5}"
                        fill="${color}" stroke="#fff" stroke-width="1.5" />
                `).join('')}
                ${xLabels.map(l => `
                    <text x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="middle"
                        font-size="9.5" fill="#6b7280">${escapeHtml(l.date)}</text>
                `).join('')}
            </svg>
        </div>`;
}

function renderLuSETrends() {
    if (document.querySelectorAll('#etfLuseTrends .etf-luse-chart').length === 3) {
        return;
    }

    const D = window.LUSE_DATA || {};

    const FALLBACK = {
        lasi7Day: [
            { date: "6 Oct",  value: 25670    }, { date: "7 Oct",  value: 25480    },
            { date: "8 Oct",  value: 25700    }, { date: "9 Oct",  value: 25655    },
            { date: "10 Oct", value: 25620    }, { date: "11 Oct", value: 25600    },
            { date: "12 Oct", value: 25550    }, { date: "13 Oct", value: 25500    },
            { date: "14 Oct", value: 25455.54 }
        ],
        lasiMonthly: [
            { date: "Sep 25", value: 25200 }, { date: "Oct 25", value: 25300 },
            { date: "Nov 25", value: 24800 }, { date: "Dec 25", value: 25600 },
            { date: "Jan 26", value: 26200 }, { date: "Feb 26", value: 26800 },
            { date: "Mar 26", value: 27200 }, { date: "Apr 26", value: 26800 },
            { date: "May 26", value: 25500 }, { date: "Jun 26", value: 25600 },
            { date: "Jul 26", value: 25800 }, { date: "Aug 26", value: 26300 },
            { date: "Sep 26", value: 25800 }
        ],
        fxUsdMonthly: [
            { date: "Sep 25", value: 27.00 }, { date: "Oct 25", value: 24.00 },
            { date: "Nov 25", value: 26.00 }, { date: "Dec 25", value: 25.00 },
            { date: "Jan 26", value: 20.00 }, { date: "Feb 26", value: 20.00 },
            { date: "Mar 26", value: 20.00 }, { date: "Apr 26", value: 19.00 },
            { date: "May 26", value: 19.00 }, { date: "Jun 26", value: 18.00 },
            { date: "Jul 26", value: 18.00 }, { date: "Aug 26", value: 19.00 },
            { date: "Sep 26", value: 20.05 }
        ]
    };

    const T = (D.trends && D.trends.lasi7Day && D.trends.lasi7Day.length > 0) ? D.trends : FALLBACK;

    const panel = ensureLuSEPanel();
    if (!panel) {
        console.error('[LuSE-Trends] Cannot ensure #etf-panel-luse — is the ETF modal in the DOM?');
        return;
    }

    let grid = document.getElementById('etfLuseGrid');
    if (!grid) {
        grid = document.createElement('div');
        grid.className = 'etf-companies-list';
        grid.id = 'etfLuseGrid';
        panel.appendChild(grid);
    }

    let trendsEl = document.getElementById('etfLuseTrends');
    if (!trendsEl) {
        trendsEl = document.createElement('div');
        trendsEl.id = 'etfLuseTrends';
        trendsEl.className = 'etf-luse-trends';
        grid.parentNode.insertBefore(trendsEl, grid);
    }

    // Force styling inline — ensures the container can never be
    // hidden by a stray CSS rule (regression-proof).
    trendsEl.setAttribute('style',
        'display:grid !important;' +
        'grid-template-columns:repeat(auto-fit,minmax(280px,1fr));' +
        'gap:14px;margin-bottom:16px;width:100%;' +
        'visibility:visible !important;opacity:1 !important;' +
        'height:auto !important;min-height:220px;'
    );

    const charts = [
        buildLuSETrendChart({ title: 'LuSE All Share Index — 7 Day Rolling Trend', data: T.lasi7Day      || [], color: '#1f7a3d' }),
        buildLuSETrendChart({ title: 'LuSE All Share Index — Monthly Trend',       data: T.lasiMonthly   || [], color: '#2b6cb0' }),
        buildLuSETrendChart({ title: 'Foreign Exchange (USD) — Monthly Trend',     data: T.fxUsdMonthly  || [], color: '#d97706', prefix: 'ZMW ' })
    ].filter(Boolean);

    if (!charts.length) {
        console.error('[LuSE-Trends] All chart data empty — cannot render');
        return;
    }

    trendsEl.innerHTML = charts.join('');
    console.log(`[LuSE-Trends] ✔ Rendered ${charts.length} charts`);
}

/**
 * Runtime data injector. Feed live LuSE data without reloading.
 *
 * Example:
 *   setLuseData({
 *       lasi7Day:     [{ date: '1 Nov', value: 26100 }, ...],
 *       lasiMonthly:  [{ date: 'Jan 26', value: 26800 }, ...],
 *       fxUsdMonthly: [{ date: 'Jan 26', value: 19.40 }, ...]
 *   });
 */
function setLuseData(trends) {
    window.LUSE_DATA = window.LUSE_DATA || {};
    window.LUSE_DATA.trends = trends;
    const t = document.getElementById('etfLuseTrends');
    if (t) {
        // Clear cached chart divs so renderLuSETrends() rebuilds them.
        t.innerHTML = '';
        renderLuSETrends();
    }
}

function openETF() {
    const modal = $('#etfModal');
    if (!modal) return;
    seedETFData();
    AppState.etf.watchlist = loadFromStorage(STORAGE_KEYS.watchlist, []);
    AppState.etf.portfolio = loadFromStorage(STORAGE_KEYS.portfolio, {});
    renderETFExchanges();
    renderETFWatchlist();
    renderETFPortfolio();
    updateETFStats();
    renderLuSETrends();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeETF() {
    const modal = $('#etfModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderETFExchanges(filter = '') {
    const container = $('#etfExchangesList');
    if (!container) return;

    const q = filter.toLowerCase();
    const exchanges = AppState.etf.exchanges.map(ex => ({
        ...ex,
        companies: ex.companies.filter(c =>
            !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        )
    })).filter(ex => ex.companies.length > 0);

    if (exchanges.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">No companies match your search.</p>';
        return;
    }

    container.innerHTML = exchanges.map((ex, idx) => `
        <div class="etf-exchange-card ${idx === 0 ? 'expanded' : ''}" data-exchange="${ex.id}">
            <div class="etf-exchange-header">
                <div class="etf-exchange-info">
                    <span class="etf-exchange-flag">${ex.flag}</span>
                    <div class="etf-exchange-text">
                        <span class="etf-exchange-name">${escapeHtml(ex.name)}</span>
                        <div class="etf-exchange-meta">
                            <span class="etf-exchange-symbol">${ex.symbol}</span>
                            <span>${ex.currency}</span>
                        </div>
                    </div>
                </div>
                <div class="etf-exchange-toggle">
                    <span class="etf-exchange-count">${ex.companies.length} companies</span>
                    <i class="fas fa-chevron-down etf-exchange-chevron"></i>
                </div>
            </div>
            <div class="etf-exchange-companies">
                <div class="etf-companies-grid">
                    ${ex.companies.map(c => renderCompanyCard(c, ex)).join('')}
                </div>
            </div>
        </div>
    `).join('');

    $$('.etf-exchange-header', container).forEach(header => {
        header.addEventListener('click', () => {
            header.closest('.etf-exchange-card')?.classList.toggle('expanded');
        });
    });

    bindCompanyCardEvents(container);
}

function renderCompanyCard(c, ex) {
    const inWatchlist = AppState.etf.watchlist.includes(c.symbol);
    const changeClass = c.change > 0 ? 'positive' : c.change < 0 ? 'negative' : 'neutral';
    const changeStr = (c.change > 0 ? '+' : '') + c.change.toFixed(2) + '%';
    return `
        <div class="etf-company-card" data-symbol="${c.symbol}" data-exchange="${ex.id}">
            <div class="etf-company-top">
                <div class="etf-company-logo">${c.symbol.slice(0, 2)}</div>
                <div class="etf-company-info">
                    <span class="etf-company-symbol">${c.symbol}</span>
                    <span class="etf-company-name">${escapeHtml(c.name)}</span>
                </div>
                <button class="etf-watch-btn ${inWatchlist ? 'active' : ''}" data-action="toggleWatch" data-symbol="${c.symbol}" aria-label="Toggle watchlist">
                    <i class="fas fa-star"></i>
                </button>
            </div>
            <div class="etf-company-price-row">
                <span class="etf-company-price"><span class="etf-company-price-currency">${ex.currency}</span>${c.price.toFixed(2)}</span>
                <span class="etf-company-change ${changeClass}">${changeStr}</span>
            </div>
            <div class="etf-company-actions">
                <button class="etf-company-btn buy" data-action="openETFDetail" data-symbol="${c.symbol}"><i class="fas fa-arrow-up"></i> Trade</button>
            </div>
        </div>
    `;
}

function bindCompanyCardEvents(container) {
    $$('.etf-company-card', container).forEach(card => {
        card.addEventListener('click', (e) => {
            /* FIX: prevent double-fire — the global dispatcher would
               also catch [data-action="openETFDetail"] and call us
               again. Stop propagation once the card handled the click. */
            if (e.target.closest('[data-action="toggleWatch"]')) return;
            e.stopPropagation();
            const symbol = card.dataset.symbol;
            openETFDetail(symbol);
        });
    });
    $$('[data-action="toggleWatch"]', container).forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWatch(btn.dataset.symbol);
        });
    });
}

function toggleWatch(symbol) {
    const list = AppState.etf.watchlist;
    const idx = list.indexOf(symbol);
    if (idx >= 0) {
        list.splice(idx, 1);
        showToast(`☆ Removed ${symbol} from watchlist`);
    } else {
        list.push(symbol);
        showToast(`⭐ Added ${symbol} to watchlist`);
    }
    saveToStorage(STORAGE_KEYS.watchlist, list);
    renderETFExchanges($('#etfSearchInput')?.value || '');
    renderETFWatchlist();
    updateETFStats();
}

function renderETFWatchlist() {
    const grid = $('#etfWatchlistGrid');
    const empty = $('#etfWatchlistEmpty');
    const count = $('#etfWatchlistCount');
    if (!grid) return;

    const list = AppState.etf.watchlist;
    if (count) count.textContent = list.length;

    if (list.length === 0) {
        grid.innerHTML = '';
        empty?.classList.add('show');
        return;
    }
    empty?.classList.remove('show');

    const companies = AppState.etf.companies.filter(c => list.includes(c.symbol));
    grid.innerHTML = companies.map(c => {
        const ex = AppState.etf.exchanges.find(e => e.symbol === c.exchangeSymbol);
        return renderCompanyCard(c, ex);
    }).join('');
    bindCompanyCardEvents(grid);
}

function renderETFPortfolio() {
    const grid = $('#etfPortfolioGrid');
    const empty = $('#etfPortfolioEmpty');
    const summary = $('#etfPortfolioSummary');
    const count = $('#etfPortfolioCount');
    if (!grid) return;

    const holdings = Object.entries(AppState.etf.portfolio);
    if (count) count.textContent = holdings.length;

    if (holdings.length === 0) {
        grid.innerHTML = '';
        if (summary) summary.innerHTML = '';
        empty?.classList.add('show');
        return;
    }
    empty?.classList.remove('show');

    let totalValue = 0;
    let totalCost = 0;
    const rows = holdings.map(([symbol, h]) => {
        const company = AppState.etf.companies.find(c => c.symbol === symbol);
        if (!company) return '';
        const value = company.price * h.qty;
        totalValue += value;
        totalCost += h.avgPrice * h.qty;
        return `
            <div class="etf-holding-row">
                <div class="etf-holding-left">
                    <div class="etf-holding-logo">${symbol.slice(0, 2)}</div>
                    <div class="etf-holding-info">
                        <span class="etf-holding-symbol">${symbol}</span>
                        <span class="etf-holding-name">${escapeHtml(company.name)}</span>
                    </div>
                </div>
                <div class="etf-holding-right">
                    <div class="etf-holding-qty">
                        <span class="etf-holding-qty-label">Qty</span>
                        <span class="etf-holding-qty-value">${h.qty}</span>
                    </div>
                    <span class="etf-holding-value">${money(value)}</span>
                    <button class="etf-holding-sell-btn" data-action="sellHolding" data-symbol="${symbol}">
                        <i class="fas fa-arrow-down"></i> Sell
                    </button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = rows;

    if (summary) {
        const pnl = totalValue - totalCost;
        summary.innerHTML = `
            <div class="etf-portfolio-stats">
                <div class="etf-portfolio-stat">
                    <span class="etf-portfolio-stat-label">Total Value</span>
                    <span class="etf-portfolio-stat-value">${money(totalValue)}</span>
                </div>
                <div class="etf-portfolio-stat">
                    <span class="etf-portfolio-stat-label">Total Cost</span>
                    <span class="etf-portfolio-stat-value">${money(totalCost)}</span>
                </div>
                <div class="etf-portfolio-stat">
                    <span class="etf-portfolio-stat-label">P&L</span>
                    <span class="etf-portfolio-stat-value" style="color:${pnl >= 0 ? '#16a34a' : '#dc2626'}">${pnl >= 0 ? '+' : ''}${money(pnl)}</span>
                </div>
            </div>
        `;
    }

    $$('[data-action="sellHolding"]', grid).forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openETFDetail(btn.dataset.symbol, 'sell');
        });
    });
}

function updateETFStats() {
    const portfolioValue = Object.entries(AppState.etf.portfolio).reduce((sum, [symbol, h]) => {
        const c = AppState.etf.companies.find(x => x.symbol === symbol);
        return sum + (c ? c.price * h.qty : 0);
    }, 0);
    const el = $('#etfPortfolioValue');
    if (el) el.textContent = money(portfolioValue);
    const countEl = $('#etfHoldingsCount');
    if (countEl) countEl.textContent = Object.keys(AppState.etf.portfolio).length;
}

let currentETFDetail = { symbol: null, mode: 'buy' };
function openETFDetail(symbol, mode = 'buy') {
    const company = AppState.etf.companies.find(c => c.symbol === symbol);
    if (!company) return;

    const modal = $('#etfDetailModal');
    if (!modal) return;

    currentETFDetail = { symbol, mode };

    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('etfDetailSymbol', company.symbol);
    set('etfDetailTitle', company.name);
    set('etfDetailPrice', company.price.toFixed(2));
    set('etfDetailCurrency', company.currency);
    const changeEl = $('#etfDetailChange');
    if (changeEl) {
        const changeClass = company.change > 0 ? 'positive' : company.change < 0 ? 'negative' : 'neutral';
        changeEl.className = 'etf-price-change ' + changeClass;
        changeEl.textContent = (company.change > 0 ? '+' : '') + company.change.toFixed(2) + '%';
    }
    set('etfDetailExchange', company.exchange);
    set('etfDetailOpen', company.open.toFixed(2));
    set('etfDetailHigh', company.high.toFixed(2));
    set('etfDetailLow', company.low.toFixed(2));
    set('etfDetailVolume', company.volume);
    set('etfDetailMarketCap', company.marketCap);
    set('etfDetailPE', company.pe);
    set('etfDetailAbout', company.about);

    const qty = $('#etfShareQty');
    if (qty) qty.value = '';
    updateTradeSummary();

    $$('.etf-trade-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tradeMode === mode);
    });
    updateTradeButton(mode);

    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}

function updateTradeButton(mode) {
    const btn = $('#etfTradeSubmitBtn');
    const totalLabel = $('#etfTradeTotalLabel');
    if (!btn) return;
    if (mode === 'buy') {
        btn.className = 'etf-trade-submit-btn';
        btn.innerHTML = '<i class="fas fa-check"></i> Confirm Buy';
        if (totalLabel) totalLabel.textContent = 'Total Cost';
    } else {
        btn.className = 'etf-trade-submit-btn sell-mode';
        btn.innerHTML = '<i class="fas fa-check"></i> Confirm Sell';
        if (totalLabel) totalLabel.textContent = 'Total Proceeds';
    }
}

function closeETFDetail() {
    const modal = $('#etfDetailModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function updateTradeSummary() {
    const symbol = currentETFDetail.symbol;
    const mode = currentETFDetail.mode;
    const company = AppState.etf.companies.find(c => c.symbol === symbol);
    if (!company) return;

    const qty = parseInt($('#etfShareQty')?.value) || 0;
    const subtotal = company.price * qty;
    const commission = subtotal * (AppState.etf.commission / 100);
    const total = mode === 'buy' ? subtotal + commission : subtotal - commission;

    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('etfTradePrice', `${company.currency} ${company.price.toFixed(2)}`);
    set('etfTradeQty', `${qty} shares`);
    set('etfTradeSubtotal', money(subtotal));
    set('etfTradeCommission', money(commission));
    set('etfTradeTotal', money(total));
}

function handleTradeSubmit(e) {
    e.preventDefault();
    const symbol = currentETFDetail.symbol;
    const mode = currentETFDetail.mode;
    const qty = parseInt($('#etfShareQty')?.value) || 0;
    const statusEl = $('#etfTradeStatus');
    if (!statusEl) return;

    if (qty <= 0) {
        statusEl.textContent = '❌ Please enter a valid quantity.';
        statusEl.className = 'etf-trade-status error';
        statusEl.hidden = false;
        return;
    }

    const company = AppState.etf.companies.find(c => c.symbol === symbol);
    const subtotal = company.price * qty;
    const commission = subtotal * (AppState.etf.commission / 100);
    const total = mode === 'buy' ? subtotal + commission : subtotal - commission;

    if (mode === 'buy') {
        if (AppState.wallet.balance < total) {
            statusEl.textContent = `❌ Insufficient balance. You need ${money(total)} but have ${money(AppState.wallet.balance)}.`;
            statusEl.className = 'etf-trade-status error';
            statusEl.hidden = false;
            return;
        }
        AppState.wallet.balance -= total;
        const holding = AppState.etf.portfolio[symbol] || { qty: 0, avgPrice: 0 };
        const newQty = holding.qty + qty;
        const newAvg = ((holding.avgPrice * holding.qty) + subtotal) / newQty;
        AppState.etf.portfolio[symbol] = { qty: newQty, avgPrice: newAvg };
        statusEl.textContent = `✅ Bought ${qty} shares of ${symbol} for ${money(total)}.`;
        statusEl.className = 'etf-trade-status success';
    } else {
        const holding = AppState.etf.portfolio[symbol];
        if (!holding || holding.qty < qty) {
            statusEl.textContent = `❌ You only own ${holding?.qty || 0} shares.`;
            statusEl.className = 'etf-trade-status error';
            statusEl.hidden = false;
            return;
        }
        AppState.wallet.balance += total;
        holding.qty -= qty;
        if (holding.qty <= 0) delete AppState.etf.portfolio[symbol];
        else AppState.etf.portfolio[symbol] = holding;
        statusEl.textContent = `✅ Sold ${qty} shares of ${symbol} for ${money(total)}.`;
        statusEl.className = 'etf-trade-status success';
    }

    statusEl.hidden = false;
    saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
    saveToStorage(STORAGE_KEYS.portfolio, AppState.etf.portfolio);
    updateAuthUI();
    updateETFStats();
    renderETFPortfolio();

    setTimeout(() => {
        closeETFDetail();
        statusEl.hidden = true;
    }, 1800);
}

function openPortfolio() {
    const modal = $('#etfPortfolioModal');
    if (!modal) return;
    renderPortfolioModal();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closePortfolio() {
    const modal = $('#etfPortfolioModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderPortfolioModal() {
    const statsEl = $('#etfPortfolioStats');
    const holdingsEl = $('#etfPortfolioHoldings');
    const empty = $('#etfPortfolioModalEmpty');
    if (!holdingsEl) return;

    const holdings = Object.entries(AppState.etf.portfolio);
    if (holdings.length === 0) {
        holdingsEl.innerHTML = '';
        if (statsEl) statsEl.innerHTML = '';
        empty?.classList.add('show');
        return;
    }
    empty?.classList.remove('show');

    let totalValue = 0;
    let totalCost = 0;
    const rows = holdings.map(([symbol, h]) => {
        const c = AppState.etf.companies.find(x => x.symbol === symbol);
        if (!c) return '';
        const value = c.price * h.qty;
        totalValue += value;
        totalCost += h.avgPrice * h.qty;
        return `
            <div class="etf-holding-row">
                <div class="etf-holding-left">
                    <div class="etf-holding-logo">${symbol.slice(0, 2)}</div>
                    <div class="etf-holding-info">
                        <span class="etf-holding-symbol">${symbol}</span>
                        <span class="etf-holding-name">${escapeHtml(c.name)}</span>
                    </div>
                </div>
                <div class="etf-holding-right">
                    <div class="etf-holding-qty">
                        <span class="etf-holding-qty-label">Qty</span>
                        <span class="etf-holding-qty-value">${h.qty}</span>
                    </div>
                    <span class="etf-holding-value">${money(value)}</span>
                </div>
            </div>
        `;
    }).join('');
    holdingsEl.innerHTML = rows;

    const pnl = totalValue - totalCost;
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="etf-portfolio-stat">
                <span class="etf-portfolio-stat-label">Total Value</span>
                <span class="etf-portfolio-stat-value">${money(totalValue)}</span>
            </div>
            <div class="etf-portfolio-stat">
                <span class="etf-portfolio-stat-label">Total Cost</span>
                <span class="etf-portfolio-stat-value">${money(totalCost)}</span>
            </div>
            <div class="etf-portfolio-stat">
                <span class="etf-portfolio-stat-label">P&L</span>
                <span class="etf-portfolio-stat-value" style="color:${pnl >= 0 ? '#16a34a' : '#dc2626'}">${pnl >= 0 ? '+' : ''}${money(pnl)}</span>
            </div>
        `;
    }
}

/* ================================================================
   BET & GAMING HUB
   ================================================================ */
function openBetting() {
    const modal = $('#betModal');
    if (!modal) return;
    seedBetData();
    renderBetEvents();
    renderBetGames();
    renderMyBets();
    updateBetStats();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeBet() {
    const modal = $('#betModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderBetEvents() {
    const pvpList = $('#betPvpEventsList');
    const companyList = $('#betCompanyEventsList');
    const pvpCount = $('#betPvpCount');
    if (!pvpList || !companyList) return;

    const events = [
        { id: 'evt1', icon: '⚽', name: 'Zambia vs Kenya', league: 'Africa Cup', date: 'Today 18:00', players: 12, amount: 100 },
        { id: 'evt2', icon: '⚽', name: 'Arsenal vs Chelsea', league: 'Premier League', date: 'Today 20:00', players: 34, amount: 250 },
        { id: 'evt3', icon: '🏀', name: 'Lakers vs Celtics', league: 'NBA', date: 'Tomorrow 02:00', players: 8, amount: 500 },
        { id: 'evt4', icon: '🎾', name: 'Djokovic vs Alcaraz', league: 'Wimbledon', date: 'Tomorrow 15:00', players: 5, amount: 200 }
    ];

    if (pvpCount) pvpCount.textContent = events.length;

    const renderEvent = (e, type) => `
        <div class="bet-event-row" data-action="open${type === 'pvp' ? 'BetPlace' : 'BetCompany'}" data-event-id="${e.id}">
            <div class="bet-event-left">
                <div class="bet-event-icon-wrap">${e.icon}</div>
                <div class="bet-event-info">
                    <span class="bet-event-name">${e.name}</span>
                    <div class="bet-event-meta">
                        <span class="bet-meta-badge">${e.league}</span>
                        <span><i class="fas fa-clock"></i> ${e.date}</span>
                    </div>
                </div>
            </div>
            <div class="bet-event-right">
                <div class="bet-event-players">
                    <span class="bet-event-players-label">${type === 'pvp' ? 'Players' : 'Odds'}</span>
                    <span class="bet-event-players-value">${type === 'pvp' ? e.players + ' waiting' : '1.85'}</span>
                </div>
                <button class="bet-event-cta-btn ${type}">
                    <i class="fas fa-${type === 'pvp' ? 'handshake' : 'building'}"></i>
                    ${type === 'pvp' ? 'Join' : 'Bet'}
                </button>
            </div>
        </div>
    `;

    pvpList.innerHTML = events.map(e => renderEvent(e, 'pvp')).join('');
    companyList.innerHTML = events.map(e => renderEvent(e, 'company')).join('');

    $$('[data-action="openBetPlace"]').forEach(el => {
        el.addEventListener('click', () => openBetPlace(el.dataset.eventId));
    });
    $$('[data-action="openBetCompany"]').forEach(el => {
        el.addEventListener('click', () => openBetCompany(el.dataset.eventId));
    });
}

function renderBetGames() {
    const grid = $('#betGamesGrid');
    if (!grid) return;
    const games = [
        { id: 'g1', icon: '♟️', name: 'Chess', desc: 'Classic strategy game', players: '1,234' },
        { id: 'g2', icon: '🎯', name: 'Darts', desc: 'Aim and throw', players: '856' },
        { id: 'g3', icon: '🃏', name: 'Cards', desc: 'Poker & more', players: '2,103' },
        { id: 'g4', icon: '🎲', name: 'Dice', desc: 'Roll to win', players: '3,421' },
        { id: 'g5', icon: '⚽', name: 'Penalty Shootout', desc: 'Score the winner', players: '1,876' },
        { id: 'g6', icon: '🏓', name: 'Ping Pong', desc: 'Fast-paced fun', players: '987' }
    ];
    grid.innerHTML = games.map(g => `
        <div class="bet-game-card" data-action="openBetGame" data-game-id="${g.id}">
            <div class="bet-game-card-icon">${g.icon}</div>
            <div class="bet-game-card-name">${g.name}</div>
            <div class="bet-game-card-desc">${g.desc}</div>
            <div class="bet-game-card-players"><i class="fas fa-users"></i> ${g.players} playing</div>
            <button class="bet-game-card-btn">Play Now</button>
        </div>
    `).join('');

    $$('[data-action="openBetGame"]', grid).forEach(el => {
        el.addEventListener('click', () => openBetGame(el.dataset.gameId));
    });
}

function renderMyBets() {
    const list = $('#betMyBetsList');
    const empty = $('#betMyBetsEmpty');
    const count = $('#betMyBetsCount');
    if (!list) return;

    const active = AppState.bets.active;
    if (count) count.textContent = active.length;

    if (active.length === 0) {
        list.innerHTML = '';
        empty?.classList.add('show');
        return;
    }
    empty?.classList.remove('show');

    list.innerHTML = active.map(b => `
        <div class="bet-event-row" style="cursor:default;">
            <div class="bet-event-left">
                <div class="bet-event-icon-wrap">${b.eventIcon}</div>
                <div class="bet-event-info">
                    <span class="bet-event-name">${escapeHtml(b.event)}</span>
                    <div class="bet-event-meta">
                        <span class="bet-meta-badge">${b.type === 'pvp' ? 'VS Peer' : 'VS Company'}</span>
                        <span>Pick: ${escapeHtml(b.pick)}</span>
                    </div>
                </div>
            </div>
            <div class="bet-event-right">
                <div class="bet-event-players">
                    <span class="bet-event-players-label">Stake</span>
                    <span class="bet-event-players-value">${money(b.amount)}</span>
                </div>
                <span class="market-order-status pending">${b.status}</span>
            </div>
        </div>
    `).join('');
}

function updateBetStats() {
    const activeEl = $('#betActiveCount');
    const wonEl = $('#betTotalWon');
    if (activeEl) activeEl.textContent = AppState.bets.active.length;
    if (wonEl) wonEl.textContent = money(AppState.bets.totalWon);
}

let currentBetEvent = null;
function openBetPlace(eventId) {
    const modal = $('#betPlaceModal');
    if (!modal) return;
    const events = {
        evt1: { icon: '⚽', name: 'Zambia vs Kenya', league: 'Africa Cup', date: 'Today 18:00' },
        evt2: { icon: '⚽', name: 'Arsenal vs Chelsea', league: 'Premier League', date: 'Today 20:00' },
        evt3: { icon: '🏀', name: 'Lakers vs Celtics', league: 'NBA', date: 'Tomorrow 02:00' },
        evt4: { icon: '🎾', name: 'Djokovic vs Alcaraz', league: 'Wimbledon', date: 'Tomorrow 15:00' }
    };
    const evt = events[eventId] || events.evt1;
    currentBetEvent = { id: eventId, ...evt };

    const iconEl = $('#betPlaceEventIcon'); if (iconEl) iconEl.textContent = evt.icon;
    const nameEl = $('#betPlaceEventName'); if (nameEl) nameEl.textContent = evt.name;
    const metaEl = $('#betPlaceEventMeta'); if (metaEl) metaEl.textContent = `${evt.league} · ${evt.date}`;

    const picksEl = $('#betPlacePicks');
    const picks = ['Home Win', 'Draw', 'Away Win'];
    if (picksEl) {
        picksEl.innerHTML = picks.map((p, i) => `
            <button type="button" class="bet-pick-btn" data-pick="${p}">
                <span class="bet-pick-name">${p}</span>
                <span class="bet-pick-info">${i === 0 ? '1.85' : i === 1 ? '3.20' : '2.40'}</span>
            </button>
        `).join('');

        $$('.bet-pick-btn', picksEl).forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.bet-pick-btn', picksEl).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeBetPlace() {
    const modal = $('#betPlaceModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
        $('#betMatchmakingSection')?.setAttribute('hidden', '');
        $('#betPlaceStatus')?.setAttribute('hidden', '');
    }, 200);
}

function confirmBetPlace() {
    const pick = $('.bet-pick-btn.selected')?.dataset.pick;
    const amount = parseInt($('#betPlaceAmount')?.value) || 0;
    const statusEl = $('#betPlaceStatus');
    if (!statusEl) return;

    if (!pick) {
        statusEl.textContent = '❌ Please choose a pick.';
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    if (amount < 10) {
        statusEl.textContent = '❌ Minimum bet is ZMW 10.';
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    if (AppState.wallet.balance < amount) {
        statusEl.textContent = `❌ Insufficient balance. You have ${money(AppState.wallet.balance)}.`;
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }

    const matchSec = $('#betMatchmakingSection');
    if (matchSec) matchSec.removeAttribute('hidden');
    const matchText = $('#betMatchmakingText');
    const matchTime = $('#betMatchmakingTime');
    let sec = 0;
    const interval = setInterval(() => {
        sec++;
        if (matchTime) matchTime.textContent = `${sec}s elapsed`;
        if (sec >= 3) {
            clearInterval(interval);
            if (matchText) matchText.textContent = '✅ Opponent found!';
            setTimeout(() => {
                AppState.wallet.balance -= amount;
                AppState.bets.active.push({
                    id: 'bet_' + Date.now().toString(36),
                    type: 'pvp',
                    event: currentBetEvent.name,
                    eventIcon: currentBetEvent.icon,
                    pick,
                    amount,
                    status: 'pending',
                    createdAt: Date.now()
                });
                saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
                saveToStorage(STORAGE_KEYS.bets, AppState.bets);
                updateAuthUI();
                updateBetStats();
                renderMyBets();
                closeBetPlace();
                showToast(`✅ Bet placed: ${pick} on ${currentBetEvent.name}`);
            }, 800);
        }
    }, 1000);
}

function cancelBetMatch() {
    const matchSec = $('#betMatchmakingSection');
    if (matchSec) matchSec.setAttribute('hidden', '');
    const s = $('#betPlaceStatus');
    if (s) s.hidden = true;
}

function openBetCompany(eventId) {
    const modal = $('#betCompanyModal');
    if (!modal) return;
    const events = {
        evt1: { icon: '⚽', name: 'Zambia vs Kenya', league: 'Africa Cup', date: 'Today 18:00' },
        evt2: { icon: '⚽', name: 'Arsenal vs Chelsea', league: 'Premier League', date: 'Today 20:00' },
        evt3: { icon: '🏀', name: 'Lakers vs Celtics', league: 'NBA', date: 'Tomorrow 02:00' },
        evt4: { icon: '🎾', name: 'Djokovic vs Alcaraz', league: 'Wimbledon', date: 'Tomorrow 15:00' }
    };
    const evt = events[eventId] || events.evt1;
    currentBetEvent = { id: eventId, ...evt };

    const iconEl = $('#betCompanyEventIcon'); if (iconEl) iconEl.textContent = evt.icon;
    const nameEl = $('#betCompanyEventName'); if (nameEl) nameEl.textContent = evt.name;
    const metaEl = $('#betCompanyEventMeta'); if (metaEl) metaEl.textContent = `${evt.league} · ${evt.date}`;

    const outcomesEl = $('#betCompanyOutcomes');
    const outcomes = [
        { name: 'Home Win', odds: 1.85 },
        { name: 'Draw', odds: 3.20 },
        { name: 'Away Win', odds: 2.40 }
    ];
    if (outcomesEl) {
        outcomesEl.innerHTML = outcomes.map(o => `
            <button type="button" class="bet-outcome-btn" data-outcome="${o.name}" data-odds="${o.odds}">
                <span class="bet-outcome-name">${o.name}</span>
                <span class="bet-outcome-odds">${o.odds.toFixed(2)}</span>
            </button>
        `).join('');

        $$('.bet-outcome-btn', outcomesEl).forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.bet-outcome-btn', outcomesEl).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                updateCompanySummary();
            });
        });
    }

    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeBetCompany() {
    const modal = $('#betCompanyModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
        $('#betCompanyStatus')?.setAttribute('hidden', '');
    }, 200);
}

function updateCompanySummary() {
    const selected = $('.bet-outcome-btn.selected');
    const amount = parseInt($('#betCompanyAmount')?.value) || 0;
    const odds = parseFloat(selected?.dataset.odds) || 0;
    const stakeEl = $('#betCompanyStake');
    const oddsEl = $('#betCompanyOdds');
    const payoutEl = $('#betCompanyPayout');
    if (stakeEl) stakeEl.textContent = money(amount);
    if (oddsEl) oddsEl.textContent = odds ? odds.toFixed(2) : '—';
    if (payoutEl) payoutEl.textContent = money(amount * odds);
}

function confirmBetCompany() {
    const selected = $('.bet-outcome-btn.selected');
    const amount = parseInt($('#betCompanyAmount')?.value) || 0;
    const statusEl = $('#betCompanyStatus');
    if (!statusEl) return;

    if (!selected) {
        statusEl.textContent = '❌ Please choose an outcome.';
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    if (amount < 10) {
        statusEl.textContent = '❌ Minimum bet is ZMW 10.';
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    if (AppState.wallet.balance < amount) {
        statusEl.textContent = `❌ Insufficient balance. You have ${money(AppState.wallet.balance)}.`;
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }

    const odds = parseFloat(selected.dataset.odds);
    AppState.wallet.balance -= amount;
    AppState.bets.active.push({
        id: 'bet_' + Date.now().toString(36),
        type: 'company',
        event: currentBetEvent.name,
        eventIcon: currentBetEvent.icon,
        pick: selected.dataset.outcome,
        amount,
        odds,
        status: 'pending',
        createdAt: Date.now()
    });
    saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
    saveToStorage(STORAGE_KEYS.bets, AppState.bets);
    updateAuthUI();
    updateBetStats();
    renderMyBets();

    statusEl.textContent = `✅ Bet placed: ${selected.dataset.outcome} for ${money(amount)}.`;
    statusEl.className = 'bet-place-status success';
    statusEl.hidden = false;
    setTimeout(() => closeBetCompany(), 1500);
}

function openBetGame(gameId) {
    const modal = $('#betGameModal');
    if (!modal) return;
    const games = {
        g1: { icon: '♟️', name: 'Chess', desc: 'Classic strategy game. Beat your opponent in 10 minutes.' },
        g2: { icon: '🎯', name: 'Darts', desc: 'Aim and throw. Highest score wins.' },
        g3: { icon: '🃏', name: 'Cards', desc: 'Poker & more. Best hand takes the pot.' },
        g4: { icon: '🎲', name: 'Dice', desc: 'Roll to win. Highest roll takes all.' },
        g5: { icon: '⚽', name: 'Penalty Shootout', desc: 'Score the winner. 5 shots each.' },
        g6: { icon: '🏓', name: 'Ping Pong', desc: 'Fast-paced fun. First to 11 wins.' }
    };
    const g = games[gameId] || games.g1;
    const iconEl = $('#betGameIcon'); if (iconEl) iconEl.textContent = g.icon;
    const nameEl = $('#betGameName'); if (nameEl) nameEl.textContent = g.name;
    const descEl = $('#betGameDesc'); if (descEl) descEl.textContent = g.desc;

    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeBetGame() {
    const modal = $('#betGameModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
        $('#betGameLinkSection')?.setAttribute('hidden', '');
        $('#betGameStatus')?.setAttribute('hidden', '');
    }, 200);
}

function confirmBetGame() {
    const amount = parseInt($('#betGameStake')?.value) || 0;
    const statusEl = $('#betGameStatus');
    if (!statusEl) return;

    if (amount < 10) {
        statusEl.textContent = '❌ Minimum stake is ZMW 10.';
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    if (AppState.wallet.balance < amount) {
        statusEl.textContent = `❌ Insufficient balance. You have ${money(AppState.wallet.balance)}.`;
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }

    const opponent = $('.bet-opponent-btn.active')?.dataset.opponent || 'random';
    if (opponent === 'friend') {
        const link = `${window.location.origin}?challenge=${Date.now().toString(36)}`;
        const li = $('#betGameLinkInput'); if (li) li.value = link;
        const ls = $('#betGameLinkSection'); if (ls) ls.removeAttribute('hidden');
        statusEl.textContent = '✅ Link generated! Share it with your friend.';
        statusEl.className = 'bet-place-status success';
        statusEl.hidden = false;
        return;
    }

    AppState.wallet.balance -= amount;
    saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
    updateAuthUI();
    statusEl.textContent = `✅ Game started! Stake: ${money(amount)}`;
    statusEl.className = 'bet-place-status success';
    statusEl.hidden = false;
    setTimeout(() => closeBetGame(), 1500);
}

function openBetHistory() {
    const modal = $('#betHistoryModal');
    if (!modal) return;
    renderBetHistory();
    modal.hidden = false;
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('active'));
}
function closeBetHistory() {
    const modal = $('#betHistoryModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
    }, 200);
}

function renderBetHistory() {
    const statsEl = $('#betHistoryStats');
    const listEl = $('#betHistoryList');
    const empty = $('#betHistoryEmpty');
    if (!listEl) return;

    const history = AppState.bets.history;
    if (history.length === 0) {
        listEl.innerHTML = '';
        if (statsEl) statsEl.innerHTML = '';
        empty?.classList.add('show');
        return;
    }
    empty?.classList.remove('show');

    const totalStaked = history.reduce((s, b) => s + b.amount, 0);
    const totalWon = history.filter(b => b.status === 'won').reduce((s, b) => s + (b.payout || 0), 0);
    const totalLost = history.filter(b => b.status === 'lost').reduce((s, b) => s + b.amount, 0);

    if (statsEl) {
        statsEl.innerHTML = `
            <div class="bet-portfolio-stat">
                <span class="bet-portfolio-stat-label">Total Staked</span>
                <span class="bet-portfolio-stat-value">${money(totalStaked)}</span>
            </div>
            <div class="bet-portfolio-stat">
                <span class="bet-portfolio-stat-label">Total Won</span>
                <span class="bet-portfolio-stat-value">${money(totalWon)}</span>
            </div>
            <div class="bet-portfolio-stat">
                <span class="bet-portfolio-stat-label">Total Lost</span>
                <span class="bet-portfolio-stat-value" style="color:#dc2626">${money(totalLost)}</span>
            </div>
        `;
    }

    listEl.innerHTML = history.map(b => `
        <div class="bet-event-row" style="cursor:default;">
            <div class="bet-event-left">
                <div class="bet-event-icon-wrap">${b.eventIcon}</div>
                <div class="bet-event-info">
                    <span class="bet-event-name">${escapeHtml(b.event)}</span>
                    <div class="bet-event-meta">
                        <span class="bet-meta-badge">${b.type === 'pvp' ? 'VS Peer' : 'VS Company'}</span>
                        <span>Pick: ${escapeHtml(b.pick)}</span>
                    </div>
                </div>
            </div>
            <div class="bet-event-right">
                <div class="bet-event-players">
                    <span class="bet-event-players-label">Stake</span>
                    <span class="bet-event-players-value">${money(b.amount)}</span>
                </div>
                <span class="market-order-status ${b.status === 'won' ? 'paid' : 'pending'}">${b.status}</span>
            </div>
        </div>
    `).join('');
}

/* ================================================================
   PARTNERS — DIRECTORY
   ================================================================ */
const PARTNERS = {
    AD1:  { name:'ZBS Properties & Real Estate', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2019', email:'property@zeroth.com',
            desc:'Full-service estate agency handling residential and commercial property sales, rentals and land acquisition across Zambia.',
            services:['House Sales & Rentals','Land Acquisition','Property Valuation','Title Deed Processing','Estate Agency'] },
    AD2:  { name:'Zenith Capital Bank', category:'Financial', categoryKey:'financial', rating:'4.7', location:'Lusaka, Zambia', since:'2015', email:'banking@zeroth.com',
            desc:'Commercial banking partner providing accounts, asset finance and trade facilities for individuals and enterprises.',
            services:['Business Accounts','Bank Transfers','Asset Finance','Trade Finance','Forex Services'] },
    AD3:  { name:'Lusaka Securities Brokers', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2017', email:'trading@zeroth.com',
            desc:'Licensed stockbroking firm giving you access to equities, bonds and ETF markets on and off the LuSE.',
            services:['Stock Trading','Portfolio Management','Bond Trading','IPO Advisory','ETF Trading 24/7'] },
    AD4:  { name:'Airtel Money', category:'Financial', categoryKey:'financial', rating:'4.9', location:'Nationwide', since:'2016', email:'mobilemoney@zeroth.com',
            desc:'Mobile money partner powering instant transfers, bill payments and merchant collections nationwide.',
            services:['Mobile Money Transfers','Bill Payments','Airtime & Data','Merchant Payments','Wallet Integration'] },
    AD5:  { name:'ZamSeed Agro Supplies', category:'Agricultural', categoryKey:'agricultural', rating:'4.7', location:'Chisamba, Zambia', since:'2018', email:'agro@zeroth.com',
            desc:'Certified seed, fertiliser and crop advisory partner supporting smallholder and commercial farmers.',
            services:['Certified Seed','Fertiliser & Lime','Crop Advisory','Contract Farming','Irrigation Kits'] },
    AD6:  { name:'Guardian Assurance Zambia', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2014', email:'insurance@zeroth.com',
            desc:'Insurance brokerage offering life, motor, health and agricultural cover with fast claims handling.',
            services:['Life Insurance','Motor Insurance','Agriculture Insurance','Health Cover','Funeral Cover'] },
    AD7:  { name:'SwiftLink Logistics', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Ndola, Zambia', since:'2016', email:'logistics@zeroth.com',
            desc:'End-to-end transport and logistics partner covering haulage, cold chain and last-mile delivery.',
            services:['Haulage & Transport','Cold Chain Delivery','Warehousing','Last-Mile Delivery','Customs Clearing'] },
    AD8:  { name:'Bright Future Academy', category:'Brokerage', categoryKey:'brokerage', rating:'4.9', location:'Kitwe, Zambia', since:'2013', email:'education@zeroth.com',
            desc:'Education partner providing tuition, scholarships and vocational pathways for learners of all ages.',
            services:['Primary & Secondary Tuition','Tertiary Scholarships','Vocational Training','Online Learning','Career Guidance'] },
    AD9:  { name:'Handshake Brokerage House', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2018', email:'deals@zeroth.com',
            desc:'Deal-structuring house connecting buyers, sellers and investors with verified opportunities.',
            services:['Deal Structuring','Mergers & Acquisitions','Business Linkages','Tender Support','Commission Agency'] },
    AD10: { name:'AfriTrade Global', category:'Brokerage', categoryKey:'brokerage', rating:'4.4', location:'Johannesburg, SA', since:'2015', email:'trade@zeroth.com',
            desc:'Cross-border trading partner handling import, export and commodity brokerage across the region.',
            services:['Import & Export','Cross-Border Trade','Trade Documentation','Commodity Brokerage','Market Access'] },
    AD11: { name:'MicroChip Technologies', category:'Technology', categoryKey:'technology', rating:'4.7', location:'Lusaka, Zambia', since:'2019', email:'tech@zeroth.com',
            desc:'Hardware and IoT partner supplying smart devices, meters and embedded systems with installation support.',
            services:['IoT Devices','Smart Meters','Embedded Systems','Device Repair','Tech Installation'] },
    AD12: { name:'TalkPoint Telecoms', category:'Technology', categoryKey:'technology', rating:'4.5', location:'Nationwide', since:'2014', email:'telecom@zeroth.com',
            desc:'Telecommunications partner delivering voice, data and enterprise communication solutions.',
            services:['Voice & Data Bundles','Business Lines','PBX Systems','Call Centre Solutions','Network Support'] },
    AD13: { name:'DataCore Analytics', category:'Technology', categoryKey:'technology', rating:'4.8', location:'Lusaka, Zambia', since:'2020', email:'data@zeroth.com',
            desc:'Data and analytics partner delivering credit scoring, research and business intelligence.',
            services:['Credit Scoring','Data Warehousing','Business Intelligence','Survey & Research','API Integration'] },
    AD14: { name:'CloudNine Hosting', category:'Technology', categoryKey:'technology', rating:'4.6', location:'Cloud / Remote', since:'2018', email:'cloud@zeroth.com',
            desc:'Managed hosting and cyber-security partner keeping your business online and protected.',
            services:['Cloud Hosting','Domain & Email','Backup & Recovery','Cyber Security','Managed IT'] },
    AD15: { name:'Precision Engineering Works', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Kitwe, Zambia', since:'2012', email:'engineering@zeroth.com',
            desc:'Engineering and fabrication partner supporting mining, farming and construction operations.',
            services:['Metal Fabrication','Machinery Servicing','Plant Hire','Welding & Fitting','Spare Parts'] },
    AD16: { name:'GreenLeaf Agro Farms', category:'Agricultural', categoryKey:'agricultural', rating:'4.8', location:'Mkushi, Zambia', since:'2017', email:'greenleaf@zeroth.com',
            desc:'Fresh produce partner supplying vegetables, fruit and organic crops under off-take agreements.',
            services:['Vegetable & Fruit Supply','Organic Produce','Greenhouse Farming','Farm Inputs','Off-Take Agreements'] },
    AD17: { name:'BuildRight Hardware', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2016', email:'hardware@zeroth.com',
            desc:'Hardware and building materials partner for contractors, developers and DIY customers.',
            services:['Cement & Aggregates','Roofing Sheets','Plumbing Supplies','Electrical Fittings','Tool Hire'] },
    AD18: { name:'Rocket Launch SME Hub', category:'Brokerage', categoryKey:'brokerage', rating:'4.7', location:'Lusaka, Zambia', since:'2021', email:'sme@zeroth.com',
            desc:'SME incubation partner offering funding readiness, coaching and co-working space for startups.',
            services:['SME Incubation','Startup Funding','Business Coaching','Pitch Preparation','Co-working Space'] },
    AD19: { name:'Cortex AI Labs', category:'Technology', categoryKey:'technology', rating:'4.9', location:'Lusaka, Zambia', since:'2022', email:'ai@zeroth.com',
            desc:'Artificial-intelligence partner building chatbots, predictive models and automation for business.',
            services:['AI Chatbots','Predictive Models','Process Automation','Computer Vision','Data Labelling'] },
    AD20: { name:'StarRate Marketing', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Lusaka, Zambia', since:'2015', email:'marketing@zeroth.com',
            desc:'Marketing and advertising partner delivering digital, outdoor and brand campaigns that convert.',
            services:['Digital Advertising','Billboard Advertising','Brand Strategy','Social Media','Event Promotion'] },
    AD21: { name:'Volt Energy Solutions', category:'Technology', categoryKey:'technology', rating:'4.7', location:'Nationwide', since:'2018', email:'energy@zeroth.com',
            desc:'Renewable energy partner delivering solar, storage and backup power systems.',
            services:['Solar Installation','Inverters & Batteries','Energy Audits','Mini-Grids','Generator Servicing'] },
    AD22: { name:'NetLink Communications', category:'Technology', categoryKey:'technology', rating:'4.6', location:'Nationwide', since:'2017', email:'netlink@zeroth.com',
            desc:'Connectivity partner installing fibre, VSAT and structured cabling for homes and businesses.',
            services:['Fibre Installation','VSAT & Satellite','Hotspot Solutions','Structured Cabling','Network Monitoring'] },
    AD23: { name:'Puzzle Consulting Group', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2014', email:'consult@zeroth.com',
            desc:'Business advisory partner covering registration, compliance, HR and feasibility studies.',
            services:['Business Registration','Tax & Compliance','HR Advisory','Feasibility Studies','Corporate Training'] },
    AD24: { name:'SyncPay Fintech', category:'Financial', categoryKey:'financial', rating:'4.7', location:'Lusaka, Zambia', since:'2020', email:'fintech@zeroth.com',
            desc:'Payments partner providing gateways, terminals and payroll rails for digital commerce.',
            services:['Payment Gateways','POS Terminals','Payroll Systems','Card Issuing','USSD Banking'] },
    AD25: { name:'LinkChain Supply', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Ndola, Zambia', since:'2019', email:'supply@zeroth.com',
            desc:'Procurement and supply-chain partner managing vendors, fleets and inventory efficiently.',
            services:['Procurement','Supply Chain Audit','Vendor Management','Fleet Tracking','Inventory Systems'] },
    AD26: { name:'CodeForge Systems', category:'Technology', categoryKey:'technology', rating:'4.8', location:'Lusaka, Zambia', since:'2016', email:'software@zeroth.com',
            desc:'Software engineering partner building web, mobile, USSD and core-banking applications.',
            services:['Web & Mobile Apps','Core Banking Systems','USSD Applications','Software Maintenance','IT Training'] },
    AD27: { name:'Crown Premium Partners', category:'Brokerage', categoryKey:'brokerage', rating:'4.9', location:'Lusaka, Zambia', since:'2012', email:'premium@zeroth.com',
            desc:'Private wealth partner serving high-net-worth clients with bespoke financial solutions.',
            services:['Private Wealth Advisory','Premium Banking','Concierge Services','Offshore Investments','Estate Planning'] },
    AD28: { name:'Gemstone Mining Supplies', category:'Brokerage', categoryKey:'brokerage', rating:'4.4', location:'Kitwe, Zambia', since:'2013', email:'mining@zeroth.com',
            desc:'Mining services partner supplying equipment, safety gear and mineral-trade facilitation.',
            services:['Mining Equipment','Mineral Trading','Licence Facilitation','Gemstone Valuation','Safety Gear'] },
    AD29: { name:'FireBrand Energy', category:'Technology', categoryKey:'technology', rating:'4.5', location:'Lusaka, Zambia', since:'2017', email:'fuels@zeroth.com',
            desc:'Fuel and gas partner delivering bulk diesel, LPG and energy consulting services.',
            services:['Fuel Supply','LPG Distribution','Bulk Diesel','Energy Consulting','Tank Installation'] },
    AD30: { name:'Infinity Holdings', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2011', email:'holdings@zeroth.com',
            desc:'Investment holding partner driving joint ventures, franchising and capital raising.',
            services:['Investment Holding','Joint Ventures','Franchise Development','Asset Management','Capital Raising'] }
};

/* ================================================================
   BUILD PARTNER SLOTS
   ================================================================ */
function buildPartnerSlots() {
    const container  = $('#partnerSlotsContainer');
    const mobileGrid = $('#partnersGridMobile');

    if (container && container.children.length === 0) {
        let html = `
            <div class="partner-star-center">
                <div class="star-rings" aria-hidden="true">
                    <span class="star-ring ring-green"></span>
                    <span class="star-ring ring-red"></span>
                    <span class="star-ring ring-blue"></span>
                </div>
                <div class="star-8point">
                    <div class="star-point point-n"></div>
                    <div class="star-point point-ne"></div>
                    <div class="star-point point-e"></div>
                    <div class="star-point point-se"></div>
                    <div class="star-point point-s"></div>
                    <div class="star-point point-sw"></div>
                    <div class="star-point point-w"></div>
                    <div class="star-point point-nw"></div>
                    <div class="star-core">
                        <img class="star-logo" src="images/logo-zbsfltgheader.png" alt="Zeroth Business Solutions" />
                        <span class="star-label">ZBS</span>
                        <span class="star-sub">Lever &amp; Fulcrum</span>
                    </div>
                </div>
                <div class="star-dots">
                    <span></span><span></span><span></span><span></span>
                    <span></span><span></span><span></span><span></span>
                </div>
            </div>`;
        for (let i = 1; i <= 30; i++) {
            const code = 'AD' + i;
            const p = PARTNERS[code];
            const name = p ? p.name : code;
            html += `
                <div class="partner-slot slot-ad${i}" data-slot="${code}" role="button" tabindex="0"
                     title="${escapeHtml(name)}"
                     aria-label="View details and services for ${escapeHtml(name)}">
                    <div class="partner-slot-inner">
                        <img class="partner-logo-img" src="images/partners/ad${i}.png"
                             alt="${escapeHtml(name)}" loading="lazy"
                             onerror="this.style.display='none'">
                        <span class="slot-code">${code}</span>
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    }

    if (mobileGrid && mobileGrid.children.length === 0) {
        const icons = ['building','university','chart-line','mobile-alt','seedling','shield-alt','truck',
            'graduation-cap','handshake','globe-africa','microchip','phone-alt','database','cloud','cogs',
            'leaf','tools','rocket','brain','star','bolt','network-wired','puzzle-piece','sync','link',
            'code','crown','gem','fire','infinity'];
        let mhtml = '';
        for (let i = 1; i <= 30; i++) {
            const code = 'AD' + i;
            const p = PARTNERS[code];
            if (!p) continue;
            mhtml += `
                <div class="partner-item" data-slot="${code}" role="button" tabindex="0"
                     aria-label="View details for ${escapeHtml(p.name)}">
                    <i class="fas fa-${icons[i - 1]}"></i>
                    <span class="p-name">${escapeHtml(p.name)}</span>
                    <span class="p-code">${code} · ${escapeHtml(p.category)}</span>
                </div>`;
        }
        mobileGrid.innerHTML = mhtml;
    }
}

/* ================================================================
   PARTNER DETAIL MODAL
   ================================================================ */
let partnerLastFocused = null;
let partnerIsOpen = false;

function openPartner(code) {
    const p = PARTNERS[code];
    const overlay = $('#partnerModalOverlay');
    const modal   = $('#partnerModal');
    if (!p || !overlay || !modal) return;

    const logoEl     = $('#partnerModalLogo');
    const codeEl     = $('#partnerModalCode');
    const titleEl    = $('#partnerModalTitle');
    const catEl      = $('#partnerModalCategory');
    const descEl     = $('#partnerModalDesc');
    const metaEl     = $('#partnerModalMeta');
    const servicesEl = $('#partnerModalServices');
    const actionsEl  = $('#partnerModalActions');
    const form       = $('#partnerApplyForm');
    const formStatus = $('#partnerFormStatus');
    const applyName  = $('#partnerApplyName');
    const serviceSel = $('#partnerApplicantService');

    if (logoEl) {
        logoEl.onerror = function () { this.onerror = null; this.src = 'images/logo-zbsfltgheader.png'; };
        logoEl.src = 'images/partners/' + code.toLowerCase() + '.png';
        logoEl.alt = p.name;
    }
    if (codeEl)  codeEl.textContent  = code;
    if (titleEl) titleEl.textContent = p.name;
    if (catEl)   catEl.textContent   = p.category;
    modal.setAttribute('data-category', p.categoryKey || 'brokerage');
    if (descEl)  descEl.textContent  = p.desc;

    if (metaEl) {
        metaEl.innerHTML = '';
        [
            ['fa-star',           p.rating + ' / 5.0 Rating'],
            ['fa-map-marker-alt', p.location],
            ['fa-calendar-alt',   'Since ' + p.since],
            ['fa-envelope',       p.email]
        ].forEach(([icon, text]) => {
            const span = document.createElement('span');
            const i    = document.createElement('i');
            i.className = 'fas ' + icon;
            span.appendChild(i);
            span.appendChild(document.createTextNode(text));
            metaEl.appendChild(span);
        });
    }

    if (servicesEl) {
        servicesEl.innerHTML = '';
        p.services.forEach(s => {
            const li = document.createElement('li');
            const i  = document.createElement('i');
            i.className = 'fas fa-check-circle';
            li.appendChild(i);
            li.appendChild(document.createTextNode(s));
            servicesEl.appendChild(li);
        });
    }

    if (form) form.reset();
    if (formStatus) { formStatus.hidden = true; formStatus.classList.remove('error'); formStatus.textContent = ''; }
    if (form) form.hidden = true;
    if (actionsEl) actionsEl.hidden = false;
    if (applyName) applyName.textContent = p.name;

    if (serviceSel) {
        serviceSel.innerHTML = '';
        p.services.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            serviceSel.appendChild(opt);
        });
    }

    partnerLastFocused = document.activeElement;
    show(overlay);
    void overlay.offsetWidth;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.classList.add('partner-modal-open');
    partnerIsOpen = true;

    setTimeout(() => $('#partnerModalClose')?.focus(), 80);
}

function closePartner() {
    const overlay = $('#partnerModalOverlay');
    const modal   = $('#partnerModal');
    if (!partnerIsOpen || !overlay) return;
    partnerIsOpen = false;
    overlay.classList.remove('is-open');
    document.body.classList.remove('partner-modal-open');

    setTimeout(() => {
        hide(overlay);
        if (modal) modal.scrollTop = 0;
    }, 260);

    if (partnerLastFocused && typeof partnerLastFocused.focus === 'function') {
        partnerLastFocused.focus();
    }
}

/* ================================================================
   BECOME A PARTNER — registration form
   ================================================================ */
const BP_SNAPSHOT = { body: null, footer: null };

function snapshotBecomePartnerModal() {
    const body   = $('#becomePartnerModal .partner-modal-body');
    const footer = $('#bpFooterActions');
    if (body   && BP_SNAPSHOT.body   === null) BP_SNAPSHOT.body   = body.innerHTML;
    if (footer && BP_SNAPSHOT.footer === null) BP_SNAPSHOT.footer = footer.innerHTML;
}

function restoreBecomePartnerModal() {
    if (BP_SNAPSHOT.body === null) return;
    const body   = $('#becomePartnerModal .partner-modal-body');
    const footer = $('#bpFooterActions');
    if (body && body.innerHTML !== BP_SNAPSHOT.body) {
        body.innerHTML = BP_SNAPSHOT.body;
    }
    if (footer && BP_SNAPSHOT.footer !== null && footer.innerHTML !== BP_SNAPSHOT.footer) {
        footer.innerHTML = BP_SNAPSHOT.footer;
    }
}

function openBecomePartner() {
    const overlay = $('#becomePartnerModalOverlay');
    const status  = $('#bpStatus');

    if (!overlay) {
        console.error('[ZBS] openBecomePartner: #becomePartnerModalOverlay is missing from the DOM. Add the registration modal HTML to index.html.');
        showToast('⚠️ Registration form unavailable — please refresh the page.');
        return;
    }

    restoreBecomePartnerModal();

    const form = $('#becomePartnerForm');
    if (form) form.reset();
    if (status) { status.hidden = true; status.className = 'bp-status'; status.textContent = ''; }

    show(overlay);
    void overlay.offsetWidth;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.classList.add('partner-modal-open');

    setTimeout(() => $('#bpCompanyName')?.focus(), 100);
}

function closeBecomePartner() {
    const overlay = $('#becomePartnerModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('partner-modal-open');
    setTimeout(() => hide(overlay), 260);
}

function handleBecomePartnerSubmit(e) {
    e.preventDefault();
    const form   = e.target;
    const status = $('#bpStatus');

    const required = [
        'bpCompanyName', 'bpCategory', 'bpCity',
        'bpContactName', 'bpEmail', 'bpPhone', 'bpServices'
    ];
    for (const id of required) {
        const el = $('#' + id);
        if (!el || !el.value.trim()) {
            if (status) {
                status.textContent = '⚠️ Please fill in all required fields.';
                status.className = 'bp-status error';
                status.hidden = false;
            }
            el?.focus();
            return;
        }
    }

    const email = $('#bpEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (status) {
            status.textContent = '⚠️ Please enter a valid email address.';
            status.className = 'bp-status error';
            status.hidden = false;
        }
        $('#bpEmail').focus();
        return;
    }

    if (!$('#bpTerms').checked) {
        if (status) {
            status.textContent = '⚠️ Please accept the terms to continue.';
            status.className = 'bp-status error';
            status.hidden = false;
        }
        return;
    }

    const refCode = 'BP-' + Date.now().toString(36).toUpperCase().slice(-6);
    const company = $('#bpCompanyName').value.trim();
    const body    = $('#becomePartnerModal .partner-modal-body');

    if (body) {
        body.innerHTML = `
            <div class="bp-success">
                <div class="bp-check"><i class="fas fa-check"></i></div>
                <h3>Application received 🎉</h3>
                <p>
                    Thank you, <strong>${escapeHtml(company)}</strong>. Our partnership
                    team will review your application and get back to you at
                    <strong>${escapeHtml(email)}</strong> within 2 business days.
                </p>
                <span class="bp-ref">Reference: ${refCode}</span>
            </div>
        `;
    }

    showToast('✅ Partnership application submitted!');

    const footer = $('#bpFooterActions');
    if (footer) {
        footer.innerHTML = `
            <button class="partner-apply-btn" id="bpDoneBtn" type="button">
                <i class="fas fa-check"></i> Done
            </button>
        `;
        $('#bpDoneBtn')?.addEventListener('click', () => {
            closeBecomePartner();
            setTimeout(() => location.reload(), 300);
        });
    }
}

function initPartnerModal() {
    const overlay      = $('#partnerModalOverlay');
    const modal        = $('#partnerModal');
    const closeBtn     = $('#partnerModalClose');
    const closeFootBtn = $('#partnerModalCloseBtn');
    const applyBtn     = $('#partnerApplyBtn');
    const form         = $('#partnerApplyForm');
    const cancelApply  = $('#partnerApplyCancel');
    const formStatus   = $('#partnerFormStatus');
    const actionsEl    = $('#partnerModalActions');
    const serviceSel   = $('#partnerApplicantService');

    closeBtn?.addEventListener('click', closePartner);
    closeFootBtn?.addEventListener('click', closePartner);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closePartner(); });

    document.addEventListener('keydown', (e) => {
        if (!partnerIsOpen || !modal) return;
        if (e.key === 'Escape') { closePartner(); return; }
        if (e.key === 'Tab') {
            const focusables = modal.querySelectorAll(
                'button:not([hidden]), input:not([hidden]), select:not([hidden]), textarea:not([hidden]), a[href]'
            );
            const list = Array.prototype.filter.call(focusables, el => el.offsetParent !== null && !el.disabled);
            if (!list.length) return;
            const first = list[0], last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    applyBtn?.addEventListener('click', () => {
        if (actionsEl) actionsEl.hidden = true;
        if (form) form.hidden = false;
        if (formStatus) formStatus.hidden = true;
        setTimeout(() => $('#partnerApplicantName')?.focus(), 80);
    });

    cancelApply?.addEventListener('click', () => {
        if (form) form.hidden = true;
        if (actionsEl) actionsEl.hidden = false;
        if (formStatus) formStatus.hidden = true;
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name    = $('#partnerApplicantName')?.value.trim() || '';
        const email   = $('#partnerApplicantEmail')?.value.trim() || '';
        const phone   = $('#partnerApplicantPhone')?.value.trim() || '';
        const service = serviceSel?.value || '';

        if (!formStatus) return;
        formStatus.classList.remove('error');

        if (!name || !email || !phone || !service) {
            formStatus.hidden = false;
            formStatus.classList.add('error');
            formStatus.textContent = '⚠️ Please fill in all required fields before submitting.';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            formStatus.hidden = false;
            formStatus.classList.add('error');
            formStatus.textContent = '⚠️ Please enter a valid email address.';
            return;
        }

        formStatus.hidden = false;
        formStatus.classList.remove('error');
        formStatus.textContent = '✅ Thank you, ' + name + '! Your application for "' +
            service + '" has been received. Our team will contact you on ' + phone + ' shortly.';
        showToast('✅ Application submitted successfully!');

        form.querySelectorAll('input, select, textarea').forEach(f => {
            if (f.type !== 'submit') f.value = '';
        });

        setTimeout(() => {
            if (form) form.hidden = true;
            if (actionsEl) actionsEl.hidden = false;
        }, 2400);
    });
}

/* ================================================================
   PARTNER SLOT INTERACTION (click / drag to centre)
   ================================================================ */
function getPartnerDropZone() {
    const starCenter = $('.partner-star-center');
    let r = starCenter ? starCenter.getBoundingClientRect() : null;
    if (!r || r.width < 10 || r.height < 10) {
        const wrap = $('.partners-star-container') || document.body;
        r = wrap.getBoundingClientRect();
        return {
            cx: r.left + r.width / 2,
            cy: r.top  + r.height / 2,
            radius: Math.min(r.width, r.height) * 0.28
        };
    }
    return {
        cx: r.left + r.width / 2,
        cy: r.top  + r.height / 2,
        radius: Math.max(r.width, r.height) / 2 + 26
    };
}

function bindPartnerSlot(slot) {
    const code = slot.getAttribute('data-slot');
    if (!code || !PARTNERS[code]) return;

    if (slot.dataset.partnerBound === '1') return;
    slot.dataset.partnerBound = '1';

    if (!slot.hasAttribute('role'))     slot.setAttribute('role', 'button');
    if (!slot.hasAttribute('tabindex')) slot.setAttribute('tabindex', '0');
    if (!slot.hasAttribute('aria-label')) {
        slot.setAttribute('aria-label', 'View details and services for partner ' + code);
    }

    let dragging  = false;
    let moved     = false;
    let pointerId = null;
    let startX = 0, startY = 0;
    let zone = null;

    slot.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging  = true;
        moved     = false;
        pointerId = e.pointerId;
        startX    = e.clientX;
        startY    = e.clientY;
        zone      = getPartnerDropZone();
        try { slot.setPointerCapture(pointerId); } catch (err) {}
        slot.classList.add('is-dragging');
        slot.style.transition = 'none';
    });

    slot.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 6) moved = true;
        slot.style.marginLeft = dx + 'px';
        slot.style.marginTop  = dy + 'px';

        let over = false;
        if (zone) {
            const ox = e.clientX - zone.cx;
            const oy = e.clientY - zone.cy;
            over = (ox * ox + oy * oy) <= (zone.radius * zone.radius);
        }
        slot.classList.toggle('is-over-center', over);
        $('.partner-star-center')?.classList.toggle('drop-active', over);
    });

    const finishDrag = (openIt) => {
        if (!dragging) return;
        dragging = false;
        slot.classList.remove('is-dragging', 'is-over-center');
        $('.partner-star-center')?.classList.remove('drop-active');
        try {
            if (pointerId !== null && slot.hasPointerCapture && slot.hasPointerCapture(pointerId)) {
                slot.releasePointerCapture(pointerId);
            }
        } catch (err) {}
        pointerId = null;
        slot.style.transition = '';
        slot.style.marginLeft = '';
        slot.style.marginTop  = '';
        if (openIt) openPartner(code);
    };

    slot.addEventListener('pointerup', () => {
        const over = slot.classList.contains('is-over-center');
        finishDrag(over || !moved);
    });
    slot.addEventListener('pointercancel', () => finishDrag(false));

    slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            openPartner(code);
        }
    });
}

function initPartnerSlots() {
    $$('.partner-slot').forEach(slot => {
        const code = slot.getAttribute('data-slot');
        const p = PARTNERS[code];
        if (p) {
            if (!slot.hasAttribute('title')) slot.setAttribute('title', p.name);
            const img = slot.querySelector('.partner-logo-img');
            if (img && (!img.alt || /^Partner AD\d+$/.test(img.alt))) img.alt = p.name;
        }
        bindPartnerSlot(slot);
    });

    $$('.partners-grid-mobile .partner-item').forEach(item => {
        const code = item.getAttribute('data-slot');
        if (!code || !PARTNERS[code]) return;
        if (item.dataset.partnerBound === '1') return;
        item.dataset.partnerBound = '1';

        item.addEventListener('click', () => openPartner(code));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPartner(code);
            }
        });
    });
}

/* ================================================================
   AI CHATBOT
   ================================================================ */
let chatOpen = false;
const chatResponses = {
    'loan': 'We offer various loan products including Salary Advance, Payday Loans, Emergency Loans, and Business Venture Loans. Interest rates start from 12% p.a. Would you like to apply?',
    'agriculture': 'Our agricultural services include farm produce, livestock, agro-chemicals, and farm services. We also offer incubation services. What are you interested in?',
    'insurance': 'We provide insurance brokerage services starting from ZMW 75. This includes life, health, and asset insurance. Would you like a quote?',
    'investment': 'We offer investment opportunities through our ETF Trading Hub and Share Purchase Application. Minimum investment starts from ZMW 250. Interested?',
    'etf': 'Our ETF Trading Hub is live 24/7. You can trade stocks from LuSE, JSE, NSE, and NGX exchanges. Commission is only 1.5%. Ready to trade?',
    'betting': 'Our Bet & Gaming Hub offers peer-to-peer and company betting, plus online games like Chess, Darts, and Cards. Minimum bet is ZMW 10. Play responsibly!',
    'entertainment': 'The Entertainment Hub features cartoons, music, and movies. You can also upload your own content (user or admin). Check it out!',
    'education': 'Our Education Hub lists universities, colleges, high schools, and primary schools. We also have an online library and tutor matching service.',
    'financial': 'Our Financial Hub offers Savings, Salary Advance, Vehicle Financing, Food Wallet Loans, Group Loans, Emergency Loans, Mortgages, Investment Advisory, Credit Cards, and a directory of financial institutions. Which one interests you?',
    'consultation': 'Our Consultation Hub connects you with vetted experts in Health, Education, Business, Legal, Tech, Agriculture, and Personal. Sessions start from $8. Book a session today!',
    'construction': 'Our Construction & Survey Hub offers 244+ services across Survey, Drilling, Geotechnical, Testing, Design, and Construction. We also list 70+ verified contractors across 6 countries. Check it out!',
    'advert': 'Our Advertisement Hub lets you post free ads for products, services, jobs, property, vehicles and events — reached by thousands of customers. Post your first ad free today!',
    'rental': 'Our Rental Property Hub lets you browse apartments, houses, rooms, offices and warehouses from verified landlords. You can also list your own property as a landlord. Find a home today!',
    'prohire': 'ProHire lets you hire verified professionals — doctors, nurses, electricians, mechanics, cleaners, barbers, plumbers, drivers and more — 24/7. You can also hire chauffeur-driven or self-drive vehicles for weddings, safaris, airport pickups and events.',
    'partner': 'We work with 30+ strategic partners across finance, agriculture, technology and brokerage. Click any card in the Partners section to see their services and apply.',
    'default': 'I can help you with: Loans, Agriculture, Insurance, Investments, ETF Trading, Betting, Entertainment, Education, Financial Services, Construction & Survey, Advertisements, Rentals, ProHire, Partners and more. What would you like to know?'
};

function toggleAIChat() {
    const modal = $('#aiChatModal');
    if (!modal) return;
    chatOpen = !chatOpen;
    if (chatOpen) {
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        const msgs = $('#chatMessages');
        if (msgs && msgs.children.length === 0) {
            addChatMessage('bot', 'Hello! 👋 I\'m your ZBS AI assistant. How can I help you today?');
        }
        setTimeout(() => $('#chatInput')?.focus(), 200);
    } else {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }
}

function addChatMessage(sender, text) {
    const container = $('#chatMessages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.innerHTML = `${sender === 'bot' ? '<span class="msg-avatar">🤖</span>' : ''}${escapeHtml(text)}<span class="msg-time">${time}</span>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function sendAIMessage() {
    const input = $('#chatInput');
    const text = input?.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';

    const container = $('#chatMessages');
    if (!container) return;
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
        typing.remove();
        const lower = text.toLowerCase();
        let response = chatResponses.default;
        for (const [key, val] of Object.entries(chatResponses)) {
            if (lower.includes(key)) { response = val; break; }
        }
        addChatMessage('bot', response);
    }, 900);
}

/* ================================================================
   AI CHATBOT DRAG
   ================================================================ */
function initChatbotDrag() {
    const container = $('#aiChatbotContainer');
    if (!container) return;
    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onDown = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = container.getBoundingClientRect();
        isDragging = true;
        startX = clientX;
        startY = clientY;
        startLeft = rect.left;
        startTop = rect.top;
        container.classList.add('dragging');
        container.style.transform = 'none';
        container.style.top = rect.top + 'px';
        container.style.left = rect.left + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;
        container.style.left = (startLeft + dx) + 'px';
        container.style.top = (startTop + dy) + 'px';
    };

    const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('dragging');
    };

    container.addEventListener('mousedown', onDown);
    container.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
}

/* ================================================================
   AI CHAT MODAL DRAG
   ================================================================ */
function initChatModalDrag() {
    const header = $('#chatHeader');
    const modal = $('#aiChatModal');
    if (!header || !modal) return;
    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onDown = (e) => {
        if (e.target.closest('.close-chat')) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = modal.getBoundingClientRect();
        isDragging = true;
        startX = clientX;
        startY = clientY;
        startLeft = rect.left;
        startTop = rect.top;
        modal.style.transform = 'none';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        modal.style.left = (startLeft + clientX - startX) + 'px';
        modal.style.top = (startTop + clientY - startY) + 'px';
    };

    const onUp = () => { isDragging = false; };

    header.addEventListener('mousedown', onDown);
    header.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
}

/* ================================================================
   SOCIAL HUB — stretchable panel (8-direction resize)
   ================================================================ */
function initSocialHubResize() {
    const panel = document.getElementById('shubPanel');
    if (!panel) return;

    const LS_KEY   = 'zbs_shub_size';
    const MIN_W    = 320;
    const MIN_H    = 360;
    const H_MARGIN = 12;
    const V_MARGIN = 12;

    const legacy = document.getElementById('shubResizeHandle');
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);

    ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].forEach(dir => {
        const h = document.createElement('div');
        h.className = 'shub-resize-handle shub-resize-' + dir;
        h.dataset.dir = dir;
        h.setAttribute('aria-hidden', 'true');
        panel.appendChild(h);
    });

    try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if (saved && Number.isFinite(saved.w) && Number.isFinite(saved.h)) {
            panel.style.width  = saved.w + 'px';
            panel.style.height = saved.h + 'px';
            if (Number.isFinite(saved.l) && Number.isFinite(saved.t)) {
                panel.style.left   = saved.l + 'px';
                panel.style.top    = saved.t + 'px';
                panel.style.right  = 'auto';
                panel.style.bottom = 'auto';
            }
        }
    } catch (_) {}

    function clampRect(r) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let { left, top, width, height } = r;

        width  = Math.max(MIN_W, Math.min(width,  vw - 2 * H_MARGIN));
        height = Math.max(MIN_H, Math.min(height, vh - 2 * V_MARGIN));

        left = Math.max(H_MARGIN, Math.min(left, vw - width  - H_MARGIN));
        top  = Math.max(V_MARGIN, Math.min(top,  vh - height - V_MARGIN));

        return { left, top, width, height };
    }

    function applyRect(rect) {
        const r = clampRect(rect);
        panel.style.left   = r.left   + 'px';
        panel.style.top    = r.top    + 'px';
        panel.style.width  = r.width  + 'px';
        panel.style.height = r.height + 'px';
        panel.style.right  = 'auto';
        panel.style.bottom = 'auto';
    }

    let drag = null;

    function onDown(e) {
        const dir = e.currentTarget.dataset.dir;
        if (!dir) return;

        const rect = panel.getBoundingClientRect();

        drag = {
            dir,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startRect: {
                left:   rect.left,
                top:    rect.top,
                width:  rect.width,
                height: rect.height
            }
        };

        panel.classList.add('resizing');
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
    }

    function onMove(e) {
        if (!drag || e.pointerId !== drag.pointerId) return;

        const dx  = e.clientX - drag.startX;
        const dy  = e.clientY - drag.startY;
        const dir = drag.dir;
        const s   = drag.startRect;

        let { left, top, width, height } = s;

        if (dir.includes('e')) {
            width = s.width + dx;
        } else if (dir.includes('w')) {
            width = s.width - dx;
            left  = s.left  + dx;
        }

        if (dir.includes('s')) {
            height = s.height + dy;
        } else if (dir.includes('n')) {
            height = s.height - dy;
            top    = s.top    + dy;
        }

        if (width < MIN_W) {
            if (dir.includes('w')) left = s.left + s.width - MIN_W;
            width = MIN_W;
        }
        if (height < MIN_H) {
            if (dir.includes('n')) top = s.top + s.height - MIN_H;
            height = MIN_H;
        }

        applyRect({ left, top, width, height });
    }

    function onUp() {
        if (!drag) return;

        const r = panel.getBoundingClientRect();
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({
                w: Math.round(r.width),
                h: Math.round(r.height),
                l: Math.round(r.left),
                t: Math.round(r.top)
            }));
        } catch (_) {}

        drag = null;
        panel.classList.remove('resizing');
    }

    panel.querySelectorAll('.shub-resize-handle').forEach(h => {
        h.addEventListener('pointerdown',   onDown);
        h.addEventListener('pointermove',   onMove);
        h.addEventListener('pointerup',     onUp);
        h.addEventListener('pointercancel', onUp);
    });

    window.addEventListener('resize', () => {
        const r = panel.getBoundingClientRect();
        applyRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    });
}

/* ================================================================
   GLOBAL ACTION DISPATCHER
   ================================================================ */
function handleAction(action, el) {
    switch (action) {
        case 'openSidebar': openSidebar(); break;
        case 'closeSidebar': closeSidebar(); break;

        case 'openSearch': openSearch(); break;
        case 'closeSearch': closeSearch(); break;
        case 'performSearch': performSearch(); break;

        case 'openLoginModal': openLoginModal(); break;
        case 'closeLoginModal': closeLoginModal(); break;
        case 'logout': logout(); break;

        case 'openProfileMenu': openProfileMenu(); break;
        case 'closeProfileMenu': closeProfileMenu(); break;
        case 'viewProfile': closeProfileMenu(); showToast('👤 Profile page coming soon'); break;
        case 'viewOrders': closeProfileMenu(); showToast('📦 Orders page coming soon'); break;
        case 'viewWallet': closeProfileMenu(); showToast(`💰 Wallet balance: ${money(AppState.wallet.balance)}`); break;
        case 'viewSettings': closeProfileMenu(); showToast('⚙️ Settings page coming soon'); break;

        case 'toggleFooterMenu': toggleFooterMenu(); break;
        case 'closeFooterMenu': closeFooterMenu(); break;

        /* Header services dropdown — fallback if header-nav-adverts.js
           doesn't own the click */
        case 'toggleHeaderServicesMenu': toggleHeaderServicesMenu(); break;
        case 'closeHeaderServicesMenu':  closeHeaderServicesMenu();  break;

        /* Simple header nav links */
        case 'headerNavHome':     scrollToSection('home');     break;
        case 'headerNavAbout':    scrollToSection('about');    break;
        case 'headerNavPartners': scrollToSection('partners'); break;

        case 'toggleNotifications': toggleNotifications(); break;
        case 'closeNotifications': closeNotifications(); break;
        case 'markAllRead': markAllRead(); break;

        case 'toggleCategory': toggleCategory(el); break;

        case 'openEntertainment': openEntertainment(); break;
        case 'closeEntertainment': closeEntertainment(); break;
        case 'openFrontendUpload': openUploadModal(false); break;
        case 'openBackendUpload': openUploadModal(true); break;
        case 'closeUploadModal': closeUploadModal(); break;

        case 'openEducation': openEducation(); break;
        case 'closeEducation': closeEducation(); break;
        case 'openTutorModal': openTutorModal(); break;
        case 'closeTutorModal': closeTutorModal(); break;
        case 'closeAboutInst': closeAboutInst(); break;
        case 'closeFeeModal': closeFeeModal(); break;
        case 'closeAppForm': closeAppForm(); break;
        case 'aboutApply': openAppForm(el?.dataset?.id || $('#aboutInstModal')?._instId); break;
        case 'aboutFees': openFeeModal(el?.dataset?.id || $('#aboutInstModal')?._instId); break;
        case 'applyFromFee': closeFeeModal(); openAppForm($('#feeModal')?._instId); break;

        case 'openETF': openETF(); break;
        case 'openLuSETrends': openETF(); setTimeout(renderLuSETrends, 300); break;
        case 'closeETF': closeETF(); break;
        case 'closeETFDetail': closeETFDetail(); break;
        case 'closePortfolio': closePortfolio(); break;
        case 'openPortfolio': closeETF(); openPortfolio(); break;
        case 'toggleWatch': toggleWatch(el.dataset.symbol); break;
        case 'openETFDetail': openETFDetail(el.dataset.symbol); break;

        case 'openBetting': openBetting(); break;
        case 'closeBet': closeBet(); break;
        case 'openBetPlace': openBetPlace(el.dataset.eventId); break;
        case 'openBetCompany': openBetCompany(el.dataset.eventId); break;
        case 'openBetGame': openBetGame(el.dataset.gameId); break;
        case 'closeBetPlace': closeBetPlace(); break;
        case 'closeBetCompany': closeBetCompany(); break;
        case 'closeBetGame': closeBetGame(); break;
        case 'closeBetHistory': closeBetHistory(); break;
        case 'openBetHistory': openBetHistory(); break;
        case 'cancelBetMatch': cancelBetMatch(); break;

        case 'openShareApplication': openShareApplication(); break;
        case 'closeShareApplication': closeShareApplication(); break;

        case 'openBecomePartner':  openBecomePartner();  break;
        case 'closeBecomePartner': closeBecomePartner(); break;

        case 'toggleAIChat': toggleAIChat(); break;
        case 'sendAIMessage': sendAIMessage(); break;

        case 'openAllServices': showToast('📋 All services catalog coming soon'); break;
        case 'showToast': showToast(el.dataset.msg || 'Action triggered'); break;

        default:
            break;
    }
}

/* ================================================================
   MODULE RESOLUTION HELPER
   ================================================================ */
function resolveModule(name) {
    if (typeof window !== 'undefined' && window[name]) return window[name];
    try {
        const found = (0, eval)(
            'typeof ' + name + ' !== "undefined" ? ' + name + ' : null'
        );
        return found || null;
    } catch (_) {
        return null;
    }
}

/* ================================================================
   EVENT BINDINGS
   ================================================================ */
function bindEvents() {
    /* ---- Global click dispatcher ---- */
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;

        const action = el.dataset.action;

        if (MODULE_ACTIONS.has(action)) return;

        handleAction(action, el);
    });

    /* ---- Service items without data-action show their price ---- */
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.service-item');
        if (!item || item.dataset.action) return;
        showToast(`📋 ${item.dataset.service} — From ZMW ${item.dataset.price}`);
    });

    // Sidebar toggle
    $('#sidebarToggleBtn')?.addEventListener('click', () => {
        if ($('#sidebar')?.classList.contains('open')) closeSidebar();
        else openSidebar();
    });
    $('#sidebarCloseBtn')?.addEventListener('click', closeSidebar);
    $('#sidebarOverlay')?.addEventListener('click', closeSidebar);

    // Sidebar nav links
    $$('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            $$('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            AppState.activeSection = link.dataset.section;
            closeSidebar();
        });
    });

    // Sidebar "ZBS-Stocks" link → open the share application modal
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action="openShareApplication"]');
        if (!a) return;
        /* Only act on links; buttons are handled by the dispatcher */
        if (a.tagName === 'A' && a.getAttribute('href') === '#share-application') {
            e.preventDefault();
            openShareApplication();
        }
    });

    // Search input
    $('#searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
    });
    $('#searchInput')?.addEventListener('input', (e) => {
        if (e.target.value.length > 2) performSearch();
    });

    // Login form
    $('#authForm')?.addEventListener('submit', handleLogin);

    /* ---- Share application ----
       FIX: HTML uses id="ZBS-StocksForm". Keep the legacy ID as a
       fallback in case an older template is still deployed. */
    const shareForm = $('#ZBS-StocksForm') || $('#shareApplicationForm');
    if (shareForm) shareForm.addEventListener('submit', handleShareApplication);
    $('#shareCancelBtn')?.addEventListener('click', closeShareApplication);
    $('#shareCompany')?.addEventListener('change', updateShareAmount);
    $('#shareQuantity')?.addEventListener('input', updateShareAmount);

    // Upload
    $('#uploadForm')?.addEventListener('submit', handleUpload);

    // Education
    $('#institutionAppForm')?.addEventListener('submit', handleInstitutionApp);
    $('#tutorForm')?.addEventListener('submit', handleTutorRequest);
    $('#eduRecordAddBtn')?.addEventListener('click', () => {
        const tbody = $('#eduRecordBody');
        if (!tbody) return;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" placeholder="Name" maxlength="120" /></td>
            <td><input type="text" placeholder="Level" maxlength="60" /></td>
            <td><input type="text" placeholder="Year" maxlength="10" /></td>
            <td><input type="text" placeholder="Certificate" maxlength="80" /></td>
        `;
        tbody.appendChild(row);
    });

    // ETF trade form
    $('#etfTradeForm')?.addEventListener('submit', handleTradeSubmit);
    $('#etfShareQty')?.addEventListener('input', updateTradeSummary);
    $$('.etf-trade-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentETFDetail.mode = tab.dataset.tradeMode;
            $$('.etf-trade-tab').forEach(t => t.classList.toggle('active', t === tab));
            updateTradeButton(currentETFDetail.mode);
            updateTradeSummary();
        });
    });
    $('#etfSearchInput')?.addEventListener('input', (e) => {
        renderETFExchanges(e.target.value);
    });

    // Betting
    $('#betPlaceConfirmBtn')?.addEventListener('click', confirmBetPlace);
    $('#betCompanyConfirmBtn')?.addEventListener('click', confirmBetCompany);
    $('#betGameConfirmBtn')?.addEventListener('click', confirmBetGame);
    $('#betCompanyAmount')?.addEventListener('input', updateCompanySummary);
    $$('.bet-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.closest('.bet-place-amount-row')?.querySelector('input');
            if (target) {
                target.value = btn.dataset.amount;
                if (target.id === 'betCompanyAmount') updateCompanySummary();
            }
        });
    });
    $$('.bet-opponent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.bet-opponent-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.opponent === 'friend') {
                $('#betGameLinkSection')?.removeAttribute('hidden');
            } else {
                $('#betGameLinkSection')?.setAttribute('hidden', '');
            }
        });
    });
    $('#betCopyLinkBtn')?.addEventListener('click', () => {
        const input = $('#betGameLinkInput');
        if (input) {
            input.select();
            navigator.clipboard?.writeText(input.value);
            showToast('📋 Link copied to clipboard!');
        }
    });

    // Bet tabs
    $$('.bet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.bet-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.bet-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.betTab));
        });
    });

    // Education tabs
    $$('.edu-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.edu-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.edu-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        });
    });

    // ETF tabs
    $$('.etf-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.etf-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.etf-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.etfTab));
        });
    });

    // Entertainment tabs
    $$('.ent-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.ent-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.ent-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        });
    });

    // Entertainment card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.ent-card');
        if (card && !e.target.closest('button')) {
            showToast('🎬 Playing: ' + (card.querySelector('.ent-card-title')?.textContent || 'content'));
        }
    });

    // Education card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.edu-card');
        if (!card) return;
        if (e.target.closest('.edu-card-action-btn')) return;
        const type = card.dataset.type;
        if (type === 'library') {
            const title = card.querySelector('.edu-card-title')?.textContent;
            showToast('📖 Opening: ' + title);
        } else if (type) {
            openAboutInst(card.dataset.id);
        }
    });

    // Footer menu category headers
    $$('.footer-menu-category-header').forEach(header => {
        header.addEventListener('click', () => {
            const target = header.dataset.target;
            const items = document.getElementById(target);
            if (!items) return;
            const isOpen = !items.hidden;
            items.hidden = isOpen;
            if (isOpen) items.setAttribute('hidden', '');
            else items.removeAttribute('hidden');
            header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
    });

    // AI suggestions
    $$('.suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.dataset.msg;
            if (msg) {
                const input = $('#chatInput');
                if (input) input.value = msg;
                sendAIMessage();
            }
        });
    });

    // Chat input enter
    $('#chatInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendAIMessage(); }
    });

    // Advert items
    $$('.advert-item').forEach(item => {
        item.addEventListener('click', () => {
            showToast(`📢 Promo: ${item.querySelector('.advert-text')?.textContent}`);
        });
    });

    // ESC to close topmost modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if ($('#becomePartnerModalOverlay')?.classList.contains('is-open')) { closeBecomePartner(); return; }
            if ($('#shareApplicationWrapper')?.classList.contains('active') &&
                getComputedStyle($('#shareApplicationWrapper')).position === 'fixed') { closeShareApplication(); return; }
            if ($('#aiChatModal')?.classList.contains('active')) { toggleAIChat(); return; }
            if ($('#searchOverlay')?.classList.contains('active')) { closeSearch(); return; }
            if ($('#loginModal')?.classList.contains('active')) { closeLoginModal(); return; }
            if ($('#entertainmentModal')?.classList.contains('active')) { closeEntertainment(); return; }
            if ($('#entUploadModal')?.classList.contains('active')) { closeUploadModal(); return; }
            if ($('#educationModal')?.classList.contains('active')) { closeEducation(); return; }
            if ($('#tutorModal')?.classList.contains('active')) { closeTutorModal(); return; }
            if ($('#aboutInstModal')?.classList.contains('active')) { closeAboutInst(); return; }
            if ($('#feeModal')?.classList.contains('active')) { closeFeeModal(); return; }
            if ($('#appFormModal')?.classList.contains('active')) { closeAppForm(); return; }
            if ($('#etfDetailModal')?.classList.contains('active')) { closeETFDetail(); return; }
            if ($('#etfPortfolioModal')?.classList.contains('active')) { closePortfolio(); return; }
            if ($('#etfModal')?.classList.contains('active')) { closeETF(); return; }
            if ($('#betPlaceModal')?.classList.contains('active')) { closeBetPlace(); return; }
            if ($('#betCompanyModal')?.classList.contains('active')) { closeBetCompany(); return; }
            if ($('#betGameModal')?.classList.contains('active')) { closeBetGame(); return; }
            if ($('#betHistoryModal')?.classList.contains('active')) { closeBetHistory(); return; }
            if ($('#betModal')?.classList.contains('active')) { closeBet(); return; }
            if ($('#headerServicesDropdown') && !$('#headerServicesDropdown').hidden) { closeHeaderServicesMenu(); return; }
            if ($('#sidebar')?.classList.contains('open')) { closeSidebar(); return; }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
    });

    $('#searchOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'searchOverlay') closeSearch();
    });
    $('#loginModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') closeLoginModal();
    });

    /* ---- Become a Partner modal ---- */
    const bpRoot = $('#becomePartnerModal');
    bpRoot?.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'becomePartnerForm') {
            handleBecomePartnerSubmit(e);
        }
    });
    bpRoot?.addEventListener('click', (e) => {
        if (e.target.closest('#becomePartnerModalClose, #bpFooterClose, #bpCancelBtn')) {
            closeBecomePartner();
        }
    });
    $('#becomePartnerModalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'becomePartnerModalOverlay') closeBecomePartner();
    });

    /* ---- Safety net: direct binding on .partner-btn ---- */
    $$('.partner-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            if (action === 'openBecomePartner') {
                e.preventDefault();
                e.stopPropagation();
                openBecomePartner();
            }
        }, true);
    });

    /* ============================================================
       SAFETY NETS FOR MODULE-ACTION BUTTONS  (v3.3.6)
       ============================================================ */
    const MODULE_FALLBACKS = {
        openMarketHub:        { mod: 'MarketHub',       method: 'open'  },
        closeMarketHub:       { mod: 'MarketHub',       method: 'close' },
        openFinancialHub:     { mod: 'FinancialHub',    method: 'open'  },
        closeFinancialHub:    { mod: 'FinancialHub',    method: 'close' },
        openAgricultureHub:   { mod: 'AgricultureHub',  method: 'open'  },
        closeAgricultureHub:  { mod: 'AgricultureHub',  method: 'close' },
        openConstructionHub:  { mod: 'ConstructionHub', method: 'open'  },
        closeConstructionHub: { mod: 'ConstructionHub', method: 'close' },
        openConsultationHub:  { mod: 'ConsultationHub', method: 'open'  },
        closeConsultation:    { mod: 'ConsultationHub', method: 'close' },
        openRentalHub:        { mod: 'RentalHub',       method: 'open'  },
        closeRentalHub:       { mod: 'RentalHub',       method: 'close' },
        openAdvertHub:        { mod: 'AdvertHub',       method: 'open'  },
        closeAdvertHub:       { mod: 'AdvertHub',       method: 'close' },
        openAgriPermit:       { mod: 'AgricultureHub',  method: 'openPermit' },
        openProHireHub:       { mod: 'ProHireHub',      method: 'open'  },
        openProHireVehicles:  { mod: 'ProHireHub',      method: 'openVehicles' }
    };

    Object.entries(MODULE_FALLBACKS).forEach(([action, { mod, method }]) => {
        $$(`[data-action="${action}"]`).forEach(btn => {
            if (btn.dataset.zbsFallback === '1') return;
            btn.dataset.zbsFallback = '1';

            btn.addEventListener('click', (e) => {
                const module = resolveModule(mod);

                // Module is loaded → let its own listener handle the click.
                if (module && typeof module[method] === 'function') {
                    return;
                }

                // Module is missing → run the built-in fallback.
                e.preventDefault();
                e.stopPropagation();
                switch (action) {
                    case 'openMarketHub':       openMarketHub(); break;
                    case 'openFinancialHub':    openFinancialHub(); break;
                    case 'openConsultationHub': openConsultationHub(); break;
                    case 'openConstructionHub': openConstructionHub(); break;
                    case 'openAgriPermit':      openAgriPermit(); break;
                    case 'openAdvertHub':       openAdvertHub(); break;
                    case 'openRentalHub':       openRentalHub(); break;
                    case 'openProHireHub':      openProHireHub(); break;
                    case 'openProHireVehicles': openProHireVehicles(); break;
                    default:
                        showToast(`⚠️ ${mod} not loaded — please refresh the page.`);
                        console.error(
                            `[ZBS] ${action}: ${mod}.${method}() is not available. ` +
                            `Check that the corresponding js/*.js hub script is loaded ` +
                            `(defer) and exposes a ${method}() method.`
                        );
                }
            }, true);
        });
    });
}

/* ================================================================
   INIT
   ================================================================ */
function init() {
    /* ---- State ---- */
    AppState.user = loadFromStorage(STORAGE_KEYS.user, null);
    AppState.wallet = loadFromStorage(STORAGE_KEYS.wallet, { currency: 'ZMW', balance: 0 });
    AppState.searchSeen = loadFromStorage(STORAGE_KEYS.searchSeen, false);
    AppState.entertainment = loadFromStorage(STORAGE_KEYS.entertainment, { cartoons: [], music: [], movies: [] });
    AppState.bets = loadFromStorage(STORAGE_KEYS.bets, { active: [], history: [], totalWon: 0 });
    AppState.etf.watchlist = loadFromStorage(STORAGE_KEYS.watchlist, []);
    AppState.etf.portfolio = loadFromStorage(STORAGE_KEYS.portfolio, {});

    /* ---- Seeds ---- */
    seedETFData();
    seedEntertainment();
    seedEducation();
    if (AppState.bets.active.length === 0 && AppState.bets.history.length === 0) {
        seedBetData();
    }

    /* ---- Snapshot Become-a-Partner markup ---- */
    snapshotBecomePartnerModal();

    /* ---- Partner system ---- */
    buildPartnerSlots();
    initPartnerModal();
    initPartnerSlots();

    /* ---- Share application modal ---- */
    initShareApplication();

    /* ---- Rest of the app ---- */
    updateAuthUI();
    initChatbotDrag();
    initChatModalDrag();
    initSocialHubResize();
    bindEvents();

    if (AppState.searchSeen) {
        const badge = $('#footerSearchBadge');
        if (badge) badge.style.display = 'none';
    }

    console.log('✅ ZBS App v3.3.7 initialised — LuSE trends charts active, all buttons responsive');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/* ==========================================================================
   ADVERT HUB — Zeroth Business Solutions
   Inline module. Handles free + paid advertising.
   Provides window.AdvertHub, window.openAdvertHub, window.closeAdvertHub.
   ========================================================================== */
(function () {
    'use strict';

    const LS_KEY = 'zbs_advert_hub_v1';

    function load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) { const f = seed(); localStorage.setItem(LS_KEY, JSON.stringify(f)); return f; }
            return JSON.parse(raw);
        } catch {
            const f = seed();
            try { localStorage.setItem(LS_KEY, JSON.stringify(f)); } catch {}
            return f;
        }
    }
    function save(data) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
    }
    function uid(p) {
        return (p || 'ad') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    }

    const TIERS = {
        free:   { id: 'free',   name: 'Free',   price: 0,   days: 7,   featured: false,
                  benefits: ['7-day listing', 'Standard placement', 'Up to 3 photos', 'Basic analytics'] },
        bronze: { id: 'bronze', name: 'Bronze', price: 50,  days: 30,  featured: false,
                  benefits: ['30-day listing', 'Highlighted card', 'Up to 5 photos', 'Basic analytics', 'Priority in search'] },
        silver: { id: 'silver', name: 'Silver', price: 150, days: 60,  featured: true,
                  benefits: ['60-day listing', 'Featured placement', 'Up to 10 photos', 'Full analytics', 'Search boost', 'Category top row'] },
        gold:   { id: 'gold',   name: 'Gold',   price: 400, days: 90,  featured: true,
                  benefits: ['90-day listing', 'Top of search', 'Unlimited photos', 'Full analytics', 'Home banner slot', 'Category pin', 'Social share'] }
    };

    const CATEGORIES = [
        { id: 'real-estate',  label: 'Real Estate',  icon: '🏠' },
        { id: 'vehicles',     label: 'Vehicles',     icon: '🚗' },
        { id: 'jobs',         label: 'Jobs',         icon: '💼' },
        { id: 'services',     label: 'Services',     icon: '🔧' },
        { id: 'products',     label: 'Products',     icon: '📦' },
        { id: 'agriculture',  label: 'Agriculture',  icon: '🌾' },
        { id: 'education',    label: 'Education',    icon: '🎓' },
        { id: 'events',       label: 'Events',       icon: '🎉' },
        { id: 'health',       label: 'Health',       icon: '🏥' },
        { id: 'technology',   label: 'Technology',   icon: '💻' },
        { id: 'beauty',       label: 'Beauty',       icon: '💄' },
        { id: 'other',        label: 'Other',        icon: '📌' }
    ];

    const PAY_METHODS = [
        { id: 'airtel', name: 'Airtel Money',  icon: '📱', cls: 'airtel' },
        { id: 'mtn',    name: 'MTN MoMo',      icon: '📱', cls: 'mtn' },
        { id: 'zamtel', name: 'Zamtel Money',  icon: '📱', cls: 'zamtel' },
        { id: 'bank',   name: 'Bank Transfer', icon: '🏦', cls: 'bank' },
        { id: 'card',   name: 'Card Payment',  icon: '💳', cls: 'card' }
    ];

    function seed() {
        const now = Date.now();
        const day = 86400000;
        const iso = d => new Date(now + d * day).toISOString();

        return {
            ads: [
                {
                    id: 'ad_seed1', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: '3BR House for Sale — Woodlands, Lusaka',
                    description: 'Spacious family home with mature garden, borehole, and 24/7 security. Situated on a 40x30 plot, close to international schools and shopping malls.',
                    category: 'real-estate', subcategory: 'For Sale',
                    price: 2500000, currency: 'ZMW', priceLabel: 'Negotiable',
                    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
                    contactName: 'Mr. Banda', contactPhone: '+260 97 000 1111', contactEmail: 'banda@example.com',
                    location: 'Woodlands Extension, Lusaka', city: 'Lusaka', province: 'Lusaka',
                    tier: 'gold', featured: true, status: 'active',
                    createdAt: iso(-3), expiresAt: iso(87), views: 342, clicks: 68
                },
                {
                    id: 'ad_seed2', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: 'Toyota Hilux 2019 — Low Mileage',
                    description: 'Well maintained Toyota Hilux double cab. 62,000 km, diesel, 4x4. Full service history. New tyres. Bank financing available.',
                    category: 'vehicles', subcategory: 'Cars',
                    price: 385000, currency: 'ZMW', priceLabel: '',
                    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
                    contactName: 'Chanda Motors', contactPhone: '+260 96 555 4433', contactEmail: 'sales@chandamotors.example',
                    location: 'Great East Road, Lusaka', city: 'Lusaka', province: 'Lusaka',
                    tier: 'silver', featured: true, status: 'active',
                    createdAt: iso(-5), expiresAt: iso(55), views: 189, clicks: 41
                },
                {
                    id: 'ad_seed3', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: 'Looking for a Sales Manager — FMCG',
                    description: 'Established FMCG distributor seeking a Sales Manager with 5+ years experience. Competitive salary + commission + car allowance.',
                    category: 'jobs', subcategory: 'Sales',
                    price: 0, currency: 'ZMW', priceLabel: 'Competitive',
                    image: '',
                    contactName: 'HR Department', contactPhone: '+260 97 111 2233', contactEmail: 'hr@fmcg.example',
                    location: 'Lusaka CBD', city: 'Lusaka', province: 'Lusaka',
                    tier: 'free', featured: false, status: 'active',
                    createdAt: iso(-2), expiresAt: iso(5), views: 78, clicks: 22
                },
                {
                    id: 'ad_seed4', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: 'Professional Web Design Services',
                    description: 'We build custom websites, e-commerce stores, and web apps for Zambian businesses. Starting from ZMW 3,500. Free consultation.',
                    category: 'services', subcategory: 'IT & Web',
                    price: 3500, currency: 'ZMW', priceLabel: 'From',
                    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80',
                    contactName: 'TechZed Solutions', contactPhone: '+260 95 777 1188', contactEmail: 'hello@techzed.example',
                    location: 'Remote — Nationwide', city: 'Lusaka', province: 'Lusaka',
                    tier: 'bronze', featured: false, status: 'active',
                    createdAt: iso(-1), expiresAt: iso(29), views: 45, clicks: 12
                },
                {
                    id: 'ad_seed5', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: 'Fresh Farm Eggs — Wholesale',
                    description: 'We supply fresh farm eggs in trays and crates. Bulk discounts. Free delivery within Lusaka for orders over 20 trays.',
                    category: 'agriculture', subcategory: 'Poultry',
                    price: 45, currency: 'ZMW', priceLabel: 'per tray',
                    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80',
                    contactName: 'Mwape Farms', contactPhone: '+260 97 222 4455', contactEmail: 'mwape@farms.example',
                    location: 'Chongwe', city: 'Lusaka', province: 'Lusaka',
                    tier: 'free', featured: false, status: 'active',
                    createdAt: iso(-4), expiresAt: iso(3), views: 120, clicks: 34
                },
                {
                    id: 'ad_seed6', ownerEmail: 'demo@zeroth.com', ownerName: 'Zeroth Demo',
                    title: 'Learn French Online — Free Trial',
                    description: 'Native French tutor offering online lessons for beginners and intermediate learners. First lesson free. Flexible scheduling.',
                    category: 'education', subcategory: 'Languages',
                    price: 250, currency: 'ZMW', priceLabel: 'per lesson',
                    image: '',
                    contactName: 'Marie Dubois', contactPhone: '+260 96 333 7766', contactEmail: 'marie@french.example',
                    location: 'Online', city: 'Lusaka', province: 'Lusaka',
                    tier: 'free', featured: false, status: 'active',
                    createdAt: iso(-6), expiresAt: iso(1), views: 56, clicks: 18
                }
            ],
            userAds: [],
            session: null
        };
    }

    let data = load();
    let activeDetailId = null;
    let activeTab = 'browse';
    let draft = null;
    let step = 1;
    let toastEl;
    let paymentInFlight = false;

    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    const fmt = n => 'ZMW ' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    function debounce(fn, wait) {
        let t;
        return function () {
            const args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(ctx, args), wait);
        };
    }

    function toast(msg, type) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'advert-toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.className = 'show ' + (type || '');
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    function catById(id) { return CATEGORIES.find(c => c.id === id) || { label: 'Other', icon: '📌' }; }
    function tierById(id) { return TIERS[id] || TIERS.free; }

    function getCurrentEmail() {
        if (data.session && data.session.email) return data.session.email;
        if (data.userAds && data.userAds.length) return data.userAds[0].ownerEmail;
        return 'guest_' + (localStorage.getItem('zbs_advert_guest_id') || (() => {
            const id = uid('guest'); localStorage.setItem('zbs_advert_guest_id', id); return id;
        })());
    }

    function allAds() {
        const userAds = data.userAds || [];
        const seedAds = data.ads || [];
        return [...userAds, ...seedAds];
    }
    function adById(id) { return allAds().find(a => a.id === id); }
    function isExpired(ad) { return ad.expiresAt && new Date(ad.expiresAt) < new Date(); }
    function isActive(ad) { return ad.status === 'active' && !isExpired(ad); }

    let fallbackScrollLocks = 0;
    function getScrollbarWidth() {
        return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    }
    function openModal(m, trigger) {
        if (window.ModalManager && typeof window.ModalManager.open === 'function') {
            window.ModalManager.open(m, { trigger: trigger });
            return;
        }
        if (!m || !m.hidden) return;
        m._trigger = trigger || document.activeElement;
        m.hidden = false;
        fallbackScrollLocks++;
        if (fallbackScrollLocks === 1) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = getScrollbarWidth() + 'px';
        }
    }
    function closeModal(m) {
        if (!m || m.hidden) return;
        if (window.ModalManager && typeof window.ModalManager.close === 'function') {
            window.ModalManager.close(m);
            return;
        }
        m.hidden = true;
        fallbackScrollLocks = Math.max(0, fallbackScrollLocks - 1);
        if (fallbackScrollLocks === 0) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        const t = m._trigger;
        if (t && typeof t.focus === 'function') { try { t.focus(); } catch (e) {} }
        m._trigger = null;
    }

    let modal, createModal, detailModal;

    function removeLegacyHtmlModal() {
        const legacy = document.getElementById('advertHubModal');
        if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    }

    function buildMainModal() {
        modal = document.createElement('div');
        modal.className = 'advert-hub-modal';
        modal.id = 'advertModal';
        modal.hidden = true;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'advertTitle');
        modal.innerHTML = `
            <div class="advert-hub-container">
                <header class="advert-hub-header">
                    <div class="advert-hub-header-title">
                        <i class="fas fa-bullhorn"></i>
                        <span id="advertTitle">Advert Hub</span>
                        <span class="advert-hub-badge">FREE</span>
                    </div>
                    <button class="window-close-btn" data-advert-close aria-label="Close">&times;</button>
                </header>
                <div class="advert-hub-banner">
                    <div class="advert-hub-banner-icon">📢</div>
                    <div class="advert-hub-banner-text">
                        <h3>Advertise to thousands of Zambians</h3>
                        <p>Post free ads instantly, or upgrade to Bronze, Silver, or Gold for maximum reach.</p>
                    </div>
                </div>
                <div class="advert-hub-tabs" role="tablist">
                    <button class="advert-hub-tab active" data-advert-tab="browse" role="tab"><i class="fas fa-search"></i> <span>Browse</span></button>
                    <button class="advert-hub-tab" data-advert-tab="categories" role="tab"><i class="fas fa-th-large"></i> <span>Categories</span></button>
                    <button class="advert-hub-tab" data-advert-tab="pricing" role="tab"><i class="fas fa-tags"></i> <span>Pricing</span></button>
                    <button class="advert-hub-tab" data-advert-tab="myads" role="tab"><i class="fas fa-user"></i> <span>My Ads</span> <span class="advert-hub-tab-count" id="advertMyCount">0</span></button>
                </div>
                <div class="advert-hub-panel active" data-advert-panel="browse" id="advertPanelBrowse"></div>
                <div class="advert-hub-panel" data-advert-panel="categories" id="advertPanelCategories"></div>
                <div class="advert-hub-panel" data-advert-panel="pricing" id="advertPanelPricing"></div>
                <div class="advert-hub-panel" data-advert-panel="myads" id="advertPanelMyAds"></div>
                <footer class="advert-hub-footer">
                    <span class="advert-hub-footer-note">
                        <i class="fas fa-shield-alt"></i>
                        Free ads always. Paid ads reviewed within 1 hour. No hidden charges.
                    </span>
                </footer>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) closeMain(); });
        modal.querySelector('[data-advert-close]').addEventListener('click', closeMain);
        $$('.advert-hub-tab', modal).forEach(t => {
            t.addEventListener('click', () => switchTab(t.dataset.advertTab));
        });
    }

    function buildCreateModal() {
        createModal = document.createElement('div');
        createModal.className = 'advert-hub-create-modal';
        createModal.id = 'advertCreateModal';
        createModal.hidden = true;
        createModal.setAttribute('role', 'dialog');
        createModal.setAttribute('aria-modal', 'true');
        createModal.setAttribute('aria-labelledby', 'advertCreateTitle');
        createModal.innerHTML = `
            <div class="advert-hub-create-container">
                <header class="advert-hub-create-header">
                    <div class="advert-hub-create-title" id="advertCreateTitle">
                        <i class="fas fa-plus-circle"></i>
                        <span>Post a New Ad</span>
                    </div>
                    <button class="window-close-btn" data-create-close aria-label="Close">&times;</button>
                </header>
                <div class="advert-hub-steps" id="advertSteps">
                    <div class="advert-hub-step active" data-step="1"><span class="advert-hub-step-num">1</span> Details</div>
                    <div class="advert-hub-step" data-step="2"><span class="advert-hub-step-num">2</span> Choose Plan</div>
                    <div class="advert-hub-step" data-step="3"><span class="advert-hub-step-num">3</span> Payment</div>
                </div>
                <div class="advert-hub-create-body" id="advertCreateBody"></div>
                <div class="advert-hub-create-actions" id="advertCreateActions"></div>
            </div>
        `;
        document.body.appendChild(createModal);
        createModal.addEventListener('click', e => { if (e.target === createModal) closeCreate(); });
        createModal.querySelector('[data-create-close]').addEventListener('click', closeCreate);
    }

    function buildDetailModal() {
        detailModal = document.createElement('div');
        detailModal.className = 'advert-hub-detail-modal';
        detailModal.id = 'advertDetailModal';
        detailModal.hidden = true;
        detailModal.setAttribute('role', 'dialog');
        detailModal.setAttribute('aria-modal', 'true');
        detailModal.setAttribute('aria-labelledby', 'advertDetailTitle');
        detailModal.innerHTML = `
            <div class="advert-hub-detail-container">
                <header class="advert-hub-detail-header">
                    <button class="advert-hub-detail-back" data-detail-close aria-label="Back"><i class="fas fa-arrow-left"></i></button>
                    <div class="advert-hub-detail-header-text">
                        <span class="advert-hub-detail-cat" id="advertDetailCat">Category</span>
                        <h2 id="advertDetailTitle">Ad Title</h2>
                    </div>
                    <button class="window-close-btn" data-detail-close aria-label="Close">&times;</button>
                </header>
                <div class="advert-hub-detail-body" id="advertDetailBody"></div>
                <footer class="advert-hub-detail-actions" id="advertDetailActions"></footer>
            </div>
        `;
        document.body.appendChild(detailModal);
        detailModal.addEventListener('click', e => { if (e.target === detailModal) closeDetail(); });
        $$('[data-detail-close]', detailModal).forEach(b => b.addEventListener('click', closeDetail));
    }

    function openMain(tab) {
        if (!modal) buildMainModal();
        openModal(modal);
        switchTab(tab || activeTab || 'browse');
    }
    function closeMain() {
        if (!modal) return;
        closeModal(modal);
    }

    function switchTab(name) {
        activeTab = name;
        if (!modal) return;
        $$('.advert-hub-tab', modal).forEach(t => {
            const on = t.dataset.advertTab === name;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $$('.advert-hub-panel', modal).forEach(p => {
            p.classList.toggle('active', p.dataset.advertPanel === name);
        });
        if (name === 'browse')      renderBrowse();
        if (name === 'categories')  renderCategories();
        if (name === 'pricing')     renderPricing();
        if (name === 'myads')       renderMyAds();
        updateMyCount();
    }

    function updateMyCount() {
        const count = (data.userAds || []).length;
        const el = document.getElementById('advertMyCount');
        if (el) el.textContent = count;
    }

    function renderBrowse() {
        const el = document.getElementById('advertPanelBrowse');
        if (!el) return;
        el.innerHTML = `
            <div class="advert-hub-actions">
                <div class="advert-hub-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="advertSearchInput" placeholder="Search ads..." autocomplete="off" />
                </div>
                <select class="advert-hub-select" id="advertCategoryFilter">
                    <option value="">All Categories</option>
                    ${CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
                </select>
                <select class="advert-hub-select" id="advertCityFilter"><option value="">All Locations</option></select>
                <select class="advert-hub-select" id="advertSortFilter">
                    <option value="newest">Newest First</option>
                    <option value="featured">Featured First</option>
                    <option value="popular">Most Viewed</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                </select>
                <button class="advert-hub-btn advert-hub-btn-outline" data-advert-clear><i class="fas fa-times"></i> Clear</button>
                <button class="advert-hub-btn advert-hub-btn-primary" data-advert-new style="flex:0 0 auto;"><i class="fas fa-plus"></i> Post Ad</button>
            </div>
            <div class="advert-hub-results-head">
                <h4><i class="fas fa-list"></i> All Ads</h4>
                <span class="advert-hub-results-count" id="advertResultsCount">0</span>
            </div>
            <div class="advert-hub-grid" id="advertGrid"></div>
            <div class="advert-hub-empty" id="advertEmpty">
                <i class="fas fa-bullhorn"></i>
                <p>No ads match your filters.</p>
                <small>Try clearing filters or post your own ad.</small>
            </div>
        `;
        const cities = [...new Set(allAds().map(a => a.city).filter(Boolean))].sort();
        const citySel = document.getElementById('advertCityFilter');
        cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            citySel.appendChild(opt);
        });
        const apply = renderBrowseGrid;
        const debouncedApply = debounce(apply, 150);
        document.getElementById('advertSearchInput')?.addEventListener('input', debouncedApply);
        ['advertCategoryFilter','advertCityFilter','advertSortFilter'].forEach(id => {
            const inp = document.getElementById(id);
            if (inp) inp.addEventListener('change', apply);
        });
        el.querySelector('[data-advert-clear]').addEventListener('click', () => {
            ['advertSearchInput','advertCategoryFilter','advertCityFilter','advertSortFilter'].forEach(id => {
                const inp = document.getElementById(id);
                if (inp) inp.value = id === 'advertSortFilter' ? 'newest' : '';
            });
            apply();
        });
        el.querySelector('[data-advert-new]').addEventListener('click', () => openCreate());
        renderBrowseGrid();
    }

    function renderBrowseGrid() {
        const grid = document.getElementById('advertGrid');
        const empty = document.getElementById('advertEmpty');
        const count = document.getElementById('advertResultsCount');
        if (!grid) return;
        const q = (document.getElementById('advertSearchInput') || {}).value?.trim().toLowerCase() || '';
        const cat = (document.getElementById('advertCategoryFilter') || {}).value || '';
        const city = (document.getElementById('advertCityFilter') || {}).value || '';
        const sort = (document.getElementById('advertSortFilter') || {}).value || 'newest';

        let results = allAds().filter(isActive);
        if (q) {
            const hay = (a) => (a.title + ' ' + a.description + ' ' + a.city + ' ' + (a.subcategory || '')).toLowerCase();
            results = results.filter(a => hay(a).includes(q));
        }
        if (cat) results = results.filter(a => a.category === cat);
        if (city) results = results.filter(a => a.city === city);

        if (sort === 'featured')       results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        else if (sort === 'popular')   results.sort((a, b) => (b.views || 0) - (a.views || 0));
        else if (sort === 'price-asc') results.sort((a, b) => (a.price || 0) - (b.price || 0));
        else if (sort === 'price-desc')results.sort((a, b) => (b.price || 0) - (a.price || 0));
        else                            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (count) count.textContent = results.length;
        if (!results.length) {
            grid.innerHTML = '';
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;
        grid.innerHTML = results.map(cardHTML).join('');
        grid.querySelectorAll('.advert-hub-card').forEach(c => {
            c.addEventListener('click', () => openDetail(c.dataset.adId));
        });
    }

    function cardHTML(a) {
        const cat = catById(a.category);
        const tier = tierById(a.tier);
        const priceHtml = a.price > 0
            ? `<span class="advert-hub-card-price">${fmt(a.price)}${a.priceLabel ? ' <small>' + esc(a.priceLabel) + '</small>' : ''}</span>`
            : (a.priceLabel ? `<span class="advert-hub-card-price" style="font-size:0.85rem;">${esc(a.priceLabel)}</span>` : '<span></span>');
        return `
            <article class="advert-hub-card ${a.featured ? 'featured' : ''}" data-ad-id="${esc(a.id)}" tabindex="0" role="button" aria-label="${esc(a.title)}">
                <div class="advert-hub-card-img">
                    ${a.image
                        ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"
                                onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<i class=\\'fas fa-image\\'></i>')" />`
                        : `<i class="fas fa-image"></i>`}
                </div>
                <span class="advert-hub-card-tier-badge ${esc(a.tier)}">${esc(tier.name)}</span>
                <div class="advert-hub-card-body">
                    <span class="advert-hub-card-cat">${esc(cat.icon)} ${esc(cat.label)}</span>
                    <h4 class="advert-hub-card-title">${esc(a.title)}</h4>
                    <p class="advert-hub-card-desc">${esc(a.description.slice(0, 110))}${a.description.length > 110 ? '…' : ''}</p>
                    <div class="advert-hub-card-meta">
                        ${priceHtml}
                        <span><i class="fas fa-map-marker-alt"></i> ${esc(a.location || a.city || '—')}</span>
                    </div>
                </div>
            </article>
        `;
    }

    function renderCategories() {
        const el = document.getElementById('advertPanelCategories');
        if (!el) return;
        const all = allAds().filter(isActive);
        el.innerHTML = `
            <div class="advert-hub-results-head">
                <h4><i class="fas fa-th-large"></i> Browse by Category</h4>
                <span class="advert-hub-results-count">${all.length} active ads</span>
            </div>
            <div class="advert-hub-grid" id="advertCategoryGrid"></div>
        `;
        const grid = document.getElementById('advertCategoryGrid');
        grid.innerHTML = CATEGORIES.map(c => {
            const count = all.filter(a => a.category === c.id).length;
            return `
                <div class="advert-hub-card" data-cat="${esc(c.id)}" style="cursor:pointer;" tabindex="0" role="button">
                    <div class="advert-hub-card-img">
                        <div class="advert-hub-card-media-placeholder" style="font-size:2.8rem;">${esc(c.icon)}</div>
                    </div>
                    <div class="advert-hub-card-body">
                        <h4 class="advert-hub-card-title">${esc(c.label)}</h4>
                        <p class="advert-hub-card-desc">${count} active ad${count === 1 ? '' : 's'}</p>
                        <div class="advert-hub-card-meta">
                            <span class="advert-hub-card-price" style="font-size:0.85rem;">View ads →</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        grid.querySelectorAll('[data-cat]').forEach(card => {
            card.addEventListener('click', () => {
                switchTab('browse');
                const catSel = document.getElementById('advertCategoryFilter');
                if (catSel) { catSel.value = card.dataset.cat; renderBrowseGrid(); }
            });
        });
    }

    function renderPricing() {
        const el = document.getElementById('advertPanelPricing');
        if (!el) return;
        const order = ['free', 'bronze', 'silver', 'gold'];
        el.innerHTML = `
            <div class="advert-hub-results-head">
                <h4><i class="fas fa-tags"></i> Choose Your Plan</h4>
                <span class="advert-hub-results-count">Start free · Upgrade anytime</span>
            </div>
            <div class="advert-hub-pricing-grid">
                ${order.map(id => tierCardHTML(TIERS[id])).join('')}
            </div>
            <div class="advert-hub-preview-head" style="margin-top:20px;">
                <strong>💡 Need a custom ad package?</strong>
                Contact us at <a href="mailto:ads@zeroth.com" style="color:#1e40af;font-weight:700;">ads@zeroth.com</a>
                or call <strong>+260 97 905 2929</strong> for volume discounts, homepage takeovers, and long-term campaigns.
            </div>
        `;
        el.querySelectorAll('[data-tier-choose]').forEach(btn => {
            btn.addEventListener('click', () => openCreate(btn.dataset.tierChoose));
        });
    }

    function tierCardHTML(t) {
        const featured = t.id === 'silver';
        return `
            <div class="advert-hub-price-card tier-${t.id} ${featured ? 'featured-plan' : ''}">
                <div class="advert-hub-price-tier">${esc(t.name)}</div>
                <div class="advert-hub-price-amount">
                    ${t.price === 0 ? 'FREE' : fmt(t.price)}
                    <small>${t.days}-day listing</small>
                </div>
                <ul class="advert-hub-price-features">
                    ${t.benefits.map(b => `<li><i class="fas fa-check-circle"></i> ${esc(b)}</li>`).join('')}
                </ul>
                <button class="advert-hub-price-btn ${t.price === 0 ? 'outline' : 'primary'}"
                        data-tier-choose="${esc(t.id)}">
                    ${t.price === 0 ? 'Post Free Ad' : 'Choose ' + t.name}
                </button>
            </div>
        `;
    }

    function renderMyAds() {
        const el = document.getElementById('advertPanelMyAds');
        if (!el) return;
        const email = getCurrentEmail();
        const mine = (data.userAds || []).filter(a => a.ownerEmail === email);
        const totalViews = mine.reduce((s, a) => s + (a.views || 0), 0);
        const totalClicks = mine.reduce((s, a) => s + (a.clicks || 0), 0);
        const activeCount = mine.filter(isActive).length;

        el.innerHTML = `
            <div class="advert-hub-stats-row">
                <div class="advert-hub-stat-card"><p>Total Ads</p><strong>${mine.length}</strong></div>
                <div class="advert-hub-stat-card"><p>Active</p><strong>${activeCount}</strong></div>
                <div class="advert-hub-stat-card"><p>Total Views</p><strong>${totalViews}</strong></div>
                <div class="advert-hub-stat-card"><p>Total Clicks</p><strong>${totalClicks}</strong></div>
            </div>
            <div class="advert-hub-results-head">
                <h4><i class="fas fa-user"></i> My Ads</h4>
                <button class="advert-hub-btn advert-hub-btn-primary" data-advert-new style="flex:0 0 auto;">
                    <i class="fas fa-plus"></i> Post New Ad
                </button>
            </div>
            <div class="advert-hub-my-ads" id="advertMyList"></div>
            <div class="advert-hub-empty" id="advertMyEmpty">
                <i class="fas fa-bullhorn"></i>
                <p>You haven't posted any ads yet.</p>
                <small>Tap "Post New Ad" above to get started — it's free!</small>
            </div>
        `;
        const list = document.getElementById('advertMyList');
        const empty = document.getElementById('advertMyEmpty');
        el.querySelector('[data-advert-new]')?.addEventListener('click', () => openCreate());

        if (!mine.length) { list.innerHTML = ''; empty.hidden = false; return; }
        empty.hidden = true;

        const sorted = [...mine].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        list.innerHTML = sorted.map(a => {
            const status = isExpired(a) ? 'expired' : a.status;
            const daysLeft = Math.max(0, Math.ceil((new Date(a.expiresAt) - Date.now()) / 86400000));
            return `
                <div class="advert-hub-my-row">
                    <div style="flex:1;min-width:0;">
                        <h4>${esc(a.title)}</h4>
                        <p>${esc(catById(a.category).icon)} ${esc(catById(a.category).label)} · ${esc(tierById(a.tier).name)} tier · ${esc(a.city || a.location || '—')}</p>
                        <p class="meta">
                            Posted ${esc(fmtDate(a.createdAt))} · ${status === 'active' ? daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left' : 'Expired'}
                            · 👁 ${a.views || 0} views · 🖱 ${a.clicks || 0} clicks
                        </p>
                    </div>
                    <div class="advert-hub-my-actions">
                        <span class="advert-hub-status-pill ${esc(status)}">${esc(status)}</span>
                        <button class="advert-hub-btn advert-hub-btn-outline" data-view="${esc(a.id)}"><i class="fas fa-eye"></i> View</button>
                        <button class="advert-hub-btn advert-hub-btn-outline" data-boost="${esc(a.id)}"><i class="fas fa-rocket"></i> Boost</button>
                        <button class="advert-hub-btn advert-hub-btn-outline" style="color:#b91c1c;border-color:#fecaca;" data-delete="${esc(a.id)}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        list.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openDetail(b.dataset.view)));
        list.querySelectorAll('[data-boost]').forEach(b => {
            b.addEventListener('click', () => {
                const ad = adById(b.dataset.boost);
                if (!ad) return;
                openCreate(ad.tier, ad);
            });
        });
        list.querySelectorAll('[data-delete]').forEach(b => {
            b.addEventListener('click', () => {
                if (!confirm('Delete this ad permanently?')) return;
                data.userAds = data.userAds.filter(x => x.id !== b.dataset.delete);
                save(data);
                renderMyAds();
                updateMyCount();
                toast('Ad deleted');
            });
        });
    }

    function openCreate(preselectTier, existingAd) {
        if (!createModal) buildCreateModal();
        draft = existingAd
            ? { ...existingAd, _boosting: true }
            : {
                ownerEmail: getCurrentEmail(), ownerName: '',
                title: '', description: '', category: '', subcategory: '',
                price: '', currency: 'ZMW', priceLabel: '', image: '',
                contactName: '', contactPhone: '', contactEmail: '',
                location: '', city: '', province: '',
                tier: preselectTier || 'free', payMethod: '', _new: true
            };
        if (preselectTier) draft.tier = preselectTier;
        step = 1;
        paymentInFlight = false;
        openModal(createModal);
        renderStep();
    }
    function closeCreate() {
        if (!createModal) return;
        if (paymentInFlight) { toast('Payment in progress — please wait', 'warning'); return; }
        closeModal(createModal);
        draft = null;
        step = 1;
    }
    function renderStep() {
        const body = document.getElementById('advertCreateBody');
        const actions = document.getElementById('advertCreateActions');
        $$('.advert-hub-step', createModal).forEach(s => {
            const n = Number(s.dataset.step);
            s.classList.toggle('active', n === step);
            s.classList.toggle('done', n < step);
        });
        if (step === 1) renderStep1(body, actions);
        if (step === 2) renderStep2(body, actions);
        if (step === 3) renderStep3(body, actions);
    }

    function renderStep1(body, actions) {
        const isBoost = !!draft._boosting;
        body.innerHTML = `
            <div class="advert-hub-preview-head">
                <strong>💡 Tip:</strong> Ads with a clear photo get 5× more views. A descriptive title and detailed description build trust.
            </div>
            <div class="advert-hub-form-group full">
                <label>Ad Title <span class="req">*</span></label>
                <input type="text" id="adTitle" maxlength="100" placeholder="e.g. 3BR House for Sale in Woodlands" value="${esc(draft.title || '')}" ${isBoost ? 'readonly' : ''} />
                <span class="advert-hub-char-count" id="adTitleCount">0 / 100</span>
            </div>
            <div class="advert-hub-form-row">
                <div class="advert-hub-form-group">
                    <label>Category <span class="req">*</span></label>
                    <select id="adCategory" ${isBoost ? 'disabled' : ''}>
                        <option value="">Select category</option>
                        ${CATEGORIES.map(c => `<option value="${c.id}" ${draft.category === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.label)}</option>`).join('')}
                    </select>
                </div>
                <div class="advert-hub-form-group">
                    <label>Sub-category</label>
                    <input type="text" id="adSubcategory" maxlength="60" placeholder="e.g. For Sale, Services, Full-time" value="${esc(draft.subcategory || '')}" ${isBoost ? 'readonly' : ''} />
                </div>
            </div>
            <div class="advert-hub-form-group full">
                <label>Description <span class="req">*</span></label>
                <textarea id="adDescription" rows="5" maxlength="1500" placeholder="Describe your ad — what you're offering, key features, condition, availability..." ${isBoost ? 'readonly' : ''}>${esc(draft.description || '')}</textarea>
                <span class="advert-hub-char-count" id="adDescCount">0 / 1500</span>
            </div>
            <div class="advert-hub-image-picker">
                <div class="advert-hub-image-drop" id="adImageDrop">
                    <i class="fas fa-image"></i>
                    <p>Add a photo or <span style="color:#ea580c;text-decoration:underline;">browse files</span></p>
                    <small>JPG, PNG, WEBP — max 5 MB. Or paste an image URL below.</small>
                    <input type="file" id="adImageFile" accept="image/*" hidden />
                </div>
                <div class="advert-hub-form-group full" style="margin-top:6px;">
                    <input type="url" id="adImageUrl" placeholder="https://..." value="${esc(draft.image && !draft.image.startsWith('data:') ? draft.image : '')}" />
                </div>
                <div class="advert-hub-image-preview" id="adImagePreview" ${draft.image ? '' : 'hidden'}>
                    <img id="adImagePreviewImg" src="${esc(draft.image || '')}" alt="Preview" />
                    <button type="button" class="advert-hub-image-remove" id="adImageRemove">&times;</button>
                </div>
            </div>
            <div class="advert-hub-form-row">
                <div class="advert-hub-form-group">
                    <label>Price (ZMW)</label>
                    <input type="number" id="adPrice" min="0" step="50" placeholder="0 for negotiable/contact" value="${draft.price || ''}" />
                </div>
                <div class="advert-hub-form-group">
                    <label>Price Label</label>
                    <input type="text" id="adPriceLabel" maxlength="30" placeholder="e.g. Negotiable, From, per unit" value="${esc(draft.priceLabel || '')}" />
                </div>
            </div>
            <div class="advert-hub-form-row three">
                <div class="advert-hub-form-group">
                    <label>Location / Area</label>
                    <input type="text" id="adLocation" maxlength="100" placeholder="e.g. Kabulonga, Lusaka" value="${esc(draft.location || '')}" />
                </div>
                <div class="advert-hub-form-group">
                    <label>City</label>
                    <input type="text" id="adCity" maxlength="60" placeholder="Lusaka" value="${esc(draft.city || '')}" />
                </div>
                <div class="advert-hub-form-group">
                    <label>Province</label>
                    <select id="adProvince">
                        <option value="">Select</option>
                        ${['Lusaka','Copperbelt','Central','Southern','Eastern','Western','Northern','Muchinga','Luapula','North-Western']
                            .map(p => `<option ${draft.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="advert-hub-form-row three">
                <div class="advert-hub-form-group">
                    <label>Contact Name <span class="req">*</span></label>
                    <input type="text" id="adContactName" maxlength="80" placeholder="Your name or business" value="${esc(draft.contactName || '')}" required />
                </div>
                <div class="advert-hub-form-group">
                    <label>Phone <span class="req">*</span></label>
                    <input type="tel" id="adContactPhone" maxlength="40" placeholder="+260 97 000 0000" value="${esc(draft.contactPhone || '')}" required />
                </div>
                <div class="advert-hub-form-group">
                    <label>Email</label>
                    <input type="email" id="adContactEmail" maxlength="120" placeholder="you@email.com" value="${esc(draft.contactEmail || '')}" />
                </div>
            </div>
            <div class="advert-hub-status error" id="adStep1Error" hidden></div>
        `;
        actions.innerHTML = `
            <button type="button" class="advert-hub-btn advert-hub-btn-outline" data-create-cancel>Cancel</button>
            <button type="button" class="advert-hub-btn advert-hub-btn-primary" id="adNextStep">Continue → Choose Plan</button>
        `;

        const titleEl = document.getElementById('adTitle');
        const descEl = document.getElementById('adDescription');
        const titleCount = document.getElementById('adTitleCount');
        const descCount = document.getElementById('adDescCount');
        const upd = () => {
            if (titleCount) titleCount.textContent = titleEl.value.length + ' / 100';
            if (descCount) descCount.textContent = descEl.value.length + ' / 1500';
        };
        titleEl.addEventListener('input', upd);
        descEl.addEventListener('input', upd);
        upd();

        const drop = document.getElementById('adImageDrop');
        const fileInput = document.getElementById('adImageFile');
        const urlInput = document.getElementById('adImageUrl');
        const preview = document.getElementById('adImagePreview');
        const previewImg = document.getElementById('adImagePreviewImg');
        const removeBtn = document.getElementById('adImageRemove');
        const setImage = (src) => {
            draft.image = src || '';
            if (src) { previewImg.src = src; preview.hidden = false; }
            else { preview.hidden = true; previewImg.src = ''; }
        };
        drop.addEventListener('click', () => fileInput.click());
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragging'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
        drop.addEventListener('drop', e => {
            e.preventDefault(); drop.classList.remove('dragging');
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) handleImageFile(f);
        });
        fileInput.addEventListener('change', () => {
            const f = fileInput.files && fileInput.files[0];
            if (f) handleImageFile(f);
        });
        urlInput.addEventListener('change', () => setImage(urlInput.value.trim()));
        removeBtn.addEventListener('click', () => { setImage(''); fileInput.value = ''; urlInput.value = ''; });
        function handleImageFile(file) {
            if (!file.type.startsWith('image/')) return toast('Please choose an image file', 'error');
            if (file.size > 5 * 1024 * 1024) return toast('Image too large (max 5 MB)', 'error');
            const reader = new FileReader();
            reader.onload = () => { setImage(reader.result); };
            reader.readAsDataURL(file);
        }
        actions.querySelector('[data-create-cancel]').addEventListener('click', closeCreate);
        document.getElementById('adNextStep').addEventListener('click', () => {
            if (!validateStep1()) return;
            collectStep1();
            step = 2;
            renderStep();
        });
    }

    function validateStep1() {
        const title = document.getElementById('adTitle').value.trim();
        const cat = document.getElementById('adCategory').value;
        const desc = document.getElementById('adDescription').value.trim();
        const contactName = document.getElementById('adContactName').value.trim();
        const contactPhone = document.getElementById('adContactPhone').value.trim();
        const err = document.getElementById('adStep1Error');
        const fail = (msg) => {
            err.textContent = msg;
            err.hidden = false;
            err.className = 'advert-hub-status error';
        };
        err.hidden = true;
        if (title.length < 5) return fail('Title must be at least 5 characters.'), false;
        if (!cat) return fail('Please choose a category.'), false;
        if (desc.length < 20) return fail('Description must be at least 20 characters.'), false;
        if (!contactName) return fail('Contact name is required.'), false;
        if (!contactPhone) return fail('Contact phone is required.'), false;
        return true;
    }
    function collectStep1() {
        draft.title = document.getElementById('adTitle').value.trim();
        draft.category = document.getElementById('adCategory').value;
        draft.subcategory = document.getElementById('adSubcategory').value.trim();
        draft.description = document.getElementById('adDescription').value.trim();
        draft.price = Number(document.getElementById('adPrice').value || 0);
        draft.priceLabel = document.getElementById('adPriceLabel').value.trim();
        draft.location = document.getElementById('adLocation').value.trim();
        draft.city = document.getElementById('adCity').value.trim();
        draft.province = document.getElementById('adProvince').value;
        draft.contactName = document.getElementById('adContactName').value.trim();
        draft.contactPhone = document.getElementById('adContactPhone').value.trim();
        draft.contactEmail = document.getElementById('adContactEmail').value.trim();
    }

    function renderStep2(body, actions) {
        const order = ['free', 'bronze', 'silver', 'gold'];
        body.innerHTML = `
            <div class="advert-hub-preview-head">
                <strong>📢 Choose how you want your ad to be seen.</strong>
                Start free, or upgrade for more reach, more days, and featured placement.
            </div>
            <div class="advert-hub-tier-select">
                ${order.map(id => {
                    const t = TIERS[id];
                    const selected = draft.tier === id;
                    return `
                        <button type="button" class="advert-hub-tier-option ${selected ? 'selected' : ''}" data-tier="${esc(id)}">
                            <div class="tier-name">${esc(t.name)}</div>
                            <div class="tier-price">
                                ${t.price === 0 ? 'FREE' : fmt(t.price)}
                                <small>${t.days}-day listing</small>
                            </div>
                            <div class="tier-duration">${t.featured ? '★ Featured placement' : 'Standard placement'}</div>
                            <ul class="tier-bullets">
                                ${t.benefits.slice(0, 4).map(b => `<li><i class="fas fa-check"></i> ${esc(b)}</li>`).join('')}
                            </ul>
                        </button>
                    `;
                }).join('')}
            </div>
            <div class="advert-hub-review" style="margin-top:16px;">
                <div class="advert-hub-review-row"><span>Selected Plan</span><span id="adReviewTierName">${esc(tierById(draft.tier).name)}</span></div>
                <div class="advert-hub-review-row"><span>Duration</span><span id="adReviewDuration">${tierById(draft.tier).days} days</span></div>
                <div class="advert-hub-review-row total"><span>Total</span><span id="adReviewTotal">${tierById(draft.tier).price === 0 ? 'FREE' : fmt(tierById(draft.tier).price)}</span></div>
            </div>
            <div class="advert-hub-status error" id="adStep2Error" hidden></div>
        `;
        actions.innerHTML = `
            <button type="button" class="advert-hub-btn advert-hub-btn-outline" data-back-step>← Back</button>
            <button type="button" class="advert-hub-btn advert-hub-btn-primary" id="adNextStep2">
                ${tierById(draft.tier).price === 0 ? 'Publish Free Ad' : 'Continue to Payment'} →
            </button>
        `;
        body.querySelectorAll('[data-tier]').forEach(btn => {
            btn.addEventListener('click', () => {
                draft.tier = btn.dataset.tier;
                body.querySelectorAll('[data-tier]').forEach(b => b.classList.toggle('selected', b === btn));
                const t = tierById(draft.tier);
                document.getElementById('adReviewTierName').textContent = t.name;
                document.getElementById('adReviewDuration').textContent = t.days + ' days';
                document.getElementById('adReviewTotal').textContent = t.price === 0 ? 'FREE' : fmt(t.price);
                document.getElementById('adNextStep2').innerHTML = t.price === 0
                    ? 'Publish Free Ad →'
                    : 'Continue to Payment →';
            });
        });
        actions.querySelector('[data-back-step]').addEventListener('click', () => {
            step = 1; renderStep();
        });
        document.getElementById('adNextStep2').addEventListener('click', () => {
            const t = tierById(draft.tier);
            if (t.price === 0) publishAd('free');
            else { step = 3; renderStep(); }
        });
    }

    function renderStep3(body, actions) {
        const t = tierById(draft.tier);
        body.innerHTML = `
            <div class="advert-hub-preview-head">
                <strong>🔒 Secure payment.</strong>
                Choose your preferred payment method. You'll receive an SMS/email confirmation once payment is received.
            </div>
            <div class="advert-hub-review">
                <div class="advert-hub-review-row"><span>Ad Title</span><span>${esc(draft.title)}</span></div>
                <div class="advert-hub-review-row"><span>Plan</span><span>${esc(t.name)} — ${t.days} days</span></div>
                <div class="advert-hub-review-row"><span>Category</span><span>${esc(catById(draft.category).icon)} ${esc(catById(draft.category).label)}</span></div>
                <div class="advert-hub-review-row total"><span>Total</span><span>${fmt(t.price)}</span></div>
            </div>
            <label style="font-size:0.82rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Payment Method</label>
            <div class="advert-hub-pay-methods" id="adPayMethods">
                ${PAY_METHODS.map(m => `
                    <button type="button" class="advert-hub-pay-method" data-method="${esc(m.id)}">
                        <span class="advert-hub-pay-method-logo ${esc(m.cls)}">${esc(m.icon)}</span>
                        <span>${esc(m.name)}</span>
                    </button>
                `).join('')}
            </div>
            <div class="advert-hub-form-group full" id="adPayDetailsWrap" hidden>
                <label id="adPayDetailsLabel">Payment Reference / Phone</label>
                <input type="text" id="adPayDetails" placeholder="" maxlength="60" />
                <small id="adPayDetailsHint"></small>
            </div>
            <div class="advert-hub-status error" id="adStep3Error" hidden></div>
        `;
        actions.innerHTML = `
            <button type="button" class="advert-hub-btn advert-hub-btn-outline" data-back-step>← Back</button>
            <button type="button" class="advert-hub-btn advert-hub-btn-primary" id="adPayConfirm" disabled>
                Pay ${fmt(t.price)} & Publish
            </button>
        `;
        const payDetailsWrap = document.getElementById('adPayDetailsWrap');
        const payDetailsLabel = document.getElementById('adPayDetailsLabel');
        const payDetailsInput = document.getElementById('adPayDetails');
        const payDetailsHint = document.getElementById('adPayDetailsHint');
        const confirm = document.getElementById('adPayConfirm');
        const methodMeta = {
            airtel: { label: 'Airtel Money Phone Number', hint: 'You will receive a prompt to approve.', placeholder: '+260 97 000 0000' },
            mtn:    { label: 'MTN MoMo Phone Number',     hint: 'You will receive a prompt to approve.', placeholder: '+260 96 000 0000' },
            zamtel: { label: 'Zamtel Money Phone Number', hint: 'You will receive a prompt to approve.', placeholder: '+260 95 000 0000' },
            bank:   { label: 'Bank Transfer Reference',   hint: 'We will email you bank details.',        placeholder: 'e.g. your company name' },
            card:   { label: 'Card Number (last 4)',      hint: 'You will be redirected to a secure page.', placeholder: '•••• 1234' }
        };
        body.querySelectorAll('[data-method]').forEach(btn => {
            btn.addEventListener('click', () => {
                draft.payMethod = btn.dataset.method;
                body.querySelectorAll('[data-method]').forEach(b => b.classList.toggle('selected', b === btn));
                const meta = methodMeta[draft.payMethod] || { label: 'Reference', hint: '', placeholder: '' };
                payDetailsLabel.textContent = meta.label;
                payDetailsInput.placeholder = meta.placeholder;
                payDetailsInput.value = '';
                payDetailsHint.textContent = meta.hint;
                payDetailsWrap.hidden = false;
                confirm.disabled = false;
            });
        });
        actions.querySelector('[data-back-step]').addEventListener('click', () => {
            if (paymentInFlight) return;
            step = 2; renderStep();
        });
        confirm.addEventListener('click', () => {
            if (paymentInFlight) return;
            const err = document.getElementById('adStep3Error');
            if (!draft.payMethod) { err.textContent = 'Please choose a payment method.'; err.hidden = false; return; }
            const details = (document.getElementById('adPayDetails').value || '').trim();
            if (details.length < 4) { err.textContent = 'Please enter the payment details.'; err.hidden = false; return; }
            err.hidden = true;
            paymentInFlight = true;
            confirm.disabled = true;
            confirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing payment…';
            setTimeout(() => {
                paymentInFlight = false;
                publishAd('paid', draft.payMethod, details);
            }, 1200);
        });
    }

    function publishAd(kind, method, ref) {
        const t = tierById(draft.tier);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + t.days * 86400000);
        if (draft._boosting && draft.id) {
            data.userAds = data.userAds.filter(a => a.id !== draft.id);
        }
        const ad = {
            id: uid('ad'),
            ownerEmail: draft.ownerEmail || getCurrentEmail(),
            ownerName: draft.contactName || '',
            title: draft.title,
            description: draft.description,
            category: draft.category,
            subcategory: draft.subcategory,
            price: draft.price,
            currency: 'ZMW',
            priceLabel: draft.priceLabel,
            image: draft.image || '',
            contactName: draft.contactName,
            contactPhone: draft.contactPhone,
            contactEmail: draft.contactEmail,
            location: draft.location || draft.city || '—',
            city: draft.city,
            province: draft.province,
            tier: draft.tier,
            featured: !!t.featured,
            status: 'active',
            paymentMethod: method || null,
            paymentRef: ref || null,
            paymentAmount: t.price,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0, clicks: 0
        };
        data.userAds = data.userAds || [];
        data.userAds.unshift(ad);
        save(data);
        const body = document.getElementById('advertCreateBody');
        const actions = document.getElementById('advertCreateActions');
        const refCode = (ad.id.slice(-8)).toUpperCase();
        body.innerHTML = `
            <div class="advert-hub-success">
                <div class="check"><i class="fas fa-check"></i></div>
                <h3>${kind === 'paid' ? 'Payment successful 🎉' : 'Ad published 🎉'}</h3>
                <p><strong>${esc(ad.title)}</strong> is now live on the Advert Hub.</p>
                <p style="color:#94a3b8;font-size:0.82rem;">
                    ${tierById(ad.tier).name} plan · Expires ${esc(fmtDate(ad.expiresAt))}
                </p>
                <span class="ref">Reference: ${esc(refCode)}</span>
            </div>
        `;
        actions.innerHTML = `
            <button type="button" class="advert-hub-btn advert-hub-btn-outline" data-view-ad><i class="fas fa-eye"></i> View Ad</button>
            <button type="button" class="advert-hub-btn advert-hub-btn-primary" data-close-success><i class="fas fa-check"></i> Done</button>
        `;
        actions.querySelector('[data-close-success]').addEventListener('click', () => {
            paymentInFlight = false;
            closeCreate();
            if (modal && !modal.hidden) {
                switchTab('myads');
                renderBrowseGrid();
            }
        });
        actions.querySelector('[data-view-ad]').addEventListener('click', () => {
            paymentInFlight = false;
            closeCreate();
            openDetail(ad.id);
        });
        toast(kind === 'paid' ? 'Payment successful — ad published ✓' : 'Free ad published ✓', 'success');
        updateMyCount();
    }

    function openDetail(id) {
        if (!detailModal) buildDetailModal();
        const a = adById(id);
        if (!a) return;
        activeDetailId = id;
        const all = allAds();
        const target = all.find(x => x.id === id);
        if (target) {
            target.views = (target.views || 0) + 1;
            const userAd = (data.userAds || []).find(x => x.id === id);
            if (userAd) { userAd.views = target.views; save(data); }
        }
        const cat = catById(a.category);
        const tier = tierById(a.tier);
        document.getElementById('advertDetailCat').textContent = `${cat.icon} ${cat.label}`;
        document.getElementById('advertDetailTitle').textContent = a.title;
        const body = document.getElementById('advertDetailBody');
        body.innerHTML = `
            <div class="advert-hub-detail-hero">
                ${a.image
                    ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
                       <div class="advert-hub-detail-hero-placeholder" style="display:none">${esc(cat.icon)}</div>`
                    : `<div class="advert-hub-detail-hero-placeholder">${esc(cat.icon)}</div>`}
            </div>
            <div class="advert-hub-detail-price-bar">
                ${a.price > 0
                    ? `<div class="advert-hub-detail-price">${fmt(a.price)}${a.priceLabel ? `<small> · ${esc(a.priceLabel)}</small>` : ''}</div>`
                    : `<div class="advert-hub-detail-price" style="font-size:1.1rem;">${esc(a.priceLabel || 'Contact for price')}</div>`}
                <span class="advert-hub-card-tier-badge ${esc(a.tier)}" style="position:static;">${esc(tier.name)}</span>
            </div>
            <div class="advert-hub-detail-meta">
                <span class="advert-hub-chip"><i class="fas fa-map-marker-alt"></i> ${esc(a.location || a.city || '—')}</span>
                ${a.subcategory ? `<span class="advert-hub-chip"><i class="fas fa-tag"></i> ${esc(a.subcategory)}</span>` : ''}
                <span class="advert-hub-chip"><i class="fas fa-calendar"></i> Posted ${esc(fmtDate(a.createdAt))}</span>
                <span class="advert-hub-chip"><i class="fas fa-eye"></i> ${a.views || 0} views</span>
            </div>
            <section class="advert-hub-detail-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p class="advert-hub-detail-desc">${esc(a.description)}</p>
            </section>
            <section class="advert-hub-detail-section">
                <h3><i class="fas fa-address-book"></i> Contact</h3>
                <div class="advert-hub-detail-contact">
                    ${a.contactName ? `<div class="advert-hub-contact-row"><i class="fas fa-user"></i> ${esc(a.contactName)}</div>` : ''}
                    ${a.contactPhone ? `<div class="advert-hub-contact-row"><i class="fas fa-phone"></i> <a href="tel:${esc(a.contactPhone.replace(/\s+/g,''))}">${esc(a.contactPhone)}</a></div>` : ''}
                    ${a.contactEmail ? `<div class="advert-hub-contact-row"><i class="fas fa-envelope"></i> <a href="mailto:${esc(a.contactEmail)}">${esc(a.contactEmail)}</a></div>` : ''}
                    ${a.city ? `<div class="advert-hub-contact-row"><i class="fas fa-city"></i> ${esc(a.city)}${a.province ? ', ' + esc(a.province) : ''}</div>` : ''}
                </div>
            </section>
        `;
        const actions = document.getElementById('advertDetailActions');
        const isMine = a.ownerEmail === getCurrentEmail();
        actions.innerHTML = `
            ${a.contactPhone ? `<a class="advert-hub-btn advert-hub-btn-outline" href="tel:${esc(a.contactPhone.replace(/\s+/g,''))}" style="text-decoration:none;"><i class="fas fa-phone"></i> Call</a>` : ''}
            ${a.contactEmail ? `<a class="advert-hub-btn advert-hub-btn-outline" href="mailto:${esc(a.contactEmail)}" style="text-decoration:none;"><i class="fas fa-envelope"></i> Email</a>` : ''}
            ${isMine ? `<button class="advert-hub-btn advert-hub-btn-primary" data-boost-this><i class="fas fa-rocket"></i> Boost Ad</button>` : ''}
        `;
        const boostBtn = actions.querySelector('[data-boost-this]');
        if (boostBtn) {
            boostBtn.addEventListener('click', () => {
                closeDetail();
                openCreate(a.tier, a);
            });
        }
        openModal(detailModal);
    }

    function closeDetail() {
        if (!detailModal) return;
        closeModal(detailModal);
        activeDetailId = null;
    }

    window.AdvertHub = {
        open: openMain,
        close: closeMain,
        create: () => openCreate(),
        getTiers: () => TIERS,
        getCategories: () => CATEGORIES
    };
    window.openAdvertHub  = function () { openMain(); };
    window.closeAdvertHub = function () { closeMain(); };

    function initAdvert() {
        removeLegacyHtmlModal();
        buildMainModal();
        buildCreateModal();
        buildDetailModal();

        document.addEventListener('click', e => {
            const t = e.target.closest('[data-action="openAdvertHub"]');
            if (!t) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            openMain();
        }, true);
        document.addEventListener('click', e => {
            const t = e.target.closest('[data-action="closeAdvertHub"]');
            if (!t) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            closeMain();
        }, true);

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (paymentInFlight) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toast('Payment in progress — please wait', 'warning');
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdvert);
    } else {
        initAdvert();
    }

})();

/* =========================================================
   entertainment-engagement.js  (embedded)
   Zeroth Business Solutions — Entertainment Hub engagement layer
   ========================================================= */
(function () {
  'use strict';

  var STORE_PREFIX   = 'zbs_engagement_';
  var SESSION_USER   = 'zbs_engagement_user';
  var MAX_COMMENT_LEN = 500;

  var activePostId = null;
  var cardsIndex   = Object.create(null);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid() {
    return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5)        return 'just now';
    if (diff < 60)       return diff + 's ago';
    if (diff < 3600)     return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400)    return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800)   return Math.floor(diff / 86400) + 'd ago';
    if (diff < 2592000)  return Math.floor(diff / 604800) + 'w ago';
    return new Date(ts).toLocaleDateString();
  }

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function loadPost(id) {
    try {
      var raw = localStorage.getItem(STORE_PREFIX + id);
      if (!raw) return blankPost(id);
      var data = JSON.parse(raw);
      return normalizePost(data, id);
    } catch (e) {
      return blankPost(id);
    }
  }

  function savePost(id, data) {
    try {
      localStorage.setItem(STORE_PREFIX + id, JSON.stringify(data));
    } catch (e) {}
  }

  function blankPost(id) {
    return {
      id: id,
      likes: 0,
      dislikes: 0,
      views: 0,
      userReaction: null,
      comments: [],
      createdAt: Date.now()
    };
  }

  function normalizePost(data, id) {
    data = data && typeof data === 'object' ? data : {};
    return {
      id: id,
      likes: Math.max(0, Number(data.likes) || 0),
      dislikes: Math.max(0, Number(data.dislikes) || 0),
      views: Math.max(0, Number(data.views) || 0),
      userReaction: data.userReaction === 'like' || data.userReaction === 'dislike'
        ? data.userReaction : null,
      comments: Array.isArray(data.comments)
        ? data.comments.filter(c => c && typeof c === 'object').map(c => ({
            id: c.id || uid(),
            name: String(c.name || 'Guest').slice(0, 60),
            text: String(c.text || '').slice(0, MAX_COMMENT_LEN),
            ts: Number(c.ts) || Date.now(),
            mine: !!c.mine
          }))
        : [],
      createdAt: Number(data.createdAt) || Date.now()
    };
  }

  function currentUser() {
    try {
      var n = localStorage.getItem(SESSION_USER);
      if (n) return n;
      var fallback = 'Guest ' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem(SESSION_USER, fallback);
      return fallback;
    } catch (e) { return 'Guest'; }
  }

  function postIdFor(card) {
    var id = card.getAttribute('data-post-id');
    if (id) return id;

    var type  = card.getAttribute('data-type')  ||
                (card.closest('[data-panel]') && card.closest('[data-panel]').getAttribute('data-panel')) ||
                'post';
    var title = card.getAttribute('data-title') || '';
    if (!title) {
      var h = card.querySelector('.ent-card-title, h3, h4, .ent-title, .title');
      if (h) title = h.textContent.trim();
    }
    var artist = card.getAttribute('data-artist') || '';
    if (!artist) {
      var a = card.querySelector('.ent-card-artist, .artist, .creator');
      if (a) artist = a.textContent.trim();
    }
    var idx = card.getAttribute('data-index') || '';
    if (!idx) {
      var siblings = card.parentElement
        ? Array.prototype.indexOf.call(card.parentElement.children, card)
        : 0;
      idx = siblings;
    }

    var seed = type + '|' + title + '|' + artist + '|' + idx;
    var hash = 0;
    for (var i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return 'auto_' + Math.abs(hash).toString(36);
  }

  function getCardMeta(card) {
    var type = card.getAttribute('data-type') ||
      (card.closest('[data-panel]') && card.closest('[data-panel]').getAttribute('data-panel')) ||
      'post';

    var title = card.getAttribute('data-title');
    if (!title) {
      var h = card.querySelector('.ent-card-title, h3, h4, .ent-title, .title');
      title = h ? h.textContent.trim() : 'Untitled';
    }

    var artist = card.getAttribute('data-artist');
    if (!artist) {
      var a = card.querySelector('.ent-card-artist, .artist, .creator');
      artist = a ? a.textContent.trim() : '';
    }

    var desc = card.getAttribute('data-description');
    if (!desc) {
      var d = card.querySelector('.ent-card-desc, .description, .ent-desc, p');
      desc = d ? d.textContent.trim() : '';
    }

    var media = card.getAttribute('data-media') || '';
    if (!media) {
      var img = card.querySelector('img');
      if (img && img.src) media = img.src;
    }

    var video = card.querySelector('video');
    var videoUrl = video ? (video.currentSrc || video.src || '') : '';

    var audio = card.querySelector('audio');
    var audioUrl = audio ? (audio.currentSrc || audio.src || '') : '';

    return {
      type: type,
      title: title,
      artist: artist,
      description: desc,
      media: media,
      videoUrl: videoUrl,
      audioUrl: audioUrl
    };
  }

  function toast(msg, kind) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'alert');
      el.hidden = true;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._zbsEngTimer);
    el._zbsEngTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 260);
    }, 2400);
  }

  function buildCardBar(postId) {
    var bar = document.createElement('div');
    bar.className = 'ent-card-engage';
    bar.setAttribute('data-eng-bar', postId);
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Post engagement');
    bar.innerHTML =
      '<button type="button" class="ent-card-engage-btn like" data-eng="like" aria-pressed="false" title="Like">' +
        '<i class="far fa-thumbs-up" aria-hidden="true"></i>' +
        '<b data-eng-count="likes">0</b>' +
      '</button>' +
      '<button type="button" class="ent-card-engage-btn dislike" data-eng="dislike" aria-pressed="false" title="Dislike">' +
        '<i class="far fa-thumbs-down" aria-hidden="true"></i>' +
        '<b data-eng-count="dislikes">0</b>' +
      '</button>' +
      '<button type="button" class="ent-card-engage-btn comment" data-eng="comment" title="View comments">' +
        '<i class="far fa-comment" aria-hidden="true"></i>' +
        '<b data-eng-count="comments">0</b>' +
      '</button>' +
      '<span class="ent-card-engage-spacer"></span>' +
      '<span class="ent-card-engage-btn views" data-eng="views" title="Views">' +
        '<i class="fas fa-eye" aria-hidden="true"></i>' +
        '<b data-eng-count="views">0</b>' +
      '</span>';
    return bar;
  }

  function hydrateCardBar(bar, postId) {
    var data = loadPost(postId);
    var setNum = function (key, val) {
      var el = bar.querySelector('[data-eng-count="' + key + '"]');
      if (el) el.textContent = fmtNum(val);
    };
    setNum('likes',    data.likes);
    setNum('dislikes', data.dislikes);
    setNum('comments', data.comments.length);
    setNum('views',    data.views);

    var likeBtn    = bar.querySelector('[data-eng="like"]');
    var dislikeBtn = bar.querySelector('[data-eng="dislike"]');
    var likeIcon    = likeBtn    ? likeBtn.querySelector('i')    : null;
    var dislikeIcon = dislikeBtn ? dislikeBtn.querySelector('i') : null;

    if (likeBtn && dislikeBtn) {
      var isLike    = data.userReaction === 'like';
      var isDislike = data.userReaction === 'dislike';
      likeBtn.classList.toggle('is-active', isLike);
      dislikeBtn.classList.toggle('is-active', isDislike);
      likeBtn.setAttribute('aria-pressed', isLike ? 'true' : 'false');
      dislikeBtn.setAttribute('aria-pressed', isDislike ? 'true' : 'false');
      if (likeIcon)    likeIcon.className    = (isLike    ? 'fas' : 'far') + ' fa-thumbs-up';
      if (dislikeIcon) dislikeIcon.className = (isDislike ? 'fas' : 'far') + ' fa-thumbs-down';
    }
  }

  function attachBar(card) {
    if (!card || card.dataset.engAttached === '1') return;
    var postId = postIdFor(card);
    card.dataset.engPostId = postId;
    card.dataset.engAttached = '1';
    cardsIndex[postId] = card;

    if (!card.querySelector('.ent-card-engage')) {
      var bar = buildCardBar(postId);
      card.appendChild(bar);
      hydrateCardBar(bar, postId);
    }

    card.style.cursor = 'pointer';
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    card.setAttribute('role', card.getAttribute('role') || 'button');
  }

  function scanCards() {
    var grids = ['grid-cartoons', 'grid-music', 'grid-movies'];
    grids.forEach(function (id) {
      var grid = document.getElementById(id);
      if (!grid) return;
      $$('.ent-card', grid).forEach(attachBar);
    });
    $$('.ent-card').forEach(attachBar);
  }

  function onCardClick(e) {
    var card = e.target.closest('.ent-card');
    if (!card || !card.dataset.engPostId) return;

    var barBtn = e.target.closest('.ent-card-engage-btn');
    if (barBtn) {
      e.preventDefault();
      e.stopPropagation();
      var postId = card.dataset.engPostId;
      var kind = barBtn.getAttribute('data-eng');
      if (kind === 'like')    toggleReaction(postId, 'like');
      else if (kind === 'dislike') toggleReaction(postId, 'dislike');
      else if (kind === 'comment') openPost(postId, { scrollToComments: true });
      return;
    }

    e.preventDefault();
    openPost(card.dataset.engPostId);
  }

  function onCardKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.ent-card');
    if (!card || !card.dataset.engPostId) return;
    if (e.target.closest('.ent-card-engage-btn')) return;
    e.preventDefault();
    openPost(card.dataset.engPostId);
  }

  function toggleReaction(postId, kind) {
    var data = loadPost(postId);
    var prev = data.userReaction;

    if (prev === kind) {
      if (kind === 'like')    data.likes    = Math.max(0, data.likes - 1);
      if (kind === 'dislike') data.dislikes = Math.max(0, data.dislikes - 1);
      data.userReaction = null;
    } else {
      if (prev === 'like')    data.likes    = Math.max(0, data.likes - 1);
      if (prev === 'dislike') data.dislikes = Math.max(0, data.dislikes - 1);
      if (kind === 'like')    data.likes    += 1;
      if (kind === 'dislike') data.dislikes += 1;
      data.userReaction = kind;
    }

    savePost(postId, data);
    refreshPost(postId);

    var card = cardsIndex[postId];
    if (card) {
      var btn = card.querySelector('.ent-card-engage-btn.' + kind);
      if (btn) {
        btn.classList.add('just-pressed');
        setTimeout(function () { btn.classList.remove('just-pressed'); }, 520);
      }
    }
    if (activePostId === postId) {
      var modalBtn = document.getElementById(
        kind === 'like' ? 'entLikeBtn' : 'entDislikeBtn'
      );
      if (modalBtn) {
        modalBtn.classList.add('just-pressed');
        setTimeout(function () { modalBtn.classList.remove('just-pressed'); }, 520);
      }
    }
  }

  function refreshPost(postId) {
    var card = cardsIndex[postId];
    if (card) {
      var bar = card.querySelector('.ent-card-engage');
      if (bar) hydrateCardBar(bar, postId);
    }
    if (activePostId === postId) hydrateModal(postId);
  }

  function incrementView(postId) {
    var data = loadPost(postId);
    data.views += 1;
    savePost(postId, data);
    refreshPost(postId);
  }

  var modalEl = null;
  var modalRefs = null;

  function cacheModal() {
    modalEl = document.getElementById('entPostModal');
    if (!modalEl) return null;
    modalRefs = {
      type:      document.getElementById('entPostType'),
      title:     document.getElementById('entPostTitle'),
      media:     document.getElementById('entPostMedia'),
      artist:    document.getElementById('entPostArtist'),
      desc:      document.getElementById('entPostDesc'),
      views:     document.getElementById('entPostViews'),
      commentsStat: document.getElementById('entPostCommentsStat'),
      likeBtn:   document.getElementById('entLikeBtn'),
      dislikeBtn:document.getElementById('entDislikeBtn'),
      likeCount: document.getElementById('entLikeCount'),
      dislikeCount: document.getElementById('entDislikeCount'),
      commentCount: document.getElementById('entCommentCount'),
      commentTotal: document.getElementById('entCommentTotal'),
      commentJump:  document.getElementById('entCommentJumpBtn'),
      shareBtn:     document.getElementById('entShareBtn'),
      commentsList: document.getElementById('entCommentsList'),
      commentsEmpty:document.getElementById('entCommentsEmpty'),
      commentForm:  document.getElementById('entCommentForm'),
      commentInput: document.getElementById('entCommentInput'),
      commentChar:  document.getElementById('entCommentChar'),
      commentSubmit: document.querySelector('#entCommentForm .ent-comment-submit')
    };
    return modalRefs;
  }

  function openPost(postId, opts) {
    opts = opts || {};
    if (!modalEl) cacheModal();
    if (!modalEl) return;

    var card = cardsIndex[postId];
    var meta = card ? getCardMeta(card) : {
      type: 'post', title: 'Post', artist: '', description: '', media: '', videoUrl: '', audioUrl: ''
    };
    loadPost(postId);

    activePostId = postId;

    if (modalRefs.type)  modalRefs.type.textContent = capitalize(meta.type);
    if (modalRefs.title) modalRefs.title.textContent = meta.title || 'Untitled';

    renderMedia(meta, modalRefs.media);

    if (modalRefs.artist) {
      modalRefs.artist.textContent = meta.artist ? 'by ' + meta.artist : '';
    }
    if (modalRefs.desc) {
      modalRefs.desc.textContent = meta.description || '';
    }

    modalEl.hidden = false;
    requestAnimationFrame(function () { modalEl.classList.add('show'); });

    incrementView(postId);
    hydrateModal(postId);

    if (modalRefs.commentInput) {
      modalRefs.commentInput.value = '';
      if (modalRefs.commentChar) modalRefs.commentChar.textContent = '0 / ' + MAX_COMMENT_LEN;
      updateCommentSubmitState();
    }

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (opts.scrollToComments && modalRefs.commentsList) {
      setTimeout(function () {
        modalRefs.commentsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (modalRefs.commentInput) modalRefs.commentInput.focus({ preventScroll: true });
      }, 240);
    } else {
      var backBtn = modalEl.querySelector('.ent-post-back');
      if (backBtn) backBtn.focus({ preventScroll: true });
    }
  }

  function renderMedia(meta, container) {
    if (!container) return;
    var type = (meta.type || '').toLowerCase();

    var html = '';
    if (meta.videoUrl) {
      html = '<video controls playsinline preload="metadata"' +
             (meta.media ? ' poster="' + escapeHtml(meta.media) + '"' : '') +
             ' src="' + escapeHtml(meta.videoUrl) + '"></video>';
    } else if (meta.audioUrl) {
      html = '<audio controls preload="metadata" src="' + escapeHtml(meta.audioUrl) + '"></audio>';
    } else if (meta.media) {
      html = '<img src="' + escapeHtml(meta.media) + '" alt="' + escapeHtml(meta.title) + '" loading="lazy" />';
    } else {
      var icon = type === 'music' ? 'fa-music'
               : type === 'movies' ? 'fa-film'
               : type === 'cartoons' ? 'fa-tv'
               : 'fa-photo-video';
      html =
        '<div class="ent-post-media-placeholder">' +
          '<i class="fas ' + icon + '" aria-hidden="true"></i>' +
          '<span>No preview available</span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function hydrateModal(postId) {
    if (!modalRefs) return;
    var data = loadPost(postId);

    if (modalRefs.views)        modalRefs.views.textContent = fmtNum(data.views);
    if (modalRefs.commentsStat) modalRefs.commentsStat.textContent = fmtNum(data.comments.length);
    if (modalRefs.likeCount)    modalRefs.likeCount.textContent = fmtNum(data.likes);
    if (modalRefs.dislikeCount) modalRefs.dislikeCount.textContent = fmtNum(data.dislikes);
    if (modalRefs.commentCount) modalRefs.commentCount.textContent = fmtNum(data.comments.length);
    if (modalRefs.commentTotal) modalRefs.commentTotal.textContent = fmtNum(data.comments.length);

    var isLike    = data.userReaction === 'like';
    var isDislike = data.userReaction === 'dislike';

    if (modalRefs.likeBtn) {
      modalRefs.likeBtn.classList.toggle('is-active', isLike);
      modalRefs.likeBtn.setAttribute('aria-pressed', isLike ? 'true' : 'false');
      var li = modalRefs.likeBtn.querySelector('i');
      if (li) li.className = (isLike ? 'fas' : 'far') + ' fa-thumbs-up';
    }
    if (modalRefs.dislikeBtn) {
      modalRefs.dislikeBtn.classList.toggle('is-active', isDislike);
      modalRefs.dislikeBtn.setAttribute('aria-pressed', isDislike ? 'true' : 'false');
      var di = modalRefs.dislikeBtn.querySelector('i');
      if (di) di.className = (isDislike ? 'fas' : 'far') + ' fa-thumbs-down';
    }

    renderComments(data);
  }

  function closePost() {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    setTimeout(function () {
      modalEl.hidden = true;
      var v = modalEl.querySelector('video, audio');
      if (v && typeof v.pause === 'function') { try { v.pause(); } catch (e) {} }
      activePostId = null;
    }, 240);
  }

  function renderComments(data) {
    if (!modalRefs || !modalRefs.commentsList) return;
    var list  = modalRefs.commentsList;
    var empty = modalRefs.commentsEmpty;

    if (!data.comments.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    var sorted = data.comments.slice().sort(function (a, b) { return b.ts - a.ts; });

    list.innerHTML = sorted.map(function (c) {
      var safeText = escapeHtml(c.text).replace(/\n/g, '<br>');
      var initial  = escapeHtml(initials(c.name));
      var name     = escapeHtml(c.name);
      var when     = escapeHtml(timeAgo(c.ts));
      var delBtn   = c.mine
        ? '<button type="button" class="ent-comment-item-delete" data-comment-delete="' +
            escapeHtml(c.id) + '" aria-label="Delete comment" title="Delete">' +
            '<i class="fas fa-trash-alt" aria-hidden="true"></i></button>'
        : '';
      return (
        '<div class="ent-comment-item" data-comment-id="' + escapeHtml(c.id) + '">' +
          '<div class="ent-comment-item-avatar" aria-hidden="true">' + initial + '</div>' +
          '<div class="ent-comment-item-body">' +
            '<div class="ent-comment-item-head">' +
              '<span class="ent-comment-item-name">' + name + '</span>' +
              '<span class="ent-comment-item-time">' + when + '</span>' +
            '</div>' +
            '<p class="ent-comment-item-text">' + safeText + '</p>' +
          '</div>' +
          delBtn +
        '</div>'
      );
    }).join('');
  }

  function submitComment(e) {
    if (e) e.preventDefault();
    if (!activePostId || !modalRefs || !modalRefs.commentInput) return;

    var raw = modalRefs.commentInput.value.trim();
    if (!raw) {
      toast('Please write a comment first.', 'warn');
      return;
    }
    if (raw.length > MAX_COMMENT_LEN) raw = raw.slice(0, MAX_COMMENT_LEN);

    var data = loadPost(activePostId);
    var comment = {
      id: uid(),
      name: currentUser(),
      text: raw,
      ts: Date.now(),
      mine: true
    };
    data.comments.push(comment);
    savePost(activePostId, data);

    modalRefs.commentInput.value = '';
    if (modalRefs.commentChar) modalRefs.commentChar.textContent = '0 / ' + MAX_COMMENT_LEN;
    updateCommentSubmitState();

    hydrateModal(activePostId);
    refreshPost(activePostId);
    toast('Comment posted', 'success');
  }

  function deleteComment(commentId) {
    if (!activePostId) return;
    var data = loadPost(activePostId);
    var before = data.comments.length;
    data.comments = data.comments.filter(function (c) { return c.id !== commentId; });
    if (data.comments.length === before) return;
    savePost(activePostId, data);
    hydrateModal(activePostId);
    refreshPost(activePostId);
    toast('Comment deleted', 'info');
  }

  function updateCommentSubmitState() {
    if (!modalRefs || !modalRefs.commentInput || !modalRefs.commentSubmit) return;
    var len = modalRefs.commentInput.value.trim().length;
    modalRefs.commentSubmit.disabled = len === 0;
  }

  function shareActivePost() {
    if (!activePostId) return;
    var card = cardsIndex[activePostId];
    var meta = card ? getCardMeta(card) : { title: 'Entertainment post', type: 'post' };
    var url  = window.location.href.split('#')[0] + '#ent-' + encodeURIComponent(activePostId);
    var text = (meta.title || 'Entertainment') + ' — Zeroth Business Solutions';

    if (navigator.share) {
      navigator.share({ title: text, text: text, url: url })
        .catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Link copied to clipboard', 'success');
      }).catch(function () {
        legacyCopy(url);
      });
      return;
    }
    legacyCopy(url);
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Link copied to clipboard', 'success');
    } catch (e) {
      toast('Could not copy link', 'error');
    }
  }

  function wireGlobalEvents() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest('[data-comment-delete]');
      if (deleteBtn) {
        e.preventDefault();
        deleteComment(deleteBtn.getAttribute('data-comment-delete'));
        return;
      }
      onCardClick(e);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) {
        closePost();
        return;
      }
      onCardKey(e);
    });
  }

  function wireModalEvents() {
    if (!modalEl) return;

    modalEl.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-eng-close]');
      if (closeBtn) { e.preventDefault(); closePost(); }
    });

    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closePost();
    });

    var likeBtn = document.getElementById('entLikeBtn');
    var dislikeBtn = document.getElementById('entDislikeBtn');
    var shareBtn = document.getElementById('entShareBtn');
    var commentJump = document.getElementById('entCommentJumpBtn');

    if (likeBtn)    likeBtn.addEventListener('click',    function () { if (activePostId) toggleReaction(activePostId, 'like'); });
    if (dislikeBtn) dislikeBtn.addEventListener('click', function () { if (activePostId) toggleReaction(activePostId, 'dislike'); });
    if (shareBtn)   shareBtn.addEventListener('click',   shareActivePost);
    if (commentJump) commentJump.addEventListener('click', function () {
      var ci = document.getElementById('entCommentInput');
      if (ci) ci.focus();
      var section = document.querySelector('.ent-comments-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var form = document.getElementById('entCommentForm');
    if (form) form.addEventListener('submit', submitComment);

    var input = document.getElementById('entCommentInput');
    if (input) {
      input.addEventListener('input', function () {
        var len = input.value.length;
        if (modalRefs && modalRefs.commentChar) {
          modalRefs.commentChar.textContent = len + ' / ' + MAX_COMMENT_LEN;
        }
        updateCommentSubmitState();
      });
      input.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          submitComment();
        }
      });
    }

    updateCommentSubmitState();
  }

  function observeGrids() {
    if (typeof MutationObserver === 'undefined') return;
    var grids = ['grid-cartoons', 'grid-music', 'grid-movies'];

    grids.forEach(function (id) {
      var grid = document.getElementById(id);
      if (!grid) return;
      var mo = new MutationObserver(function (mutations) {
        var needsScan = false;
        mutations.forEach(function (m) {
          if (m.addedNodes && m.addedNodes.length) needsScan = true;
        });
        if (needsScan) scanCards();
      });
      mo.observe(grid, { childList: true, subtree: false });
    });
  }

  function handleHash() {
    var h = window.location.hash || '';
    var m = h.match(/^#ent-(.+)$/);
    if (!m) return;
    var postId = decodeURIComponent(m[1]);
    var attempts = 0;
    (function tryOpen() {
      attempts++;
      if (cardsIndex[postId]) {
        openPost(postId);
        return;
      }
      scanCards();
      if (cardsIndex[postId]) { openPost(postId); return; }
      if (attempts < 20) setTimeout(tryOpen, 150);
    })();
  }

  function capitalize(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function init() {
    cacheModal();
    wireGlobalEvents();
    wireModalEvents();
    scanCards();
    observeGrids();
    handleHash();

    setInterval(function () {
      if (activePostId) hydrateModal(activePostId);
    }, 30000);
  }

  window.ZBSEngagement = {
    refresh:  scanCards,
    getPost:  loadPost,
    openPost: openPost,
    closePost: closePost,
    resetPost: function (id) {
      try { localStorage.removeItem(STORE_PREFIX + id); } catch (e) {}
      refreshPost(id);
    },
    resetAll: function () {
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(STORE_PREFIX) === 0) localStorage.removeItem(k);
        });
      } catch (e) {}
      scanCards();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ================================================================
   INLINE: Favicon auto-upgrade + permit additions (ZBS Rep photo,
   brand-mark, vet video) — safe to move into enhancements.js later.
   ================================================================ */

/* ------------------------------------------------------------------
   1) Upgrade any low-res Google favicon to a high-res Clearbit logo
   ------------------------------------------------------------------ */
(function upgradeFavicons(){
    const swap = (img) => {
        const u = img.src || '';
        const m = u.match(/[?&]domain=([^&]+)/);
        if (!m) return;
        const domain = decodeURIComponent(m[1]);
        if (img.dataset.faviconUpgraded) return;
        img.dataset.faviconUpgraded = '1';
        img.onerror = function(){
            this.onerror = null;
            this.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        };
        img.src = `https://logo.clearbit.com/${domain}`;
    };

    document.querySelectorAll('img[src*="google.com/s2/favicons"]').forEach(swap);

    new MutationObserver((muts) => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'IMG') swap(n);
            n.querySelectorAll?.('img[src*="google.com/s2/favicons"]').forEach(swap);
        }));
    }).observe(document.body, { childList: true, subtree: true });
})();

/* ------------------------------------------------------------------
   2) Permit additions: ZBS Rep photo, brand-mark camera, vet video
   ------------------------------------------------------------------ */
(function permitExtras(){
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;

        if (action === 'openRepCamera' || action === 'openBrandMarkCamera') {
            window.__permitCameraTarget =
                action === 'openRepCamera'
                    ? btn.closest('.agri-permit-rep-photo')
                    : btn.closest('.agri-permit-brandmark-wrap');
            window.__permitCameraKind =
                action === 'openRepCamera' ? 'rep' : 'brandmark';
            const modal = document.getElementById('agriPermitCameraModal');
            const title = document.getElementById('agriPermitCameraTitle');
            if (title) {
                title.innerHTML = action === 'openRepCamera'
                    ? '<i class="fas fa-camera"></i> Take ZBS Rep Photo'
                    : '<i class="fas fa-camera"></i> Capture Brand Mark';
            }
            modal?.removeAttribute('hidden');
            document.dispatchEvent(new CustomEvent('agriPermitCameraOpen', {
                detail: { target: window.__permitCameraTarget, kind: window.__permitCameraKind }
            }));
        }

        if (action === 'openVetVideoUpload') {
            document.getElementById('agriVetVideoInput')?.click();
        }

        if (action === 'removeVetVideo') {
            const v = document.getElementById('agriVetVideoPlayer');
            if (v) { try { v.pause(); } catch(_){} v.removeAttribute('src'); v.load(); }
            const wrap = document.getElementById('agriVetVideoPreview');
            if (wrap) wrap.hidden = true;
            const inp = document.getElementById('agriVetVideoInput');
            if (inp) inp.value = '';
        }
    });

    document.getElementById('agriVetVideoInput')?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const player = document.getElementById('agriVetVideoPlayer');
        const wrap   = document.getElementById('agriVetVideoPreview');
        const nameEl = document.getElementById('agriVetVideoName');
        const sizeEl = document.getElementById('agriVetVideoSize');
        if (player) player.src = url;
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        if (wrap)   wrap.hidden = false;
    });
})();
/* ================================================================
   LuSE MARKET DASHBOARD (14 October 2026)
   ================================================================ */

function ensureLuSEPanel() {
    let panel = document.getElementById('etf-panel-luse');
    if (panel) return panel;
    
    // Fallback if HTML is missing: auto-create the panel
    const host = document.querySelector('#etfModal .etf-content') || document.querySelector('#etfModal');
    if (!host) return null;
    
    panel = document.createElement('div');
    panel.id = 'etf-panel-luse';
    panel.className = 'etf-panel';
    panel.innerHTML = `
        <div class="etf-section">
            <h3 style="font-size:1rem;margin:0 0 12px;color:#1a202c;"><i class="fas fa-chart-line" style="color:#1f7a3d;"></i> LuSE Market</h3>
            <div id="etfLuseBanner"></div>
            <div id="etfLuseMovers" class="etf-luse-movers"></div>
            <div id="etfLuseTrends" class="etf-luse-trends"></div>
            <div id="etfLuseMarketData" class="etf-luse-market-data"></div>
            <div class="etf-companies-list" id="etfLuseGrid"></div>
        </div>`;
    host.appendChild(panel);
    return panel;
}

function buildLuSETrendChart({ title, data, color, prefix = '', suffix = '', height = 200 }) {
    if (!data || data.length < 2) return '';
    const values = data.map(d => Number(d.value) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const pad = (maxVal - minVal) * 0.15 || Math.abs(maxVal) * 0.1 || 1;
    const yMin = minVal - pad;
    const yMax = maxVal + pad;
    const range = yMax - yMin || 1;

    const W = 500, H = height;
    const P = { top: 15, right: 15, bottom: 32, left: 54 };
    const iW = W - P.left - P.right;
    const iH = H - P.top - P.bottom;
    const xStep = iW / (data.length - 1);

    const points = data.map((d, i) => ({
        x: P.left + i * xStep,
        y: P.top + iH - ((Number(d.value) - yMin) / range) * iH,
        date: d.date
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(P.top + iH).toFixed(1)} L${points[0].x.toFixed(1)},${(P.top + iH).toFixed(1)} Z`;

    const yTicks = 4;
    const yLabels = [];
    for (let i = 0; i <= yTicks; i++) {
        const v = yMin + (range * i) / yTicks;
        const y = P.top + iH - (iH * i) / yTicks;
        const dec = Math.abs(v) >= 100 ? 0 : 2;
        yLabels.push({ y, label: `${prefix}${v.toFixed(dec)}${suffix}` });
    }

    const step = Math.max(1, Math.ceil(data.length / 6));
    const xLabels = points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);
    const gradId = 'luseGrad-' + Math.random().toString(36).slice(2, 9);

    return `
        <div class="etf-luse-chart" style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:12px 14px 8px;box-sizing:border-box;width:100%;display:block;margin:0;">
            <div class="etf-luse-chart-title" style="font-size:.78rem;font-weight:800;color:#1a202c;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.06);display:block;">${title}</div>
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" class="etf-luse-chart-svg" role="img" style="width:100%;height:auto;display:block;min-height:${height}px;max-width:100%;overflow:visible;">
                <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.28" /><stop offset="100%" stop-color="${color}" stop-opacity="0" /></linearGradient></defs>
                ${yLabels.map(l => `<line x1="${P.left}" y1="${l.y.toFixed(1)}" x2="${W - P.right}" y2="${l.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3" /><text x="${P.left - 6}" y="${(l.y + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#6b7280">${l.label}</text>`).join('')}
                <path d="${areaPath}" fill="url(#${gradId})" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                ${points.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.5}" fill="${color}" stroke="#fff" stroke-width="1.5" />`).join('')}
                ${xLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#6b7280">${l.date}</text>`).join('')}
            </svg>
        </div>`;
}

function buildLuseMultiSeriesChart({ title, series, height = 260, suffix = '', yMin = null, yMax = null }) {
    if (!series || !series.length) return '';
    const first = series[0];
    if (!first.data || first.data.length < 2) return '';
    const allValues = series.flatMap(s => s.data.map(d => Number(d.value) || 0));
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const pad = (dataMax - dataMin) * 0.1 || Math.abs(dataMax) * 0.1 || 1;
    const yLo = yMin !== null ? yMin : dataMin - pad;
    const yHi = yMax !== null ? yMax : dataMax + pad;
    const range = yHi - yLo || 1;
    const W = 500, H = height;
    const P = { top: 15, right: 15, bottom: 32, left: 54 };
    const iW = W - P.left - P.right;
    const iH = H - P.top - P.bottom;
    const n = first.data.length;
    const xStep = iW / Math.max(1, n - 1);
    const yTicks = 5;
    const yLabels = [];
    for (let i = 0; i <= yTicks; i++) {
        const v = yLo + (range * i) / yTicks;
        const y = P.top + iH - (iH * i) / yTicks;
        const dec = Math.abs(v) >= 100 ? 0 : 1;
        yLabels.push({ y, label: v.toFixed(dec) + suffix });
    }
    const step = Math.max(1, Math.ceil(n / 6));
    const xLabels = first.data.filter((_, i) => i === 0 || i === n - 1 || i % step === 0).map((d) => ({ x: P.left + first.data.indexOf(d) * xStep, date: d.date }));
    const seriesPaths = series.map(s => {
        const pts = s.data.map((d, i) => ({ x: P.left + i * xStep, y: P.top + iH - ((Number(d.value) - yLo) / range) * iH }));
        return { color: s.color, path: pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') };
    });
    const legendHTML = series.map(s => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-size:9.5px;color:#374151;"><span style="display:inline-block;width:12px;height:3px;background:${s.color};border-radius:2px;"></span>${s.name}</span>`).join('');
    
    return `
        <div class="etf-luse-chart" style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:12px 14px 8px;box-sizing:border-box;width:100%;display:block;margin:0;">
            <div class="etf-luse-chart-title" style="font-size:.78rem;font-weight:800;color:#1a202c;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.06);display:block;">${title}</div>
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" class="etf-luse-chart-svg" role="img" style="width:100%;height:auto;display:block;min-height:${height}px;max-width:100%;overflow:visible;">
                ${yLabels.map(l => `<line x1="${P.left}" y1="${l.y.toFixed(1)}" x2="${W - P.right}" y2="${l.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3" /><text x="${P.left - 6}" y="${(l.y + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#6b7280">${l.label}</text>`).join('')}
                ${seriesPaths.map(s => `<path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />`).join('')}
                ${xLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#6b7280">${l.date}</text>`).join('')}
            </svg>
            <div style="text-align:center;margin-top:6px;line-height:1.6;">${legendHTML}</div>
        </div>`;
}

function renderLuSETrends() {
    try { _renderLuSETrendsImpl(); } catch (err) { console.error('[LuSE-Trends] render failed:', err); }
}

function _renderLuSETrendsImpl() {
    const D = window.LUSE_DATA || {};
    
    // 14 Oct 2026 PDF Data
    const FALLBACK = {
        lasi7Day: [
            { date: '6 Oct',  value: 25670    }, { date: '7 Oct',  value: 25480    },
            { date: '8 Oct',  value: 25700    }, { date: '9 Oct',  value: 25655    },
            { date: '10 Oct', value: 25620    }, { date: '11 Oct', value: 25600    },
            { date: '12 Oct', value: 25550    }, { date: '13 Oct', value: 25500    },
            { date: '14 Oct', value: 25455.54 }
        ],
        lasiMonthly: [
            { date: 'Sep 25', value: 25300 }, { date: 'Oct 25', value: 25400 },
            { date: 'Nov 25', value: 24800 }, { date: 'Dec 25', value: 25600 },
            { date: 'Jan 26', value: 26200 }, { date: 'Feb 26', value: 26800 },
            { date: 'Mar 26', value: 27200 }, { date: 'Apr 26', value: 26800 },
            { date: 'May 26', value: 25700 }, { date: 'Jun 26', value: 25800 },
            { date: 'Jul 26', value: 26100 }, { date: 'Aug 26', value: 26300 },
            { date: 'Sep 26', value: 25800 }
        ],
        fxUsdMonthly: [
            { date: 'Sep 25', value: 27.00 }, { date: 'Oct 25', value: 24.00 },
            { date: 'Nov 25', value: 26.00 }, { date: 'Dec 25', value: 25.00 },
            { date: 'Jan 26', value: 20.00 }, { date: 'Feb 26', value: 20.00 },
            { date: 'Mar 26', value: 19.00 }, { date: 'Apr 26', value: 19.00 },
            { date: 'May 26', value: 18.50 }, { date: 'Jun 26', value: 18.00 },
            { date: 'Jul 26', value: 18.50 }, { date: 'Aug 26', value: 19.00 },
            { date: 'Sep 26', value: 20.05 }
        ],
        indexed: [
            { date: 'Sep 25', alsi: 100.0, cpi: 100.0, usd: 100.0 }, { date: 'Oct 25', alsi: 100.5, cpi: 99.0, usd: 95.0 },
            { date: 'Nov 25', alsi: 98.0, cpi: 89.0, usd: 120.0 }, { date: 'Dec 25', alsi: 101.0, cpi: 91.0, usd: 120.0 },
            { date: 'Jan 26', alsi: 103.5, cpi: 75.0, usd: 118.0 }, { date: 'Feb 26', alsi: 106.0, cpi: 60.0, usd: 115.0 },
            { date: 'Mar 26', alsi: 107.5, cpi: 58.0, usd: 105.0 }, { date: 'Apr 26', alsi: 106.0, cpi: 55.0, usd: 85.0 },
            { date: 'May 26', alsi: 101.5, cpi: 54.0, usd: 80.0 }, { date: 'Jun 26', alsi: 102.0, cpi: 53.0, usd: 80.0 },
            { date: 'Jul 26', alsi: 103.0, cpi: 52.0, usd: 81.0 }, { date: 'Aug 26', alsi: 103.5, cpi: 51.0, usd: 80.0 },
            { date: 'Sep 26', alsi: 102.0, cpi: 50.0, usd: 78.0 }
        ],
        interestRates: [
            { date: 'Sep 25', mpr: 14.00, tbill90: 14.00, tbill180: 13.00, lending: 29.00, deposit: 6.00, cpi: 12.50 },
            { date: 'Oct 25', mpr: 14.00, tbill90: 14.00, tbill180: 13.00, lending: 29.00, deposit: 6.00, cpi: 12.50 },
            { date: 'Nov 25', mpr: 14.00, tbill90: 14.00, tbill180: 13.00, lending: 29.00, deposit: 6.00, cpi: 12.50 },
            { date: 'Dec 25', mpr: 14.00, tbill90: 13.50, tbill180: 13.00, lending: 29.00, deposit: 6.00, cpi: 12.50 },
            { date: 'Jan 26', mpr: 14.00, tbill90: 13.00, tbill180: 13.00, lending: 29.00, deposit: 6.00, cpi: 12.50 },
            { date: 'Feb 26', mpr: 14.00, tbill90: 12.00, tbill180: 12.50, lending: 29.00, deposit: 6.00, cpi: 12.00 },
            { date: 'Mar 26', mpr: 14.00, tbill90: 10.00, tbill180: 12.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'Apr 26', mpr: 14.00, tbill90: 9.00, tbill180: 10.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'May 26', mpr: 13.50, tbill90: 9.10, tbill180: 10.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'Jun 26', mpr: 13.50, tbill90: 9.10, tbill180: 10.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'Jul 26', mpr: 13.50, tbill90: 9.10, tbill180: 10.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'Aug 26', mpr: 13.50, tbill90: 9.10, tbill180: 10.00, lending: 29.00, deposit: 6.00, cpi: 6.10 },
            { date: 'Sep 26', mpr: 10.75, tbill90: 9.10, tbill180: 9.50, lending: 29.00, deposit: 6.00, cpi: 6.10 }
        ]
    };
    
    const T = (D.trends && D.trends.lasi7Day) ? D.trends : FALLBACK;
    const panel = ensureLuSEPanel();
    if (!panel) return;

    panel.classList.add('active');
    panel.style.display = 'block';

    // Ensure containers exist
    if (!document.getElementById('etfLuseBanner')) { const el = document.createElement('div'); el.id = 'etfLuseBanner'; panel.prepend(el); }
    if (!document.getElementById('etfLuseMovers')) { const el = document.createElement('div'); el.id = 'etfLuseMovers'; el.className = 'etf-luse-movers'; panel.appendChild(el); }
    if (!document.getElementById('etfLuseTrends')) { const el = document.createElement('div'); el.id = 'etfLuseTrends'; el.className = 'etf-luse-trends'; panel.appendChild(el); }
    if (!document.getElementById('etfLuseMarketData')) { const el = document.createElement('div'); el.id = 'etfLuseMarketData'; el.className = 'etf-luse-market-data'; panel.appendChild(el); }
    if (!document.getElementById('etfLuseGrid')) { const el = document.createElement('div'); el.id = 'etfLuseGrid'; el.className = 'etf-companies-list'; panel.appendChild(el); }

    renderLuseBanner();
    renderLuseMovers();

    const trendsEl = document.getElementById('etfLuseTrends');
    trendsEl.setAttribute('style', 'display:grid !important;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:16px;width:100%;');

    const singleCharts = [
        buildLuSETrendChart({ title: 'LuSE All Share Index — 7 Day Rolling Trend', data: T.lasi7Day || [], color: '#1f7a3d' }),
        buildLuSETrendChart({ title: 'LuSE All Share Index — Monthly Trend', data: T.lasiMonthly || [], color: '#2b6cb0' }),
        buildLuSETrendChart({ title: 'Foreign Exchange (USD) — Monthly Trend', data: T.fxUsdMonthly || [], color: '#d97706', prefix: 'ZMW ' })
    ];

    const indexed = (T.indexed && T.indexed.length) ? T.indexed : FALLBACK.indexed;
    const chart4 = buildLuseMultiSeriesChart({
        title: 'ALSI vs CPI vs FX — Monthly Trend (Indexed, Sep 2025 = 100)',
        series: [
            { name: 'ALSI', color: '#2b6cb0', data: indexed.map(d => ({ date: d.date, value: d.alsi })) },
            { name: 'CPI',  color: '#dc2626', data: indexed.map(d => ({ date: d.date, value: d.cpi })) },
            { name: 'USD',  color: '#d97706', data: indexed.map(d => ({ date: d.date, value: d.usd })) }
        ], yMin: 40, yMax: 130
    });

    const rates = (T.interestRates && T.interestRates.length) ? T.interestRates : FALLBACK.interestRates;
    const chart5 = buildLuseMultiSeriesChart({
        title: 'Interest Rates — CPI vs MPR vs T-Bills vs Lending & Deposit',
        series: [
            { name: 'MPR', color: '#dc2626', data: rates.map(d => ({ date: d.date, value: d.mpr })) },
            { name: '90D T-Bill', color: '#d97706', data: rates.map(d => ({ date: d.date, value: d.tbill90 })) },
            { name: '180D T-Bill', color: '#16a34a', data: rates.map(d => ({ date: d.date, value: d.tbill180 })) },
            { name: 'Lending Rate', color: '#ea580c', data: rates.map(d => ({ date: d.date, value: d.lending })) },
            { name: 'Deposit Rate', color: '#0d9488', data: rates.map(d => ({ date: d.date, value: d.deposit })) },
            { name: 'CPI', color: '#2b6cb0', data: rates.map(d => ({ date: d.date, value: d.cpi })) }
        ], yMin: 0, yMax: 35, suffix: '%'
    });

    trendsEl.innerHTML = [...singleCharts, chart4, chart5].filter(Boolean).join('');
    renderLuseMarketData();
    renderLuseCompanyCards();
}

function renderLuseBanner() {
    const el = document.getElementById('etfLuseBanner');
    if (!el) return;
    const lasi = { value: 25455.54, changePct: -0.16, date: '14 Oct 2026' };
    const stats = [
        { label: 'Volume', value: '140,573' }, { label: 'Turnover (ZMW)', value: '442.96K' },
        { label: 'Turnover (USD)', value: '22.53K' }, { label: 'Market Cap', value: '$6.97B' },
        { label: 'Div Yield', value: '2.41%' }, { label: 'P/E Ratio', value: '32.42' }
    ];
    const changeClass = lasi.changePct > 0 ? 'etf-up' : 'etf-down';
    el.innerHTML = `
        <div class="etf-luse-banner">
            <div class="etf-luse-index">
                <div class="etf-luse-index-label">LuSE All Share Index (LASI)</div>
                <div class="etf-luse-index-values">
                    <span class="etf-luse-index-value">${lasi.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span class="etf-luse-index-change ${changeClass}"><i class="fas fa-caret-down"></i> ${lasi.changePct.toFixed(2)}%</span>
                </div>
                <div class="etf-luse-index-date">${lasi.date}</div>
            </div>
            <div class="etf-luse-stats">
                ${stats.map(s => `<div class="etf-luse-stat"><span class="etf-luse-stat-label">${s.label}</span><span class="etf-luse-stat-value">${s.value}</span></div>`).join('')}
            </div>
        </div>`;
}

function renderLuseMovers() {
    const el = document.getElementById('etfLuseMovers');
    if (!el) return;
    const gainers = [{ company: 'DCZM', price: '27.00', change: '+9.76%' }, { company: 'KLRE', price: '0.36', change: '+2.86%' }];
    const losers = [{ company: 'ZFCO', price: '5.00', change: '-11.82%' }, { company: 'ZNCO', price: '8.95', change: '-0.22%' }, { company: 'SCBL', price: '1.17', change: '-0.85%' }];
    
    const buildBlock = (title, icon, list, up) => `
        <div class="etf-luse-movers-block">
            <div class="etf-luse-movers-title"><i class="fas ${icon}"></i> ${title}</div>
            <div class="etf-luse-movers-list">${list.map(m => `<div class="etf-luse-mover"><span>${m.company}</span><span>${m.price}</span><span class="${up ? 'etf-up' : 'etf-down'}">${m.change}</span></div>`).join('')}</div>
        </div>`;
    el.innerHTML = buildBlock('Top Gainers', 'fa-arrow-trend-up', gainers, true) + buildBlock('Top Losers', 'fa-arrow-trend-down', losers, false);
}

function renderLuseMarketData() {
    const el = document.getElementById('etfLuseMarketData');
    if (!el || el.dataset.rendered === '1') return;
    
    const macroCard = `<div class="luse-data-card"><div style="font-weight:800;margin-bottom:8px;">Macro Stats</div><div style="font-size:0.7rem;line-height:1.6;">Inflation: 6.10%<br>MPR: 10.75%<br>GDP (Proj): 6.40%<br>180D T-Bill: 9.10%<br>10Y Bond: 14.50%</div></div>`;
    const fxCard = `<div class="luse-data-card"><div style="font-weight:800;margin-bottom:8px;">FX Rates</div><div style="font-size:0.7rem;line-height:1.6;">USD: 20.0530<br>GBP: 26.4360<br>EUR: 22.3360<br>ZAR: 1.2105</div></div>`;
    const divCard = `<div class="luse-data-card"><div style="font-weight:800;margin-bottom:8px;">Dividends</div><div style="font-size:0.7rem;line-height:1.6;">ATEL: 5.76<br>CEC: 0.76<br>CHIL: 1.00<br>DCZM: 0.20<br>ZCCM-H: 1.13</div></div>`;
    
    el.setAttribute('style', 'display:grid !important;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:16px;');
    el.innerHTML = macroCard + fxCard + divCard;
    el.dataset.rendered = '1';
}

function renderLuseCompanyCards() {
    const grid = document.getElementById('etfLuseGrid');
    if (!grid) return;
    
    const companies = [
        { symbol: 'AECI', name: 'AECI Zambia', price: 115.00, changePct: 11.54, high: 131.00, low: 100.00, volume: 300, ytd: '11.54%' },
        { symbol: 'ATEL', name: 'Airtel Networks Zambia', price: 274.00, changePct: 62.64, high: 280.00, low: 130.00, volume: '14,720', ytd: '62.64%' },
        { symbol: 'BATA', name: 'Bata Shoe Company', price: 9.52, changePct: 45.34, high: 11.00, low: 6.50, volume: '2,365', ytd: '45.34%' },
        { symbol: 'CEC', name: 'Copperbelt Energy', price: 15.24, changePct: 20.95, high: 23.01, low: 14.00, volume: '12,337', ytd: '20.95%' },
        { symbol: 'CHIL', name: 'Chilanga Cement', price: 61.28, changePct: 23.40, high: 88.21, low: 59.00, volume: 371, ytd: '23.40%' },
        { symbol: 'SCBL', name: 'Standard Chartered', price: 1.17, changePct: -0.85, high: 2.55, low: 1.00, volume: '7,441', ytd: '-54.12%' },
        { symbol: 'ZANACO', name: 'Zambia National Commercial Bank', price: 8.95, changePct: -0.22, high: 11.00, low: 5.50, volume: '8,813', ytd: '49.92%' },
        { symbol: 'ZFCO', name: 'Zambia Forestry', price: 5.00, changePct: -11.82, high: 35.26, low: 2.95, volume: '-', ytd: '-11.82%' }
    ];
    
    grid.innerHTML = companies.map(c => {
        const upDown = c.changePct > 0 ? 'etf-up' : 'etf-down';
        return `<div class="etf-company-card" data-action="openETFDetail" data-symbol="${c.symbol}">
            <div class="etf-company-card-head">
                <div class="etf-company-card-titles"><span class="etf-company-symbol">${c.symbol}</span><span class="etf-company-name">${c.name}</span></div>
            </div>
            <div class="etf-company-card-price"><span class="etf-company-price">ZMW ${c.price.toFixed(2)}</span><span class="etf-company-change ${upDown}">${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(2)}%</span></div>
            <div class="etf-company-card-meta">
                <div><span>High</span><strong>${c.high}</strong></div><div><span>Low</span><strong>${c.low}</strong></div>
                <div><span>Volume</span><strong>${c.volume}</strong></div><div><span>YTD</span><strong class="${upDown}">${c.ytd}</strong></div>
            </div>
        </div>`;
    }).join('');
}

// Helper function used by the charts to prevent XSS
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}