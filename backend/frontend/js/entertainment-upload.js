/* =========================================================
   entertainment-upload.js
   Fixes entertainment hub media uploads.

   Handles:
     · Click "browse" / drop zone → file picker
     · Drag & drop with proper preventDefault
     · File validation (type + size, permissive defaults)
     · File preview + remove
     · Simulated progress bar
     · Adds the new post into the correct grid
       (cartoons / music / movies) with proper media rendering
     · Persists uploads via IndexedDB (falls back to memory)
     · Notifies ZBSEngagement so engagement bars attach

   Public API (window.ZBSUpload):
     open(mode)        — 'user' | 'admin'  (opens the modal)
     close()           — close the modal
     list()            — get all persisted uploads
     remove(id)        — delete a persisted upload
     clear()           — wipe all persisted uploads
   ========================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------
     CONFIG
     ------------------------------------------------------ */
  var MAX_FILE_BYTES   = 500 * 1024 * 1024;   // 500 MB (videos need headroom)
  var ADMIN_KEY        = 'zbs-admin';         // change or fetch from server
  var DB_NAME          = 'zbs_entertainment';
  var DB_STORE         = 'uploads';
  var DB_VERSION       = 1;

  var ACCEPTED_TYPES = [
    'video/', 'audio/', 'image/'
  ];

  /* ------------------------------------------------------
     STATE
     ------------------------------------------------------ */
  var pendingFile   = null;   // File chosen but not yet uploaded
  var pendingCover  = null;   // Optional cover File
  var adminMode     = false;
  var uploading     = false;
  var db            = null;
  var memoryStore   = Object.create(null);   // fallback when IDB is unavailable

  /* ------------------------------------------------------
     HELPERS
     ------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function uid() {
    return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function humanSize(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(bytes >= 10 || i === 0 ? 0 : 1) + ' ' + units[i];
  }

  function fileKind(file) {
    if (!file) return 'unknown';
    var t = file.type || '';
    if (t.indexOf('video/') === 0) return 'video';
    if (t.indexOf('audio/') === 0) return 'audio';
    if (t.indexOf('image/') === 0) return 'image';
    return 'unknown';
  }

  function isAccepted(file) {
    if (!file) return false;
    var t = file.type || '';
    return ACCEPTED_TYPES.some(function (prefix) { return t.indexOf(prefix) === 0; });
  }

  function toast(msg, kind) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.hidden = true;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._zbsUpT);
    el._zbsUpT = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 260);
    }, 2600);
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; el.className = 'upload-status'; return; }
    el.hidden = false;
    el.textContent = msg;
    el.className = 'upload-status' + (kind ? ' ' + kind : '');
  }

  /* ------------------------------------------------------
     INDEXEDDB
     ------------------------------------------------------ */
  function openDB() {
    return new Promise(function (resolve) {
      if (!('indexedDB' in window)) return resolve(null);
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { return resolve(null); }

      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(DB_STORE)) {
          d.createObjectStore(DB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
    });
  }

  function idbPut(record) {
    if (!db) {
      memoryStore[record.id] = record;
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(record);
        tx.oncomplete = function () { resolve(); };
        tx.onerror    = function () { reject(tx.error); };
      } catch (e) { reject(e); }
    });
  }

  function idbAll() {
    if (!db) return Promise.resolve(Object.keys(memoryStore).map(k => memoryStore[k]));
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(DB_STORE, 'readonly');
        var req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror   = function () { resolve([]); };
      } catch (e) { resolve([]); }
    });
  }

  function idbDelete(id) {
    if (!db) { delete memoryStore[id]; return Promise.resolve(); }
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror    = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }

  /* ------------------------------------------------------
     MODAL ELEMENTS
     ------------------------------------------------------ */
  var el = {};

  function cacheEls() {
    el.modal      = document.getElementById('entUploadModal');
    if (!el.modal) return false;

    el.form       = document.getElementById('uploadForm');
    el.titleEl    = document.getElementById('uploadTitle');
    el.iconEl     = document.getElementById('uploadIcon');
    el.adminGroup = document.getElementById('adminKeyGroup');
    el.adminKey   = document.getElementById('uploadAdminKey');
    el.type       = document.getElementById('uploadType');
    el.titleInput = document.getElementById('uploadTitleInput');
    el.artist     = document.getElementById('uploadArtist');
    el.desc       = document.getElementById('uploadDescription');
    el.dropZone   = document.getElementById('fileDropZone');
    el.fileInput  = document.getElementById('uploadFile');
    el.preview    = document.getElementById('filePreview');
    el.fileIcon   = document.getElementById('fileIcon');
    el.fileName   = document.getElementById('fileName');
    el.fileSize   = document.getElementById('fileSize');
    el.fileRemove = document.getElementById('fileRemoveBtn');
    el.cover      = document.getElementById('uploadCover');
    el.rights     = document.getElementById('uploadRights');
    el.progress   = document.getElementById('uploadProgress');
    el.progressBar= document.getElementById('uploadProgressBar');
    el.progressTx = document.getElementById('uploadProgressText');
    el.status     = document.getElementById('uploadStatus');
    el.submitBtn  = document.getElementById('uploadSubmitBtn');
    return true;
  }

  /* ------------------------------------------------------
     OPEN / CLOSE
     ------------------------------------------------------ */
  function open(mode) {
    if (!cacheEls()) {
      toast('Upload form not found on this page.', 'error');
      return;
    }
    adminMode = (mode === 'admin');
    resetForm();

    el.adminGroup.hidden = !adminMode;
    if (adminMode) {
      el.titleEl.textContent = 'Upload Content (Admin)';
      el.iconEl.className = 'fas fa-lock';
    } else {
      el.titleEl.textContent = 'Upload Content';
      el.iconEl.className = 'fas fa-cloud-upload-alt';
    }

    el.modal.hidden = false;
    requestAnimationFrame(function () { el.modal.classList.add('show'); });
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
      if (el.titleInput) el.titleInput.focus();
    }, 260);
  }

  function close() {
    if (!el.modal) return;
    el.modal.classList.remove('show');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    setTimeout(function () {
      el.modal.hidden = true;
      resetForm();
    }, 220);
  }

  function resetForm() {
    if (!el.form) return;
    el.form.reset();
    pendingFile = null;
    pendingCover = null;
    uploading = false;
    if (el.preview)  el.preview.hidden = true;
    if (el.fileName) el.fileName.textContent = '';
    if (el.fileSize) el.fileSize.textContent = '';
    if (el.progress) el.progress.hidden = true;
    if (el.progressBar) el.progressBar.style.width = '0%';
    if (el.progressTx) el.progressTx.textContent = '0%';
    setStatus(el.status, '');
    if (el.submitBtn) {
      el.submitBtn.disabled = false;
      el.submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
    }
    if (el.adminKey) el.adminKey.value = '';
  }

  /* ------------------------------------------------------
     FILE PICKING
     ------------------------------------------------------ */
  function pickFile() {
    if (!el.fileInput) return;
    el.fileInput.click();
  }

  function handleFiles(fileList) {
    if (!fileList || !fileList.length) return;
    var file = fileList[0];

    if (!isAccepted(file)) {
      setStatus(el.status, 'Unsupported file type. Please choose a video, audio, or image.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus(el.status,
        'File is ' + humanSize(file.size) + '. Max allowed is ' + humanSize(MAX_FILE_BYTES) + '.',
        'error');
      return;
    }

    pendingFile = file;
    showFilePreview(file);
    setStatus(el.status, '');
  }

  function showFilePreview(file) {
    if (!el.preview) return;
    el.preview.hidden = false;

    var kind = fileKind(file);
    var iconClass = kind === 'video' ? 'fa-video'
                  : kind === 'audio' ? 'fa-music'
                  : kind === 'image' ? 'fa-image'
                  : 'fa-file';

    if (el.fileIcon) el.fileIcon.className = 'fas ' + iconClass;
    if (el.fileName) el.fileName.textContent = file.name;
    if (el.fileSize) el.fileSize.textContent = humanSize(file.size) + ' · ' + (file.type || 'unknown');
  }

  function clearFile() {
    pendingFile = null;
    if (el.fileInput) el.fileInput.value = '';
    if (el.preview)  el.preview.hidden = true;
    setStatus(el.status, '');
  }

  /* ------------------------------------------------------
     DRAG & DROP
     ------------------------------------------------------ */
  function wireDropZone() {
    if (!el.dropZone) return;

    // Click anywhere on the zone (except the input itself) opens the picker
    el.dropZone.addEventListener('click', function (e) {
      if (e.target === el.fileInput) return;
      e.preventDefault();
      pickFile();
    });

    // Keyboard accessibility
    el.dropZone.setAttribute('tabindex', '0');
    el.dropZone.setAttribute('role', 'button');
    el.dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pickFile();
      }
    });

    // Highlight on drag-over
    ['dragenter', 'dragover'].forEach(function (evt) {
      el.dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'dragend'].forEach(function (evt) {
      el.dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.remove('is-dragover');
      });
    });

    // Handle the drop
    el.dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.dropZone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });

    // Also allow dropping anywhere on the modal
    if (el.modal) {
      el.modal.addEventListener('dragover', function (e) {
        e.preventDefault();
        el.dropZone.classList.add('is-dragover');
      });
      el.modal.addEventListener('drop', function (e) {
        e.preventDefault();
        el.dropZone.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    // File input change
    if (el.fileInput) {
      el.fileInput.addEventListener('change', function () {
        handleFiles(el.fileInput.files);
      });
    }

    // Remove button
    if (el.fileRemove) {
      el.fileRemove.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearFile();
      });
    }
  }

  /* ------------------------------------------------------
     PROGRESS
     ------------------------------------------------------ */
  function setProgress(pct) {
    pct = Math.max(0, Math.min(100, pct));
    if (el.progressBar) el.progressBar.style.width = pct + '%';
    if (el.progressTx)  el.progressTx.textContent = Math.round(pct) + '%';
  }

  function simulateProgress(onDone) {
    if (el.progress) el.progress.hidden = false;
    var pct = 0;
    var step = function () {
      pct += Math.random() * 14 + 4;
      if (pct >= 100) {
        setProgress(100);
        setTimeout(onDone, 250);
        return;
      }
      setProgress(pct);
      setTimeout(step, 120 + Math.random() * 80);
    };
    setTimeout(step, 120);
  }

  /* ------------------------------------------------------
     INSERT POST INTO GRID
     ------------------------------------------------------ */
  function gridFor(type) {
    var map = {
      cartoons: 'grid-cartoons',
      music:    'grid-music',
      movies:   'grid-movies'
    };
    return document.getElementById(map[type] || '');
  }

  function gridEmptyFor(type) {
    var map = {
      cartoons: 'empty-cartoons',
      music:    'empty-music',
      movies:   'empty-movies'
    };
    return document.getElementById(map[type] || '');
  }

  function buildCard(post) {
    var card = document.createElement('div');
    card.className = 'ent-card';
    card.setAttribute('data-post-id', post.id);
    card.setAttribute('data-type', post.type);
    card.setAttribute('data-title', post.title);
    card.setAttribute('data-artist', post.artist || '');
    card.setAttribute('data-description', post.description || '');
    if (post.mediaUrl) card.setAttribute('data-media', post.mediaUrl);

    var kind = post.kind || 'image';
    var mediaHtml = '';
    if (kind === 'video') {
      mediaHtml = '<video src="' + escapeHtml(post.mediaUrl) + '" controls preload="metadata"' +
                  (post.coverUrl ? ' poster="' + escapeHtml(post.coverUrl) + '"' : '') +
                  '></video>';
    } else if (kind === 'audio') {
      mediaHtml = '<div class="ent-card-audio-wrap">' +
                    '<i class="fas fa-music"></i>' +
                    '<audio src="' + escapeHtml(post.mediaUrl) + '" controls preload="metadata"></audio>' +
                  '</div>';
    } else if (post.mediaUrl) {
      mediaHtml = '<img src="' + escapeHtml(post.mediaUrl) + '" alt="' + escapeHtml(post.title) + '" loading="lazy" />';
    } else {
      mediaHtml = '<div class="ent-card-placeholder"><i class="fas fa-photo-video"></i></div>';
    }

    card.innerHTML =
      '<div class="ent-card-media">' + mediaHtml + '</div>' +
      '<div class="ent-card-body">' +
        '<h4 class="ent-card-title">' + escapeHtml(post.title) + '</h4>' +
        (post.artist ? '<p class="ent-card-artist">' + escapeHtml(post.artist) + '</p>' : '') +
        (post.description ? '<p class="ent-card-desc">' + escapeHtml(post.description) + '</p>' : '') +
      '</div>';

    return card;
  }

  function insertPost(post) {
    var grid = gridFor(post.type);
    if (!grid) {
      toast('Could not find "' + post.type + '" grid.', 'error');
      return;
    }
    var card = buildCard(post);

    // Prepend so the newest is first
    grid.insertBefore(card, grid.firstChild);

    // Hide the empty placeholder
    var empty = gridEmptyFor(post.type);
    if (empty) empty.hidden = true;

    // Update the tab counter (best-effort — the hub may also do this)
    var countMap = {
      cartoons: 'countCartoons',
      music:    'countMusic',
      movies:   'countMovies'
    };
    var countEl = document.getElementById(countMap[post.type]);
    if (countEl) {
      var n = parseInt(countEl.textContent || '0', 10) + 1;
      countEl.textContent = String(n);
    }

    // Let the engagement module attach its bar
    if (window.ZBSEngagement && typeof window.ZBSEngagement.refresh === 'function') {
      window.ZBSEngagement.refresh();
    }
  }

  /* ------------------------------------------------------
     SUBMIT
     ------------------------------------------------------ */
  function onSubmit(e) {
    if (e) e.preventDefault();
    if (uploading) return;

    // Validate
    var type = el.type ? el.type.value : '';
    var title = el.titleInput ? el.titleInput.value.trim() : '';

    if (!title) {
      setStatus(el.status, 'Please enter a title.', 'error');
      if (el.titleInput) el.titleInput.focus();
      return;
    }
    if (!pendingFile) {
      setStatus(el.status, 'Please choose a media file to upload.', 'error');
      if (el.dropZone) el.dropZone.classList.add('is-dragover');
      setTimeout(function () {
        if (el.dropZone) el.dropZone.classList.remove('is-dragover');
      }, 900);
      return;
    }
    if (adminMode) {
      var key = el.adminKey ? el.adminKey.value.trim() : '';
      if (!key) {
        setStatus(el.status, 'Admin key is required.', 'error');
        if (el.adminKey) el.adminKey.focus();
        return;
      }
      if (key !== ADMIN_KEY) {
        setStatus(el.status, 'Incorrect admin key.', 'error');
        return;
      }
    }
    if (el.rights && !el.rights.checked) {
      setStatus(el.status, 'Please confirm you own the rights to this content.', 'error');
      return;
    }

    uploading = true;
    if (el.submitBtn) {
      el.submitBtn.disabled = true;
      el.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
    }
    setStatus(el.status, '');

    var post = {
      id:          uid(),
      type:        type,
      kind:        fileKind(pendingFile),
      title:       title,
      artist:      el.artist ? el.artist.value.trim() : '',
      description: el.desc ? el.desc.value.trim() : '',
      fileName:    pendingFile.name,
      fileType:    pendingFile.type,
      fileSize:    pendingFile.size,
      createdAt:   Date.now(),
      admin:       adminMode
    };

    // Read cover image (optional) → data URL for persistence
    var coverPromise = readAsDataURL(el.cover && el.cover.files && el.cover.files[0]);

    // Read main file → Blob + object URL for immediate playback
    var filePromise = Promise.resolve(pendingFile).then(function (file) {
      return {
        blob: file.slice(0, file.size, file.type),  // fresh Blob copy
        url:  URL.createObjectURL(file)
      };
    });

    Promise.all([filePromise, coverPromise])
      .then(function (results) {
        var fileResult = results[0];
        var coverData  = results[1];

        post.mediaUrl = fileResult.url;          // works now
        post.blob     = fileResult.blob;         // for IDB
        if (coverData) post.coverUrl = coverData;

        // Progress → then persist → then insert
        simulateProgress(function () {
          persist(post)
            .then(function () {
              insertPost(post);
              toast('Upload successful', 'success');
              setStatus(el.status, 'Uploaded.', 'success');
              setTimeout(close, 700);
            })
            .catch(function (err) {
              console.warn('[ZBS upload] persist failed:', err);
              // Even if persistence failed, still show in the grid
              insertPost(post);
              toast('Uploaded (session only)', 'warn');
              setTimeout(close, 900);
            });
        });
      })
      .catch(function (err) {
        console.error('[ZBS upload] failed:', err);
        setStatus(el.status, 'Upload failed: ' + (err && err.message ? err.message : 'unknown error'), 'error');
        uploading = false;
        if (el.submitBtn) {
          el.submitBtn.disabled = false;
          el.submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
        }
      });
  }

  function readAsDataURL(file) {
    if (!file) return Promise.resolve(null);
    return new Promise(function (resolve) {
      try {
        var fr = new FileReader();
        fr.onload  = function () { resolve(fr.result); };
        fr.onerror = function () { resolve(null); };
        fr.readAsDataURL(file);
      } catch (e) { resolve(null); }
    });
  }

  /* ------------------------------------------------------
     PERSISTENCE
     ------------------------------------------------------ */
  function persist(post) {
    var record = {
      id:          post.id,
      type:        post.type,
      kind:        post.kind,
      title:       post.title,
      artist:      post.artist,
      description: post.description,
      fileName:    post.fileName,
      fileType:    post.fileType,
      fileSize:    post.fileSize,
      createdAt:   post.createdAt,
      admin:       post.admin,
      blob:        post.blob,
      coverData:   post.coverUrl || null
    };
    return idbPut(record).catch(function (e) {
      // IDB likely blocked by quota — fall back to memory
      console.warn('[ZBS upload] IDB put failed, using memory store:', e);
      memoryStore[record.id] = record;
    });
  }

  function hydrateUploads() {
    return idbAll().then(function (records) {
      if (!records || !records.length) return;
      records
        .sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); })
        .forEach(function (rec) {
          if (!rec.blob) return;
          // Skip if the post already exists in the DOM
          if (document.querySelector('[data-post-id="' + rec.id + '"]')) return;

          var url;
          try { url = URL.createObjectURL(rec.blob); }
          catch (e) { return; }

          insertPost({
            id:          rec.id,
            type:        rec.type,
            kind:        rec.kind,
            title:       rec.title,
            artist:      rec.artist,
            description: rec.description,
            mediaUrl:    url,
            coverUrl:    rec.coverData || ''
          });
        });
    });
  }

  /* ------------------------------------------------------
     PUBLIC — LIST / REMOVE / CLEAR
     ------------------------------------------------------ */
  function listUploads() {
    return idbAll();
  }

  function removeUpload(id) {
    // Remove from DOM
    var card = document.querySelector('[data-post-id="' + id + '"]');
    if (card && card.parentNode) {
      var grid = card.parentNode;
      card.parentNode.removeChild(card);
      // If grid became empty, show placeholder
      if (grid && grid.id) {
        var emptyId = grid.id.replace('grid-', 'empty-');
        var empty = document.getElementById(emptyId);
        if (empty && !grid.querySelector('.ent-card')) empty.hidden = false;
      }
    }
    return idbDelete(id);
  }

  function clearUploads() {
    return idbAll().then(function (records) {
      return Promise.all(records.map(function (r) {
        return removeUpload(r.id);
      }));
    });
  }

  /* ------------------------------------------------------
     EVENT WIRING
     ------------------------------------------------------ */
  function wireGlobal() {
    // Close button inside the modal
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var action = t.getAttribute('data-action');

      if (action === 'openFrontendUpload' || action === 'openBackendUpload') {
        e.preventDefault();
        open(action === 'openBackendUpload' ? 'admin' : 'user');
        return;
      }
      if (action === 'closeUploadModal') {
        e.preventDefault();
        close();
        return;
      }
    });

    // Escape closes the modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.modal && !el.modal.hidden) close();
    });

    // Form submit
    if (el.form) el.form.addEventListener('submit', onSubmit);

    // Click on backdrop closes
    if (el.modal) {
      el.modal.addEventListener('click', function (e) {
        if (e.target === el.modal) close();
      });
    }
  }

  /* ------------------------------------------------------
     INIT
     ------------------------------------------------------ */
  function init() {
    if (!cacheEls()) {
      // Modal not on this page — still try again later (hub JS may inject it)
      setTimeout(init, 400);
      return;
    }
    wireDropZone();
    wireGlobal();

    openDB().then(function (database) {
      db = database;
      // Hydrate any previously uploaded media
      hydrateUploads().catch(function (e) {
        console.warn('[ZBS upload] hydrate failed:', e);
      });
    });
  }

  /* ------------------------------------------------------
     EXPOSE
     ------------------------------------------------------ */
  window.ZBSUpload = {
    open:   open,
    close:  close,
    list:   listUploads,
    remove: removeUpload,
    clear:  clearUploads,
    // Expose internals for debugging
    _els:   function () { return el; },
    _state: function () { return { pendingFile: pendingFile, adminMode: adminMode, uploading: uploading }; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();