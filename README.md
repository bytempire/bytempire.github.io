# Portfolio — bytempire

Современное портфолио веб-разработчика для GitHub Pages.

## Деплой на GitHub Pages

1. Создайте репозиторий `bytempire.github.io` (или любой другой)
2. Загрузите файлы:
   ```bash
   git init
   git add .
   git commit -m "Add portfolio"
   git branch -M main
   git remote add origin https://github.com/bytempire/bytempire.github.io.git
   git push -u origin main
   ```
3. В Settings → Pages выберите **Deploy from branch: main / root**
4. Сайт будет доступен по адресу `https://bytempire.github.io/`

## Структура

```
├── index.html      — главная страница
├── css/style.css   — стили
├── js/main.js      — анимации и навигация
└── README.md
```

## Проекты в портфолио

- [Фейерверки на Грибоедова](https://bytempire.github.io/salut/)
- [Юля Зиева — Таргетолог](https://bytempire.github.io/juliazieva/)
- [MarketMind AI](https://bytempire.github.io/marketmind-landing/)
