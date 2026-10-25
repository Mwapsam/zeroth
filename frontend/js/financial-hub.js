/* ============================================================
   FINANCIAL SERVICE HUB — Extended controller
   Path: js/financial-hub.js
   Exposes: open(), close(), openSelfie(), openVideoCall(),
            calculate(), selectService(), renderInstitutions()
   ------------------------------------------------------------
   v2 — handles its own [data-action="openFinancialHub"] click.
        app.js's v3.3.5 MODULE_FALLBACKS returns early when
        window.FinancialHub exists (letting the module handle the
        click natively), so the module must bind the trigger
        itself — same pattern Market Hub, Rental Hub, and
        Consultation Hub already use. Previously only
        closeFinancialHub was handled, so the "Financial Hub"
        buttons in the sidebar, services grid, footer menu, and
        AI chatbot all did nothing.
   ============================================================ */

(function () {
    'use strict';

    const CONFIG = {
        modalId:       'financialModal',
        selfieModalId: 'finCameraModal',
        videoCallId:   'finVideoCallModal',
        formId:        'finLoanForm',
        searchInputId: 'finSearchInput',
        aboutPanelId:  'finAboutPanel'
    };

    /* ==========================================================
       SERVICE CATALOGUE — descriptions, rates, eligibility
       ========================================================== */
    const SERVICE_INFO = {
        savings: {
            title: 'Savings Account',
            desc: 'Grow your money with a high-yield savings account. No monthly fees, no minimum balance, and instant access to your funds via mobile money or bank transfer.',
            rate: '10% p.a.',
            term: 'Open-ended',
            min: 'ZMW 50',
            max: 'No limit',
            eligibility: 'Any Zambian resident aged 18+ with a valid NRC or passport.'
        },
        'salary-advance': {
            title: 'Salary Advance',
            desc: 'Get up to 70% of your net monthly salary in advance, repaid on your next payday. Ideal for bridging short-term cash flow gaps without long-term commitment.',
            rate: '12% flat (per cycle)',
            term: 'Up to 30 days',
            min: 'ZMW 500',
            max: '70% of net salary',
            eligibility: 'Employed with a confirmed payroll account and 3 months of bank statements.'
        },
        vehicle: {
            title: 'Vehicle Financing',
            desc: 'Finance a new or used car, truck, or motorcycle with flexible repayment terms. We cover up to 80% of the vehicle value.',
            rate: '5.8% p.a. (reducing balance)',
            term: '12 – 60 months',
            min: 'ZMW 20,000',
            max: 'ZMW 500,000',
            eligibility: 'Salaried or business owner with proof of income. Vehicle serves as collateral.'
        },
        'food-wallet': {
            title: 'Food Wallet Loans',
            desc: 'A short-term credit line loaded onto your ZBS food wallet. Use it at partner grocery shops and marketplaces to buy foodstuff, then repay within 30 days.',
            rate: '2% per cycle',
            term: 'Up to 30 days',
            min: 'ZMW 100',
            max: 'ZMW 2,500',
            eligibility: 'Active ZBS wallet user with a savings account balance ≥ ZMW 100.'
        },
        group: {
            title: 'Group Loans (Chama)',
            desc: 'Borrow as a group — chama, cooperative or village bank. Members share the loan and guarantee each other, unlocking lower rates and higher limits.',
            rate: 'From 4% p.m.',
            term: '6 – 24 months',
            min: 'ZMW 5,000',
            max: 'ZMW 100,000 per group',
            eligibility: 'Registered or unregistered group of 5 – 30 members with a group bank account.'
        },
        emergency: {
            title: 'Emergency Loans',
            desc: 'Fast, same-day cash for medical bills, funeral costs, or urgent repairs. Approval within 2 hours, funds disbursed to your mobile wallet.',
            rate: '15% flat',
            term: 'Up to 14 days',
            min: 'ZMW 200',
            max: 'ZMW 5,000',
            eligibility: 'Verified ZBS customer with a savings history of at least 30 days.'
        },
        mortgage: {
            title: 'Mortgage Loans',
            desc: 'Finance your first home, buy land, or refinance an existing mortgage. Fixed or variable interest rates, up to 30-year repayment.',
            rate: '4.2% p.a.',
            term: '5 – 30 years',
            min: 'ZMW 100,000',
            max: 'ZMW 5,000,000',
            eligibility: 'Two years of stable income, 20% deposit, property as collateral.'
        },
        investment: {
            title: 'Investment Advisory',
            desc: 'Portfolio management for retail and institutional clients. We help you invest in equities, ETF trading, bonds, and agribusiness ventures.',
            rate: '6.1% p.a. (target return)',
            term: '12+ months',
            min: 'ZMW 1,000',
            max: 'No limit',
            eligibility: 'ZBS account holder who has completed our risk profile assessment.'
        },
        'credit-card': {
            title: 'Credit Cards',
            desc: 'Rewards credit cards with low APR, no annual fee for the first year, and cashback on grocery, fuel and travel purchases.',
            rate: '7.5% – 12% APR',
            term: 'Rolling 30 days',
            min: 'ZMW 500 limit',
            max: 'ZMW 50,000 limit',
            eligibility: 'Monthly income of at least ZMW 4,000, credit history check.'
        }
    };

    /* ==========================================================
       SERVICE → LOAN RATE map (for calculator)
       ========================================================== */
    const RATES = {
        personal: 0.075,
        mortgage: 0.042,
        auto:     0.058,
        student:  0.061
    };

    const SERVICE_TO_LOAN = {
        savings:         'personal',
        'salary-advance':'personal',
        vehicle:         'auto',
        'food-wallet':   'personal',
        group:           'personal',
        emergency:       'personal',
        mortgage:        'mortgage',
        investment:      'student',
        'credit-card':   'personal'
    };

    const SERVICE_LABELS = {
        personal: 'Personal',
        mortgage: 'Mortgage',
        auto:     'Auto',
        student:  'Student'
    };

    /* ==========================================================
       INSTITUTIONS DIRECTORY — real Zambian providers
       ========================================================== */
    const INSTITUTIONS = [
        {
            name: 'Zanaco Bank',
            type: 'bank',
            typeLabel: 'Commercial Bank',
            icon: 'fas fa-university',
            services: ['Savings', 'Current Account', 'Personal Loans', 'Mortgages', 'Business Loans'],
            savingsRate: '6% – 9% p.a.',
            loanRate: '18% – 28% p.a.',
            contact: '+260 211 226 700',
            email: 'info@zanaco.co.zm'
        },
        {
            name: 'Absa Bank Zambia',
            type: 'bank',
            typeLabel: 'Commercial Bank',
            icon: 'fas fa-landmark',
            services: ['Savings', 'Vehicle Finance', 'Mortgages', 'Credit Cards', 'Investments'],
            savingsRate: '5% – 8% p.a.',
            loanRate: '17% – 30% p.a.',
            contact: '+260 211 366 100',
            email: 'info@absa.co.zm'
        },
        {
            name: 'Stanbic Bank Zambia',
            type: 'bank',
            typeLabel: 'Commercial Bank',
            icon: 'fas fa-building-columns',
            services: ['Savings', 'Salary Advance', 'Personal Loans', 'Business Banking', 'Investment'],
            savingsRate: '6% – 10% p.a.',
            loanRate: '19% – 32% p.a.',
            contact: '+260 211 229 400',
            email: 'info@stanbic.com.zm'
        },
        {
            name: 'Zambia National Building Society',
            type: 'bank',
            typeLabel: 'Building Society',
            icon: 'fas fa-home',
            services: ['Mortgages', 'Home Improvement Loans', 'Savings', 'Fixed Deposits'],
            savingsRate: '7% – 11% p.a.',
            loanRate: '22% – 26% p.a.',
            contact: '+260 211 229 731',
            email: 'customercare@znbs.co.zm'
        },
        {
            name: 'Bayport Financial Services',
            type: 'mfi',
            typeLabel: 'Microfinance',
            icon: 'fas fa-hand-holding-usd',
            services: ['Salary Advance', 'Personal Loans', 'Group Loans', 'Emergency Loans'],
            savingsRate: '—',
            loanRate: '36% – 60% p.a.',
            contact: '+260 211 367 500',
            email: 'info@bayport.co.zm'
        },
        {
            name: 'Microfinance Zambia (MFZ)',
            type: 'mfi',
            typeLabel: 'Microfinance',
            icon: 'fas fa-coins',
            services: ['Group Loans', 'Food Wallet', 'Emergency Loans', 'Agricultural Loans'],
            savingsRate: '—',
            loanRate: '30% – 48% p.a.',
            contact: '+260 211 250 500',
            email: 'info@mfzambia.co.zm'
        },
        {
            name: 'FINCA Zambia',
            type: 'mfi',
            typeLabel: 'Microfinance',
            icon: 'fas fa-piggy-bank',
            services: ['Group Loans', 'Savings', 'Business Loans', 'Agricultural Finance'],
            savingsRate: '4% – 7% p.a.',
            loanRate: '24% – 42% p.a.',
            contact: '+260 211 367 100',
            email: 'info@finca.co.zm'
        },
        {
            name: 'Zambia National Association of Savings & Credit Unions',
            type: 'sacco',
            typeLabel: 'SACCO',
            icon: 'fas fa-users',
            services: ['Savings', 'Group Loans', 'Emergency Loans', 'Payroll Loans'],
            savingsRate: '8% – 12% p.a.',
            loanRate: '12% – 24% p.a.',
            contact: '+260 211 235 100',
            email: 'info@zansaccu.co.zm'
        },
        {
            name: 'Airtel Money Zambia',
            type: 'mobile',
            typeLabel: 'Mobile Money',
            icon: 'fas fa-mobile-alt',
            services: ['Wallet', 'Salary Advance', 'Food Wallet', 'Bill Payment', 'Savings (Airtel Money Save)'],
            savingsRate: '3% – 5% p.a.',
            loanRate: 'Daily fee-based',
            contact: '111',
            email: 'care@airtel.co.zm'
        },
        {
            name: 'MTN Mobile Money Zambia',
            type: 'mobile',
            typeLabel: 'Mobile Money',
            icon: 'fas fa-mobile-screen',
            services: ['Wallet', 'Savings (MoKash)', 'Group Loans (MoKash)', 'Bill Payment'],
            savingsRate: '4% – 6% p.a.',
            loanRate: 'From 5% per 30 days',
            contact: '111',
            email: 'support@mtn.co.zm'
        },
        {
            name: 'Zamtel Kwacha',
            type: 'mobile',
            typeLabel: 'Mobile Money',
            icon: 'fas fa-phone',
            services: ['Wallet', 'Savings', 'Airtime Advance', 'Bill Payment'],
            savingsRate: '2% – 4% p.a.',
            loanRate: 'Fee-based',
            contact: '111',
            email: 'support@zamtel.co.zm'
        },
        {
            name: 'Zambia State Insurance Corporation',
            type: 'insurance',
            typeLabel: 'Insurance',
            icon: 'fas fa-shield-alt',
            services: ['Life Insurance', 'Health Insurance', 'Property Insurance', 'Investment-linked Policies'],
            savingsRate: '4% – 6% p.a. (endowment)',
            loanRate: 'Policy loans at 8% p.a.',
            contact: '+260 211 229 529',
            email: 'info@zsic.co.zm'
        },
        {
            name: 'Madison General Insurance',
            type: 'insurance',
            typeLabel: 'Insurance',
            icon: 'fas fa-umbrella',
            services: ['Motor Insurance', 'Life Insurance', 'Health Insurance', 'Travel Insurance'],
            savingsRate: '—',
            loanRate: 'Premium financing available',
            contact: '+260 211 254 411',
            email: 'info@madison.co.zm'
        }
    ];

    /* ==========================================================
       STATE
       ========================================================== */
    const state = {
        selfieStream: null,
        facingMode: 'user',
        videoStream: null,
        micOn: true,
        camOn: true,
        currentInstitutionFilter: 'all'
    };

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    function toast(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[FinancialHub]', msg);
    }

    /* ==========================================================
       OPEN / CLOSE MAIN MODAL
       ========================================================== */
    function open() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) {
            console.warn('[FinancialHub] #' + CONFIG.modalId + ' not found');
            toast('⚠️ Financial Hub modal missing');
            return;
        }
        renderInstitutions();
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        calculate();
    }

    function close() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }

    /* ==========================================================
       CALCULATOR
       ========================================================== */
    function calculate() {
        const type   = $('#finLoanType')?.value || 'personal';
        const amount = parseFloat($('#finLoanAmount')?.value) || 0;
        const years  = parseInt($('#finLoanTerm')?.value) || 1;
        const rate   = RATES[type] || 0.075;

        const monthlyRate = rate / 12;
        const payments = years * 12;
        let monthly = 0;

        if (monthlyRate > 0 && payments > 0) {
            monthly = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -payments));
        } else if (payments > 0) {
            monthly = amount / payments;
        }

        const el = $('#finMonthlyPayment');
        if (el) el.textContent = '$' + monthly.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const badge = $('#finActiveLoanType');
        if (badge) badge.textContent = SERVICE_LABELS[type] || 'Personal';
    }

    /* ==========================================================
       SERVICE SELECTION + ABOUT PANEL
       ========================================================== */
    function selectService(slug) {
        // Highlight selected card
        $$('.financial-service-item').forEach(item => {
            item.classList.toggle('active', item.dataset.service === slug);
        });

        // Update loan badge + calculator
        const loanType = SERVICE_TO_LOAN[slug] || 'personal';
        const sel = $('#finLoanType');
        if (sel) sel.value = loanType;
        calculate();

        // Render about panel
        renderAbout(slug);

        // Re-render institutions with this service as filter hint
        toast(`📌 ${SERVICE_INFO[slug]?.title || slug} selected`);
    }

    function renderAbout(slug) {
        const info = SERVICE_INFO[slug];
        const panel = $('#' + CONFIG.aboutPanelId);
        const title = $('#finAboutTitle');
        const body  = $('#finAboutBody');
        if (!panel || !body) return;

        if (!info) {
            panel.classList.remove('active');
            if (title) title.textContent = 'Select a service to learn more';
            body.innerHTML = `<p class="fin-about-hint">Click any service above to see its description, eligibility, rates and term.</p>`;
            return;
        }

        panel.classList.add('active');
        if (title) title.textContent = info.title;

        body.innerHTML = `
            <p class="fin-about-desc">${info.desc}</p>

            <div class="fin-about-grid">
                <div class="fin-about-item">
                    <span class="fin-about-item-label">Interest Rate</span>
                    <span class="fin-about-item-value">${info.rate}</span>
                </div>
                <div class="fin-about-item">
                    <span class="fin-about-item-label">Term</span>
                    <span class="fin-about-item-value">${info.term}</span>
                </div>
                <div class="fin-about-item">
                    <span class="fin-about-item-label">Minimum</span>
                    <span class="fin-about-item-value">${info.min}</span>
                </div>
                <div class="fin-about-item">
                    <span class="fin-about-item-label">Maximum</span>
                    <span class="fin-about-item-value">${info.max}</span>
                </div>
            </div>

            <p class="fin-about-eligibility">
                <strong>Eligibility:</strong> ${info.eligibility}
            </p>
        `;
    }

    /* ==========================================================
       INSTITUTIONS DIRECTORY
       ========================================================== */
    function renderInstitutions(filter) {
        const grid  = $('#finInstitutionsGrid');
        const empty = $('#finInstitutionsEmpty');
        if (!grid) return;

        const f = filter || state.currentInstitutionFilter || 'all';
        state.currentInstitutionFilter = f;

        const list = f === 'all'
            ? INSTITUTIONS
            : INSTITUTIONS.filter(i => i.type === f);

        if (list.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.classList.add('show');
            return;
        }
        if (empty) empty.classList.remove('show');

        grid.innerHTML = list.map(inst => `
            <div class="fin-inst-card">
                <div class="fin-inst-card-header">
                    <div class="fin-inst-logo"><i class="${inst.icon}"></i></div>
                    <div class="fin-inst-info">
                        <h4 class="fin-inst-name">${escapeHtml(inst.name)}</h4>
                        <span class="fin-inst-type">${escapeHtml(inst.typeLabel)}</span>
                    </div>
                </div>

                <div class="fin-inst-services">
                    ${inst.services.map(s => `<span class="fin-inst-service-tag">${escapeHtml(s)}</span>`).join('')}
                </div>

                <div class="fin-inst-meta">
                    <div class="fin-inst-meta-item">
                        <span class="fin-inst-meta-label">Savings Rate</span>
                        <span class="fin-inst-meta-value">${escapeHtml(inst.savingsRate)}</span>
                    </div>
                    <div class="fin-inst-meta-item">
                        <span class="fin-inst-meta-label">Loan Rate</span>
                        <span class="fin-inst-meta-value">${escapeHtml(inst.loanRate)}</span>
                    </div>
                </div>

                <div class="fin-inst-contact">
                    <span><i class="fas fa-phone"></i>${escapeHtml(inst.contact)}</span>
                    <span><i class="fas fa-envelope"></i>${escapeHtml(inst.email)}</span>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ==========================================================
       TABS
       ========================================================== */
    function switchTab(tab) {
        $$('.financial-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.finTab === tab);
            t.setAttribute('aria-selected', t.dataset.finTab === tab ? 'true' : 'false');
        });
        $$('.financial-panel').forEach(p => {
            p.classList.toggle('active', p.dataset.panel === tab);
            if (p.dataset.panel === tab) p.removeAttribute('hidden');
            else p.setAttribute('hidden', '');
        });
    }

    /* ==========================================================
       VOICE SEARCH
       ========================================================== */
    function startVoiceSearch() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            toast('❌ Voice search not supported in this browser');
            return;
        }
        const rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        toast('🎤 Listening...');
        rec.start();
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript;
            const input = $('#' + CONFIG.searchInputId);
            if (input) input.value = text;
            toast(`🎤 Heard: "${text}"`);
        };
        rec.onerror = (e) => toast('❌ ' + e.error);
    }

    /* ==========================================================
       SELFIE CAMERA
       ========================================================== */
    async function openSelfie() {
        const modal = $('#' + CONFIG.selfieModalId);
        if (!modal) return;
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        try {
            state.selfieStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: state.facingMode }, audio: false
            });
            const video = $('#finVideo');
            if (video) video.srcObject = state.selfieStream;
        } catch (err) {
            toast('❌ Camera access denied: ' + err.message);
            closeSelfie();
        }
    }
    function closeSelfie() {
        if (state.selfieStream) { state.selfieStream.getTracks().forEach(t => t.stop()); state.selfieStream = null; }
        const modal = $('#' + CONFIG.selfieModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
    }
    function switchCamera() {
        state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
        if (state.selfieStream) state.selfieStream.getTracks().forEach(t => t.stop());
        openSelfie();
    }
    function captureSelfie() {
        const video = $('#finVideo');
        const canvas = $('#finCanvas');
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const container = $('#finSelfieContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;">
                    <img src="${dataUrl}" alt="Selfie" style="max-width:100%;border-radius:10px;border:2px solid #16a34a;" />
                    <p style="margin-top:8px;color:#16a34a;font-weight:700;font-size:0.85rem;">✅ Selfie captured</p>
                    <button type="button" class="financial-btn financial-btn-sm" data-action="finOpenSelfie" style="margin-top:8px;">
                        <i class="fas fa-redo"></i> Retake
                    </button>
                </div>
            `;
        }
        toast('✅ Selfie captured');
        closeSelfie();
    }

    /* ==========================================================
       VIDEO CALL
       ========================================================== */
    async function openVideoCall() {
        const modal = $('#' + CONFIG.videoCallId);
        if (!modal) return;
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        try {
            state.videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: state.facingMode }, audio: true
            });
            const video = $('#finCallVideo');
            if (video) video.srcObject = state.videoStream;
        } catch (err) {
            toast('❌ Camera/mic access denied: ' + err.message);
        }
    }
    function closeVideoCall() {
        if (state.videoStream) { state.videoStream.getTracks().forEach(t => t.stop()); state.videoStream = null; }
        const modal = $('#' + CONFIG.videoCallId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; modal.setAttribute('hidden', ''); }, 200);
    }
    function toggleMic() {
        if (!state.videoStream) return;
        state.micOn = !state.micOn;
        state.videoStream.getAudioTracks().forEach(t => t.enabled = state.micOn);
        const btn = $('[data-action="finToggleMic"]');
        if (btn) btn.innerHTML = state.micOn ? '<i class="fas fa-microphone"></i> Mute' : '<i class="fas fa-microphone-slash"></i> Unmute';
    }
    function toggleCam() {
        if (!state.videoStream) return;
        state.camOn = !state.camOn;
        state.videoStream.getVideoTracks().forEach(t => t.enabled = state.camOn);
        const btn = $('[data-action="finToggleCam"]');
        if (btn) btn.innerHTML = state.camOn ? '<i class="fas fa-video"></i> Camera' : '<i class="fas fa-video-slash"></i> Camera';
    }
    function switchCallCamera() {
        state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
        closeVideoCall();
        setTimeout(openVideoCall, 300);
    }
    function sendChat() {
        const input = $('#finChatInput');
        const text = input?.value.trim();
        if (!text) return;
        const list = $('#finChatMessages');
        if (list) {
            const now = new Date();
            const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            const div = document.createElement('div');
            div.className = 'fin-msg fin-self';
            div.innerHTML = `${text} <span class="fin-msg-time">${time}</span>`;
            list.appendChild(div);
            list.scrollTop = list.scrollHeight;
        }
        if (input) input.value = '';
        setTimeout(() => {
            const list2 = $('#finChatMessages');
            if (!list2) return;
            const now = new Date();
            const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            const div = document.createElement('div');
            div.className = 'fin-msg';
            div.innerHTML = `Thank you. An agent will respond shortly. <span class="fin-msg-time">${time}</span>`;
            list2.appendChild(div);
            list2.scrollTop = list2.scrollHeight;
        }, 900);
    }

    /* ==========================================================
       FORM SUBMIT
       ========================================================== */
    function submitForm(e) {
        e.preventDefault();
        toast('✅ Loan application submitted. We will contact you soon.');
        setTimeout(() => {
            close();
            $('#' + CONFIG.formId)?.reset();
            calculate();
        }, 1500);
    }

    /* ==========================================================
       EVENT BINDINGS
       ========================================================== */
    function bindEvents() {
        // Calculator live update
        ['finLoanType', 'finLoanAmount', 'finLoanTerm'].forEach(id => {
            const el = $('#' + id);
            el?.addEventListener('input', calculate);
            el?.addEventListener('change', calculate);
        });

        // Search — filter services
        const search = $('#' + CONFIG.searchInputId);
        search?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            $$('.financial-service-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = !q || text.includes(q) ? 'flex' : 'none';
            });
        });

        // Form submit
        $('#' + CONFIG.formId)?.addEventListener('submit', submitForm);

        // Tabs
        $$('.financial-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.finTab));
        });

        // Institution filters
        $$('.fin-inst-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.fin-inst-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderInstitutions(btn.dataset.filter);
            });
        });

        // Backdrop closes
        [CONFIG.modalId, CONFIG.selfieModalId, CONFIG.videoCallId].forEach(id => {
            const m = $('#' + id);
            if (m) m.addEventListener('click', (e) => {
                if (e.target.id === id) {
                    if (id === CONFIG.modalId) close();
                    else if (id === CONFIG.selfieModalId) closeSelfie();
                    else if (id === CONFIG.videoCallId) closeVideoCall();
                }
            });
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if ($('#' + CONFIG.videoCallId)?.classList.contains('active'))  { closeVideoCall(); return; }
            if ($('#' + CONFIG.selfieModalId)?.classList.contains('active')) { closeSelfie();    return; }
            if ($('#' + CONFIG.modalId)?.classList.contains('active'))       { close();          return; }
        });

        // Delegated actions
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            switch (action) {
                /* ------------------------------------------------------
                   The two "hub open/close" actions.
                   app.js's v3.3.5 MODULE_FALLBACKS returns early when
                   window.FinancialHub is loaded (letting the module
                   handle the click), so this case MUST exist — that's
                   why the Financial Hub buttons were dead before.
                   ------------------------------------------------------ */
                case 'openFinancialHub':   e.preventDefault(); open();  break;
                case 'closeFinancialHub':  e.preventDefault(); close(); break;

                case 'finSelectService': selectService(el.dataset.service); break;
                case 'finCalculate':      calculate(); break;
                case 'finVoiceSearch':    startVoiceSearch(); break;
                case 'finOpenSelfie':     openSelfie(); break;
                case 'finCloseSelfie':    closeSelfie(); break;
                case 'finCaptureSelfie':  captureSelfie(); break;
                case 'finSwitchCamera':   switchCamera(); break;
                case 'finOpenVideoCall':  openVideoCall(); break;
                case 'finEndCall':        closeVideoCall(); break;
                case 'finToggleMic':      toggleMic(); break;
                case 'finToggleCam':      toggleCam(); break;
                case 'finSwitchCallCamera': switchCallCamera(); break;
                case 'finSendChat':       sendChat(); break;
            }
        });

        // Chat input Enter
        $('#finChatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
        });
    }

    /* ==========================================================
       PUBLIC API
       ========================================================== */
    window.FinancialHub = {
        open,
        close,
        openSelfie,
        closeSelfie,
        openVideoCall,
        closeVideoCall,
        calculate,
        selectService,
        renderInstitutions,
        switchTab,
        submitForm,
        init() {
            bindEvents();
            calculate();
            renderInstitutions();
            console.log('[FinancialHub] Initialized with', INSTITUTIONS.length, 'institutions');
        }
    };

    /* Auto-init */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.FinancialHub.init());
    } else {
        window.FinancialHub.init();
    }

})();