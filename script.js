/**
 * Modern Portfolio - JavaScript
 * Features: Language switcher, smooth scroll, animations, mobile menu
 */

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSwitcher();
    initNavigation();
    initMobileMenu();
    initScrollAnimations();
    initNavbarScroll();
    initMagneticElements();
    initCustomCursor();
    initProjectModals();
    initContactForm();
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
            tags: ['Python', 'Django', 'PostgreSQL', 'REST API'],
            link: 'https://github.com/Amanch1ik/PANEL-s_YESS-Go'
        },
        'MotoDelivery Karakol': {
            title: 'MotoDelivery Karakol',
            desc: 'Dynamic delivery management system for local businesses. Streamlines the process from order placement to final delivery, with automated assignments and status tracking.',
            tags: ['Python', 'Django', 'SQLite', 'Bootstrap'],
            link: 'https://github.com/Amanch1ik/motodelivery-karakol'
        },
        'Karakol Delivery v2': {
            title: 'Karakol Delivery v2',
            desc: 'Architectural refactor of the delivery platform focusing on scalability and performance. Implemented advanced caching, optimized database queries, and a more modular codebase.',
            tags: ['Python', 'FastAPI', 'Redis', 'Docker'],
            link: 'https://github.com/Amanch1ik/Karakol-delivery-backend-02'
        },
        'Degrees of Separation': {
            title: 'Degrees of Separation',
            desc: 'Graph-based algorithm implementation demonstrating the theory of six degrees of separation. Efficiently finds short paths between nodes in a large dataset of social connections.',
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
                    <p class="modal-desc">${details.desc}</p>
                    <div class="project-tags">
                        ${details.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div style="margin-top: 30px;">
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
                btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                btn.style.backgroundColor = '#22c55e';
                form.reset();
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = btnText;
                    btn.style.backgroundColor = '';
                }, 3000);
            } else {
                throw new Error();
            }
        } catch (err) {
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            btn.style.backgroundColor = '#ef4444';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = btnText;
                btn.style.backgroundColor = '';
            }, 3000);
        }
    });
}
