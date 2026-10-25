/* ============================================================
   CONSULTATION HUB — Full Modal Controller
   Path: js/consultation-hub.js
   Exposes: open(), close(), openBooking(), closeBooking()
   ------------------------------------------------------------
   v2 — binds its own [data-action] click delegation so the
        buttons in index.html actually open the modal. The
        v3.3.5 app.js fallback returns early when the module is
        loaded (letting the module handle the click natively),
        so the module must bind the trigger itself — same pattern
        Market Hub and Rental Hub already use.
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       Configuration
       ---------------------------------------------------------- */
    const CONFIG = {
        modalId:        'consultationModal',
        gridId:         'consultationGrid',
        emptyId:        'consultationEmpty',
        searchInputId:  'consultationSearchInput',
        tabSelector:    '.consultation-tab',
        bookingModalId: 'consultationBookingModal',
        bookingFormId:  'consultationBookingForm'
    };

    /* ----------------------------------------------------------
       Consultant catalogue
       ---------------------------------------------------------- */
    const CONSULTANTS = [
        {
            id: 'health',
            icon: '❤️',
            title: 'Health',
            categories: 'Medical · Mental Health · Nutrition · Fitness',
            price: 'From $15',
            rating: '⭐ 4.8',
            keywords: 'health medical mental nutrition fitness wellness doctor'
        },
        {
            id: 'education',
            icon: '📚',
            title: 'Education',
            categories: 'Tutoring · Test Prep · Academic Advising · Career Skills',
            price: 'From $8',
            rating: '⭐ 4.9',
            keywords: 'education tutoring test prep academic career skills school university'
        },
        {
            id: 'business',
            icon: '💼',
            title: 'Business',
            categories: 'Business · Finance · Marketing · HR',
            price: 'From $20',
            rating: '⭐ 4.7',
            keywords: 'business finance marketing hr human resources strategy'
        },
        {
            id: 'legal',
            icon: '⚖️',
            title: 'Legal',
            categories: 'Legal Advice · Tax · Accounting',
            price: 'From $25',
            rating: '⭐ 4.8',
            keywords: 'legal law tax accounting compliance contracts'
        },
        {
            id: 'tech',
            icon: '💻',
            title: 'Tech',
            categories: 'IT Support · Coding · Cybersecurity · Data',
            price: 'From $12',
            rating: '⭐ 4.9',
            keywords: 'tech it support coding programming cybersecurity data'
        },
        {
            id: 'agriculture',
            icon: '🌾',
            title: 'Agriculture',
            categories: 'Crop Consulting · Livestock · Farm Management · AgriBusiness',
            price: 'From $8',
            rating: '⭐ 4.8',
            keywords: 'agriculture crop livestock farm agribusiness farming'
        },
        {
            id: 'personal',
            icon: '🧘',
            title: 'Personal',
            categories: 'Wellness · Lifestyle · Coaching · Dating',
            price: 'From $8',
            rating: '⭐ 4.7',
            keywords: 'personal wellness lifestyle coaching dating life'
        }
    ];

    const PRICES = { '30': 15, '45': 22, '60': 30, '90': 45 };
    const MODE_LABELS = { video: 'Video Call', audio: 'Audio Call', chat: 'Chat' };

    /* ----------------------------------------------------------
       State
       ---------------------------------------------------------- */
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedConsultant = null;

    /* ----------------------------------------------------------
       Helpers
       ---------------------------------------------------------- */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    function toast(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[ConsultationHub]', msg);
    }

    /* ----------------------------------------------------------
       Open / close main modal
       ---------------------------------------------------------- */
    function open() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) {
            console.warn('[ConsultationHub] #' + CONFIG.modalId + ' not found in DOM');
            toast('⚠️ Consultation Hub modal missing');
            return;
        }
        renderCounts();
        renderGrid();
        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
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

    /* ----------------------------------------------------------
       Tab counters
       ---------------------------------------------------------- */
    function renderCounts() {
        const ids = {
            all:         'countAll',
            health:      'countHealth',
            education:   'countEducation',
            business:    'countBusiness',
            legal:       'countLegal',
            tech:        'countTech',
            agriculture: 'countAgriculture',
            personal:    'countPersonal'
        };
        Object.entries(ids).forEach(([cat, id]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = cat === 'all'
                ? CONSULTANTS.length
                : CONSULTANTS.filter(c => c.id === cat).length;
        });
    }

    /* ----------------------------------------------------------
       Grid of consultant cards
       ---------------------------------------------------------- */
    function renderGrid() {
        const grid  = $('#' + CONFIG.gridId);
        const empty = $('#' + CONFIG.emptyId);
        if (!grid) return;

        const q = searchQuery.toLowerCase().trim();
        const filtered = CONSULTANTS.filter(c => {
            if (activeCategory !== 'all' && c.id !== activeCategory) return false;
            if (q) {
                const hay = `${c.title} ${c.categories} ${c.keywords}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        grid.innerHTML = '';

        if (filtered.length === 0) {
            if (empty) empty.classList.add('show');
            return;
        }
        if (empty) empty.classList.remove('show');

        filtered.forEach(c => {
            const card = document.createElement('div');
            card.className = 'consultation-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
                <div class="consultation-card-icon">${c.icon}</div>
                <h3>${c.title}</h3>
                <p class="consultation-card-categories">${c.categories}</p>
                <div class="consultation-card-meta">
                    <span class="consultation-card-price">${c.price}</span>
                    <span class="consultation-card-rating">${c.rating}</span>
                </div>
            `;

            const select = () => {
                selectedConsultant = c;
                openBooking(c);
            };
            card.addEventListener('click', select);
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                }
            });

            grid.appendChild(card);
        });
    }

    /* ----------------------------------------------------------
       Booking modal
       ---------------------------------------------------------- */
    function openBooking(consultant) {
        const modal = $('#' + CONFIG.bookingModalId);
        if (!modal) {
            console.warn('[ConsultationHub] #' + CONFIG.bookingModalId + ' not found');
            toast('⚠️ Booking modal missing');
            return;
        }

        const preview = $('#bookingConsultantPreview');
        if (consultant) {
            selectedConsultant = consultant;
            if (preview) {
                preview.removeAttribute('hidden');
                const av = $('#bookingConsultantAvatar');
                const nm = $('#bookingConsultantName');
                const sp = $('#bookingConsultantSpec');
                if (av) av.textContent = consultant.icon;
                if (nm) nm.textContent = consultant.title + ' Consultant';
                if (sp) sp.textContent = consultant.categories;
            }
            const catSel = $('#bookingCategory');
            if (catSel && consultant.id) catSel.value = consultant.id;
        } else if (preview) {
            preview.setAttribute('hidden', '');
        }

        const d = $('#bookingDate');
        const t = $('#bookingTime');
        if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
        if (t && !t.value) {
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0);
            t.value = now.toTimeString().slice(0, 5);
        }

        updateBookingSummary();

        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function closeBooking() {
        const modal = $('#' + CONFIG.bookingModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
            const st = $('#consultationBookingStatus');
            if (st) st.setAttribute('hidden', '');
        }, 200);
    }

    function updateBookingSummary() {
        const dur  = $('#bookingDuration')?.value || '45';
        const mode = $('#bookingMode')?.value || 'video';
        const price = PRICES[dur] || 22;
        const s1 = $('#summarySession');
        const s2 = $('#summaryMode');
        const s3 = $('#summaryTotal');
        if (s1) s1.textContent = dur + ' minutes';
        if (s2) s2.textContent = MODE_LABELS[mode] || mode;
        if (s3) s3.textContent = '$' + price.toFixed(2);
    }

    function submitBooking(e) {
        e.preventDefault();
        const statusEl = $('#consultationBookingStatus');
        const required = [
            'bookingCategory',
            'bookingTopic',
            'bookingDate',
            'bookingTime',
            'bookingName',
            'bookingContact'
        ];
        for (const id of required) {
            const el = $('#' + id);
            if (!el || !el.value.trim()) {
                showStatus(statusEl, '❌ Please fill all required fields.', 'error');
                return;
            }
        }
        showStatus(statusEl, '✅ Booking confirmed! We\'ll email you the meeting link shortly.', 'success');
        setTimeout(() => {
            closeBooking();
            $('#consultationBookingForm')?.reset();
            updateBookingSummary();
            const st = $('#consultationBookingStatus');
            if (st) st.setAttribute('hidden', '');
        }, 2200);
    }

    function showStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'consultation-booking-status ' + type;
        el.hidden = false;
        el.removeAttribute('hidden');
    }

    /* ----------------------------------------------------------
       Event bindings
       ---------------------------------------------------------- */
    function bindEvents() {
        /* ----------------------------------------------------
           [data-action] delegation — this is what makes the
           buttons in index.html actually open the hub.

           The v3.3.5 app.js MODULE_FALLBACKS block returns
           early when window.ConsultationHub exists (letting the
           module handle the click natively). Same pattern as
           Market Hub and Rental Hub. Without this block, the
           fallback does nothing AND the module does nothing,
           so the click goes dead.
           ---------------------------------------------------- */
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;

            switch (el.dataset.action) {
                case 'openConsultationHub':
                    e.preventDefault();
                    open();
                    break;
                case 'closeConsultation':
                    e.preventDefault();
                    close();
                    break;
                case 'openConsultationBooking':
                    e.preventDefault();
                    openBooking(selectedConsultant);
                    break;
                case 'closeConsultationBooking':
                    e.preventDefault();
                    closeBooking();
                    break;
                default:
                    break;
            }
        });

        // Tabs
        $$(CONFIG.tabSelector).forEach(tab => {
            tab.addEventListener('click', () => {
                $$(CONFIG.tabSelector).forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                activeCategory = tab.dataset.consultTab;
                renderGrid();
            });
        });

        // Search
        const search = $('#' + CONFIG.searchInputId);
        if (search) {
            search.addEventListener('input', e => {
                searchQuery = e.target.value;
                renderGrid();
            });
        }

        // Booking form
        const bForm = $('#consultationBookingForm');
        if (bForm) bForm.addEventListener('submit', submitBooking);

        const bDur = $('#bookingDuration');
        if (bDur) bDur.addEventListener('change', updateBookingSummary);

        const bMode = $('#bookingMode');
        if (bMode) bMode.addEventListener('change', updateBookingSummary);

        // Backdrop click
        const mainModal = $('#' + CONFIG.modalId);
        if (mainModal) {
            mainModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.modalId) close();
            });
        }

        const bookingModal = $('#' + CONFIG.bookingModalId);
        if (bookingModal) {
            bookingModal.addEventListener('click', e => {
                if (e.target.id === CONFIG.bookingModalId) closeBooking();
            });
        }

        // ESC key
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if ($('#' + CONFIG.bookingModalId)?.classList.contains('active')) {
                closeBooking();
                return;
            }
            if ($('#' + CONFIG.modalId)?.classList.contains('active')) {
                close();
            }
        });
    }

    /* ----------------------------------------------------------
       Public API
       ---------------------------------------------------------- */
    window.ConsultationHub = {
        open,
        close,
        openBooking,
        closeBooking,

        setCategory(id) {
            activeCategory = id;
            $$(CONFIG.tabSelector).forEach(t =>
                t.classList.toggle('active', t.dataset.consultTab === id)
            );
            renderGrid();
        },

        setSearch(q) {
            searchQuery = q;
            const inp = $('#' + CONFIG.searchInputId);
            if (inp) inp.value = q;
            renderGrid();
        },

        init() {
            bindEvents();
            renderCounts();
            renderGrid();
        }
    };

    /* ----------------------------------------------------------
       Auto-init
       ---------------------------------------------------------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.ConsultationHub.init());
    } else {
        window.ConsultationHub.init();
    }

})();