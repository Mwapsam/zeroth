/* ================================================================
   MY SHARES — Shareholder Portfolio
   Styles: css/my-shares.css (external)
   ================================================================ */
(function () {
  'use strict';

  /* ---- Guard: only run once ---- */
  if (window.__mySharesBooted) return;
  window.__mySharesBooted = true;

  /* ---- Storage keys ---- */
  var HOLD_KEY = 'zbs_share_holdings';
  var APP_KEY  = 'zbs_share_applications';

  /* ---- Company catalogue ---- */
  var COMPANIES = {
    'ZBS Limited':               { symbol: 'ZBS',  price: 5.00, desc: 'Zeroth Business Solutions Limited — flagship integrated company.' },
    'ZBS Agriculture Solutions': { symbol: 'ZBSA', price: 3.50, desc: 'ZBS Agro Holdings — farming, produce, livestock.' },
    'ZBS Financial Partners':    { symbol: 'ZBSF', price: 8.00, desc: 'ZBS Financial Partners — loans, savings, investments.' },
    'ZBS Brokerage Solutions':   { symbol: 'ZBSB', price: 6.50, desc: 'ZBS Brokerage — stocks, insurance, ETF, entertainment.' },
    'ZBS Energy Resources':      { symbol: 'ZBSE', price: 4.00, desc: 'ZBS Energy Resources — renewable energy and solar.' }
  };

  /* ---- Helpers ---- */
  function $(id) { return document.getElementById(id); }
  function money(n) {
    return 'ZMW ' + Number(n || 0).toLocaleString('en', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) { return fallback; }
  }
  function getHold() { return readJSON(HOLD_KEY, {}); }
  function setHold(h) { localStorage.setItem(HOLD_KEY, JSON.stringify(h)); }
  function getApps() { return readJSON(APP_KEY, []); }

  /* ----------------------------------------------------------------
     RENDER: HOLDINGS
     ---------------------------------------------------------------- */
  function renderHoldings() {
    var hold  = getHold();
    var list  = $('mySharesHoldingsList');
    var empty = $('mySharesHoldingsEmpty');
    if (!list) return;

    var entries = Object.keys(hold).filter(function (k) { return hold[k].qty > 0; });
    var invested = 0, value = 0;

    entries.forEach(function (k) {
      var h = hold[k];
      invested += h.qty * h.avgPrice;
      var p = (COMPANIES[k] && COMPANIES[k].price) || h.avgPrice;
      value += h.qty * p;
    });

    if ($('mySharesTotalInvested')) $('mySharesTotalInvested').textContent = money(invested);
    if ($('mySharesCurrentValue'))  $('mySharesCurrentValue').textContent  = money(value);

    var gl = value - invested;
    var glEl = $('mySharesGainLoss');
    if (glEl) {
      glEl.textContent = (gl >= 0 ? '+' : '') + money(gl);
      glEl.className = 'my-shares-summary-value ' + (gl >= 0 ? 'gain' : 'loss');
    }
    if ($('mySharesCompaniesCount')) $('mySharesCompaniesCount').textContent = entries.length;
    if ($('mySharesHoldingsCount'))  $('mySharesHoldingsCount').textContent  = entries.length;

    if (!entries.length) {
      list.innerHTML = '';
      list.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    list.hidden = false;
    if (empty) empty.hidden = true;

    list.innerHTML = entries.map(function (k) {
      var h     = hold[k];
      var meta  = COMPANIES[k] || { symbol: '—', price: h.avgPrice };
      var v     = h.qty * meta.price;
      var g     = v - h.qty * h.avgPrice;
      var pct   = h.avgPrice ? ((meta.price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return '<button type="button" class="my-shares-row" data-company="' + k + '" data-action="openShareDetail">' +
        '<div class="my-shares-row-symbol">' + meta.symbol + '</div>' +
        '<div class="my-shares-row-main">' +
          '<span class="my-shares-row-name">' + k + '</span>' +
          '<span class="my-shares-row-sub">' + h.qty + ' shares · avg ' + money(h.avgPrice) + '</span>' +
        '</div>' +
        '<div class="my-shares-row-value">' +
          '<span class="my-shares-row-price">' + money(v) + '</span>' +
          '<span class="my-shares-row-change ' + (g >= 0 ? 'gain' : 'loss') + '">' +
            (g >= 0 ? '+' : '') + money(g) + ' (' + pct.toFixed(2) + '%)' +
          '</span>' +
        '</div>' +
        '<i class="fas fa-chevron-right my-shares-row-arrow"></i>' +
      '</button>';
    }).join('');
  }

  /* ----------------------------------------------------------------
     RENDER: APPLICATIONS
     ---------------------------------------------------------------- */
  function renderApps() {
    var apps  = getApps();
    var list  = $('mySharesAppsList');
    var empty = $('mySharesAppsEmpty');
    if (!list) return;
    if ($('mySharesAppsCount')) $('mySharesAppsCount').textContent = apps.length;

    if (!apps.length) {
      list.innerHTML = '';
      list.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    list.hidden = false;
    if (empty) empty.hidden = true;

    list.innerHTML = apps.map(function (a) {
      var st = (a.status || 'Pending').toLowerCase();
      return '<div class="my-shares-app-card">' +
        '<div class="my-shares-app-head">' +
          '<strong>' + a.company + '</strong>' +
          '<span class="my-shares-app-status status-' + st + '">' + (a.status || 'Pending') + '</span>' +
        '</div>' +
        '<div class="my-shares-app-meta">' +
          '<span>' + a.qty + ' shares</span>' +
          '<span>' + money(a.amount) + '</span>' +
          '<span>' + (a.date || '') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ----------------------------------------------------------------
     RENDER: DETAIL
     ---------------------------------------------------------------- */
  function renderDetail(name) {
    var hold = getHold();
    var h    = hold[name] || { qty: 0, avgPrice: 0, txns: [] };
    var meta = COMPANIES[name] || { symbol: '—', price: h.avgPrice, desc: '—' };

    if ($('mySharesDetailSymbol'))   $('mySharesDetailSymbol').textContent   = meta.symbol;
    if ($('mySharesDetailTitle'))    $('mySharesDetailTitle').textContent    = name;
    if ($('mySharesDetailCompany'))  $('mySharesDetailCompany').textContent  = name;
    if ($('mySharesDetailPrice'))    $('mySharesDetailPrice').textContent    = money(meta.price);
    if ($('mySharesDetailQty'))      $('mySharesDetailQty').textContent      = h.qty;
    if ($('mySharesDetailAvgPrice')) $('mySharesDetailAvgPrice').textContent = money(h.avgPrice);
    if ($('mySharesDetailMarketValue')) $('mySharesDetailMarketValue').textContent = money(h.qty * meta.price);

    var g = h.qty * meta.price - h.qty * h.avgPrice;
    var glEl = $('mySharesDetailGainLoss');
    if (glEl) {
      glEl.textContent = (g >= 0 ? '+' : '') + money(g);
      glEl.className = 'my-shares-detail-stat-value ' + (g >= 0 ? 'gain' : 'loss');
    }
    if ($('mySharesDetailDesc')) $('mySharesDetailDesc').textContent = meta.desc;

    var txns  = h.txns || [];
    var txnEl = $('mySharesDetailTxns');
    if (txnEl) {
      txnEl.innerHTML = txns.length ? txns.map(function (t) {
        return '<div class="my-shares-txn">' +
          '<span class="my-shares-txn-date">' + t.date + '</span>' +
          '<span class="my-shares-txn-type">' + t.type + '</span>' +
          '<span class="my-shares-txn-qty">' + t.qty + ' shares</span>' +
          '<span class="my-shares-txn-amount">' + money(t.amount) + '</span>' +
        '</div>';
      }).join('') : '<p class="my-shares-txn-empty">No transactions yet.</p>';
    }
  }

  /* ----------------------------------------------------------------
     OPEN / CLOSE
     ---------------------------------------------------------------- */
  function openModal() {
    renderHoldings();
    renderApps();
    var m = $('mySharesModal');
    if (m) {
      m.hidden = false;
      m.style.display = 'flex';
      m.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
    var sb = $('sidebar'), ov = $('sidebarOverlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('active');
  }
  function closeModal() {
    var m = $('mySharesModal');
    if (m) {
      m.hidden = true;
      m.style.display = '';
      m.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
  }
  function openDetail(name) {
    renderDetail(name);
    var main = $('mySharesModal');
    var det  = $('mySharesDetailModal');
    if (main) { main.hidden = true; main.style.display = ''; }
    if (det)  { det.hidden = false; det.style.display = 'flex'; }
  }
  function closeDetail() {
    var det  = $('mySharesDetailModal');
    var main = $('mySharesModal');
    if (det)  { det.hidden = true; det.style.display = ''; }
    if (main) { main.hidden = false; main.style.display = 'flex'; }
  }

  /* ----------------------------------------------------------------
     CSV EXPORT
     ---------------------------------------------------------------- */
  function exportStatement() {
    var hold = getHold();
    var csv = 'Company,Symbol,Shares,Avg Price,Current Price,Market Value\n';
    Object.keys(hold).forEach(function (k) {
      var h    = hold[k];
      var meta = COMPANIES[k] || { symbol: '', price: h.avgPrice };
      csv += [k, meta.symbol, h.qty, h.avgPrice, meta.price,
              (h.qty * meta.price).toFixed(2)].join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'zbs-share-statement-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ----------------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------------- */
  window.MyShares = {
    open:  openModal,
    close: closeModal,
    addShares: function (company, qty, price) {
      var hold = getHold();
      var h = hold[company] || { qty: 0, avgPrice: 0, txns: [] };
      var total = h.qty * h.avgPrice + qty * price;
      h.qty += qty;
      h.avgPrice = h.qty ? total / h.qty : 0;
      h.txns.push({ date: new Date().toISOString().slice(0, 10), type: 'Buy', qty: qty, amount: qty * price });
      hold[company] = h;
      setHold(hold);
      renderHoldings();
    },
    addApplication: function (app) {
      var apps = getApps();
      apps.unshift({
        company: app.company, qty: app.qty, amount: app.amount,
        date: new Date().toISOString().slice(0, 10), status: 'Pending'
      });
      localStorage.setItem(APP_KEY, JSON.stringify(apps));
      renderApps();
    }
  };

  /* ----------------------------------------------------------------
     DISPATCHER — capture phase so it beats every other handler
     ---------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    var handled = true;

    switch (action) {
      case 'openMyShares':            openModal();                            break;
      case 'closeMyShares':           closeModal();                           break;
      case 'openShareDetail':         openDetail(el.getAttribute('data-company')); break;
      case 'closeMySharesDetail':     closeDetail();                          break;
      case 'exportShareHoldings':     exportStatement();                      break;
      case 'buyMoreShares':
        closeDetail();
        closeModal();
        if (window.globalActions && typeof window.globalActions.openShareApplication === 'function') {
          window.globalActions.openShareApplication();
        } else {
          location.hash = '#share-application';
        }
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }, true);

  /* Tabs */
  document.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('.my-shares-tab');
    if (!tab) return;
    var name = tab.getAttribute('data-shares-tab');
    document.querySelectorAll('.my-shares-tab').forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.my-shares-panel').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-shares-panel') === name);
    });
  });

  /* ----------------------------------------------------------------
     KEYBOARD SUPPORT + INITIAL PAINT
     ---------------------------------------------------------------- */
  function wireKeyboard() {
    var btn = document.querySelector('[data-action="openMyShares"]');
    if (btn && !btn.__mySharesKeys) {
      btn.__mySharesKeys = true;
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      });
    }
  }

  function paint() { renderHoldings(); renderApps(); }
  function boot()  { wireKeyboard(); paint(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
})();