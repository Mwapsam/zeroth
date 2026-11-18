/* ================================================================
   WALLET — ACCEPTABLE PAYMENT METHODS + DEPOSIT FLOW (v2)
   Self-healing: re-injects the deposit/withdraw row whenever the
   wallet opens, even if wallet.js re-renders the modal body.
   ================================================================ */
(() => {
    'use strict';

    // ---------- Currency map ----------
    const CURRENCY_BY_COUNTRY = {
        ZM: { code: 'ZMW', symbol: 'K' },
        ZA: { code: 'ZAR', symbol: 'R' },
        KE: { code: 'KES', symbol: 'KSh' },
        NG: { code: 'NGN', symbol: '₦' },
        TZ: { code: 'TZS', symbol: 'TSh' },
        UG: { code: 'UGX', symbol: 'USh' },
        GH: { code: 'GHS', symbol: '₵' },
        BW: { code: 'BWP', symbol: 'P' },
        NA: { code: 'NAD', symbol: 'N$' },
        ZW: { code: 'USD', symbol: '$' },
        MW: { code: 'MWK', symbol: 'MK' },
        MZ: { code: 'MZN', symbol: 'MT' },
        US: { code: 'USD', symbol: '$' },
        GB: { code: 'GBP', symbol: '£' },
        EU: { code: 'EUR', symbol: '€' }
    };

    // ---------- Payment methods ----------
    const PAYMENT_METHODS = [
        { id:'airtel',  label:'Airtel Money',  sub:'Instant · zero fees', icon:'📱', chipClass:'airtel', tag:'ZERO FEES', currency:'ZMW',
          fields:[{ name:'phone', label:'Airtel phone number', type:'tel', placeholder:'+260 97 000 0000', required:true }] },
        { id:'mtn',     label:'MTN MoMo',      sub:'Instant · 5% cashback', icon:'📶', chipClass:'mtn', tag:'CASHBACK', currency:'ZMW',
          fields:[{ name:'phone', label:'MTN phone number', type:'tel', placeholder:'+260 96 000 0000', required:true }] },
        { id:'zamtel',  label:'Zamtel Kwacha', sub:'Instant', icon:'📞', chipClass:'zamtel', currency:'ZMW',
          fields:[{ name:'phone', label:'Zamtel phone number', type:'tel', placeholder:'+260 95 000 0000', required:true }] },
        { id:'visa',    label:'Visa',          sub:'Debit / credit card', icon:'💳', chipClass:'visa', currency:'ANY',
          fields:[
            { name:'cardNumber', label:'Card number', type:'text', placeholder:'4242 4242 4242 4242', required:true, maxlength:19 },
            { name:'expiry',     label:'Expiry (MM/YY)', type:'text', placeholder:'12/28', required:true, maxlength:5 },
            { name:'cvv',        label:'CVV', type:'password', placeholder:'123', required:true, maxlength:4 },
            { name:'cardName',   label:'Name on card', type:'text', placeholder:'JOHN DOE', required:true }
          ] },
        { id:'mastercard', label:'Mastercard', sub:'Debit / credit card', icon:'💳', chipClass:'mastercard', currency:'ANY',
          fields:[
            { name:'cardNumber', label:'Card number', type:'text', placeholder:'5555 5555 5555 4444', required:true, maxlength:19 },
            { name:'expiry',     label:'Expiry (MM/YY)', type:'text', placeholder:'12/28', required:true, maxlength:5 },
            { name:'cvv',        label:'CVV', type:'password', placeholder:'123', required:true, maxlength:4 },
            { name:'cardName',   label:'Name on card', type:'text', placeholder:'JOHN DOE', required:true }
          ] },
        { id:'bank',    label:'Bank Transfer', sub:'Zanaco · Stanbic · Absa · FNB', icon:'🏦', chipClass:'bank', currency:'ANY',
          fields:[
            { name:'bank', label:'Your bank', type:'select', required:true,
              options:['Zanaco','Stanbic','Absa','FNB','Indo Zambia','Atlas Mara','Access Bank','Other'] },
            { name:'accountName',   label:'Account name', type:'text', placeholder:'Full name on account', required:true },
            { name:'accountNumber', label:'Account number', type:'text', placeholder:'0123456789', required:true }
          ],
          tip:'You will receive a reference number. Use it to complete the transfer in your banking app.' },
        { id:'crypto',  label:'Crypto (USDT)', sub:'TRC-20 · BEP-20', icon:'₿', chipClass:'crypto', tag:'NEW', currency:'USD',
          fields:[
            { name:'network', label:'Network', type:'select', required:true,
              options:['TRC-20 (Tron)','BEP-20 (BSC)','ERC-20 (Ethereum)'] },
            { name:'walletAddress', label:'Your wallet address', type:'text', placeholder:'T... or 0x...', required:true }
          ],
          tip:'Send the exact amount to the address shown on the next screen. Funds credit after 1 network confirmation.' }
    ];

    // ---------- State ----------
    let selectedMethodId = null;
    let currentCurrency  = 'ZMW';
    let currentSymbol    = 'K';
    let walletObserver   = null;

    // ---------- Helpers ----------
    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    function fmt(amount, code = currentCurrency, symbol = currentSymbol) {
        const n = Number(amount || 0);
        return `${code === 'USD' ? '$' : symbol}${n.toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        })}`;
    }

    function getWalletBalance() {
        if (window.ZBSWallet?.getState) return window.ZBSWallet.getState().balance || 0;
        const el = $('#walletBalanceDisplay');
        if (!el) return 0;
        const raw = (el.dataset.currencyBalance || el.textContent || '0').replace(/[^\d.-]/g, '');
        return Number(raw) || 0;
    }

    function detectCurrency() {
        const country = (localStorage.getItem('zbs_country') || 'ZM').toUpperCase();
        const c = CURRENCY_BY_COUNTRY[country] || CURRENCY_BY_COUNTRY.ZM;
        currentCurrency = c.code;
        currentSymbol   = c.symbol;
        return c;
    }

    // ================================================================
    // CORE FIX: inject (or re-inject) the deposit/withdraw row
    // ================================================================
    function injectActionRow() {
        const container = $('#walletModal .wallet-container');
        if (!container) return;               // wallet not in DOM yet
        if ($('#walletDepositBtnRow', container)) return; // already present

        const row = document.createElement('div');
        row.id = 'walletDepositBtnRow';
        row.className = 'wallet-deposit-row';

        // Primary DEPOSIT button
        const depositBtn = document.createElement('button');
        depositBtn.type = 'button';
        depositBtn.className = 'wallet-deposit-btn';
        depositBtn.setAttribute('data-action', 'walletDeposit');
        depositBtn.innerHTML = `
            <span class="wallet-deposit-btn-icon"><i class="fas fa-plus-circle"></i></span>
            <span class="wallet-deposit-btn-text">
                <strong>Deposit Funds</strong>
                <small>Top up via mobile money, card or bank</small>
            </span>
            <i class="fas fa-chevron-right wallet-deposit-btn-arrow"></i>
        `;

        // Secondary WITHDRAW button (always visible next to it)
        const withdrawBtn = document.createElement('button');
        withdrawBtn.type = 'button';
        withdrawBtn.className = 'wallet-withdraw-btn';
        withdrawBtn.setAttribute('data-action', 'walletWithdraw');
        withdrawBtn.innerHTML = `
            <span class="wallet-withdraw-btn-icon"><i class="fas fa-arrow-up"></i></span>
            <span class="wallet-withdraw-btn-text">
                <strong>Withdraw</strong>
                <small>To mobile money or bank</small>
            </span>
        `;

        row.appendChild(depositBtn);
        row.appendChild(withdrawBtn);

        // Insert at the top of .wallet-body (or after .wallet-balance-card)
        const body = $('.wallet-content', container);
        const balanceCard = $('.wallet-balance-card', container);

        if (balanceCard && balanceCard.parentNode) {
            balanceCard.insertAdjacentElement('afterend', row);
        } else if (body && body.parentNode) {
            body.parentNode.insertBefore(row, body);
        } else {
            container.insertBefore(row, container.children[1] || null);
        }
    }

    // Re-inject whenever the wallet modal becomes visible
    function watchWalletModal() {
        const modal = $('#walletModal');
        if (!modal) return;

        // MutationObserver: catch any DOM rewrite by wallet.js
        if (walletObserver) walletObserver.disconnect();
        walletObserver = new MutationObserver(() => {
            if (!modal.hidden) injectActionRow();
        });
        walletObserver.observe(modal, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']
        });

        // Also inject immediately if already open
        if (!modal.hidden) injectActionRow();
    }

    // ---------- Render: chips inside the wallet ----------
    function renderMethodChips() {
        // Chips live inside the injected row now
        const row = $('#walletDepositBtnRow');
        if (!row) return;

        let chips = $('#walletMethodsChips', row);
        if (!chips) {
            const section = document.createElement('div');
            section.className = 'wallet-methods-section';
            section.innerHTML = `
                <div class="wallet-methods-head">
                    <span class="wallet-methods-title"><i class="fas fa-credit-card"></i> Accepted Payment Methods</span>
                </div>
                <div class="wallet-methods-chips" id="walletMethodsChips"></div>
                <div class="wallet-methods-note">
                    <i class="fas fa-shield-alt"></i>
                    <span>All payments are encrypted &amp; PCI-DSS compliant.</span>
                </div>
            `;
            row.appendChild(section);
            chips = $('#walletMethodsChips', row);
        }

        chips.innerHTML = '';
        PAYMENT_METHODS.forEach(m => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `wallet-method-chip ${m.chipClass || ''}`;
            chip.dataset.methodId = m.id;
            chip.innerHTML = `
                <span class="chip-logo">${m.icon}</span>
                <span>${m.label}</span>
                ${m.tag ? `<span class="chip-tag ${m.tag === 'NEW' ? 'new' : ''}">${m.tag}</span>` : ''}
            `;
            chip.addEventListener('click', () => openDepositWith(m.id));
            chips.appendChild(chip);
        });
    }

    // ---------- Render: method grid inside the deposit modal ----------
    function renderMethodGrid() {
        const grid = $('#walletDepositMethodGrid');
        if (!grid) return;
        grid.innerHTML = '';
        PAYMENT_METHODS.forEach(m => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wallet-method-option';
            btn.dataset.methodId = m.id;
            btn.innerHTML = `
                <span class="method-logo">${m.icon}</span>
                <span class="method-info">
                    <strong>${m.label}</strong>
                    <small>${m.sub || ''}</small>
                </span>
            `;
            btn.addEventListener('click', () => selectMethod(m.id));
            grid.appendChild(btn);
        });
    }

    function renderDynamicFields(method) {
        const form = $('#walletDepositDynamicForm');
        if (!form) return;
        form.innerHTML = '';
        if (!method) return;

        method.fields.forEach(f => {
            const field = document.createElement('div');
            field.className = 'wallet-sub-field';
            if (f.type === 'select') {
                field.innerHTML = `
                    <label for="dep_${f.name}">${f.label}${f.required ? ' *' : ''}</label>
                    <select id="dep_${f.name}" data-dep-field="${f.name}" ${f.required ? 'required' : ''}>
                        <option value="">Select…</option>
                        ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                    </select>`;
            } else {
                field.innerHTML = `
                    <label for="dep_${f.name}">${f.label}${f.required ? ' *' : ''}</label>
                    <input type="${f.type}" id="dep_${f.name}"
                           data-dep-field="${f.name}"
                           placeholder="${f.placeholder || ''}"
                           ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}
                           ${f.required ? 'required' : ''} />`;
            }
            form.appendChild(field);
        });

        if (method.tip) {
            const tip = document.createElement('div');
            tip.className = 'wallet-deposit-tip';
            tip.innerHTML = `<i class="fas fa-info-circle"></i><span>${method.tip}</span>`;
            form.appendChild(tip);
        }
    }

    function selectMethod(id) {
        selectedMethodId = id;
        $$('.wallet-method-option').forEach(el => {
            el.classList.toggle('active', el.dataset.methodId === id);
        });
        const method = PAYMENT_METHODS.find(m => m.id === id);
        renderDynamicFields(method);
        updatePayAmount();
    }

    function updatePayAmount() {
        const amount = Number($('#walletDepositAmount')?.value || 0);
        const label  = $('#walletDepositPayAmount');
        const newBal = $('#walletDepositNewBalance');
        if (label) label.textContent = fmt(amount);
        if (newBal) newBal.textContent = fmt(getWalletBalance() + amount);
    }

    function openDepositModal(preselectId) {
        detectCurrency();
        const symEl = $('#depositCurrencySymbol');
        if (symEl) symEl.textContent = currentCurrency;

        // Make sure the modal exists in the DOM — if not, inject it
        ensureDepositModal();
        renderMethodGrid();
        renderMethodChips();
        updatePayAmount();

        const modal = $('#walletDepositModal');
        if (modal) modal.hidden = false;
        document.body.classList.add('modal-open');

        if (preselectId) selectMethod(preselectId);
    }

    function closeDepositModal() {
        const modal = $('#walletDepositModal');
        if (modal) modal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    function openDepositWith(id) { openDepositModal(id); }

    // ---------- Guard: if the modal HTML was not added to the page ----------
    function ensureDepositModal() {
        if ($('#walletDepositModal')) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = `
        <div class="wallet-sub-modal wallet-deposit-modal" id="walletDepositModal"
             role="dialog" aria-modal="true" aria-labelledby="depositTitle" hidden>
            <div class="wallet-sub-container">
                <header class="wallet-sub-header">
                    <div class="wallet-sub-title">
                        <i class="fas fa-plus-circle"></i>
                        <span id="depositTitle">Deposit Funds</span>
                    </div>
                    <button class="window-close-btn" data-action="closeWalletDeposit" aria-label="Close">&times;</button>
                </header>
                <div class="wallet-sub-body">
                    <div class="wallet-sub-amount-display">
                        <span class="wallet-sub-label">Amount to deposit</span>
                        <div class="wallet-sub-amount-input">
                            <span class="wallet-sub-currency" id="depositCurrencySymbol">ZMW</span>
                            <input type="number" id="walletDepositAmount" min="10" step="10" value="100" />
                        </div>
                        <small class="wallet-sub-balance">
                            New balance after deposit: <strong id="walletDepositNewBalance">ZMW 0.00</strong>
                        </small>
                    </div>
                    <div class="wallet-quick-amounts">
                        <button class="wallet-quick-btn" data-deposit="50">50</button>
                        <button class="wallet-quick-btn" data-deposit="100">100</button>
                        <button class="wallet-quick-btn" data-deposit="250">250</button>
                        <button class="wallet-quick-btn" data-deposit="500">500</button>
                        <button class="wallet-quick-btn" data-deposit="1000">1,000</button>
                        <button class="wallet-quick-btn" data-deposit="5000">5,000</button>
                    </div>
                    <div class="wallet-sub-field">
                        <label for="walletDepositMethod">Pay with *</label>
                        <div class="wallet-method-grid" id="walletDepositMethodGrid"></div>
                    </div>
                    <div class="wallet-dynamic-form" id="walletDepositDynamicForm"></div>
                    <p class="wallet-sub-hint">
                        <i class="fas fa-lock"></i>
                        No deposit fees. Minimum 10.
                    </p>
                    <div class="wallet-sub-status" id="walletDepositStatus" role="alert" hidden></div>
                </div>
                <footer class="wallet-sub-footer">
                    <button class="wallet-sub-btn wallet-sub-btn--primary" id="walletDepositConfirmBtn">
                        <i class="fas fa-lock"></i> Pay <span id="walletDepositPayAmount">ZMW 0.00</span>
                    </button>
                    <button class="wallet-sub-btn wallet-sub-btn--ghost" data-action="closeWalletDeposit">
                        Cancel
                    </button>
                </footer>
            </div>
        </div>`;
        document.body.appendChild(wrap.firstElementChild);

        // Wire the confirm button once
        $('#walletDepositConfirmBtn').addEventListener('click', submitDeposit);
    }

    // ---------- Submit deposit ----------
    async function submitDeposit() {
        const statusEl = $('#walletDepositStatus');
        const btn      = $('#walletDepositConfirmBtn');
        const amount   = Number($('#walletDepositAmount')?.value || 0);
        const method   = PAYMENT_METHODS.find(m => m.id === selectedMethodId);

        const showError = (msg) => {
            if (!statusEl) return;
            statusEl.hidden = false;
            statusEl.textContent = msg;
            statusEl.className = 'wallet-sub-status wallet-sub-status--error';
        };
        const clearStatus = () => {
            if (!statusEl) return;
            statusEl.hidden = true; statusEl.textContent = '';
        };
        clearStatus();

        if (!method) return showError('Please choose a payment method.');
        if (!amount || amount < 10) return showError('Minimum deposit is 10.');
        if (amount > 500000) return showError('Maximum single deposit is 500,000.');

        const missing = method.fields.filter(f => {
            const el = $(`[data-dep-field="${f.name}"]`);
            return f.required && (!el || !el.value.trim());
        });
        if (missing.length) return showError(`Please fill in: ${missing.map(f => f.label).join(', ')}`);

        const details = {};
        method.fields.forEach(f => {
            const el = $(`[data-dep-field="${f.name}"]`);
            if (el) details[f.name] = el.value.trim();
        });

        if (window.ZBSPaymentGateway?.start) {
            try {
                btn.disabled = true;
                await window.ZBSPaymentGateway.start({
                    amount, currency: currentCurrency,
                    description: `Wallet deposit via ${method.label}`,
                    method: method.id,
                    onSuccess: (txn) => { creditWallet(amount, `Deposit via ${method.label}`, txn); closeDepositModal(); },
                    onFailure: (err) => showError(err?.message || 'Payment failed.')
                });
            } catch (err) { showError(err?.message || 'Payment could not be started.'); }
            finally { btn.disabled = false; }
            return;
        }

        btn.disabled = true;
        try {
            await new Promise(r => setTimeout(r, 800));
            creditWallet(amount, `Deposit via ${method.label}`, { reference: 'DEMO-' + Date.now() });
            closeDepositModal();
        } catch (e) { showError('Deposit failed. Please try again.'); }
        finally { btn.disabled = false; }
    }

    // ---------- Credit wallet ----------
    function creditWallet(amount, note, txn = {}) {
        if (window.ZBSWallet?.deposit)       window.ZBSWallet.deposit(amount, note);
        else if (window.ZBSWallet?.credit)  window.ZBSWallet.credit(amount, note);
        else {
            const key  = 'zbs_wallet_transactions';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.unshift({
                id:'txn_' + Date.now(), type:'in', amount,
                currency: currentCurrency, note,
                reference: txn.reference || null,
                date: new Date().toISOString(), status:'completed'
            });
            localStorage.setItem(key, JSON.stringify(list));
            const balKey = 'zbs_wallet_balance';
            const prev   = Number(localStorage.getItem(balKey) || 0);
            localStorage.setItem(balKey, String(prev + amount));
        }

        if (typeof window.refreshWalletUI === 'function') window.refreshWalletUI();
        else {
            const disp = $('#walletBalanceDisplay');
            if (disp) {
                const newBal = getWalletBalance();
                disp.textContent = newBal.toFixed(2);
                disp.dataset.currencyBalance = newBal;
            }
        }

        if (typeof window.showToast === 'function') {
            window.showToast(`✅ Deposit of ${fmt(amount)} successful`, 'success');
        }
    }

    // ---------- Global click router ----------
    function wireEvents() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            if (action === 'walletDeposit' || action === 'walletTopUp') {
                e.preventDefault(); openDepositModal();
            }
            if (action === 'closeWalletDeposit') {
                e.preventDefault(); closeDepositModal();
            }
            if (action === 'walletManageMethods') {
                e.preventDefault(); openDepositModal();
            }
        });

        // Quick amounts
        document.addEventListener('click', (e) => {
            const q = e.target.closest('[data-deposit]');
            if (!q) return;
            const input = $('#walletDepositAmount');
            if (input) { input.value = q.dataset.deposit; updatePayAmount(); }
        });

        // Amount input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'walletDepositAmount') updatePayAmount();
        });
    }

    // ---------- Boot ----------
    function boot() {
        detectCurrency();
        ensureDepositModal();
        watchWalletModal();
        injectActionRow();
        wireEvents();

        // Re-check on every wallet open (covers late-arriving wallet.js renders)
        const openers = [
            '[data-action="openWallet"]',
            '#floatingWallet',
            '#sidebarUserBalance',
            '[data-action="openWallet"]'
        ];
        openers.forEach(sel => {
            document.querySelectorAll(sel).forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(() => { injectActionRow(); renderMethodChips(); }, 60);
                    setTimeout(() => { injectActionRow(); renderMethodChips(); }, 250);
                });
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    // Expose
    window.ZBSWalletMethods = {
        openDeposit: openDepositModal,
        closeDeposit: closeDepositModal,
        methods: PAYMENT_METHODS,
        openDepositWith,
        injectActionRow
    };
})();