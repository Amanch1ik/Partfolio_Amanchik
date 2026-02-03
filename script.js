// ========================================
// MODERN PORTFOLIO - JAVASCRIPT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initNavbar();
    initMobileMenu();
    initScrollAnimations();
    initSkillBars();
    initCounters();
    initSmoothScroll();
    initActiveNavLink();
});

// ========================================
// CURSOR GLOW EFFECT
// ========================================

function initCursorGlow() {
    const cursorGlow = document.querySelector('.cursor-glow');
    if (!cursorGlow) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;

        cursorGlow.style.left = currentX + 'px';
        cursorGlow.style.top = currentY + 'px';

        requestAnimationFrame(animate);
    }

    animate();
}

// ========================================
// NAVBAR SCROLL EFFECT
// ========================================

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ========================================
// MOBILE MENU
// ========================================

function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ========================================
// SCROLL ANIMATIONS
// ========================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                if (entry.target.closest('.skills')) {
                    animateSkillBars();
                }

                if (entry.target.closest('.about')) {
                    animateCounters();
                }
            }
        });
    }, observerOptions);

    const animatableElements = document.querySelectorAll(
        '.section-header, .info-card, .skill-category, .project-card, .contact-item, .contact-card, .stat-item'
    );

    animatableElements.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
}

// ========================================
// SKILL BARS ANIMATION
// ========================================

let skillBarsAnimated = false;

function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    skillBars.forEach(bar => {
        bar.style.width = '0%';
    });
}

function animateSkillBars() {
    if (skillBarsAnimated) return;
    skillBarsAnimated = true;

    const skillBars = document.querySelectorAll('.skill-progress');

    skillBars.forEach((bar, index) => {
        const progress = bar.dataset.progress;
        setTimeout(() => {
            bar.style.width = `${progress}%`;
        }, index * 100);
    });
}

// ========================================
// COUNTER ANIMATION
// ========================================

let countersAnimated = false;

function initCounters() { }

function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    const counters = document.querySelectorAll('.stat-number');

    counters.forEach(counter => {
        const target = parseInt(counter.dataset.count);
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + '+';
            }
        };

        updateCounter();
    });
}

// ========================================
// SMOOTH SCROLL
// ========================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 80;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// ACTIVE NAV LINK
// ========================================

function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observerOptions = {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// ========================================
// PARALLAX EFFECT FOR SHAPES
// ========================================

function initParallax() {
    const shapes = document.querySelectorAll('.shape');

    window.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 20;
            const offsetX = (x - 0.5) * speed;
            const offsetY = (y - 0.5) * speed;

            shape.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    });
}

initParallax();

window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

console.log('%c👋 Hello Developer!', 'font-size: 24px; font-weight: bold; color: #6366f1;');
console.log('%cPortfolio by Amanch1ik', 'font-size: 14px; color: #22d3ee;');
console.log('%cFull-Stack Developer from Kyrgyzstan', 'font-size: 12px; color: #a1a1aa;');
