/* ============================================================
   CONSTRUCTION & SURVEY HUB — Full Modal Controller
   Path: js/construction-hub.js
   Exposes: open(), close(), openForm(), closeForm()
   ============================================================ */

(function () {
    'use strict';

    const CONFIG = {
        modalId:      'constructionModal',
        formModalId:  'conFormModal',
        formId:       'conForm',
        formBodyId:   'conFormBody',
        formTitleId:  'conFormTitle',
        searchInputId:'constructionSearchInput'
    };

    /* ==========================================================
       DATA — Buckets
       ========================================================== */
    const BUCKETS = [
        { code:'S', name:'Survey Services', icon:'📐', services:[
            ['S-01','Land / Cadastral Survey','Per parcel','10,000 – 20,000'],
            ['S-02','Topographic Survey','Per hectare','3,500 – 8,000'],
            ['S-03','Construction Survey','Per day','4,500 – 9,000'],
            ['S-04','Engineering Survey','Per project','On request'],
            ['S-05','Geodetic Survey','Per point','2,500 – 5,000'],
            ['S-06','Hydrographic Survey','Per day','12,000 – 25,000'],
            ['S-07','Mine Survey','Per month','35,000 – 70,000'],
            ['S-08','Photogrammetric / Remote Sensing','Per km²','1,200 – 3,000'],
            ['S-09','Quantity Survey','Per project','0.5% – 2%'],
            ['S-13','Total Station','Per day','3,500'],
            ['S-14','GNSS / GPS','Per day','4,000'],
            ['S-15','Leveling','Per km','2,500'],
            ['S-16','LiDAR','Per day','18,000 – 35,000'],
            ['S-17','Drone / UAV','Per day','8,000 – 15,000'],
            ['S-18','GIS','Per layer','3,000 – 7,000'],
            ['S-19','3D Laser Scanning','Per scan','6,000 – 12,000']
        ]},
        { code:'B', name:'Borehole Drilling', icon:'⛏️', services:[
            ['B-01','Geotechnical Investigation','Per hole','18,000 – 30,000'],
            ['B-02','Water Well / Supply','Per hole','24,000'],
            ['B-03','Environmental Monitoring','Per hole','15,000 – 25,000'],
            ['B-04','Mineral Exploration','Per meter','On request'],
            ['B-05','Groundwater Recharge','Per hole','20,000 – 35,000'],
            ['B-06','Dewatering','Per hole','12,000 – 22,000'],
            ['B-07','Geothermal','Per hole','On request'],
            ['B-08','Rotary (Air / Mud)','Per meter','800 – 1,400'],
            ['B-09','Auger','Per meter','500 – 900'],
            ['B-10','Percussion / Cable Tool','Per meter','900 – 1,500'],
            ['B-11','Diamond Core','Per meter','2,500 – 5,000'],
            ['B-12','Reverse Circulation','Per meter','1,800 – 3,200'],
            ['B-13','Sonic','Per meter','3,000 – 6,000'],
            ['B-14','Directional','Per meter','On request'],
            ['B-15','Shallow (0–30 m)','Per hole','9,000 – 15,000'],
            ['B-16','Medium (30–100 m)','Per hole','24,000 – 45,000'],
            ['B-17','Deep (100–300 m)','Per hole','60,000 – 150,000'],
            ['B-18','Ultra-Deep (300 m+)','Per hole','On request']
        ]},
        { code:'G', name:'Geotechnical Investigation', icon:'🧪', services:[
            ['G-01','Site Investigation','Per site','25,000 – 80,000'],
            ['G-02','Foundation Design','Per project','15,000 – 45,000'],
            ['G-03','Slope Stability','Per slope','18,000 – 40,000'],
            ['G-04','Ground Improvement','Per design','On request'],
            ['G-05','Liquefaction Assessment','Per site','20,000 – 35,000'],
            ['G-06','Test Pits','Per pit','1,500 – 3,500'],
            ['G-07','CPT','Per test','4,000 – 8,000'],
            ['G-08','SPT','Per test','1,200 – 2,500'],
            ['G-09','Vane Shear','Per test','1,800 – 3,200'],
            ['G-10','Plate Load Test','Per test','6,000 – 12,000'],
            ['G-11','Pressuremeter','Per test','7,000 – 14,000'],
            ['G-12','Geophysical','Per day','15,000 – 30,000']
        ]},
        { code:'M', name:'Materials Testing', icon:'🔬', services:[
            ['M-01','Concrete','Per sample','450 – 900'],
            ['M-02','Soil / Aggregate','Per sample','350 – 1,200'],
            ['M-03','Asphalt / Bitumen','Per sample','800 – 2,500'],
            ['M-04','Steel / Rebar','Per sample','600 – 1,800'],
            ['M-05','Cement / Grout','Per sample','500 – 1,200'],
            ['M-06','Masonry / Blocks','Per sample','400 – 900'],
            ['M-07','Compressive Strength','Per sample','450 – 900'],
            ['M-08','Tensile / Flexural','Per sample','700 – 1,600'],
            ['M-09','Sieve / Gradation','Per sample','350 – 800'],
            ['M-10','Proctor / Compaction','Per sample','900 – 1,800'],
            ['M-11','CBR','Per sample','1,200 – 2,500'],
            ['M-12','Slump','Per test','200 – 400'],
            ['M-14','NDT','Per point','250 – 600']
        ]},
        { code:'L', name:'Laboratory Testing', icon:'🧫', services:[
            ['L-01','Soil Mechanics','Per test','350 – 2,500'],
            ['L-02','Rock Mechanics','Per test','1,500 – 6,000'],
            ['L-03','Concrete Technology','Per test','450 – 1,800'],
            ['L-04','Asphalt Technology','Per test','800 – 3,000'],
            ['L-07','Atterberg Limits','Per sample','700 – 1,400'],
            ['L-08','Consolidation','Per sample','2,000 – 4,500'],
            ['L-09','Triaxial / Shear','Per sample','2,500 – 6,000'],
            ['L-11','UCS','Per sample','1,500 – 3,000']
        ]},
        { code:'E', name:'Environmental & Monitoring', icon:'🌿', services:[
            ['E-01','EIA','Per project','45,000 – 180,000'],
            ['E-02','Air Quality Monitoring','Per campaign','8,000 – 20,000'],
            ['E-03','Water Quality Monitoring','Per sample','600 – 2,200'],
            ['E-04','Noise / Vibration','Per day','3,500 – 8,000'],
            ['E-05','Soil Contamination','Per sample','1,200 – 3,500'],
            ['E-06','Groundwater Monitoring','Per visit','2,500 – 6,000']
        ]},
        { code:'Q', name:'Quantity & Cost', icon:'📊', services:[
            ['Q-01','Quantity Takeoff','Per project','0.3% – 0.8%'],
            ['Q-02','Cost Estimation','Per project','0.5% – 1.5%'],
            ['Q-03','BOQ','Per project','0.5% – 2%'],
            ['Q-04','Valuation / Interim Payments','Per month','3,500 – 9,000']
        ]},
        { code:'H', name:'Health, Safety & Environment', icon:'🦺', services:[
            ['H-01','Risk Assessment','Per project','5,000 – 15,000'],
            ['H-02','Method Statements','Per method','1,500 – 4,500'],
            ['H-03','Permits / Compliance','Per permit','3,000 – 12,000'],
            ['H-04','Incident Investigation','Per incident','4,000 – 12,000'],
            ['H-05','Training / Induction','Per session','2,500 – 8,000']
        ]},
        { code:'P', name:'Planning & Scheduling', icon:'📅', services:[
            ['P-01','Master Schedule','Per project','8,000 – 25,000'],
            ['P-02','Detailed Schedule','Per project','5,000 – 15,000'],
            ['P-03','Resource Planning','Per project','4,000 – 12,000'],
            ['P-04','Progress Monitoring','Per month','3,500 – 9,000']
        ]},
        { code:'D', name:'Design & Engineering', icon:'🏛️', services:[
            ['D-01','Architectural','% of value','1.5% – 4%'],
            ['D-02','Structural','% of value','1% – 3%'],
            ['D-03','Civil','% of value','1% – 3%'],
            ['D-04','MEP','% of value','1% – 3%'],
            ['D-05','Geotechnical','Per project','8,000 – 35,000'],
            ['D-06','Environmental','Per project','10,000 – 45,000']
        ]},
        { code:'W', name:'Skilled Labour', icon:'👷', services:[
            ['W-01','Carpenter','Per day','450'],
            ['W-02','Steel Fixer','Per day','450'],
            ['W-03','Mason','Per day','420'],
            ['W-04','Electrician','Per day','500'],
            ['W-05','Plumber','Per day','480'],
            ['W-06','Plant Operator','Per day','600'],
            ['W-09','Site Engineer','Per month','$2,500 USD']
        ]},
        { code:'F', name:'Statutory Fees', icon:'📜', services:[
            ['F-01','Standard Beacon','Per beacon','17 fee units'],
            ['F-02','Beacon + 200mm stone mound','Per beacon','33 fee units'],
            ['F-03','Irregular parcel surcharge','Per extra side','+10%'],
            ['F-04','Curved boundary','Per 100 m','17 fee units'],
            ['F-05','Circular curve','Per curve','180 fee units']
        ]}
    ];

    const COMPANIES = [
        {name:'Belgravia Services', type:'Main Contractor', spec:'Commercial & Residential', loc:'Lusaka, ZM', rating:5, verified:true},
        {name:'Raubex Construction', type:'Main Contractor', spec:'Roads & Civils', loc:'Lusaka, ZM', rating:5, verified:true},
        {name:'Stefanutti Stocks Zambia', type:'Main Contractor', spec:'Roads & Civils', loc:'Southern, ZM', rating:4, verified:true},
        {name:'Concorde Construction', type:'Main Contractor', spec:'Construction Management', loc:'Lusaka, ZM', rating:4, verified:true},
        {name:'Zhonghmei Engineering Group', type:'Main Contractor', spec:'Roads & Railways', loc:'Copperbelt, ZM', rating:4, verified:true},
        {name:'Turner Construction', type:'Main Contractor', spec:'Building Works', loc:'Lusaka, ZM', rating:4, verified:true},
        {name:'Estim Construction', type:'Main Contractor', spec:'Construction & Civil', loc:'Dar es Salaam, TZ', rating:5, verified:true},
        {name:'MPP Civils Namibia', type:'Main Contractor', spec:'Civil Engineering', loc:'Windhoek, NA', rating:5, verified:true},
        {name:'Tocotex Group', type:'Main Contractor', spec:'Construction Management', loc:'Gaborone, BW', rating:4, verified:true}
    ];

    const CONTRACTORS = [
        {name:'Belgravia Services', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'Commercial & Residential'},
        {name:'Martinville Acoustics', type:'Specialist', country:'ZM', province:'Lusaka', spec:'Acoustics & Interior'},
        {name:'Concorde Construction', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'Construction Management'},
        {name:'Raubex Construction', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'Roads & Civils'},
        {name:'Turner Construction', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'Building Works'},
        {name:'Omega Construction Co Ltd', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'General Construction'},
        {name:'Nova Engineering & Construction', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Engineering & Construction'},
        {name:'Millers Construction Ltd', type:'Main Contractor', country:'ZM', province:'Lusaka', spec:'General Construction'},
        {name:'Comelex Zambia Ltd', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Construction Services'},
        {name:'Dockland Construction Ltd', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Construction Services'},
        {name:'J J Lowe Zambia Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Building Works'},
        {name:'Poweng Zambia Ltd', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Engineering'},
        {name:'Zimco Properties Ltd', type:'Developer', country:'ZM', province:'Lusaka', spec:'Property Development'},
        {name:'Maynard Engineering (Pty) Ltd', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil, Electrical'},
        {name:'Milestone Engineering Consultants', type:'Consultant', country:'ZM', province:'Lusaka', spec:'Civil Engineering'},
        {name:'Milutech Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil Engineering'},
        {name:'Modulemetrix Zambia Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil Engineering'},
        {name:'New Era Zambia Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil, Electrical'},
        {name:'Portmore Construction Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil, Electrical'},
        {name:'Power Range Construction Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil, Electrical'},
        {name:'Praxis Solutions Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil Engineering'},
        {name:'Proshift Engineering Limited', type:'Contractor', country:'ZM', province:'Lusaka', spec:'Civil, Mechanical'},
        {name:'Shire Construction (Zambia) Ltd', type:'Main Contractor', country:'ZM', province:'Copperbelt', spec:'Roads & Civils'},
        {name:'Zhonghmei Engineering Group Ltd', type:'Main Contractor', country:'ZM', province:'Copperbelt', spec:'Roads & Railways'},
        {name:'Copperbelt Mining & Engineering Ltd', type:'Contractor', country:'ZM', province:'Copperbelt', spec:'Mining & Engineering'},
        {name:'Copperbelt Splicing Services Ltd', type:'Specialist', country:'ZM', province:'Copperbelt', spec:'Splicing Services'},
        {name:'Coprem Suppliers Company Ltd', type:'Supplier', country:'ZM', province:'Copperbelt', spec:'Construction Supplies'},
        {name:'Stefanutti Stocks Construction Zambia', type:'Main Contractor', country:'ZM', province:'Southern', spec:'Roads & Civils'},
        {name:'EastConsult Limited', type:'Consultant', country:'ZM', province:'Southern', spec:'Engineering Design'},
        {name:'China State Construction Engineering Co.', type:'Main Contractor', country:'ZM', province:'Southern', spec:'Roads & Infrastructure'},
        {name:'AVIC International Project Engineering', type:'Main Contractor', country:'ZM', province:'Muchinga', spec:'Roads & Infrastructure'},
        {name:'Buildtrust Limited', type:'Main Contractor', country:'ZM', province:'North-Western', spec:'Roads & Civils'},
        {name:'Estim Construction', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction & Civil'},
        {name:'Southey Contracting', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction'},
        {name:'DB Shapriya', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction'},
        {name:'Builders (V.M. Chavda) Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Building'},
        {name:'C. F. Builders Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Building'},
        {name:'J. S. Khambatta Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Building'},
        {name:'Sumajkt Construction Company Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction'},
        {name:'Tazanite Construction Co. Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction'},
        {name:'Super Construction Company Ltd', type:'Main Contractor', country:'TZ', province:'Dar es Salaam', spec:'Construction'},
        {name:'Gemini Contractors Ltd', type:'Contractor', country:'TZ', province:'Dar es Salaam', spec:'Civil'},
        {name:'New Century Construction Co. Ltd', type:'Contractor', country:'TZ', province:'Mwanza', spec:'Building'},
        {name:'Elerai Construction Company Ltd', type:'Contractor', country:'TZ', province:'Arusha', spec:'Civil'},
        {name:'MPP Civils Namibia', type:'Main Contractor', country:'NA', province:'Windhoek', spec:'Civil Engineering'},
        {name:'Lithon', type:'Main Contractor', country:'NA', province:'Windhoek', spec:'Construction Management'},
        {name:'Burmeister & Partners', type:'Main Contractor', country:'NA', province:'Oshakati', spec:'Civil Engineering'},
        {name:'Namibia Construction', type:'Main Contractor', country:'NA', province:'Windhoek', spec:'Construction'},
        {name:'Jimmey Construction', type:'Main Contractor', country:'NA', province:'Windhoek', spec:'Civil Engineering'},
        {name:'Atenu Developments', type:'Main Contractor', country:'NA', province:'Windhoek', spec:'Civil Engineering'},
        {name:'Tocotex Group of Companies', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Construction Management'},
        {name:'Phakalane Estates', type:'Developer', country:'BW', province:'Gaborone', spec:'Real Estate & Construction'},
        {name:'Capital Projects', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Construction Management'},
        {name:'ZAC Construction (Pty) Ltd', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Construction'},
        {name:'China Civil Engineering Construction', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Civil Engineering'},
        {name:'Zhong Gan Engineering & Construction', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Engineering'},
        {name:'K-Hill (Pty) Ltd', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Construction'},
        {name:'BT Engineering & Construction', type:'Main Contractor', country:'BW', province:'Gaborone', spec:'Engineering'},
        {name:'Aveng', type:'Main Contractor', country:'ZA', province:'Gauteng', spec:'Construction & Engineering'},
        {name:'Murray & Roberts', type:'Main Contractor', country:'ZA', province:'Gauteng', spec:'Construction & Engineering'},
        {name:'WBHO', type:'Main Contractor', country:'ZA', province:'Gauteng', spec:'Construction & Civils'},
        {name:'Group Five', type:'Main Contractor', country:'ZA', province:'Gauteng', spec:'Construction & Engineering'},
        {name:'Masimba Holdings', type:'Main Contractor', country:'ZW', province:'Harare', spec:'Construction & Civils'},
        {name:'Fossil Contracting', type:'Main Contractor', country:'ZW', province:'Harare', spec:'Roads & Civils'},
        {name:'Bitumen World', type:'Main Contractor', country:'ZW', province:'Harare', spec:'Roads & Paving'}
    ];

    const COUNTRY_NAMES = {
        ZM:'🇿🇲 Zambia', TZ:'🇹🇿 Tanzania', NA:'🇳🇦 Namibia',
        BW:'🇧🇼 Botswana', ZA:'🇿🇦 South Africa', ZW:'🇿🇼 Zimbabwe'
    };

    /* ==========================================================
       STATE
       ========================================================== */
    const state = {
        calcItems: [],
        currentFormType: null,
        currentFormContext: null
    };

    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    function toast(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[ConstructionHub]', msg);
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ==========================================================
       OPEN / CLOSE MAIN MODAL
       ========================================================== */
    function open() {
        const modal = $('#' + CONFIG.modalId);
        if (!modal) {
            console.warn('[ConstructionHub] #' + CONFIG.modalId + ' not found');
            toast('⚠️ Construction Hub modal missing');
            return;
        }
        initIfNeeded();
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

    let initialized = false;
    function initIfNeeded() {
        if (initialized) return;
        initialized = true;

        // Populate bucket filter
        const bucketFilter = $('#conBucketFilter');
        if (bucketFilter) {
            BUCKETS.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.code;
                opt.textContent = `${b.icon} ${b.name} (${b.code})`;
                bucketFilter.appendChild(opt);
            });
        }

        // Populate calculator dropdown
        const calcService = $('#conCalcService');
        if (calcService) {
            BUCKETS.forEach(b => {
                const group = document.createElement('optgroup');
                group.label = `${b.icon} ${b.name}`;
                b.services.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify({ code: s[0], name: s[1], rate: s[3], unit: s[2] });
                    opt.textContent = `${s[0]} — ${s[1]} (${s[3]})`;
                    group.appendChild(opt);
                });
                calcService.appendChild(group);
            });
        }

        renderServices();
        renderCompanies();
        updateProvinceOptions();
        renderContractors();
        renderCalcItems();
    }

    /* ==========================================================
       SERVICES
       ========================================================== */
    function renderServices() {
        const list = $('#conServiceList');
        if (!list) return;

        const q = ($('#conServiceSearch')?.value || '').toLowerCase();
        const filter = $('#conBucketFilter')?.value || '';

        list.innerHTML = '';

        BUCKETS.forEach(b => {
            if (filter && b.code !== filter) return;
            const matches = b.services.filter(s =>
                s[0].toLowerCase().includes(q) || s[1].toLowerCase().includes(q)
            );
            if (matches.length === 0) return;

            const el = document.createElement('div');
            el.className = 'construction-bucket open';
            el.innerHTML = `
                <div class="construction-bucket-head" data-action="conToggleBucket">
                    <span>${b.icon} ${escapeHtml(b.name)} <span class="count">(${matches.length})</span></span>
                    <span>▾</span>
                </div>
                <div class="construction-bucket-body">
                    <table class="construction-service-table">
                        <thead>
                            <tr><th>Code</th><th>Service</th><th>Unit</th><th>Rate</th><th></th></tr>
                        </thead>
                        <tbody>
                            ${matches.map(s => `
                                <tr>
                                    <td class="construction-code">${escapeHtml(s[0])}</td>
                                    <td>${escapeHtml(s[1])}</td>
                                    <td>${escapeHtml(s[2])}</td>
                                    <td class="construction-rate">${escapeHtml(s[3])}</td>
                                    <td><button class="construction-book-btn" data-action="conBookService" data-code="${escapeHtml(s[0])}" data-name="${escapeHtml(s[1])}">Book</button></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
            list.appendChild(el);
        });

        if (!list.innerHTML.trim()) {
            list.innerHTML = '<p style="padding:20px;color:#6b7280;">No services match your search.</p>';
        }
    }

    /* ==========================================================
       COMPANIES
       ========================================================== */
    function renderCompanies() {
        const grid = $('#conCompanyGrid');
        if (!grid) return;

        grid.innerHTML = COMPANIES.map(c => {
            const stars = '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating);
            return `
                <div class="construction-company-card">
                    <h3>
                        ${escapeHtml(c.name)}
                        ${c.verified ? '<span class="construction-badge construction-badge-verified">✅ Verified</span>' : ''}
                    </h3>
                    <div class="construction-company-meta">
                        ${escapeHtml(c.type)} · ${escapeHtml(c.spec)}<br>📍 ${escapeHtml(c.loc)}
                    </div>
                    <div class="construction-stars">${stars}</div>
                    <button class="construction-book-btn" data-action="conRequestQuote" data-name="${escapeHtml(c.name)}">
                        Request Quote
                    </button>
                </div>
            `;
        }).join('');
    }

    /* ==========================================================
       CONTRACTORS
       ========================================================== */
    function updateProvinceOptions() {
        const c = $('#conCountryFilter')?.value || '';
        const provinces = [...new Set(CONTRACTORS
            .filter(x => !c || x.country === c)
            .map(x => x.province))].sort();

        const sel = $('#conProvinceFilter');
        if (!sel) return;
        sel.innerHTML = '<option value="">📍 All Provinces / Regions</option>';
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            sel.appendChild(opt);
        });
    }

    function renderContractors() {
        const grid = $('#conContractorGrid');
        if (!grid) return;

        const c = $('#conCountryFilter')?.value || '';
        const p = $('#conProvinceFilter')?.value || '';
        const q = ($('#conContractorSearch')?.value || '').toLowerCase();

        const filtered = CONTRACTORS.filter(x =>
            (!c || x.country === c) &&
            (!p || x.province === p) &&
            (!q || x.name.toLowerCase().includes(q) || x.spec.toLowerCase().includes(q))
        );

        if (!filtered.length) {
            grid.innerHTML = '<p style="padding:20px;color:#6b7280;">No contractors match your filters.</p>';
            return;
        }

        grid.innerHTML = filtered.map(x => `
            <div class="construction-company-card">
                <h3>
                    ${escapeHtml(x.name)}
                    <span class="construction-badge construction-badge-country">${COUNTRY_NAMES[x.country] || x.country}</span>
                </h3>
                <div class="construction-company-meta">
                    ${escapeHtml(x.type)} · ${escapeHtml(x.spec)}<br>
                    📍 ${escapeHtml(x.province)}, ${COUNTRY_NAMES[x.country] || x.country}
                </div>
                <button class="construction-book-btn" data-action="conRequestQuote" data-name="${escapeHtml(x.name)}">
                    Request Quote
                </button>
            </div>
        `).join('');
    }

    /* ==========================================================
       CALCULATOR
       ========================================================== */
    function parseRate(rateStr) {
        const m = String(rateStr).replace(/,/g, '').match(/(\d+(\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
    }

    function addCalcItem() {
        const sel = $('#conCalcService')?.value;
        if (!sel) return;
        const svc = JSON.parse(sel);
        const qty = parseInt($('#conCalcQty')?.value) || 1;
        const unitRate = parseRate(svc.rate);
        state.calcItems.push({ ...svc, qty, unitRate, total: unitRate * qty });
        renderCalcItems();
    }

    function renderCalcItems() {
        const wrap = $('#conCalcItems');
        if (!wrap) return;

        if (state.calcItems.length === 0) {
            wrap.innerHTML = '<p style="color:#6b7280;font-size:0.85rem;padding:10px;">No items added yet.</p>';
            const totalEl = $('#conCalcTotal');
            if (totalEl) totalEl.textContent = 'ZMW 0';
            return;
        }

        let grand = 0;
        wrap.innerHTML = state.calcItems.map((it, i) => {
            grand += it.total;
            return `
                <div class="construction-calc-item">
                    <span><b>${escapeHtml(it.code)}</b> — ${escapeHtml(it.name)}</span>
                    <span>${it.qty} × ${it.unitRate.toLocaleString()} = <b>ZMW ${it.total.toLocaleString()}</b></span>
                    <button class="remove" data-action="conCalcRemove" data-index="${i}">✕</button>
                </div>
            `;
        }).join('');

        const totalEl = $('#conCalcTotal');
        if (totalEl) totalEl.textContent = 'ZMW ' + grand.toLocaleString();
    }

    function removeCalcItem(i) {
        state.calcItems.splice(i, 1);
        renderCalcItems();
    }

    function downloadQuote() {
        if (!state.calcItems.length) {
            toast('⚠️ Add at least one service first.');
            return;
        }
        let total = 0;
        let text = 'CONSTRUCTION & SURVEY HUB — QUOTE\n';
        text += '=====================================\n\n';
        state.calcItems.forEach(it => {
            text += `${it.code}  ${it.name}\n`;
            text += `  ${it.qty} × ZMW ${it.unitRate.toLocaleString()} = ZMW ${it.total.toLocaleString()}\n\n`;
            total += it.total;
        });
        text += '=====================================\n';
        text += `TOTAL ESTIMATE: ZMW ${total.toLocaleString()}\n\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += `Valid for: 30 days\n`;
        text += `Contact: info@hub.zm | +260 XXX XXX XXX\n`;

        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'construction-quote-' + Date.now() + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    /* ==========================================================
       FORM MODAL (Quote / Booking)
       ========================================================== */
    function openForm(type, context) {
        const modal = $('#' + CONFIG.formModalId);
        const body = $('#' + CONFIG.formBodyId);
        const title = $('#' + CONFIG.formTitleId);
        if (!modal || !body) return;

        state.currentFormType = type;
        state.currentFormContext = context;

        if (title) title.textContent = type || 'Request';

        if (type === 'Quote') {
            body.innerHTML = `
                <p style="color:#6b7280;font-size:0.85rem;margin-bottom:12px;">
                    Request a quote from <b>${escapeHtml(context || 'the provider')}</b>.
                </p>
                <label for="conQuoteName">Your Name</label>
                <input type="text" id="conQuoteName" required />
                <label for="conQuotePhone">Phone</label>
                <input type="tel" id="conQuotePhone" required />
                <label for="conQuoteDetails">Project Details</label>
                <textarea id="conQuoteDetails" rows="4" placeholder="Describe your project..."></textarea>
            `;
        } else if (type === 'Booking') {
            body.innerHTML = `
                <label for="conBookName">Full Name</label>
                <input type="text" id="conBookName" required />
                <label for="conBookPhone">Phone</label>
                <input type="tel" id="conBookPhone" required />
                <label for="conBookLocation">Location</label>
                <input type="text" id="conBookLocation" />
                <label for="conBookDate">Preferred Date</label>
                <input type="date" id="conBookDate" />
                <label for="conBookNotes">Notes</label>
                <textarea id="conBookNotes" rows="3"></textarea>
            `;
        }

        modal.hidden = false;
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    function closeForm() {
        const modal = $('#' + CONFIG.formModalId);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('hidden', '');
        }, 200);
    }

    function submitForm(e) {
        e.preventDefault();
        toast('✅ Submitted! Our team will contact you shortly.');
        setTimeout(() => {
            closeForm();
            $('#' + CONFIG.formId)?.reset();
        }, 1500);
    }

    /* ==========================================================
       TAB SWITCHING
       ========================================================== */
    function switchTab(tab) {
        $$('.construction-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.conTab === tab);
            t.setAttribute('aria-selected', t.dataset.conTab === tab ? 'true' : 'false');
        });
        $$('.construction-panel').forEach(p => {
            p.classList.toggle('active', p.dataset.panel === tab);
        });
    }

    /* ==========================================================
       EVENT BINDINGS
       ========================================================== */
    function bindEvents() {
        // Tab clicks
        $$('.construction-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.conTab));
        });

        // Search inputs
        $('#conServiceSearch')?.addEventListener('input', renderServices);
        $('#conBucketFilter')?.addEventListener('change', renderServices);
        $('#conCountryFilter')?.addEventListener('change', () => {
            updateProvinceOptions();
            renderContractors();
        });
        $('#conProvinceFilter')?.addEventListener('change', renderContractors);
        $('#conContractorSearch')?.addEventListener('input', renderContractors);

        // Main search bar — routes to the active tab
        $('#constructionSearchInput')?.addEventListener('input', e => {
            const q = e.target.value;
            const activeTab = $('.construction-tab.active')?.dataset.conTab;
            if (activeTab === 'services') {
                const inp = $('#conServiceSearch');
                if (inp) { inp.value = q; renderServices(); }
            } else if (activeTab === 'contractors') {
                const inp = $('#conContractorSearch');
                if (inp) { inp.value = q; renderContractors(); }
            }
        });

        // Form submit
        $('#' + CONFIG.formId)?.addEventListener('submit', submitForm);

        // Backdrop clicks
        $('#' + CONFIG.modalId)?.addEventListener('click', e => {
            if (e.target.id === CONFIG.modalId) close();
        });
        $('#' + CONFIG.formModalId)?.addEventListener('click', e => {
            if (e.target.id === CONFIG.formModalId) closeForm();
        });

        // Delegated clicks
        document.addEventListener('click', e => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;

            switch (action) {
                case 'openConstructionHub': open(); break;
                case 'closeConstructionHub': close(); break;
                case 'closeConstructionForm': closeForm(); break;

                case 'conToggleBucket': {
                    el.closest('.construction-bucket')?.classList.toggle('open');
                    break;
                }
                case 'conBookService': {
                    openForm('Booking');
                    const title = $('#' + CONFIG.formTitleId);
                    if (title) title.textContent = `Book ${el.dataset.code} — ${el.dataset.name}`;
                    break;
                }
                case 'conRequestQuote': {
                    openForm('Quote', el.dataset.name);
                    break;
                }
                case 'conCalcAdd': addCalcItem(); break;
                case 'conCalcRemove': removeCalcItem(parseInt(el.dataset.index)); break;
                case 'conDownloadQuote': downloadQuote(); break;
                case 'conBooking': openForm('Booking'); break;
            }
        });

        // ESC key
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if ($('#' + CONFIG.formModalId)?.classList.contains('active')) { closeForm(); return; }
            if ($('#' + CONFIG.modalId)?.classList.contains('active'))     { close();     return; }
        });
    }

    /* ==========================================================
       PUBLIC API
       ========================================================== */
    window.ConstructionHub = {
        open,
        close,
        openForm,
        closeForm,
        init() {
            bindEvents();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.ConstructionHub.init());
    } else {
        window.ConstructionHub.init();
    }

})();