document.addEventListener('DOMContentLoaded', function () {

    const nav = document.getElementById('nav');
    const menu = document.getElementById('enlaces');
    const btnOpen = document.getElementById('open');
    const filtros = Array.from(document.querySelectorAll('.filter'));
    const items = Array.from(document.querySelectorAll('.galeria-work .cont-work'));

    const enlaceInicio = document.getElementById('enlace_inicio');
    const enlaceEquipo = document.getElementById('enlace_equipo');
    const enlaceServicio = document.getElementById('enlace_servicio');
    const enlaceTrabajo = document.getElementById('enlace_trabajo');
    const enlaceContacto = document.getElementById('enlace_contacto');
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            window.location.href = 'admin-login.html';
        });
    }


    document.addEventListener('click', function _adminRedirect(e) {
        const a = e.target.closest && e.target.closest('#adminLink');
        if (!a) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        window.location.href = 'admin-login.html';
    }, true);


    function setActiveLink(linkEl) {
        document.querySelectorAll('nav .enlaces a').forEach(a => a.classList.remove('active-link'));
        if (linkEl) linkEl.classList.add('active-link');
    }

    function irASeccionPorPosiblesIds(ids = []) {
        for (let id of ids) {
            const el = document.getElementById(id);
            if (el) {
                if (menu && menu.classList.contains('show')) menu.classList.remove('show');
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
            }
        }
        return false;
    }

    if (enlaceInicio) {
        enlaceInicio.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveLink(enlaceInicio); // activar inmediatamente
        });
    }
    if (enlaceEquipo) enlaceEquipo.addEventListener('click', (e) => { e.preventDefault(); irASeccionPorPosiblesIds(['equipo']); });
    if (enlaceServicio) enlaceServicio.addEventListener('click', (e) => { e.preventDefault(); irASeccionPorPosiblesIds(['servicio', 'servcio', 'servicios']); });
    if (enlaceTrabajo) enlaceTrabajo.addEventListener('click', (e) => { e.preventDefault(); irASeccionPorPosiblesIds(['trabajo']); });
    if (enlaceContacto) enlaceContacto.addEventListener('click', (e) => { e.preventDefault(); irASeccionPorPosiblesIds(['contacto']); });

    /* ---------- Mobile hamburger ---------- */
    if (btnOpen) {
        btnOpen.addEventListener('click', () => menu.classList.toggle('show'));
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !btnOpen.contains(e.target) && menu.classList.contains('show')) {
                menu.classList.remove('show');
            }
        });
    }

    function actualizarNav() {
        const y = window.scrollY || window.pageYOffset;
        if (y <= 300) {
            nav.classList.remove('nav2'); nav.classList.add('nav1');
        } else {
            nav.classList.remove('nav1'); nav.classList.add('nav2');
        }

        if (y < 120) {
            setActiveLink(enlaceInicio);
        }
    }
    window.addEventListener('scroll', actualizarNav);
    actualizarNav();

    const sections = Array.from(document.querySelectorAll('main section, footer'));
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                if (id === 'equipo') setActiveLink(enlaceEquipo);
                else if (id === 'trabajo') setActiveLink(enlaceTrabajo);
                else if (id === 'contacto') setActiveLink(enlaceContacto);
                else if (id === 'servcio' || id === 'servicios' || id === 'servicio') setActiveLink(enlaceServicio);
            }
        });
    }, { threshold: 0.45 });
    sections.forEach(sec => sectionObserver.observe(sec));


    function normalizeText(s) {
        if (!s) return '';
        return s.toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    const gruposRaw = {
        'region': ['Provincia de Ubaté', 'Campo', 'Región'],
        'cultivos': ['Papa', 'Arveja', 'Maíz'],
        'ingeniero agronomo': ['Ingeniero Agrónomo', 'Agricultor', 'Asesorías'],
        'asesorias': ['Ingeniero Agrónomo', 'Agricultor', 'Asesorías'],
        'todos': null
    };

    const grupos = {};
    for (const key in gruposRaw) {
        grupos[normalizeText(key)] = gruposRaw[key]
            ? gruposRaw[key].map(t => normalizeText(t))
            : null;
    }

    items.forEach(it => {
        const h = it.querySelector('.textos-work h4');
        const title = h ? h.textContent.trim() : '';
        it.dataset.titleNorm = normalizeText(title);

        if (it.dataset.group) {
            it.dataset.groupNorm = normalizeText(it.dataset.group);
        } else if (it.dataset.groupname) {
            it.dataset.groupNorm = normalizeText(it.dataset.groupname);
        } else {
            it.dataset.groupNorm = '';
        }

        it.dataset.classNorm = Array.from(it.classList || []).map(c => normalizeText(c)).join(' ');
    });

    window.debugGaleriaTitles = function () {
        return items.map(it => ({ title: it.dataset.titleNorm, dataGroup: it.dataset.groupNorm, classes: it.dataset.classNorm }));
    };

    function showItem(it) {
        it.classList.remove('hide');
        it.style.display = '';

        it.style.opacity = '1';
        it.style.transform = 'translateY(0) scale(1)';
    }
    function hideItem(it) {
        it.classList.add('hide');

        it.style.display = 'none';
    }

    function filtrarPorGrupo(nombre) {
        const key = normalizeText(nombre || '');

        filtros.forEach(f => {
            const fn = normalizeText(f.dataset.nombre || f.textContent || '');
            f.classList.toggle('active', fn === key);
        });

        const lista = grupos[key];

        if (!lista) {

            items.forEach(it => showItem(it));
            return;
        }

        items.forEach(it => {
            let match = false;

            if (it.dataset.groupNorm) {

                const groups = it.dataset.groupNorm.split(/[\s,]+/).filter(Boolean);
                if (groups.includes(key)) match = true;
            }

            if (!match && it.dataset.titleNorm) {
                if (lista.includes(it.dataset.titleNorm)) match = true;
            }


            if (!match && it.dataset.classNorm) {
                if (it.dataset.classNorm.split(/\s+/).includes(key)) match = true;
            }

            if (match) showItem(it);
            else hideItem(it);
        });
    }

    filtros.forEach(f => {
        f.setAttribute('tabindex', '0');
        f.addEventListener('click', () => {
            const nombre = f.dataset.nombre || f.textContent;
            filtrarPorGrupo(nombre);
            irASeccionPorPosiblesIds(['trabajo']);
        });
        f.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); }
        });
    });

    filtrarPorGrupo('todos');

    const appearObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('hide');
                entry.target.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.9,.3,1)';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    items.forEach(it => {
        it.style.opacity = '0';
        it.style.transform = 'translateY(18px) scale(.99)';
        appearObserver.observe(it);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 700 && menu.classList.contains('show')) menu.classList.remove('show');
    });

});
