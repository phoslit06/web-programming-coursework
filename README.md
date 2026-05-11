# ЦАО Евразия — курсовая работа

Учебный проект по web-программированию для сайта центра активного отдыха и горнолыжного курорта «Евразия».

## Что готово

- `index.html` — главная страница.
- `css/` — общие стили, переменные, компоненты и адаптивность.
- `assets/images/` — изображения и иконки проекта.
- `pages/` — HTML/CSS-заготовки под будущие страницы курса.
- `data/db.json` — тестовые данные для локального JSON Server.

## Ограничения текущего этапа

- HTML/CSS-верстка не подключена к данным.
- Fetch, localStorage, корзина, авторизация, фильтры и бронирование на фронтенде пока не реализованы.
- Данные подготовлены для следующих этапов курсовой работы.

## Установка JSON Server

Перед первым запуском установите зависимости:

```bash
npm install
```

## Запуск локального сервера

Из папки `course-project` выполните:

```bash
npm run server
```

Сервер запускается на порту `3000` и использует файл `data/db.json`.

## Адреса для проверки

- `http://localhost:3000/users`
- `http://localhost:3000/hotels`
- `http://localhost:3000/rooms`
- `http://localhost:3000/bookings`
- `http://localhost:3000/tariffs`
- `http://localhost:3000/workSchedule`
- `http://localhost:3000/trails`
- `http://localhost:3000/news`
- `http://localhost:3000/promotions`
- `http://localhost:3000/cart`
- `http://localhost:3000/orders`
- `http://localhost:3000/reviews`
- `http://localhost:3000/feedback`
