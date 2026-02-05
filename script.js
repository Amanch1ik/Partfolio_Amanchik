/**
 * Modern Portfolio - JavaScript
 * Features: Language switcher, smooth scroll, animations, mobile menu
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
 * Language Switcher - Toggle between Russian and English
 */
function initLanguageSwitcher() {
    const switcher = document.getElementById('langSwitcher');
    const langActive = switcher.querySelector('.lang-active');
    const langInactive = switcher.querySelector('.lang-inactive');

    // Get saved language or default to Russian
    let currentLang = localStorage.getItem('portfolio-lang') || 'ru';

    // Apply saved language on load
    applyLanguage(currentLang);
    updateSwitcherUI(currentLang);

    // Toggle language on click
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
            if (text) {
                el.textContent = text;
            }
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
 * Theme Toggle - Switch between Dark and Light mode
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    const body = document.body;

    // Get saved theme or default to dark
    const currentTheme = localStorage.getItem('portfolio-theme') || 'dark';

    // Apply saved theme on load
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
 * Navigation - Smooth scroll and active state
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Smooth scroll on click
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                closeMobileMenu();
            }
        });
    });

    // Update active state on scroll
    function updateActiveLink() {
        const scrollPosition = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
}

/**
 * Mobile Menu - Hamburger toggle
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

    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}

/**
 * Scroll Animations - Fade in elements on scroll
 */
