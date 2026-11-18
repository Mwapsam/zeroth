/**
 * Currency Manager
 * ------------------------------------------------------------------
 * Country-driven currency resolution with NO hard-coded fallback.
 *
 * Resolution order (first match wins):
 *   1. localStorage 'zbs_country'      — set by the login form
 *   2. window.marketLocation.country   — set by market-hub.js
 *   3. localStorage 'zbs_locale'       — last-used browser locale
 *   4. navigator.language region       — e.g. en-ZM → ZM
 *   5. navigator.language subtag       — e.g. "zm" → ZM
 *   6. UNRESOLVED                       — currency stays null, UI shows "—"
 *
 * If nothing resolves, the manager does NOT pick a default currency.
 * It emits `currencyChanged` with `{ currency: null }` so the UI can
 * prompt the user to pick a country (e.g. via the login form).
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    // ---------- Supported countries → currency ----------
    const COUNTRY_DATA = {
        ZM: { currency: 'ZMW', symbol: 'ZMW', locale: 'en-ZM', name: 'Zambian Kwacha' },
        ZA: { currency: 'ZAR', symbol: 'R',   locale: 'en-ZA', name: 'South African Rand' },
        KE: { currency: 'KES', symbol: 'KSh', locale: 'en-KE', name: 'Kenyan Shilling' },
        NG: { currency: 'NGN', symbol: '₦',   locale: 'en-NG', name: 'Nigerian Naira' },
        TZ: { currency: 'TZS', symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling' },
        UG: { currency: 'UGX', symbol: 'USh', locale: 'en-UG', name: 'Ugandan Shilling' },
        GH: { currency: 'GHS', symbol: '₵',   locale: 'en-GH', name: 'Ghanaian Cedi' },
        BW: { currency: 'BWP', symbol: 'P',   locale: 'en-BW', name: 'Botswana Pula' },
        NA: { currency: 'NAD', symbol: 'N$',  locale: 'en-NA', name: 'Namibian Dollar' },
        ZW: { currency: 'USD', symbol: '$',   locale: 'en-ZW', name: 'US Dollar (Zimbabwe)' },
        MW: { currency: 'MWK', symbol: 'MK',  locale: 'en-MW', name: 'Malawian Kwacha' },
        MZ: { currency: 'MZN', symbol: 'MT',  locale: 'pt-MZ', name: 'Mozambican Metical' },
        US: { currency: 'USD', symbol: '$',   locale: 'en-US', name: 'US Dollar' },
        GB: { currency: 'GBP', symbol: '£',   locale: 'en-GB', name: 'British Pound' },
        EU: { currency: 'EUR', symbol: '€',   locale: 'en-IE', name: 'Euro' }
    };

    // Accept legacy aliases the old code used
    const ALIASES = {
        UK: 'GB',
        IE: 'EU', FR: 'EU', DE: 'EU', ES: 'EU', IT: 'EU', NL: 'EU',
        PT: 'EU', BE: 'EU', AT: 'EU', FI: 'EU', GR: 'EU'
    };

    const STORAGE_COUNTRY = 'zbs_country';
    const STORAGE_LOCALE  = 'zbs_locale';

    // ---------- State ----------
    const state = {
        countryCode: null,   // e.g. 'ZM' — null until resolved
        currency:    null,   // e.g. 'ZMW' — null until resolved
        symbol:      null,
        locale:      null,
        name:        null
    };

    // ---------- Helpers ----------
    function normalizeCountry(code) {
        if (!code) return null;
        const up = String(code).toUpperCase();
        if (COUNTRY_DATA[up]) return up;
        if (ALIASES[up] && COUNTRY_DATA[ALIASES[up]]) return ALIASES[up];
        return null;
    }

    function fromBrowserLocale() {
        const lang = navigator.language || navigator.userLanguage || '';
        // 'en-ZM' → 'ZM'
        const parts = lang.split('-');
        if (parts.length > 1) {
            const region = parts[1].toUpperCase();
            const resolved = normalizeCountry(region);
            if (resolved) return resolved;
        }
        // 'zm' (rare) → 'ZM'
        if (parts[0] && parts[0].length === 2) {
            const subtag = parts[0].toUpperCase();
            if (normalizeCountry(subtag)) return subtag;
        }
        return null;
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch { /* private mode */ }
    }

    // ---------- Resolution ----------
    function resolveCountry() {
        // 1. Login-chosen country
        const savedCountry = normalizeCountry(safeGet(STORAGE_COUNTRY));
        if (savedCountry) return { code: savedCountry, source: 'login' };

        // 2. Market hub location
        const marketCountry = window.marketLocation &&
            normalizeCountry(window.marketLocation.country);
        if (marketCountry) return { code: marketCountry, source: 'market' };

        // 3. Last-used locale
        const savedLocale = safeGet(STORAGE_LOCALE);
        if (savedLocale) {
            const fromLocale = fromBrowserLocaleString(savedLocale);
            if (fromLocale) return { code: fromLocale, source: 'saved-locale' };
        }

        // 4/5. Browser language
        const browserCountry = fromBrowserLocale();
        if (browserCountry) return { code: browserCountry, source: 'browser' };

        // 6. Nothing worked — do NOT pick a default.
        return { code: null, source: 'unresolved' };
    }

    function fromBrowserLocaleString(localeStr) {
        if (!localeStr) return null;
        const parts = String(localeStr).split('-');
        if (parts.length > 1) {
            return normalizeCountry(parts[1]);
        }
        return null;
    }

    // ---------- Formatting ----------
    function formatAmount(amount) {
        if (state.currency == null) {
            // No currency known → show amount bare, no fake symbol
            return Number(amount).toFixed(2);
        }
        const value = Number(amount);
        if (!isFinite(value)) return '—';
        try {
            return new Intl.NumberFormat(state.locale || 'en', {
                style: 'currency',
                currency: state.currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        } catch {
            // Fallback to manual symbol (never fabricates a currency)
            return `${state.symbol} ${value.toFixed(2)}`;
        }
    }

    // ---------- DOM ----------
    function updateDOM() {
        const code   = state.currency;
        const symbol = state.symbol;

        // 1. Elements with [data-currency] holding a numeric amount
        document.querySelectorAll('[data-currency]').forEach(el => {
            const raw = parseFloat(el.dataset.currency);
            if (!isNaN(raw)) {
                el.textContent = formatAmount(raw);
            }
        });

        // 2. Known ID hooks — currency code badges
        const codeHooks = [
            'walletCurrency',
            'walletBalanceCurrency',
            'walletCurrencyText',
            'walletCurrencySymbol',           // top-up modal
            'withdrawCurrencySymbol',
            'sendCurrencySymbol',
            'etfDetailCurrency',
            'prohireCurrencyBadge',
            'authCurrencyLabel',
            'topupCurrencySymbol',
            'paymentCurrencySymbol'
        ];
        codeHooks.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (code == null) {
                el.textContent = '—';
                el.setAttribute('data-currency-unresolved', 'true');
            } else {
                // Some hooks expect a full name (walletCurrencyText)
                el.textContent = id === 'walletCurrencyText'
                    ? `${code} — ${state.name || code}`
                    : code;
                el.removeAttribute('data-currency-unresolved');
            }
        });

        // 3. Elements showing a bare symbol (e.g. wallet balance "ZMW 0.00")
        //    Handled through [data-currency] above; nothing else here.

        // 4. Payment gateway
        if (window.paymentGateway &&
            typeof window.paymentGateway.updateCurrency === 'function') {
            try { window.paymentGateway.updateCurrency(); } catch (e) {
                console.warn('[currencyManager] paymentGateway.updateCurrency failed', e);
            }
        }

        // 5. Notify the app
        document.dispatchEvent(new CustomEvent('currencyChanged', {
            detail: {
                currency:   state.currency,       // null if unresolved
                symbol:     state.symbol,
                countryCode: state.countryCode,
                name:       state.name,
                resolved:   state.currency != null
            }
        }));
    }

    // ---------- Public API ----------
    const currencyManager = {
        // --- introspection ---
        getCountry:      () => state.countryCode,
        getCurrencyCode: () => state.currency,
        getSymbol:       () => state.symbol,
        getLocale:       () => state.locale,
        getName:         () => state.name,
        isResolved:      () => state.currency != null,

        // --- formatting ---
        format: formatAmount,

        // --- lifecycle ---
        init: function () {
            const resolved = resolveCountry();

            if (resolved.code) {
                this.setCountry(resolved.code, { persist: false });
            } else {
                // Explicitly unresolved — never silently pick a currency
                state.countryCode = null;
                state.currency    = null;
                state.symbol      = null;
                state.locale      = null;
                state.name        = null;
                console.info('[currencyManager] No country detected. Currency unresolved — ' +
                             'set via login form (localStorage.zbs_country).');
                updateDOM();
            }
            return this;
        },

        /**
         * Set the active country. This is the ONLY place currency is set.
         * @param {string} countryCode  e.g. 'ZM', 'ZA', 'GB' (or EU codes)
         * @param {object} [opts]       { persist: true (default) }
         */
        setCountry: function (countryCode, opts) {
            const opts2 = opts || {};
            const normalized = normalizeCountry(countryCode);

            if (!normalized) {
                console.warn(
                    `[currencyManager] Unsupported country "${countryCode}". ` +
                    `Currency left unresolved.`
                );
                state.countryCode = null;
                state.currency    = null;
                state.symbol      = null;
                state.locale      = null;
                state.name        = null;
                if (opts2.persist !== false) {
                    safeSet(STORAGE_COUNTRY, '');
                }
                updateDOM();
                return this;
            }

            const data = COUNTRY_DATA[normalized];
            state.countryCode = normalized;
            state.currency    = data.currency;
            state.symbol      = data.symbol;
            state.locale      = data.locale;
            state.name        = data.name;

            if (opts2.persist !== false) {
                safeSet(STORAGE_COUNTRY, normalized);
                safeSet(STORAGE_LOCALE,  data.locale);
            }

            updateDOM();
            return this;
        },

        /**
         * Clear the stored country (e.g. on logout).
         * Currency becomes unresolved until the user picks again.
         */
        clearCountry: function () {
            safeSet(STORAGE_COUNTRY, '');
            state.countryCode = null;
            state.currency    = null;
            state.symbol      = null;
            state.locale      = null;
            state.name        = null;
            updateDOM();
            return this;
        },

        /**
         * Bind a <select id="..."> whose <option> elements carry
         * data-currency="ZMW" (and optionally data-country="ZM").
         * Fires setCountry on change.
         */
        bindCountrySelect: function (selectEl) {
            if (!selectEl) return this;
            const apply = () => {
                const opt = selectEl.selectedOptions && selectEl.selectedOptions[0];
                if (!opt) return;
                const code = opt.dataset.country || opt.value;
                if (code) this.setCountry(code);
            };
            selectEl.addEventListener('change', apply);
            // Apply whatever is already selected, if anything
            apply();
            return this;
        }
    };

    // ---------- Auto-init ----------
    // Re-run when the login form saves a country, or market hub moves.
    document.addEventListener('DOMContentLoaded', () => {
        // Delay so market-hub.js can populate window.marketLocation first.
        setTimeout(() => currencyManager.init(), 400);

        // Global helper used by app.js (login form) & others
        window.setWalletCountry = function (code) {
            currencyManager.setCountry(code);
        };
    });

    // Listen to external country changes
    document.addEventListener('countryChanged', (e) => {
        if (e.detail && e.detail.country) {
            currencyManager.setCountry(e.detail.country);
        }
    });

    // Expose
    window.currencyManager = currencyManager;

})();