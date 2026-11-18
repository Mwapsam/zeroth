
/* ================================================================
   EDUCATION LIBRARY — with cover images
   ================================================================ */
(function () {
    'use strict';

    /* ---------- State ---------- */
    let eduCoverDataUrl = null;
    let libraryBooks    = [];
    let activeFilter    = 'all';

    const STORAGE_KEY = 'zbs_education_library_v2';

    /* ---------- Utilities ---------- */
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }

    function fmtPrice(price) {
        const n = Number(price) || 0;
        if (n <= 0) return 'Free';
        return 'ZMW ' + n.toLocaleString('en-ZM', { minimumFractionDigits: 0 });
    }

    function eduStatus(msg, type = 'info') {
        const el = document.getElementById('eduUploadStatus');
        if (!el) return;
        if (!msg) { el.hidden = true; el.textContent = ''; return; }
        el.hidden = false;
        el.textContent = msg;
        el.dataset.type = type;
    }

    /* ---------- Persistence ---------- */
    function loadBooks() {
        try {
            libraryBooks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(libraryBooks)) libraryBooks = [];
        } catch (e) {
            libraryBooks = [];
        }
    }

    function saveBooks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryBooks));
        } catch (e) {
            console.warn('[edu-library] Could not save books:', e);
        }
    }

    /* ---------- Cover picker ---------- */
    function initCoverPicker() {
        const picker      = document.getElementById('eduCoverPicker');
        const input       = document.getElementById('eduCoverInput');
        const placeholder = document.getElementById('eduCoverPlaceholder');
        const preview     = document.getElementById('eduCoverPreview');
        const previewImg  = document.getElementById('eduCoverPreviewImg');
        const removeBtn   = document.getElementById('eduCoverRemove');

        if (!picker || picker.dataset.wired === '1') return;
        picker.dataset.wired = '1';

        picker.addEventListener('click', (e) => {
            if (e.target.closest('#eduCoverRemove')) return;
            input.click();
        });

        picker.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
        });
        picker.tabIndex = 0;
        picker.setAttribute('role', 'button');
        picker.setAttribute('aria-label', 'Add cover image');

        picker.addEventListener('dragover', (e) => {
            e.preventDefault();
            picker.style.borderColor = '#1f7a3d';
        });
        picker.addEventListener('dragleave', () => {
            picker.style.borderColor = '';
        });
        picker.addEventListener('drop', (e) => {
            e.preventDefault();
            picker.style.borderColor = '';
            const file = e.dataTransfer?.files?.[0];
            if (file) handleCoverFile(file);
        });

        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (file) handleCoverFile(file);
        });

        function handleCoverFile(file) {
            if (!file.type.startsWith('image/')) {
                eduStatus('Cover must be an image file', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                eduStatus('Cover image must be under 2 MB', 'error');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                eduCoverDataUrl = ev.target.result;
                previewImg.src = eduCoverDataUrl;
                placeholder.hidden = true;
                preview.hidden = false;
                eduStatus('');
            };
            reader.readAsDataURL(file);
        }

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            eduCoverDataUrl = null;
            input.value = '';
            previewImg.src = '';
            preview.hidden = true;
            placeholder.hidden = false;
        });
    }

    function resetUploadForm() {
        eduCoverDataUrl = null;
        const map = {
            eduUploadTitle: '',
            eduUploadAuthor: '',
            eduUploadPrice: '0',
            eduUploadCategory: 'general',
            eduPdfSingleInput: '',
            eduCoverInput: ''
        };
        Object.keys(map).forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'file') el.value = '';
            else el.value = map[id];
        });
        const prev = document.getElementById('eduCoverPreview');
        const ph   = document.getElementById('eduCoverPlaceholder');
        if (prev) prev.hidden = true;
        if (ph)   ph.hidden = false;
        eduStatus('');
    }

    function openUploadForm() {
        const form = document.getElementById('eduUploadForm');
        if (!form) return;
        form.hidden = false;
        initCoverPicker();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('eduUploadTitle')?.focus();
    }

    function closeUploadForm() {
        const form = document.getElementById('eduUploadForm');
        if (form) form.hidden = true;
        resetUploadForm();
    }

    /* ---------- Upload submit ---------- */
    async function submitUpload() {
        const title   = (document.getElementById('eduUploadTitle')?.value || '').trim();
        const author  = (document.getElementById('eduUploadAuthor')?.value || '').trim();
        const price   = parseFloat(document.getElementById('eduUploadPrice')?.value) || 0;
        const category= document.getElementById('eduUploadCategory')?.value || 'general';
        const pdfFile = document.getElementById('eduPdfSingleInput')?.files?.[0];

        if (!title)  return eduStatus('Title is required', 'error');
        if (!pdfFile) return eduStatus('Please select a PDF file', 'error');
        if (pdfFile.type !== 'application/pdf') return eduStatus('File must be a PDF', 'error');
        if (pdfFile.size > 50 * 1024 * 1024) return eduStatus('PDF must be under 50 MB', 'error');

        eduStatus('Uploading…', 'info');
        const btn = document.getElementById('eduUploadSubmit');
        if (btn) btn.disabled = true;

        try {
            const pdfReader = new FileReader();
            const pdfDataUrl = await new Promise((resolve, reject) => {
                pdfReader.onload = (ev) => resolve(ev.target.result);
                pdfReader.onerror = reject;
                pdfReader.readAsDataURL(pdfFile);
            });

            const book = {
                id:         'lib_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                title,
                author:     author || 'Unknown author',
                price,
                category,
                type:       price > 0 ? 'paid' : 'free',
                coverImage: eduCoverDataUrl || null,   // ← the cover
                fileDataUrl: pdfDataUrl,
                fileName:   pdfFile.name,
                fileSize:   pdfFile.size,
                uploadedAt: new Date().toISOString()
            };

            // If you have a backend, upload here:
            // const res = await API.uploadLibraryBook(book);
            // book.coverImage = res.coverUrl;
            // book.fileUrl   = res.fileUrl;
            // book.fileDataUrl = null;

            libraryBooks.unshift(book);
            saveBooks();
            renderLibrary();
            eduStatus('Uploaded successfully ✔', 'success');
            setTimeout(() => { closeUploadForm(); }, 900);
        } catch (err) {
            console.error('[edu-library] Upload failed:', err);
            eduStatus('Upload failed — please try again', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /* ---------- Render library card ---------- */
    function libraryCardHtml(book) {
        const initial = (book.title || '?').trim().charAt(0).toUpperCase() || '📘';
        const cover = book.coverImage
            ? `<div class="edu-lib-cover" style="background-image:url('${escapeHtml(book.coverImage)}')"></div>`
            : `<div class="edu-lib-cover edu-lib-cover--fallback">${escapeHtml(initial)}</div>`;

        const priceClass = book.price > 0 ? 'is-paid' : '';
        return `
            <div class="edu-lib-card" data-book-id="${escapeHtml(book.id)}" role="button" tabindex="0">
                ${cover}
                <div class="edu-lib-body">
                    <h4 class="edu-lib-title">${escapeHtml(book.title)}</h4>
                    <p class="edu-lib-author">${escapeHtml(book.author)}</p>
                    <div class="edu-lib-meta-row">
                        <span class="edu-lib-price ${priceClass}">${fmtPrice(book.price)}</span>
                        <span class="edu-lib-type">${escapeHtml(book.category || 'general')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderLibrary() {
        const grid  = document.getElementById('grid-library');
        const empty = document.getElementById('empty-library');
        const count = document.getElementById('countLibrary');
        if (!grid) return;

        const searchQ = (document.getElementById('eduSearchInput')?.value || '').trim().toLowerCase();

        let filtered = libraryBooks.slice();
        if (activeFilter === 'free') filtered = filtered.filter(b => !b.price || b.price <= 0);
        if (activeFilter === 'paid') filtered = filtered.filter(b => b.price > 0);
        if (searchQ) {
            filtered = filtered.filter(b =>
                (b.title  || '').toLowerCase().includes(searchQ) ||
                (b.author || '').toLowerCase().includes(searchQ) ||
                (b.category || '').toLowerCase().includes(searchQ)
            );
        }

        grid.innerHTML = filtered.map(libraryCardHtml).join('');

        if (empty) empty.hidden = filtered.length > 0;
        if (count) count.textContent = filtered.length;

        // wire click handlers
        grid.querySelectorAll('.edu-lib-card').forEach((card) => {
            card.addEventListener('click', () => openBookDetail(card.dataset.bookId));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBookDetail(card.dataset.bookId);
                }
            });
        });
    }

    /* ---------- Book detail (optional preview) ---------- */
    function openBookDetail(bookId) {
        const book = libraryBooks.find(b => b.id === bookId);
        if (!book) return;

        // If you have a #libDetailModal, populate it. Otherwise download/open.
        if (book.fileDataUrl) {
            // In a real app, open in a PDF viewer. For demo, download it.
            const w = window.open();
            if (w) {
                w.document.write(
                    `<title>${escapeHtml(book.title)}</title>` +
                    `<iframe src="${book.fileDataUrl}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`
                );
            }
        }
        // Hook here to open your detail modal if you have one.
    }

    /* ---------- Bulk PDF download ---------- */
    function downloadAllFreePdfs() {
        const free = libraryBooks.filter(b => !b.price || b.price <= 0);
        if (!free.length) {
            eduStatus('No free PDFs in the library', 'info');
            return;
        }
        free.forEach((book, i) => {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = book.fileDataUrl;
                a.download = book.fileName || (book.title + '.pdf');
                document.body.appendChild(a);
                a.click();
                a.remove();
            }, i * 400);
        });
    }

    /* ---------- Wiring ---------- */
    function wireEvents() {
        // filters
        document.querySelectorAll('.edu-lib-filter').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.edu-lib-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter || 'all';
                renderLibrary();
            });
        });

        // open/close upload form
        document.getElementById('eduUploadFormClose')?.addEventListener('click', closeUploadForm);
        document.getElementById('eduUploadCancel')?.addEventListener('click', closeUploadForm);
        document.getElementById('eduUploadSubmit')?.addEventListener('click', submitUpload);

        // download button
        document.querySelector('[data-action="eduDownloadAllPdfs"]')
            ?.addEventListener('click', downloadAllFreePdfs);

        // search re-filter
        document.getElementById('eduSearchInput')?.addEventListener('input', () => {
            const activePanel = document.querySelector('.edu-panel.active');
            if (activePanel && activePanel.dataset.panel === 'library') renderLibrary();
        });
    }

    /* ---------- Hook into delegated action system ---------- */
    // The main app uses data-action="eduOpenUploadForm" — bridge it here.
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action="eduOpenUploadForm"]');
        if (el) {
            e.preventDefault();
            // Make sure the Library tab is active
            document.querySelectorAll('.edu-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.edu-tab[data-tab="library"]')?.classList.add('active');
            document.querySelectorAll('.edu-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('panel-library')?.classList.add('active');
            openUploadForm();
        }
    });

    /* ---------- Boot ---------- */
    function boot() {
        loadBooks();
        initCoverPicker();
        renderLibrary();
        wireEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Expose for other modules (e.g. if the modal opens later)
    window.ZBSEducationLibrary = {
        render: renderLibrary,
        openUploadForm,
        getBooks: () => libraryBooks.slice()
    };
})();
/* ================================================================
   EDUCATION HUB — LIBRARY
   Handles: cover picker, upload form, library render, filters,
            search, download-all, tab switching, delete, open PDF.
   ================================================================ */
