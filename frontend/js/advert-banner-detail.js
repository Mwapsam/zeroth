/* ================================================================
   ADVERT BANNER — click to expand full-size detail modal
   Bullet-proof close handling (capture phase + direct listeners)
   ================================================================ */
(function () {
  'use strict';

  const modal = document.getElementById('advertDetailModal');
  if (!modal) return;

  const imgEl   = document.getElementById('advertDetailImage');
  const tagEl   = document.getElementById('advertDetailTag');
  const brandEl = document.getElementById('advertDetailBrand');
  const titleEl = document.getElementById('advertDetailTitle');
  const textEl  = document.getElementById('advertDetailText');
  const metaEl  = document.getElementById('advertDetailMeta');
  const ctaEl   = document.getElementById('advertDetailCta');

  let lastFocused = null;
  let isOpen = false;

  /* ---------- OPEN ---------- */
  function openAdvertDetail(data) {
    if (!modal) return;
    lastFocused = document.activeElement;

    imgEl.src = data.image || '';
    imgEl.alt = data.title || 'Advert';

    if (data.tag) {
      tagEl.textContent = data.tag;
      tagEl.hidden = false;
    } else {
      tagEl.hidden = true;
    }

    brandEl.textContent = data.brand || '';
    titleEl.textContent = data.title || 'Advert';
    textEl.textContent  = data.description || '';

    metaEl.innerHTML = '';
    (data.meta || []).forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="${item.icon || 'fas fa-check'}"></i> ${item.label}`;
      metaEl.appendChild(li);
    });

    ctaEl.href = data.link || '#';

    modal.hidden = false;
    isOpen = true;
    document.body.classList.add('advert-modal-open');

    // Focus the close button
    const closeBtn = modal.querySelector('.advert-detail-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 30);
  }

  /* ---------- CLOSE ---------- */
  function closeAdvertDetail() {
    if (!modal || !isOpen) return;
    isOpen = false;
    modal.hidden = true;
    document.body.classList.remove('advert-modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
    lastFocused = null;
  }

  window.openAdvertDetail  = openAdvertDetail;
  window.closeAdvertDetail = closeAdvertDetail;

  /* ----------------------------------------------------------------
     DIRECT LISTENERS (highest priority — cannot be blocked)
     ---------------------------------------------------------------- */
  modal.querySelectorAll('[data-action="closeAdvertDetail"]').forEach((el) => {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeAdvertDetail();
    }, { capture: true });
  });

  /* ----------------------------------------------------------------
     GLOBAL CAPTURE-PHASE fallback
     Fires before any bubble-phase handler, even if stopPropagation
     was called upstream by another script.
     ---------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    const closer = e.target.closest('[data-action="closeAdvertDetail"]');
    if (closer) {
      e.preventDefault();
      e.stopPropagation();
      closeAdvertDetail();
    }
  }, true /* capture */);

  /* ----------------------------------------------------------------
     ESC key
     ---------------------------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeAdvertDetail();
    }
  }, true);

  /* ----------------------------------------------------------------
     Click on any advert item → open modal
     ---------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    const item = e.target.closest('.advert-item');
    if (!item) return;
    // Ignore clicks that are actually on the modal (safety)
    if (item.closest('.advert-detail-modal')) return;

    e.preventDefault();
    e.stopPropagation();

    const data = {
      title:       item.querySelector('.advert-text')?.textContent.trim() || 'Advert',
      tag:         item.querySelector('.advert-tag')?.textContent.trim() || '',
      brand:       item.getAttribute('aria-label') || '',
      image:       item.querySelector('.advert-img')?.getAttribute('src') || '',
      description: buildDescription(item),
      link:        item.getAttribute('href') || '#',
      meta:        buildMeta(item)
    };

    openAdvertDetail(data);
  }, true /* capture — beat any stopPropagation in header-nav-adverts.js */);

  /* ---------- Helpers ---------- */
  function buildDescription(item) {
    const text = item.querySelector('.advert-text')?.textContent.trim() || '';
    return text + ' — Tap "Learn More" to view full details, terms and contact information for this offer.';
  }

  function buildMeta(item) {
    const label = item.querySelector('.advert-text')?.textContent.trim() || '';
    const meta = [
      { icon: 'fas fa-tag',        label: 'Sponsored offer' },
      { icon: 'fas fa-shield-alt', label: 'Verified partner' }
    ];
    if (/loan/i.test(label))                 meta.push({ icon: 'fas fa-percent',      label: 'From 4% p.m.' });
    if (/airtel|mtn|zamtel/i.test(label))    meta.push({ icon: 'fas fa-mobile-alt',   label: 'Mobile money' });
    if (/zesco/i.test(label))                meta.push({ icon: 'fas fa-bolt',         label: 'Prepaid' });
    if (/zbs/i.test(label))                  meta.push({ icon: 'fas fa-building',     label: 'ZBS Group' });
    return meta;
  }
})();