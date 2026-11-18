/* ============================================================================
   ProHire — "Become a Pro" application flow
   Handles: data-action="openProHireApply"   → opens #prohireApplyModal
             data-action="closeProHireApply"  → closes it
             data-action="prohireApplyPick"   → opens file picker for a field
   ========================================================================== */
(function () {
  'use strict';

  if (window.__proHireApplyInitialised) return;
  window.__proHireApplyInitialised = true;

  var MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB
  var STORAGE_KEY    = 'prohire_applications_v1';
  

  /* Fields → DOM ids */
  var FIELDS = {
    certificate: { input: 'paCertFile',      preview: 'paCertPreview' },
    id:          { input: 'paIdFile',        preview: 'paIdPreview'   },
    police:      { input: 'paPoliceFile',    preview: 'paPolicePreview' },
    insurance:   { input: 'paInsuranceFile', preview: 'paInsurancePreview' },
    photo:       { input: 'paPhotoFile',     preview: 'paPhotoPreview' }
  };

  /* Files collected so far (in-memory, not yet persisted) */
  var files = {
    certificate: null,
    id:          null,
    police:      null,
    insurance:   null,
    photo:       null
  };

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  }); }

  /* ---------------------------------------------------------------- OPEN / CLOSE */

  function open() {
    var m = $('#prohireApplyModal');
    if (!m) { console.warn('[ProHire Apply] #prohireApplyModal not found'); return; }
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    updateProgress();
  }

  function close() {
    var m = $('#prohireApplyModal');
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------------------------------------------------------- FILE PICKING */

  function pickFile(key) {
    var cfg = FIELDS[key];
    if (!cfg) return;
    var input = document.getElementById(cfg.input);
    if (input) input.click();
  }

  function attachFileInputs() {
    Object.keys(FIELDS).forEach(function (key) {
      var cfg = FIELDS[key];
      var input = document.getElementById(cfg.input);
      if (!input) return;
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
          alert('File too large. Max size is 5 MB.');
          input.value = '';
          return;
        }
        files[key] = file;
        renderPreview(key, file);
        updateProgress();
      });
    });
  }

  function renderPreview(key, file) {
    var cfg = FIELDS[key];
    var wrap = document.getElementById(cfg.preview);
    if (!wrap) return;
    var tile = wrap.closest('.prohire-apply-upload');
    if (tile) tile.classList.add('has-file');

    var isImage = file.type.indexOf('image/') === 0;
    var thumbHTML;
    if (isImage) {
      var url = URL.createObjectURL(file);
      thumbHTML = '<img src="' + url + '" alt="" />';
    } else {
      thumbHTML = '<div class="file-icon"><i class="fas fa-file-pdf"></i></div>';
    }

    wrap.innerHTML =
      thumbHTML +
      '<div class="file-meta">' +
        '<strong title="' + esc(file.name) + '">' + esc(file.name) + '</strong>' +
        '<span>' + (file.size / 1024).toFixed(0) + ' KB</span>' +
      '</div>' +
      '<button type="button" class="file-remove" data-remove-field="' + key + '" aria-label="Remove file">&times;</button>';
    wrap.hidden = false;
  }

  function removeFile(key) {
    files[key] = null;
    var cfg = FIELDS[key];
    var input = document.getElementById(cfg.input);
    if (input) input.value = '';
    var wrap = document.getElementById(cfg.preview);
    if (wrap) { wrap.innerHTML = ''; wrap.hidden = true; }
    var tile = wrap && wrap.closest('.prohire-apply-upload');
    if (tile) tile.classList.remove('has-file');
    updateProgress();
  }

  /* ---------------------------------------------------------------- PROGRESS */

  function updateProgress() {
    var form = $('#prohireApplyForm');
    if (!form) return;

    /* Required fields count = 15 for non-vehicle, less if category not vehicles */
    var requiredInputs = $$('#prohireApplyForm [required]').filter(function (el) {
      return el.type !== 'checkbox' || el.checked;
    });

    var filled = 0;
    requiredInputs.forEach(function (el) {
      if (el.type === 'checkbox') { if (el.checked) filled++; }
      else if (el.value && el.value.trim()) filled++;
    });

    /* Mandatory uploads: certificate, id, police, photo */
    ['certificate', 'id', 'police', 'photo'].forEach(function (k) {
      if (files[k]) filled++;
    });

    var total = $$('#prohireApplyForm [required]').length + 4;
    var pct = Math.min(100, Math.round((filled / Math.max(total, 1)) * 100));
    var bar = $('#prohireApplyProgressBar');
    if (bar) bar.style.width = pct + '%';
  }

  /* ---------------------------------------------------------------- CATEGORY EXTRAS */

  function bindCategoryExtras() {
    var sel = $('#paCategory');
    var extra = $('#paVehiclesExtra');
    if (!sel || !extra) return;
    sel.addEventListener('change', function () {
      extra.hidden = sel.value !== 'vehicles';
    });
  }

  function bindBioCounter() {
    var bio = $('#paBio');
    var cnt = $('#paBioCount');
    if (!bio || !cnt) return;
    bio.addEventListener('input', function () { cnt.textContent = bio.value.length; });
  }
