/**
 * Modern Portfolio - JavaScript
 * Features: Language switcher, smooth scroll, animations, mobile menu, PWA, Skeletons, Architecture Modals
 */

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSwitcher();
    initThemeToggle();
    initScrollProgress();
    initNavigation();
    initMobileMenu();
    initScrollAnimations();
    initNavbarScroll();
    initMagneticElements();
    initCustomCursor();
    initProjectModals();
    initContactForm();
    initGitHubRepos();
    initLottie();
    initPWA();
});

/**
 * Magnetic Elements - Subtle pull effect towards cursor
 */
function initMagneticElements() {
    const magneticElements = document.querySelectorAll('.btn, .social-link, .nav-logo, .lang-switcher');
    if (window.innerWidth < 1024) return;
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = `translate(0, 0)`;
        });
    });
}

/**
 * Language Switcher
 */
function initLanguageSwitcher() {
    const switcher = document.getElementById('langSwitcher');
    const langActive = switcher.querySelector('.lang-active');
    const langInactive = switcher.querySelector('.lang-inactive');
    let currentLang = localStorage.getItem('portfolio-lang') || 'ru';
    applyLanguage(currentLang);
    updateSwitcherUI(currentLang);
    switcher.addEventListener('click', () => {
        currentLang = currentLang === 'ru' ? 'en' : 'ru';
        applyLanguage(currentLang);
        updateSwitcherUI(currentLang);
        localStorage.setItem('portfolio-lang', currentLang);
    });
    function applyLanguage(lang) {
        document.documentElement.lang = lang;
        const elements = document.querySelectorAll('[data-lang-ru][data-lang-en]');
        elements.forEach(el => {
            const text = el.getAttribute(`data-lang-${lang}`);
            if (text) el.textContent = text;
        });
    }
    function updateSwitcherUI(lang) {
        if (lang === 'ru') {
            langActive.textContent = 'RU';
            langInactive.textContent = 'EN';
        } else {
            langActive.textContent = 'EN';
            langInactive.textContent = 'RU';
        }
    }
}

/**
 * Theme Toggle
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    const body = document.body;
    const currentTheme = localStorage.getItem('portfolio-theme') || 'dark';
    if (currentTheme === 'light') {
        body.classList.add('light-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
        if (isLight) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('portfolio-theme', 'light');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('portfolio-theme', 'dark');
        }
    });
}

/**
 * Navigation
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                closeMobileMenu();
            }
        });
    });
    function updateActiveLink() {
        const scrollPosition = window.scrollY + 150;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) link.classList.add('active');
                });
            }
        });
    }
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
}

/**
 * Mobile Menu
 */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}
function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger) hamburger.classList.remove('active');
    if (navMenu) navMenu.classList.remove('active');
}

/**
 * Scroll Animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.about-card, .exp-card, .skill-category, .contact-item, .approach, .contact-goal, .hobbies, .repo-card, .service-card, .package-card'
    );
    // Fallback: если IntersectionObserver недоступен — показываем всё сразу, не прячем контент
    if (!('IntersectionObserver' in window)) {
        animatedElements.forEach(el => el.classList.add('visible'));
        return;
    }
    animatedElements.forEach(el => el.classList.add('fade-in'));
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOptions);
    animatedElements.forEach(el => observer.observe(el));
    const grids = document.querySelectorAll('.about-cards, .experience-grid, .skills-grid, .projects-grid, .repos-grid, .services-grid, .packages-grid');
    grids.forEach(grid => {
        const items = grid.querySelectorAll('.fade-in');
        items.forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.1}s`;
        });
    });
}

/**
 * Navbar Scroll
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    function updateNavbar() {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }
    window.addEventListener('scroll', updateNavbar);
    updateNavbar();
}

/**
 * Smooth scroll for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            const offsetTop = targetElement.offsetTop - 80;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    });
});

/**
 * Custom Animated Cursor
 */
