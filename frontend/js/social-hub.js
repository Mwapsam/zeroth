/* ================================================================
   SOCIAL MEDIA HUB — Real user-to-user messaging
   ----------------------------------------------------------------
   - Real conversations from /api/messages
   - Live delivery via Socket.IO
   - Image / file / audio / video attachments (uploaded to /api/messages/upload)
   - Read receipts and unread counters
   - Same visual UI as before (FAB, tabs, filter chips, composer, tools)
   ================================================================ */
(function () {
  'use strict';

  if (window.__ZBS_SOCIAL_HUB__) return;
  window.__ZBS_SOCIAL_HUB__ = true;

  /* ---------------- CONFIG ---------------- */
  const API_BASE = (function () {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, '');
    if (window.ZBS_API_BASE) return String(window.ZBS_API_BASE).replace(/\/+$/, '');
    return (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://api.zeroth.co.zm/api';
  })();

  const SOCKET_BASE = API_BASE.replace(/\/api$/, '');
  const TOKEN_KEY = 'zbs_jwt';
  const USER_KEY  = 'zbs_user';

  /* ---------------- DOM HELPERS ---------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?';

  const fmtBytes = (b) => !b ? '0 B'
    : b < 1024 ? b + ' B'
    : b < 1048576 ? (b / 1024).toFixed(1) + ' KB'
    : (b / 1048576).toFixed(1) + ' MB';

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtRelTime = (ts) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    return new Date(ts).toLocaleDateString();
  };

  /* ---------------- TOKEN ---------------- */
  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
  function currentUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }
  function authHeaders(extra = {}) {
    const t = token();
    return t ? { ...extra, Authorization: 'Bearer ' + t } : extra;
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      ...opts,
      headers: authHeaders(opts.headers || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  /* ---------------- TOAST ---------------- */
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

  /* ---------------- STATE ---------------- */
  const state = {
    open: false,
    tab: 'inbox',                // 'inbox' | 'accounts'
    activeOtherId: null,         // current conversation
    activeOther: null,           // other user object
    conversations: [],           // inbox rows
    messages: [],                // messages in the open thread
    unread: 0,
    socket: null,
    attachments: [],             // pending composer attachments (already uploaded)
    uploading: 0,
    search: ''
  };

  /* ---------------- SOCKET.IO ---------------- */
  function connectSocket() {
    if (!window.io || !token()) return;
    if (state.socket && state.socket.connected) return;

    state.socket = window.io(SOCKET_BASE, {
      auth: { token: token() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    state.socket.on('connect', () => console.log('🔌 Social Hub socket connected'));

    state.socket.on('message:new', (msg) => {
      const otherId = msg.from?.id || msg.from?._id || msg.from;
      const meId = currentUser()?.id;

      if (String(otherId) !== String(state.activeOtherId)) {
        if (String(msg.from?.id || msg.from?._id) !== String(meId)) {
          toast(`💬 New message from ${msg.from?.name || 'someone'}`);
        }
      } else {
        state.messages.push(msg);
        renderThread();
        /* mark this message read immediately since the thread is open */
        if (String(msg.to?.id || msg.to?._id) === String(meId)) {
          apiFetch(`/messages/${msg.id || msg._id}/read`, { method: 'POST' }).catch(() => {});
        }
      }
      refreshConversations();
    });

    state.socket.on('message:read', ({ messageId }) => {
      const m = state.messages.find(x => String(x.id || x._id) === String(messageId));
      if (m) { m.isRead = true; renderThread(); }
    });

    state.socket.on('disconnect', () => console.log('🔌 Social Hub socket disconnected'));
  }

  /* ================================================================
     RENDER — META
     ================================================================ */
  function renderMeta() {
    const sub = $('#shubSubtitle');
    if (sub) {
      sub.textContent = state.activeOther
        ? `Chat with ${state.activeOther.name}`
        : `${state.conversations.length} conversation${state.conversations.length === 1 ? '' : 's'} · ${state.unread} unread`;
    }
    const pill = $('#shubInboxPill');
    if (pill) {
      pill.textContent = state.unread;
      pill.style.display = state.unread ? '' : 'none';
    }
    const badge = $('#shubFabBadge');
    if (badge) {
      badge.textContent = state.unread > 99 ? '99+' : state.unread;
      badge.classList.toggle('show', state.unread > 0);
    }
  }

  /* ================================================================
     RENDER — CONVERSATIONS LIST
     ================================================================ */
  async function refreshConversations() {
    if (!token()) return;
    try {
      const r = await apiFetch('/messages/conversations');
      state.conversations = r.conversations || [];
      state.unread = state.conversations.reduce((s, c) => s + (c.unread || 0), 0);
      renderInbox();
      renderMeta();
    } catch (e) {
      console.warn('[SocialHub] refresh conversations failed:', e.message);
    }
  }

  function renderInbox() {
    const list = $('#shubMsgList');
    if (!list) return;

    if (!state.conversations.length) {
      list.innerHTML = `
        <div class="shub-empty">
          <div class="shub-big">💬</div>
          <p>No conversations yet.</p>
          <small>Click "New chat" above to start one.</small>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div class="shub-inbox-actions">
        <button class="shub-btn primary" id="shubNewChatBtn">＋ New chat</button>
        <button class="shub-btn" id="shubMarkAllReadBtn">Mark all read</button>
      </div>
      <div class="shub-inbox-rows">
        ${state.conversations.map(c => {
          const other = c.other || {};
          const last  = c.lastMessage || {};
          const preview = (last.text || (last.attachments && last.attachments.length ? '📎 Attachment' : '—')).slice(0, 80);
          const time = last.createdAt ? fmtRelTime(last.createdAt) : '';

          return `
            <article class="shub-msg ${c.unread ? 'unread' : ''}" data-shub-other="${esc(other.id)}">
              <div class="shub-msg-main">
                <div class="shub-msg-top">
                  <span class="shub-avatar">${esc(initials(other.name))}</span>
                  <div class="shub-who">
                    <b>${esc(other.name || 'Unknown')}</b>
                    <span>${esc(other.email || '')}</span>
                  </div>
                  <span class="shub-time">${esc(time)}</span>
                </div>
                <p class="shub-text">${esc(preview)}</p>
                ${c.unread > 0 ? `<span class="shub-unread-pill">${c.unread}</span>` : ''}
              </div>
            </article>`;
        }).join('')}
      </div>
    `;

    $$('.shub-msg[data-shub-other]').forEach(el => {
      el.addEventListener('click', () => openConversation(el.dataset.shubOther));
    });
    const newBtn = $('#shubNewChatBtn');
    if (newBtn) newBtn.addEventListener('click', openNewChatModal);
    const markBtn = $('#shubMarkAllReadBtn');
    if (markBtn) markBtn.addEventListener('click', () => {
      apiFetch('/messages/mark-all-read', { method: 'POST' })
        .then(refreshConversations)
        .catch(e => toast(e.message, 'err'));
    });
  }

  /* ================================================================
     RENDER — OPEN THREAD
     ================================================================ */
  async function openConversation(otherId) {
    if (!otherId) return;
    state.activeOtherId = otherId;
    state.messages = [];
    state.attachments = [];

    try {
      const r = await apiFetch(`/messages/${otherId}`);
      state.activeOther = r.other;
      state.messages = r.messages || [];
      renderThread();
      renderMeta();
      refreshConversations();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  function backToInbox() {
    state.activeOtherId = null;
    state.activeOther = null;
    state.messages = [];
    state.attachments = [];
    renderInbox();
    renderMeta();
  }

  function renderThread() {
    const list = $('#shubMsgList');
    if (!list) return;

    if (!state.activeOtherId) { renderInbox(); return; }

    const meId = String(currentUser()?.id || '');

    list.innerHTML = `
      <div class="shub-thread-head">
        <button class="shub-back-btn" id="shubBackBtn">← Inbox</button>
        <strong>${esc(state.activeOther?.name || '')}</strong>
        <span class="shub-thread-status" id="shubThreadStatus">${state.activeOther?.lastLoginAt ? 'online recently' : ''}</span>
      </div>

      <div class="shub-thread" id="shubThread">
        ${state.messages.length === 0 ? `
          <div class="shub-empty">
            <div class="shub-big">👋</div>
            <p>Say hello to ${esc(state.activeOther?.name || 'them')}.</p>
          </div>` : ''}
        ${state.messages.map(m => {
          const fromId = String(m.from?.id || m.from?._id || m.from || '');
          const mine = fromId === meId;
          const atts = (m.attachments || []).map(a => {
            if (a.kind === 'image') {
              return `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img class="shub-att-img" src="${esc(a.url)}" alt=""></a>`;
            }
            if (a.kind === 'audio' || a.kind === 'video') {
              const tag = a.kind === 'audio' ? 'audio' : 'video';
              return `<${tag} class="shub-att-${tag}" src="${esc(a.url)}" controls></${tag}>`;
            }
            return `<a class="shub-att-file" href="${esc(a.url)}" target="_blank" rel="noopener">
              📎 ${esc(a.name || 'File')} <small>(${fmtBytes(a.size)})</small>
            </a>`;
          }).join('');

          return `
            <div class="shub-message ${mine ? 'mine' : 'theirs'}" data-msg-id="${esc(m.id || m._id || '')}">
              ${m.text ? `<div class="shub-message-bubble">${esc(m.text)}</div>` : ''}
              ${atts ? `<div class="shub-message-atts">${atts}</div>` : ''}
              <div class="shub-message-time">
                ${esc(fmtTime(m.createdAt))}
                ${mine && m.isRead ? ' ✓✓' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const back = $('#shubBackBtn');
    if (back) back.addEventListener('click', backToInbox);

    /* Reset composer */
    renderComposer();

    /* Scroll to bottom */
    const threadEl = $('#shubThread');
    if (threadEl) setTimeout(() => { threadEl.scrollTop = threadEl.scrollHeight; }, 40);
  }

  /* ================================================================
     COMPOSER
     ================================================================ */
  function renderComposer() {
    /* Hide the "targets" area (broadcast) — this is 1-to-1 now */
    const targetsRow = $('.shub-targets-row');
    if (targetsRow) targetsRow.style.display = state.activeOtherId ? '' : 'none';

    /* Hide the target chips list */
    const targets = $('#shubTargetChips');
    if (targets) {
      if (state.activeOtherId) {
        targets.innerHTML = `<span class="shub-target-static">To: <b>${esc(state.activeOther?.name || '')}</b></span>`;
      } else {
        targets.innerHTML = '<span class="shub-no-target">Select a conversation to reply</span>';
      }
    }

    /* Attachments row */
    const attRow = $('#shubAttachRow');
    if (attRow) {
      attRow.innerHTML = state.attachments.map((a, i) => `
        <div class="shub-attach">
          ${a.kind === 'image'
            ? `<img class="shub-attach-thumb" src="${esc(a.url)}" alt="">`
            : `<span class="shub-attach-ico">${a.kind === 'audio' ? '🎵' : a.kind === 'video' ? '🎬' : '📎'}</span>`}
          <div class="shub-attach-meta">
            <b>${esc(a.name)}</b>
            <small>${fmtBytes(a.size)}</small>
          </div>
          <button class="shub-attach-x" data-shub-att="${i}" title="Remove">✕</button>
        </div>
      `).join('');
    }

    /* Char counter + send button state */
    const ta = $('#shubComposerInput');
    const sendBtn = $('#shubSendBtn');
    if (ta && sendBtn) {
      const empty = !ta.value.trim() && !state.attachments.length;
      sendBtn.disabled = empty || !state.activeOtherId;
    }
  }

  /* ================================================================
     SEND MESSAGE
     ================================================================ */
  async function sendMessage() {
    if (!state.activeOtherId) { toast('Open a conversation first', 'err'); return; }
    const ta = $('#shubComposerInput');
    if (!ta) return;

    const text = ta.value.trim();
    if (!text && !state.attachments.length) return;

    const sendBtn = $('#shubSendBtn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('sending'); }

    try {
      await apiFetch(`/messages/${state.activeOtherId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          attachments: state.attachments
        })
      });

      ta.value = '';
      ta.style.height = 'auto';
      state.attachments = [];

      /* Reload thread so we get the persisted message (with read status, ids) */
      const r = await apiFetch(`/messages/${state.activeOtherId}`);
      state.messages = r.messages;
      renderThread();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('sending'); }
      renderComposer();
    }
  }

  /* ================================================================
     FILE UPLOAD
     ================================================================ */
  async function uploadFile(file) {
    if (!state.activeOtherId) {
      toast('Open a conversation first', 'err');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast('File too large (max 100 MB)', 'err');
      return;
    }

    state.uploading++;
    renderUploadProgress();

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/messages/upload`, {
        method: 'POST',
        headers: authHeaders(),  // browser sets multipart boundary
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      state.attachments.push(data.attachment);
      renderComposer();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      state.uploading = Math.max(0, state.uploading - 1);
      renderUploadProgress();
    }
  }

  function renderUploadProgress() {
    let el = document.getElementById('shubUploadProgress');
    if (state.uploading === 0) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'shubUploadProgress';
      el.className = 'shub-uploading';
      el.innerHTML = '<span class="shub-spinner"></span> Uploading…';
      $('#shubAttachRow')?.after(el);
    }
  }

  /* ================================================================
     NEW CHAT MODAL
     ================================================================ */
  function openNewChatModal() {
    const wrap = $('#shubModalWrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="shub-modal">
        <h3>New chat</h3>
        <label>Search users by name or email
          <input id="shubUserSearch" placeholder="Type to search…" autocomplete="off">
        </label>
        <div id="shubUserResults" class="shub-user-results">
          <div class="shub-empty small">
            <small>Type at least 2 characters</small>
          </div>
        </div>
        <div class="shub-modal-actions">
          <button type="button" class="shub-btn" id="shubNewChatCancel">Cancel</button>
        </div>
      </div>`;
    wrap.classList.add('on');

    const input = document.getElementById('shubUserSearch');
    const results = document.getElementById('shubUserResults');
    const cancel = document.getElementById('shubNewChatCancel');
    cancel.addEventListener('click', () => {
      wrap.classList.remove('on');
      wrap.innerHTML = '';
    });

    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = '<div class="shub-empty small"><small>Type at least 2 characters</small></div>';
        return;
      }
      timer = setTimeout(async () => {
        try {
          const r = await apiFetch('/users/search?q=' + encodeURIComponent(q));
          const users = (r.users || []).filter(u => String(u.id) !== String(currentUser()?.id));
          if (!users.length) {
            results.innerHTML = '<div class="shub-empty small"><small>No users found</small></div>';
            return;
          }
          results.innerHTML = users.map(u => `
            <button type="button" class="shub-user-row" data-user-id="${esc(u.id)}">
              <span class="shub-avatar">${esc(initials(u.name))}</span>
              <span class="shub-user-info">
                <b>${esc(u.name)}</b>
                <small>${esc(u.email)}</small>
              </span>
            </button>
          `).join('');
          results.querySelectorAll('[data-user-id]').forEach(btn => {
            btn.addEventListener('click', () => {
              wrap.classList.remove('on');
              wrap.innerHTML = '';
              openConversation(btn.dataset.userId);
            });
          });
        } catch (e) {
          results.innerHTML = `<div class="shub-empty small"><small>${esc(e.message)}</small></div>`;
        }
      }, 250);
    });

    setTimeout(() => input.focus(), 80);
  }

  /* ================================================================
     PANEL OPEN / CLOSE
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
    if (v) {
      if (!token()) {
        const body = $('#shubBody');
        if (body) body.innerHTML = `
          <div class="shub-empty">
            <div class="shub-big">🔒</div>
            <p>Please login to use messaging.</p>
            <button class="shub-btn primary" id="shubLoginFromHub">Login</button>
          </div>`;
        const btn = document.getElementById('shubLoginFromHub');
        if (btn) btn.addEventListener('click', () => {
          if (typeof window.openLoginModal === 'function') window.openLoginModal();
        });
        return;
      }
      connectSocket();
      if (state.activeOtherId) {
        openConversation(state.activeOtherId);
      } else {
        refreshConversations();
        renderInbox();
        renderComposer();
      }
    }
  }

  /* ================================================================
     EVENT BINDING
     ================================================================ */
  function bindEvents() {
    const fab = $('#shubFab');
    if (fab) fab.addEventListener('click', () => setOpen(!state.open));

    const closeBtn = $('#shubCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

    $$('.shub-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.shubTab;
        $$('.shub-tabs button').forEach(b => b.classList.toggle('active', b === btn));
        $$('.shub-view').forEach(v =>
          v.classList.toggle('active', v.id === 'shub-view-' + state.tab));
        const body = $('#shubBody');
        if (body) body.scrollTop = 0;

        if (state.tab === 'accounts') {
          renderAccountsTab();
        } else {
          if (state.activeOtherId) renderThread(); else renderInbox();
        }
      });
    });

    /* Composer input — send button state + Enter */
    const ta = $('#shubComposerInput');
    if (ta) {
      ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 118) + 'px';
        const cc = $('#shubCharcount');
        if (cc) cc.textContent = ta.value.length;
        renderComposer();
      });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      ta.addEventListener('paste', (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const it of items) {
          if (it.type.startsWith('image/')) {
            const f = it.getAsFile();
            if (f) uploadFile(f);
          }
        }
      });
    }

    /* Send button */
    const sendBtn = $('#shubSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    /* Attachments row — remove chip */
    const attRow = $('#shubAttachRow');
    if (attRow) {
      attRow.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-shub-att]');
        if (!btn) return;
        state.attachments.splice(Number(btn.dataset.shubAtt), 1);
        renderComposer();
      });
    }

    /* Composer drag & drop */
    const composer = $('#shubComposer');
    if (composer) {
      ['dragover', 'drop'].forEach(ev => {
        composer.addEventListener(ev, (e) => {
          e.preventDefault();
          if (ev === 'drop') {
            const files = e.dataTransfer && e.dataTransfer.files;
            Array.from(files || []).forEach(uploadFile);
          }
        });
      });
    }

    /* File input (toolbar) */
    const fileInput = $('#shubFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files || []).forEach(uploadFile);
        e.target.value = '';
      });
    }

    /* Toolbar buttons */
    if (composer) {
      composer.addEventListener('click', (e) => {
        const tool = e.target.closest('[data-shub-tool]');
        if (!tool) return;
        const kind = tool.dataset.shubTool;

        if (kind === 'file') {
          fileInput?.click();
        } else if (kind === 'camera') {
          fileInput?.click();
        } else if (kind === 'mic') {
          startVoiceRecorder();
        } else if (kind === 'emoji') {
          toggleEmoji();
        } else if (kind === 'gif') {
          fileInput?.click();
        } else {
          toast('This tool is coming soon', 'err');
        }
      });
    }

    /* Escape */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) setOpen(false);
    });

    /* Click outside (desktop) */
    document.addEventListener('click', (e) => {
      if (!state.open) return;
      if (window.innerWidth < 600) return;
      if (e.target.closest('#shubPanel') ||
          e.target.closest('#shubFab') ||
          e.target.closest('.shub-modal-wrap')) return;
      setOpen(false);
    });

    /* Refresh on login */
    document.addEventListener('zbs:login', () => {
      if (state.open) connectSocket();
      refreshConversations();
    });
  }

  /* ================================================================
     VOICE RECORDER
     ================================================================ */
  let voiceRecorder = null;
  let voiceChunks = [];
  let voiceStart = 0;
  let voiceTimer = null;

  async function startVoiceRecorder() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast('Microphone not supported', 'err');
      return;
    }
    if (voiceRecorder && voiceRecorder.state === 'recording') {
      voiceRecorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      voiceRecorder = rec;
      voiceChunks = [];
      voiceStart = Date.now();

      rec.ondataavailable = (e) => { if (e.data.size) voiceChunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(voiceTimer);
        $('#shubRecStrip')?.classList.remove('on');
        const blob = new Blob(voiceChunks, { type: mime || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mime || 'audio/webm' });
        await uploadFile(file);
      };

      rec.start();
      $('#shubRecStrip')?.classList.add('on');
      const label = $('#shubRecLabel');
      voiceTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - voiceStart) / 1000);
        if (label) label.textContent = `Recording… ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      }, 250);
    } catch (err) {
      toast('Microphone access denied', 'err');
    }
  }

  function stopVoiceRecorder() {
    if (voiceRecorder && voiceRecorder.state === 'recording') voiceRecorder.stop();
  }

  /* ================================================================
     EMOJI POPOVER
     ================================================================ */
  const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😎','🤩','🥳','😇','🙃','😉','🤝','👍','👏','🙌',
    '🔥','✨','💡','🚀','🎉','🎯','💜','❤️','🧡','💙','✅','⚡','📈','📌','💬','📎',
    '🎤','📷','📍','🗓️','⏰','🌟','😅','🤔','🙏','💪','👀','🫶','🥂','🍀'];

  function toggleEmoji() {
    const pop = $('#shubEmojiPop');
    if (!pop) return;
    if (!pop.classList.contains('on')) {
      pop.innerHTML = EMOJIS.map(e => `<button type="button">${e}</button>`).join('');
      pop.classList.add('on');
      pop.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        const ta = $('#shubComposerInput');
        if (!ta) return;
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + b.textContent + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + b.textContent.length;
        ta.focus();
        renderComposer();
      }, { once: true });
    } else {
      pop.classList.remove('on');
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#shubEmojiPop') &&
        !e.target.closest('[data-shub-tool="emoji"]')) {
      $('#shubEmojiPop')?.classList.remove('on');
    }
  });

  /* ================================================================
     ACCOUNTS TAB — kept for backwards compat, now shows the current user
     ================================================================ */
  function renderAccountsTab() {
    const box = $('#shubAccList');
    if (!box) return;

    const me = currentUser();
    if (!me) {
      box.innerHTML = '<div class="shub-empty small"><small>Login required</small></div>';
      return;
    }

    box.innerHTML = `
      <div class="shub-acc">
        <span class="shub-avatar">${esc(initials(me.name))}</span>
        <div class="shub-acc-info">
          <b>${esc(me.name)}</b>
          <span>${esc(me.email)}</span>
          <div class="shub-acc-live"><i></i>Signed in</div>
        </div>
      </div>
      <p class="shub-hint" style="font-size:12px;color:#8b95ad;padding:12px 8px;line-height:1.6">
        Your account is signed in. Use "New chat" in the Inbox tab to start a conversation with any other user.
      </p>
    `;
  }

  /* ================================================================
     BOOT
     ================================================================ */
  function boot() {
    if (!$('#shubFab') || !$('#shubPanel')) {
      console.warn('[Social Hub] DOM not found. Aborting.');
      return;
    }

    bindEvents();

    /* Listen for record stop button */
    document.addEventListener('click', (e) => {
      if (e.target.closest('#shubRecStop')) stopVoiceRecorder();
    });

    if (token()) {
      connectSocket();
      refreshConversations();
    } else {
      renderMeta();
    }

    console.log('✅ Social Hub v2 ready — real messaging enabled');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Public API */
  window.SocialHub = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    refresh: refreshConversations,
    openConversation,
    send: sendMessage,
    getState: () => state
  };

})();