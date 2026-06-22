/**
 * ENHANCE — интерактивный слой студии (vanilla, без зависимостей)
 * Частицы-констелляция · 3D-tilt + spotlight · grain · blur-up reveal · parallax.
 * Всё деградирует gracefully: reduced-motion и тач/малые экраны отключают тяжёлое.
 */
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches && !('ontouchstart' in window);

    const accent = () =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e07a5f';

    document.addEventListener('DOMContentLoaded', () => {
        buildGrain();
        initHeroReveal();
        initRevealUpgrade();
        initHeroVideoPerf();
        initCharReveal();
        initCaseStack();
        if (reduceMotion) return;
        if (isDesktop) {
            // Particle canvas is now hidden behind the hero hand-video, so we skip it
            // to save a continuous requestAnimationFrame loop.
            initTilt();
            initMagneticPortrait();
        }
    });

    /* ---------- Magnetic hero portrait — the photo eases toward the cursor ---------- */
    function initMagneticPortrait() {
        const el = document.querySelector('.hero-image');
        if (!el) return;
        const PAD = 160;
        const STRENGTH = 7;
        let raf = null;
        let tx = 0;
        let ty = 0;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            const inRange =
                Math.abs(dx) < r.width / 2 + PAD && Math.abs(dy) < r.height / 2 + PAD;
            tx = inRange ? dx / STRENGTH : 0;
            ty = inRange ? dy / STRENGTH : 0;
            el.style.transition = inRange
                ? 'transform 0.3s ease-out'
                : 'transform 0.6s ease-in-out';
            if (!raf) {
                raf = requestAnimationFrame(() => {
                    raf = null;
                    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                });
            }
        };
        window.addEventListener('mousemove', onMove, { passive: true });
    }

    /* ---------- Char-by-char scroll reveal for the About copy ---------- */
    function initCharReveal() {
        if (reduceMotion) return;
        const paras = [...document.querySelectorAll('.about-text p')];
        if (!paras.length) return;

        const splitAll = () => {
            paras.forEach((p) => {
                const text = p.textContent;
                p.textContent = '';
                const spans = [];
                for (const ch of text) {
                    const span = document.createElement('span');
                    span.textContent = ch;
                    span.style.opacity = '0.25';
                    span.style.transition = 'opacity 0.3s ease';
                    p.appendChild(span);
                    spans.push(span);
                }
                p._charSpans = spans;
            });
            update();
        };

        const update = () => {
            const vh = window.innerHeight;
            const startLine = vh * 0.82;
            const endLine = vh * 0.25;
            paras.forEach((p) => {
                const spans = p._charSpans;
                if (!spans) return;
                const r = p.getBoundingClientRect();
                const span = r.height + (startLine - endLine);
                const progress = Math.max(0, Math.min(1, (startLine - r.top) / span));
                const revealed = Math.round(progress * spans.length);
                spans.forEach((s, i) => {
                    s.style.opacity = i < revealed ? '1' : '0.25';
                });
            });
        };

        let ticking = false;
        window.addEventListener(
            'scroll',
            () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => {
                    update();
                    ticking = false;
                });
            },
            { passive: true }
        );

        splitAll();

        // Re-split after a language toggle (script.js resets textContent, wiping the spans).
        const sw = document.getElementById('langSwitcher');
        if (sw) sw.addEventListener('click', () => setTimeout(splitAll, 0));
    }

    /* ---------- Sticky-stacking case cards (scale down as the next slides over) ---------- */
    function initCaseStack() {
        if (reduceMotion) return;
        const container = document.querySelector('.case-stack');
        if (!container) return;
        const cards = [...container.querySelectorAll('.case-card')];
        const N = cards.length;
        if (!N) return;

        const update = () => {
            const cr = container.getBoundingClientRect();
            const total = cr.height - window.innerHeight;
            const scrolled = Math.max(0, -cr.top);
            const progress = total > 0 ? Math.min(1, scrolled / total) : 0;
            cards.forEach((card, i) => {
                const targetScale = 1 - (N - 1 - i) * 0.04;
                const start = i / N;
                const range = 1 - start;
                const p = range > 0 ? Math.max(0, Math.min(1, (progress - start) / range)) : 0;
                const scale = 1 - (1 - targetScale) * p;
                card.style.transform = `scale(${scale})`;
            });
        };

        let ticking = false;
        window.addEventListener(
            'scroll',
            () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => {
                    update();
                    ticking = false;
                });
            },
            { passive: true }
        );
        window.addEventListener('resize', update);
        update();
    }

    /* ---------- Pause the hero hand-video when it scrolls out of view (saves decode) ---------- */
    function initHeroVideoPerf() {
        const video = document.querySelector('.hero-hand-bg');
        if (!video || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                });
            },
            { threshold: 0.05 }
        );
        io.observe(video);
    }

    /* ---------- Cinematic reveal: titles wipe, labels fade, steps slide ---------- */
    function initRevealUpgrade() {
        if (reduceMotion) return;
        const titles = [...document.querySelectorAll('.section-title')];
        const labels = [...document.querySelectorAll('.section-label')];
        const steps = [...document.querySelectorAll('.timeline-item')];
        titles.forEach((el) => el.classList.add('js-title'));
        labels.forEach((el) => el.classList.add('js-label'));
        steps.forEach((el) => el.classList.add('js-step'));
        const all = [...titles, ...labels, ...steps];
        if (!('IntersectionObserver' in window)) {
            all.forEach((el) => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-in');
                        io.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
        );
        all.forEach((el) => io.observe(el));
    }

    /* ---------- Grain overlay ---------- */
    function buildGrain() {
        if (reduceMotion || document.querySelector('.grain')) return;
        const grain = document.createElement('div');
        grain.className = 'grain';
        document.body.appendChild(grain);
    }

    /* ---------- Hero load reveal (blur-up) ---------- */
    function initHeroReveal() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        const text = hero.querySelector('.hero-text');
        const image = hero.querySelector('.hero-image');
        if (text) [...text.children].forEach((el) => el.classList.add('hero-reveal'));
        if (image) image.classList.add('hero-reveal');
        requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('loaded')));
    }

    /* ---------- 3D tilt + spotlight ---------- */
    function initTilt() {
        const cards = document.querySelectorAll(
            '.service-card, .package-card, .repo-card, .about-card'
        );
        const MAX = 7;
        cards.forEach((card) => {
            card.classList.add('tilt');
            const glow = document.createElement('span');
            glow.className = 'tilt-glow';
            card.appendChild(glow);

            // Cache the rect on enter so mousemove doesn't force a layout read every frame.
            let rect = null;
            card.addEventListener('mouseenter', () => {
                rect = card.getBoundingClientRect();
                card.classList.add('is-tilting');
            });
            card.addEventListener('mousemove', (e) => {
                if (!rect) rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const ry = (px - 0.5) * MAX * 2;
                const rx = (0.5 - py) * MAX * 2;
                card.style.transform =
                    `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
            });
            card.addEventListener('mouseleave', () => {
                rect = null;
                card.classList.remove('is-tilting');
                card.style.transform = '';
            });
        });
    }

    /* ---------- Parallax (hero visual drifts on scroll) ---------- */
    function initParallax() {
        const image = document.querySelector('.hero-image');
        if (!image) return;
        image.classList.add('parallax');
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = Math.min(window.scrollY, 700);
                image.style.transform = `translateY(${y * 0.08}px)`;
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---------- Hero particle constellation ---------- */
    function initHeroCanvas() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'hero-canvas';
        hero.insertBefore(canvas, hero.firstChild);
        const ctx = canvas.getContext('2d');

        let w = 0;
        let h = 0;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let particles = [];
        const mouse = { x: -9999, y: -9999 };
        const LINK_DIST = 130;

        function resize() {
            const r = hero.getBoundingClientRect();
            w = r.width;
            h = r.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.max(28, Math.min(70, Math.round((w * h) / 22000)));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.6 + 0.6,
            }));
        }

        function step() {
            ctx.clearRect(0, 0, w, h);
            const col = accent();
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                let near = 0;
                if (dist < 140) {
                    near = (140 - dist) / 140;
                    p.x += (dx / dist) * near * 1.5;
                    p.y += (dy / dist) * near * 1.5;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r + near * 1.8, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.6 + near * 0.35;
                ctx.fill();
            }
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < LINK_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = col;
                        ctx.globalAlpha = (1 - d / LINK_DIST) * 0.22;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        let raf = null;
        let running = true;
        function loop() {
            if (running) step();
            raf = requestAnimationFrame(loop);
        }

        hero.addEventListener('mousemove', (e) => {
            const r = hero.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        });
        hero.addEventListener('mouseleave', () => {
            mouse.x = -9999;
            mouse.y = -9999;
        });
        window.addEventListener('resize', resize);

        // pause when hero scrolled out of view
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                running = entries[0].isIntersecting;
            }).observe(hero);
        }

        resize();
        loop();
    }
})();