function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');
    if (!dot || !outline) return;
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;
        dot.style.left = `${posX}px`;
        dot.style.top = `${posY}px`;
        outline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 500, fill: "forwards" });
    });
    const links = document.querySelectorAll('a, button, .project-card, .social-link, .repo-card');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1.6)';
            outline.style.borderColor = 'var(--accent)';
            outline.style.background = 'var(--accent-soft)';
        });
        link.addEventListener('mouseleave', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1)';
            outline.style.borderColor = 'var(--accent-soft)';
            outline.style.background = 'transparent';
        });
    });
}

/**
 * Project Detail Modals
 */
function initProjectModals() {
    const modal = document.getElementById('projectModal');
    const modalBody = modal.querySelector('.modal-body');
    const closeBtn = modal.querySelector('.modal-close');
    const projectCards = document.querySelectorAll('.project-card');
    if (!modal || !projectCards.length) return;
    const projectDetails = {
        'minitask — таск-менеджер': {
            title: 'minitask — таск-менеджер',
            desc: 'Веб-приложение под ключ в стиле Linear: канбан с drag&drop, режимы Доска / Сегодня / Календарь / Архив, аутентификация с подтверждением email. Сделано как тестовое задание.',
            challenge: 'Отзывчивый интерфейс задач с надёжным API и чистой схемой данных, который не тормозит при перетаскивании.',
            solution: 'FastAPI + Pydantic-схемы на бэке, React-клиент, PostgreSQL и Docker — одинаковое окружение от разработки до деплоя.',
            architecture: 'React → FastAPI → PostgreSQL · Docker',
            tags: ['FastAPI', 'React', 'PostgreSQL', 'Docker'],
            link: 'https://github.com/Amanch1ik/minitask'
        },
        'Tengri Avia live': {
            title: 'Tengri Avia',
            desc: 'Многостраничный сайт авиакомпании: поиск и фильтрация рейсов, многошаговое бронирование, личный кабинет пассажира. Полная адаптивность 375–1920px.',
            challenge: 'Сложный пользовательский путь (поиск → выбор → бронирование) на чистом фронтенде, без тяжёлого фреймворка.',
            solution: 'Аккуратная компонентная вёрстка на HTML/CSS/JS + Bootstrap, продуманные состояния форм и адаптив под все экраны.',
            architecture: 'HTML / CSS / JS · Bootstrap · GitHub Pages',
            tags: ['HTML/CSS/JS', 'Bootstrap', 'Responsive'],
            link: 'https://amanch1ik.github.io/tengri-avia/'
        },
        'reklama_ai_gen': {
            title: 'reklama_ai_gen',
            desc: 'AI-сервис генерации рекламных креативов: API для генерации контента, история запросов и профили пользователей. Полный цикл — от Next.js-фронтенда до развёртывания в Docker.',
            challenge: 'Связать генерацию через AI, хранение истории и пользовательские профили в одном продакшен-сервисе.',
            solution: 'Next.js для фронтенда и API-роутов, Prisma как слой данных, контейнеризация в Docker для предсказуемого деплоя.',
            architecture: 'Next.js → API → Prisma → DB · Docker',
            tags: ['Next.js', 'Prisma', 'Docker', 'AI'],
            link: null
        },
        'Mainframe концепт': {
            title: 'Mainframe — лендинг креативного агентства',
            desc: 'Cinematic hero для креативного агентства с интерактивным персонажем (A.R.I.A). Фоновое видео скрабится горизонтальным движением мыши, печатающийся текст-интро, навигация-оверлей и пилюли-CTA. React + TypeScript + Tailwind, без тяжёлых библиотек.',
            challenge: 'Сделать «живого» персонажа без 3D и тяжёлых зависимостей — чтобы реагировал на пользователя плавно, без рывков и подвисаний.',
            solution: 'Скраб видео через requestAnimation-подобный контроль currentTime с защитой от seek-flooding (onSeeked догоняет цель). Тайпрайтер на кастомном хуке, анимации — на чистом CSS/Tailwind.',
            architecture: 'React + TypeScript → Vite → Tailwind · mouse-scrub video',
            tags: ['React', 'TypeScript', 'Tailwind', 'Vite'],
            link: null
        },
        '3D-визитка live': {
            title: '3D-визитка — интерактивный лендинг',
            desc: 'Cinematic 3D-портфолио: магнитный портрет, посимвольное проявление текста по скроллу, sticky-стекинг проектов и бегущая маркиза превью. Полностью адаптивно, под живым доменом.',
            challenge: 'Сделать насыщенный интерактив (магнит, scroll-driven анимации, стекинг карточек) плавным и без лагов на любом устройстве.',
            solution: 'React + TypeScript + Framer Motion (useScroll / useTransform), Vite и Tailwind. Кастомные компоненты Magnet, AnimatedText, FadeIn; деплой на GitHub Pages.',
            architecture: 'React + TypeScript → Vite → Tailwind · Framer Motion',
            tags: ['React', 'TypeScript', 'Framer Motion', 'Vite'],
            link: 'https://amanch1ik.github.io/amanbol-3d/'
        }
    };
    projectCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // клик по ссылке/иконке внутри карточки — не открываем модалку
            if (e.target.closest('a, .project-link')) return;
            const title = card.querySelector('.project-title').textContent.trim();
            const details = projectDetails[title];
            if (details) {
                const isLive = details.link && details.link.includes('github.io');
                const footer = details.link
                    ? `<a href="${details.link}" target="_blank" rel="noopener" class="btn btn-primary">
                           <i class="fas ${isLive ? 'fa-arrow-up-right-from-square' : 'fa-code'}"></i>
                           ${isLive ? 'Открыть сайт' : 'Смотреть код'}
                       </a>`
                    : `<span class="modal-private"><i class="fas fa-lock"></i> Приватный репозиторий — покажу по запросу</span>`;
                modalBody.innerHTML = `
                    <h2 class="modal-title">${details.title}</h2>
                    <div class="modal-tags">${details.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                    <div class="modal-section"><h4 class="modal-section-title">Обзор</h4><p class="modal-desc">${details.desc}</p></div>
                    <div class="modal-section architecture-section"><h4 class="modal-section-title"><i class="fas fa-sitemap"></i> Архитектура</h4><div class="architecture-flow">${details.architecture}</div></div>
                    <div class="modal-grid">
                        <div class="modal-section"><h4 class="modal-section-title">Задача</h4><p class="modal-text">${details.challenge}</p></div>
                        <div class="modal-section"><h4 class="modal-section-title">Решение</h4><p class="modal-text">${details.solution}</p></div>
                    </div>
                    <div class="modal-footer">${footer}</div>
                `;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    closeBtn.addEventListener('click', () => { modal.classList.remove('active'); document.body.style.overflow = 'auto'; });
}

/**
 * Contact Form AJAX
 */
function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const btnText = btn.innerHTML;
        const lang = document.documentElement.lang || 'ru';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        const formData = new FormData(form);
        try {
            const response = await fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
            if (response.ok) {
                showToast(lang === 'ru' ? 'Сообщение отправлено!' : 'Message sent successfully!');
                form.reset();
            } else throw new Error();
        } catch (err) {
            showToast(lang === 'ru' ? 'Ошибка при отправке' : 'Error sending message', 'error');
        } finally {
            btn.innerHTML = btnText;
            btn.disabled = false;
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="toast-content"><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 500); }, 4000);
}

