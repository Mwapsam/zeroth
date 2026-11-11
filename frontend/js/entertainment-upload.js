/* =========================================================
   entertainment-upload.js  (responsive rewrite)
   - Injects its own modal + CSS if not present
   - Handles: user/admin modes, drag & drop, validation,
     preview, progress, IndexedDB persistence, grid insert
   Public API: window.ZBSUpload = { open, close, list, remove, clear }
   ========================================================= */
(function () {
  'use strict';

  var MAX_FILE_BYTES = 500 * 1024 * 1024;
  var ADMIN_KEY      = 'zbs-admin';
  var DB_NAME        = 'zbs_entertainment';
  var DB_STORE       = 'uploads';
  var DB_VERSION     = 1;
  var ACCEPTED_TYPES = ['video/', 'audio/', 'image/'];

  var pendingFile  = null;
  var adminMode    = false;
  var uploading    = false;
  var db           = null;
  var memoryStore  = Object.create(null);
  var el           = {};
  var injectedCss  = false;

  /* ---------- helpers ---------- */
  function $(s, r){ return (r||document).querySelector(s); }
  function uid(){ return 'u_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function humanSize(b){
    if (!b) return '0 B';
    var u = ['B','KB','MB','GB'], i = 0;
    while (b >= 1024 && i < u.length-1){ b /= 1024; i++; }
    return b.toFixed(b >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
  }
  function fileKind(f){
    if (!f) return 'unknown';
    var t = f.type || '';
    if (t.indexOf('video/') === 0) return 'video';
    if (t.indexOf('audio/') === 0) return 'audio';
    if (t.indexOf('image/') === 0) return 'image';
    return 'unknown';
  }
  function isAccepted(f){
    if (!f) return false;
    var t = f.type || '';
    return ACCEPTED_TYPES.some(function(p){ return t.indexOf(p) === 0; });
  }

  /* ---------- responsive CSS (injected once) ---------- */
  function injectCSS(){
    if (injectedCss) return;
    injectedCss = true;
    var css = '\
      #entUploadModal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .18s ease;}\
      #entUploadModal.show{opacity:1;}\
      #entUploadModal[hidden]{display:none !important;}\
      .ent-up-shell{position:relative;width:100%;max-width:640px;max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;transform:translateY(8px);transition:transform .2s ease;}\
      #entUploadModal.show .ent-up-shell{transform:translateY(0);}\
      .ent-up-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(135deg,#1f7a3d,#2e9c50);color:#fff;flex-shrink:0;}\
      .ent-up-head h3{margin:0;font-size:1.02rem;font-weight:600;display:flex;align-items:center;gap:8px;}\
      .ent-up-close{margin-left:auto;background:rgba(255,255,255,.18);border:0;color:#fff;width:38px;height:38px;border-radius:50%;font-size:1.15rem;cursor:pointer;display:grid;place-items:center;}\
      .ent-up-close:hover{background:rgba(255,255,255,.32);}\
      .ent-up-body{padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:14px;}\
      .ent-up-field{display:flex;flex-direction:column;gap:6px;}\
      .ent-up-field label{font-size:.85rem;font-weight:600;color:#1e2b24;}\
      .ent-up-field input[type=text],.ent-up-field input[type=password],.ent-up-field textarea,.ent-up-field select{width:100%;padding:12px 14px;font-size:1rem;border:1.5px solid #d9e2dc;border-radius:12px;background:#fff;color:#1e2b24;outline:none;transition:border-color .15s,box-shadow .15s;}\
      .ent-up-field input:focus,.ent-up-field textarea:focus,.ent-up-field select:focus{border-color:#1f7a3d;box-shadow:0 0 0 3px rgba(31,122,61,.12);}\
      .ent-up-field textarea{resize:vertical;min-height:70px;}\
      .ent-up-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}\
      @media (max-width:520px){.ent-up-row{grid-template-columns:1fr;}}\
      .ent-up-drop{border:2px dashed #b7e0c4;background:#f3fbf5;border-radius:14px;padding:22px 16px;text-align:center;color:#1f7a3d;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:120px;justify-content:center;}\
      .ent-up-drop i{font-size:1.5rem;}\
      .ent-up-drop small{font-weight:400;font-size:.76rem;color:#5b6b61;}\
      .ent-up-drop.is-dragover{background:#e5f5ea;border-color:#1f7a3d;}\
      .ent-up-preview{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e2e8e5;border-radius:12px;background:#fafcfa;}\
      .ent-up-preview i{font-size:1.4rem;color:#1f7a3d;}\
      .ent-up-preview-text{flex:1;min-width:0;}\
      .ent-up-preview-name{font-weight:600;font-size:.9rem;color:#1e2b24;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\
      .ent-up-preview-size{font-size:.75rem;color:#5b6b61;}\
      .ent-up-remove{background:#fde8e8;border:0;color:#c0392b;width:36px;height:36px;border-radius:50%;cursor:pointer;display:grid;place-items:center;flex-shrink:0;}\
      .ent-up-remove:hover{background:#f9d5d5;}\
      .ent-up-progress{height:10px;background:#e9f0eb;border-radius:999px;overflow:hidden;}\
      .ent-up-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#1f7a3d,#2e9c50);transition:width .18s ease;}\
      .ent-up-progress-text{font-size:.72rem;color:#5b6b61;text-align:right;}\
      .ent-up-status{padding:10px 12px;border-radius:10px;font-size:.86rem;}\
      .ent-up-status.error{background:#fde8e8;color:#b03030;}\
      .ent-up-status.success{background:#e6f6ec;color:#1f7a3d;}\
      .ent-up-status.warn{background:#fef7e0;color:#a06800;}\
      .ent-up-check{display:flex;align-items:flex-start;gap:8px;font-size:.85rem;color:#1e2b24;line-height:1.4;}\
      .ent-up-check input{margin-top:3px;flex-shrink:0;width:18px;height:18px;accent-color:#1f7a3d;}\
      .ent-up-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 16px;border-top:1px solid #eef2f0;background:#fff;flex-shrink:0;padding-bottom:calc(14px + env(safe-area-inset-bottom));}\
      .ent-up-btn{padding:12px 20px;font-size:.95rem;font-weight:600;border-radius:10px;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:44px;}\
      .ent-up-btn-primary{background:#1f7a3d;color:#fff;}\
      .ent-up-btn-primary:hover{background:#19612f;}\
      .ent-up-btn-primary:disabled{opacity:.7;cursor:not-allowed;}\
      .ent-up-btn-ghost{background:#f1f5f9;color:#475569;}\
      .ent-up-btn-ghost:hover{background:#e2e8f0;}\
      .ent-up-admin-badge{display:inline-block;background:rgba(255,255,255,.22);padding:2px 8px;border-radius:999px;font-size:.65rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-left:6px;}\
      @media (max-width:420px){.ent-up-head{padding:12px 14px;}.ent-up-body{padding:14px;gap:12px;}.ent-up-foot{padding:12px 14px;flex-direction:column-reverse;}.ent-up-btn{width:100%;justify-content:center;}}\
    ';
    var s = document.createElement('style');
    s.id = 'ent-up-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- inject markup if missing ---------- */
  function injectModal(){
    if (document.getElementById('entUploadModal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'entUploadModal';
    wrap.hidden = true;
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-labelledby','uploadTitle');
    wrap.innerHTML = '\
      <div class="ent-up-shell">\
        <div class="ent-up-head">\
          <h3><i id="uploadIcon" class="fas fa-cloud-upload-alt"></i>\
            <span id="uploadTitle">Upload Content</span>\
            <span class="ent-up-admin-badge" id="uploadModeBadge" hidden>Admin</span>\
          </h3>\
          <button type="button" class="ent-up-close" data-action="closeUploadModal" aria-label="Close">&times;</button>\
        </div>\
        <form id="uploadForm" novalidate>\
          <div class="ent-up-body">\
            <div class="ent-up-field" id="adminKeyGroup" hidden>\
              <label for="uploadAdminKey">Admin Access Key *</label>\
              <input type="password" id="uploadAdminKey" autocomplete="off" placeholder="Enter admin key">\
            </div>\
            <div class="ent-up-row">\
              <div class="ent-up-field">\
                <label for="uploadType">Category *</label>\
                <select id="uploadType" required>\
                  <option value="cartoons">🎬 Cartoon</option>\
                  <option value="music">🎵 Music</option>\
                  <option value="movies">🎥 Movie</option>\
                </select>\
              </div>\
              <div class="ent-up-field">\
                <label for="uploadArtist">Artist / Studio</label>\
                <input type="text" id="uploadArtist" maxlength="80" placeholder="Optional">\
              </div>\
            </div>\
            <div class="ent-up-field">\
              <label for="uploadTitleInput">Title *</label>\
              <input type="text" id="uploadTitleInput" maxlength="120" required placeholder="e.g. Tom & Jerry — Episode 12">\
            </div>\
            <div class="ent-up-field">\
              <label for="uploadDescription">Description</label>\
              <textarea id="uploadDescription" rows="2" maxlength="300" placeholder="Optional short description"></textarea>\
            </div>\
            <div class="ent-up-drop" id="fileDropZone">\
              <i class="fas fa-cloud-upload-alt"></i>\
              <span>Tap to choose or drop a file here</span>\
              <small>Video, audio or image · up to 500 MB</small>\
              <input type="file" id="uploadFile" accept="video/*,audio/*,image/*" hidden>\
            </div>\
            <div class="ent-up-preview" id="filePreview" hidden>\
              <i id="fileIcon" class="fas fa-file"></i>\
              <div class="ent-up-preview-text">\
                <div class="ent-up-preview-name" id="fileName"></div>\
                <div class="ent-up-preview-size" id="fileSize"></div>\
              </div>\
              <button type="button" class="ent-up-remove" id="fileRemoveBtn" aria-label="Remove file"><i class="fas fa-times"></i></button>\
            </div>\
            <div class="ent-up-field">\
              <label for="uploadCover">Cover image (optional)</label>\
              <input type="file" id="uploadCover" accept="image/*">\
            </div>\
            <div id="uploadProgress" hidden>\
              <div class="ent-up-progress"><div class="ent-up-progress-bar" id="uploadProgressBar"></div></div>\
              <div class="ent-up-progress-text" id="uploadProgressText">0%</div>\
            </div>\
            <label class="ent-up-check">\
              <input type="checkbox" id="uploadRights" required>\
              <span>I own the rights to this content or have permission to upload it. *</span>\
            </label>\
            <div class="ent-up-status" id="uploadStatus" hidden></div>\
          </div>\
          <div class="ent-up-foot">\
            <button type="button" class="ent-up-btn ent-up-btn-ghost" data-action="closeUploadModal">Cancel</button>\
            <button type="submit" class="ent-up-btn ent-up-btn-primary" id="uploadSubmitBtn">\
              <i class="fas fa-cloud-upload-alt"></i> Upload\
            </button>\
          </div>\
        </form>\
      </div>\
    ';
    document.body.appendChild(wrap);
  }

  /* ---------- cache ---------- */
  function cacheEls(){
    el.modal       = document.getElementById('entUploadModal');
    if (!el.modal) return false;
    el.form        = document.getElementById('uploadForm');
    el.titleEl     = document.getElementById('uploadTitle');
    el.iconEl      = document.getElementById('uploadIcon');
    el.modeBadge   = document.getElementById('uploadModeBadge');
    el.adminGroup  = document.getElementById('adminKeyGroup');
    el.adminKey    = document.getElementById('uploadAdminKey');
    el.type        = document.getElementById('uploadType');
    el.titleInput  = document.getElementById('uploadTitleInput');
    el.artist      = document.getElementById('uploadArtist');
    el.desc        = document.getElementById('uploadDescription');
    el.dropZone    = document.getElementById('fileDropZone');
    el.fileInput   = document.getElementById('uploadFile');
    el.preview     = document.getElementById('filePreview');
    el.fileIcon    = document.getElementById('fileIcon');
    el.fileName    = document.getElementById('fileName');
    el.fileSize    = document.getElementById('fileSize');
    el.fileRemove  = document.getElementById('fileRemoveBtn');
    el.cover       = document.getElementById('uploadCover');
    el.rights      = document.getElementById('uploadRights');
    el.progress    = document.getElementById('uploadProgress');
    el.progressBar = document.getElementById('uploadProgressBar');
    el.progressTx  = document.getElementById('uploadProgressText');
    el.status      = document.getElementById('uploadStatus');
    el.submitBtn   = document.getElementById('uploadSubmitBtn');
    return true;
  }

  /* ---------- toast / status ---------- */
  function toast(msg, kind){
    var t = document.getElementById('toast');
    if (!t){
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast'; t.hidden = true;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._zbsT);
    t._zbsT = setTimeout(function(){
      t.classList.remove('show');
      setTimeout(function(){ t.hidden = true; }, 260);
    }, 2600);
  }
  function setStatus(node, msg, kind){
    if (!node) return;
    if (!msg){ node.hidden = true; node.textContent = ''; node.className = 'ent-up-status'; return; }
    node.hidden = false;
    node.textContent = msg;
    node.className = 'ent-up-status' + (kind ? ' ' + kind : '');
  }

  /* ---------- IndexedDB ---------- */
  function openDB(){
    return new Promise(function(res){
      if (!('indexedDB' in window)) return res(null);
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch(e){ return res(null); }
      req.onupgradeneeded = function(){
        var d = req.result;
        if (!d.objectStoreNames.contains(DB_STORE))
          d.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = function(){ res(req.result); };
      req.onerror   = function(){ res(null); };
      req.onblocked = function(){ res(null); };
    });
  }
  function idbPut(rec){
    if (!db){ memoryStore[rec.id] = rec; return Promise.resolve(); }
    return new Promise(function(res, rej){
      try{
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(rec);
        tx.oncomplete = function(){ res(); };
        tx.onerror    = function(){ rej(tx.error); };
      }catch(e){ rej(e); }
    });
  }
  function idbAll(){
    if (!db) return Promise.resolve(Object.keys(memoryStore).map(function(k){ return memoryStore[k]; }));
    return new Promise(function(res){
      try{
        var tx = db.transaction(DB_STORE, 'readonly');
        var req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = function(){ res(req.result || []); };
        req.onerror   = function(){ res([]); };
      }catch(e){ res([]); }
    });
  }
  function idbDelete(id){
    if (!db){ delete memoryStore[id]; return Promise.resolve(); }
    return new Promise(function(res){
      try{
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = function(){ res(); };
        tx.onerror    = function(){ res(); };
      }catch(e){ res(); }
    });
  }

  /* ---------- open / close ---------- */
  function open(mode){
    injectCSS(); injectModal(); cacheEls();
    adminMode = (mode === 'admin');
    resetForm();
    if (el.adminGroup) el.adminGroup.hidden = !adminMode;
    if (el.modeBadge)  el.modeBadge.hidden  = !adminMode;
    if (el.titleEl)    el.titleEl.textContent = adminMode ? 'Upload Content (Admin)' : 'Upload Content';
    if (el.iconEl)     el.iconEl.className = adminMode ? 'fas fa-lock' : 'fas fa-cloud-upload-alt';
    el.modal.hidden = false;
    requestAnimationFrame(function(){ el.modal.classList.add('show'); });
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ if (el.titleInput) el.titleInput.focus(); }, 220);
  }
  function close(){
    if (!el.modal) return;
    el.modal.classList.remove('show');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    setTimeout(function(){ el.modal.hidden = true; resetForm(); }, 200);
  }
  function resetForm(){
    if (!el.form) return;
    el.form.reset();
    pendingFile = null; uploading = false;
    if (el.preview)   el.preview.hidden = true;
    if (el.fileName)  el.fileName.textContent = '';
    if (el.fileSize)  el.fileSize.textContent = '';
    if (el.progress)  el.progress.hidden = true;
    if (el.progressBar) el.progressBar.style.width = '0%';
    if (el.progressTx)  el.progressTx.textContent = '0%';
    setStatus(el.status, '');
    if (el.submitBtn){
      el.submitBtn.disabled = false;
      el.submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
    }
    if (el.adminKey) el.adminKey.value = '';
  }

  /* ---------- file handling ---------- */
  function pickFile(){ if (el.fileInput) el.fileInput.click(); }
  function handleFiles(list){
    if (!list || !list.length) return;
    var f = list[0];
    if (!isAccepted(f)){ setStatus(el.status, 'Unsupported file type. Choose video, audio or image.', 'error'); return; }
    if (f.size > MAX_FILE_BYTES){ setStatus(el.status, 'File is ' + humanSize(f.size) + '. Max ' + humanSize(MAX_FILE_BYTES) + '.', 'error'); return; }
    pendingFile = f;
    showFilePreview(f);
    setStatus(el.status, '');
  }
  function showFilePreview(f){
    if (!el.preview) return;
    el.preview.hidden = false;
    var k = fileKind(f);
    var icon = k === 'video' ? 'fa-video' : k === 'audio' ? 'fa-music' : k === 'image' ? 'fa-image' : 'fa-file';
    if (el.fileIcon) el.fileIcon.className = 'fas ' + icon;
    if (el.fileName) el.fileName.textContent = f.name;
    if (el.fileSize) el.fileSize.textContent = humanSize(f.size) + ' · ' + (f.type || 'unknown');
  }
  function clearFile(){
    pendingFile = null;
    if (el.fileInput) el.fileInput.value = '';
    if (el.preview) el.preview.hidden = true;
    setStatus(el.status, '');
  }

  /* ---------- drag & drop ---------- */
  function wireDropZone(){
    if (!el.dropZone) return;
    el.dropZone.addEventListener('click', function(e){
      if (e.target === el.fileInput) return;
      e.preventDefault(); pickFile();
    });
    el.dropZone.setAttribute('tabindex', '0');
    el.dropZone.setAttribute('role', 'button');
    el.dropZone.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pickFile(); }
    });
    ['dragenter','dragover'].forEach(function(ev){
      el.dropZone.addEventListener(ev, function(e){
        e.preventDefault(); e.stopPropagation();
        el.dropZone.classList.add('is-dragover');
      });
    });
    ['dragleave','dragend'].forEach(function(ev){
      el.dropZone.addEventListener(ev, function(e){
        e.preventDefault(); e.stopPropagation();
        el.dropZone.classList.remove('is-dragover');
      });
    });
    el.dropZone.addEventListener('drop', function(e){
      e.preventDefault(); e.stopPropagation();
      el.dropZone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });
    if (el.fileInput){
      el.fileInput.addEventListener('change', function(){ handleFiles(el.fileInput.files); });
    }
    if (el.fileRemove){
      el.fileRemove.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation(); clearFile();
      });
    }
  }

  /* ---------- progress ---------- */
  function setProgress(p){
    p = Math.max(0, Math.min(100, p));
    if (el.progressBar) el.progressBar.style.width = p + '%';
    if (el.progressTx)  el.progressTx.textContent = Math.round(p) + '%';
  }
  function simulateProgress(done){
    if (el.progress) el.progress.hidden = false;
    var pct = 0;
    (function step(){
      pct += Math.random() * 14 + 4;
      if (pct >= 100){ setProgress(100); setTimeout(done, 220); return; }
      setProgress(pct);
      setTimeout(step, 110 + Math.random() * 70);
    })();
  }

  /* ---------- grid insert ---------- */
  function gridFor(type){
    return document.getElementById({ cartoons:'grid-cartoons', music:'grid-music', movies:'grid-movies' }[type] || '');
  }
  function emptyFor(type){
    return document.getElementById({ cartoons:'empty-cartoons', music:'empty-music', movies:'empty-movies' }[type] || '');
  }
  function buildCard(p){
    var card = document.createElement('div');
    card.className = 'ent-card';
    card.setAttribute('data-post-id', p.id);
    card.setAttribute('data-type', p.type);
    card.setAttribute('data-title', p.title);
    if (p.artist) card.setAttribute('data-artist', p.artist);
    if (p.description) card.setAttribute('data-description', p.description);
    if (p.mediaUrl) card.setAttribute('data-media', p.mediaUrl);

    var k = p.kind || 'image', media = '';
    if (k === 'video'){
      media = '<video src="'+esc(p.mediaUrl)+'" controls preload="metadata"' +
              (p.coverUrl ? ' poster="'+esc(p.coverUrl)+'"' : '') + '></video>';
    } else if (k === 'audio'){
      media = '<div class="ent-card-audio-wrap"><i class="fas fa-music"></i>' +
              '<audio src="'+esc(p.mediaUrl)+'" controls preload="metadata"></audio></div>';
    } else if (p.mediaUrl){
      media = '<img src="'+esc(p.mediaUrl)+'" alt="'+esc(p.title)+'" loading="lazy">';
    } else {
      media = '<div class="ent-card-placeholder"><i class="fas fa-photo-video"></i></div>';
    }

    card.innerHTML =
      '<div class="ent-card-media">' + media + '</div>' +
      '<div class="ent-card-body">' +
        '<h4 class="ent-card-title">' + esc(p.title) + '</h4>' +
        (p.artist ? '<p class="ent-card-artist">' + esc(p.artist) + '</p>' : '') +
        (p.description ? '<p class="ent-card-desc">' + esc(p.description) + '</p>' : '') +
      '</div>';
    return card;
  }
  function insertPost(p){
    var g = gridFor(p.type);
    if (!g){ toast('Grid for "'+p.type+'" not found.', 'error'); return; }
    g.insertBefore(buildCard(p), g.firstChild);
    var empty = emptyFor(p.type);
    if (empty) empty.hidden = true;
    var countId = { cartoons:'countCartoons', music:'countMusic', movies:'countMovies' }[p.type];
    var cEl = countId && document.getElementById(countId);
    if (cEl) cEl.textContent = String((parseInt(cEl.textContent || '0', 10) || 0) + 1);
    if (window.ZBSEngagement && typeof window.ZBSEngagement.refresh === 'function') {
      try { window.ZBSEngagement.refresh(); } catch(e){}
    }
  }

  /* ---------- submit ---------- */
  function onSubmit(e){
    if (e) e.preventDefault();
    if (uploading) return;

    var type  = el.type ? el.type.value : '';
    var title = el.titleInput ? el.titleInput.value.trim() : '';
    if (!title){ setStatus(el.status, 'Please enter a title.', 'error'); el.titleInput && el.titleInput.focus(); return; }
    if (!pendingFile){ setStatus(el.status, 'Please choose a media file.', 'error'); return; }
    if (adminMode){
      var key = el.adminKey ? el.adminKey.value.trim() : '';
      if (!key){ setStatus(el.status, 'Admin key is required.', 'error'); return; }
      if (key !== ADMIN_KEY){ setStatus(el.status, 'Incorrect admin key.', 'error'); return; }
    }
    if (el.rights && !el.rights.checked){ setStatus(el.status, 'Please confirm you own the rights to this content.', 'error'); return; }

    uploading = true;
    if (el.submitBtn){ el.submitBtn.disabled = true; el.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; }
    setStatus(el.status, '');

    var post = {
      id: uid(), type: type, kind: fileKind(pendingFile),
      title: title,
      artist: el.artist ? el.artist.value.trim() : '',
      description: el.desc ? el.desc.value.trim() : '',
      fileName: pendingFile.name, fileType: pendingFile.type, fileSize: pendingFile.size,
      createdAt: Date.now(), admin: adminMode
    };

    var coverP = readAsDataURL(el.cover && el.cover.files && el.cover.files[0]);
    var fileP  = Promise.resolve(pendingFile).then(function(f){
      return { blob: f.slice(0, f.size, f.type), url: URL.createObjectURL(f) };
    });

    Promise.all([fileP, coverP]).then(function(r){
      var fRes = r[0], coverData = r[1];
      post.mediaUrl = fRes.url;
      post.blob     = fRes.blob;
      if (coverData) post.coverUrl = coverData;

      simulateProgress(function(){
        persist(post).then(function(){
          insertPost(post);
          toast('Upload successful', 'success');
          setStatus(el.status, 'Uploaded.', 'success');
          setTimeout(close, 700);
        }).catch(function(err){
          console.warn('[upload] persist failed:', err);
          insertPost(post);
          toast('Uploaded (session only)', 'warn');
          setTimeout(close, 900);
        });
      });
    }).catch(function(err){
      console.error('[upload] failed:', err);
      setStatus(el.status, 'Upload failed: ' + (err && err.message || 'unknown error'), 'error');
      uploading = false;
      if (el.submitBtn){ el.submitBtn.disabled = false; el.submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload'; }
    });
  }
  function readAsDataURL(file){
    if (!file) return Promise.resolve(null);
    return new Promise(function(res){
      try{
        var fr = new FileReader();
        fr.onload  = function(){ res(fr.result); };
        fr.onerror = function(){ res(null); };
        fr.readAsDataURL(file);
      }catch(e){ res(null); }
    });
  }

  /* ---------- persistence ---------- */
  function persist(post){
    var rec = {
      id: post.id, type: post.type, kind: post.kind,
      title: post.title, artist: post.artist, description: post.description,
      fileName: post.fileName, fileType: post.fileType, fileSize: post.fileSize,
      createdAt: post.createdAt, admin: post.admin,
      blob: post.blob, coverData: post.coverUrl || null
    };
    return idbPut(rec).catch(function(e){
      console.warn('[upload] IDB put failed:', e);
      memoryStore[rec.id] = rec;
    });
  }
  function hydrate(){
    return idbAll().then(function(recs){
      if (!recs || !recs.length) return;
      recs.sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); }).forEach(function(rec){
        if (!rec.blob) return;
        if (document.querySelector('[data-post-id="'+rec.id+'"]')) return;
        var url;
        try { url = URL.createObjectURL(rec.blob); } catch(e){ return; }
        insertPost({
          id: rec.id, type: rec.type, kind: rec.kind,
          title: rec.title, artist: rec.artist, description: rec.description,
          mediaUrl: url, coverUrl: rec.coverData || ''
        });
      });
    });
  }

  /* ---------- public list / remove / clear ---------- */
  function listUploads(){ return idbAll(); }
  function removeUpload(id){
    var card = document.querySelector('[data-post-id="'+id+'"]');
    if (card && card.parentNode){
      var grid = card.parentNode;
      grid.removeChild(card);
      if (grid.id){
        var empty = document.getElementById(grid.id.replace('grid-', 'empty-'));
        if (empty && !grid.querySelector('.ent-card')) empty.hidden = false;
      }
    }
    return idbDelete(id);
  }
  function clearUploads(){
    return idbAll().then(function(recs){
      return Promise.all(recs.map(function(r){ return removeUpload(r.id); }));
    });
  }

  /* ---------- wiring ---------- */
  function wireGlobal(){
    document.addEventListener('click', function(e){
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var a = t.getAttribute('data-action');
      if (a === 'openFrontendUpload'){ e.preventDefault(); open('user'); }
      else if (a === 'openBackendUpload'){ e.preventDefault(); open('admin'); }
      else if (a === 'closeUploadModal'){ e.preventDefault(); close(); }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && el.modal && !el.modal.hidden) close();
    });
    if (el.form) el.form.addEventListener('submit', onSubmit);
    if (el.modal){
      el.modal.addEventListener('click', function(e){
        if (e.target === el.modal) close();
      });
    }
  }

  /* ---------- init ---------- */
  function init(){
    injectCSS();
    injectModal();
    if (!cacheEls()) return;
    wireDropZone();
    wireGlobal();
    openDB().then(function(d){
      db = d;
      hydrate().catch(function(e){ console.warn('[upload] hydrate failed:', e); });
    });
  }

  window.ZBSUpload = {
    open: open, close: close,
    list: listUploads, remove: removeUpload, clear: clearUploads,
    _els: function(){ return el; }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();