<<<<<<< HEAD
const state = {
    currentPage: 'home',
    balance: 5234.5,
    user: {
        name: 'Пользователь YessGo',
        email: 'user@yessgo.kg'
    },
    stories: [
        { id: 1, title: 'Бонусы', icon: 'sc_bonus.png', pages: ['https://picsum.photos/seed/bonus1/1200/2200', 'https://picsum.photos/seed/bonus2/1200/2200', 'https://picsum.photos/seed/bonus3/1200/2200'] },
        { id: 2, title: 'Йесскоины', icon: 'sc_coin.png', pages: ['https://picsum.photos/seed/coin1/1200/2200', 'https://picsum.photos/seed/coin2/1200/2200'] },
        { id: 3, title: 'Мы', icon: 'sc_we.png', pages: ['we_stories.png'] },
        { id: 4, title: 'Акции', icon: 'sc_sale.png', pages: ['sales_stories1.png', 'sales_stories2.png', 'sales_stories3.png', 'sales_stories4.png'] }
    ],
    banners: [
        { id: 1, image: 'banner_1.png' },
        { id: 2, image: 'banner_2.png' },
        { id: 3, image: 'banner_3.png' }
    ],
    categories: [
        { name: 'Салоны красоты', image: 'cat_beauty.png' },
        { name: 'Аптеки', image: 'cat_pharmacy.png' },
        { name: 'Магазины', image: 'cat_market.png' }
    ],
    partnerLogos: [
        'promzona.jpg', 'faiza.png', 'navat.png', 'flask.png', 'chikenstar.jpg',
        'bublik.jpg', 'sierra.jpg', 'ants.jpg', 'supara.png', 'teplo.png', 'savetheales.png'
    ],
    currentStory: null,
    currentStoryIndex: 0,
    currentPageIndex: 0,
    storyTimer: null
};

function init() {
    renderApp();
    setupNavigation();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
}

