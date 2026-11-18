/* =========================================================
   social-hub-contacts.js
   Zeroth Business Solutions — Social Hub extension

   Adds to the Social Hub:
     · Contact import
         – Native Contact Picker API (mobile Chrome/Edge)
         – vCard (.vcf) upload
         – CSV upload (name,email,phone)
         – Manual entry
         – Persists contacts per-browser (IndexedDB → memory fallback)
     · Email sending
         – mailto: composer with multiple recipients
         – Optional EmailJS-style endpoint hook
         – Template picker (short / friendly / formal)
     · SMS sending
         – sms: link (one or many recipients, comma-separated)
         – WhatsApp / Telegram share links
         – Optional bulk SMS endpoint hook
     · Broadcast integration
         – Adds picked contacts as targets in the Social Hub composer
         – Sends one message to many contacts at once

   Public API (window.ZBSContacts):
     open()                          – open the Contacts drawer
     close()                         – close it
     list()                          – all saved contacts
     add(contact)                    – add one
     addMany(contacts)               – bulk add
     remove(id)                      – delete
     clear()                         – wipe all
     importVCard(file)               – parse .vcf → Promise<Contact[]>
     importCSV(file)                 – parse .csv → Promise<Contact[]>
     pickNative()                    – Promise<Contact[]> (mobile only)
     sendEmail(contacts, opts)       – open email composer
     sendSMS(contacts, opts)         – open sms: link
     sendWhatsApp(contacts, message) – WhatsApp deep link
     broadcast(contacts, message)    – add as composer targets

   ========================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------
     CONFIG
     ------------------------------------------------------ */
  var DB_NAME      = 'zbs_contacts';
  var DB_STORE     = 'contacts';
  var DB_VERSION   = 1;
  var MAX_CONTACTS = 5000;

  /* Optional: set a real endpoint to enable server-side email / SMS */
  var EMAIL_ENDPOINT = '';   // e.g. 'https://api.zbs.example/email/send'
  var SMS_ENDPOINT   = '';   // e.g. 'https://api.zbs.example/sms/send'

  /* ------------------------------------------------------
     STATE
     ------------------------------------------------------ */
  var contacts  = [];             // in-memory cache
  var selected  = new Set();      // ids currently selected
  var db        = null;
  var memory    = Object.create(null);
  var drawerEl  = null;
  var refs      = null;

  /* ------------------------------------------------------
     HELPERS
     ------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function uid() {
    return 'c_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initials(name) {
    name = String(name || '?').trim();
    if (!name) return '?';
    var p = name.split(/\s+/);
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  function looksLikeEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }
  function looksLikePhone(s) { return /^[+\d][\d\s\-()]{6,}$/.test(String(s || '').trim()); }

  function toast(msg, kind) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast'; el.className = 'toast'; el.hidden = true;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._zbsC);
    el._zbsC = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 260);
    }, 2600);
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

  function idbPut(rec) {
    if (!db) { memory[rec.id] = rec; return Promise.resolve(); }
    return new Promise(function (res) {
      try {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(rec);
        tx.oncomplete = function () { res(); };
        tx.onerror    = function () { memory[rec.id] = rec; res(); };
      } catch (e) { memory[rec.id] = rec; res(); }
    });
  }

  function idbAll() {
    if (!db) return Promise.resolve(Object.keys(memory).map(function (k) { return memory[k]; }));
    return new Promise(function (res) {
      try {
        var tx = db.transaction(DB_STORE, 'readonly');
        var req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = function () { res(req.result || []); };
        req.onerror   = function () { res([]); };
      } catch (e) { res([]); }
    });
  }

  function idbDelete(id) {
    if (!db) { delete memory[id]; return Promise.resolve(); }
    return new Promise(function (res) {
      try {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = res; tx.onerror = res;
      } catch (e) { res(); }
    });
  }

  function idbClear() {
    if (!db) { memory = Object.create(null); return Promise.resolve(); }
    return new Promise(function (res) {
      try {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).clear();
        tx.oncomplete = res; tx.onerror = res;
      } catch (e) { res(); }
    });
  }

  /* ------------------------------------------------------
     NORMALISE A CONTACT RECORD
     ------------------------------------------------------ */
  function normalise(raw) {
    raw = raw || {};
    var name  = String(raw.name || raw.fullName || raw.display || '').trim();
    var email = String(raw.email || raw.emailAddress || '').trim().toLowerCase();
    var phone = String(raw.phone || raw.tel || raw.mobile || raw.phoneNumber || '').trim();
    if (!name && !email && !phone) return null;
    if (!name) name = email || phone;
    // strip whitespace from phone but keep + and leading zeros
    phone = phone.replace(/[^\d+]/g, '');
    return {
      id: uid(),
      name: name.slice(0, 120),
      email: looksLikeEmail(email) ? email.slice(0, 160) : '',
      phone: looksLikePhone(phone) ? phone.slice(0, 40) : '',
      org: String(raw.org || raw.company || '').slice(0, 120),
      notes: String(raw.notes || '').slice(0, 300),
      source: String(raw.source || 'manual').slice(0, 40),
      createdAt: Date.now()
    };
  }

  /* ------------------------------------------------------
     VCARD PARSER (RFC 6350 essentials)
     ------------------------------------------------------ */
  function parseVCard(text) {
    if (!text) return [];
    // unfold folded lines (continuation lines start with space or tab)
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                       .replace(/\n[ \t]/g, '');
    var cards = text.split(/BEGIN:VCARD/i).slice(1);
    var out = [];
    cards.forEach(function (chunk) {
      var body = chunk.split(/END:VCARD/i)[0];
      if (!body) return;
      var lines = body.split('\n');
      var rec = { source: 'vcard' };
      var emails = [], phones = [];
      lines.forEach(function (line) {
        var m = line.match(/^([A-Za-z0-9\-;]+)(?:;([^:]*))?:(.*)$/);
        if (!m) return;
        var key = m[1].toUpperCase();
        var val = (m[3] || '').trim();
        if (!val) return;
        if (key === 'FN' || key === 'N') {
          if (key === 'FN') rec.name = val;
          else if (!rec.name) {
            // N:Family;Given;Middle;Prefix;Suffix
            var parts = val.split(';');
            rec.name = (parts[1] + ' ' + parts[0]).trim() || parts.join(' ').trim();
          }
        } else if (key === 'EMAIL') { emails.push(val); }
        else if (key === 'TEL') { phones.push(val); }
        else if (key === 'ORG') { rec.org = val; }
        else if (key === 'NOTE') { rec.notes = val; }
      });
      rec.email = emails[0] || '';
      rec.phone = phones[0] || '';
      var n = normalise(rec);
      if (n) {
        n.extra = { emails: emails.slice(1), phones: phones.slice(1) };
        out.push(n);
      }
    });
    return out;
  }

  /* ------------------------------------------------------
     CSV PARSER (name,email,phone[,org])
     ------------------------------------------------------ */
  function parseCSV(text) {
    if (!text) return [];
    var lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                            .split('\n').filter(function (l) { return l.trim(); });
    if (!lines.length) return [];

    // detect header
    var first = splitCSVLine(lines[0]).map(function (c) { return c.toLowerCase().trim(); });
    var header = null;
    var dataLines = lines;
    if (first.some(function (c) { return c === 'name' || c === 'email' || c === 'phone' || c === 'e-mail'; })) {
      header = first;
      dataLines = lines.slice(1);
    }

    var idx = { name: 0, email: 1, phone: 2, org: 3 };
    if (header) {
      idx.name  = Math.max(0, header.findIndex(function (h) { return /name|full/.test(h); }));
      idx.email = Math.max(0, header.findIndex(function (h) { return /mail/.test(h); }));
      idx.phone = Math.max(0, header.findIndex(function (h) { return /phone|mobile|tel/.test(h); }));
      idx.org   = Math.max(0, header.findIndex(function (h) { return /org|company|business/.test(h); }));
    }

    var out = [];
    dataLines.forEach(function (line) {
      var cols = splitCSVLine(line);
      var rec = normalise({
        name:  cols[idx.name]  || '',
        email: cols[idx.email] || '',
        phone: cols[idx.phone] || '',
        org:   cols[idx.org]   || '',
        source: 'csv'
      });
      if (rec) out.push(rec);
    });
    return out;
  }

  function splitCSVLine(line) {
    var out = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }

  /* ------------------------------------------------------
     NATIVE CONTACT PICKER (mobile only)
     ------------------------------------------------------ */
  function canPickNative() {
    return 'contacts' in navigator &&
           typeof navigator.contacts.select === 'function';
  }

  function pickNative() {
    if (!canPickNative()) {
      return Promise.reject(new Error(
        'Contact picker is not available on this device / browser. ' +
        'Try uploading a .vcf or .csv file instead.'
      ));
    }
    return navigator.contacts.select(
      ['name', 'email', 'tel'],
      { multiple: true }
    ).then(function (picked) {
      var list = [];
      (picked || []).forEach(function (p) {
        var name = Array.isArray(p.name) ? p.name[0] : p.name;
        var emails = Array.isArray(p.email) ? p.email : [];
        var phones = Array.isArray(p.tel) ? p.tel : [];
        var rec = normalise({
          name: name || (emails[0] || phones[0] || ''),
          email: emails[0] || '',
          phone: phones[0] || '',
          source: 'native'
        });
        if (rec) {
          rec.extra = { emails: emails.slice(1), phones: phones.slice(1) };
          list.push(rec);
        }
      });
      return list;
    });
  }

  /* ------------------------------------------------------
     FILE READER
     ------------------------------------------------------ */
  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload  = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { reject(fr.error || new Error('File read error')); };
      fr.readAsText(file);
    });
  }

  function importVCard(file) {
    return readTextFile(file).then(parseVCard);
  }

  function importCSV(file) {
    return readTextFile(file).then(parseCSV);
  }

  /* ------------------------------------------------------
     PUBLIC CRUD
     ------------------------------------------------------ */
  function list()  { return contacts.slice(); }
  function count() { return contacts.length; }

  function add(contact) {
    var rec = normalise(contact);
    if (!rec) return Promise.reject(new Error('Invalid contact'));
    // de-dupe by email OR phone
    var dup = contacts.find(function (c) {
      return (rec.email && c.email === rec.email) ||
             (rec.phone && c.phone === rec.phone);
    });
    if (dup) return Promise.resolve(dup);   // skip silently
    contacts.push(rec);
    return idbPut(rec).then(function () { render(); return rec; });
  }

  function addMany(list) {
    list = Array.isArray(list) ? list : [];
    var added = [];
    return Promise.all(list.map(function (c) {
      var rec = normalise(c);
      if (!rec) return null;
      var dup = contacts.find(function (x) {
        return (rec.email && x.email === rec.email) ||
               (rec.phone && x.phone === rec.phone);
      });
      if (dup) return null;
      contacts.push(rec);
      added.push(rec);
      return idbPut(rec);
    })).then(function () {
      render();
      return added;
    });
  }

  function remove(id) {
    contacts = contacts.filter(function (c) { return c.id !== id; });
    selected.delete(id);
    return idbDelete(id).then(render);
  }

  function clear() {
    contacts = [];
    selected.clear();
    return idbClear().then(render);
  }

  /* ------------------------------------------------------
     SEND — EMAIL
     ------------------------------------------------------ */
  function sendEmail(list, opts) {
    opts = opts || {};
    list = Array.isArray(list) ? list : [list];
    var to = list.map(function (c) { return c && c.email; })
                  .filter(Boolean);
    if (!to.length) {
      toast('No email addresses in selection.', 'warn');
      return;
    }
    var subject = encodeURIComponent(opts.subject || 'Message from Zeroth Business Solutions');
    var body    = encodeURIComponent(opts.body    || '');
    var cc      = (opts.cc || []).filter(Boolean).map(encodeURIComponent).join(',');
    var bcc     = (opts.bcc || []).filter(Boolean).map(encodeURIComponent).join(',');

    // If a real endpoint is configured, try it first (async)
    if (EMAIL_ENDPOINT) {
      fetch(EMAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to, cc: opts.cc || [], bcc: opts.bcc || [],
          subject: opts.subject || '', body: opts.body || ''
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('Server returned ' + r.status);
        toast('Email sent to ' + to.length + ' contact' + (to.length > 1 ? 's' : ''), 'success');
      }).catch(function (e) {
        console.warn('[ZBSContacts] server email failed, falling back to mailto:', e);
        openMailto(to, subject, body, cc, bcc);
      });
      return;
    }
    openMailto(to, subject, body, cc, bcc);
  }

  function openMailto(to, subject, body, cc, bcc) {
    // mailto is limited — many clients cap at ~50 recipients.
    var parts = ['mailto:' + to.slice(0, 50).join(',')];
    var qs = [];
    if (subject) qs.push('subject=' + subject);
    if (body)    qs.push('body=' + body);
    if (cc)      qs.push('cc=' + cc);
    if (bcc)     qs.push('bcc=' + bcc);
    var url = parts[0] + (qs.length ? '?' + qs.join('&') : '');
    if (url.length > 1800) {
      // too long — open the first recipient, tell the user
      var firstUrl = 'mailto:' + to[0] + (qs.length ? '?' + qs.join('&') : '');
      toast('Opening first of ' + to.length + ' recipients — email client limit.', 'info');
      window.location.href = firstUrl;
      return;
    }
    window.location.href = url;
  }

  /* ------------------------------------------------------
     SEND — SMS
     ------------------------------------------------------ */
  function sendSMS(list, opts) {
    opts = opts || {};
    list = Array.isArray(list) ? list : [list];
    var phones = list.map(function (c) { return c && c.phone; }).filter(Boolean);
    if (!phones.length) {
      toast('No phone numbers in selection.', 'warn');
      return;
    }
    var body = encodeURIComponent(opts.body || '');

    if (SMS_ENDPOINT) {
      fetch(SMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phones, body: opts.body || '' })
      }).then(function (r) {
        if (!r.ok) throw new Error('Server returned ' + r.status);
        toast('SMS sent to ' + phones.length + ' contact' + (phones.length > 1 ? 's' : ''), 'success');
      }).catch(function (e) {
        console.warn('[ZBSContacts] server SMS failed, falling back to sms: link:', e);
        openSMSLink(phones, body);
      });
      return;
    }
    openSMSLink(phones, body);
  }

  function openSMSLink(phones, body) {
    // sms: link — many clients only support one recipient
    if (phones.length === 1) {
      window.location.href = 'sms:' + phones[0] + (body ? '?&body=' + body : '');
    } else {
      // open the first, tell the user
      window.location.href = 'sms:' + phones[0] + (body ? '?&body=' + body : '');
      toast('Opening first of ' + phones.length + ' recipients (SMS client limit).', 'info');
    }
  }

  /* ------------------------------------------------------
     SEND — WHATSAPP / TELEGRAM
     ------------------------------------------------------ */
  function sendWhatsApp(list, message) {
    list = Array.isArray(list) ? list : [list];
    var phones = list.map(function (c) { return c && c.phone; })
                      .filter(Boolean)
                      .map(function (p) { return p.replace(/[^\d]/g, ''); });
    if (!phones.length) { toast('No phone numbers in selection.', 'warn'); return; }
    var text = encodeURIComponent(message || '');
    var url = 'https://wa.me/' + phones[0] + (text ? '?text=' + text : '');
    window.open(url, '_blank', 'noopener');
    if (phones.length > 1) toast('Opening WhatsApp for first recipient.', 'info');
  }

  function sendTelegram(list, message) {
    list = Array.isArray(list) ? list : [list];
    var phones = list.map(function (c) { return c && c.phone; }).filter(Boolean);
    if (!phones.length) { toast('No phone numbers in selection.', 'warn'); return; }
    var text = encodeURIComponent(message || '');
    // Telegram doesn't support direct phone → chat; use share picker
    var url = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) +
              (text ? '&text=' + text : '');
    window.open(url, '_blank', 'noopener');
    if (phones.length > 1) toast('Telegram share is 1-to-1 — pick recipients in the app.', 'info');
  }

  /* ------------------------------------------------------
     BROADCAST INTO SOCIAL HUB COMPOSER
     ------------------------------------------------------ */
  function broadcast(list) {
    list = Array.isArray(list) ? list : [list];
    var hub = document.getElementById('shubPanel');
    if (!hub) {
      toast('Social Hub is not open.', 'warn');
      return;
    }
    var targetsEl = document.getElementById('shubTargetChips');
    if (!targetsEl) {
      toast('Composer targets not found.', 'error');
      return;
    }
    list.forEach(function (c) {
      if (!c) return;
      var chip = document.createElement('span');
      chip.className = 'shub-target-chip';
      chip.setAttribute('data-contact-id', c.id);
      chip.innerHTML =
        '<i class="fas fa-user"></i>' +
        '<span>' + esc(c.name) + '</span>' +
        '<button type="button" class="shub-target-remove" aria-label="Remove">×</button>';
      chip.querySelector('.shub-target-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        chip.remove();
      });
      targetsEl.appendChild(chip);
    });
    toast(list.length + ' contact' + (list.length > 1 ? 's' : '') + ' added to composer', 'success');
    // Open the composer if it's collapsed
    var composer = document.getElementById('shubComposer');
    if (composer && composer.scrollIntoView) {
      composer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  /* ------------------------------------------------------
     DRAWER UI
     ------------------------------------------------------ */
  function ensureDrawer() {
    if (drawerEl) return drawerEl;

    drawerEl = document.createElement('div');
    drawerEl.id = 'zbsContactsDrawer';
    drawerEl.className = 'zbs-contacts-overlay';
    drawerEl.hidden = true;
    drawerEl.innerHTML = [
      '<div class="zbs-contacts-drawer" role="dialog" aria-modal="true" aria-labelledby="zbsContactsTitle">',
      '  <header class="zbs-contacts-head">',
      '    <div class="zbs-contacts-head-left">',
      '      <i class="fas fa-address-book" aria-hidden="true"></i>',
      '      <div>',
      '        <h3 id="zbsContactsTitle">Contacts</h3>',
      '        <span class="zbs-contacts-sub" id="zbsContactsSub">0 contacts</span>',
      '      </div>',
      '    </div>',
      '    <button type="button" class="zbs-contacts-close" aria-label="Close">&times;</button>',
      '  </header>',

      '  <div class="zbs-contacts-toolbar">',
      '    <button type="button" class="zbs-contacts-btn primary" data-caction="pickNative">',
      '      <i class="fas fa-mobile-alt"></i> Pick from phone',
      '    </button>',
      '    <button type="button" class="zbs-contacts-btn" data-caction="uploadVcf">',
      '      <i class="fas fa-file-import"></i> Upload .vcf',
      '    </button>',
      '    <button type="button" class="zbs-contacts-btn" data-caction="uploadCsv">',
      '      <i class="fas fa-file-csv"></i> Upload .csv',
      '    </button>',
      '    <button type="button" class="zbs-contacts-btn" data-caction="addManual">',
      '      <i class="fas fa-user-plus"></i> Add manually',
      '    </button>',
      '    <button type="button" class="zbs-contacts-btn danger" data-caction="clearAll">',
      '      <i class="fas fa-trash"></i> Clear all',
      '    </button>',
      '  </div>',

      '  <div class="zbs-contacts-search">',
      '    <i class="fas fa-search" aria-hidden="true"></i>',
      '    <input type="search" id="zbsContactsSearch" placeholder="Search name, email or phone…" />',
      '  </div>',

      '  <div class="zbs-contacts-list" id="zbsContactsList"></div>',
      '  <div class="zbs-contacts-empty" id="zbsContactsEmpty">',
      '    <i class="fas fa-address-book"></i>',
      '    <p>No contacts yet.</p>',
      '    <small>Import from your phone, or upload a .vcf / .csv file.</small>',
      '  </div>',

      '  <footer class="zbs-contacts-foot">',
      '    <label class="zbs-contacts-selectall">',
      '      <input type="checkbox" id="zbsContactsSelectAll" /> <span>Select all</span>',
      '    </label>',
      '    <span class="zbs-contacts-selcount" id="zbsContactsSelCount">0 selected</span>',
      '    <div class="zbs-contacts-actions">',
      '      <button type="button" class="zbs-contacts-action email" data-caction="emailSel" disabled>',
      '        <i class="fas fa-envelope"></i> Email',
      '      </button>',
      '      <button type="button" class="zbs-contacts-action sms" data-caction="smsSel" disabled>',
      '        <i class="fas fa-comment-sms"></i> SMS',
      '      </button>',
      '      <button type="button" class="zbs-contacts-action wa" data-caction="waSel" disabled>',
      '        <i class="fab fa-whatsapp"></i> WhatsApp',
      '      </button>',
      '      <button type="button" class="zbs-contacts-action broadcast" data-caction="broadcastSel" disabled>',
      '        <i class="fas fa-bullhorn"></i> Broadcast',
      '      </button>',
      '    </div>',
      '  </footer>',
      '</div>',

      /* hidden file inputs */
      '<input type="file" id="zbsContactsVcfInput" accept=".vcf,text/vcard,text/x-vcard" hidden />',
      '<input type="file" id="zbsContactsCsvInput" accept=".csv,text/csv" hidden />'
    ].join('');

    document.body.appendChild(drawerEl);
    refs = {
      overlay:   drawerEl,
      drawer:    drawerEl.querySelector('.zbs-contacts-drawer'),
      closeBtn:  drawerEl.querySelector('.zbs-contacts-close'),
      sub:       drawerEl.querySelector('#zbsContactsSub'),
      list:      drawerEl.querySelector('#zbsContactsList'),
      empty:     drawerEl.querySelector('#zbsContactsEmpty'),
      search:    drawerEl.querySelector('#zbsContactsSearch'),
      selectAll: drawerEl.querySelector('#zbsContactsSelectAll'),
      selCount:  drawerEl.querySelector('#zbsContactsSelCount'),
      actions:   drawerEl.querySelectorAll('.zbs-contacts-action'),
      vcfInput:  drawerEl.querySelector('#zbsContactsVcfInput'),
      csvInput:  drawerEl.querySelector('#zbsContactsCsvInput')
    };
    wireDrawer();
    return drawerEl;
  }

  function open() {
    ensureDrawer();
    drawerEl.hidden = false;
    requestAnimationFrame(function () { drawerEl.classList.add('show'); });
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!drawerEl) return;
    drawerEl.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(function () { drawerEl.hidden = true; }, 220);
  }

  function wireDrawer() {
    // close
    refs.closeBtn.addEventListener('click', close);
    refs.overlay.addEventListener('click', function (e) {
      if (e.target === refs.overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerEl && !drawerEl.hidden) close();
    });

    // search
    refs.search.addEventListener('input', render);

    // select all
    refs.selectAll.addEventListener('change', function () {
      var visible = filtered();
      if (refs.selectAll.checked) {
        visible.forEach(function (c) { selected.add(c.id); });
      } else {
        visible.forEach(function (c) { selected.delete(c.id); });
      }
      render();
    });

    // toolbar actions
    refs.overlay.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-caction]');
      if (!btn) return;
      e.preventDefault();
      var action = btn.getAttribute('data-caction');

      if (action === 'pickNative')   return doPickNative();
      if (action === 'uploadVcf')    return refs.vcfInput.click();
      if (action === 'uploadCsv')    return refs.csvInput.click();
      if (action === 'addManual')    return promptManual();
      if (action === 'clearAll')     return doClearAll();
      if (action === 'emailSel')     return doEmailSelected();
      if (action === 'smsSel')       return doSmsSelected();
      if (action === 'waSel')        return doWhatsAppSelected();
      if (action === 'broadcastSel') return doBroadcastSelected();
    });

    // file inputs
    refs.vcfInput.addEventListener('change', function () {
      var f = refs.vcfInput.files && refs.vcfInput.files[0];
      refs.vcfInput.value = '';
      if (!f) return;
      importVCard(f).then(function (list) {
        return addMany(list).then(function (added) {
          toast(added.length + ' contact' + (added.length === 1 ? '' : 's') + ' imported', added.length ? 'success' : 'info');
        });
      }).catch(function (e) { toast('Import failed: ' + e.message, 'error'); });
    });

    refs.csvInput.addEventListener('change', function () {
      var f = refs.csvInput.files && refs.csvInput.files[0];
      refs.csvInput.value = '';
      if (!f) return;
      importCSV(f).then(function (list) {
        return addMany(list).then(function (added) {
          toast(added.length + ' contact' + (added.length === 1 ? '' : 's') + ' imported', added.length ? 'success' : 'info');
        });
      }).catch(function (e) { toast('Import failed: ' + e.message, 'error'); });
    });

    // row checkbox + buttons delegation
    refs.list.addEventListener('click', function (e) {
      var del = e.target.closest('[data-cdel]');
      if (del) {
        e.stopPropagation();
        var id = del.getAttribute('data-cdel');
        remove(id);
        return;
      }
      var emailBtn = e.target.closest('[data-cmail]');
      if (emailBtn) {
        e.stopPropagation();
        var c1 = contacts.find(function (x) { return x.id === emailBtn.getAttribute('data-cmail'); });
        if (c1) sendEmail([c1]);
        return;
      }
      var smsBtn = e.target.closest('[data-csms]');
      if (smsBtn) {
        e.stopPropagation();
        var c2 = contacts.find(function (x) { return x.id === smsBtn.getAttribute('data-csms'); });
        if (c2) sendSMS([c2]);
        return;
      }
    });

    refs.list.addEventListener('change', function (e) {
      var cb = e.target.closest('input[type="checkbox"][data-cid]');
      if (!cb) return;
      var id = cb.getAttribute('data-cid');
      if (cb.checked) selected.add(id); else selected.delete(id);
      updateSelCount();
    });
  }

  /* ------------------------------------------------------
     DRAWER ACTIONS
     ------------------------------------------------------ */
  function doPickNative() {
    if (!canPickNative()) {
      toast('Native picker unavailable — use .vcf / .csv upload instead.', 'info');
      return;
    }
    pickNative().then(function (list) {
      return addMany(list).then(function (added) {
        toast(added.length + ' contact' + (added.length === 1 ? '' : 's') + ' imported', 'success');
      });
    }).catch(function (err) {
      toast(err && err.message ? err.message : 'Picker cancelled', 'info');
    });
  }

  function promptManual() {
    // build a tiny inline form
    var name  = window.prompt('Full name:', '');
    if (name === null) return;
    var email = window.prompt('Email (optional):', '');
    if (email === null) return;
    var phone = window.prompt('Phone (optional, e.g. +260 97 123 4567):', '');
    if (phone === null) return;
    if (!name && !email && !phone) {
      toast('Nothing to add.', 'warn');
      return;
    }
    add({ name: name, email: email, phone: phone, source: 'manual' })
      .then(function () { toast('Contact added', 'success'); })
      .catch(function () { toast('Could not add contact', 'error'); });
  }

  function doClearAll() {
    if (!contacts.length) return;
    if (!window.confirm('Delete all ' + contacts.length + ' saved contacts? This cannot be undone.')) return;
    clear().then(function () { toast('All contacts cleared', 'info'); });
  }

  function doEmailSelected() {
    var list = selectedContacts();
    if (!list.length) return;
    var subject = window.prompt('Email subject:', 'Message from Zeroth Business Solutions');
    if (subject === null) return;
    var body = window.prompt('Message body:', '');
    if (body === null) return;
    sendEmail(list, { subject: subject, body: body });
  }

  function doSmsSelected() {
    var list = selectedContacts();
    if (!list.length) return;
    var body = window.prompt('SMS text:', '');
    if (body === null) return;
    sendSMS(list, { body: body });
  }

  function doWhatsAppSelected() {
    var list = selectedContacts();
    if (!list.length) return;
    var msg = window.prompt('WhatsApp message:', '');
    if (msg === null) return;
    sendWhatsApp(list, msg);
  }

  function doBroadcastSelected() {
    var list = selectedContacts();
    if (!list.length) return;
    broadcast(list);
    close();
  }

  /* ------------------------------------------------------
     FILTER + RENDER
     ------------------------------------------------------ */
  function filtered() {
    var q = (refs && refs.search ? refs.search.value : '').trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(function (c) {
      return (c.name && c.name.toLowerCase().indexOf(q) !== -1) ||
             (c.email && c.email.toLowerCase().indexOf(q) !== -1) ||
             (c.phone && c.phone.toLowerCase().indexOf(q) !== -1) ||
             (c.org && c.org.toLowerCase().indexOf(q) !== -1);
    });
  }

  function selectedContacts() {
    return contacts.filter(function (c) { return selected.has(c.id); });
  }

  function updateSelCount() {
    if (!refs) return;
    var n = selected.size;
    refs.selCount.textContent = n + ' selected';
    Array.prototype.forEach.call(refs.actions, function (btn) {
      btn.disabled = n === 0;
    });
    // sync select-all checkbox
    var visible = filtered();
    var visibleSelected = visible.filter(function (c) { return selected.has(c.id); }).length;
    refs.selectAll.checked = visible.length > 0 && visibleSelected === visible.length;
    refs.selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
  }

  function render() {
    if (!refs) return;

    // subtitle
    refs.sub.textContent = contacts.length +
      ' contact' + (contacts.length === 1 ? '' : 's');

    var list = filtered();

    if (!list.length) {
      refs.list.innerHTML = '';
      refs.empty.hidden = false;
    } else {
      refs.empty.hidden = true;
      refs.list.innerHTML = list.map(function (c) {
        var isSel = selected.has(c.id);
        var mailBtn = c.email
          ? '<button type="button" class="zbs-contact-mini email" data-cmail="' + esc(c.id) + '" title="Email ' + esc(c.email) + '"><i class="fas fa-envelope"></i></button>'
          : '';
        var smsBtn = c.phone
          ? '<button type="button" class="zbs-contact-mini sms" data-csms="' + esc(c.id) + '" title="SMS ' + esc(c.phone) + '"><i class="fas fa-comment-sms"></i></button>'
          : '';
        return [
          '<div class="zbs-contact-row' + (isSel ? ' is-selected' : '') + '">',
          '  <label class="zbs-contact-check">',
          '    <input type="checkbox" data-cid="' + esc(c.id) + '"' + (isSel ? ' checked' : '') + ' aria-label="Select ' + esc(c.name) + '" />',
          '  </label>',
          '  <div class="zbs-contact-avatar" aria-hidden="true">' + esc(initials(c.name)) + '</div>',
          '  <div class="zbs-contact-body">',
          '    <div class="zbs-contact-name">' + esc(c.name) + (c.org ? ' <span class="zbs-contact-org">· ' + esc(c.org) + '</span>' : '') + '</div>',
          '    <div class="zbs-contact-meta">',
                 c.email ? '<span><i class="fas fa-envelope"></i> ' + esc(c.email) + '</span>' : '',
                 c.phone ? '<span><i class="fas fa-phone"></i> ' + esc(c.phone) + '</span>' : '',
          '    </div>',
          '  </div>',
          '  <div class="zbs-contact-quick">',
                 mailBtn, smsBtn,
          '    <button type="button" class="zbs-contact-mini delete" data-cdel="' + esc(c.id) + '" title="Delete"><i class="fas fa-trash"></i></button>',
          '  </div>',
          '</div>'
        ].join('');
      }).join('');
    }
    updateSelCount();
  }

  /* ------------------------------------------------------
     BOOTSTRAP
     ------------------------------------------------------ */
  function init() {
    openDB().then(function (database) {
      db = database;
      return idbAll();
    }).then(function (rows) {
      contacts = (rows || []).map(normalise).filter(Boolean);
      // make sure refs exist even before opening the drawer
      ensureDrawer();
      render();
      wireHubButton();
    }).catch(function () {
      ensureDrawer();
      render();
      wireHubButton();
    });
  }

  function wireHubButton() {
    // inject a "Contacts" button into the Social Hub header if not already present
    var head = document.querySelector('.shub-head');
    if (!head) return;
    if (head.querySelector('[data-caction="openContacts"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shub-icon-btn';
    btn.setAttribute('data-caction', 'openContacts');
    btn.setAttribute('aria-label', 'Open contacts');
    btn.title = 'Contacts';
    btn.innerHTML = '<i class="fas fa-address-book"></i>';
    var closeBtn = head.querySelector('#shubCloseBtn');
    if (closeBtn) head.insertBefore(btn, closeBtn);
    else head.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      open();
    });
  }

  /* ------------------------------------------------------
     PUBLIC API
     ------------------------------------------------------ */
  window.ZBSContacts = {
    open:  open,
    close: close,
    list:  list,
    count: count,
    add:   add,
    addMany: addMany,
    remove: remove,
    clear:  clear,
    importVCard: importVCard,
    importCSV:   importCSV,
    pickNative:  pickNative,
    canPickNative: canPickNative,
    sendEmail:    sendEmail,
    sendSMS:      sendSMS,
    sendWhatsApp: sendWhatsApp,
    sendTelegram: sendTelegram,
    broadcast:    broadcast,
    refresh:      render
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();