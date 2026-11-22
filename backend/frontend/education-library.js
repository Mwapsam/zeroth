/* Real library — talks to /api/education/library */
(function () {
    const BASE = (document.querySelector('meta[name="api-base"]')?.content || '').replace(/\/+$/, '');
    const API  = BASE ? BASE + '/api/education' : '/api/education';

    // Reuse your api.js token helper if you have one
    function authHeader() {
        const t = localStorage.getItem('zbs_token') || localStorage.getItem('token');
        return t ? { Authorization: 'Bearer ' + t } : {};
    }

    async function loadLibrary() {
        const grid  = document.getElementById('grid-library');
        const empty = document.getElementById('empty-library');
        if (!grid) return;

        try {
            const res = await fetch(`${API}/library`);
            if (!res.ok) throw new Error('Failed to load library');
            const books = await res.json();

            grid.innerHTML = '';
            if (!books.length) { empty.hidden = false; return; }
            empty.hidden = true;

            books.forEach(b => {
                const card = document.createElement('div');
                card.className = 'edu-card edu-card--book';
                card.innerHTML = `
                    <div class="edu-card-icon">📕</div>
                    <div class="edu-card-body">
                        <h4>${escapeHtml(b.title)}</h4>
                        <p>${escapeHtml(b.author || 'Unknown')}</p>
                        <span class="edu-book-price">
                            ${b.price === 0 ? 'FREE' : 'ZMW ' + Number(b.price).toFixed(2)}
                        </span>
                    </div>
                    <div class="edu-card-actions">
                        <a class="edu-book-download"
                           href="${API}/library/${b.id}/download"
                           download>
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>`;
                grid.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            if (empty) empty.hidden = false;
        }
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const uploadBtn = document.querySelector('[data-action="eduUploadPdf"]');
        const input     = document.getElementById('eduPdfInput');

        uploadBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const title  = prompt('Book title:');
            if (!title) return;
            const author = prompt('Author (optional):') || 'Unknown';
            const price  = Math.max(0, parseFloat(prompt('Price ZMW (0 = free):', '0')) || 0);
            input._meta  = { title, author, price };
            input.click();
        });

        input?.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const meta = input._meta || { title: files[0].name, author: 'Unknown', price: 0 };
            uploadBtn.disabled = true;
            const originalHTML = uploadBtn.innerHTML;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

            try {
                for (const file of files) {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('title',  meta.title);
                    fd.append('author', meta.author);
                    fd.append('price',  meta.price);

                    const res = await fetch(`${API}/library/upload`, {
                        method: 'POST',
                        headers: authHeader(),
                        body: fd
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || `Upload failed (${res.status})`);
                    }
                }
                alert('Upload successful.');
                await loadLibrary();
            } catch (err) {
                alert('Upload failed: ' + err.message);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = originalHTML;
                e.target.value = '';
                input._meta = null;
            }
        });

        // Reload the grid when the user opens the Education Hub
        document.querySelector('[data-action="openEducation"]')
            ?.addEventListener('click', () => setTimeout(loadLibrary, 150));
    });

    // Expose for other modules
    window.eduReloadLibrary = loadLibrary;
})();