(function initEducationLibrary(){
  'use strict';

  // Guard: run only once even if script is loaded twice
  if (window.__zbsEduLibraryInitialised) return;
  window.__zbsEduLibraryInitialised = true;

  // ---------- Config ----------
  const MAX_COVER_BYTES = 2 * 1024 * 1024;                 // 2 MB
  const MAX_PDF_BYTES   = 50 * 1024 * 1024;                // 50 MB
  const COVER_TYPES     = ['image/jpeg','image/png','image/webp'];
  const STORAGE_KEY     = 'zbs.edu.library.v2';

  // ---------- Element refs ----------
  const modal        = document.getElementById('educationModal');
  if (!modal) return;

  const form         = document.getElementById('eduUploadBookForm');
  const uploadForm   = document.getElementById('eduUploadForm');
  const uploadStatus = document.getElementById('eduUploadStatus');
  const submitBtn    = document.getElementById('eduUploadSubmitBtn');
  const cancelBtn    = document.getElementById('eduUploadCancelBtn');
  const closeFormBtn = document.getElementById('eduUploadFormClose');

  const coverPicker      = document.getElementById('eduCoverPicker');
  const coverInput       = document.getElementById('eduCoverInput');
  const coverPlaceholder = document.getElementById('eduCoverPlaceholder');
  const coverPreview     = document.getElementById('eduCoverPreview');
  const coverImg         = document.getElementById('eduCoverPreviewImg');
  const coverRemove      = document.getElementById('eduCoverRemove');

  const titleInput   = document.getElementById('eduUploadTitle');
  const authorInput  = document.getElementById('eduUploadAuthor');
  const priceInput   = document.getElementById('eduUploadPrice');
  const categorySel  = document.getElementById('eduUploadCategory');
  const pdfInput     = document.getElementById('eduPdfSingleInput');

  const libraryGrid  = document.getElementById('grid-library');
  const emptyLib     = document.getElementById('empty-library');
  const countLib     = document.getElementById('countLibrary');
  const searchInput  = document.getElementById('eduSearchInput');

  if (!form || !libraryGrid) return;

  // ---------- State ----------
  let coverFile    = null;          // { file, dataUrl } | null
  let library      = loadLibrary(); // book records
  let activeFilter = 'all';
  let searchTerm   = '';

  // ================================================================
  //  PERSISTENCE  (swap for API calls when you have a backend)
  // ================================================================
  function loadLibrary(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveLibrary(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(library)); }
    catch (e) {
      console.warn('[edu] could not persist library', e);
      showUploadStatus('error', 'Storage is full — remove some books first.');
    }
  }

  // ================================================================
  //  TAB SWITCHING (library-related only)
  // ================================================================
  document.querySelectorAll('#educationModal .edu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#educationModal .edu-tab')
        .forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');

      const name = tab.dataset.tab;
      document.querySelectorAll('#educationModal .edu-panel')
        .forEach(p => p.classList.toggle('active', p.dataset.panel === name));

      if (name === 'library') renderLibrary();
    });
  });

  // ================================================================
  //  COVER PICKER
  // ================================================================
  coverPicker.addEventListener('click', (e) => {
    if (e.target.closest('#eduCoverRemove')) return;
    coverInput.click();
  });

  coverPicker.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      coverInput.click();
    }
  });

  ['dragenter','dragover'].forEach(ev =>
    coverPicker.addEventListener(ev, e => {
      e.preventDefault(); coverPicker.classList.add('dragover');
    })
  );
  ['dragleave','drop'].forEach(ev =>
    coverPicker.addEventListener(ev, e => {
      e.preventDefault(); coverPicker.classList.remove('dragover');
    })
  );
  coverPicker.addEventListener('drop', e => {
    const f = e.dataTransfer.files?.[0];
    if (f) handleCoverFile(f);
  });

  coverInput.addEventListener('change', () => {
    const f = coverInput.files?.[0];
    if (f) handleCoverFile(f);
  });

  coverRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCover();
  });

  function handleCoverFile(file){
    if (!COVER_TYPES.includes(file.type)){
      showUploadStatus('error', 'Please choose a JPG, PNG or WEBP image.');
      resetCover(); return;
    }
    if (file.size > MAX_COVER_BYTES){
      showUploadStatus('error', 'Cover image must be 2 MB or smaller.');
      resetCover(); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      coverFile = { file, dataUrl: reader.result };
      coverImg.src = reader.result;
      coverPlaceholder.hidden = true;
      coverPreview.hidden = false;
      clearUploadStatus();
    };
    reader.onerror = () => {
      showUploadStatus('error', 'Could not read that image.');
      resetCover();
    };
    reader.readAsDataURL(file);
  }

  function resetCover(){
    coverFile = null;
    coverInput.value = '';
    coverImg.removeAttribute('src');
    coverPreview.hidden = true;
    coverPlaceholder.hidden = false;
  }

  // ================================================================
  //  UPLOAD FORM OPEN / CLOSE
  // ================================================================
  document.querySelectorAll('[data-action="eduOpenUploadForm"]').forEach(btn =>
    btn.addEventListener('click', openUploadForm)
  );
  closeFormBtn?.addEventListener('click', closeUploadForm);
  cancelBtn?.addEventListener('click', closeUploadForm);

  function openUploadForm(){
    uploadForm.hidden = false;
    clearUploadStatus();
    titleInput.focus();
  }
  function closeUploadForm(){
    uploadForm.hidden = true;
    form.reset();
    resetCover();
    clearUploadStatus();
  }

  // ================================================================
  //  SUBMIT
  // ================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearUploadStatus();

    const title    = (titleInput.value || '').trim();
    const author   = (authorInput.value || '').trim();
    const price    = Math.max(0, Number(priceInput.value) || 0);
    const category = categorySel.value || 'general';
    const pdfFile  = pdfInput.files?.[0];

    if (!title){ showUploadStatus('error','Please enter a title.'); titleInput.focus(); return; }
    if (!pdfFile){ showUploadStatus('error','Please choose a PDF file.'); pdfInput.focus(); return; }
    if (pdfFile.type !== 'application/pdf' && !/\.pdf$/i.test(pdfFile.name)){
      showUploadStatus('error','The file must be a PDF.'); return;
    }
    if (pdfFile.size > MAX_PDF_BYTES){
      showUploadStatus('error','PDF must be 50 MB or smaller.'); return;
    }

    submitBtn.disabled = true;
    showUploadStatus('info', 'Saving book…');

    try {
      const pdfDataUrl = await readFileAsDataURL(pdfFile);

      const record = {
        id: 'book_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
        title, author, price, category,
        coverDataUrl: coverFile?.dataUrl || null,
        pdfDataUrl,
        pdfName: pdfFile.name,
        createdAt: new Date().toISOString()
      };

      library.unshift(record);
      saveLibrary();
      renderLibrary();

      showUploadStatus('success', `“${title}” added to the library.`);
      form.reset();
      resetCover();

      setTimeout(closeUploadForm, 900);
    } catch (err) {
      console.error('[edu] upload failed', err);
      showUploadStatus('error', 'Could not save the book. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  // ================================================================
  //  RENDER LIBRARY
  // ================================================================
  function renderLibrary(){
    if (!libraryGrid) return;

    const filtered = library.filter(b => {
      if (activeFilter === 'free' && Number(b.price) > 0) return false;
      if (activeFilter === 'paid' && Number(b.price) <= 0) return false;
      if (searchTerm){
        const hay = ((b.title||'') + ' ' + (b.author||'') + ' ' + (b.category||'')).toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    if (countLib) countLib.textContent = library.length;
    libraryGrid.innerHTML = '';

    if (filtered.length === 0){
      if (emptyLib){
        emptyLib.hidden = false;
        if (library.length === 0){
          emptyLib.innerHTML =
            '<i class="fas fa-book-open"></i>' +
            '<p>No books in the library yet.</p>' +
            '<small>Click <strong>Upload PDF</strong> to add your first book.</small>';
        } else {
          emptyLib.innerHTML =
            '<i class="fas fa-filter"></i>' +
            '<p>No books match your filter or search.</p>' +
            '<small>Try clearing the filter or search term.</small>';
        }
      }
      return;
    }
    if (emptyLib) emptyLib.hidden = true;

    const frag = document.createDocumentFragment();
    filtered.forEach(book => frag.appendChild(buildBookCard(book)));
    libraryGrid.appendChild(frag);
  }

  function buildBookCard(book){
    const card = document.createElement('article');
    card.className = 'edu-book-card';

    // Cover
    const coverWrap = document.createElement('div');
    coverWrap.className = 'edu-book-cover';
    if (book.coverDataUrl){
      const img = document.createElement('img');
      img.src = book.coverDataUrl;
      img.alt = (book.title || 'Book') + ' cover';
      img.loading = 'lazy';
      coverWrap.appendChild(img);
    } else {
      const fb = document.createElement('i');
      fb.className = 'fas fa-book edu-book-cover-fallback';
      coverWrap.appendChild(fb);
    }
    const cat = document.createElement('span');
    cat.className = 'edu-book-cat';
    cat.textContent = book.category || 'general';
    coverWrap.appendChild(cat);

    // Body
    const body = document.createElement('div');
    body.className = 'edu-book-body';

    const t = document.createElement('h3');
    t.className = 'edu-book-title';
    t.textContent = book.title || '(Untitled)';

    const a = document.createElement('p');
    a.className = 'edu-book-author';
    a.textContent = book.author || 'Unknown author';

    const meta = document.createElement('div');
    meta.className = 'edu-book-meta';

    const price = document.createElement('span');
    price.className = 'edu-book-price' + (Number(book.price) > 0 ? '' : ' free');
    price.textContent = Number(book.price) > 0
      ? 'ZMW ' + Number(book.price).toFixed(2)
      : 'FREE';

    const actions = document.createElement('div');
    actions.className = 'edu-book-actions';

    const dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'edu-book-download';
    dl.innerHTML = '<i class="fas fa-book-open"></i> Open';
    dl.addEventListener('click', () => openBook(book));

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'edu-book-remove';
    rm.title = 'Remove from library';
    rm.setAttribute('aria-label', 'Remove ' + (book.title || 'this book'));
    rm.innerHTML = '<i class="fas fa-trash"></i>';
    rm.addEventListener('click', () => {
      if (confirm(`Remove "${book.title || 'this book'}" from your library?`)){
        library = library.filter(x => x.id !== book.id);
        saveLibrary();
        renderLibrary();
      }
    });

    actions.append(dl, rm);
    meta.append(price, actions);
    body.append(t, a, meta);
    card.append(coverWrap, body);
    return card;
  }

  // ================================================================
  //  OPEN A BOOK
  // ================================================================
  function openBook(book){
    if (!book.pdfDataUrl){
      alert('This book has no file attached.');
      return;
    }
    try {
      const blob = dataUrlToBlob(book.pdfDataUrl);
      const url  = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w){
        alert('Please allow pop-ups to open this PDF.');
        URL.revokeObjectURL(url);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (err){
      console.error(err);
      alert('Could not open this book.');
    }
  }

  function dataUrlToBlob(dataUrl){
    const [head, b64] = dataUrl.split(',');
    const mime = /:(.*?);/.exec(head)[1];
    const bin  = atob(b64);
    const len  = bin.length;
    const buf  = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: mime });
  }

  // ================================================================
  //  FILTERS + SEARCH
  // ================================================================
  document.querySelectorAll('#panel-library .edu-lib-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#panel-library .edu-lib-filter')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      renderLibrary();
    });
  });

  if (searchInput){
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      // Auto-switch to library tab if user types while on another tab
      const libTab = document.querySelector('#educationModal .edu-tab[data-tab="library"]');
      if (libTab && !libTab.classList.contains('active') && searchTerm){
        libTab.click();
      } else {
        renderLibrary();
      }
    });
  }

  // ================================================================
  //  DOWNLOAD ALL FREE PDFs
  // ================================================================
  document.querySelectorAll('[data-action="eduDownloadAllPdfs"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const free = library.filter(b => Number(b.price) === 0 && b.pdfDataUrl);
      if (free.length === 0){
        alert('There are no free PDFs in the library yet.');
        return;
      }
      free.forEach((book, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = book.pdfDataUrl;
          a.download = book.pdfName || (book.title + '.pdf');
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 400);
      });
    });
  });

  // ================================================================
  //  STATUS HELPERS
  // ================================================================
  function showUploadStatus(kind, msg){
    if (!uploadStatus) return;
    uploadStatus.hidden = false;
    uploadStatus.className = 'edu-upload-status';
    if (kind === 'error')   uploadStatus.classList.add('is-error');
    if (kind === 'success') uploadStatus.classList.add('is-success');
    if (kind === 'info')    uploadStatus.classList.add('is-info');
    uploadStatus.textContent = msg;
  }
  function clearUploadStatus(){
    if (!uploadStatus) return;
    uploadStatus.hidden = true;
    uploadStatus.textContent = '';
    uploadStatus.className = 'edu-upload-status';
  }

  // ================================================================
  //  BOOT
  // ================================================================
  renderLibrary();
})();