function bindCityCurrency() {
  var citySel = document.getElementById('paCity');
  if (!citySel) return;

  citySel.addEventListener('change', function () {
    applyRateCurrency(citySel.value);
  });

  /* If a city is already pre-selected (e.g. from localStorage restore),
     apply the currency immediately. */
  if (citySel.value) applyRateCurrency(citySel.value);
}

function bindRateInput() {
  var input = document.getElementById('paRate');
  if (!input) return;
  input.addEventListener('input', updateRateEquivalent);
  input.addEventListener('change', updateRateEquivalent);
}
  /* ---------------------------------------------------------------- VALIDATION */

  function validate() {
    var errors = [];

    var name  = $('#paFullName');
    var phone = $('#paPhone');
    var email = $('#paEmail');
    var id    = $('#paIdNumber');
    var city  = $('#paCity');
    var cat   = $('#paCategory');
    var spec  = $('#paSpecialty');
    var yrs   = $('#paYears');
    var rate  = $('#paRate');
    var bio   = $('#paBio');
    var agree = $('#paAgreeTerms');
    var consent = $('#paConsentCheck');

    if (!name.value.trim())                    errors.push('Full name is required.');
    if (!phone.value.trim())                   errors.push('Phone number is required.');
    if (!email.value.trim() || email.value.indexOf('@') < 0)
                                               errors.push('A valid email is required.');
    if (!id.value.trim())                      errors.push('ID / Passport number is required.');
    if (!city.value)                           errors.push('Please select your city.');
    if (!cat.value)                            errors.push('Please select your profession category.');
    if (!spec.value.trim())                    errors.push('Specialty is required.');
    if (!yrs.value || Number(yrs.value) < 0)   errors.push('Years of experience is required.');
    if (!rate.value || Number(rate.value) <= 0) errors.push('Your rate is required.');
    if (!bio.value.trim())                     errors.push('A short bio is required.');

    if (!files.certificate)                    errors.push('Upload your professional certificate.');
    if (!files.id)                             errors.push('Upload your national ID / passport.');
    if (!files.police)                         errors.push('Upload your police clearance.');
    if (!files.photo)                          errors.push('Upload a profile photo.');

    if (!agree.checked)                        errors.push('You must accept the Terms & Conditions.');
    if (!consent.checked)                      errors.push('You must consent to a background check.');

    return errors;
  }

  /* ---------------------------------------------------------------- SUBMIT */

  function submit(e) {
    e.preventDefault();
    var statusEl = $('#prohireApplyStatus');
    var btn      = $('#prohireApplySubmitBtn');

    var errs = validate();
    if (errs.length) {
      if (statusEl) {
        statusEl.className = 'prohire-apply-status error';
        statusEl.innerHTML =
          '<strong>Please fix the following:</strong>' +
          '<ul style="margin:6px 0 0 18px;padding:0">' +
            errs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          '</ul>';
        statusEl.hidden = false;
      }
      statusEl && statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

    /* Build payload (file contents stay in-memory; we store metadata + data URLs) */
    var payload = {
      ref:        'ZBS-PH-' + Date.now().toString(36).toUpperCase(),
      submittedAt: new Date().toISOString(),
      fullName:   $('#paFullName').value.trim(),
      phone:      $('#paPhone').value.trim(),
      email:      $('#paEmail').value.trim(),
      idNumber:   $('#paIdNumber').value.trim(),
      gender:     $('#paGender').value,
      dob:        $('#paDob').value,
      city:       $('#paCity').value,
      address:    $('#paAddress').value.trim(),
      category:   $('#paCategory').value,
      specialty:  $('#paSpecialty').value.trim(),
      years:      Number($('#paYears').value),
    rate:         Number($('#paRate').value),              // as typed (local currency)
rateCurrency: rateCurrencyCode,                        // e.g. "ZMW"
rateUsd:      toUsdBase(Number($('#paRate').value), rateCurrencyCode), // base for the marketplace
unit:         $('#paUnit').value,
      bio:        $('#paBio').value.trim(),
      occasions:  Array.prototype.slice
                    .call(document.querySelectorAll('input[name="occasions"]:checked'))
                    .map(function (el) { return el.value; }),
      capacity:   $('#paCapacity') && $('#paCapacity').value ? Number($('#paCapacity').value) : null,
      files:      {},
      status:     'pending'
    };

    /* Convert each file to a data URL so the record survives page reload */
    var fileKeys = Object.keys(files).filter(function (k) { return !!files[k]; });
    var converted = 0;

    function finish() {
      /* Save to localStorage (trim large base64s to keep under ~2 MB) */
      try {
        var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        list.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn('[ProHire Apply] Could not persist to localStorage:', err);
      }

      showSuccess(payload);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application'; }
    }

    if (!fileKeys.length) { finish(); return; }

    fileKeys.forEach(function (key) {
      var reader = new FileReader();
      reader.onload = function () {
        payload.files[key] = {
          name: files[key].name,
          size: files[key].size,
          type: files[key].type,
          data: reader.result
        };
        converted++;
        if (converted === fileKeys.length) finish();
      };
      reader.onerror = function () {
        converted++;
        if (converted === fileKeys.length) finish();
      };
      reader.readAsDataURL(files[key]);
    });
  }

  function showSuccess(payload) {
    var body = $('.prohire-apply-body');
    var footer = $('.prohire-apply-footer');
    if (!body) return;

    body.innerHTML =
      '<div class="prohire-apply-success-card">' +
        '<i class="fas fa-circle-check"></i>' +
        '<h3>Application Submitted</h3>' +
        '<p>Thank you, <strong>' + esc(payload.fullName) + '</strong>. Your application has been received.</p>' +
        '<p>Reference number:</p>' +
        '<span class="ref-code">' + esc(payload.ref) + '</span>' +
        '<p style="margin-top:14px">Our team will review it within <strong>2 business days</strong> and contact you at <strong>' + esc(payload.email) + '</strong>.</p>' +
      '</div>';

    if (footer) {
      footer.innerHTML =
        '<div class="prohire-apply-footer-actions" style="margin-left:auto">' +
          '<button type="button" class="prohire-apply-submit" data-action="closeProHireApply">' +
            '<i class="fas fa-check"></i> Done' +
          '</button>' +
        '</div>';
    }

    if (typeof window.showToast === 'function') {
      window.showToast('Application submitted · ref ' + payload.ref, 'fa-circle-check');
    }

    /* Reset form so a new application could be opened */
    setTimeout(function () {
      if (typeof reset === 'function') reset();
    }, 4000);
  }

  function reset() {
    var form = $('#prohireApplyForm');
    if (!form) return;
    form.reset();
    Object.keys(files).forEach(removeFile);
    updateProgress();
  }

  /* ---------------------------------------------------------------- EVENTS */

  document.addEventListener('click', function (e) {
    var act = e.target.closest('[data-action]');
    if (!act) {
      /* Remove-file button */
      var rm = e.target.closest('[data-remove-field]');
      if (rm) {
        e.preventDefault();
        removeFile(rm.getAttribute('data-remove-field'));
      }
      return;
    }

    if (act.dataset.action === 'openProHireApply') {
      e.preventDefault(); e.stopPropagation();
      open();
      return;
    }
    if (act.dataset.action === 'closeProHireApply') {
      e.preventDefault(); e.stopPropagation();
      close();
      return;
    }
    if (act.dataset.action === 'prohireApplyPick') {
      e.preventDefault();
      pickFile(act.getAttribute('data-field'));
      return;
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = $('#prohireApplyModal');
    if (m && !m.hidden) { close(); }
  });

  /* ---------------------------------------------------------------- INIT */

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    attachFileInputs();
    bindCategoryExtras();
    bindBioCounter();

    var form = $('#prohireApplyForm');
    if (form) {
      form.addEventListener('submit', submit);
      form.addEventListener('input', updateProgress);
      form.addEventListener('change', updateProgress);
    }
function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }

  attachFileInputs();
  bindCategoryExtras();
  bindBioCounter();
  bindCityCurrency();     // ← NEW
  bindRateInput();        // ← NEW

  var form = $('#prohireApplyForm');
  if (form) {
    form.addEventListener('submit', submit);
    form.addEventListener('input', updateProgress);
    form.addEventListener('change', updateProgress);
  }

  updateProgress();
}
    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ProHireApply = { open: open, close: close, reset: reset };

})();
/* ---------------------------------------------------------------- CURRENCY */

