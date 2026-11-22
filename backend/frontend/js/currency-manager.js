/**
 * Currency Manager
 * Detects user's country and updates all currency displays accordingly.
 * Supports ZMW (Zambia), ZAR (South Africa), KES (Kenya), NGN (Nigeria),
 * USD (US), GBP (UK), EUR (EU), TZS (Tanzania), NAD (Namibia), BWP (Botswana), ZWL (Zimbabwe).
 */
(function () {
    'use strict';

    const countryData = {
        'ZM': { currency: 'ZMW', symbol: 'ZMW', locale: 'en-ZM' },
        'ZA': { currency: 'ZAR', symbol: 'R', locale: 'en-ZA' },
        'KE': { currency: 'KES', symbol: 'KSh', locale: 'en-KE' },
        'NG': { currency: 'NGN', symbol: '₦', locale: 'en-NG' },
        'US': { currency: 'USD', symbol: '$', locale: 'en-US' },
        'GB': { currency: 'GBP', symbol: '£', locale: 'en-GB' },
        'EU': { currency: 'EUR', symbol: '€', locale: 'en-IE' },
        'TZ': { currency: 'TZS', symbol: 'TSh', locale: 'en-TZ' },
        'NA': { currency: 'NAD', symbol: 'N$', locale: 'en-NA' },
        'BW': { currency: 'BWP', symbol: 'P', locale: 'en-BW' },
        'ZW': { currency: 'ZWL', symbol: 'Z$', locale: 'en-ZW' }
    };

    const defaultCountry = 'ZM';

    window.currencyManager = {
        current: countryData[defaultCountry],
        countryCode: defaultCountry,

        init: function () {
            // Try to get country from marketLocation (if set by market-hub.js)
            // Otherwise, fallback to browser language or default to Zambia.
            const marketLocation = window.marketLocation && window.marketLocation.country;
            const browserLang = navigator.language || 'en-ZM';
            let countryCode = defaultCountry;

            if (marketLocation && countryData[marketLocation.toUpperCase()]) {
                countryCode = marketLocation.toUpperCase();
            } else {
                const region = browserLang.split('-')[1];
                if (region && countryData[region.toUpperCase()]) {
                    countryCode = region.toUpperCase();
                }
            }

            this.setCountry(countryCode);
        },

        setCountry: function (countryCode) {
            if (!countryData[countryCode]) {
                console.warn(`Unsupported country: ${countryCode}. Using default.`);
                countryCode = defaultCountry;
            }
            this.countryCode = countryCode;
            this.current = countryData[countryCode];
            this.updateDOM();
        },

        format: function (amount) {
            try {
                return new Intl.NumberFormat(this.current.locale, {
                    style: 'currency',
                    currency: this.current.currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(amount);
            } catch (e) {
                // Fallback for older browsers
                return `${this.current.symbol} ${amount.toFixed(2)}`;
            }
        },

        getSymbol: function () {
            return this.current.symbol;
        },

        getCurrencyCode: function () {
            return this.current.currency;
        },

        updateDOM: function () {
            const symbol = this.current.symbol;
            const currency = this.current.currency;

            // Update all elements with a data-currency attribute
            document.querySelectorAll('[data-currency]').forEach(el => {
                const amount = parseFloat(el.dataset.currency || 0);
                if (!isNaN(amount)) {
                    el.textContent = this.format(amount);
                }
            });

            // Simple text replacements (e.g., "ZMW 50.00" -> "R 50.00")
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            const oldSymbols = [
                'ZMW', 'ZAR', 'KES', 'NGN', 'USD', 'GBP', 'EUR', 'TZS', 'NAD', 'BWP', 'ZWL',
                'R', 'KSh', '₦', '$', '£', '€', 'TSh', 'N$', 'P', 'Z$'
            ];

            const nodesToUpdate = [];
            while (node = walker.nextNode()) {
                const text = node.nodeValue;
                // Don't touch script or style tags
                const parent = node.parentElement;
                if (!parent) continue;
                if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') continue;

                const hasCurrency = oldSymbols.some(sym => text.includes(sym));
                if (hasCurrency) {
                    let newText = text;
                    // Replace currency amounts (e.g., "ZMW 50.00" -> "R 50.00")
                    oldSymbols.forEach(sym => {
                        const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${escapedSym})\\s*([\\d,]+\\.?\\d*)`, 'g');
                        newText = newText.replace(regex, (match, p1, p2) => {
                            const amount = parseFloat(p2.replace(/,/g, ''));
                            if (isNaN(amount)) return match;
                            return this.format(amount);
                        });
                    });
                    // Replace bare currency symbols/codes
                    oldSymbols.forEach(sym => {
                        const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        newText = newText.replace(new RegExp(`\\b${escapedSym}\\b`, 'g'), symbol);
                    });

                    if (newText !== text) {
                        nodesToUpdate.push({ node, newText });
                    }
                }
            }

            nodesToUpdate.forEach(({ node, newText }) => {
                node.nodeValue = newText;
            });

            // Update specific elements by ID (currency code badges)
            const currencyCodeElements = [
                'walletCurrency',
                'etfDetailCurrency',
                'prohireCurrencyBadge'
            ];
            currencyCodeElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = currency;
            });

            // Update Payment Gateway display
            if (window.paymentGateway && typeof window.paymentGateway.updateCurrency === 'function') {
                window.paymentGateway.updateCurrency();
            }

            // Notify other modules
            document.dispatchEvent(new CustomEvent('currencyChanged', {
                detail: { currency, symbol, countryCode: this.countryCode }
            }));
        }
    };

    // Initialize currency manager when page loads
    document.addEventListener('DOMContentLoaded', () => {
        // A slight delay allows other scripts (like market-hub) to set location first.
        setTimeout(() => {
            window.currencyManager.init();
        }, 500);
    });

})();