/**
 * GitHub API with Skeleton Loaders
 */
// Repos already featured in Кейсы, meta, or that must never be shown (ADAPTIVA / kinez_project).
const REPO_BLOCKLIST = [
    'Partfolio_Amanchik', 'tengri-avia', 'minitask', 'reklama_ai_gen', 'kinez_project',
    'KD-app', 'Karakol-deliveryVN', // duplicate Karakol-delivery variants
];

// Private projects — shown with limited access (lock, no public link). Hand-curated:
// the unauthenticated GitHub API never returns private repos, and embedding a token
// in client code would be a security hole, so these are static metadata.
const PRIVATE_PROJECTS = [
    {
        name: 'web-version-YES-GO',
        description: 'Веб-версия сервиса доставки YES-GO: интерфейс заказа и интеграция с бэкендом.',
        language: 'TypeScript',
    },
    {
        name: 'MMORPG',
        description: 'Telegram-бот MMORPG на Python: боссы, крафтинг и игровая прогрессия.',
        language: 'Python',
    },
    {
        name: 'agents_analyze',
        description: 'Сервис распознавания эмоций по лицу (компьютерное зрение).',
        language: 'Python',
    },
];

function buildRepoCard(repo) {
    const isPrivate = repo._private === true;
    const lang = repo.language || repo._lang || 'Code';
    const desc = repo.description || 'GitHub репозиторий';
    const stats = isPrivate
        ? '<span class="repo-private-badge"><i class="fas fa-lock"></i></span>'
        : `<div class="repo-stats"><span><i class="fas fa-star"></i> ${repo.stargazers_count}</span><span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span></div>`;
    const footer = isPrivate
        ? '<span class="repo-private" data-lang-ru="Приватный · доступ по запросу" data-lang-en="Private · access on request">Приватный · доступ по запросу</span>'
        : `<a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-link" data-lang-ru="Открыть" data-lang-en="Open">Открыть <i class="fas fa-external-link-alt"></i></a>`;
    const el = document.createElement('div');
    el.className = 'repo-card' + (isPrivate ? ' repo-card--private' : '');
    el.innerHTML = `
        <div class="repo-header"><i class="fab fa-github"></i>${stats}</div>
        <h3 class="repo-name">${repo.name}</h3>
        <p class="repo-desc">${desc}</p>
        <div class="repo-footer"><span class="repo-lang">${lang}</span>${footer}</div>
    `;
    return el;
}