/* Fallback maps — used if window.ProHire isn't loaded yet.
   The real maps live in prohire-hub.js, and we prefer those. */
var FALLBACK_CURRENCIES = {
  USD: { code: 'USD', symbol: '$',    rate: 1,     step: 1,   locale: 'en-US' },
  KES: { code: 'KES', symbol: 'KSh ', rate: 129,   step: 50,  locale: 'en-KE' },
  GBP: { code: 'GBP', symbol: '£',    rate: 0.79,  step: 5,   locale: 'en-GB' },
  AED: { code: 'AED', symbol: 'AED ', rate: 3.67,  step: 5,   locale: 'en-AE' },
  ZAR: { code: 'ZAR', symbol: 'R',    rate: 16.51, step: 10,  locale: 'en-ZA' },
  BWP: { code: 'BWP', symbol: 'P',    rate: 13.74, step: 5,   locale: 'en-BW' },
  NAD: { code: 'NAD', symbol: 'N$',   rate: 16.64, step: 10,  locale: 'en-NA' },
  ZMW: { code: 'ZMW', symbol: 'K ',   rate: 26.50, step: 50,  locale: 'en-ZM' },
  MWK: { code: 'MWK', symbol: 'MK',   rate: 1717,  step: 500, locale: 'en-MW' },
  MZN: { code: 'MZN', symbol: 'MT',   rate: 63.83, step: 50,  locale: 'pt-MZ' },
  ZWG: { code: 'ZWG', symbol: 'ZiG',  rate: 25.34, step: 5,   locale: 'en-ZW' },
  LSL: { code: 'LSL', symbol: 'L',    rate: 16.58, step: 10,  locale: 'en-LS' },
  SZL: { code: 'SZL', symbol: 'E',    rate: 16.51, step: 10,  locale: 'en-SZ' }
};

