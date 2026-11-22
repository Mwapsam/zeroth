/* ================================================================
   ZEROTH BUSINESS SOLUTIONS - MAIN APPLICATION SCRIPT
   Version 3.4.1 — Correctness fixes
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
   MODULE-OWNED ACTIONS
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
function moneyIn(n, currency) {
    return (currency || 'ZMW') + ' ' + (Number(n) || 0).toFixed(2);
}
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================
   APP STATE  (must be declared BEFORE WalletController)
   ================================================================ */
const AppState = {
    user: null,
    wallet: { currency: 'ZMW', balance: 0 },
    notifications: [],
    activeSection: 'home',
    searchSeen: false,
    etf: { companies: [], exchanges: [], watchlist: [], portfolio: {}, commission: 1.5 },
    bets: { active: [], history: [], totalWon: 0 },
    entertainment: { cartoons: [], music: [], movies: [] },
    education: { universities: [], colleges: [], highschools: [], primaryschools: [], library: [] }
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
   FX RATES → ZMW (used by ETF cross-currency trades)
   Set real rates when you have them. 1 = same value as ZMW.
   ================================================================ */
const FX_TO_ZMW = {
    ZMW: 1,
    ZAR: 1,      // e.g. 1.35
    KES: 1,      // e.g. 0.16
    NGN: 1,      // e.g. 0.0027
    USD: 1       // e.g. 28.0
};
function toZMW(amount, currency) {
    const rate = FX_TO_ZMW[currency] ?? 1;
    return +(Number(amount) * rate).toFixed(2);
}

/* ================================================================
   WALLET — SINGLE SOURCE OF TRUTH
   All wallet reads/writes MUST go through WalletController.
   AppState.wallet is the canonical object; DOM updates are fan-out only.
   ================================================================ */
const WalletController = {
    _listeners: new Set(),

    /** @returns {{currency:string, balance:number}} */
    get() {
        return AppState.wallet;
    },

    /** Replace the entire wallet (e.g. after login). Fires listeners. */
    set(wallet) {
        AppState.wallet = {
            currency: wallet?.currency || 'ZMW',
            balance: Number(wallet?.balance) || 0
        };
        saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
        this._notify();
        updateAuthUI();
    },

    /**
     * Adjust balance by delta (negative = debit).
     * @param {number} delta
     * @param {{desc?:string, type?:'in'|'out', silent?:boolean}} [meta]
     * @returns {number} new balance
     */
    adjust(delta, meta = {}) {
        const amount = Number(delta) || 0;
        AppState.wallet.balance = +(AppState.wallet.balance + amount).toFixed(2);
        saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
        if (!meta.silent) {
            this._notify(meta);
            updateAuthUI();
        }
        return AppState.wallet.balance;
    },

    /** Throws if balance < amount. Returns true otherwise. */
    require(amount) {
        const n = Number(amount) || 0;
        if (AppState.wallet.balance < n) {
            const err = new Error(
                `Insufficient balance: need ${money(n)}, have ${money(AppState.wallet.balance)}`
            );
            err.code = 'INSUFFICIENT_FUNDS';
            throw err;
        }
        return true;
    },

    /** Subscribe to wallet changes. Returns unsubscribe fn. */
    onChange(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    },

    _notify(meta = {}) {
        const snapshot = { ...AppState.wallet, ...meta };
        this._listeners.forEach(fn => {
            try { fn(snapshot); } catch (e) { console.warn('[Wallet] listener error', e); }
        });
    }
};

/* ================================================================
   INITIAL DATA SEEDING
   ================================================================ */
function seedETFData() {
    AppState.etf.exchanges = [
        { id: 'lusaka', name: 'Lusaka Securities Exchange', symbol: 'LuSE', flag: '🇿🇲', currency: 'ZMW', companies: [
            { symbol: 'ZANACO', name: 'Zambia National Commercial Bank', price: 4.20, change: 1.8, open: 4.15, high: 4.25, low: 4.10, volume: '125K', marketCap: 'ZMW 1.2B', pe: 6.8, about: 'Leading commercial bank in Zambia.' },
            { symbol: 'ZMBF', name: 'Zambia Breweries', price: 12.50, change: -0.5, open: 12.60, high: 12.75, low: 12.40, volume: '48K', marketCap: 'ZMW 3.4B', pe: 14.2, about: 'Largest brewer in Zambia.' },
            { symbol: 'SHOPRITE', name: 'Shoprite Holdings', price: 185.00, change: 0.9, open: 183.50, high: 186.20, low: 182.80, volume: '22K', marketCap: 'ZMW 8.9B', pe: 18.5, about: 'Africa\'s largest food retailer.' },
            { symbol: 'CFB', name: 'Copperbelt Energy', price: 8.75, change: 2.3, open: 8.55, high: 8.90, low: 8.50, volume: '67K', marketCap: 'ZMW 2.1B', pe: 9.4, about: 'Power transmission company.' }
        ]},
        { id: 'jse', name: 'Johannesburg Stock Exchange', symbol: 'JSE', flag: '🇿🇦', currency: 'ZAR', companies: [
            { symbol: 'NPN', name: 'Naspers Limited', price: 3250.00, change: 1.2, open: 3210.00, high: 3275.00, low: 3205.00, volume: '340K', marketCap: 'ZAR 1.4T', pe: 22.1, about: 'Global internet group.' },
            { symbol: 'SOL', name: 'Sasol Limited', price: 185.40, change: -1.8, open: 188.50, high: 189.20, low: 184.10, volume: '1.2M', marketCap: 'ZAR 118B', pe: 8.9, about: 'Energy and chemical company.' },
            { symbol: 'MTN', name: 'MTN Group', price: 92.75, change: 0.6, open: 92.20, high: 93.40, low: 91.80, volume: '890K', marketCap: 'ZAR 174B', pe: 12.4, about: 'Mobile telecom operator.' },
            { symbol: 'SBK', name: 'Standard Bank Group', price: 178.30, change: 1.1, open: 176.50, high: 179.10, low: 176.00, volume: '560K', marketCap: 'ZAR 295B', pe: 9.8, about: 'Financial services group.' }
        ]},
        { id: 'nse', name: 'Nairobi Securities Exchange', symbol: 'NSE', flag: '🇰🇪', currency: 'KES', companies: [
            { symbol: 'SCOM', name: 'Safaricom PLC', price: 28.50, change: 2.5, open: 27.80, high: 28.90, low: 27.75, volume: '2.4M', marketCap: 'KES 1.1T', pe: 16.8, about: 'Telecom, M-Pesa pioneer.' },
            { symbol: 'EQTY', name: 'Equity Group Holdings', price: 42.75, change: 0.8, open: 42.40, high: 43.20, low: 42.10, volume: '1.1M', marketCap: 'KES 161B', pe: 7.2, about: 'Pan-African financial services.' },
            { symbol: 'KCB', name: 'KCB Group', price: 35.20, change: -0.4, open: 35.35, high: 35.60, low: 34.90, volume: '780K', marketCap: 'KES 113B', pe: 5.9, about: 'Largest bank in East Africa.' },
            { symbol: 'EABL', name: 'East African Breweries', price: 158.00, change: 1.5, open: 155.75, high: 159.25, low: 155.50, volume: '420K', marketCap: 'KES 125B', pe: 15.3, about: 'Leading beverage business.' }
        ]},
        { id: 'ngx', name: 'Nigerian Exchange Group', symbol: 'NGX', flag: '🇳🇬', currency: 'NGN', companies: [
            { symbol: 'DANGCEM', name: 'Dangote Cement', price: 485.20, change: 1.7, open: 477.10, high: 488.50, low: 476.80, volume: '3.2M', marketCap: 'NGN 8.3T', pe: 14.6, about: 'Africa\'s largest cement producer.' },
            { symbol: 'MTNN', name: 'MTN Nigeria', price: 225.50, change: -0.9, open: 227.60, high: 228.40, low: 224.10, volume: '1.8M', marketCap: 'NGN 4.6T', pe: 11.2, about: 'Mobile telecom provider.' },
            { symbol: 'ZENITHBANK', name: 'Zenith Bank', price: 38.75, change: 2.1, open: 37.95, high: 39.10, low: 37.80, volume: '5.6M', marketCap: 'NGN 1.2T', pe: 4.8, about: 'Large commercial bank.' },
            { symbol: 'GTCO', name: 'Guaranty Trust Holding', price: 42.30, change: 1.4, open: 41.70, high: 42.85, low: 41.55, volume: '4.1M', marketCap: 'NGN 1.2T', pe: 5.2, about: 'Leading financial institution.' }
        ]}
    ];
    AppState.etf.companies = AppState.etf.exchanges.flatMap(ex =>
        ex.companies.map(c => ({ ...c, exchange: ex.name, exchangeSymbol: ex.symbol, currency: ex.currency }))
    );
}

function seedBetData() {
    // Guard: never wipe existing bets. Only seed on first run.
    if (AppState.bets.active.length > 0 || AppState.bets.history.length > 0) return;
    AppState.bets.active = [
        { id: 'bet_' + Date.now().toString(36), type: 'pvp', event: 'Zambia vs Kenya', eventIcon: '⚽', pick: 'Zambia Win', amount: 100, status: 'pending', createdAt: Date.now() - 3600000 }
    ];
    AppState.bets.history = [
        { id: 'bet_hist_1', type: 'company', event: 'Arsenal vs Chelsea', eventIcon: '⚽', pick: 'Arsenal Win', amount: 150, odds: 2.10, payout: 315, status: 'won', createdAt: Date.now() - 86400000 }
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
                id: 'unza', name: 'University of Zambia', type: 'University', icon: 'fas fa-university',
                location: 'Lusaka, Zambia', rating: '4.7', programs: '120+', established: '1966', students: '30,000+',
                description: 'The University of Zambia is the largest and oldest university in Zambia.',
                highlights: ['Top-ranked in Zambia', 'Research-intensive', 'Diverse student body'],
                programList: [
                    { name: 'Bachelor of Medicine', duration: '5 years' },
                    { name: 'Bachelor of Engineering', duration: '4 years' },
                    { name: 'Bachelor of Laws', duration: '4 years' },
                    { name: 'Bachelor of Education', duration: '4 years' }
                ],
                address: 'Great East Road, Lusaka', phone: '+260 211 250 000', email: 'info@unza.zm', website: 'www.unza.zm',
                fees: [
                    { program: 'Medicine', amount: 'ZMW 45,000/year' },
                    { program: 'Engineering', amount: 'ZMW 32,000/year' },
                    { program: 'Laws', amount: 'ZMW 28,000/year' },
                    { program: 'Education', amount: 'ZMW 18,000/year' }
                ]
            },
            {
                id: 'cbu', name: 'Copperbelt University', type: 'University', icon: 'fas fa-university',
                location: 'Kitwe, Zambia', rating: '4.5', programs: '80+', established: '1987', students: '15,000+',
                description: 'The Copperbelt University specializes in engineering, business, and applied sciences.',
                highlights: ['Strong engineering focus', 'Industry partnerships', 'Modern facilities'],
                programList: [
                    { name: 'Bachelor of Mining Engineering', duration: '5 years' },
                    { name: 'Bachelor of Business Administration', duration: '4 years' },
                    { name: 'Bachelor of Computer Science', duration: '4 years' }
                ],
                address: 'Jambo Drive, Riverside, Kitwe', phone: '+260 212 224 955', email: 'info@cbu.ac.zm', website: 'www.cbu.ac.zm',
                fees: [
                    { program: 'Mining Engineering', amount: 'ZMW 38,000/year' },
                    { program: 'Business Admin', amount: 'ZMW 22,000/year' },
                    { program: 'Computer Science', amount: 'ZMW 25,000/year' }
                ]
            }
        ];
        AppState.education.colleges = [
            {
                id: 'evelyn', name: 'Evelyn Hone College', type: 'College', icon: 'fas fa-user-graduate',
                location: 'Lusaka, Zambia', rating: '4.4', programs: '45+', established: '1963', students: '8,000+',
                description: 'Evelyn Hone College is a leading technical and vocational college.',
                highlights: ['Hands-on training', 'Creative arts programs', 'Industry linkages'],
                programList: [
                    { name: 'Diploma in Journalism', duration: '3 years' },
                    { name: 'Diploma in Graphic Design', duration: '3 years' },
                    { name: 'Diploma in Business Administration', duration: '3 years' }
                ],
                address: 'Church Road, Lusaka', phone: '+260 211 227 512', email: 'info@evelynhone.edu.zm', website: 'www.evelynhone.edu.zm',
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
            { id: 'bk1', title: 'Introduction to Zambian History', author: 'Dr. M. Banda', type: 'book', free: true, price: 0, cover: 'images/library/zambian-history.jpg', link: 'files/library/introduction-to-zambian-history.pdf', desc: 'A comprehensive survey of Zambia.' },
            { id: 'bk2', title: 'Mathematics for Grade 12', author: 'P. Mwansa', type: 'book', free: false, price: 85, cover: 'images/library/math-g12.jpg', link: 'https://store.zeroth.com/books/mathematics-grade-12', desc: 'Complete ECZ-aligned Grade 12 mathematics textbook.' },
            { id: 'bk3', title: 'Agricultural Science Handbook', author: 'ZBS Publications', type: 'book', free: true, price: 0, cover: 'images/library/agri-science.jpg', link: 'files/library/agricultural-science-handbook.pdf', desc: 'Practical field guide for smallholder farmers.' },
            { id: 'bk4', title: 'Financial Literacy for SMEs', author: 'ZBS Financial Partners', type: 'book', free: false, price: 120, cover: 'images/library/financial-literacy.jpg', link: '', desc: 'Guide to managing cash flow, credit, and growth.' }
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
                setTimeout(() => { handleSearchAction(action); }, 250);
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

function cloneWallet(w) {
    return {
        currency: w?.currency || 'ZMW',
        balance: Number(w?.balance) || 0
    };
}

async function handleLogin(e) {
    e.preventDefault();
    const email     = $('#authEmail')?.value.trim();
    const password  = $('#authPassword')?.value;
    const errorEl   = $('#authError');
    const successEl = $('#authSuccess');
    const btn       = $('#authSubmitBtn');

    if (!email || !password) {
        showAuthMsg(errorEl, 'Please enter email and password.', 'error');
        return;
    }
    if (!window.API) {
        showAuthMsg(errorEl, 'API not loaded — refresh the page.', 'error');
        return;
    }
    btn.disabled    = true;
    btn.textContent = 'Signing in…';
    try {
        const r = await window.API.Auth.login(email, password);
        const user = r.user || r.data || { email };
        AppState.user   = user;
        AppState.wallet = cloneWallet(user.wallet);
        saveToStorage(STORAGE_KEYS.user, AppState.user);
        saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
        showAuthMsg(successEl, '✅ Login successful!', 'success');
        setTimeout(() => {
            closeLoginModal();
            updateAuthUI();
            showToast('Welcome back, ' + (AppState.user.name || 'User'));
        }, 600);
    } catch (err) {
        showAuthMsg(errorEl, err.message || 'Invalid credentials', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Login';
    }
}

function showAuthMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.removeAttribute('hidden');
    el.className = (el.id === 'authError' ? 'error-msg' : 'success-msg') + ' ' + type;
}

function logout() {
    if (window.API?.Auth?.logout) {
        try { window.API.Auth.logout(); } catch (e) {}
    }
    AppState.user   = null;
    AppState.wallet = { currency: 'ZMW', balance: 0 };
    try {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.wallet);
    } catch (e) {}
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
        if (un) un.textContent = AppState.user.name || 'User';
        if (wb) wb.textContent = AppState.wallet.balance.toFixed(2);
        if (dn) dn.textContent = AppState.user.name || 'User';
        if (de) de.textContent = AppState.user.email || '';
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
        if (sn) sn.textContent = AppState.user.name || 'User';
        if (se) se.textContent = AppState.user.email || '';
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
   PROFILE / FOOTER / HEADER / NOTIFICATIONS
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
function toggleNotifications() {
    const dropdown = $('#notificationDropdown');
    if (!dropdown) return;
    const isOpen = !dropdown.hidden;
    if (isOpen) { dropdown.hidden = true; dropdown.setAttribute('hidden', ''); }
    else { dropdown.hidden = false; dropdown.removeAttribute('hidden'); }
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
   SHARE APPLICATION FORM
   ================================================================ */
let shareAppLastFocused = null;

function isShareApplicationModal(wrapper) {
    if (!wrapper) return false;
    try { return getComputedStyle(wrapper).position === 'fixed'; }
    catch (_) { return false; }
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

async function handleShareApplication(e) {
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
    const payload = {
        type: 'share',
        fullName: $('#shareFullName')?.value.trim(),
        gender: $('#shareGender')?.value,
        dob: $('#shareDob')?.value,
        nrc: $('#shareNrc')?.value.trim(),
        country: $('#shareCountry')?.value,
        phone: $('#sharePhone')?.value.trim(),
        email: $('#shareEmail')?.value.trim(),
        residence: $('#shareResidence')?.value.trim(),
        company: $('#shareCompany')?.value,
        quantity: Number($('#shareQuantity')?.value) || 0,
        amount: $('#shareAmount')?.value,
        paymentMethod: $('#sharePaymentMethod')?.value,
        submittedAt: new Date().toISOString()
    };
    if (window.API) {
        try {
            await window.API.applications.create(payload);
            showStatus(statusEl, '✅ Application submitted successfully! We will contact you soon.', 'success');
        } catch (err) {
            showStatus(statusEl, '❌ ' + (err.message || 'Submission failed.'), 'error');
            return;
        }
    } else {
        showStatus(statusEl, '✅ Application submitted successfully! We will contact you soon.', 'success');
    }
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
        'ZBS Limited': 5.00, 'ZBS Agro Holdings': 3.50, 'ZBS Financial Partners': 8.00,
        'ZBS Tech Solutions': 6.50, 'ZBS Energy Resources': 4.00
    };
    const price = prices[company] || 0;
    const amountEl = $('#shareAmount');
    if (amountEl) amountEl.value = price && qty ? `ZMW ${(price * qty).toFixed(2)}` : '';
}

function showStatus(el, msg, type) {
    if (!el) return;
    if (!msg) { el.hidden = true; el.setAttribute('hidden', ''); return; }
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
        if (e.target === wrapper) closeShareApplication();
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
   MODULE OPENERS
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
let _uploadInterval = null;

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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

function renderEntertainment() {
    const countMap = { cartoons: 'countCartoons', music: 'countMusic', movies: 'countMovies' };
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
    // Cancel any in-flight simulated upload
    if (_uploadInterval) { clearInterval(_uploadInterval); _uploadInterval = null; }
    modal.classList.remove('active');
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

async function handleUpload(e) {
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
    // Cancel any prior interval
    if (_uploadInterval) { clearInterval(_uploadInterval); _uploadInterval = null; }
    _uploadInterval = setInterval(async () => {
        pct += 10;
        if (bar) bar.style.width = pct + '%';
        if (text) text.textContent = pct + '%';
        if (pct >= 100) {
            clearInterval(_uploadInterval);
            _uploadInterval = null;
            const newItem = {
                id: 'ent_' + Date.now().toString(36),
                title, artist: $('#uploadArtist')?.value.trim() || 'Unknown',
                description: $('#uploadDescription')?.value.trim() || '',
                type, source: 'user', duration: '—'
            };
            if (window.API) {
                try {
                    const saved = await window.API.upload('/entertainment', file, {
                        title: newItem.title, artist: newItem.artist,
                        description: newItem.description, type
                    });
                    if (saved && (saved.id || saved._id)) newItem.id = saved.id || saved._id;
                } catch (err) {
                    console.warn('[Entertainment] server upload failed, saving locally:', err.message);
                }
            }
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

function renderEducation() {
    const countMap = {
        universities:   'countUniversities',
        colleges:       'countColleges',
        highschools:    'countHighSchools',
        primaryschools: 'countPrimarySchools',
        library:        'countLibrary'
    };

    const types = ['universities', 'colleges', 'highschools', 'primaryschools', 'library'];

    types.forEach(type => {
        const grid    = $(`#grid-${type}`);
        const empty   = $(`#empty-${type}`);
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
            grid.innerHTML = items.map(item => {
                const priceLabel = item.free ? 'Free' : money(item.price);

                const coverHtml = item.cover
                    ? `<img class="edu-book-cover" src="${escapeHtml(item.cover)}"
                            alt="${escapeHtml(item.title)}" loading="lazy"
                            onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('i'),{className:'fas fa-book edu-type-icon'}))">`
                    : `<i class="fas fa-book edu-type-icon"></i>`;

                const inner = `
                    <div class="edu-card-thumb">
                        ${coverHtml}
                        <span class="edu-card-type">Book</span>
                        <span class="edu-card-badge ${item.free ? 'free' : 'paid'}">${item.free ? 'FREE' : 'PAID'}</span>
                    </div>
                    <div class="edu-card-body">
                        <div class="edu-card-title">${escapeHtml(item.title)}</div>
                        <div class="edu-card-sub">${escapeHtml(item.author)}</div>
                        <div class="edu-card-meta">
                            <span class="edu-card-price ${item.free ? 'free' : ''}">${priceLabel}</span>
                        </div>
                    </div>
                `;

                if (item.link) {
                    const isExternal = /^https?:\/\//i.test(item.link);
                    const targetAttrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
                    return `
                        <a class="edu-card edu-library-card--link"
                           href="${escapeHtml(item.link)}"
                           ${targetAttrs}
                           data-id="${item.id}"
                           aria-label="Open ${escapeHtml(item.title)}">
                            ${inner}
                        </a>
                    `;
                }

                if (!item.free && item.price > 0) {
                    return `
                        <div class="edu-card edu-library-card--paid"
                             data-id="${item.id}"
                             data-action="eduBuyBook"
                             role="button"
                             tabindex="0"
                             aria-label="Buy ${escapeHtml(item.title)}">
                            ${inner}
                        </div>
                    `;
                }

                return `<div class="edu-card" data-id="${item.id}">${inner}</div>`;
            }).join('');
            return;
        }

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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

async function handleInstitutionApp(e) {
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
    const payload = {
        type: 'education',
        institution: $('#appFormInstitution')?.textContent,
        surname: $('#afSurname')?.value.trim(),
        firstName: $('#afFirstName')?.value.trim(),
        otherNames: $('#afOtherNames')?.value.trim(),
        dob: $('#afDob')?.value,
        sex: $('#afSex')?.value,
        maritalStatus: $('#afMaritalStatus')?.value,
        nationality: $('#afNationality')?.value.trim(),
        idNumber: $('#afIdNumber')?.value.trim(),
        profession: $('#afProfession')?.value.trim(),
        homeAddress: $('#afHomeAddress')?.value.trim(),
        country: $('#afCountry')?.value.trim(),
        postalAddress: $('#afPostalAddress')?.value.trim(),
        phone: $('#afPhone')?.value.trim(),
        email: $('#afEmail')?.value.trim(),
        guardianName: $('#afGuardianName')?.value.trim(),
        guardianPhone: $('#afGuardianPhone')?.value.trim(),
        guardianEmail: $('#afGuardianEmail')?.value.trim(),
        program1: $('#afProgram1')?.value.trim(),
        program2: $('#afProgram2')?.value.trim(),
        program3: $('#afProgram3')?.value.trim(),
        submittedAt: new Date().toISOString()
    };
    if (window.API) {
        try { await window.API.applications.create(payload); }
        catch (err) {
            statusEl.textContent = '❌ ' + (err.message || 'Submission failed.');
            statusEl.className = 'app-form-status error';
            statusEl.hidden = false;
            return;
        }
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

async function handleTutorRequest(e) {
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
    const payload = {
        type: 'tutor',
        subject: $('#tutorSubject')?.value,
        level: $('#tutorLevel')?.value,
        mode: $('#tutorMode')?.value,
        schedule: $('#tutorSchedule')?.value.trim(),
        name: $('#tutorName')?.value.trim(),
        contact: $('#tutorContact')?.value.trim(),
        notes: $('#tutorNotes')?.value.trim(),
        submittedAt: new Date().toISOString()
    };
    if (window.API) {
        try { await window.API.consultation.create(payload); }
        catch (err) {
            statusEl.textContent = '❌ ' + (err.message || 'Submission failed.');
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

function openEduBookPurchase(bookId) {
    const book = (AppState.education.library || []).find(b => b.id === bookId);
    if (!book) { showToast('⚠️ Book not found'); return; }
    const openGateway = (window.PaymentGateway && typeof window.PaymentGateway.open === 'function')
        ? window.PaymentGateway.open
        : (typeof window.openPaymentGateway === 'function' ? window.openPaymentGateway : null);
    if (!openGateway) {
        showToast('⚠️ Payment gateway is loading — please try again.');
        return;
    }
    openGateway({
        amount: book.price,
        currency: 'ZMW',
        description: 'Library purchase — ' + book.title,
        reference: 'edu_' + book.id + '_' + Date.now().toString(36),
        onSuccess: () => {
            const deliveryUrl = book.downloadUrl || book.link || ('files/library/' + book.id + '.pdf');
            showToast('✅ Payment received — opening your book…');
            setTimeout(() => window.open(deliveryUrl, '_blank', 'noopener'), 400);
        },
        onCancel: () => { showToast('Purchase cancelled'); }
    });
}

/* ================================================================
   ETF TRADING HUB
   ================================================================ */
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
                <i class="fas fa-chart-line" style="color:#1f7a3d;"></i> LuSE Market Trends
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
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.28" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
                    </linearGradient>
                </defs>
                ${yLabels.map(l => `
                    <line x1="${P.left}" y1="${l.y.toFixed(1)}" x2="${W - P.right}" y2="${l.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3" />
                    <text x="${P.left - 6}" y="${(l.y + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#6b7280">${escapeHtml(l.label)}</text>
                `).join('')}
                <path d="${areaPath}" fill="url(#${gradId})" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                ${points.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.5}" fill="${color}" stroke="#fff" stroke-width="1.5" />`).join('')}
                ${xLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#6b7280">${escapeHtml(l.date)}</text>`).join('')}
            </svg>
        </div>`;
}

function renderLuSETrends() {
    if (document.querySelectorAll('#etfLuseTrends .etf-luse-chart').length > 0) return;
    const D = window.LUSE_DATA || {};
    const FALLBACK = {
        lasi7Day: [
            { date: "6 Oct", value: 25670 }, { date: "7 Oct", value: 25480 },
            { date: "8 Oct", value: 25700 }, { date: "9 Oct", value: 25655 },
            { date: "10 Oct", value: 25620 }, { date: "11 Oct", value: 25600 },
            { date: "12 Oct", value: 25550 }, { date: "13 Oct", value: 25500 },
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
    if (!panel) { console.error('[LuSE-Trends] Cannot ensure #etf-panel-luse'); return; }
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
    trendsEl.setAttribute('style',
        'display:grid !important;' +
        'grid-template-columns:repeat(auto-fit,minmax(280px,1fr));' +
        'gap:14px;margin-bottom:16px;width:100%;' +
        'visibility:visible !important;opacity:1 !important;' +
        'height:auto !important;min-height:220px;'
    );
    const charts = [
        buildLuSETrendChart({ title: 'LuSE All Share Index — 7 Day Rolling Trend', data: T.lasi7Day || [], color: '#1f7a3d' }),
        buildLuSETrendChart({ title: 'LuSE All Share Index — Monthly Trend', data: T.lasiMonthly || [], color: '#2b6cb0' }),
        buildLuSETrendChart({ title: 'Foreign Exchange (USD) — Monthly Trend', data: T.fxUsdMonthly || [], color: '#d97706', prefix: 'ZMW ' })
    ].filter(Boolean);
    if (!charts.length) { console.error('[LuSE-Trends] All chart data empty'); return; }
    trendsEl.innerHTML = charts.join('');
    console.log(`[LuSE-Trends] ✔ Rendered ${charts.length} charts`);
}

function setLuseData(trends) {
    window.LUSE_DATA = window.LUSE_DATA || {};
    window.LUSE_DATA.trends = trends;
    const t = document.getElementById('etfLuseTrends');
    if (t) { t.innerHTML = ''; renderLuSETrends(); }
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

function renderETFExchanges(filter = '') {
    const container = $('#etfExchangesList');
    if (!container) return;
    const q = filter.toLowerCase();
    const exchanges = AppState.etf.exchanges.map(ex => ({
        ...ex,
        companies: ex.companies.filter(c => !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
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
            if (e.target.closest('[data-action="toggleWatch"]')) return;
            e.stopPropagation();
            openETFDetail(card.dataset.symbol);
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
    if (idx >= 0) { list.splice(idx, 1); showToast(`☆ Removed ${symbol} from watchlist`); }
    else { list.push(symbol); showToast(`⭐ Added ${symbol} to watchlist`); }
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
    if (list.length === 0) { grid.innerHTML = ''; empty?.classList.add('show'); return; }
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
                <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">Total Value</span><span class="etf-portfolio-stat-value">${money(totalValue)}</span></div>
                <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">Total Cost</span><span class="etf-portfolio-stat-value">${money(totalCost)}</span></div>
                <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">P&L</span><span class="etf-portfolio-stat-value" style="color:${pnl >= 0 ? '#16a34a' : '#dc2626'}">${pnl >= 0 ? '+' : ''}${money(pnl)}</span></div>
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
    const totalZMW = toZMW(total, company.currency);
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('etfTradePrice', `${company.currency} ${company.price.toFixed(2)}`);
    set('etfTradeQty', `${qty} shares`);
    set('etfTradeSubtotal', moneyIn(subtotal, company.currency));
    set('etfTradeCommission', moneyIn(commission, company.currency));
    set('etfTradeTotal', moneyIn(total, company.currency));
    // Show ZMW debit/credit note when currency differs
    const noteEl = $('#etfTradeZmwNote');
    if (noteEl) {
        if (company.currency !== 'ZMW') {
            noteEl.textContent = `Wallet ${mode === 'buy' ? 'debit' : 'credit'}: ${money(totalZMW)}`;
            noteEl.hidden = false;
            noteEl.removeAttribute('hidden');
        } else {
            noteEl.hidden = true;
            noteEl.setAttribute('hidden', '');
        }
    }
}

async function handleTradeSubmit(e) {
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
    if (!company) {
        statusEl.textContent = '❌ Unknown symbol.';
        statusEl.className = 'etf-trade-status error';
        statusEl.hidden = false;
        return;
    }
    const subtotal = company.price * qty;
    const commission = subtotal * (AppState.etf.commission / 100);
    const total = mode === 'buy' ? subtotal + commission : subtotal - commission;
    const totalZMW = toZMW(total, company.currency);

    if (mode === 'buy') {
        try {
            WalletController.require(totalZMW);
        } catch (err) {
            statusEl.textContent = `❌ Insufficient balance. You need ${money(totalZMW)} but have ${money(AppState.wallet.balance)}.`;
            statusEl.className = 'etf-trade-status error';
            statusEl.hidden = false;
            return;
        }
        if (window.API) {
            try {
                await window.API.etf.create({
                    action: 'buy', symbol, exchange: company.exchange, currency: company.currency,
                    price: company.price, quantity: qty, subtotal, commission, total,
                    totalZMW, placedAt: new Date().toISOString()
                });
            } catch (err) {
                statusEl.textContent = '❌ ' + (err.message || 'Order failed.');
                statusEl.className = 'etf-trade-status error';
                statusEl.hidden = false;
                return;
            }
        }
        WalletController.adjust(-totalZMW, { desc: `Buy ${qty} ${symbol}` });
        const holding = AppState.etf.portfolio[symbol] || { qty: 0, avgPrice: 0 };
        const newQty = holding.qty + qty;
        const newAvg = ((holding.avgPrice * holding.qty) + subtotal) / newQty;
        AppState.etf.portfolio[symbol] = { qty: newQty, avgPrice: newAvg };
        statusEl.textContent = `✅ Bought ${qty} shares of ${symbol} for ${money(totalZMW)}.`;
        statusEl.className = 'etf-trade-status success';
    } else {
        const holding = AppState.etf.portfolio[symbol];
        if (!holding || holding.qty < qty) {
            statusEl.textContent = `❌ You only own ${holding?.qty || 0} shares.`;
            statusEl.className = 'etf-trade-status error';
            statusEl.hidden = false;
            return;
        }
        if (window.API) {
            try {
                await window.API.etf.create({
                    action: 'sell', symbol, exchange: company.exchange, currency: company.currency,
                    price: company.price, quantity: qty, subtotal, commission, total,
                    totalZMW, placedAt: new Date().toISOString()
                });
            } catch (err) {
                statusEl.textContent = '❌ ' + (err.message || 'Order failed.');
                statusEl.className = 'etf-trade-status error';
                statusEl.hidden = false;
                return;
            }
        }
        WalletController.adjust(+totalZMW, { desc: `Sell ${qty} ${symbol}` });
        holding.qty -= qty;
        if (holding.qty <= 0) delete AppState.etf.portfolio[symbol];
        else AppState.etf.portfolio[symbol] = holding;
        statusEl.textContent = `✅ Sold ${qty} shares of ${symbol} for ${money(totalZMW)}.`;
        statusEl.className = 'etf-trade-status success';
    }
    statusEl.hidden = false;
    saveToStorage(STORAGE_KEYS.portfolio, AppState.etf.portfolio);
    updateETFStats();
    renderETFPortfolio();
    setTimeout(() => { closeETFDetail(); statusEl.hidden = true; }, 1800);
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
            <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">Total Value</span><span class="etf-portfolio-stat-value">${money(totalValue)}</span></div>
            <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">Total Cost</span><span class="etf-portfolio-stat-value">${money(totalCost)}</span></div>
            <div class="etf-portfolio-stat"><span class="etf-portfolio-stat-label">P&L</span><span class="etf-portfolio-stat-value" style="color:${pnl >= 0 ? '#16a34a' : '#dc2626'}">${pnl >= 0 ? '+' : ''}${money(pnl)}</span></div>
        `;
    }
}

/* ================================================================
   BET & GAMING HUB
   ================================================================ */
const BET_EVENTS = {
    evt1: { icon: '⚽', name: 'Zambia vs Kenya', league: 'Africa Cup', date: 'Today 18:00', players: 12, amount: 100 },
    evt2: { icon: '⚽', name: 'Arsenal vs Chelsea', league: 'Premier League', date: 'Today 20:00', players: 34, amount: 250 },
    evt3: { icon: '🏀', name: 'Lakers vs Celtics', league: 'NBA', date: 'Tomorrow 02:00', players: 8, amount: 500 },
    evt4: { icon: '🎾', name: 'Djokovic vs Alcaraz', league: 'Wimbledon', date: 'Tomorrow 15:00', players: 5, amount: 200 }
};

const BET_GAMES = {
    g1: { icon: '♟️', name: 'Chess', desc: 'Classic strategy game. Beat your opponent in 10 minutes.', players: '1,234' },
    g2: { icon: '🎯', name: 'Darts', desc: 'Aim and throw. Highest score wins.', players: '856' },
    g3: { icon: '🃏', name: 'Cards', desc: 'Poker & more. Best hand takes the pot.', players: '2,103' },
    g4: { icon: '🎲', name: 'Dice', desc: 'Roll to win. Highest roll takes all.', players: '3,421' },
    g5: { icon: '⚽', name: 'Penalty Shootout', desc: 'Score the winner. 5 shots each.', players: '1,876' },
    g6: { icon: '🏓', name: 'Ping Pong', desc: 'Fast-paced fun. First to 11 wins.', players: '987' }
};

let _betMatchInterval = null;

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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
}

function renderBetEvents() {
    const pvpList = $('#betPvpEventsList');
    const companyList = $('#betCompanyEventsList');
    const pvpCount = $('#betPvpCount');
    if (!pvpList || !companyList) return;
    const events = Object.entries(BET_EVENTS).map(([id, e]) => ({ id, ...e }));
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
    const games = Object.entries(BET_GAMES).map(([id, g]) => ({ id, ...g }));
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
    const evt = BET_EVENTS[eventId] || BET_EVENTS.evt1;
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
    if (_betMatchInterval) { clearInterval(_betMatchInterval); _betMatchInterval = null; }
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
    if (_betMatchInterval) { clearInterval(_betMatchInterval); _betMatchInterval = null; }
    _betMatchInterval = setInterval(async () => {
        sec++;
        if (matchTime) matchTime.textContent = `${sec}s elapsed`;
        if (sec >= 3) {
            clearInterval(_betMatchInterval);
            _betMatchInterval = null;
            if (matchText) matchText.textContent = '✅ Opponent found!';
            setTimeout(async () => {
                const payload = {
                    type: 'pvp', event: currentBetEvent.name, eventIcon: currentBetEvent.icon,
                    pick, amount, status: 'pending', placedAt: new Date().toISOString()
                };
                if (window.API) {
                    try { await window.API.bets.create(payload); }
                    catch (err) { console.warn('[Bets] server save failed:', err.message); }
                }
                try {
                    WalletController.require(amount);
                } catch (_) {
                    statusEl.textContent = `❌ Insufficient balance. You have ${money(AppState.wallet.balance)}.`;
                    statusEl.className = 'bet-place-status error';
                    statusEl.hidden = false;
                    return;
                }
                WalletController.adjust(-amount, { desc: `Bet: ${pick} on ${currentBetEvent.name}` });
                AppState.bets.active.push({ id: 'bet_' + Date.now().toString(36), ...payload });
                saveToStorage(STORAGE_KEYS.bets, AppState.bets);
                updateBetStats();
                renderMyBets();
                closeBetPlace();
                showToast(`✅ Bet placed: ${pick} on ${currentBetEvent.name}`);
            }, 800);
        }
    }, 1000);
}

function cancelBetMatch() {
    if (_betMatchInterval) { clearInterval(_betMatchInterval); _betMatchInterval = null; }
    const matchSec = $('#betMatchmakingSection');
    if (matchSec) matchSec.setAttribute('hidden', '');
    const s = $('#betPlaceStatus');
    if (s) s.hidden = true;
}

function openBetCompany(eventId) {
    const modal = $('#betCompanyModal');
    if (!modal) return;
    const evt = BET_EVENTS[eventId] || BET_EVENTS.evt1;
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

async function confirmBetCompany() {
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
    try {
        WalletController.require(amount);
    } catch (_) {
        statusEl.textContent = `❌ Insufficient balance. You have ${money(AppState.wallet.balance)}.`;
        statusEl.className = 'bet-place-status error';
        statusEl.hidden = false;
        return;
    }
    const odds = parseFloat(selected.dataset.odds);
    const payload = {
        type: 'company', event: currentBetEvent.name, eventIcon: currentBetEvent.icon,
        pick: selected.dataset.outcome, amount, odds, status: 'pending',
        placedAt: new Date().toISOString()
    };
    if (window.API) {
        try { await window.API.bets.create(payload); }
        catch (err) {
            statusEl.textContent = '❌ ' + (err.message || 'Bet failed.');
            statusEl.className = 'bet-place-status error';
            statusEl.hidden = false;
            return;
        }
    }
    WalletController.adjust(-amount, { desc: `Bet: ${selected.dataset.outcome} on ${currentBetEvent.name}` });
    AppState.bets.active.push({ id: 'bet_' + Date.now().toString(36), ...payload });
    saveToStorage(STORAGE_KEYS.bets, AppState.bets);
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
    const g = BET_GAMES[gameId] || BET_GAMES.g1;
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
    try {
        WalletController.require(amount);
    } catch (_) {
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
    WalletController.adjust(-amount, { desc: 'Bet game stake' });
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
    setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
            <div class="bet-portfolio-stat"><span class="bet-portfolio-stat-label">Total Staked</span><span class="bet-portfolio-stat-value">${money(totalStaked)}</span></div>
            <div class="bet-portfolio-stat"><span class="bet-portfolio-stat-label">Total Won</span><span class="bet-portfolio-stat-value">${money(totalWon)}</span></div>
            <div class="bet-portfolio-stat"><span class="bet-portfolio-stat-label">Total Lost</span><span class="bet-portfolio-stat-value" style="color:#dc2626">${money(totalLost)}</span></div>
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
    AD1:  { name:'Patents and Companies Registration Agency — PACRA', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2019', email:'info@pacra.org.zm', desc:'Statutory agency responsible for business registration.', services:['Name Clearance','Business Name Registration','Company Conversion','Change of Company Name','Share Transfers','Increase/Alteration of Capital','Annual Returns','Articles of Association'] },
    AD2:  { name:'Zambia Revenue Authority — ZRA', category:'Financial', categoryKey:'financial', rating:'4.7', location:'Lusaka, Zambia', since:'2015', email:'info@zra.org.zm', desc:'National tax authority responsible for tax registration and compliance.', services:['TPIN Setup / Registration','Tax Type Registration','Tax Returns','Property Transfer Tax','Tax Compliance Support','Withholding Tax','Customs & Excise','Smart Invoice Services'] },
    AD3:  { name:'Zambia Public Procurement Authority — ZPPA', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2017', email:'info@zppa.org.zm', desc:'Regulatory body for public procurement.', services:['New Supplier Registration','Renewal of Registration','Category Updates','Document Advisory','Tender Participation Support'] },
    AD4:  { name:'National Council for Construction — NCC', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Nationwide', since:'2016', email:'info@ncc.org.zm', desc:'Statutory body regulating the construction industry.', services:['Contractor Registration','Grade Upgrading','CDF Contractor Access','Compliance Advisory'] },
    AD5:  { name:'National Pension Scheme Authority — NAPSA', category:'Financial', categoryKey:'financial', rating:'4.7', location:'Lusaka, Zambia', since:'2018', email:'info@napsa.co.zm', desc:'Mandatory national pension scheme manager.', services:['Employer Registration','Employee Registration','Monthly Returns (NAPSA )','Compliance Support'] },
    AD6:  { name:'National Health Insurance Management Authority — NHIMA', category:'Financial', categoryKey:'financial', rating:'4.8', location:'Lusaka, Zambia', since:'2014', email:'info@nhima.co.zm', desc:'National health insurance authority.', services:['Employer Registration','Employee Registration','Monthly Returns','Compliance Support'] },
    AD7:  { name:'Engineering Institution of Zambia — EIZ', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Ndola, Zambia', since:'2016', email:'info@eiz.org.zm', desc:'Statutory professional body regulating engineering.', services:['Corporate Membership','Individual Membership','Renewal & Compliance'] },
    AD8:  { name:'Zambia Development Agency — ZDA', category:'Brokerage', categoryKey:'brokerage', rating:'4.9', location:'Lusaka, Zambia', since:'2013', email:'info@zda.org.zm', desc:'Agency responsible for investment promotion.', services:['Investor Registration','Project Facilitation','Investor Permit','Licensing Support'] },
    AD9:  { name:'ZEMA / CEEC', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2018', email:'info@zema.org.zm', desc:'Combined regulatory body for environmental and citizen empowerment compliance.', services:['Environmental Clearance Docs','Project Brief / EIS Support','Compliance & Renewals'] },
    AD10: { name:'First National Bank(FNB)', category:'Banking', categoryKey:'brokerage', rating:'4.4', location:'Johannesburg, SA', since:'2015', email:'trade@zeroth.com', desc:'Cross-border trading partner.', services:['FNB App & Online Banking','Cellphone Banking','Merchant Services(POS)','Business Accounts','Loans and Financing','Savings and Investments'] },
    AD11: { name:'MicroChip Technologies', category:'Technology', categoryKey:'technology', rating:'4.7', location:'Lusaka, Zambia', since:'2019', email:'tech@zeroth.com', desc:'Hardware and IoT partner.', services:['IoT Devices','Smart Meters','Embedded Systems','Device Repair','Tech Installation'] },
    AD12: { name:'Hendricks Security', category:'Security', categoryKey:'Security', rating:'4.5', location:'Nationwide', since:'2014', email:'hendricks@zeroth.com', desc:'Security partner delivering security services.', services:['Security Services','Protection & Escort','Event Security','Alarms Technology & Response','Sale Security Uniforms & Equipment','Project Security Consultation And Execution','Security Investigations'] },
    AD13: { name:'ZDA Data', category:'Technology', categoryKey:'technology', rating:'4.8', location:'Lusaka, Zambia', since:'2020', email:'data@zeroth.com', desc:'Data and analytics partner.', services:['Credit Scoring','Data Warehousing','Business Intelligence','Survey & Research','API Integration'] },
    AD14: { name:'CloudNine Hosting', category:'Technology', categoryKey:'technology', rating:'4.6', location:'Cloud / Remote', since:'2018', email:'cloud@zeroth.com', desc:'Managed hosting and cyber-security partner.', services:['Cloud Hosting','Domain & Email','Backup & Recovery','Cyber Security','Managed IT'] },
    AD15: { name:'Precision Engineering Works', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Kitwe, Zambia', since:'2012', email:'engineering@zeroth.com', desc:'Engineering and fabrication partner.', services:['Metal Fabrication','Machinery Servicing','Plant Hire','Welding & Fitting','Spare Parts'] },
    AD16: { name:'GreenLeaf Agro Farms', category:'Agricultural', categoryKey:'agricultural', rating:'4.8', location:'Mkushi, Zambia', since:'2017', email:'greenleaf@zeroth.com', desc:'Fresh produce partner.', services:['Vegetable & Fruit Supply','Organic Produce','Greenhouse Farming','Farm Inputs','Off-Take Agreements'] },
    AD17: { name:'BuildRight Hardware', category:'Brokerage', categoryKey:'brokerage', rating:'4.6', location:'Lusaka, Zambia', since:'2016', email:'hardware@zeroth.com', desc:'Hardware and building materials partner.', services:['Cement & Aggregates','Roofing Sheets','Plumbing Supplies','Electrical Fittings','Tool Hire'] },
    AD18: { name:'Rocket Launch SME Hub', category:'Brokerage', categoryKey:'brokerage', rating:'4.7', location:'Lusaka, Zambia', since:'2021', email:'sme@zeroth.com', desc:'SME incubation partner.', services:['SME Incubation','Startup Funding','Business Coaching','Pitch Preparation','Co-working Space'] },
    AD19: { name:'Cortex AI Labs', category:'Technology', categoryKey:'technology', rating:'4.9', location:'Lusaka, Zambia', since:'2022', email:'ai@zeroth.com', desc:'AI partner building chatbots and automation.', services:['AI Chatbots','Predictive Models','Process Automation','Computer Vision','Data Labelling'] },
    AD20: { name:'StarRate Marketing', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Lusaka, Zambia', since:'2015', email:'marketing@zeroth.com', desc:'Marketing and advertising partner.', services:['Digital Advertising','Billboard Advertising','Brand Strategy','Social Media','Event Promotion'] },
    AD21: { name:'Volt Energy Solutions', category:'Technology', categoryKey:'technology', rating:'4.7', location:'Nationwide', since:'2018', email:'energy@zeroth.com', desc:'Renewable energy partner.', services:['Solar Installation','Inverters & Batteries','Energy Audits','Mini-Grids','Generator Servicing'] },
    AD22: { name:'NCC Netlink', category:'Technology', categoryKey:'technology', rating:'4.6', location:'Nationwide', since:'2017', email:'netlink@zeroth.com', desc:'Connectivity partner.', services:['Fibre Installation','VSAT & Satellite','Hotspot Solutions','Structured Cabling','Network Monitoring'] },
    AD23: { name:'Lanbridge College', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2014', email:'lanbridge@zeroth.com', desc:'marketing partner.', services:['Diploma Business administration','','Diploma Registered Nursing','Diploma Human Resource Management','Diploma Social Work','Diploma Psychosocial counselling','Diploma Primary Education','Diploma Secondary Education','Diploma General Agriculture','Diploma Occupational & Safety Management','Diploma Business Management','Diploma Project Management','Diploma Economics','Diploma Public Administration','Diploma secretarial & office Management','Diploma Transport & logistics','Diploma Development Studies','Diploma Banking & Finance']},
    AD24: { name:'Stock Brokers Zambia', category:'Brokerage', categoryKey:'brokerage', rating:'4.7', location:'Lusaka, Zambia', since:'2020', email:'SBZ@zeroth.com', desc:'Share & bond trading partner.', services:['Share & bond trading','Account Opening & Management','Investment & Portfolio Advisory','Corporate Finance & Advisory','Market Research and Bulletins'] },
    AD25: { name:'LinkChain Supply', category:'Brokerage', categoryKey:'brokerage', rating:'4.5', location:'Ndola, Zambia', since:'2019', email:'supply@zeroth.com', desc:'Procurement and supply-chain partner.', services:['Procurement','Supply Chain Audit','Vendor Management','Fleet Tracking','Inventory Systems'] },
    AD26: { name:'NHIMA Software', category:'Technology', categoryKey:'technology', rating:'4.8', location:'Lusaka, Zambia', since:'2016', email:'software@zeroth.com', desc:'Software engineering partner.', services:['Web & Mobile Apps','Core Banking Systems','USSD Applications','Software Maintenance','IT Training'] },
    AD27: { name:'Crown Premium Partners', category:'Brokerage', categoryKey:'brokerage', rating:'4.9', location:'Lusaka, Zambia', since:'2012', email:'premium@zeroth.com', desc:'Private wealth partner.', services:['Private Wealth Advisory','Premium Banking','Concierge Services','Offshore Investments','Estate Planning'] },
    AD28: { name:'ZANACO', category:'Banking', categoryKey:'Brokerage', rating:'4.4', location:'Countrywide, Zambia', since:'2013', email:'zanaco@zeroth.com', desc:'Personal and corporate banking.', services:['Savings & Investment Accounts','Loan Financing','Digital Banking','Money Transfers','Cash Management & Trade Solutions','Corporate & Investment Banking','Treasury Bills & Govt Bonds','Secondary Market Trading','Fixed Deposits','Merchant Services (POS)'] },
    AD29: { name:'FireBrand Energy', category:'Technology', categoryKey:'technology', rating:'4.5', location:'Lusaka, Zambia', since:'2017', email:'fuels@zeroth.com', desc:'Fuel and gas partner.', services:['Fuel Supply','LPG Distribution','Bulk Diesel','Energy Consulting','Tank Installation'] },
    AD30: { name:'Infinity Holdings', category:'Brokerage', categoryKey:'brokerage', rating:'4.8', location:'Lusaka, Zambia', since:'2011', email:'holdings@zeroth.com', desc:'Investment holding partner.', services:['Investment Holding','Joint Ventures','Franchise Development','Asset Management','Capital Raising'] }
};

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
        const icons = ['building','university','chart-line','mobile-alt','seedling','shield-alt','truck','graduation-cap','handshake','globe-africa','microchip','phone-alt','database','cloud','cogs','leaf','tools','rocket','brain','star','bolt','network-wired','puzzle-piece','sync','link','code','crown','gem','fire','infinity'];
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
        [['fa-star', p.rating + ' / 5.0 Rating'], ['fa-map-marker-alt', p.location], ['fa-calendar-alt', 'Since ' + p.since], ['fa-envelope', p.email]].forEach(([icon, text]) => {
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
    setTimeout(() => { hide(overlay); if (modal) modal.scrollTop = 0; }, 260);
    if (partnerLastFocused && typeof partnerLastFocused.focus === 'function') {
        partnerLastFocused.focus();
    }
}

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
    if (body && body.innerHTML !== BP_SNAPSHOT.body) body.innerHTML = BP_SNAPSHOT.body;
    if (footer && BP_SNAPSHOT.footer !== null && footer.innerHTML !== BP_SNAPSHOT.footer) footer.innerHTML = BP_SNAPSHOT.footer;
}
function openBecomePartner() {
    const overlay = $('#becomePartnerModalOverlay');
    const status  = $('#bpStatus');
    if (!overlay) {
        console.error('[ZBS] openBecomePartner: #becomePartnerModalOverlay missing.');
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

async function handleBecomePartnerSubmit(e) {
    e.preventDefault();
    const form   = e.target;
    const status = $('#bpStatus');
    const required = ['bpCompanyName', 'bpCategory', 'bpCity', 'bpContactName', 'bpEmail', 'bpPhone', 'bpServices'];
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
        if (status) { status.textContent = '⚠️ Please enter a valid email address.'; status.className = 'bp-status error'; status.hidden = false; }
        $('#bpEmail').focus();
        return;
    }
    if (!$('#bpTerms').checked) {
        if (status) { status.textContent = '⚠️ Please accept the terms to continue.'; status.className = 'bp-status error'; status.hidden = false; }
        return;
    }
    const payload = {
        company: $('#bpCompanyName').value.trim(), category: $('#bpCategory').value,
        years: Number($('#bpYears').value) || 0, website: $('#bpWebsite').value.trim(),
        city: $('#bpCity').value.trim(), employees: $('#bpEmployees').value,
        contactName: $('#bpContactName').value.trim(), contactRole: $('#bpContactRole').value.trim(),
        email, phone: $('#bpPhone').value.trim(), services: $('#bpServices').value.trim(),
        motivation: $('#bpMotivation').value.trim(), submittedAt: new Date().toISOString()
    };
    if (window.API) {
        try { await window.API.partners.create(payload); }
        catch (err) {
            if (status) { status.textContent = '⚠️ ' + (err.message || 'Submission failed.'); status.className = 'bp-status error'; status.hidden = false; }
            return;
        }
    }
    const refCode = 'BP-' + Date.now().toString(36).toUpperCase().slice(-6);
    const body    = $('#becomePartnerModal .partner-modal-body');
    if (body) {
        body.innerHTML = `
            <div class="bp-success">
                <div class="bp-check"><i class="fas fa-check"></i></div>
                <h3>Application received 🎉</h3>
                <p>Thank you, <strong>${escapeHtml(payload.company)}</strong>. Our partnership team will review your application and get back to you at <strong>${escapeHtml(email)}</strong> within 2 business days.</p>
                <span class="bp-ref">Reference: ${refCode}</span>
            </div>
        `;
    }
    showToast('✅ Partnership application submitted!');
    const footer = $('#bpFooterActions');
    if (footer) {
        footer.innerHTML = `<button class="partner-apply-btn" id="bpDoneBtn" type="button"><i class="fas fa-check"></i> Done</button>`;
        $('#bpDoneBtn')?.addEventListener('click', () => { closeBecomePartner(); setTimeout(() => location.reload(), 300); });
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
            const focusables = modal.querySelectorAll('button:not([hidden]), input:not([hidden]), select:not([hidden]), textarea:not([hidden]), a[href]');
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
    form?.addEventListener('submit', async (e) => {
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
        if (window.API) {
            try {
                await window.API.partners.create({
                    type: 'application', partnerCode: $('#partnerModalCode')?.textContent || '',
                    partnerName: $('#partnerModalTitle')?.textContent || '', applicantName: name,
                    applicantEmail: email, applicantPhone: phone, service,
                    notes: $('#partnerApplicantNotes')?.value.trim() || '',
                    submittedAt: new Date().toISOString()
                });
            } catch (err) {
                formStatus.hidden = false;
                formStatus.classList.add('error');
                formStatus.textContent = '⚠️ ' + (err.message || 'Submission failed.');
                return;
            }
        }
        formStatus.hidden = false;
        formStatus.classList.remove('error');
        formStatus.textContent = '✅ Thank you, ' + name + '! Your application for "' + service + '" has been received. Our team will contact you on ' + phone + ' shortly.';
        showToast('✅ Application submitted successfully!');
        form.querySelectorAll('input, select, textarea').forEach(f => { if (f.type !== 'submit') f.value = ''; });
        setTimeout(() => {
            if (form) form.hidden = true;
            if (actionsEl) actionsEl.hidden = false;
        }, 2400);
    });
}

function getPartnerDropZone() {
    const starCenter = $('.partner-star-center');
    let r = starCenter ? starCenter.getBoundingClientRect() : null;
    if (!r || r.width < 10 || r.height < 10) {
        const wrap = $('.partners-star-container') || document.body;
        r = wrap.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: Math.min(r.width, r.height) * 0.28 };
    }
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: Math.max(r.width, r.height) / 2 + 26 };
}

function bindPartnerSlot(slot) {
    const code = slot.getAttribute('data-slot');
    if (!code || !PARTNERS[code]) return;
    if (slot.dataset.partnerBound === '1') return;
    slot.dataset.partnerBound = '1';
    if (!slot.hasAttribute('role'))     slot.setAttribute('role', 'button');
    if (!slot.hasAttribute('tabindex')) slot.setAttribute('tabindex', '0');
    if (!slot.hasAttribute('aria-label')) slot.setAttribute('aria-label', 'View details and services for partner ' + code);
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
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPartner(code); }
        });
    });
}

/* ================================================================
   AI CHATBOT
   ================================================================ */
let chatOpen = false;
const chatResponses = {
    'loan': 'We offer various loan products including Salary Advance, Payday Loans, Emergency Loans, and Business Venture Loans.',
    'agriculture': 'Our agricultural services include farm produce, livestock, agro-chemicals, and farm services.',
    'insurance': 'We provide insurance brokerage services starting from ZMW 75.',
    'investment': 'We offer investment opportunities through our ETF Trading Hub and Share Purchase Application.',
    'etf': 'Our ETF Trading Hub is live 24/7. Commission is only 1.5%.',
    'betting': 'Our Bet & Gaming Hub offers peer-to-peer and company betting, plus online games.',
    'entertainment': 'The Entertainment Hub features cartoons, music, and movies.',
    'education': 'Our Education Hub lists universities, colleges, high schools, and primary schools.',
    'financial': 'Our Financial Hub offers Savings, Salary Advance, Vehicle Financing, Food Wallet Loans, Group Loans, Emergency Loans, Mortgages, Investment Advisory, Credit Cards, and a directory of financial institutions.',
    'consultation': 'Our Consultation Hub connects you with vetted experts.',
    'construction': 'Our Construction & Survey Hub offers 244+ services.',
    'advert': 'Our Advertisement Hub lets you post free ads.',
    'rental': 'Our Rental Property Hub lets you browse apartments, houses, rooms, offices and warehouses from verified landlords.',
    'prohire': 'ProHire lets you hire verified professionals 24/7.',
    'partner': 'We work with 30+ strategic partners across finance, agriculture, technology and brokerage.',
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
        if (msgs && msgs.children.length === 0) addChatMessage('bot', 'Hello! 👋 I\'m your ZBS AI assistant. How can I help you today?');
        setTimeout(() => $('#chatInput')?.focus(), 200);
    } else {
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
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
            if (key === 'default') continue;
            if (lower.includes(key)) { response = val; break; }
        }
        addChatMessage('bot', response);
    }, 900);
}

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
        width  = Math.max(MIN_W, Math.min(width, vw - 2 * H_MARGIN));
        height = Math.max(MIN_H, Math.min(height, vh - 2 * V_MARGIN));
        left = Math.max(H_MARGIN, Math.min(left, vw - width  - H_MARGIN));
        top  = Math.max(V_MARGIN, Math.min(top, vh - height - V_MARGIN));
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
            dir, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
            startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
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
        if (dir.includes('e')) { width = s.width + dx; }
        else if (dir.includes('w')) { width = s.width - dx; left = s.left + dx; }
        if (dir.includes('s')) { height = s.height + dy; }
        else if (dir.includes('n')) { height = s.height - dy; top = s.top + dy; }
        if (width < MIN_W) { if (dir.includes('w')) left = s.left + s.width - MIN_W; width = MIN_W; }
        if (height < MIN_H) { if (dir.includes('n')) top = s.top + s.height - MIN_H; height = MIN_H; }
        applyRect({ left, top, width, height });
    }
    function onUp() {
        if (!drag) return;
        const r = panel.getBoundingClientRect();
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({
                w: Math.round(r.width), h: Math.round(r.height),
                l: Math.round(r.left), t: Math.round(r.top)
            }));
        } catch (_) {}
        drag = null;
        panel.classList.remove('resizing');
    }
    panel.querySelectorAll('.shub-resize-handle').forEach(h => {
        h.addEventListener('pointerdown', onDown);
        h.addEventListener('pointermove', onMove);
        h.addEventListener('pointerup', onUp);
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
        case 'eduBuyBook': openEduBookPurchase(el.dataset.id); break;
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
        case 'toggleHeaderServicesMenu': toggleHeaderServicesMenu(); break;
        case 'closeHeaderServicesMenu':  closeHeaderServicesMenu();  break;
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
        default: break;
    }
}

/* ================================================================
   MODULE REGISTRY (replaces eval-based resolveModule)
   ================================================================ */
const _MODULE_REGISTRY = Object.create(null);
function registerModule(name, obj) { if (name && obj) _MODULE_REGISTRY[name] = obj; }
function resolveModule(name) {
    if (!name) return null;
    if (typeof window !== 'undefined' && window[name]) return window[name];
    return _MODULE_REGISTRY[name] || null;
}

function bindEvents() {
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.dataset.action;
        if (MODULE_ACTIONS.has(action)) return;
        handleAction(action, el);
    });

    document.addEventListener('click', (e) => {
        const item = e.target.closest('.service-item');
        if (!item || item.dataset.action) return;
        showToast(`📋 ${item.dataset.service} — From ZMW ${item.dataset.price}`);
    });

    $('#sidebarToggleBtn')?.addEventListener('click', () => {
        if ($('#sidebar')?.classList.contains('open')) closeSidebar();
        else openSidebar();
    });
    $('#sidebarCloseBtn')?.addEventListener('click', closeSidebar);
    $('#sidebarOverlay')?.addEventListener('click', closeSidebar);

    $$('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            $$('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            AppState.activeSection = link.dataset.section;
            closeSidebar();
        });
    });

    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action="openShareApplication"]');
        if (!a) return;
        if (a.tagName === 'A' && a.getAttribute('href') === '#share-application') {
            e.preventDefault();
            openShareApplication();
        }
    });

    $('#searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
    });
    $('#searchInput')?.addEventListener('input', (e) => {
        if (e.target.value.length > 2) performSearch();
    });

    $('#authForm')?.addEventListener('submit', handleLogin);

    const shareForm = $('#ZBS-StocksForm') || $('#shareApplicationForm');
    if (shareForm) shareForm.addEventListener('submit', handleShareApplication);
    $('#shareCancelBtn')?.addEventListener('click', closeShareApplication);
    $('#shareCompany')?.addEventListener('change', updateShareAmount);
    $('#shareQuantity')?.addEventListener('input', updateShareAmount);

    $('#uploadForm')?.addEventListener('submit', handleUpload);

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
    $('#etfSearchInput')?.addEventListener('input', (e) => { renderETFExchanges(e.target.value); });

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
            if (btn.dataset.opponent === 'friend') $('#betGameLinkSection')?.removeAttribute('hidden');
            else $('#betGameLinkSection')?.setAttribute('hidden', '');
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

    $$('.bet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.bet-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.bet-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.betTab));
        });
    });

    $$('.edu-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.edu-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.edu-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        });
    });

    $$('.etf-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.etf-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.etf-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.etfTab));
        });
    });

    $$('.ent-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.ent-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.ent-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        });
    });

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.ent-card');
        if (card && !e.target.closest('button')) {
            showToast('🎬 Playing: ' + (card.querySelector('.ent-card-title')?.textContent || 'content'));
        }
    });

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

    $('#chatInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendAIMessage(); }
    });

    $$('.advert-item').forEach(item => {
        item.addEventListener('click', () => {
            showToast(`📢 Promo: ${item.querySelector('.advert-text')?.textContent}`);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if ($('#becomePartnerModalOverlay')?.classList.contains('is-open')) { closeBecomePartner(); return; }
            if ($('#shareApplicationWrapper')?.classList.contains('active') && getComputedStyle($('#shareApplicationWrapper')).position === 'fixed') { closeShareApplication(); return; }
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

    const bpRoot = $('#becomePartnerModal');
    bpRoot?.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'becomePartnerForm') handleBecomePartnerSubmit(e);
    });
    bpRoot?.addEventListener('click', (e) => {
        if (e.target.closest('#becomePartnerModalClose, #bpFooterClose, #bpCancelBtn')) closeBecomePartner();
    });
    $('#becomePartnerModalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'becomePartnerModalOverlay') closeBecomePartner();
    });

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
                if (module && typeof module[method] === 'function') return;
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
                        console.error(`[ZBS] ${action}: ${mod}.${method}() is not available.`);
                }
            }, true);
        });
    });
}

