/**
 * ZBS Wallet System
 * Real wallet with persistent balance, transaction history,
 * top-up, withdraw, send, and integration with the payment gateway.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'zbs_wallet_v1';

    // ============================================================
    // DEFAULT STATE
    // ============================================================
    const defaultState = () => ({
        accountNumber: 'ZBS-' + Math.random().toString().slice(2, 12).padEnd(10, '0'),
        balance: 0,
        pending: 0,
        moneyIn: 0,
        moneyOut: 0,
        currency: 'ZMW',
        transactions: [],
        cards: [
            { id: 'c1', type: 'visa', label: 'Visa •••• 4242', expiry: '12/27', isDefault: true }
        ],
        settings: {
            requirePin: false,
            biometric: false,
            notifications: true,
            promotions: false
        }
    });

    // ============================================================
    // STORAGE
    // ============================================================
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const s = defaultState();
                save(s);
                return s;
            }
            const s = JSON.parse(raw);
            // Migrate/backfill missing fields
            const base = defaultState();
            return Object.assign(base, s, {
                settings: Object.assign(base.settings, s.settings || {}),
                cards: Array.isArray(s.cards) ? s.cards : base.cards,
                transactions: Array.isArray(s.transactions) ? s.transactions : []
            });
        } catch (e) {
            console.warn('Wallet: failed to load, resetting.', e);
            const s = defaultState();
            save(s);
            return s;
        }
    }

    function save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Wallet: failed to save.', e);
        }
    }

    // ============================================================
    // WALLET API
    // ============================================================
    const Wallet = {
        state: null,
        balanceHidden: false,

        init: function () {
            this.state = load();
            // Sync currency with global currency manager
            if (window.currencyManager) {
                this.state.currency = window.currencyManager.getCurrencyCode();
                save(this.state);
            }
            this.bindEvents();
            this.refreshAll();
            this.renderHistory();
            this.renderCards();
            this.syncSettingsUI();
        },

        // ------ Formatting ------
        format: function (amount) {
            if (window.currencyManager) return window.currencyManager.format(amount);
            return `ZMW ${Number(amount).toFixed(2)}`;
        },
        currencyCode: function () {
            return window.currencyManager ? window.currencyManager.getCurrencyCode() : 'ZMW';
        },

        // ------ Balance helpers ------
        getBalance: function () { return this.state.balance; },
        canAfford: function (amount) { return this.state.balance >= Number(amount); },

        // ------ Persistence ------
        persist: function () {
            this.state.currency = this.currencyCode();
            save(this.state);
            this.refreshAll();
            document.dispatchEvent(new CustomEvent('walletChanged', { detail: { state: this.state } }));
        },

        // ------ Transaction logger ------
        addTransaction: function ({ type, title, amount, status = 'success', note = '', meta = '' }) {
            const tx = {
                id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                type,               // 'in' | 'out' | 'send' | 'pay' | 'pending'
                title,
                amount: Number(amount),
                status,             // 'success' | 'pending' | 'failed'
                note,
                meta,
                timestamp: Date.now()
            };
            this.state.transactions.unshift(tx);
            // Track totals
            if (status === 'success') {
                if (type === 'in') { this.state.moneyIn += Number(amount); }
                if (type === 'out' || type === 'send' || type === 'pay') { this.state.moneyOut += Number(amount); }
            }
            if (status === 'pending') {
                this.state.pending += Number(amount);
            }
            this.persist();
            this.renderHistory();
            return tx;
        },

        // ------ Credit (top-up / receive) ------
        credit: function (amount, { title = 'Wallet Top Up', note = '', meta = '' } = {}) {
            amount = Number(amount);
            if (amount <= 0) throw new Error('Amount must be positive.');
            this.state.balance += amount;
            this.addTransaction({ type: 'in', title, amount, status: 'success', note, meta });
            return amount;
        },

        // ------ Debit (pay / withdraw / send) ------
        debit: function (amount, { title = 'Payment', type = 'pay', note = '', meta = '', status = 'success' } = {}) {
            amount = Number(amount);
            if (amount <= 0) throw new Error('Amount must be positive.');
            if (this.state.balance < amount) {
                throw new Error('Insufficient wallet balance.');
            }
            this.state.balance -= amount;
            this.addTransaction({ type, title, amount, status, note, meta });
            return amount;
        },

        // ------ Withdraw (pending → out after 24h simulated) ------
        withdraw: function (amount, { destination, method }) {
            amount = Number(amount);
            if (amount <= 0) throw new Error('Amount must be positive.');
            if (this.state.balance < amount) throw new Error('Insufficient wallet balance.');
            const fee = Math.max(2, amount * 0.01); // 1% min 2
            const total = amount + fee;
            if (this.state.balance < total) throw new Error('Insufficient balance to cover withdrawal fee.');

            this.state.balance -= total;
            this.state.pending += amount;
            this.addTransaction({
                type: 'out',
                title: `Withdrawal → ${method === 'mobile' ? 'Mobile Money' : 'Bank'}`,
                amount: amount,
                status: 'pending',
                note: destination,
                meta: `Fee: ${this.format(fee)}`
            });

            // Simulate 24-hour settlement → mark success after 3s for demo
            setTimeout(() => {
                const pendingTx = this.state.transactions.find(
                    t => t.type === 'out' && t.status === 'pending' && t.amount === amount
                );
                if (pendingTx) {
                    pendingTx.status = 'success';
                    this.state.pending = Math.max(0, this.state.pending - amount);
                    this.state.moneyOut += amount;
                    this.persist();
                    this.renderHistory();
                }
            }, 3000);

            return { amount, fee };
        },

        // ------ Send to another wallet ------
        send: function (amount, { recipient, note }) {
            amount = Number(amount);
            if (amount <= 0) throw new Error('Amount must be positive.');
            if (!recipient || recipient.length < 4) throw new Error('Invalid recipient wallet ID.');
            if (this.state.balance < amount) throw new Error('Insufficient wallet balance.');

            this.state.balance -= amount;
            this.addTransaction({
                type: 'send',
                title: `Sent to ${recipient.slice(0, 12)}`,
                amount,
                status: 'success',
                note: note || '',
                meta: 'P2P Transfer'
            });
            return amount;
        },

        // ------ Cards ------
        addCard: function (label) {
            const card = {
                id: 'c_' + Date.now(),
                type: 'visa',
                label: label || 'Card •••• 0000',
                expiry: '01/30',
                isDefault: this.state.cards.length === 0
            };
            this.state.cards.push(card);
            this.persist();
            this.renderCards();
            return card;
        },

        // ------ Reset ------
        reset: function () {
            this.state = defaultState();
            this.state.currency = this.currencyCode();
            save(this.state);
            this.refreshAll();
            this.renderHistory();
            this.renderCards();
            this.syncSettingsUI();
        },

        // ============================================================
        // UI RENDERING
        // ============================================================
        refreshAll: function () {
            // Balance display
            const balanceEl = document.getElementById('walletBalanceDisplay');
            if (balanceEl) {
                balanceEl.dataset.currencyBalance = this.state.balance;
                balanceEl.textContent = this.balanceHidden
                    ? '••••••'
                    : this.format(this.state.balance);
            }
            const currencyLabel = document.getElementById('walletBalanceCurrency');
            if (currencyLabel) currencyLabel.textContent = this.currencyCode();

            const acctEl = document.getElementById('walletAccountNumber');
            if (acctEl) acctEl.textContent = this.state.accountNumber;

            const moneyInEl = document.getElementById('walletMoneyIn');
            if (moneyInEl) moneyInEl.textContent = this.format(this.state.moneyIn);
            const moneyOutEl = document.getElementById('walletMoneyOut');
            if (moneyOutEl) moneyOutEl.textContent = this.format(this.state.moneyOut);
            const pendingEl = document.getElementById('walletPending');
            if (pendingEl) pendingEl.textContent = this.format(this.state.pending);

            // Header balance (top-right)
            const headerCurrency = document.getElementById('walletCurrency');
            if (headerCurrency) headerCurrency.textContent = this.currencyCode();
            const headerBalance = document.getElementById('walletBalance');
            if (headerBalance) headerBalance.textContent = Number(this.state.balance).toFixed(2);

            // Sidebar
            const sidebarBalance = document.getElementById('sidebarUserBalance');
            if (sidebarBalance) sidebarBalance.textContent = this.format(this.state.balance);

            // Dropdown
            const dropBalance = document.getElementById('dropdownWalletBalance');
            if (dropBalance) dropBalance.textContent = this.format(this.state.balance);

            // Settings currency display
            const currencyText = document.getElementById('walletCurrencyText');
            if (currencyText) {
                const map = {
                    ZMW: 'ZMW — Zambian Kwacha',
                    ZAR: 'ZAR — South African Rand',
                    KES: 'KES — Kenyan Shilling',
                    NGN: 'NGN — Nigerian Naira',
                    USD: 'USD — US Dollar',
                    GBP: 'GBP — British Pound',
                    EUR: 'EUR — Euro',
                    TZS: 'TZS — Tanzanian Shilling',
                    NAD: 'NAD — Namibian Dollar',
                    BWP: 'BWP — Botswana Pula',
                    ZWL: 'ZWL — Zimbabwean Dollar'
                };
                currencyText.textContent = map[this.currencyCode()] || this.currencyCode();
            }

            // Insurance limit
            const limitEl = document.getElementById('walletInsuredLimit');
            if (limitEl) limitEl.textContent = this.format(50000);

            // Sub-modal available balances
            ['walletWithdrawAvailable', 'walletSendAvailable'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = this.format(this.state.balance);
            });

            // Currency symbols in sub-modals
            ['topupCurrencySymbol', 'withdrawCurrencySymbol', 'sendCurrencySymbol'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = this.currencyCode();
            });
        },

        renderHistory: function (filter = 'all') {
            const list = document.getElementById('walletHistoryList');
            const empty = document.getElementById('walletHistoryEmpty');
            if (!list) return;

            let txs = this.state.transactions.slice();

            // Apply filter
            if (filter === 'in')      txs = txs.filter(t => t.type === 'in');
            else if (filter === 'out') txs = txs.filter(t => ['out', 'send', 'pay'].includes(t.type));
            else if (filter === 'pending') txs = txs.filter(t => t.status === 'pending');

            if (txs.length === 0) {
                list.innerHTML = '';
                if (empty) empty.hidden = false;
                return;
            }
            if (empty) empty.hidden = true;

            list.innerHTML = txs.map(tx => {
                const iconMap = {
                    in: 'fa-arrow-down',
                    out: 'fa-arrow-up',
                    send: 'fa-paper-plane',
                    pay: 'fa-shopping-bag',
                    pending: 'fa-clock'
                };
                const iconClassMap = {
                    in: 'wallet-tx-icon--in',
                    out: 'wallet-tx-icon--out',
                    send: 'wallet-tx-icon--send',
                    pay: 'wallet-tx-icon--pay',
                    pending: 'wallet-tx-icon--pending'
                };
                const isCredit = tx.type === 'in';
                const amountClass = tx.status === 'pending'
                    ? 'pending'
                    : isCredit ? 'positive' : 'negative';
                const sign = isCredit ? '+' : '−';
                const when = this.relTime(tx.timestamp);
                const statusBadge = tx.status !== 'success'
                    ? `<span class="wallet-tx-status wallet-tx-status--${tx.status}">${tx.status}</span>`
                    : '';

                return `
                    <div class="wallet-tx">
                        <div class="wallet-tx-icon ${iconClassMap[tx.type] || iconClassMap.pending}">
                            <i class="fas ${iconMap[tx.type] || 'fa-circle'}"></i>
                        </div>
                        <div class="wallet-tx-body">
                            <div class="wallet-tx-title">${escapeHtml(tx.title)}</div>
                            <div class="wallet-tx-meta">
                                <span>${when}</span>
                                ${tx.note ? `<span>•</span><span>${escapeHtml(tx.note)}</span>` : ''}
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="wallet-tx-amount ${amountClass}">
                            ${sign}${this.format(tx.amount)}
                        </div>
                    </div>
                `;
            }).join('');
        },

        renderCards: function () {
            const list = document.getElementById('walletCardsList');
            if (!list) return;
            if (this.state.cards.length === 0) {
                list.innerHTML = '';
                return;
            }
            list.innerHTML = this.state.cards.map(card => `
                <div class="wallet-card-item">
                    <div class="wallet-card-item-icon"><i class="fas fa-credit-card"></i></div>
                    <div class="wallet-card-item-body">
                        <div class="wallet-card-item-title">${escapeHtml(card.label)}</div>
                        <div class="wallet-card-item-meta">Expires ${escapeHtml(card.expiry)}</div>
                    </div>
                    ${card.isDefault ? '<span class="wallet-card-item-default">Default</span>' : ''}
                </div>
            `).join('');
        },

        syncSettingsUI: function () {
            const s = this.state.settings;
            const setChecked = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.checked = !!val;
            };
            setChecked('walletPinToggle', s.requirePin);
            setChecked('walletBioToggle', s.biometric);
            setChecked('walletNotifToggle', s.notifications);
            setChecked('walletPromoToggle', s.promotions);
        },

        relTime: function (ts) {
            const diff = Date.now() - ts;
            const s = Math.floor(diff / 1000);
            if (s < 60) return 'Just now';
            const m = Math.floor(s / 60);
            if (m < 60) return `${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h ago`;
            const d = Math.floor(h / 24);
            if (d < 7) return `${d}d ago`;
            return new Date(ts).toLocaleDateString();
        },

        // ============================================================
        // EVENT BINDING
        // ============================================================
        bindEvents: function () {
            const self = this;

            // --- Open / close wallet modal ---
            document.addEventListener('click', (e) => {
                const el = e.target.closest('[data-action]');
                if (!el) return;
                const action = el.dataset.action;

                switch (action) {
                    case 'openWallet':       e.preventDefault(); self.open(); break;
                    case 'closeWallet':      e.preventDefault(); self.close(); break;
                    case 'walletTopUp':      e.preventDefault(); self.openTopUp(); break;
                    case 'walletWithdraw':   e.preventDefault(); self.openWithdraw(); break;
                    case 'walletSend':       e.preventDefault(); self.openSend(); break;
                    case 'walletScan':       e.preventDefault(); self.showToast('QR scanner coming soon.'); break;
                    case 'walletAddCard':    e.preventDefault(); self.addCardPrompt(); break;
                    case 'closeWalletTopUp': e.preventDefault(); self.closeSub('walletTopUpModal'); break;
                    case 'closeWalletWithdraw': e.preventDefault(); self.closeSub('walletWithdrawModal'); break;
                    case 'closeWalletSend':  e.preventDefault(); self.closeSub('walletSendModal'); break;
                    case 'walletReset':      e.preventDefault(); self.confirmReset(); break;
                }
            });

            // --- Tabs ---
            document.querySelectorAll('.wallet-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const target = tab.dataset.walletTab;
                    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.wallet-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    const panel = document.querySelector(`[data-wallet-panel="${target}"]`);
                    if (panel) panel.classList.add('active');
                });
            });

            // --- History filter chips ---
            document.querySelectorAll('.wallet-filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.wallet-filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    self.renderHistory(chip.dataset.walletFilter);
                });
            });

            // --- Eye toggle ---
            const eyeBtn = document.getElementById('walletEyeBtn');
            if (eyeBtn) {
                eyeBtn.addEventListener('click', () => {
                    self.balanceHidden = !self.balanceHidden;
                    eyeBtn.innerHTML = self.balanceHidden
                        ? '<i class="fas fa-eye-slash"></i>'
                        : '<i class="fas fa-eye"></i>';
                    self.refreshAll();
                });
            }

            // --- Click outside to close ---
            const modal = document.getElementById('walletModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) self.close();
                });
            }
            ['walletTopUpModal', 'walletWithdrawModal', 'walletSendModal'].forEach(id => {
                const m = document.getElementById(id);
                if (m) m.addEventListener('click', (e) => { if (e.target === m) self.closeSub(id); });
            });

            // --- Top Up ---
            const topUpConfirm = document.getElementById('walletTopUpConfirmBtn');
            if (topUpConfirm) topUpConfirm.addEventListener('click', () => self.confirmTopUp());

            document.querySelectorAll('[data-topup]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const amountInput = document.getElementById('walletTopUpAmount');
                    if (amountInput) amountInput.value = btn.dataset.topup;
                });
            });

            // --- Withdraw ---
            const withdrawConfirm = document.getElementById('walletWithdrawConfirmBtn');
            if (withdrawConfirm) withdrawConfirm.addEventListener('click', () => self.confirmWithdraw());

            // --- Send ---
            const sendConfirm = document.getElementById('walletSendConfirmBtn');
            if (sendConfirm) sendConfirm.addEventListener('click', () => self.confirmSend());

            // --- Settings toggles ---
            const bindSetting = (id, key) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('change', () => {
                    self.state.settings[key] = el.checked;
                    save(self.state);
                    self.showToast('Settings saved');
                });
            };
            bindSetting('walletPinToggle', 'requirePin');
            bindSetting('walletBioToggle', 'biometric');
            bindSetting('walletNotifToggle', 'notifications');
            bindSetting('walletPromoToggle', 'promotions');

            // --- Currency change ---
            document.addEventListener('currencyChanged', () => {
                self.state.currency = self.currencyCode();
                save(self.state);
                self.refreshAll();
                self.renderHistory();
            });
        },

        // ============================================================
        // OPEN / CLOSE
        // ============================================================
        open: function () {
            const m = document.getElementById('walletModal');
            if (!m) return;
            m.hidden = false;
            requestAnimationFrame(() => m.classList.add('visible'));
            this.refreshAll();
            this.renderHistory();
            this.renderCards();
            this.syncSettingsUI();
        },
        close: function () {
            const m = document.getElementById('walletModal');
            if (!m) return;
            m.classList.remove('visible');
            setTimeout(() => { m.hidden = true; }, 250);
        },
        openSub: function (id) {
            const m = document.getElementById(id);
            if (!m) return;
            m.hidden = false;
            requestAnimationFrame(() => m.classList.add('visible'));
            this.refreshAll();
        },
        closeSub: function (id) {
            const m = document.getElementById(id);
            if (!m) return;
            m.classList.remove('visible');
            setTimeout(() => { m.hidden = true; }, 200);
        },

        openTopUp: function () {
            const amountInput = document.getElementById('walletTopUpAmount');
            if (amountInput) amountInput.value = 100;
            this.openSub('walletTopUpModal');
        },
        openWithdraw: function () {
            const amountInput = document.getElementById('walletWithdrawAmount');
            if (amountInput) amountInput.value = 100;
            const dest = document.getElementById('walletWithdrawDestination');
            if (dest) dest.value = '';
            const status = document.getElementById('walletWithdrawStatus');
            if (status) status.hidden = true;
            this.openSub('walletWithdrawModal');
        },
        openSend: function () {
            const rec = document.getElementById('walletSendRecipient');
            if (rec) rec.value = '';
            const amount = document.getElementById('walletSendAmount');
            if (amount) amount.value = 50;
            const status = document.getElementById('walletSendStatus');
            if (status) status.hidden = true;
            this.openSub('walletSendModal');
        },

        // ============================================================
        // ACTIONS
        // ============================================================
        confirmTopUp: function () {
            const amountInput = document.getElementById('walletTopUpAmount');
            const amount = Number(amountInput && amountInput.value);
            if (!amount || amount < 10) {
                this.showToast('Minimum top-up is ' + this.format(10));
                return;
            }
            this.closeSub('walletTopUpModal');
            if (!window.paymentGateway) {
                // Fallback — credit directly
                this.credit(amount, { title: 'Wallet Top Up (Direct)' });
                this.showToast(`✅ Added ${this.format(amount)} to wallet`);
                return;
            }
            window.paymentGateway.open({
                amount,
                description: 'Wallet Top Up',
                onSuccess: (details) => {
                    this.credit(details.amount, {
                        title: 'Wallet Top Up',
                        note: `via ${details.method}`,
                        meta: 'Top Up'
                    });
                    this.showToast(`✅ Added ${this.format(details.amount)} to your wallet`);
                    this.refreshAll();
                }
            });
        },

        confirmWithdraw: function () {
            const statusEl = document.getElementById('walletWithdrawStatus');
            const amountInput = document.getElementById('walletWithdrawAmount');
            const methodSelect = document.getElementById('walletWithdrawMethod');
            const destInput = document.getElementById('walletWithdrawDestination');

            const amount = Number(amountInput && amountInput.value);
            const method = methodSelect ? methodSelect.value : 'mobile';
            const destination = destInput ? destInput.value.trim() : '';

            const showError = (msg) => {
                if (statusEl) {
                    statusEl.textContent = msg;
                    statusEl.className = 'wallet-sub-status error';
                    statusEl.hidden = false;
                }
            };
            const showSuccess = (msg) => {
                if (statusEl) {
                    statusEl.textContent = msg;
                    statusEl.className = 'wallet-sub-status success';
                    statusEl.hidden = false;
                }
            };

            if (!amount || amount < 10) return showError('Minimum withdrawal is ' + this.format(10));
            if (!destination) return showError('Please enter a destination.');
            if (amount > this.state.balance) return showError('Insufficient balance.');

            try {
                const result = this.withdraw(amount, { destination, method });
                showSuccess(`✅ Withdrawal of ${this.format(result.amount)} requested. Fee: ${this.format(result.fee)}. Processing within 24h.`);
                setTimeout(() => this.closeSub('walletWithdrawModal'), 1800);
            } catch (err) {
                showError(err.message);
            }
        },

        confirmSend: function () {
            const statusEl = document.getElementById('walletSendStatus');
            const recipientInput = document.getElementById('walletSendRecipient');
            const amountInput = document.getElementById('walletSendAmount');
            const noteInput = document.getElementById('walletSendNote');

            const recipient = recipientInput ? recipientInput.value.trim() : '';
            const amount = Number(amountInput && amountInput.value);
            const note = noteInput ? noteInput.value.trim() : '';

            const showError = (msg) => {
                if (statusEl) {
                    statusEl.textContent = msg;
                    statusEl.className = 'wallet-sub-status error';
                    statusEl.hidden = false;
                }
            };
            const showSuccess = (msg) => {
                if (statusEl) {
                    statusEl.textContent = msg;
                    statusEl.className = 'wallet-sub-status success';
                    statusEl.hidden = false;
                }
            };

            if (!recipient) return showError('Enter a recipient wallet ID.');
            if (!amount || amount < 1) return showError('Enter a valid amount.');
            if (recipient === this.state.accountNumber) return showError('You cannot send to yourself.');

            try {
                this.send(amount, { recipient, note });
                showSuccess(`✅ Sent ${this.format(amount)} to ${recipient}.`);
                setTimeout(() => this.closeSub('walletSendModal'), 1500);
            } catch (err) {
                showError(err.message);
            }
        },

        addCardPrompt: function () {
            const label = prompt('Enter card label (e.g. "Visa •••• 1234"):', 'Visa •••• 0000');
            if (label) {
                this.addCard(label);
                this.showToast('✅ Card added');
            }
        },

        confirmReset: function () {
            if (!confirm('Reset wallet? This will delete all transactions and reset balance to 0.')) return;
            this.reset();
            this.showToast('Wallet reset');
        },

        showToast: function (msg) {
            if (typeof window.showToast === 'function') {
                window.showToast(msg);
            } else {
                // Fallback
                console.log('[Wallet]', msg);
            }
        }
    };

    // ============================================================
    // UTIL
    // ============================================================
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[s]));
    }

    // ============================================================
    // EXPOSE & INIT
    // ============================================================
    window.wallet = Wallet;
    document.addEventListener('DOMContentLoaded', () => Wallet.init());

    // ============================================================
    // INTEGRATION: paymentGateway — allow paying FROM wallet
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.paymentGateway) return;

        // Extend the payment gateway with a wallet method + wallet option
        const pg = window.paymentGateway;
        if (!pg.paymentMethods) return;

        // Add "Wallet" as a payment method
        pg.paymentMethods['wallet'] = {
            label: 'Pay from Wallet',
            icon: '💰',
            fields: `
                <div class="form-group">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; font-size:0.85rem;">
                        <span style="color:#166534; font-weight:600;">
                            <i class="fas fa-wallet"></i> Wallet Balance
                        </span>
                        <strong style="color:#14532d;" id="pgWalletBalance">—</strong>
                    </div>
                    <small style="display:block; margin-top:6px; color:#94a3b8; font-size:0.72rem; text-align:center;">
                        Funds will be deducted instantly.
                    </small>
                </div>
            `
        };

        // Wrap renderMethods to inject wallet first when opening
        const origOpen = pg.open.bind(pg);
        pg.open = function (options) {
            origOpen(options);
            // After the modal is open, prepend Wallet method
            setTimeout(() => {
                const walletBal = document.getElementById('pgWalletBalance');
                if (walletBal && window.wallet) {
                    walletBal.textContent = window.wallet.format(window.wallet.getBalance());
                }
            }, 50);
        };

        // Wrap processPayment to handle wallet debiting
        const origProcess = pg.processPayment.bind(pg);
        pg.processPayment = function () {
            const selected = document.querySelector('#paymentGatewayModal input[name="paymentMethod"]:checked');
            if (selected && selected.value === 'wallet') {
                // Validate wallet balance
                if (!window.wallet) {
                    pg.showFeedback('Wallet not available.', 'error');
                    return;
                }
                if (window.wallet.getBalance() < pg.currentAmount) {
                    pg.showFeedback('Insufficient wallet balance. Please top up.', 'error');
                    return;
                }
                // Debit wallet and simulate success
                pg.feedbackEl.hidden = true;
                pg.payBtn.disabled = true;
                pg.payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                setTimeout(() => {
                    try {
                        window.wallet.debit(pg.currentAmount, {
                            title: pg.currentDescription,
                            type: 'pay',
                            note: 'Paid via Wallet',
                            meta: 'Wallet Payment'
                        });
                        pg.showFeedback('Payment successful!', 'success');
                        setTimeout(() => {
                            if (pg.onSuccess) {
                                pg.onSuccess({
                                    amount: pg.currentAmount,
                                    description: pg.currentDescription,
                                    method: 'wallet',
                                    currency: window.currencyManager ? window.currencyManager.getCurrencyCode() : 'ZMW'
                                });
                            }
                            pg.close();
                        }, 1200);
                    } catch (err) {
                        pg.showFeedback(err.message || 'Payment failed.', 'error');
                        pg.reset();
                    }
                }, 800);
                return;
            }
            // Not wallet — use original flow
            return origProcess();
        };
    });

})();