var FALLBACK_CITY_CURRENCY = {
  nairobi: 'KES', mombasa: 'KES', kisumu: 'KES',
  newyork: 'USD', losangeles: 'USD',
  london: 'GBP', dubai: 'AED',
  johannesburg: 'ZAR', capetown: 'ZAR', durban: 'ZAR',
  gaborone: 'BWP', windhoek: 'NAD',
  lusaka: 'ZMW', livingstone: 'ZMW',
  lilongwe: 'MWK', maputo: 'MZN', harare: 'ZWG',
  maseru: 'LSL', mbabane: 'SZL'
};

function getCurrencies() {
  return (window.ProHire && window.ProHire.CURRENCIES) || FALLBACK_CURRENCIES;
}
function getCityCurrency() {
  return (window.ProHire && window.ProHire.CITY_CURRENCY) || FALLBACK_CITY_CURRENCY;
}
function getDefaultCurrency() {
  return (window.ProHire && window.ProHire.DEFAULT_CURRENCY) || 'USD';
}

/* The rate the applicant is typing is in this currency. */
var rateCurrencyCode = 'USD';

function rateCurrencyMeta(code) {
  var all = getCurrencies();
  return all[code] || all.USD;
}

/* Convert a local-currency amount → USD base (what prohire-hub.js stores). */
function toUsdBase(localAmount, code) {
  var meta = rateCurrencyMeta(code);
  return localAmount / meta.rate;
}

/* Convert USD base → a local amount (for display). */
function fromUsdBase(usdAmount, code) {
  var meta = rateCurrencyMeta(code);
  return usdAmount * meta.rate;
}

/* Update the label / symbol / placeholder / hint when the city changes. */
function applyRateCurrency(cityKey) {
  var cityMap = getCityCurrency();
  var newCode = cityMap[cityKey] || getDefaultCurrency();
  rateCurrencyCode = newCode;

  var meta = rateCurrencyMeta(newCode);

  var curLabel = document.getElementById('paRateCurrency');
  var symEl    = document.getElementById('paRateSymbol');
  var input    = document.getElementById('paRate');
  var hint     = document.getElementById('paRateHint');

  if (curLabel) curLabel.textContent = meta.code;
  if (symEl)    symEl.textContent = meta.symbol.trim();
  if (input) {
    input.placeholder = 'e.g. ' + (meta.step * 10).toLocaleString(meta.locale);
    input.step = meta.step;
    input.min  = meta.step;
  }
  if (hint) {
    hint.textContent = 'Enter your rate in ' + meta.code +
      '. This will be auto-converted for applicants in other countries.';
  }

  /* Recompute the USD equivalent hint */
  updateRateEquivalent();
}

/* Show "= $X USD base" under the rate input. */
function updateRateEquivalent() {
  var input   = document.getElementById('paRate');
  var equiv   = document.getElementById('paRateEquiv');
  var usdEl   = document.getElementById('paRateUsd');
  if (!input || !equiv || !usdEl) return;

  var localVal = Number(input.value);
  if (!localVal || localVal <= 0) {
    equiv.hidden = true;
    return;
  }

  var usd = toUsdBase(localVal, rateCurrencyCode);
  usdEl.textContent = '$' + (Math.round(usd * 100) / 100).toLocaleString('en-US');
  equiv.hidden = false;
}