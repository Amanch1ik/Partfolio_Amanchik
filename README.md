# Портфолио — Аманбол Айтбеков

Личный сайт-портфолио fullstack-разработчика. Двуязычный (RU/EN), тёмная и светлая тема, PWA.

**Живой сайт:** https://amanch1ik.github.io/Partfolio_Amanchik/

## Стек

- HTML, CSS, ванильный JavaScript — без фреймворков и сборки
- Шрифты: Space Grotesk (заголовки) + Manrope (текст)
- Иконки: Font Awesome 6, Devicon
- Форма обратной связи: Formspree
- Service Worker (network-first) + Web App Manifest — устанавливается как PWA

## Структура

```
index.html     — разметка и двуязычный контент (data-lang-ru / data-lang-en)
styles.css     — дизайн-система, сетка, адаптив
enhance.css    — доработки: кейсы, tilt, hero-видео
script.js      — переключение языка/темы, модалки, автоподгрузка репозиториев с GitHub
enhance.js     — scroll-reveal, стек кейсов, char-reveal
sw.js          — service worker (офлайн-кэш)
manifest.json  — PWA-манифест
resources/     — резюме, изображения, иконки
```

## Локальный запуск

Открыть `index.html` в браузере. Для корректной работы service worker и подгрузки — через локальный сервер, например:

```bash
python -m http.server 8000
```

## Деплой

GitHub Pages — публикуется автоматически при пуше в `main`.