function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHomePage()}
        ${renderPartnersPage()}
        ${renderWalletPage()}
        ${renderQRPage()}
        ${renderMorePage()}
        ${renderBottomNav()}
        ${renderStoryOverlay()}
        ${renderBannerOverlay()}
    `;

    showPage(state.currentPage);
    setupEventListeners();
}

function renderHomePage() {
    return `
        <div class="page" id="home-page">
            <div class="header">
                <div class="profile-section">
                    <div class="profile-avatar">
                        <img src="/images/profile.png" alt="Profile">
                    </div>
                    <div class="profile-info">
                        <div class="profile-name">${state.user.name}</div>
                        <div class="profile-email">${state.user.email}</div>
                    </div>
                </div>

                <div class="wallet-card" onclick="navigateTo('wallet')">
                    <div class="wallet-header">
                        <span class="wallet-label">Ваш Баланс</span>
                        <button class="history-btn">История</button>
                    </div>
                    <div class="wallet-balance">
                        <div class="balance-amount">
                            <span class="balance-value">${state.balance.toFixed(2)}</span>
                            <span class="balance-badge">Yess!Coin</span>
                        </div>
                        <img src="/images/coin.png" alt="Coin" class="coin-icon">
                    </div>
                </div>
            </div>

            <div class="content">
                <h3 class="section-title">Быстрый доступ</h3>
                <div class="stories">
                    ${state.stories.map(story => `
                        <div class="story-item" onclick="openStory(${story.id})">
                            <div class="story-circle">
                                <img src="/images/${story.icon}" alt="${story.title}">
                            </div>
                            <div class="story-title">${story.title}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="banners">
                    ${state.banners.map(banner => `
                        <div class="banner-item" onclick="openBanner(${banner.id})">
                            <img src="/images/${banner.image}" alt="Banner">
                        </div>
                    `).join('')}
                </div>

                <div class="categories-scroll">
                    <div class="categories">
                        ${state.categories.map(cat => `
                            <div class="category-item">
                                <div class="category-image">
                                    <img src="/images/${cat.image}" alt="${cat.name}">
                                </div>
                                <div class="category-title">${cat.name}</div>
                            </div>
                        `).join('')}
                        <div class="category-item" onclick="navigateTo('partners')">
                            <div class="category-image" style="background: #F3F3F3; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 48px; color: var(--primary-green); font-weight: bold;">+</span>
                            </div>
                            <div class="category-title">Ещё...</div>
                        </div>
                    </div>
                </div>

                <h3 class="section-title">Наши партнёры</h3>
                <div class="partners-section">
                    ${renderPartnersRow(0)}
                    ${renderPartnersRow(1)}
                    ${renderPartnersRow(2)}
                </div>
            </div>
        </div>
    `;
}

function renderPartnersRow(rowIndex) {
    const logos = rowIndex === 1 ? [...state.partnerLogos].reverse() : state.partnerLogos;
    const doubled = [...logos, ...logos];

    return `
        <div class="partners-row">
            ${doubled.map(logo => `
                <div class="partner-logo">
                    <img src="/images/${logo}" alt="Partner">
                </div>
            `).join('')}
        </div>
    `;
}

function renderPartnersPage() {
    const allCategories = [
        { name: 'Салоны красоты', image: 'cat_beauty.png' },
        { name: 'Аптеки', image: 'cat_pharmacy.png' },
        { name: 'Магазины', image: 'cat_market.png' },
        { name: 'Одежда и обувь', image: 'cat_clothes.png' },
        { name: 'Для дома', image: 'cat_home.png' },
        { name: 'Электроника', image: 'cat_electronics.png' },
        { name: 'Детям', image: 'cat_kids.png' },
        { name: 'Спорт', image: 'cat_sport.png' },
        { name: 'Еда', image: 'cat_food.png' }
    ];

    return `
        <div class="page" id="partners-page">
            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Поиск по компаниям">
                <button class="map-btn">
                    <img src="/images/map_category_icon.png" alt="Map">
                </button>
            </div>

            <div class="categories-grid">
                ${allCategories.map(cat => `
                    <div class="category-card">
                        <img src="/images/${cat.image}" alt="${cat.name}">
                        <div class="category-card-title">${cat.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderWalletPage() {
    return `
        <div class="page wallet-page" id="wallet-page">
            <div class="page-header" style="background: transparent;">
                <button class="back-btn" onclick="navigateTo('home')">←</button>
            </div>

            <div class="wallet-scroll">
                <div class="wallet-cards">
                    <div class="wallet-mini-card" style="min-width: 160px;">
                        <div style="font-size: 28px; font-weight: bold; color: var(--primary-green); margin-bottom: 6px;">
                            ${state.balance.toFixed(2)}
                        </div>
                        <div class="balance-badge">Yess!Coin</div>
                    </div>

                    <div class="wallet-mini-card">
                        <img src="/images/coin.png" style="width: 38px; height: 38px; margin-bottom: 6px;">
                        <div style="font-weight: bold; color: var(--primary-green);">Бронза</div>
                        <div style="font-size: 12px; color: var(--text-gray);">Уровни</div>
                    </div>

                    <div class="wallet-mini-card" style="min-width: 180px;">
                        <div style="font-weight: bold; color: var(--primary-green); margin-bottom: 8px;">Что такое йесскоины</div>
                        <button style="background: var(--primary-green); color: white; border: none; border-radius: 12px; padding: 6px 12px; font-weight: bold; cursor: pointer;">Посмотреть</button>
                    </div>

                    <div class="wallet-mini-card">
                        <img src="/images/icon_location.png" style="width: 20px; height: 20px; margin-bottom: 6px;">
                        <div style="font-weight: bold; color: var(--primary-green); font-size: 13px; margin-bottom: 6px;">Адреса наших партнёров</div>
                        <div class="balance-badge" style="font-size: 12px;">1 Адрес</div>
                    </div>
                </div>
            </div>

            <div class="topup-section">
                <div class="topup-title">Выберите сумму пополнения:</div>
                <div class="radio-group">
                    <label class="radio-item"><input type="radio" name="amount" value="1000"> 1000 KGS</label>
                    <label class="radio-item"><input type="radio" name="amount" value="800"> 800 KGS</label>
                    <label class="radio-item"><input type="radio" name="amount" value="600"> 600 KGS</label>
                    <label class="radio-item"><input type="radio" name="amount" value="500"> 500 KGS</label>
                    <label class="radio-item"><input type="radio" name="amount" value="300"> 300 KGS</label>
                    <label class="radio-item"><input type="radio" name="amount" value="100" checked> 100 KGS</label>
                    <label class="radio-item">
                        <input type="radio" name="amount" value="other"> Другая сумма
                        <input type="number" placeholder="Введите сумму" style="margin-left: 8px; padding: 4px 8px; border-radius: 6px; border: 1px solid #ddd;">
                    </label>
                </div>
            </div>

            <button class="topup-btn" onclick="alert('Функция пополнения в демо-версии')">Пополнить</button>
        </div>
    `;
}

function renderQRPage() {
    return `
        <div class="page" id="qr-page">
            <div class="qr-demo">
                <h2>QR-страница (демо-версия)</h2>
                <p>Функция сканирования камеры временно отключена.</p>
                <div style="margin-top: 40px;">
                    <img src="/images/nav_qr.png" style="width: 100px; height: 100px; opacity: 0.3;">
                </div>
            </div>
        </div>
    `;
}

function renderMorePage() {
    return `
        <div class="page" id="more-page">
            <div class="more-content">
                <div class="profile-card">
                    <div class="profile-avatar">
                        <img src="/images/profile.png" alt="Profile">
                    </div>
                    <div>
                        <div style="font-weight: bold; color: var(--primary-green);">${state.user.name}</div>
                        <div style="font-size: 12px; color: var(--text-gray);">Профиль</div>
                    </div>
                </div>

                <div class="profile-card">
                    <div style="font-weight: bold;">Способы входа</div>
                    <div style="display: flex; gap: 12px; margin-top: 8px;">
                        <img src="/images/icon_phone.png" style="width: 28px; height: 28px;">
                        <img src="/images/icon_google.png" style="width: 28px; height: 28px;">
                    </div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_location.png" class="menu-icon">
                    <div class="menu-text">Мой город</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_promo.png" class="menu-icon">
                    <div class="menu-text">Ввести промокод</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_messages.png" class="menu-icon">
                    <div class="menu-text">Сообщения</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_referral.png" class="menu-icon">
                    <div class="menu-text">Реферальная ссылка</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_history.png" class="menu-icon">
                    <div class="menu-text">История операции</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_feedback.png" class="menu-icon">
                    <div class="menu-text">Обратная связь</div>
                </div>

                <div class="menu-card">
                    <img src="/images/icon_certificate.png" class="menu-icon">
                    <div class="menu-text">Сертификаты</div>
                </div>

                <div class="menu-card" onclick="alert('Выход из аккаунта')">
                    <img src="/images/icon_logout.png" class="menu-icon">
                    <div class="menu-text" style="color: var(--primary-green);">Выйти</div>
                </div>
            </div>
        </div>
    `;
}

function renderBottomNav() {
    return `
        <div class="bottom-nav">
            <div class="bottom-nav-inner">
                <div class="nav-item" data-page="home">
                    <img src="/images/nav_home.png" class="nav-icon" data-normal="/images/nav_home.png" data-active="/images/nav_home_press.png">
                    <div class="nav-text">Главная</div>
                </div>

                <div class="nav-item" data-page="partners">
                    <img src="/images/nav_partners.png" class="nav-icon" data-normal="/images/nav_partners.png" data-active="/images/nav_partners_press.png">
                    <div class="nav-text">Партнёры</div>
                </div>

                <div class="nav-qr" onclick="navigateTo('qr')">
                    <img src="/images/nav_qr.png">
                </div>

                <div class="nav-item" data-page="notifications">
                    <img src="/images/nav_notification.png" class="nav-icon" data-normal="/images/nav_notification.png" data-active="/images/nav_notification_press.png">
                    <div class="nav-text">Уведомления</div>
                </div>

                <div class="nav-item" data-page="more">
                    <img src="/images/nav_more.png" class="nav-icon" data-normal="/images/nav_more.png" data-active="/images/nav_more_press.png">
                    <div class="nav-text">Ещё</div>
                </div>
            </div>
        </div>
    `;
}

function renderStoryOverlay() {
    return `
        <div class="story-overlay" id="story-overlay" onclick="closeStory()">
            <div class="story-progress" id="story-progress"></div>
            <div class="story-content">
                <img id="story-image" class="story-image" src="">
                <div class="story-header">
                    <div class="story-avatar">
                        <img id="story-avatar" src="">
                    </div>
                    <div class="story-name" id="story-name"></div>
                </div>
                <div class="story-nav">
                    <div class="story-nav-left" onclick="prevStoryPage(event)"></div>
                    <div class="story-nav-right" onclick="nextStoryPage(event)"></div>
                </div>
            </div>
        </div>
    `;
}

function renderBannerOverlay() {
    return `
        <div class="banner-overlay" id="banner-overlay" onclick="closeBanner()">
            <img id="banner-image" src="">
        </div>
    `;
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });
}

function setupEventListeners() {
    window.openStory = openStory;
    window.openBanner = openBanner;
    window.closeStory = closeStory;
    window.closeBanner = closeBanner;
    window.nextStoryPage = nextStoryPage;
    window.prevStoryPage = prevStoryPage;
    window.navigateTo = navigateTo;
}

function navigateTo(page) {
    state.currentPage = page;
    showPage(page);
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const pageMap = {
        'home': 'home-page',
        'partners': 'partners-page',
        'wallet': 'wallet-page',
        'qr': 'qr-page',
        'notifications': 'qr-page',
        'more': 'more-page'
    };

    const pageId = pageMap[page];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('.nav-icon');
        if (icon) {
            icon.src = icon.dataset.normal;
        }
    });

    const activeNavItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
        const icon = activeNavItem.querySelector('.nav-icon');
        if (icon) {
            icon.src = icon.dataset.active;
        }
    }
}

