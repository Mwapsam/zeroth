/* ================================================================
   HEADER NAV + SERVICES DROPDOWN
   ================================================================ */
(function () {
    const servicesBtn      = document.getElementById('headerServicesBtn');
    const servicesDropdown = document.getElementById('headerServicesDropdown');

    if (servicesBtn && servicesDropdown) {
        function openServicesMenu() {
            servicesDropdown.hidden = false;
            servicesBtn.setAttribute('aria-expanded', 'true');
        }
        function closeServicesMenu() {
            servicesDropdown.hidden = true;
            servicesBtn.setAttribute('aria-expanded', 'false');
            servicesDropdown.querySelectorAll('.header-services-cat-header').forEach(h => {
                h.setAttribute('aria-expanded', 'false');
                const t = document.getElementById(h.dataset.target);
                if (t) t.hidden = true;
            });
        }
        function toggleServicesMenu() {
            servicesDropdown.hidden ? openServicesMenu() : closeServicesMenu();
        }

        servicesBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleServicesMenu(); });

        document.addEventListener('click', (e) => {
            if (!servicesDropdown.hidden &&
                !servicesDropdown.contains(e.target) &&
                !servicesBtn.contains(e.target)) {
                closeServicesMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !servicesDropdown.hidden) closeServicesMenu();
        });

        servicesDropdown.querySelectorAll('.header-services-cat-header').forEach(header => {
            const toggle = () => {
                const target = document.getElementById(header.dataset.target);
                if (!target) return;
                const isOpen = header.getAttribute('aria-expanded') === 'true';
                header.setAttribute('aria-expanded', String(!isOpen));
                target.hidden = isOpen;
            };
            header.addEventListener('click', toggle);
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            });
        });
    }

    // Simple smooth-scroll for header nav icons
    document.querySelectorAll('[data-action="headerNavHome"], [data-action="headerNavAbout"], [data-action="headerNavPartners"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const map = {
                headerNavHome:     '#home',
                headerNavAbout:    '#about',
                headerNavPartners: '#partners'
            };
            const sel = map[btn.dataset.action];
            const target = sel && document.querySelector(sel);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Close button inside dropdown
    document.querySelectorAll('[data-action="closeHeaderServicesMenu"]').forEach(b => {
        b.addEventListener('click', () => {
            const dd = document.getElementById('headerServicesDropdown');
            const btn = document.getElementById('headerServicesBtn');
            if (dd) dd.hidden = true;
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    });
})();