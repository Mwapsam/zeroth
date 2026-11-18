/* ============================================================================
   Animal Acquisition, Travel & Clearance Permit
   - Photo uploads (upload only — no camera) for seller, animal, ZBS rep
   - Brand mark is a typed text field only
   - Animal code = ZBS-<last3ofNRC>-<seq-in-region>
   ========================================================================== */
(function () {
  'use strict';

  if (window.__agriPermitInitialised) return;
  window.__agriPermitInitialised = true;

  var PHOTO_MAX_BYTES   = 5 * 1024 * 1024;
  var VIDEO_MAX_BYTES   = 50 * 1024 * 1024;
  var VIDEO_MAX_SECONDS = 30;
  var COUNTER_STORAGE   = 'agri_permit_region_counters_v1';

  /* ---------------------------------------------------------------- HELPERS */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  function toast(msg, icon) {
    if (typeof window.showToast === 'function') window.showToast(msg, icon || 'fa-circle-info');
    else console.log('[Permit]', msg);
  }

  /* ---------------------------------------------------------------- CODE LOGIC */

  /* Keep only digits from NRC, take the last three */
  function nrcDigits(nrc) {
    return String(nrc || '').replace(/\D/g, '');
  }

  function nrcLast3(nrc) {
    var d = nrcDigits(nrc);
    if (d.length >= 3) return d.slice(-3);
    if (d.length > 0)  return d.padStart(3, '0');
    return '000';
  }

  /* Normalise the province/region to a counter key */
  function regionKey(province) {
    var p = String(province || '').trim().toLowerCase();
    if (!p) return null;
    return p.replace(/\s+/g, '-');
  }

  /* Region counters: { "lusaka-2026": 4, "copperbelt-2026": 2, ... } */
  function readCounters() {
    try { return JSON.parse(localStorage.getItem(COUNTER_STORAGE) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeCounters(obj) {
    try { localStorage.setItem(COUNTER_STORAGE, JSON.stringify(obj)); } catch (e) {}
  }

  /* Reserve the next sequence number for a region + year.
     Returns the sequence number (1, 2, 3, …). */
  function nextRegionSequence(region, year) {
    var all = readCounters();
    var key = region + '-' + year;
    var next = (all[key] || 0) + 1;
    all[key] = next;
    writeCounters(all);
    return next;
  }

  /* Rebuild the animal code for a row. Reuses an existing sequence
     if the row already has one assigned for the same region + NRC. */
  function assignAnimalCode(row, forceNew) {
    if (!row) return;

    var cell = row.querySelector('.agri-permit-code-cell');
    if (!cell) return;

    var nrcInput = row.querySelector('[data-field="seller_nrc"]');
    var provinceInput = row.querySelector('[data-field="province"]');

    var nrc = nrcLast3(nrcInput && nrcInput.value);
    var region = regionKey(provinceInput && provinceInput.value);
    var year = new Date().getFullYear();

    var badge = cell.querySelector('.agri-permit-code-badge');

    /* If we don't yet have an NRC or region, show pending */
    if (!nrc || nrc === '000' || !region) {
      delete row.dataset.animalCode;
      row.dataset.animalCodeParts = '';
      if (badge) {
        badge.className = 'agri-permit-code-badge pending';
        badge.textContent = 'Auto';
      }
      return;
    }

    /* If we already have a code, check whether NRC / region changed */
    var parts = (row.dataset.animalCodeParts || '').split('|');
    var prevNrc    = parts[0] || '';
    var prevRegion = parts[1] || '';

    if (!forceNew && row.dataset.animalCode && prevNrc === nrc && prevRegion === region) {
      /* Nothing changed — keep the same code and badge */
      if (badge) {
        badge.className = 'agri-permit-code-badge assigned';
        badge.innerHTML = '<i class="fas fa-tag"></i> ' + row.dataset.animalCode;
      }
      return;
    }

    /* Reserve a fresh sequence from the region counter */
    var seq = nextRegionSequence(region, year);
    var code = 'ZBS-' + nrc + '-' + String(seq).padStart(4, '0');

    row.dataset.animalCode = code;
    row.dataset.animalCodeParts = nrc + '|' + region;

    if (badge) {
      badge.className = 'agri-permit-code-badge assigned just-assigned';
      badge.innerHTML = '<i class="fas fa-tag"></i> ' + code;
      setTimeout(function () { badge.classList.remove('just-assigned'); }, 700);
    }

    /* Push to Part B clearance rows (only if blank) */
    ['chief_animal_code', 'vet_animal_code', 'police_animal_code'].forEach(function (field) {
      var input = document.querySelector('[data-field="' + field + '"]');
      if (input && !input.value.trim()) input.value = code;
    });
  }

  /* Refresh every row's code (used on open, on add-row, on submit) */
  function refreshAllAnimalCodes() {
    var rows = document.querySelectorAll('#permitSellerBody tr');
    rows.forEach(function (row) { assignAnimalCode(row, false); });
  }

  /* ---------------------------------------------------------------- PHOTO UPLOAD */

  var UPLOAD_ACTIONS = {
    uploadSellerPhoto: 'seller',
    uploadAnimalPhoto: 'animal',
    uploadRepPhoto:    'rep'
  };

  function handleUploadPick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var kind = UPLOAD_ACTIONS[btn.getAttribute('data-action')];
    if (!kind) return;
    e.preventDefault();

    var cell = btn.closest('.agri-permit-photo-cell, .agri-permit-rep-photo');
    if (!cell) return;

    var input = cell.querySelector('.agri-permit-photo-input[data-photo-kind="' + kind + '"]');
    if (!input) return;

    input.value = '';
    input.click();
  }

  function handleFileChange(e) {
    var input = e.target;
    if (!input.classList || !input.classList.contains('agri-permit-photo-input')) return;

    var file = input.files && input.files[0];
    if (!file) return;

    if (file.size > PHOTO_MAX_BYTES) {
      toast('Photo must be under 5 MB.', 'fa-circle-exclamation');
      input.value = '';
      return;
    }

    var kind = input.getAttribute('data-photo-kind');
    var cell = input.closest('.agri-permit-photo-cell, .agri-permit-rep-photo');
    if (!cell) return;

    var preview = cell.querySelector('.agri-permit-photo-preview');
    if (!preview) return;

    var reader = new FileReader();
    reader.onload = function () {
      preview.innerHTML =
        '<img src="' + reader.result + '" alt="" class="agri-permit-photo-thumb" />' +
        '<button type="button" class="agri-permit-photo-remove" ' +
          'data-remove-photo="' + kind + '" aria-label="Remove photo">&times;</button>';
      preview.hidden = false;

      cell.dataset.photoDataUrl = reader.result;
      cell.dataset.photoName    = file.name;
      cell.dataset.photoSize    = file.size;

      var row = cell.closest('tr');
      if (row) {
        if (kind === 'seller') row.dataset.sellerPhoto = 'set';
        if (kind === 'animal') row.dataset.animalPhoto = 'set';
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoRemove(e) {
    var rm = e.target.closest('[data-remove-photo]');
    if (!rm) return;
    e.preventDefault();

    var kind = rm.getAttribute('data-remove-photo');
    var cell = rm.closest('.agri-permit-photo-cell, .agri-permit-rep-photo');
    if (!cell) return;

    var preview = cell.querySelector('.agri-permit-photo-preview');
    if (preview) { preview.innerHTML = ''; preview.hidden = true; }

    var input = cell.querySelector('.agri-permit-photo-input[data-photo-kind="' + kind + '"]');
    if (input) input.value = '';

    delete cell.dataset.photoDataUrl;
    delete cell.dataset.photoName;
    delete cell.dataset.photoSize;

    var row = cell.closest('tr');
    if (row) {
      if (kind === 'seller') delete row.dataset.sellerPhoto;
      if (kind === 'animal') delete row.dataset.animalPhoto;
    }
  }

  /* ---------------------------------------------------------------- ADD ROW */

  function addSellerRow() {
    var body = document.getElementById('permitSellerBody');
    if (!body) return;

    var template = body.querySelector('tr');
    if (!template) return;

    var newRow = template.cloneNode(true);

    var rows = body.querySelectorAll('tr');
    newRow.querySelector('.agri-permit-sn').textContent = String(rows.length + 1);

    newRow.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'file') { el.value = ''; return; }
      if (el.type === 'checkbox' || el.type === 'radio') { el.checked = false; return; }
      el.value = '';
    });

    delete newRow.dataset.animalCode;
    delete newRow.dataset.animalCodeParts;
    delete newRow.dataset.sellerPhoto;
    delete newRow.dataset.animalPhoto;
    newRow.dataset.confirmState = 'pending';

    newRow.querySelectorAll('.agri-permit-photo-preview').forEach(function (p) {
      p.innerHTML = ''; p.hidden = true;
    });

    var badge = newRow.querySelector('.agri-permit-code-badge');
    if (badge) { badge.className = 'agri-permit-code-badge pending'; badge.textContent = 'Auto'; }

    var confirmBadge = newRow.querySelector('.agri-permit-confirm-badge');
    if (confirmBadge) {
      confirmBadge.dataset.state = 'pending';
      confirmBadge.innerHTML = '<i class="fas fa-clock"></i> Pending';
    }

    body.appendChild(newRow);

    /* Try to auto-assign immediately (will show "Auto" if NRC/province blank) */
    setTimeout(function () { assignAnimalCode(newRow, true); }, 30);
  }

  /* ---------------------------------------------------------------- VIDEO UPLOAD */

  function openVetVideoUpload() {
    var input = document.getElementById('agriVetVideoInput');
    if (input) { input.value = ''; input.click(); }
  }

  function handleVideoChange(e) {
    var input = e.target;
    if (!input || input.id !== 'agriVetVideoInput') return;
    var file = input.files && input.files[0];
    if (!file) return;

    if (file.size > VIDEO_MAX_BYTES) {
      toast('Video must be under 50 MB.', 'fa-circle-exclamation');
      input.value = '';
      return;
    }

    var url = URL.createObjectURL(file);
    var player  = document.getElementById('agriVetVideoPlayer');
    var preview = document.getElementById('agriVetVideoPreview');
    var nameEl  = document.getElementById('agriVetVideoName');
    var sizeEl  = document.getElementById('agriVetVideoSize');

    if (player) player.src = url;
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    if (preview) preview.hidden = false;

    if (player) {
      player.addEventListener('loadedmetadata', function once() {
        player.removeEventListener('loadedmetadata', once);
        if (player.duration > VIDEO_MAX_SECONDS + 0.5) {
          toast('Video is longer than 30 seconds. Please shorten it.', 'fa-circle-exclamation');
        }
      });
    }
  }

  function removeVetVideo() {
    var input   = document.getElementById('agriVetVideoInput');
    var preview = document.getElementById('agriVetVideoPreview');
    var player  = document.getElementById('agriVetVideoPlayer');
    if (input) input.value = '';
    if (preview) preview.hidden = true;
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
  }

  /* ---------------------------------------------------------------- AWARENESS */

  function toggleAwareness(btn) {
    var current = btn.dataset.state;
    var next = current === 'aware' ? 'ignorant' : current === 'ignorant' ? '' : 'aware';
    btn.dataset.state = next;

    if (next === 'aware') {
      btn.className = 'agri-permit-awareness-btn aware';
      btn.innerHTML = '<i class="fas fa-check"></i> Aware';
    } else if (next === 'ignorant') {
      btn.className = 'agri-permit-awareness-btn ignorant';
      btn.innerHTML = '<i class="fas fa-xmark"></i> Ignorant';
    } else {
      btn.className = 'agri-permit-awareness-btn';
      btn.innerHTML = '<i class="fas fa-question-circle"></i> Set';
    }
  }

  /* ---------------------------------------------------------------- NOTIFY */

  function notifySeller(btn) {
    var row = btn.closest('tr');
    if (!row) return;
    var code   = row.dataset.animalCode || 'N/A';
    var seller = row.querySelector('[data-field="seller_name"]');
    var phone  = row.querySelector('[data-field="seller_phone"]');
    var desc   = row.querySelector('[data-field="animal_desc"]');

    if (!seller || !seller.value.trim() || !phone || !phone.value.trim()) {
      toast('Seller name and phone are required before sending SMS.', 'fa-circle-exclamation');
      return;
    }

    toast('SMS sent to ' + phone.value.trim(), 'fa-paper-plane');

    var badge = row.querySelector('.agri-permit-confirm-badge');
    if (badge) {
      badge.dataset.state = 'awaiting';
      badge.innerHTML = '<i class="fas fa-hourglass-half"></i> Awaiting';
    }

    var confirmMsg = document.getElementById('agriSellerConfirmMsg');
    if (confirmMsg) {
      confirmMsg.innerHTML =
        'You are selling <strong>' +
        esc(desc && desc.value ? desc.value.trim() : 'the animal(s)') +
        ' (' + esc(code) + ')</strong>. By confirming, you declare that this animal is yours, ' +
        'you confirm the sale, and you have no further claim.';
    }
    var sellerModal = document.getElementById('agriSellerConfirmModal');
    if (sellerModal) sellerModal.hidden = false;
  }

  function notifyOfficer(btn) {
    var row = btn.closest('tr');
    if (!row) return;
    var name  = row.querySelector('[data-field$="_name"]');
    var phone = row.querySelector('[data-field$="_phone"]');
    if (!name || !name.value.trim() || !phone || !phone.value.trim()) {
      toast('Officer name and phone are required.', 'fa-circle-exclamation');
      return;
    }
    toast('SMS sent to ' + phone.value.trim(), 'fa-bell');
  }

  /* ---------------------------------------------------------------- VALIDATION */

  function validate() {
    var errors = [];

    var from = document.getElementById('permitFrom');
    var to   = document.getElementById('permitTo');
    if (!from || !from.value.trim()) errors.push('Origin (From) is required.');
    if (!to   || !to.value.trim())   errors.push('Destination (To) is required.');

    var rows = document.querySelectorAll('#permitSellerBody tr');
    rows.forEach(function (row, i) {
      var label = 'Row ' + (i + 1);
      var fields = ['seller_name', 'seller_nrc', 'seller_phone', 'animal_desc', 'village', 'district', 'province'];
      fields.forEach(function (f) {
        var el = row.querySelector('[data-field="' + f + '"]');
        if (el && el.hasAttribute('required') && !el.value.trim()) {
          errors.push(label + ': ' + f.replace(/_/g, ' '));
        }
      });

      var sellerCell = row.querySelector('.agri-permit-photo-cell[data-photo-kind="seller"]');
      if (sellerCell && !sellerCell.dataset.photoDataUrl) {
        errors.push(label + ': Seller photo missing.');
      }
      var animalCell = row.querySelector('.agri-permit-photo-cell[data-photo-kind="animal"]');
      if (animalCell && !animalCell.dataset.photoDataUrl) {
        errors.push(label + ': Animal photo missing.');
      }

      if (!row.dataset.animalCode) {
        errors.push(label + ': Animal code not yet generated. Please fill NRC and Province.');
      }
    });

    var repName = document.getElementById('permitRepName');
    var repDate = document.getElementById('permitRepDate');
    var repCell = document.querySelector('.agri-permit-rep-photo');
    if (!repName || !repName.value.trim()) errors.push('ZBS Rep Name is required.');
    if (!repDate || !repDate.value.trim()) errors.push('ZBS Rep Date is required.');
    if (repCell && !repCell.dataset.photoDataUrl) errors.push('ZBS Rep photo is required.');

    return errors;
  }

  /* ---------------------------------------------------------------- SUBMIT */

  function handleSubmit(e) {
    e.preventDefault();

    var statusEl = document.getElementById('agriPermitStatus');
    var errs = validate();

    if (errs.length) {
      if (statusEl) {
        statusEl.className = 'agri-permit-status error';
        statusEl.innerHTML =
          '<strong>Please fix:</strong><ul>' +
            errs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          '</ul>';
        statusEl.hidden = false;
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    var payload = {
      ref:         'ZBS-PERMIT-' + Date.now().toString(36).toUpperCase(),
      submittedAt: new Date().toISOString(),
      from:        document.getElementById('permitFrom').value.trim(),
      to:          document.getElementById('permitTo').value.trim(),
      animals:     [],
      vetVideo:    document.getElementById('agriVetVideoInput').files[0]
                     ? { name: document.getElementById('agriVetVideoInput').files[0].name } : null,
      vetNotes:    document.getElementById('agriVetVideoNotes').value.trim(),
      zbsRep:      {
        name:  document.getElementById('permitRepName').value.trim(),
        code:  document.getElementById('permitRepCode').value.trim(),
        date:  document.getElementById('permitRepDate').value,
        photo: document.querySelector('.agri-permit-rep-photo').dataset.photoDataUrl || null
      }
    };

    document.querySelectorAll('#permitSellerBody tr').forEach(function (row) {
      var animal = {
        seller_name:  getField(row, 'seller_name'),
        seller_nrc:   getField(row, 'seller_nrc'),
        seller_phone: getField(row, 'seller_phone'),
        animal_desc:  getField(row, 'animal_desc'),
        animal_code:  row.dataset.animalCode,
        animal_brand: getField(row, 'animal_brand'),
        animal_colour:getField(row, 'animal_colour'),
        village:      getField(row, 'village'),
        district:     getField(row, 'district'),
        province:     getField(row, 'province'),
        seller_date:  getField(row, 'seller_date'),
        confirm_state: row.dataset.confirmState || 'pending',
        photos: {}
      };
      ['seller', 'animal'].forEach(function (kind) {
        var cell = row.querySelector('.agri-permit-photo-cell[data-photo-kind="' + kind + '"]');
        if (cell && cell.dataset.photoDataUrl) {
          animal.photos[kind] = {
            name: cell.dataset.photoName || kind + '.jpg',
            size: Number(cell.dataset.photoSize) || 0,
            data: cell.dataset.photoDataUrl
          };
        }
      });
      payload.animals.push(animal);
    });

    try {
      var list = JSON.parse(localStorage.getItem('agri_permits_v1') || '[]');
      list.push({
        ref: payload.ref, submittedAt: payload.submittedAt,
        from: payload.from, to: payload.to,
        animalsCount: payload.animals.length
      });
      localStorage.setItem('agri_permits_v1', JSON.stringify(list));
    } catch (err) { console.warn('[Permit] LocalStorage write failed', err); }

    if (statusEl) {
      statusEl.className = 'agri-permit-status success';
      statusEl.innerHTML =
        '<i class="fas fa-check-circle"></i> Permit submitted successfully. ' +
        'Reference: <strong>' + esc(payload.ref) + '</strong>';
      statusEl.hidden = false;
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast('Permit submitted · ' + payload.ref, 'fa-circle-check');
  }

  function getField(row, name) {
    var el = row.querySelector('[data-field="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  /* ---------------------------------------------------------------- PRINT */

  function printPermit() {
    var modal = document.getElementById('agriPermitModal');
    if (!modal) return;
    modal.classList.add('printing');
    setTimeout(function () {
      window.print();
      setTimeout(function () { modal.classList.remove('printing'); }, 500);
    }, 50);
  }

  /* ---------------------------------------------------------------- RESET */

  function resetPermit() {
    var form = document.getElementById('agriPermitForm');
    if (!form) return;
    form.reset();

    document.querySelectorAll('#permitSellerBody tr').forEach(function (row, i) {
      if (i > 0) row.remove();
    });

    var firstRow = document.querySelector('#permitSellerBody tr');
    if (firstRow) {
      delete firstRow.dataset.animalCode;
      delete firstRow.dataset.animalCodeParts;
      delete firstRow.dataset.sellerPhoto;
      delete firstRow.dataset.animalPhoto;
      firstRow.dataset.confirmState = 'pending';

      firstRow.querySelectorAll('.agri-permit-photo-preview').forEach(function (p) {
        p.innerHTML = ''; p.hidden = true;
      });

      var badge = firstRow.querySelector('.agri-permit-code-badge');
      if (badge) { badge.className = 'agri-permit-code-badge pending'; badge.textContent = 'Auto'; }

      var cBadge = firstRow.querySelector('.agri-permit-confirm-badge');
      if (cBadge) { cBadge.dataset.state = 'pending'; cBadge.innerHTML = '<i class="fas fa-clock"></i> Pending'; }
    }

    var statusEl = document.getElementById('agriPermitStatus');
    if (statusEl) { statusEl.hidden = true; statusEl.innerHTML = ''; }
    removeVetVideo();
  }

  /* ---------------------------------------------------------------- EVENTS */

  document.addEventListener('click', function (e) {
    handleUploadPick(e);
    handlePhotoRemove(e);

    var awareBtn = e.target.closest('[data-action="toggleAwareness"]');
    if (awareBtn) { e.preventDefault(); toggleAwareness(awareBtn); return; }

    var notifySellerBtn = e.target.closest('[data-action="notifySeller"]');
    if (notifySellerBtn) { e.preventDefault(); notifySeller(notifySellerBtn); return; }

    var notifyOfficerBtn = e.target.closest('[data-action="notifyOfficer"]');
    if (notifyOfficerBtn) { e.preventDefault(); notifyOfficer(notifyOfficerBtn); return; }

    var addRowBtn = e.target.closest('#permitAddSellerRow, [data-action="addSellerRow"]');
    if (addRowBtn) { e.preventDefault(); addSellerRow(); return; }

    var vidBtn = e.target.closest('[data-action="openVetVideoUpload"]');
    if (vidBtn) { e.preventDefault(); openVetVideoUpload(); return; }

    var removeVidBtn = e.target.closest('[data-action="removeVetVideo"]');
    if (removeVidBtn) { e.preventDefault(); removeVetVideo(); return; }

    var printBtn = e.target.closest('[data-action="printAgriPermit"]');
    if (printBtn) { e.preventDefault(); printPermit(); return; }
  });

  /* Input/change: regenerate codes when NRC or Province changes */
  document.addEventListener('input', function (e) {
    var target = e.target.closest('[data-field="seller_nrc"], [data-field="province"]');
    if (!target) return;
    var row = target.closest('tr');
    if (row) assignAnimalCode(row, false);
  }, true);

  document.addEventListener('change', function (e) {
    handleFileChange(e);
    handleVideoChange(e);

    var target = e.target.closest('[data-field="seller_nrc"], [data-field="province"]');
    if (target) {
      var row = target.closest('tr');
      if (row) assignAnimalCode(row, false);
    }
  });

  /* Auto-init on permit modal open */
  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-action="openAgriPermit"]');
    if (!openBtn) return;
    setTimeout(function () {
      var repDate    = document.getElementById('permitRepDate');
      var sellerDate = document.querySelector('[data-field="seller_date"]');
      var today = new Date().toISOString().slice(0, 10);
      if (repDate && !repDate.value)       repDate.value = today;
      if (sellerDate && !sellerDate.value) sellerDate.value = today;
      refreshAllAnimalCodes();
    }, 200);
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('agriPermitForm');
    if (form) form.addEventListener('submit', handleSubmit);
  });

  window.AgriPermit = {
    reset:   resetPermit,
    refresh: refreshAllAnimalCodes,
    print:   printPermit
  };

})();