function openStory(storyId) {
    const story = state.stories.find(s => s.id === storyId);
    if (!story) return;

    state.currentStory = story;
    state.currentStoryIndex = 0;
    state.currentPageIndex = 0;

    const overlay = document.getElementById('story-overlay');
    const progressContainer = document.getElementById('story-progress');
    const image = document.getElementById('story-image');
    const avatar = document.getElementById('story-avatar');
    const name = document.getElementById('story-name');

    progressContainer.innerHTML = story.pages.map((_, i) => `
        <div class="progress-bar">
            <div class="progress-fill" id="progress-${i}"></div>
        </div>
    `).join('');

    const imagePath = story.pages[0].startsWith('http') ? story.pages[0] : `/images/${story.pages[0]}`;
    image.src = imagePath;
    avatar.src = `/images/${story.icon}`;
    name.textContent = story.title;

    overlay.classList.add('active');
    startStoryProgress();
}

function startStoryProgress() {
    if (state.storyTimer) clearInterval(state.storyTimer);

    const duration = 5500;
    let elapsed = 0;

    state.storyTimer = setInterval(() => {
        elapsed += 50;
        const progress = Math.min((elapsed / duration) * 100, 100);

        const progressBar = document.getElementById(`progress-${state.currentPageIndex}`);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (elapsed >= duration) {
            nextStoryPage();
        }
    }, 50);
}

