/* ================================================================
   LuSE CHART RENDERER — standalone, no DOM dependencies
   Exposes: window.LuSECharts
   ================================================================ */
(function (global) {
    'use strict';

    /** Escape HTML — duplicated so module is self-contained. */
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /**
     * Build a single line+area SVG chart.
     * @param {Object} cfg
     * @param {string} cfg.title
     * @param {Array<{date:string, value:number}>} cfg.data   ≥ 2 points required
     * @param {string} cfg.color
     * @param {string} [cfg.prefix='']
     * @param {string} [cfg.suffix='']
     * @param {number} [cfg.height=200]
     * @returns {string} SVG wrapped in a styled div, or '' if invalid
     */
    function buildChart({ title, data, color, prefix = '', suffix = '', height = 200 }) {
        if (!Array.isArray(data) || data.length < 2) return '';

        const values = data.map(d => Number(d.value) || 0);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const pad    = (maxVal - minVal) * 0.15 || Math.abs(maxVal) * 0.1 || 1;
        const yMin   = minVal - pad;
        const yMax   = maxVal + pad;
        const range  = yMax - yMin || 1;

        const W = 500, H = height;
        const P = { top: 15, right: 15, bottom: 32, left: 54 };
        const iW = W - P.left - P.right;
        const iH = H - P.top - P.bottom;
        const xStep = iW / (data.length - 1);

        const points = data.map((d, i) => ({
            x: P.left + i * xStep,
            y: P.top + iH - ((Number(d.value) - yMin) / range) * iH,
            date: d.date
        }));

        const linePath = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');
        const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(P.top + iH).toFixed(1)} `
            + `L${points[0].x.toFixed(1)},${(P.top + iH).toFixed(1)} Z`;

        const yTicks = 4;
        const yLabels = [];
        for (let i = 0; i <= yTicks; i++) {
            const v = yMin + (range * i) / yTicks;
            const y = P.top + iH - (iH * i) / yTicks;
            const dec = Math.abs(v) >= 100 ? 0 : 2;
            yLabels.push({ y, label: `${prefix}${v.toFixed(dec)}${suffix}` });
        }

        const step = Math.max(1, Math.ceil(data.length / 6));
        const xLabels = points.filter((_, i) =>
            i === 0 || i === points.length - 1 || i % step === 0
        );

        const gradId = 'luseGrad-' + Math.random().toString(36).slice(2, 9);

        return `
        <div class="etf-luse-chart" style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:12px 14px 8px;box-sizing:border-box;width:100%;display:block;margin:0;">
            <div class="etf-luse-chart-title" style="font-size:.78rem;font-weight:800;color:#1a202c;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.06);display:block;">${title}</div>
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" class="etf-luse-chart-svg" role="img" style="width:100%;height:auto;display:block;min-height:${height}px;max-width:100%;overflow:visible;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.28" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
                    </linearGradient>
                </defs>
                ${yLabels.map(l => `
                    <line x1="${P.left}" y1="${l.y.toFixed(1)}" x2="${W - P.right}" y2="${l.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3" />
                    <text x="${P.left - 6}" y="${(l.y + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#6b7280">${escapeHtml(l.label)}</text>
                `).join('')}
                <path d="${areaPath}" fill="url(#${gradId})" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                ${points.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.5}" fill="${color}" stroke="#fff" stroke-width="1.5" />`).join('')}
                ${xLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#6b7280">${escapeHtml(l.date)}</text>`).join('')}
            </svg>
        </div>`;
    }

    /**
     * Render all three LuSE charts into a container element.
     * @param {HTMLElement} container
     * @param {{lasi7Day:Array, lasiMonthly:Array, fxUsdMonthly:Array}} trends
     * @returns {number} number of charts rendered
     */
    function renderAll(container, trends) {
        if (!container || !trends) return 0;
        const charts = [
            buildChart({ title: 'LuSE All Share Index — 7 Day Rolling Trend', data: trends.lasi7Day || [], color: '#1f7a3d' }),
            buildChart({ title: 'LuSE All Share Index — Monthly Trend',       data: trends.lasiMonthly || [], color: '#2b6cb0' }),
            buildChart({ title: 'Foreign Exchange (USD) — Monthly Trend',     data: trends.fxUsdMonthly || [], color: '#d97706', prefix: 'ZMW ' })
        ].filter(Boolean);
        container.innerHTML = charts.join('');
        return charts.length;
    }

    global.LuSECharts = { buildChart, renderAll };
})(window);