function initScrollAnimations() {
    // Add fade-in class to animated elements
    const animatedElements = document.querySelectorAll(
        '.about-card, .exp-card, .skill-category, .project-card, .contact-item, .approach, .contact-goal, .hobbies'
    );

    animatedElements.forEach(el => {
        el.classList.add('fade-in');
    });

    // Intersection Observer for scroll reveal
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Stagger animation for grids
    const grids = document.querySelectorAll('.about-cards, .experience-grid, .skills-grid, .projects-grid');

    grids.forEach(grid => {
        const items = grid.querySelectorAll('.fade-in');
        items.forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.1}s`;
        });
    });
}

/**
 * Navbar Scroll - Add background on scroll
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');

    function updateNavbar() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', updateNavbar);
    updateNavbar();
}

/**
 * Smooth scroll for anchor links (buttons)
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');

        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            e.preventDefault();
            const offsetTop = targetElement.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
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

        // Smooth outline follow
        outline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Hover effect on links and buttons
    const links = document.querySelectorAll('a, button, .project-card, .social-link');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1.5)';
            outline.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        });
        link.addEventListener('mouseleave', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1)';
            outline.style.borderColor = 'var(--accent-soft)';
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
        'Yess-Go Backend': {
            title: 'Yess-Go Backend',
            desc: 'A full-featured REST API for a mobile delivery application. Built with Django and PostgreSQL, featuring secure JWT authentication, real-time order processing, and comprehensive documentation.',
            challenge: 'Handling real-time order status updates and ensuring secure authentication for multiple user roles (client, courier, admin).',
            solution: 'Implemented a robust JWT-based auth system and optimized Django ORM queries for high-concurrency order tracking.',
            tags: ['Python', 'Django', 'PostgreSQL', 'JWT'],
            link: 'https://github.com/Amanch1ik/PANEL-s_YESS-Go'
        },
        'MotoDelivery Karakol': {
            title: 'MotoDelivery Karakol',
            desc: 'Dynamic delivery management system for local businesses. Streamlines the process from order placement to final delivery, with automated assignments and status tracking.',
            challenge: 'Creating a simple yet effective interface for local businesses to manage complex delivery queues without technical knowledge.',
            solution: 'Developed a streamlined Bootstrap-based UI and a reliable SQLite backend with custom status-tracking logic.',
            tags: ['Python', 'Django', 'SQLite', 'Bootstrap'],
            link: 'https://github.com/Amanch1ik/motodelivery-karakol'
        },
        'Karakol Delivery v2': {
            title: 'Karakol Delivery v2',
            desc: 'Architectural refactor of the delivery platform focusing on scalability and performance. Implemented advanced caching, optimized database queries, and a more modular codebase.',
            challenge: 'Overcoming performance bottlenecks in the first version and migrating to a more performant framework.',
            solution: 'Migrated to FastAPI, implemented Redis caching for hot data, and dockerized the environment for consistent deployment.',
            tags: ['Python', 'FastAPI', 'Redis', 'Docker'],
            link: 'https://github.com/Amanch1ik/Karakol-delivery-backend-02'
        },
        'Degrees of Separation': {
            title: 'Degrees of Separation',
            desc: 'Graph-based algorithm implementation demonstrating the theory of six degrees of separation. Efficiently finds short paths between nodes in a large dataset of social connections.',
            challenge: 'Efficiently traversing large social graphs with thousands of nodes while maintaining sub-second query times.',
            solution: 'Implemented BFS/DFS optimized with adjacency lists and heuristic pruning to find shortest paths rapidly.',
            tags: ['Python', 'Algorithms', 'Graph Theory'],
            link: 'https://github.com/Amanch1ik/degrees-of-separation'
        }
    };

    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('.project-title').textContent;
            const details = projectDetails[title];

            if (details) {
                modalBody.innerHTML = `
                    <h2 class="modal-title">${details.title}</h2>
                    <div class="modal-tags">
                        ${details.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="modal-section">
                        <h4 class="modal-section-title">Overview</h4>
                        <p class="modal-desc">${details.desc}</p>
                    </div>
                    <div class="modal-grid">
                        <div class="modal-section">
                            <h4 class="modal-section-title"><i class="fas fa-exclamation-circle"></i> The Challenge</h4>
                            <p class="modal-text">${details.challenge}</p>
                        </div>
                        <div class="modal-section">
                            <h4 class="modal-section-title"><i class="fas fa-check-circle"></i> The Solution</h4>
                            <p class="modal-text">${details.solution}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <a href="${details.link}" target="_blank" class="btn btn-primary">
                            <i class="fab fa-github"></i> View Source
                        </a>
                    </div>
                `;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

    // Close on ESC key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

/**
 * Contact Form Handling (Simple Client-side Validation)
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
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showToast(lang === 'ru' ? 'Сообщение отправлено!' : 'Message sent successfully!');
                form.reset();
                btn.innerHTML = btnText;
                btn.disabled = false;
            } else {
                throw new Error();
            }
        } catch (err) {
            showToast(lang === 'ru' ? 'Ошибка при отправке' : 'Error sending message', 'error');
            btn.innerHTML = btnText;
            btn.disabled = false;
        }
    });
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('visible'), 100);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

/**
 * GitHub API Integration
 */
async function initGitHubRepos() {
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectsGrid) return;

    try {
        const response = await fetch('https://api.github.com/users/Amanch1ik/repos?sort=updated&per_page=6');
        const repos = await response.json();

        const githubSection = document.createElement('div');
        githubSection.className = 'github-repos-container';
        githubSection.innerHTML = `
            <div class="container">
                <div class="section-header" style="margin-top: 80px;">
                    <span class="section-label">GitHub Activity</span>
                    <h2 class="section-title" data-lang-ru="Последние репозитории" data-lang-en="Latest Repositories">Последние репозитории</h2>
                </div>
                <div class="repos-grid"></div>
            </div>
        `;

        const reposGrid = githubSection.querySelector('.repos-grid');

        repos.filter(repo => !repo.fork).forEach(repo => {
            const repoCard = document.createElement('div');
            repoCard.className = 'repo-card fade-in';
            repoCard.innerHTML = `
                <div class="repo-header">
                    <i class="fab fa-github"></i>
                    <div class="repo-stats">
                        <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                        <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                    </div>
                </div>
                <h3 class="repo-name">${repo.name}</h3>
                <p class="repo-desc">${repo.description || 'No description available'}</p>
                <div class="repo-footer">
                    <span class="repo-lang">${repo.language || 'Code'}</span>
                    <a href="${repo.html_url}" target="_blank" class="repo-link">View <i class="fas fa-external-link-alt"></i></a>
                </div>
            `;
            reposGrid.appendChild(repoCard);
        });

        projectsGrid.parentNode.insertBefore(githubSection, projectsGrid.nextSibling);

        initScrollAnimations();

    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
    }
}

/**
 * Lottie Animations
 */
function initLottie() {
    // We can add lottie players dynamically or just rely on the script
}
/**
 * Scroll Progress Bar
 */
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
