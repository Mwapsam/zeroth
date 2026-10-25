/* ================================================================
   SOCIAL MEDIA HUB — External JavaScript
   Isolated IIFE. No globals leaked.
   ================================================================ */
(function () {
  "use strict";

  /* -------- Guard: exit if already loaded -------- */
  if (window.__ZBS_SOCIAL_HUB__) return;
  window.__ZBS_SOCIAL_HUB__ = true;

  /* -------- Platform registry -------- */
  const PLATFORMS = {
    x:         { name:'X',         color:'#1d9bf0', glyph:'𝕏'  },
    facebook:  { name:'Facebook',  color:'#1877f2', glyph:'f'  },
    instagram: { name:'Instagram', color:'#e1306c', glyph:'Ig' },
    linkedin:  { name:'LinkedIn',  color:'#0a66c2', glyph:'in' },
    tiktok:    { name:'TikTok',    color:'#25f4ee', glyph:'tt' },
    whatsapp:  { name:'WhatsApp',  color:'#25d366', glyph:'wa' },
    telegram:  { name:'Telegram',  color:'#229ed9', glyph:'tg' },
    youtube:   { name:'YouTube',   color:'#ff0033', glyph:'yt' },
    threads:   { name:'Threads',   color:'#a1a1aa', glyph:'@'  },
    reddit:    { name:'Reddit',    color:'#ff4500', glyph:'r'  },
    discord:   { name:'Discord',   color:'#5865f2', glyph:'dc' },
    mastodon:  { name:'Mastodon',  color:'#6364ff', glyph:'m'  },
    pinterest: { name:'Pinterest', color:'#e60023', glyph:'p'  },
    snapchat:  { name:'Snapchat',  color:'#fffc00', glyph:'sc' },
    bluesky:   { name:'Bluesky',   color:'#0085ff', glyph:'bs' }
  };

  /* -------- DOM helpers -------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* -------- Utility helpers -------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?';
  const fmtBytes = b => b < 1024 ? b + ' B'
    : b < 1048576 ? (b / 1024).toFixed(1) + ' KB'
    : (b / 1048576).toFixed(1) + ' MB';
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const plat = k => PLATFORMS[k] || { name: k, color: '#7c5cff', glyph: '?' };

  /* -------- State -------- */
  const state = {
    open: false,
    tab: 'inbox',
    filter: 'all',
    selected: new Set(),
    manualTargets: new Set(),
    attachments: [],
    accounts: [],
    messages: [],
    recording: false,
    mediaRecorder: null,
    recChunks: [],
    recTimer: null,
    recStart: 0,
    camStream: null,
    camRecorder: null,
    camMode: 'photo'
  };

  let uid = 0;
  const nid = p => `${p}_${Date.now().toString(36)}_${(uid++).toString(36)}`;
  const getAccount = id => state.accounts.find(a => a.id === id);

  function avatarHTML(name, color) {
    return `<span class="shub-avatar" style="--c:${color}">${esc(initials(name))}</span>`;
  }

  /* ================================================================
     TOASTS
     ================================================================ */
  function toast(msg, type = '') {
    const wrap = $('#shubToastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'shub-toast ' + type;
    el.innerHTML = `<span class="shub-tdot"></span><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* ================================================================
     SEED DATA
     ================================================================ */
  function seed() {
    state.accounts = [
      { id: 'acc_x',  platform: 'x',         handle: '@zeroth_bs',          name: 'Zeroth BS' },
      { id: 'acc_fb', platform: 'facebook',  handle: '/zerothbs',           name: 'Zeroth Business' },
      { id: 'acc_ig', platform: 'instagram', handle: '@zeroth.solutions',   name: 'Zeroth Solutions' },
      { id: 'acc_wa', platform: 'whatsapp',  handle: '+260 97 905 2929',    name: 'ZBS Support' }
    ];
    state.manualTargets = new Set(state.accounts.map(a => a.id));

    state.messages = [
      { id: nid('m'), accountId: 'acc_x',  from: 'Chanda M.',   time: '2m',  unread: true,
        text: 'Hi, I saw your ETF hub — can I buy shares with mobile money?' },
      { id: nid('m'), accountId: 'acc_wa', from: 'Mrs. Banda',  time: '12m', unread: true,
        text: 'Good morning. I want to apply for the Salary Advance. What documents do I need?' },
      { id: nid('m'), accountId: 'acc_ig', from: 'Leo M.',      time: '1h',  unread: true,
        text: 'Your Agriculture Hub listing for fresh maize still available? I need 500kg.' },
      { id: nid('m'), accountId: 'acc_fb', from: 'Grace P.',    time: '2h',  unread: true,
        text: 'Please send me the link for the Construction & Survey Hub.' },
      { id: nid('m'), accountId: 'acc_x',  from: 'Nathan K.',   time: '5h',  unread: false,
        text: 'Interested in the rental listings in Kabulonga. Any 2BR available?' },
      { id: nid('m'), accountId: 'acc_wa', from: 'Mr. Phiri',   time: '1d',  unread: false,
        text: 'Thank you for the quick loan approval. Very impressed!' }
    ];
  }

  /* ================================================================
     RENDER
     ================================================================ */
  function renderMeta() {
    const unread = state.messages.filter(m => m.unread).length;
    const sub = $('#shubSubtitle');
    if (sub) sub.textContent = `${state.accounts.length} account${state.accounts.length !== 1 ? 's' : ''} · ${unread} unread`;

    const pill = $('#shubInboxPill');
    if (pill) {
      pill.textContent = unread;
      pill.style.display = unread ? '' : 'none';
    }
    const badge = $('#shubFabBadge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.classList.toggle('show', unread > 0);
    }
  }

  function renderFilters() {
    const box = $('#shubFilterChips');
    if (!box) return;
    const all = `<button class="shub-chip ${state.filter === 'all' ? 'active' : ''}" data-shub-f="all">All accounts</button>`;
    const rest = state.accounts.map(a => {
      const p = plat(a.platform);
      return `<button class="shub-chip ${state.filter === a.id ? 'active' : ''}" data-shub-f="${a.id}">
        <span class="shub-dot" style="--c:${p.color}"></span>${esc(p.name)}
      </button>`;
    }).join('');
    box.innerHTML = all + rest;
  }

  function renderMessages() {
    const list = $('#shubMsgList');
    if (!list) return;
    let msgs = state.messages;
    if (state.filter !== 'all') msgs = msgs.filter(m => m.accountId === state.filter);

    if (!msgs.length) {
      list.innerHTML = `<div class="shub-empty">
        <div class="shub-big">📭</div>
        <p>No messages here yet.<br>Connect more accounts to fill your unified inbox.</p>
      </div>`;
      return;
    }

    list.innerHTML = msgs.map(m => {
      const acc = getAccount(m.accountId);
      if (!acc) return '';
      const p = plat(acc.platform);
      const sel = state.selected.has(m.id);
      const inCount = state.selected.size;
      return `
      <article class="shub-msg ${sel ? 'sel' : ''} ${m.unread ? 'unread' : ''}" data-shub-id="${m.id}">
        <button class="shub-msg-check" data-shub-check="${m.id}" aria-label="Select message">${sel ? '✓' : ''}</button>
        <div class="shub-msg-main">
          <div class="shub-msg-top">
            ${avatarHTML(m.from, p.color)}
            <div class="shub-who">
              <b>${esc(m.from)}</b>
              <span>${esc(acc.handle)}</span>
            </div>
            <span class="shub-time">${esc(m.time)}</span>
          </div>
          <p class="shub-text">${esc(m.text)}</p>
          <div class="shub-tags">
            <span class="shub-plat-tag" style="--c:${p.color}">${esc(p.name)}</span>
            ${sel && inCount > 1 ? `<span class="shub-count">replying to ${inCount}</span>` : ''}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderAccounts() {
    const box = $('#shubAccList');
    if (!box) return;
    if (!state.accounts.length) {
      box.innerHTML = `<div class="shub-empty">
        <div class="shub-big">🔌</div>
        <p>No accounts connected.<br>Add one to start broadcasting.</p>
      </div>`;
      return;
    }
    box.innerHTML = state.accounts.map(a => {
      const p = plat(a.platform);
      return `
      <div class="shub-acc" data-shub-acc="${a.id}">
        ${avatarHTML(a.name, p.color)}
        <div class="shub-acc-info">
          <b>${esc(a.name)}</b>
          <span>${esc(p.name)} · ${esc(a.handle)}</span>
          <div class="shub-acc-live"><i></i>Connected</div>
        </div>
        <button class="shub-acc-remove" data-shub-remove="${a.id}" title="Remove account">✕</button>
      </div>`;
    }).join('');
  }

  function currentTargets() {
    if (state.selected.size) {
      const ids = new Set();
      state.selected.forEach(id => {
        const m = state.messages.find(x => x.id === id);
        if (m) ids.add(m.accountId);
      });
      return [...ids].filter(id => getAccount(id));
    }
    return [...state.manualTargets].filter(id => getAccount(id));
  }

  function renderTargets() {
    const box = $('#shubTargetChips');
    if (!box) return;
    const ids = currentTargets();
    if (!ids.length) {
      box.innerHTML = `<span class="shub-no-target">⚠ No destination selected</span>`;
      return;
    }
    const locked = state.selected.size > 0;
    box.innerHTML = ids.map(id => {
      const a = getAccount(id);
      const p = plat(a.platform);
      return `<button class="shub-target-chip" style="--c:${p.color}" ${locked ? 'disabled style="cursor:default"' : `data-shub-untarget="${id}"`}>
        ${avatarHTML(a.name, p.color)}
        <span>${esc(p.name)}</span>
        ${locked ? '' : '<span class="shub-rm">✕</span>'}
      </button>`;
    }).join('');
  }

  const ATTACH_ICON = {
    file: '📄', audio: '🎵', video: '🎬', contact: '👤',
    location: '📍', poll: '📊', gif: '🎞️'
  };

  function renderAttachments() {
    const row = $('#shubAttachRow');
    if (!row) return;
    row.innerHTML = state.attachments.map(a => {
      const icon = ATTACH_ICON[a.type] || '📄';
      const thumb = (a.type === 'image' && a.url)
        ? `<img class="shub-attach-thumb" src="${a.url}" alt="">`
        : `<span class="shub-attach-ico">${icon}</span>`;
      return `
      <div class="shub-attach">
        ${thumb}
        <div class="shub-attach-meta">
          <b>${esc(a.name)}</b>
          <small>${esc(a.meta || a.type)}</small>
        </div>
        <button class="shub-attach-x" data-shub-att="${a.id}" title="Remove">✕</button>
      </div>`;
    }).join('');
  }

  function refreshComposer() {
    renderTargets();
    renderAttachments();
    const ta = $('#shubComposerInput');
    if (!ta) return;
    const n = ta.value.length;
    const cc = $('#shubCharcount');
    if (cc) {
      cc.textContent = n;
      cc.classList.toggle('warn', n > 240 && n <= 280);
      cc.classList.toggle('over', n > 280);
    }
    const btn = $('#shubSendBtn');
    if (btn) btn.disabled = (!ta.value.trim() && !state.attachments.length);
  }

  function refreshAll() {
    renderMeta();
    renderFilters();
    renderMessages();
    renderAccounts();
    refreshComposer();
  }

  /* ================================================================
     MODAL SYSTEM
     ================================================================ */
  const modalWrap = $('#shubModalWrap');
  let modalOnClose = null;

  function openModal(html, onClose) {
    if (!modalWrap) return;
    modalOnClose = onClose || null;
    modalWrap.innerHTML = `<div class="shub-modal">${html}</div>`;
    modalWrap.classList.add('on');
    const first = modalWrap.querySelector('input,textarea,select');
    if (first) setTimeout(() => first.focus(), 120);
  }

  function closeModal() {
    if (!modalWrap) return;
    modalWrap.classList.remove('on');
    modalWrap.innerHTML = '';
    if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
  }

  function askModal(title, fields, submitLabel = 'Add') {
    return new Promise(resolve => {
      const inputs = fields.map(f => `
        <label>${esc(f.label)}
          <input name="${esc(f.name)}" type="${f.type || 'text'}"
                 placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>
        </label>`).join('');
      openModal(`
        <h3>${esc(title)}</h3>
        <form id="shubAskForm">${inputs}
          <div class="shub-modal-actions">
            <button type="button" class="shub-btn" data-cancel>Cancel</button>
            <button type="submit" class="shub-btn primary">${esc(submitLabel)}</button>
          </div>
        </form>`, () => resolve(null));

      const form = modalWrap.querySelector('#shubAskForm');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const data = {};
        new FormData(form).forEach((v, k) => data[k] = String(v).trim());
        modalOnClose = null;
        closeModal();
        resolve(data);
      });
      const cancelBtn = form.querySelector('[data-cancel]');
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    });
  }

  if (modalWrap) {
    modalWrap.addEventListener('click', e => { if (e.target === modalWrap) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalWrap.classList.contains('on')) closeModal();
    });
  }

  /* ================================================================
     PANEL OPEN/CLOSE
     ================================================================ */
  function setOpen(v) {
    state.open = v;
    const panel = $('#shubPanel');
    const fab = $('#shubFab');
    if (panel) {
      panel.classList.toggle('open', v);
      panel.setAttribute('aria-hidden', String(!v));
    }
    if (fab) {
      fab.classList.toggle('open', v);
      fab.setAttribute('aria-expanded', String(v));
    }
    if (v) refreshAll();
  }

  /* ================================================================
     ATTACHMENT HELPERS
     ================================================================ */
  function addAttachment(a) {
    a.id = a.id || nid('att');
    state.attachments.push(a);
    refreshComposer();
    toast(`Attached: ${a.name}`);
  }

  function addAttachmentSilent(a) {
    a.id = a.id || nid('att');
    state.attachments.push(a);
    refreshComposer();
  }

  /* ================================================================
     FILE HANDLERS
     ================================================================ */
  function handleFile(file) {
    const type = file.type.startsWith('image/') ? 'image'
               : file.type.startsWith('video/') ? 'video'
               : file.type.startsWith('audio/') ? 'audio'
               : 'file';
    const a = {
      type,
      name: file.name || `${type}-${Date.now()}`,
      meta: fmtBytes(file.size),
      url: URL.createObjectURL(file)
    };
    addAttachmentSilent(a);
    toast(`Attached ${a.name}`);
  }

  /* ================================================================
     MICROPHONE
     ================================================================ */
  function stopMic() {
    if (!state.recording) return;
    clearInterval(state.recTimer);
    state.recording = false;
    const strip = $('#shubRecStrip');
    if (strip) strip.classList.remove('on');
    const micBtn = $('[data-shub-tool="mic"]');
    if (micBtn) micBtn.classList.remove('rec-on');
    const label = $('#shubRecLabel');
    if (label) label.textContent = 'Recording… 0:00';
    try {
      if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }
    } catch (e) {}
  }

  async function toggleMic() {
    if (state.recording) { stopMic(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Microphone not supported in this browser', 'err');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      state.mediaRecorder = rec;
      state.recChunks = [];

      rec.ondataavailable = e => { if (e.data.size) state.recChunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(state.recChunks, { type: mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        addAttachmentSilent({
          type: 'audio',
          name: `voice-${Date.now().toString().slice(-5)}.webm`,
          meta: fmtBytes(blob.size),
          url
        });
        toast('Voice note attached 🎤');
      };
      rec.start();
      state.recording = true;
      state.recStart = Date.now();
      const strip = $('#shubRecStrip');
      if (strip) strip.classList.add('on');
      const micBtn = $('[data-shub-tool="mic"]');
      if (micBtn) micBtn.classList.add('rec-on');
      state.recTimer = setInterval(() => {
        const label = $('#shubRecLabel');
        if (label) label.textContent = `Recording… ${fmtTime((Date.now() - state.recStart) / 1000)}`;
      }, 250);
      toast('Recording started');
    } catch (err) {
      toast('Microphone access denied', 'err');
    }
  }

  /* ================================================================
     CAMERA
     ================================================================ */
  function capturePhoto(video) {
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      addAttachmentSilent({
        type: 'image',
        name: `photo-${Date.now().toString().slice(-5)}.png`,
        meta: `${w}×${h} · ${fmtBytes(blob.size)}`,
        url
      });
      toast('Photo captured 📷');
    }, 'image/png');
  }

  function toggleVideoRec(shutter) {
    if (state.camRecorder && state.camRecorder.state === 'recording') {
      state.camRecorder.stop();
      shutter.classList.remove('rec');
      return;
    }
    if (!window.MediaRecorder) {
      toast('Video recording unsupported', 'err');
      return;
    }
    try {
      const chunks = [];
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const rec = new MediaRecorder(state.camStream, mime ? { mimeType: mime } : undefined);
      state.camRecorder = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        addAttachmentSilent({
          type: 'video',
          name: `clip-${Date.now().toString().slice(-5)}.webm`,
          meta: fmtBytes(blob.size),
          url
        });
        toast('Video clip attached 🎬');
        shutter.classList.remove('rec');
      };
      rec.start();
      shutter.classList.add('rec');
      toast('Recording video… tap again to stop');
    } catch (e) {
      toast('Could not start video recording', 'err');
    }
  }

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Camera not supported — use 📎 to attach media', 'err');
      const fi = $('#shubFileInput');
      if (fi) fi.click();
      return;
    }
    let facing = 'environment';
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
    } catch (err) {
      toast('Camera access denied', 'err');
      return;
    }
    state.camStream = stream;
    state.camMode = 'photo';

    openModal(`
      <h3 style="margin-bottom:12px">Camera</h3>
      <video class="shub-cam-view" id="shubCamVideo" autoplay playsinline muted></video>
      <div class="shub-cam-bar">
        <div class="shub-cam-mode">
          <button class="active" data-shub-mode="photo">📷 Photo</button>
          <button data-shub-mode="video">🎬 Video</button>
        </div>
        <button class="shub-shutter" id="shubShutter" aria-label="Capture"></button>
      </div>
      <div class="shub-cam-bar">
        <button class="shub-btn" id="shubCamFlip">🔄 Flip</button>
        <button class="shub-btn" id="shubCamClose">Done</button>
      </div>`,
      () => {
        try { if (state.camStream) state.camStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        try { if (state.camRecorder && state.camRecorder.state !== 'inactive') state.camRecorder.stop(); } catch (e) {}
        state.camStream = null;
        state.camRecorder = null;
      });

    const video = modalWrap.querySelector('#shubCamVideo');
    video.srcObject = stream;

    modalWrap.querySelector('#shubCamClose').onclick = closeModal;

    modalWrap.querySelector('#shubCamFlip').onclick = async () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      try {
        stream.getTracks().forEach(t => t.stop());
        const ns = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false
        });
        state.camStream = ns;
        video.srcObject = ns;
      } catch (e) {
        toast('Could not switch camera', 'err');
      }
    };

    modalWrap.querySelectorAll('[data-shub-mode]').forEach(b => {
      b.addEventListener('click', () => {
        modalWrap.querySelectorAll('[data-shub-mode]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.camMode = b.dataset.shubMode;
      });
    });

    const shutter = modalWrap.querySelector('#shubShutter');
    shutter.onclick = () => {
      if (state.camMode === 'photo') capturePhoto(video);
      else toggleVideoRec(shutter);
    };
  }

  /* ================================================================
     CONTACT / LOCATION / POLL / GIF
     ================================================================ */
  async function addContact() {
    const d = await askModal('Share a contact', [
      { name: 'cname',  label: 'Full name', placeholder: 'Jane Doe', required: true },
      { name: 'cphone', label: 'Phone',     placeholder: '+260 97 000 0000' },
      { name: 'cemail', label: 'Email',     placeholder: 'jane@example.com' }
    ], 'Attach');
    if (!d || !d.cname) return;
    const meta = [d.cphone, d.cemail].filter(Boolean).join(' · ') || 'Contact card';
    addAttachment({ type: 'contact', name: d.cname, meta });
  }

  function manualLocation() {
    return askModal('Share a place', [
      { name: 'place', label: 'Place name or address', placeholder: 'Lusaka, Zambia', required: true }
    ], 'Attach').then(d => {
      if (!d || !d.place) return;
      addAttachment({
        type: 'location',
        name: d.place,
        meta: 'Shared location',
        url: `https://www.google.com/maps/search/${encodeURIComponent(d.place)}`
      });
    });
  }

  function addLocation() {
    if (!navigator.geolocation) { manualLocation(); return; }
    toast('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        addAttachment({
          type: 'location',
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          meta: `±${Math.round(accuracy)}m · live location`,
          url: `https://www.google.com/maps?q=${lat},${lng}`
        });
      },
      () => manualLocation(),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  }

  async function addPoll() {
    const d = await askModal('Create a poll', [
      { name: 'q',  label: 'Question', placeholder: 'Which service interests you?', required: true },
      { name: 'o1', label: 'Option 1', placeholder: 'Loans', required: true },
      { name: 'o2', label: 'Option 2', placeholder: 'Savings', required: true },
      { name: 'o3', label: 'Option 3 (optional)', placeholder: 'ETF Trading' }
    ], 'Add poll');
    if (!d || !d.q) return;
    const opts = [d.o1, d.o2, d.o3].filter(Boolean);
    if (opts.length < 2) { toast('A poll needs at least 2 options', 'err'); return; }
    addAttachment({ type: 'poll', name: d.q, meta: `${opts.length} options · 24h` });
  }

  async function addGif() {
    const d = await askModal('Add a GIF or link preview', [
      { name: 'gurl',   label: 'GIF / media URL', placeholder: 'https://…', required: true },
      { name: 'gtitle', label: 'Label (optional)', placeholder: 'Celebration GIF' }
    ], 'Attach');
    if (!d || !d.gurl) return;
    addAttachment({
      type: 'gif',
      name: d.gtitle || 'GIF',
      meta: d.gurl.slice(0, 42),
      url: d.gurl
    });
  }

  /* ================================================================
     EMOJI
     ================================================================ */
  const EMOJIS = [
    '😀','😁','😂','🤣','😊','😍','😎','🤩','🥳','😇','🙃','😉','🤝','👍','👏','🙌',
    '🔥','✨','💡','🚀','🎉','🎯','💜','❤️','🧡','💙','✅','⚡','📈','📌','💬','📎',
    '🎤','📷','📍','🗓️','⏰','🌟','😅','🤔','🙏','💪','👀','🫶','🥂','🍀'
  ];

  function toggleEmoji() {
    const pop = $('#shubEmojiPop');
    if (!pop) return;
    if (!pop.classList.contains('on')) {
      pop.innerHTML = EMOJIS.map(e => `<button type="button">${e}</button>`).join('');
      pop.classList.add('on');
    } else {
      pop.classList.remove('on');
    }
  }

  /* ================================================================
     TOOL DISPATCHER
     ================================================================ */
  function handleTool(t) {
    switch (t) {
      case 'file': {
        const fi = $('#shubFileInput');
        if (fi) fi.click();
        break;
      }
      case 'camera':   openCamera();  break;
      case 'mic':      toggleMic();   break;
      case 'emoji':    toggleEmoji(); break;
      case 'contact':  addContact();  break;
      case 'location': addLocation(); break;
      case 'poll':     addPoll();     break;
      case 'gif':      addGif();      break;
    }
  }

  /* ================================================================
     SEND
     ================================================================ */
  function send() {
    const ta = $('#shubComposerInput');
    if (!ta) return;
    const text = ta.value.trim();
    const targets = currentTargets();

    if (!targets.length) { toast('Pick at least one destination', 'err'); return; }
    if (!text && !state.attachments.length) { toast('Nothing to send yet', 'err'); return; }

    const btn = $('#shubSendBtn');
    btn.classList.add('sending');
    btn.disabled = true;

    setTimeout(() => {
      btn.classList.remove('sending');
      const names = targets.map(id => plat(getAccount(id).platform).name);
      const label = names.length <= 2
        ? names.join(' & ')
        : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;

      state.selected.forEach(id => {
        const m = state.messages.find(x => x.id === id);
        if (m) m.unread = false;
      });

      toast(`✅ Sent to ${targets.length} account${targets.length > 1 ? 's' : ''} · ${label}`);

      ta.value = '';
      ta.style.height = 'auto';
      state.attachments = [];
      state.selected.clear();

      renderMessages();
      renderMeta();
      refreshComposer();

      const body = $('#shubBody');
      if (body) body.scrollTop = 0;
    }, 720);
  }

  /* ================================================================
     EVENT BINDING
     ================================================================ */
  function bindEvents() {

    /* ---- FAB + panel ---- */
    const fab = $('#shubFab');
    if (fab) fab.addEventListener('click', () => setOpen(!state.open));

    const closeBtn = $('#shubCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

    /* ---- Tabs ---- */
    $$('.shub-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.shubTab;
        $$('.shub-tabs button').forEach(b => b.classList.toggle('active', b === btn));
        $$('.shub-view').forEach(v =>
          v.classList.toggle('active', v.id === 'shub-view-' + state.tab));
        const body = $('#shubBody');
        if (body) body.scrollTop = 0;
      });
    });

    /* ---- Inbox message list ---- */
    const msgList = $('#shubMsgList');
    if (msgList) {
      msgList.addEventListener('click', e => {
        const card = e.target.closest('.shub-msg');
        if (!card) return;
        const id = card.dataset.shubId;
        if (state.selected.has(id)) state.selected.delete(id);
        else state.selected.add(id);

        const m = state.messages.find(x => x.id === id);
        if (m && state.selected.has(id)) m.unread = false;

        renderMessages();
        renderMeta();
        refreshComposer();

        if (state.selected.size === 1) {
          const only = state.messages.find(x => x.id === id);
          if (only) {
            const a = getAccount(only.accountId);
            toast(`Replying to ${only.from}${a ? ' · ' + plat(a.platform).name : ''}`);
          }
        } else if (state.selected.size > 1) {
          toast(`${state.selected.size} conversations selected — broadcast ready`);
        }
      });
    }

    /* ---- Filter chips ---- */
    const chipsBox = $('#shubFilterChips');
    if (chipsBox) {
      chipsBox.addEventListener('click', e => {
        const chip = e.target.closest('[data-shub-f]');
        if (!chip) return;
        state.filter = chip.dataset.shubF;
        renderFilters();
        renderMessages();
      });
    }

    /* ---- Accounts list ---- */
    const accList = $('#shubAccList');
    if (accList) {
      accList.addEventListener('click', e => {
        const btn = e.target.closest('[data-shub-remove]');
        if (!btn) return;
        const id = btn.dataset.shubRemove;
        const acc = getAccount(id);
        if (!acc) return;

        openModal(`
          <h3>Remove account?</h3>
          <p style="font-size:12.5px;color:#8b95ad;line-height:1.65;margin:0 0 4px">
            <b style="color:#e9edf7">${esc(acc.name)}</b> · ${esc(plat(acc.platform).name)} ${esc(acc.handle)}
            will be disconnected from your hub. You can reconnect it anytime.
          </p>
          <div class="shub-modal-actions">
            <button class="shub-btn" id="shubRmCancel">Keep</button>
            <button class="shub-btn primary" id="shubRmConfirm"
              style="background:linear-gradient(140deg,#ff5c7a,#ff3d6e);box-shadow:0 6px 18px rgba(255,61,110,.4)">Remove</button>
          </div>`);

        modalWrap.querySelector('#shubRmCancel').onclick = closeModal;
        modalWrap.querySelector('#shubRmConfirm').onclick = () => {
          state.accounts = state.accounts.filter(a => a.id !== id);
          state.manualTargets.delete(id);
          state.messages = state.messages.filter(m => m.accountId !== id);
          state.selected.forEach(sid => {
            if (!state.messages.find(m => m.id === sid)) state.selected.delete(sid);
          });
          closeModal();
          refreshAll();
          toast(`${plat(acc.platform).name} account removed`, 'err');
        };
      });
    }

    /* ---- Add account ---- */
    const addAccBtn = $('#shubAddAccBtn');
    if (addAccBtn) addAccBtn.addEventListener('click', openAddAccount);

    /* ---- Add target ---- */
    const addTargetBtn = $('#shubAddTargetBtn');
    if (addTargetBtn) {
      addTargetBtn.addEventListener('click', () => {
        if (state.selected.size) {
          toast('Clear message selection to pick destinations manually');
          return;
        }
        const available = state.accounts.filter(a => !state.manualTargets.has(a.id));
        if (!available.length) {
          toast('All accounts are already in the broadcast');
          return;
        }
        openModal(`
          <h3>Add destination</h3>
          <div class="shub-plat-grid" style="grid-template-columns:repeat(2,1fr)">
            ${available.map(a => {
              const p = plat(a.platform);
              return `<button type="button" class="shub-plat-pick" data-shub-add="${a.id}">
                <span class="shub-avatar" style="--c:${p.color}">${esc(p.glyph)}</span>
                <span>${esc(p.name)}<br>
                  <small style="opacity:.6;font-weight:600">${esc(a.handle)}</small>
                </span>
              </button>`;
            }).join('')}
          </div>
          <div class="shub-modal-actions">
            <button class="shub-btn" id="shubTCancel">Close</button>
          </div>`);

        modalWrap.querySelector('#shubTCancel').onclick = closeModal;
        modalWrap.querySelectorAll('[data-shub-add]').forEach(b => {
          b.addEventListener('click', () => {
            state.manualTargets.add(b.dataset.shubAdd);
            closeModal();
            refreshComposer();
          });
        });
      });
    }

    /* ---- Remove target chips ---- */
    const targetChips = $('#shubTargetChips');
    if (targetChips) {
      targetChips.addEventListener('click', e => {
        const btn = e.target.closest('[data-shub-untarget]');
        if (!btn) return;
        state.manualTargets.delete(btn.dataset.shubUntarget);
        refreshComposer();
      });
    }

    /* ---- Composer textarea ---- */
    const composerInput = $('#shubComposerInput');
    if (composerInput) {
      composerInput.addEventListener('input', () => {
        composerInput.style.height = 'auto';
        composerInput.style.height = Math.min(composerInput.scrollHeight, 118) + 'px';
        refreshComposer();
      });
      composerInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
      composerInput.addEventListener('paste', e => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const it of items) {
          if (it.type.startsWith('image/')) {
            const f = it.getAsFile();
            if (f) handleFile(f);
          }
        }
      });
    }

    /* ---- Drag & drop on composer ---- */
    const composer = $('#shubComposer');
    if (composer) {
      ['dragover', 'drop'].forEach(ev => {
        composer.addEventListener(ev, e => {
          e.preventDefault();
          if (ev === 'drop') {
            const files = (e.dataTransfer && e.dataTransfer.files) || [];
            Array.from(files).forEach(handleFile);
          }
        });
      });
      composer.addEventListener('click', e => {
        const att = e.target.closest('[data-shub-att]');
        if (att) {
          state.attachments = state.attachments.filter(a => a.id !== att.dataset.shubAtt);
          refreshComposer();
          return;
        }
        const tool = e.target.closest('[data-shub-tool]');
        if (!tool) return;
        handleTool(tool.dataset.shubTool);
      });
    }

    /* ---- File input ---- */
    const fileInput = $('#shubFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        Array.from(e.target.files).forEach(handleFile);
        e.target.value = '';
      });
    }

    /* ---- Record strip stop ---- */
    const recStop = $('#shubRecStop');
    if (recStop) recStop.addEventListener('click', stopMic);

    /* ---- Send button ---- */
    const sendBtn = $('#shubSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', send);

    /* ---- Emoji popover ---- */
    const emojiPop = $('#shubEmojiPop');
    if (emojiPop) {
      emojiPop.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        const ta = $('#shubComposerInput');
        if (!ta) return;
        const s = ta.selectionStart;
        const en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + b.textContent + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + b.textContent.length;
        ta.focus();
        refreshComposer();
      });
    }
    document.addEventListener('click', e => {
      if (!e.target.closest('#shubEmojiPop') &&
          !e.target.closest('[data-shub-tool="emoji"]')) {
        const pop = $('#shubEmojiPop');
        if (pop) pop.classList.remove('on');
      }
    });

    /* ---- Outside-click closes panel on desktop ---- */
    document.addEventListener('click', e => {
      if (!state.open) return;
      if (window.innerWidth < 600) return;
      if (e.target.closest('#shubPanel') ||
          e.target.closest('#shubFab') ||
          e.target.closest('.shub-modal-wrap')) return;
      setOpen(false);
    });
  }

  /* ================================================================
     ADD ACCOUNT MODAL
     ================================================================ */
  function openAddAccount() {
    let chosen = null;
    const grid = Object.entries(PLATFORMS).map(([k, p]) => `
      <button type="button" class="shub-plat-pick" data-shub-p="${k}">
        <span class="shub-avatar" style="--c:${p.color}">${esc(p.glyph)}</span>
        <span>${esc(p.name)}</span>
      </button>`).join('');

    openModal(`
      <h3>Connect an account</h3>
      <div class="shub-plat-grid">${grid}</div>
      <form id="shubAccForm">
        <label>Handle / username
          <input id="shubAccHandle" placeholder="@yourhandle" required>
        </label>
        <label>Display name
          <input id="shubAccName" placeholder="Your name or brand" required>
        </label>
        <div class="shub-modal-actions">
          <button type="button" class="shub-btn" id="shubAccCancel">Cancel</button>
          <button type="submit" class="shub-btn primary" id="shubAccConnect" disabled>Connect</button>
        </div>
      </form>`);

    const connectBtn = modalWrap.querySelector('#shubAccConnect');

    modalWrap.querySelectorAll('.shub-plat-pick').forEach(b => {
      b.addEventListener('click', () => {
        modalWrap.querySelectorAll('.shub-plat-pick').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        chosen = b.dataset.shubP;
        connectBtn.disabled = false;
      });
    });

    modalWrap.querySelector('#shubAccCancel').onclick = closeModal;

    modalWrap.querySelector('#shubAccForm').addEventListener('submit', e => {
      e.preventDefault();
      if (!chosen) return;
      const handle = modalWrap.querySelector('#shubAccHandle').value.trim();
      const name   = modalWrap.querySelector('#shubAccName').value.trim();
      if (!handle || !name) return;
      const acc = { id: nid('acc'), platform: chosen, handle, name };
      state.accounts.push(acc);
      state.manualTargets.add(acc.id);
      closeModal();
      refreshAll();
      toast(`${plat(chosen).name} connected · ${handle}`);
    });
  }

  /* ================================================================
     BOOT
     ================================================================ */
  function boot() {
    /* Verify required DOM is present before initializing */
    if (!$('#shubFab') || !$('#shubPanel')) {
      console.warn('[Social Hub] Required DOM not found. Aborting init.');
      return;
    }
    seed();
    refreshAll();
    bindEvents();
    // console.log('[Social Hub] Initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();