/**
 * Payment Gateway
 * A universal payment overlay for all checkout flows.
 * Usage:
 *   window.paymentGateway.open({
 *       amount: 250.00,
 *       description: 'Market Hub Order',
 *       onSuccess: (details) => { ... },
 *       onFailure: (error) => { ... }
 *   });
 */
(function () {
    'use strict';

    window.paymentGateway = {
        modal: null,
        feedbackEl: null,
        payBtn: null,
        payAmountEl: null,
        amountEl: null,
        descEl: null,
        currentAmount: 0,
        currentDescription: '',
        onSuccess: null,
        onFailure: null,
        paymentMethods: {},

        init: function () {
            this.modal = document.getElementById('paymentGatewayModal');
            if (!this.modal) {
                console.error('Payment Gateway modal HTML not found.');
                return;
            }
            this.feedbackEl = document.getElementById('paymentFeedback');
            this.payBtn = document.getElementById('paymentPayBtn');
            this.payAmountEl = document.getElementById('paymentPayAmount');
            this.amountEl = document.getElementById('paymentAmount');
            this.descEl = document.getElementById('paymentDescription');
            this.initPaymentMethods();
            this.bindEvents();
        },

        initPaymentMethods: function () {
            this.paymentMethods = {
                'mobile-money': {
                    label: 'Mobile Money',
                    icon: '📱',
                    fields: `
                        <div class="form-group">
                            <label for="payMobileNetwork">Network</label>
                            <select id="payMobileNetwork" name="network" required>
                                <option value="Airtel">Airtel Money</option>
                                <option value="MTN">MTN Mobile Money</option>
                                <option value="Zamtel">Zamtel Kwacha</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payMobileNumber">Phone Number</label>
                            <input type="tel" id="payMobileNumber" name="phone" placeholder="+260 97 000 0000" required />
                        </div>
                    `
                },
                'card': {
                    label: 'Card Payment',
                    icon: '💳',
                    fields: `
                        <div class="form-group">
                            <label for="payCardName">Cardholder Name</label>
                            <input type="text" id="payCardName" name="cardName" placeholder="Name on card" required />
                        </div>
                        <div class="form-group">
                            <label for="payCardNumber">Card Number</label>
                            <input type="text" id="payCardNumber" name="cardNumber" placeholder="0000 0000 0000 0000" required inputmode="numeric" autocomplete="cc-number" />
                        </div>
                        <div class="payment-card-row">
                            <div class="form-group">
                                <label for="payCardExpiry">Expiry Date</label>
                                <input type="text" id="payCardExpiry" name="cardExpiry" placeholder="MM/YY" required inputmode="numeric" autocomplete="cc-exp" />
                            </div>
                            <div class="form-group">
                                <label for="payCardCvv">CVV</label>
                                <input type="password" id="payCardCvv" name="cardCvv" placeholder="123" required inputmode="numeric" autocomplete="cc-csc" />
                            </div>
                        </div>
                    `
                },
                'bank-transfer': {
                    label: 'Bank Transfer',
                    icon: '🏦',
                    fields: `
                        <div style="font-size: 0.9rem; color: #475569; line-height: 1.6;">
                            <p><strong>Bank:</strong> Zanaco</p>
                            <p><strong>Account Name:</strong> Zeroth Business Solutions Ltd.</p>
                            <p><strong>Account No:</strong> 1234567890</p>
                            <p><strong>Branch:</strong> Lusaka Main</p>
                            <p style="margin-top: 8px;"><em>Please use your payment reference as the transfer narrative.</em></p>
                        </div>
                    `
                }
            };
        },

        bindEvents: function () {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
            document.getElementById('paymentMethodsList').addEventListener('change', (e) => {
                if (e.target.name === 'paymentMethod') {
                    this.renderMethodFields(e.target.value);
                }
            });
            this.payBtn.addEventListener('click', () => this.processPayment());
        },

        updateCurrency: function () {
            if (!window.currencyManager) return;
            const fmt = (amt) => window.currencyManager.format(amt);
            if (this.amountEl) this.amountEl.textContent = fmt(this.currentAmount);
            if (this.payAmountEl) this.payAmountEl.textContent = fmt(this.currentAmount);
        },

        renderMethods: function () {
            const list = document.getElementById('paymentMethodsList');
            list.innerHTML = '';
            let first = true;
            for (const key in this.paymentMethods) {
                const method = this.paymentMethods[key];
                const optionDiv = document.createElement('div');
                optionDiv.className = 'payment-method-option';
                optionDiv.innerHTML = `
                    <input type="radio" name="paymentMethod" id="pm-${key}" value="${key}" ${first ? 'checked' : ''}>
                    <label class="payment-method-label" for="pm-${key}">
                        <span class="pm-emoji">${method.icon}</span>
                        <span>${method.label}</span>
                    </label>
                `;
                list.appendChild(optionDiv);
                if (first) {
                    this.renderMethodFields(key);
                    first = false;
                }
            }
        },

        renderMethodFields: function (methodKey) {
            const container = document.getElementById('paymentDynamicForm');
            const method = this.paymentMethods[methodKey];
            container.innerHTML = method ? method.fields : '';
        },

        processPayment: function () {
            this.feedbackEl.hidden = true;
            const selectedMethod = this.modal.querySelector('input[name="paymentMethod"]:checked');
            if (!selectedMethod) {
                this.showFeedback('Please select a payment method.', 'error');
                return;
            }
            const form = document.getElementById('paymentDynamicForm');
            const inputs = form.querySelectorAll('input[required], select[required]');
            let isValid = true;
            for (const input of inputs) {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#dc2626';
                } else {
                    input.style.borderColor = '#cbd5e1';
                }
            }
            if (!isValid) {
                this.showFeedback('Please fill in all required fields.', 'error');
                return;
            }

            this.payBtn.disabled = true;
            this.payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Simulate API call
            setTimeout(() => {
                // Simulate a 90% success rate
                const success = Math.random() < 0.9;
                if (success) {
                    this.showFeedback('Payment successful!', 'success');
                    setTimeout(() => {
                        if (this.onSuccess) {
                            this.onSuccess({
                                amount: this.currentAmount,
                                description: this.currentDescription,
                                method: selectedMethod.value,
                                currency: window.currencyManager ? window.currencyManager.getCurrencyCode() : 'ZMW'
                            });
                        }
                        this.close();
                    }, 1500);
                } else {
                    this.showFeedback('Payment failed. Please try again.', 'error');
                    if (this.onFailure) {
                        this.onFailure(new Error('Payment declined'));
                    }
                    this.reset();
                }
            }, 2000);
        },

        showFeedback: function (message, type) {
            this.feedbackEl.textContent = message;
            this.feedbackEl.className = `payment-feedback ${type}`;
            this.feedbackEl.hidden = false;
        },

        reset: function () {
            this.feedbackEl.hidden = true;
            this.payBtn.disabled = false;
            this.updateCurrency();
            this.payBtn.innerHTML = `<i class="fas fa-shield-alt"></i> Pay <span id="paymentPayAmount">${window.currencyManager ? window.currencyManager.format(this.currentAmount) : this.currentAmount}</span>`;
            // Re-grab the payAmountEl reference since we just re-rendered
            this.payAmountEl = document.getElementById('paymentPayAmount');
        },

        /**
         * Opens the payment gateway.
         * @param {object} options - Payment details.
         * @param {number} options.amount - The amount to be paid.
         * @param {string} options.description - A description of the payment.
         * @param {function} options.onSuccess - Callback function to run on successful payment.
         * @param {function} [options.onFailure] - Optional callback for failed payments.
         */
        open: function (options) {
            if (!this.modal) this.init(); // Initialize on first open
            this.currentAmount = options.amount || 0;
            this.currentDescription = options.description || 'For your order';
            this.onSuccess = options.onSuccess;
            this.onFailure = options.onFailure;

            this.descEl.textContent = this.currentDescription;
            this.updateCurrency();

            this.renderMethods();
            this.reset();
            this.modal.hidden = false;
            // Use requestAnimationFrame for smooth transition
            requestAnimationFrame(() => {
                this.modal.classList.add('visible');
            });
        },

        close: function () {
            if (!this.modal) return;
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.hidden = true;
                this.modal.querySelectorAll('input, select').forEach(i => i.value = '');
                this.feedbackEl.hidden = true;
            }, 300); // Wait for transition to complete
        }
    };

    // Initialize the gateway when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        window.paymentGateway.init();
    });

})();