/* ================================================================
   INIT
   ================================================================ */
function init() {
    AppState.user = (window.API?.Auth?.user?.()) || loadFromStorage(STORAGE_KEYS.user, null);
    if (window.API?.Auth?.isLoggedIn?.()) {
        window.API.Auth.me()
            .then((r) => {
                const user = r?.user || r?.data;
                if (!user) return;
                AppState.user = user;
                AppState.wallet = cloneWallet(user.wallet || AppState.wallet);
                saveToStorage(STORAGE_KEYS.user, user);
                saveToStorage(STORAGE_KEYS.wallet, AppState.wallet);
                updateAuthUI();
            })
            .catch(() => {});
    }
    AppState.wallet = cloneWallet(loadFromStorage(STORAGE_KEYS.wallet, { currency: 'ZMW', balance: 0 }));
    AppState.searchSeen = loadFromStorage(STORAGE_KEYS.searchSeen, false);
    AppState.entertainment = loadFromStorage(STORAGE_KEYS.entertainment, { cartoons: [], music: [], movies: [] });
    AppState.bets = loadFromStorage(STORAGE_KEYS.bets, { active: [], history: [], totalWon: 0 });
    AppState.etf.watchlist = loadFromStorage(STORAGE_KEYS.watchlist, []);
    AppState.etf.portfolio = loadFromStorage(STORAGE_KEYS.portfolio, {});

    seedETFData();
    seedEntertainment();
    seedEducation();
    seedBetData();   // idempotent — safe on every boot

    snapshotBecomePartnerModal();
    buildPartnerSlots();
    initPartnerModal();
    initPartnerSlots();
    initShareApplication();
    updateAuthUI();
    initChatbotDrag();
    initChatModalDrag();
    initSocialHubResize();
    bindEvents();

    if (AppState.searchSeen) {
        const badge = $('#footerSearchBadge');
        if (badge) badge.style.display = 'none';
    }

    console.log('✅ ZBS App v3.4.1 initialised — correctness fixes applied');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}