async function initGitHubRepos() {
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectsGrid) return;

    const githubSection = document.createElement('div');
    githubSection.className = 'github-repos-container';
    githubSection.innerHTML = `
        <div class="container">
            <div class="section-header">
                <span class="section-label">GitHub</span>
                <h2 class="section-title" data-lang-ru="Больше проектов" data-lang-en="More projects">Больше проектов</h2>
            </div>
            <div class="repos-grid">
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
            </div>
        </div>
    `;
    projectsGrid.parentNode.insertBefore(githubSection, projectsGrid.nextSibling);

    try {
        // Live fetch keeps the public projects always up to date.
        const response = await fetch('https://api.github.com/users/Amanch1ik/repos?sort=pushed&per_page=100');
        const repos = await response.json();
        const reposGrid = githubSection.querySelector('.repos-grid');
        reposGrid.innerHTML = '';

        const bigPublic = (Array.isArray(repos) ? repos : [])
            .filter((r) => !r.fork && r.description && r.size > 5000 && !REPO_BLOCKLIST.includes(r.name))
            .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
            .slice(0, 4);

        bigPublic.forEach((r) => reposGrid.appendChild(buildRepoCard(r)));
        PRIVATE_PROJECTS.forEach((p) =>
            reposGrid.appendChild(
                buildRepoCard({ name: p.name, description: p.description, _lang: p.language, _private: true })
            )
        );

        initScrollAnimations();
        // re-apply current language to the freshly injected bilingual bits
        const lang = localStorage.getItem('portfolio-lang') || 'ru';
        githubSection.querySelectorAll('[data-lang-ru][data-lang-en]').forEach((el) => {
            const text = el.getAttribute(`data-lang-${lang}`);
            if (text) {
                // keep the trailing icon for the public "Open" link
                const icon = el.querySelector('i');
                el.textContent = text + ' ';
                if (icon) el.appendChild(icon);
            }
        });
    } catch (error) {
        githubSection.remove();
    }
}

function initLottie() { }
function initScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) return;
    window.addEventListener('scroll', () => {
        const windowScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (windowScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    });
}
function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(() => console.log('SW registered')).catch(err => console.log('SW failed', err));
        });
    }
}
