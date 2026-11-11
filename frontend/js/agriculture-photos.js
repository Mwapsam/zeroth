/* =========================================================
   agriculture-photos.js  (fixed + responsive)
   Wires the multi-image uploader in #agriPostModal:
     · #agriPhotoAddBtn (click / keyboard / drag-drop)
     · #agriPostImagesInput (file input)
     · #agriPhotoGrid (preview tiles)
     · #agriPhotoCount + #agriPhotoPublishCount + footer counts
     · #agriPhotoClearBtn
     · Exposes window.AgriPhotos.getFiles() for form submit
     · Exposes window.AgriPhotos.reset()
   ========================================================= */
(function () {
  'use strict';

  var MAX_FILES       = 12;
  var MAX_FILE_BYTES  = 5 * 1024 * 1024;   // 5 MB per photo
  var ACCEPTED        = ['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'];

  var photos = [];           // [{ id, file, url }]
  var el     = {};
  var cssInjected = false;

  /* -------- helpers -------- */
  function $(s, r){ return (r||document).querySelector(s); }
  function uid(){ return 'p_' + Math.random().toString(36).slice(2,9); }
  function humanSize(b){
    if (!b) return '0 B';
    var u=['B','KB','MB'], i=0;
    while (b>=1024 && i<u.length-1){ b/=1024; i++; }
    return b.toFixed(b>=10||i===0?0:1)+' '+u[i];
  }
  function isAccepted(f){
    if (!f) return false;
    var t = (f.type||'').toLowerCase();
    if (t && ACCEPTED.indexOf(t) !== -1) return true;
    // Fallback: some browsers report empty type for HEIC
    return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || '');
  }

  /* -------- responsive CSS for the photo tiles -------- */
  function injectCSS(){
    if (cssInjected || document.getElementById('agri-photo-styles')) return;
    cssInjected = true;
    var css = '\
      .agri-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;}\
      .agri-photo-tile{position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#eef2f0;border:1px solid #d9e2dc;}\
      .agri-photo-tile img{width:100%;height:100%;object-fit:cover;display:block;}\
      .agri-photo-remove{position:absolute;top:4px;right:4px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.62);color:#fff;border:0;font-size:14px;line-height:1;cursor:pointer;display:grid;place-items:center;}\
      .agri-photo-remove:hover{background:rgba(192,57,43,.9);}\
      .agri-photo-tile-size{position:absolute;bottom:0;left:0;right:0;padding:3px 6px;font-size:10px;font-weight:600;color:#fff;background:linear-gradient(to top,rgba(0,0,0,.6),transparent);text-align:right;}\
      .agri-photo-add-btn.is-dragover{background:#e5f5ea !important;border-color:#1f7a3d !important;}\
      .agri-photo-add-btn:focus-visible{outline:3px solid rgba(31,122,61,.35);outline-offset:2px;}\
      @media (max-width:420px){.agri-photo-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;}}\
    ';
    var s = document.createElement('style');
    s.id = 'agri-photo-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* -------- cache elements -------- */
  function cacheEls(){
    el.addBtn      = document.getElementById('agriPhotoAddBtn');
    el.input       = document.getElementById('agriPostImagesInput');
    el.grid        = document.getElementById('agriPhotoGrid');
    el.count       = document.getElementById('agriPhotoCount');
    el.clearBtn    = document.getElementById('agriPhotoClearBtn');
    el.pubCount    = document.getElementById('agriPhotoPublishCount');
    el.footCount   = document.getElementById('agriFooterPhotoCount');
    el.footCount2  = document.getElementById('agriFooterPhotoCount2');
    el.status      = document.getElementById('agriPostStatus');
    return !!(el.addBtn && el.input && el.grid);
  }

  /* -------- count sync -------- */
  function syncCounts(){
    var n = photos.length;
    if (el.count)      el.count.textContent = n;
    if (el.pubCount)   el.pubCount.textContent = n;
    if (el.footCount) { el.footCount.hidden = n === 0; el.footCount.textContent = n; }
    if (el.footCount2){ el.footCount2.hidden = n === 0; el.footCount2.textContent = n; }
    // Enable/disable submit buttons based on whether we have photos
    var canPublish = n > 0;
    ['agriPhotoPublishBtn','agriFooterPublishBtn'].forEach(function(id){
      var b = document.getElementById(id);
      if (b) b.disabled = !canPublish;
    });
  }

  /* -------- render tiles -------- */
  function render(){
    if (!el.grid) return;
    el.grid.innerHTML = '';
    photos.forEach(function(p){
      var tile = document.createElement('div');
      tile.className = 'agri-photo-tile';
      tile.dataset.id = p.id;
      tile.innerHTML =
        '<img src="' + p.url + '" alt="Preview" loading="lazy">' +
        '<button type="button" class="agri-photo-remove" data-id="' + p.id + '" aria-label="Remove photo">&times;</button>' +
        '<span class="agri-photo-tile-size">' + humanSize(p.file.size) + '</span>';
      el.grid.appendChild(tile);
    });
    syncCounts();
  }

  /* -------- add files -------- */
  function addFiles(fileList){
    if (!fileList || !fileList.length) return;
    var rejected = [];
    var added = 0;

    Array.prototype.forEach.call(fileList, function(f){
      if (photos.length >= MAX_FILES){
        rejected.push(f.name + ' (limit ' + MAX_FILES + ' photos)');
        return;
      }
      if (!isAccepted(f)){
        rejected.push(f.name + ' (unsupported type)');
        return;
      }
      if (f.size > MAX_FILE_BYTES){
        rejected.push(f.name + ' (' + humanSize(f.size) + ' — max 5 MB)');
        return;
      }
      // Skip duplicates by name+size
      if (photos.some(function(p){ return p.file.name === f.name && p.file.size === f.size; })) return;

      photos.push({ id: uid(), file: f, url: URL.createObjectURL(f) });
      added++;
    });

    render();

    if (rejected.length && el.status){
      el.status.hidden = false;
      el.status.textContent = 'Skipped: ' + rejected.join(', ');
      el.status.className = 'agri-post-status warn';
      setTimeout(function(){ el.status.hidden = true; }, 4500);
    }
    if (added && el.input) el.input.value = '';   // allow re-selecting the same file
  }

  /* -------- remove one -------- */
  function removePhoto(id){
    var i = photos.findIndex(function(p){ return p.id === id; });
    if (i === -1) return;
    try { URL.revokeObjectURL(photos[i].url); } catch(e){}
    photos.splice(i, 1);
    render();
  }

  /* -------- clear all -------- */
  function clearPhotos(){
    photos.forEach(function(p){ try { URL.revokeObjectURL(p.url); } catch(e){} });
    photos = [];
    if (el.input) el.input.value = '';
    render();
  }

  /* -------- wire events -------- */
  function wire(){
    // Click / keyboard on add button
    if (el.addBtn){
      el.addBtn.addEventListener('click', function(e){
        e.preventDefault();
        el.input.click();
      });
      el.addBtn.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.input.click(); }
      });
    }

    // File input change
    if (el.input){
      el.input.addEventListener('change', function(){
        addFiles(el.input.files);
      });
    }

    // Drag & drop on add button
    if (el.addBtn){
      ['dragenter','dragover'].forEach(function(ev){
        el.addBtn.addEventListener(ev, function(e){
          e.preventDefault(); e.stopPropagation();
          el.addBtn.classList.add('is-dragover');
        });
      });
      ['dragleave','dragend'].forEach(function(ev){
        el.addBtn.addEventListener(ev, function(e){
          e.preventDefault(); e.stopPropagation();
          el.addBtn.classList.remove('is-dragover');
        });
      });
      el.addBtn.addEventListener('drop', function(e){
        e.preventDefault(); e.stopPropagation();
        el.addBtn.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
      });
    }

    // Remove tile (delegated)
    if (el.grid){
      el.grid.addEventListener('click', function(e){
        var btn = e.target.closest('.agri-photo-remove');
        if (!btn) return;
        e.preventDefault();
        removePhoto(btn.dataset.id);
      });
    }

    // Clear all
    if (el.clearBtn){
      el.clearBtn.addEventListener('click', function(e){
        e.preventDefault();
        clearPhotos();
      });
    }

    // Cleanup when modal closes
    document.addEventListener('click', function(e){
      var t = e.target.closest('[data-action="closeAgriPost"]');
      if (t){ /* keep files until form is reset — the modal handler will call reset() */ }
    });
  }

  /* -------- public API -------- */
  function getFiles(){
    return photos.map(function(p){ return p.file; });
  }
  function reset(){
    clearPhotos();
  }
  function count(){ return photos.length; }

  window.AgriPhotos = {
    getFiles: getFiles,
    reset:    reset,
    count:    count,
    add:      addFiles,
    _state:   function(){ return photos.slice(); }
  };

  /* -------- boot -------- */
  function boot(){
    injectCSS();
    if (!cacheEls()){
      // Modal may not be in the DOM yet
      setTimeout(boot, 350);
      return;
    }
    wire();
    syncCounts();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else
    boot();

})();