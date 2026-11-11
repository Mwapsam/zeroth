/* ================================================================
   js/bet-hub-extras.js
   Adds a betting-company dropdown, "Add Company" form, and
   localStorage-backed persistence to the Bet & Gaming Hub.

   - Does NOT modify bet-hub.js.
   - Merges into any existing companies that bet-hub.js exposes.
   - Exposes:  window.BetHubCompanies.add(list), .remove(id), .list()
   ================================================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'zbs_bet_companies_v1';
    const MAX_COMPANIES = 100;

    /* ---------- Storage ---------- */
    function loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_) { return []; }
    }

    function saveAll(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_COMPANIES)));
        } catch (_) {}
    }

    function uid(prefix) {
        return (prefix || 'co_') + Date.now().toString(36) + '_' +
               Math.random().toString(36).slice(2, 6);
    }

    /* ---------- Public helper (used by other modules) ---------- */
    window.BetHubCompanies = {
        list: loadAll,

        add: function (company) {
            if (!company || !company.name) {
                console.warn('[bet-hub-extras] company.name required');
                return null;
            }
            const list = loadAll();
            const entry = {
                id: company.id || uid('co_'),
                name: String(company.name).trim(),
                icon: company.icon || '🎯',
                logo: company.logo || '',
                tagline: company.tagline || '',
                events: Array.isArray(company.events) ? company.events : [],
                createdAt: Date.now()
            };
            list.push(entry);
            saveAll(list);
            return entry;
        },

        remove: function (id) {
            const list = loadAll().filter(c => c.id !== id);
            saveAll(list);
        },

        update: function (id, patch) {
            const list = loadAll();
            const i = list.findIndex(c => c.id === id);
            if (i === -1) return null;
            list[i] = { ...list[i], ...patch, id };
            saveAll(list);
            return list[i];
        },

        clear: function () { saveAll([]); },

        /**
         * Merge our local list with whatever bet-hub.js already
         * renders (if it exposes anything). Called by our renderer.
         */
        merged: function () {
            const ours = loadAll();
            const theirs = (window.__betCompanyEvents || []);
            /* De-dupe by name */
            const seen = new Set(ours.map(c => c.name.toLowerCase()));
            const extra = theirs.filter(c => !seen.has(String(c.name || '').toLowerCase()));
            return ours.concat(extra);
        }
    };

    /* ---------- Dropdown rendering ---------- */
    const dropdown = () => document.getElementById('betCompanySelect');
    const listEl   = () => document.getElementById('betCompanyEventsList');
    const emptyEl  = () => document.getElementById('betCompanyEmpty');

    function rebuildDropdown(selectedId) {
        const sel = dropdown();
        if (!sel) return;

        const merged = window.BetHubCompanies.merged();
        const prev = selectedId || sel.value || 'all';

        sel.innerHTML = '<option value="all">🏢 All Companies</option>' +
            merged.map(c => `
                <option value="${escapeHtml(c.id)}">
                    ${escapeHtml(c.icon || '🎯')} ${escapeHtml(c.name)}
                </option>
            `).join('');

        /* Restore previous selection if still available */
        if ([...sel.options].some(o => o.value === prev)) {
            sel.value = prev;
        } else {
            sel.value = 'all';
        }

        /* Show/hide empty state */
        const empty = emptyEl();
        if (empty) empty.hidden = merged.length > 0;
    }

    /* ---------- Event rendering (filtered by dropdown) ---------- */
    function renderEvents() {
        const sel   = dropdown();
        const list  = listEl();
        const empty = emptyEl();
        if (!list) return;

        const merged = window.BetHubCompanies.merged();
        const filterId = sel ? sel.value : 'all';

        if (!merged.length) {
            list.innerHTML = '';
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        const chosen = filterId === 'all'
            ? merged
            : merged.filter(c => c.id === filterId);

        list.innerHTML = chosen.map(company => {
            const events = Array.isArray(company.events) && company.events.length
                ? company.events
                : [{
                    id: uid('evt_'),
                    icon: '⚽',
                    name: 'Featured Match',
                    meta: 'Add events from the Manage panel',
                    outcomes: [
                        { label: 'Home Win', odds: 1.90 },
                        { label: 'Draw',     odds: 3.20 },
                        { label: 'Away Win', odds: 2.10 }
                    ]
                }];

            const logoHtml = company.logo
                ? `<img src="${escapeHtml(company.logo)}" alt=""
                        style="width:36px;height:36px;border-radius:8px;object-fit:contain;background:#f8fafc;"
                        onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'${escapeHtml(company.icon || '🎯')}',style:'width:36px;height:36px;display:grid;place-items:center;font-size:22px;background:#f1f5f9;border-radius:8px;'}))" />`
                : `<div style="width:36px;height:36px;display:grid;place-items:center;font-size:22px;background:#f1f5f9;border-radius:8px;">${escapeHtml(company.icon || '🎯')}</div>`;

            return `
                <div class="bet-company-block" data-company-id="${escapeHtml(company.id)}">
                    <div class="bet-company-block-head">
                        ${logoHtml}
                        <div class="bet-company-block-info">
                            <strong class="bet-company-block-name">${escapeHtml(company.name)}</strong>
                            ${company.tagline
                                ? `<small class="bet-company-block-tagline">${escapeHtml(company.tagline)}</small>`
                                : ''}
                        </div>
                        <button type="button"
                                class="bet-company-remove-btn"
                                data-action="removeBettingCompany"
                                data-company-id="${escapeHtml(company.id)}"
                                title="Remove company">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>

                    <div class="bet-company-events">
                        ${events.map(evt => `
                            <div class="bet-event-card" data-event-id="${escapeHtml(evt.id || '')}">
                                <div class="bet-event-icon">${escapeHtml(evt.icon || '⚽')}</div>
                                <div class="bet-event-info">
                                    <span class="bet-event-name">${escapeHtml(evt.name || 'Event')}</span>
                                    <span class="bet-event-meta">${escapeHtml(evt.meta || '')}</span>
                                </div>
                                <div class="bet-company-outcomes">
                                    ${(evt.outcomes || []).map(o => `
                                        <button type="button"
                                                class="bet-company-outcome-btn"
                                                data-action="betCompanyPickOutcome"
                                                data-company-id="${escapeHtml(company.id)}"
                                                data-event-id="${escapeHtml(evt.id || '')}"
                                                data-label="${escapeHtml(o.label)}"
                                                data-odds="${escapeHtml(String(o.odds))}">
                                            <span class="bet-outcome-label">${escapeHtml(o.label)}</span>
                                            <span class="bet-outcome-odds">${escapeHtml(String(o.odds))}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------- Escape helper ---------- */
    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ---------- Toast ---------- */
    function toast(msg, kind) {
        if (typeof window.showToast === 'function') return window.showToast(msg);
        /* Inline fallback */
        const box = document.getElementById('betCompanyAddStatus');
        if (box) {
            box.textContent = msg;
            box.className = 'bet-company-addform-status ' + (kind || '');
            box.hidden = false;
            setTimeout(() => { box.hidden = true; }, 2600);
        }
    }

    /* ---------- Add form ---------- */
    function openAddForm() {
        const form = document.getElementById('betCompanyAddForm');
        if (!form) return;
        form.hidden = false;
        document.getElementById('bacName')?.focus();
    }

    function closeAddForm() {
        const form = document.getElementById('betCompanyAddForm');
        if (!form) return;
        form.hidden = true;
        form.reset();
        document.getElementById('bacIcon').value = '🎯';
        document.getElementById('bacHomeOdds').value = '1.90';
        document.getElementById('bacDrawOdds').value = '3.10';
        document.getElementById('bacAwayOdds').value = '2.30';
        const status = document.getElementById('betCompanyAddStatus');
        if (status) { status.hidden = true; status.textContent = ''; }
    }

    function handleAddSubmit(e) {
        e.preventDefault();

        const val = (id) => (document.getElementById(id)?.value || '').trim();

        const name = val('bacName');
        if (!name) {
            showFormStatus('Company name is required', 'error');
            return;
        }
        if (window.BetHubCompanies.merged().some(
                c => String(c.name).toLowerCase() === name.toLowerCase()
            )) {
            showFormStatus(`"${name}" already exists`, 'error');
            return;
        }

        const company = window.BetHubCompanies.add({
            name,
            icon: val('bacIcon') || '🎯',
            logo: val('bacLogo'),
            tagline: val('bacTagline'),
            events: [{
                id: uid('evt_'),
                icon: '⚽',
                name: val('bacEventName') || 'Featured Match',
                meta: val('bacEventMeta'),
                outcomes: [
                    { label: 'Home Win', odds: Number(val('bacHomeOdds')) || 1.90 },
                    { label: 'Draw',     odds: Number(val('bacDrawOdds')) || 3.10 },
                    { label: 'Away Win', odds: Number(val('bacAwayOdds')) || 2.30 }
                ]
            }]
        });

        showFormStatus(`✓ "${company.name}" added`, 'success');
        rebuildDropdown(company.id);
        renderEvents();

        /* Also refresh bet-hub.js's own renderer if it exposes one */
        if (typeof window.BetHub?.render === 'function') window.BetHub.render();

        setTimeout(() => closeAddForm(), 900);
    }

    function showFormStatus(msg, kind) {
        const el = document.getElementById('betCompanyAddStatus');
        if (!el) return;
        el.textContent = msg;
        el.className = 'bet-company-addform-status ' + (kind || '');
        el.hidden = false;
        if (kind === 'success') {
            clearTimeout(showFormStatus._t);
            showFormStatus._t = setTimeout(() => { el.hidden = true; }, 2600);
        }
    }

    /* ---------- Remove a company ---------- */
    function removeCompany(id) {
        if (!id) return;
        const company = window.BetHubCompanies.list().find(c => c.id === id);
        if (!company) {
            toast('Company not found', 'error');
            return;
        }
        if (!confirm(`Remove "${company.name}"?`)) return;
        window.BetHubCompanies.remove(id);
        rebuildDropdown('all');
        renderEvents();
        toast(`Removed "${company.name}"`, 'success');
    }

    /* ---------- Wire everything up ---------- */
    function bind() {
        /* Rebuild dropdown when the modal is opened / company tab clicked */
        const modal = document.getElementById('betModal');
        if (modal) {
            /* Use a MutationObserver to detect when the modal becomes visible */
            const mo = new MutationObserver(() => {
                if (!modal.hidden && modal.classList.contains('active')) {
                    rebuildDropdown();
                    renderEvents();
                }
            });
            mo.observe(modal, { attributes: true, attributeFilter: ['hidden', 'class'] });
        }

        /* Dropdown change → filter events */
        document.getElementById('betCompanySelect')
            ?.addEventListener('change', renderEvents);

        /* Delegated clicks for every action */
        document.addEventListener('click', function (e) {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            switch (action) {
                case 'openAddBettingCompanyForm':
                    e.preventDefault();
                    openAddForm();
                    break;
                case 'closeAddBettingCompanyForm':
                    e.preventDefault();
                    closeAddForm();
                    break;
                case 'removeBettingCompany':
                    e.preventDefault();
                    removeCompany(el.dataset.companyId);
                    break;
                case 'betCompanyPickOutcome':
                    e.preventDefault();
                    handleOutcomePick(el);
                    break;
                case 'openManageBettingCompanies':
                    e.preventDefault();
                    openManagePanel();
                    break;
            }
        });

        /* Add form submit */
        document.getElementById('betCompanyAddForm')
            ?.addEventListener('submit', handleAddSubmit);
    }

    /* ---------- Outcome pick → reuse bet-hub.js's flow if present ---------- */
    function handleOutcomePick(btn) {
        const { companyId, eventId, label, odds } = btn.dataset;

        /* If bet-hub.js already exposes an openBetCompany function, use it */
        if (typeof window.BetHub?.openCompanyBet === 'function') {
            window.BetHub.openCompanyBet({
                companyId, eventId,
                label, odds: Number(odds)
            });
            return;
        }

        /* Otherwise show a simple info toast so the UI feels responsive */
        toast(`${label} @ ${odds} — selected`, 'success');

        /* …or call the payment gateway if you have it wired up */
        if (typeof window.openPaymentGateway === 'function') {
            window.openPaymentGateway({
                amount: 100,
                description: `${label} @ ${odds}`,
                onSuccess: () => toast('Bet placed!', 'success')
            });
        }
    }

    /* ---------- Manage panel (simple list) ---------- */
    function openManagePanel() {
        const list = window.BetHubCompanies.list();
        if (!list.length) {
            toast('No companies yet. Use "Add Company" first.');
            return;
        }
        const names = list.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
        const answer = prompt(
            `Manage betting companies:\n\n${names}\n\n` +
            `Type a number to remove it, or leave blank to cancel:`
        );
        if (!answer) return;
        const idx = parseInt(answer, 10) - 1;
        if (isNaN(idx) || !list[idx]) { toast('Invalid selection', 'error'); return; }
        removeCompany(list[idx].id);
    }

    /* ---------- Init ---------- */
    function init() {
        bind();
        rebuildDropdown();
        renderEvents();
        console.log('[bet-hub-extras] ready ·',
            window.BetHubCompanies.list().length, 'local companies');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();