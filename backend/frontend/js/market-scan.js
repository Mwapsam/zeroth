/* ==========================================================================
   MARKET HUB — SCAN & UPLOAD ITEM
   Adds barcode/QR scanning, photo OCR, bulk CSV/JSON import, and manual entry
   to the Market Hub's vendor panel. Fills the existing #marketProductForm.
   ========================================================================== */
(function () {
    'use strict';

    /* ==============================================================
       CONFIG
       ============================================================== */
    const LS_DRAFTS       = 'zbs_market_scan_drafts_v1';
    const LS_CATALOG      = 'zbs_market_scan_catalog_v1'; // { barcode: { name, category, image } }
    const LS_HISTORY      = 'zbs_market_scan_history_v1';
    const OFF_ENDPOINT    = 'https://world.openfoodfacts.org/api/v0/product/';
    const ZXING_CDN       = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
    const TESSERACT_CDN   = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

    const BARCODE_FORMATS = ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','code_93','itf','codabar'];
    const QR_FORMATS      = ['qr_code','data_matrix','pdf417','aztec'];

    /* --------------------------------------------------------------
       DEMO LOCAL CATALOG (works without internet)
       -------------------------------------------------------------- */
    const DEMO_CATALOG = {
        '8901030865278': { name: 'Parle-G Biscuits 800g',  category: 'grocery',    price: 45 },
        '8901058000348': { name: 'Maggi 2-Min Noodles',    category: 'grocery',    price: 12 },
        '5449000000996': { name: 'Coca-Cola 330ml Can',    category: 'grocery',    price: 15 },
        '7622210449283': { name: 'Oreo Original 154g',     category: 'grocery',    price: 35 },
        '5000159484695': { name: 'Snickers Bar 48g',       category: 'grocery',    price: 18 },
        '7613034626844': { name: 'Nescafé Classic 200g',   category: 'grocery',    price: 120 },
        '8712566389456': { name: 'Dove Shampoo 400ml',     category: 'fashion',    price: 95 },
        '3574661333423': { name: 'Colgate Toothpaste',     category: 'pharmacy',   price: 40 },
        '6001069000320': { name: 'Indomie Chicken 70g',    category: 'grocery',    price: 8 },
        '4006381333931': { name: 'Staedtler Pencil HB',    category: 'hardware',   price: 5 }
    };

    /* ==============================================================
       STATE
       ============================================================== */
    let modal, container;
    let videoEl, canvasEl, stream;
    let detector = null;
    let usingZxing = false;
    let scanLoopId = null;
    let facingMode = 'environment';
    let torchSupported = false;
    let torchOn = false;
    let activeTab = 'barcode';
    let uploadedImage = null; // dataURL
    let uploadedFile = null;
    let ocrWorker = null;
    let lastBulkRows = null; // parsed bulk data
    let lastScanned = null;  // { code, format, mode }
    let currentShopId = '';
    let toastEl;

    /* ==============================================================
       UTILS
       ============================================================== */
    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
    function load(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
    function toast(msg, type) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'market-scan-toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.className = 'show ' + (type || '');
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2600);
    }
    function beep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.value = 1200;
            osc.type = 'sine';
            osc.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.start();
            osc.stop(ctx.currentTime + 0.13);
        } catch {}
    }
    function flashGreen() {
        const flash = document.createElement('div');
        flash.style.cssText =
            'position:absolute;inset:0;background:rgba(34,197,94,0.4);' +
            'pointer-events:none;transition:opacity .35s;z-index:5;';
        (videoEl && videoEl.parentElement || container).appendChild(flash);
        requestAnimationFrame(() => { flash.style.opacity = '0'; });
        setTimeout(() => flash.remove(), 400);
    }
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    /* ==============================================================
       INJECT BUTTON INTO VENDOR PANEL
       ============================================================== */
    function injectTriggerButton() {
        const formCard = document.getElementById('marketProductFormCard');
        if (!formCard) return;

        // avoid duplicates
        if (formCard.querySelector('.market-scan-trigger')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'market-scan-trigger';
        btn.innerHTML = `
            <i class="fas fa-qrcode"></i>
            <span>Scan / Upload Item</span>
            <span class="market-scan-badge">NEW</span>
        `;
        btn.addEventListener('click', openModal);

        // Insert at the top of the card, before the form
        const form = formCard.querySelector('form');
        if (form) formCard.insertBefore(btn, form);
        else formCard.appendChild(btn);
    }

    // Watch for the vendor dashboard becoming visible
    function watchForVendorPanel() {
        const observer = new MutationObserver(() => {
            const dash = document.getElementById('marketVendorDashboard');
            if (dash && !dash.hidden) {
                injectTriggerButton();
                cacheShopId();
            }
        });
        observer.observe(document.body, {
            attributes: true, attributeFilter: ['hidden'], subtree: true
        });
        // Also try immediately
        injectTriggerButton();
        cacheShopId();
    }

    function cacheShopId() {
        const sel = document.getElementById('marketProductShop');
        if (sel && sel.value) {
            currentShopId = sel.value;
        }
        if (sel) {
            sel.addEventListener('change', () => { currentShopId = sel.value; });
        }
    }

    /* ==============================================================
       BUILD MODAL
       ============================================================== */
    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'market-scan-modal';
        modal.id = 'marketScanModal';
        modal.hidden = true;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'marketScanTitle');

        modal.innerHTML = `
            <div class="market-scan-container" role="document">
                <header class="market-scan-header">
                    <div class="market-scan-title">
                        <i class="fas fa-barcode"></i>
                        <span id="marketScanTitle">Scan / Upload Item</span>
                    </div>
                    <button class="window-close-btn" data-ms-close aria-label="Close">&times;</button>
                </header>

                <div class="market-scan-tabs" role="tablist">
                    <button class="market-scan-tab active" data-ms-tab="barcode" role="tab">
                        <i class="fas fa-barcode"></i> Barcode
                    </button>
                    <button class="market-scan-tab" data-ms-tab="qr" role="tab">
                        <i class="fas fa-qrcode"></i> QR Code
                    </button>
                    <button class="market-scan-tab" data-ms-tab="photo" role="tab">
                        <i class="fas fa-camera"></i> Photo
                    </button>
                    <button class="market-scan-tab" data-ms-tab="bulk" role="tab">
                        <i class="fas fa-file-csv"></i> Bulk
                    </button>
                </div>

                <div class="market-scan-body" id="msBody"></div>

                <div class="market-scan-actions" id="msActions"></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal();
        });
        modal.querySelector('[data-ms-close]').addEventListener('click', closeModal);

        // Tab handlers
        $$('.market-scan-tab', modal).forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.msTab));
        });
    }

    function switchTab(name) {
        activeTab = name;
        $$('.market-scan-tab', modal).forEach(t => {
            t.classList.toggle('active', t.dataset.msTab === name);
        });
        stopCamera();
        renderTab();
    }

    /* ==============================================================
       RENDER TAB
       ============================================================== */
    function renderTab() {
        const body    = $('#msBody', modal);
        const actions = $('#msActions', modal);

        if (activeTab === 'barcode' || activeTab === 'qr') {
            body.innerHTML = `
                <div class="market-scan-cam" id="msCam">
                    <video id="msVideo" autoplay playsinline muted></video>
                    <canvas id="msCanvas"></canvas>
                    <div class="market-scan-frame">
                        <span class="c1"></span><span class="c2"></span>
                    </div>
                    <div class="market-scan-laser"></div>
                    <div class="market-scan-cam-overlay">
                        <span class="market-scan-hint">
                            <span class="market-scan-dot"></span>
                            ${activeTab === 'qr' ? 'Point at a QR code' : 'Point at a barcode'}
                        </span>
                    </div>
                </div>
                <div class="market-scan-cam-controls">
                    <button type="button" class="market-scan-cam-btn" data-ms-cam="switch">
                        <i class="fas fa-sync-alt"></i> Switch Camera
                    </button>
                    <button type="button" class="market-scan-cam-btn" data-ms-cam="torch" id="msTorchBtn" disabled>
                        <i class="fas fa-lightbulb"></i> Torch
                    </button>
                    <button type="button" class="market-scan-cam-btn" data-ms-cam="stop">
                        <i class="fas fa-stop-circle"></i> Stop
                    </button>
                </div>
                <div class="market-scan-manual">
                    <input type="text" id="msManualCode"
                           placeholder="${activeTab === 'qr' ? 'Paste or type QR text...' : 'Or enter barcode manually (e.g. 8901030865278)'}"
                           autocomplete="off" />
                    <button type="button" data-ms-manual-submit>Use</button>
                </div>
                <div class="market-scan-status info" id="msStatus">
                    <i class="fas fa-info-circle"></i>
                    Camera permission required. If blocked, use manual entry or the Photo tab.
                </div>
            `;
            actions.innerHTML = `
                <button type="button" class="market-scan-btn market-scan-btn-outline" data-ms-close>Cancel</button>
            `;

            wireCameraControls();
            startCamera();

        } else if (activeTab === 'photo') {
            body.innerHTML = `
                <div class="market-scan-drop" id="msDrop">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Drop a photo of the item, or <span class="browse-link">browse files</span></p>
                    <small>JPG · PNG · WEBP — max 10 MB. We'll try to read the label / barcode.</small>
                    <input type="file" id="msFile" accept="image/*" hidden />
                </div>
                <div class="market-scan-photo-preview" id="msPreview" hidden>
                    <img id="msPreviewImg" alt="Item preview" />
                    <button type="button" class="market-scan-photo-remove" data-ms-remove-photo aria-label="Remove">&times;</button>
                </div>
                <div class="market-scan-progress" id="msOcrProgress" hidden>
                    <div class="market-scan-progress-label">
                        <span>Reading item…</span>
                        <span id="msOcrPct">0%</span>
                    </div>
                    <div class="market-scan-progress-bar" id="msOcrBar"></div>
                </div>
                <div class="market-scan-status info" id="msPhotoStatus">
                    <i class="fas fa-info-circle"></i>
                    We scan the image for a barcode and read visible text (OCR) to pre-fill the form.
                </div>
            `;
            actions.innerHTML = `
                <button type="button" class="market-scan-btn market-scan-btn-outline" data-ms-close>Cancel</button>
            `;

            wirePhotoUpload();

        } else if (activeTab === 'bulk') {
            body.innerHTML = `
                <div class="market-scan-bulk-note">
                    <strong>CSV format:</strong>
                    <code>name,category,price,stock,unit,barcode,description,image</code><br>
                    <strong>JSON format:</strong>
                    <code>[{"name":"...","price":0,"stock":0}, ...]</code><br>
                    The first row of a CSV is treated as a header. Missing fields are left blank.
                </div>
                <div class="market-scan-drop" id="msBulkDrop">
                    <i class="fas fa-file-csv"></i>
                    <p>Drop a <strong>.csv</strong> or <strong>.json</strong> file, or <span class="browse-link">browse</span></p>
                    <small>Max 2 MB · up to 500 rows</small>
                    <input type="file" id="msBulkFile" accept=".csv,.json,text/csv,application/json" hidden />
                </div>
                <div class="market-scan-bulk-preview" id="msBulkPreview" hidden></div>
                <div class="market-scan-status info" id="msBulkStatus">
                    <i class="fas fa-info-circle"></i>
                    We'll parse the file and let you review the rows before adding them to your shop.
                </div>
            `;
            actions.innerHTML = `
                <button type="button" class="market-scan-btn market-scan-btn-primary" id="msBulkConfirm" disabled>
                    <i class="fas fa-check"></i> Add All Items
                </button>
                <button type="button" class="market-scan-btn market-scan-btn-outline" data-ms-close>Cancel</button>
            `;
            wireBulkUpload();
        }
    }

    /* ==============================================================
       CAMERA
       ============================================================== */
    function wireCameraControls() {
        const switchBtn = modal.querySelector('[data-ms-cam="switch"]');
        const torchBtn  = modal.querySelector('[data-ms-cam="torch"]');
        const stopBtn   = modal.querySelector('[data-ms-cam="stop"]');
        const manualBtn = modal.querySelector('[data-ms-manual-submit]');
        const manualInput = $('#msManualCode', modal);

        if (switchBtn) switchBtn.addEventListener('click', switchCamera);
        if (stopBtn)   stopBtn.addEventListener('click', () => { stopCamera(); setStatus('Camera stopped.', 'info'); });
        if (torchBtn)  torchBtn.addEventListener('click', toggleTorch);
        if (manualBtn) manualBtn.addEventListener('click', () => {
            const v = (manualInput.value || '').trim();
            if (!v) return;
            handleScan({ code: v, format: 'manual', mode: activeTab });
        });
        if (manualInput) {
            manualInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = (manualInput.value || '').trim();
                    if (v) handleScan({ code: v, format: 'manual', mode: activeTab });
                }
            });
        }
    }

    function startCamera() {
        videoEl  = $('#msVideo', modal);
        canvasEl = $('#msCanvas', modal);
        const camBox = $('#msCam', modal);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showCameraError('This browser does not support camera access.');
            return;
        }
        if (!window.isSecureContext && location.hostname !== 'localhost') {
            showCameraError('Camera requires HTTPS. Use manual entry or the Photo tab.');
            return;
        }

        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: facingMode },
                width:  { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        }).then(s => {
            stream = s;
            videoEl.srcObject = s;
            videoEl.play().catch(() => {});

            const track = s.getVideoTracks()[0];
            const caps = track.getCapabilities ? track.getCapabilities() : {};
            torchSupported = !!caps.torch;
            const torchBtn = $('#msTorchBtn', modal);
            if (torchBtn) torchBtn.disabled = !torchSupported;

            beginScanLoop();
        }).catch(err => {
            showCameraError(err && err.name === 'NotAllowedError'
                ? 'Camera permission denied. Use manual entry or the Photo tab.'
                : 'Could not start camera: ' + (err.message || err.name || 'unknown'));
        });
    }

    function showCameraError(msg) {
        const cam = $('#msCam', modal);
        if (!cam) return;
        cam.innerHTML = `
            <div class="market-scan-cam-error">
                <div>
                    <i class="fas fa-video-slash"></i>
                    <div>${esc(msg)}</div>
                </div>
            </div>
        `;
    }

    function stopCamera() {
        if (scanLoopId) {
            cancelAnimationFrame(scanLoopId);
            scanLoopId = null;
        }
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (videoEl) videoEl.srcObject = null;
    }

    function switchCamera() {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        stopCamera();
        startCamera();
    }

    function toggleTorch() {
        if (!stream || !torchSupported) return;
        const track = stream.getVideoTracks()[0];
        torchOn = !torchOn;
        track.applyConstraints({ advanced: [{ torch: torchOn }] })
            .then(() => {
                const btn = $('#msTorchBtn', modal);
                if (btn) btn.classList.toggle('active', torchOn);
            })
            .catch(() => toast('Torch not available', 'error'));
    }

    /* ---------- Scan loop ---------- */
    async function beginScanLoop() {
        // Native BarcodeDetector first
        if ('BarcodeDetector' in window) {
            const formats = activeTab === 'qr' ? QR_FORMATS : BARCODE_FORMATS;
            try {
                const supported = await window.BarcodeDetector.getSupportedFormats();
                const usable = formats.filter(f => supported.includes(f));
                detector = new window.BarcodeDetector({ formats: usable.length ? usable : formats });
                usingZxing = false;
                runNativeDetect();
                return;
            } catch {
                // fall through to ZXing
            }
        }
        // ZXing fallback
        try {
            await loadScript(ZXING_CDN);
            usingZxing = true;
            runZxingDetect();
        } catch {
            showCameraError('Barcode scanning library failed to load. Use manual entry or the Photo tab.');
        }
    }

    function runNativeDetect() {
        const loop = async () => {
            if (!videoEl || !videoEl.videoWidth || !detector) {
                scanLoopId = requestAnimationFrame(loop);
                return;
            }
            try {
                const results = await detector.detect(videoEl);
                if (results && results.length) {
                    const r = results[0];
                    handleScan({
                        code: r.rawValue,
                        format: r.format,
                        mode: activeTab
                    });
                    return;
                }
            } catch {}
            scanLoopId = requestAnimationFrame(loop);
        };
        scanLoopId = requestAnimationFrame(loop);
    }

    function runZxingDetect() {
        const ZX = window.ZXing;
        if (!ZX) { showCameraError('ZXing not available.'); return; }

        const hints = new Map();
        const possible = activeTab === 'qr'
            ? [ZX.BarcodeFormat.QR_CODE, ZX.BarcodeFormat.DATA_MATRIX, ZX.BarcodeFormat.AZTEC, ZX.BarcodeFormat.PDF_417]
            : [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E,
               ZX.BarcodeFormat.CODE_128, ZX.BarcodeFormat.CODE_39, ZX.BarcodeFormat.CODE_93,
               ZX.BarcodeFormat.ITF, ZX.BarcodeFormat.CODABAR];
        hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, possible);
        hints.set(ZX.DecodeHintType.TRY_HARDER, true);

        const reader = new ZX.BrowserMultiFormatReader(hints, 500);

        const tick = () => {
            if (!videoEl || !videoEl.videoWidth) {
                scanLoopId = requestAnimationFrame(tick);
                return;
            }
            try {
                const res = reader.decodeFromVideoElement(videoEl);
                if (res) {
                    handleScan({
                        code: res.getText(),
                        format: res.getBarcodeFormat ? String(res.getBarcodeFormat()) : 'unknown',
                        mode: activeTab
                    });
                    return;
                }
            } catch {}
            scanLoopId = requestAnimationFrame(tick);
        };
        tick();
    }

    /* ==============================================================
       HANDLE SCAN RESULT
       ============================================================== */
    async function handleScan(result) {
        // Debounce rapid re-fires
        if (lastScanned && (Date.now() - lastScanned.at) < 1500 && lastScanned.code === result.code) {
            return;
        }
        lastScanned = { code: result.code, at: Date.now() };

        beep();
        flashGreen();
        stopCamera();

        // Push to history
        const hist = load(LS_HISTORY) || [];
        hist.unshift({ ...result, at: Date.now() });
        save(LS_HISTORY, hist.slice(0, 50));

        // Try local demo catalog first
        const localCatalog = load(LS_CATALOG) || {};
        const demo = DEMO_CATALOG[result.code] || localCatalog[result.code];

        let prefilled = null;
        if (demo) {
            prefilled = {
                name: demo.name,
                category: demo.category,
                price: demo.price,
                stock: '',
                unit: '',
                description: '',
                image: demo.image || '',
                barcode: result.code,
                source: 'catalog'
            };
            openReview(prefilled, result);
            return;
        }

        // Try OpenFoodFacts (foods) — free, no key
        setStatus('Looking up barcode…', 'info');
        try {
            const res = await fetch(OFF_ENDPOINT + encodeURIComponent(result.code) + '.json');
            if (res.ok) {
                const data = await res.json();
                if (data && data.status === 1 && data.product) {
                    const p = data.product;
                    prefilled = {
                        name: p.product_name || p.generic_name || '',
                        category: 'grocery',
                        price: '',
                        stock: '',
                        unit: p.quantity || '',
                        description: [p.brands, p.categories].filter(Boolean).join(' · '),
                        image: p.image_front_url || p.image_url || '',
                        barcode: result.code,
                        source: 'openfoodfacts'
                    };
                    openReview(prefilled, result);
                    return;
                }
            }
        } catch {}

        // Unknown barcode → open blank review with barcode filled
        openReview({
            name: '',
            category: '',
            price: '',
            stock: '',
            unit: '',
            description: '',
            image: '',
            barcode: result.code,
            source: 'none'
        }, result);
    }

    /* ==============================================================
       REVIEW SCREEN (after scan / photo)
       ============================================================== */
    function openReview(prefill, scanMeta) {
        const body    = $('#msBody', modal);
        const actions = $('#msActions', modal);

        const autoBadge = '<span class="market-scan-auto-badge">auto</span>';
        const srcLabel =
            prefill.source === 'catalog'       ? 'Found in local catalog' :
            prefill.source === 'openfoodfacts' ? 'Found in OpenFoodFacts' :
            prefill.source === 'photo'         ? 'Detected from photo' :
            prefill.source === 'bulk'          ? 'From bulk file' :
                                                 'No match found — enter details';

        body.innerHTML = `
            <div class="market-scan-status info" style="margin-top:0;margin-bottom:14px;">
                <i class="fas fa-check-circle"></i> ${esc(srcLabel)}
                ${scanMeta && scanMeta.code
                    ? ' · <strong>' + esc(scanMeta.code) + '</strong>' +
                      (scanMeta.format ? ' (' + esc(scanMeta.format) + ')' : '')
                    : ''}
            </div>

            <div class="market-scan-field-grid">
                <div class="market-scan-field full">
                    <label>Product Name *</label>
                    <input type="text" id="msName" maxlength="120" value="${esc(prefill.name)}"
                           placeholder="e.g. Fresh Tomatoes 1kg" required />
                </div>
                <div class="market-scan-field">
                    <label>Category</label>
                    <select id="msCategory">
                        <option value="">Select</option>
                        <option value="grocery">Grocery</option>
                        <option value="agriculture">Agriculture</option>
                        <option value="electronics">Electronics</option>
                        <option value="fashion">Fashion</option>
                        <option value="hardware">Hardware</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="market-scan-field">
                    <label>Unit</label>
                    <input type="text" id="msUnit" maxlength="20" value="${esc(prefill.unit)}"
                           placeholder="kg, pc, box" />
                </div>
                <div class="market-scan-field">
                    <label>Price (ZMW) *</label>
                    <input type="number" id="msPrice" min="0" step="0.01" value="${esc(prefill.price)}" required />
                </div>
                <div class="market-scan-field">
                    <label>Stock *</label>
                    <input type="number" id="msStock" min="0" step="1" value="${esc(prefill.stock)}" required />
                </div>
                <div class="market-scan-field full">
                    <label>Barcode / Code</label>
                    <input type="text" id="msBarcode" readonly value="${esc(prefill.barcode || '')}" />
                </div>
                <div class="market-scan-field full">
                    <label>Description</label>
                    <textarea id="msDescription" rows="2" maxlength="500"
                              placeholder="Short description...">${esc(prefill.description)}</textarea>
                </div>
                <div class="market-scan-field full">
                    <label>Image URL</label>
                    <input type="url" id="msImage" maxlength="400"
                           value="${esc(prefill.image)}" placeholder="https://..." />
                </div>
            </div>

            ${prefill.image ? `
                <div class="market-scan-photo-preview" style="margin-top:6px;max-height:180px;">
                    <img src="${esc(prefill.image)}" alt="Preview"
                         onerror="this.style.display='none'" />
                </div>
            ` : ''}

            <div class="market-scan-status" id="msReviewStatus" hidden></div>
        `;
        actions.innerHTML = `
            <button type="button" class="market-scan-btn market-scan-btn-primary" id="msSaveItem">
                <i class="fas fa-plus-circle"></i> Save Item
            </button>
            <button type="button" class="market-scan-btn market-scan-btn-outline" id="msScanAgain">
                <i class="fas fa-redo"></i> Scan Again
            </button>
            <button type="button" class="market-scan-btn market-scan-btn-ghost" data-ms-close>Cancel</button>
        `;

        const catSel = $('#msCategory', modal);
        if (catSel && prefill.category) catSel.value = prefill.category;

        // Auto-fill a category suggestion from keywords in name
        const nameEl = $('#msName', modal);
        nameEl && nameEl.addEventListener('input', () => {
            if (catSel && !catSel.value) {
                const guess = guessCategory(nameEl.value);
                if (guess) catSel.value = guess;
            }
        });

        $('#msScanAgain', modal).addEventListener('click', () => {
            switchTab(activeTab);
        });

        $('#msSaveItem', modal).addEventListener('click', submitReview);
    }

    function guessCategory(name) {
        if (!name) return '';
        const n = name.toLowerCase();
        if (/\b(milk|cheese|butter|yoghurt|yogurt|bread|rice|flour|sugar|salt|oil|tea|coffee|biscuit|cookie|snack|chocolate|drink|juice|water|soda|beer|wine|cereal|pasta|noodle)\b/.test(n)) return 'grocery';
        if (/\b(seed|fertilizer|tractor|goat|cow|chicken|maize|soya|tomato|onion|potato)\b/.test(n)) return 'agriculture';
        if (/\b(phone|laptop|tv|cable|charger|battery|headphone|speaker|router|camera|mouse|keyboard)\b/.test(n)) return 'electronics';
        if (/\b(shirt|tshirt|t-shirt|shoe|dress|jean|jacket|hat|bag|watch|belt)\b/.test(n)) return 'fashion';
        if (/\b(hammer|screw|nail|drill|paint|cement|brick|tool|wrench|bolt)\b/.test(n)) return 'hardware';
        if (/\b(tablet|pill|syrup|cream|bandage|mask|sanitizer|medicine|vaccine|paracetamol)\b/.test(n)) return 'pharmacy';
        return '';
    }

    function submitReview() {
        const name   = ($('#msName', modal).value || '').trim();
        const cat    = ($('#msCategory', modal).value || '').trim();
        const price  = ($('#msPrice', modal).value || '').trim();
        const stock  = ($('#msStock', modal).value || '').trim();
        const unit   = ($('#msUnit', modal).value || '').trim();
        const desc   = ($('#msDescription', modal).value || '').trim();
        const img    = ($('#msImage', modal).value || '').trim();
        const bar    = ($('#msBarcode', modal).value || '').trim();
        const status = $('#msReviewStatus', modal);

        if (!name)   return showReviewError('Product name is required.');
        if (!price)  return showReviewError('Price is required.');
        if (!stock)  return showReviewError('Stock is required.');

        // Fill existing market form
        fillMarketProductForm({
            name, category: cat, price, stock, unit, description: desc, image: img, barcode: bar
        });

        // Remember it in our own catalog for fast future lookups
        if (bar) {
            const cat2 = load(LS_CATALOG) || {};
            cat2[bar] = { name, category: cat, price: Number(price), unit, image: img };
            save(LS_CATALOG, cat2);
        }

        showSuccess(name);

        function showReviewError(msg) {
            if (!status) return;
            status.textContent = msg;
            status.className = 'market-scan-status error';
            status.hidden = false;
        }
    }

    function fillMarketProductForm(data) {
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = v == null ? '' : v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        set('marketProductName', data.name);
        set('marketProductCategory', data.category);
        set('marketProductPrice', data.price);
        set('marketProductStock', data.stock);
        set('marketProductUnit', data.unit);

        // Scroll the existing form into view (behind the modal)
        const form = document.getElementById('marketProductForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function showSuccess(name) {
        const body    = $('#msBody', modal);
        const actions = $('#msActions', modal);
        body.innerHTML = `
            <div class="market-scan-success">
                <div class="check"><i class="fas fa-check"></i></div>
                <h3>Added to your product form</h3>
                <p><strong>${esc(name)}</strong> has been filled into the <em>Add a Product</em> panel.</p>
                <p style="font-size:0.82rem;color:#94a3b8;">
                    Review the details there and click <strong>Add Product</strong> to publish it to your shop.
                </p>
            </div>
        `;
        actions.innerHTML = `
            <button type="button" class="market-scan-btn market-scan-btn-primary" data-ms-close>
                <i class="fas fa-check"></i> Done
            </button>
            <button type="button" class="market-scan-btn market-scan-btn-outline" id="msScanAnother">
                <i class="fas fa-plus"></i> Scan Another
            </button>
        `;
        $('#msScanAnother', modal).addEventListener('click', () => switchTab(activeTab));
        toast('Product details filled ✓', 'success');
    }

    function setStatus(msg, type) {
        const s = $('#msStatus', modal);
        if (!s) return;
        s.textContent = msg;
        s.className = 'market-scan-status ' + (type || 'info');
    }

    /* ==============================================================
       PHOTO UPLOAD + OCR
       ============================================================== */
    function wirePhotoUpload() {
        const drop      = $('#msDrop', modal);
        const fileInput = $('#msFile', modal);
        const preview   = $('#msPreview', modal);
        const previewImg= $('#msPreviewImg', modal);
        const removeBtn = modal.querySelector('[data-ms-remove-photo]');

        if (!drop || !fileInput) return;

        drop.addEventListener('click', () => fileInput.click());
        drop.addEventListener('dragover', e => {
            e.preventDefault(); drop.classList.add('dragging');
        });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
        drop.addEventListener('drop', e => {
            e.preventDefault(); drop.classList.remove('dragging');
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) handlePhotoFile(f);
        });
        fileInput.addEventListener('change', () => {
            const f = fileInput.files && fileInput.files[0];
            if (f) handlePhotoFile(f);
        });
        removeBtn && removeBtn.addEventListener('click', () => {
            uploadedImage = null;
            uploadedFile = null;
            preview.hidden = true;
            previewImg.src = '';
            fileInput.value = '';
        });

        async function handlePhotoFile(file) {
            if (!file.type.startsWith('image/')) {
                return toast('Please choose an image file', 'error');
            }
            if (file.size > 10 * 1024 * 1024) {
                return toast('Image too large (max 10 MB)', 'error');
            }

            uploadedFile = file;
            const reader = new FileReader();
            reader.onload = async () => {
                uploadedImage = reader.result;
                previewImg.src = uploadedImage;
                preview.hidden = false;

                await processImage(uploadedImage);
            };
            reader.readAsDataURL(file);
        }
    }

    async function processImage(dataUrl) {
        const ocrWrap = $('#msOcrProgress', modal);
        const ocrBar  = $('#msOcrBar', modal);
        const ocrPct  = $('#msOcrPct', modal);
        if (ocrWrap) ocrWrap.hidden = false;
        const setPct = p => {
            const v = Math.round(p);
            if (ocrBar) ocrBar.style.width = v + '%';
            if (ocrPct) ocrPct.textContent = v + '%';
        };
        setPct(0);

        // 1) Try to detect a barcode in the image
        let barcode = '';
        try {
            if ('BarcodeDetector' in window) {
                setPct(10);
                const img = new Image();
                img.src = dataUrl;
                await new Promise(r => { img.onload = r; img.onerror = r; });
                const formats = BARCODE_FORMATS.concat(QR_FORMATS);
                const det = new window.BarcodeDetector({ formats });
                const results = await det.detect(img);
                if (results && results.length) {
                    barcode = results[0].rawValue;
                }
            }
        } catch {}
        setPct(30);

        // 2) OCR the image
        let ocrText = '';
        try {
            await loadScript(TESSERACT_CDN);
            if (window.Tesseract) {
                setPct(40);
                const { data } = await window.Tesseract.recognize(dataUrl, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                            setPct(40 + m.progress * 55);
                        }
                    }
                });
                ocrText = (data && data.text ? data.text : '').trim();
            }
        } catch {}

        setPct(100);
        setTimeout(() => { if (ocrWrap) ocrWrap.hidden = true; }, 400);

        // 3) Guess the product name from OCR (first non-trivial line)
        const guess = extractProductName(ocrText);

        // 4) If we found a barcode, try lookup (local → OpenFoodFacts)
        if (barcode) {
            const localCatalog = load(LS_CATALOG) || {};
            const demo = DEMO_CATALOG[barcode] || localCatalog[barcode];
            if (demo) {
                openReview({
                    name: demo.name,
                    category: demo.category,
                    price: demo.price,
                    stock: '',
                    unit: '',
                    description: '',
                    image: '',
                    barcode,
                    source: 'photo'
                }, { code: barcode, format: 'image', mode: 'photo' });
                return;
            }
            try {
                const res = await fetch(OFF_ENDPOINT + encodeURIComponent(barcode) + '.json');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.status === 1 && data.product) {
                        const p = data.product;
                        openReview({
                            name: p.product_name || guess || '',
                            category: 'grocery',
                            price: '',
                            stock: '',
                            unit: p.quantity || '',
                            description: [p.brands, p.categories].filter(Boolean).join(' · '),
                            image: p.image_front_url || p.image_url || '',
                            barcode,
                            source: 'photo'
                        }, { code: barcode, format: 'image', mode: 'photo' });
                        return;
                    }
                }
            } catch {}
        }

        // 5) No barcode or no lookup → use OCR guess
        openReview({
            name: guess || '',
            category: guessCategory(guess),
            price: '',
            stock: '',
            unit: '',
            description: '',
            image: '',
            barcode: barcode || '',
            source: 'photo'
        }, { code: barcode || '(no barcode)', format: 'image', mode: 'photo' });
    }

    function extractProductName(text) {
        if (!text) return '';
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // Filter out lines that look like prices, numbers, or noise
        const cleaned = lines.filter(l => {
            if (l.length < 3) return false;
            if (/^[\d\s\W]+$/.test(l)) return false;
            if (/^\$|^\d+[\.,]\d{2}$/.test(l)) return false;
            return true;
        });
        // Prefer lines with more letters
        cleaned.sort((a, b) => {
            const aLetters = (a.match(/[A-Za-z]/g) || []).length;
            const bLetters = (b.match(/[A-Za-z]/g) || []).length;
            return bLetters - aLetters;
        });
        const best = cleaned[0] || lines[0] || '';
        // Cap length
        return best.slice(0, 100);
    }

    /* ==============================================================
       BULK IMPORT
       ============================================================== */
    function wireBulkUpload() {
        const drop    = $('#msBulkDrop', modal);
        const fileIn  = $('#msBulkFile', modal);
        const preview = $('#msBulkPreview', modal);
        const status  = $('#msBulkStatus', modal);
        const confirm = $('#msBulkConfirm', modal);

        if (!drop || !fileIn) return;

        drop.addEventListener('click', () => fileIn.click());
        drop.addEventListener('dragover', e => {
            e.preventDefault(); drop.classList.add('dragging');
        });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
        drop.addEventListener('drop', e => {
            e.preventDefault(); drop.classList.remove('dragging');
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) handleFile(f);
        });
        fileIn.addEventListener('change', () => {
            const f = fileIn.files && fileIn.files[0];
            if (f) handleFile(f);
        });

        async function handleFile(file) {
            if (file.size > 2 * 1024 * 1024) {
                return toast('File too large (max 2 MB)', 'error');
            }
            const text = await file.text();
            let rows = [];

            try {
                if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[')) {
                    const parsed = JSON.parse(text);
                    if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
                    rows = parsed;
                } else {
                    rows = parseCSV(text);
                }
            } catch (err) {
                if (status) {
                    status.className = 'market-scan-status error';
                    status.textContent = 'Could not parse file: ' + err.message;
                }
                return;
            }

            rows = rows.slice(0, 500).filter(r => r && (r.name || r.title || r.product_name));

            if (!rows.length) {
                if (status) {
                    status.className = 'market-scan-status error';
                    status.textContent = 'No usable rows found. Each row needs at least a name.';
                }
                return;
            }

            lastBulkRows = rows;
            if (preview) {
                preview.hidden = false;
                preview.textContent =
                    rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' parsed · preview:\n\n' +
                    JSON.stringify(rows.slice(0, 3), null, 2);
            }
            if (status) {
                status.className = 'market-scan-status';
                status.textContent = rows.length + ' rows ready to import.';
            }
            if (confirm) confirm.disabled = false;
        }

        if (confirm) {
            confirm.addEventListener('click', () => {
                if (!lastBulkRows || !lastBulkRows.length) return;
                // Fill the existing form with the first row and show count
                const first = lastBulkRows[0];
                fillMarketProductForm({
                    name: first.name || first.title || first.product_name || '',
                    category: first.category || '',
                    price: first.price || '',
                    stock: first.stock || first.quantity || '',
                    unit: first.unit || '',
                    description: first.description || '',
                    image: first.image || first.image_url || '',
                    barcode: first.barcode || ''
                });

                // Cache all rows into our local catalog
                const cat = load(LS_CATALOG) || {};
                lastBulkRows.forEach(r => {
                    const barcode = r.barcode || r.upc || r.code;
                    if (barcode) {
                        cat[barcode] = {
                            name: r.name || r.title || r.product_name || '',
                            category: r.category || '',
                            price: Number(r.price || 0) || 0,
                            unit: r.unit || '',
                            image: r.image || r.image_url || ''
                        };
                    }
                });
                save(LS_CATALOG, cat);

                toast(lastBulkRows.length + ' items saved to catalog', 'success');
                showSuccess(first.name || 'First item');
            });
        }
    }

    // Minimal but correct CSV parser (handles quoted commas and quotes)
    function parseCSV(text) {
        const rows = [];
        let cur = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (c === '"' && next === '"') { field += '"'; i++; }
                else if (c === '"') { inQuotes = false; }
                else { field += c; }
            } else {
                if (c === '"') { inQuotes = true; }
                else if (c === ',') { cur.push(field); field = ''; }
                else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
                else if (c === '\r') { /* ignore */ }
                else { field += c; }
            }
        }
        if (field.length || cur.length) { cur.push(field); rows.push(cur); }
        if (!rows.length) return [];

        const header = rows[0].map(h => h.trim().toLowerCase());
        return rows.slice(1)
            .filter(r => r.some(x => x !== ''))
            .map(r => {
                const obj = {};
                header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
                return obj;
            });
    }

    /* ==============================================================
       MODAL OPEN / CLOSE
       ============================================================== */
    function openModal() {
        if (!modal) buildModal();
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        lastScanned = null;
        lastBulkRows = null;
        uploadedImage = null;
        uploadedFile = null;
        switchTab('barcode');
    }

    function closeModal() {
        if (!modal) return;
        stopCamera();
        modal.hidden = true;
        document.body.style.overflow = '';
    }

    /* ==============================================================
       INIT
       ============================================================== */
    function init() {
        // Inject CSS if it's not been added manually
        if (!document.querySelector('link[href*="market-scan.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/market-scan.css';
            document.head.appendChild(link);
        }
        buildModal();
        watchForVendorPanel();

        // Expose public API
        window.MarketScan = {
            open: openModal,
            close: closeModal,
            addTriggerButton: injectTriggerButton
        };

        // Global click handler for any external [data-action="openMarketScan"]
        document.addEventListener('click', e => {
            const t = e.target.closest('[data-action="openMarketScan"]');
            if (t) { e.preventDefault(); openModal(); }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();