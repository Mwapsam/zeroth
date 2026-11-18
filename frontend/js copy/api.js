/* ============================================================
   ZEROTH API CLIENT — js/api.js
   Single entry point for every backend call.
   MUST be loaded before every other script.
   ============================================================ */
(function () {
  'use strict';

  /* ---- API base resolution ---- */
  const API_BASE = (function () {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, '');
    if (window.ZBS_API_BASE) return String(window.ZBS_API_BASE).replace(/\/+$/, '');
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return 'https://api.zeroth.co.zm/api';
  })();

  const TOKEN_KEY = 'zbs_jwt';
  const USER_KEY  = 'zbs_user';

  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
  const getUser  = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } };
  const setUser  = (u) => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
  const clearAuth = () => { setToken(null); setUser(null); };

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  async function request(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}) {
    const url = path.startsWith('http') ? path : API_BASE + (path.startsWith('/') ? path : '/' + path);
    const h = { Accept: 'application/json', ...headers };

    const token = getToken();
    if (auth && token) h.Authorization = 'Bearer ' + token;

    let payload;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      h['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, { method, headers: h, body: payload, credentials: 'include' });
    } catch (netErr) {
      throw new ApiError('Network error — is the backend running?', 0, { cause: netErr });
    }

    if (res.status === 401 && auth) clearAuth();
    if (raw) return res;

    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();

    if (!res.ok) {
      const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
      throw new ApiError(message, res.status, data);
    }
    return data;
  }

  const Auth = {
    async register(payload) {
      const r = await request('/auth/register', { method: 'POST', body: payload, auth: false });
      const token = r.token || r.accessToken || r.jwt;
      const user  = r.user  || r.data;
      if (token) { setToken(token); setUser(user); }
      return r;
    },
    async login(email, password) {
      const r = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      const token = r.token || r.accessToken || r.jwt;
      const user  = r.user  || r.data;
      if (token) { setToken(token); setUser(user); }
      return r;
    },
    me: () => request('/auth/me'),
    logout: clearAuth,
    isLoggedIn: () => !!getToken(),
    user: getUser,
  };

  function resource(base) {
    return {
      list:   (q) => request(base + (q ? '?' + new URLSearchParams(q) : '')),
      get:    (id) => request(base + '/' + encodeURIComponent(id)),
      create: (body) => request(base, { method: 'POST', body }),
      update: (id, body) => request(base + '/' + encodeURIComponent(id), { method: 'PATCH', body }),
      remove: (id) => request(base + '/' + encodeURIComponent(id), { method: 'DELETE' }),
    };
  }

  const API = {
    base: API_BASE,
    request, ApiError,
    Auth, clearAuth, getToken, getUser,
    health: () => request('/health', { auth: false }),

    services:      resource('/services'),
    applications:  resource('/applications'),
    payments:      resource('/payments'),
    hardware:      resource('/hardware'),
    contact:       resource('/contact'),
    market:        resource('/market'),
    agriculture:   resource('/agriculture'),
    rentals:       resource('/rentals'),
    etf:           resource('/etf'),
    bets:          resource('/bets'),
    consultation:  resource('/consultation'),
    entertainment: resource('/entertainment'),
    education:     resource('/education'),
    construction:  resource('/construction'),
    partners:      resource('/partners'),
    adverts:       resource('/adverts'),
    social:        resource('/social'),
    notifications: resource('/notifications'),

    async upload(path, file, extra = {}) {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      return request(path, { method: 'POST', body: fd });
    },
  };

  window.API = API;

  API.health()
    .then(h => console.log(`✅ Backend ${API_BASE} → ${h.database}`))
    .catch(err => console.warn(`⚠️ Backend unreachable at ${API_BASE}:`, err.message));
})();
// js/api.js — add to your existing API object
window.ZBS_API = window.ZBS_API || {};

window.ZBS_API.login = async function (payload) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || 'Login failed' };
  }
  return res.json();
};

window.ZBS_API.register = async function (payload) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || 'Registration failed' };
  }
  return res.json();
};