function nextStoryPage(event) {
    if (event) {
        event.stopPropagation();
    }

    if (!state.currentStory) return;

    if (state.currentPageIndex < state.currentStory.pages.length - 1) {
        state.currentPageIndex++;
        updateStoryPage();
    } else {
        const nextStoryIndex = state.stories.findIndex(s => s.id === state.currentStory.id) + 1;
        if (nextStoryIndex < state.stories.length) {
            openStory(state.stories[nextStoryIndex].id);
        } else {
            closeStory();
        }
    }
}

function prevStoryPage(event) {
    if (event) {
        event.stopPropagation();
    }

    if (!state.currentStory) return;

    if (state.currentPageIndex > 0) {
        state.currentPageIndex--;
        updateStoryPage();
    } else {
        const prevStoryIndex = state.stories.findIndex(s => s.id === state.currentStory.id) - 1;
        if (prevStoryIndex >= 0) {
            const prevStory = state.stories[prevStoryIndex];
            state.currentStory = prevStory;
            state.currentPageIndex = prevStory.pages.length - 1;
            updateStoryPage();
        }
    }
}

function updateStoryPage() {
    const image = document.getElementById('story-image');
    const imagePath = state.currentStory.pages[state.currentPageIndex].startsWith('http')
        ? state.currentStory.pages[state.currentPageIndex]
        : `/images/${state.currentStory.pages[state.currentPageIndex]}`;
    image.src = imagePath;

    for (let i = 0; i < state.currentStory.pages.length; i++) {
        const progressBar = document.getElementById(`progress-${i}`);
        if (progressBar) {
            progressBar.style.width = i < state.currentPageIndex ? '100%' : '0%';
        }
    }

    startStoryProgress();
}

function closeStory() {
    if (state.storyTimer) {
        clearInterval(state.storyTimer);
        state.storyTimer = null;
    }

    const overlay = document.getElementById('story-overlay');
    overlay.classList.remove('active');
    state.currentStory = null;
}

function openBanner(bannerId) {
    const banner = state.banners.find(b => b.id === bannerId);
    if (!banner) return;

    const overlay = document.getElementById('banner-overlay');
    const image = document.getElementById('banner-image');

    image.src = `/images/${banner.image}`;
    overlay.classList.add('active');

    setTimeout(() => {
        closeBanner();
    }, 25000);
}

function closeBanner() {
    const overlay = document.getElementById('banner-overlay');
    overlay.classList.remove('active');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
=======
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
});
>>>>>>> 7f60d0319b6afdb5b43976a0f28f1948ce134ecb
