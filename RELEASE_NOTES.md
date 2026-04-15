# Release Notes

Version: `1.0.0`

## Русский

### Что это за релиз

`Морской Бой 1.0.0` это релиз браузерной версии игры для shared hosting с `PHP 8.2` и `MySQL 8.0`.
В архив входят production-фронтенд, PHP API, схема базы данных и актуальные файлы для публикации на хостинге.

### Главное в релизе

- онлайн-матчи между игроками на разных устройствах по коду комнаты
- отдельный режим игры против серверного бота без ожидания второго игрока
- сервер-авторитетная модель комнаты и боя без клиентской симуляции критичных правил
- ручная расстановка флота с preview перед подтверждением
- авторасстановка без автоподтверждения, с сохранением ручного шага подтверждения
- повторный ход после попадания и потопления
- перезапуск таймера после каждого нового хода, включая попадание и потопление
- сдача во время боя
- реванш по согласию обоих игроков
- быстрый новый матч с ботом через тот же серверный контракт комнаты
- мобильный боевой sidebar и адаптация под небольшие экраны
- светлая и тёмная темы интерфейса
- локализация интерфейса и серверных сообщений на `ru`, `en`, `uk`
- presence heartbeat и счётчик онлайна
- PWA-файлы для установки приложения на главный экран

### Технические изменения и новшества

- PHP API разбит на модульные обработчики действий и игровые подсистемы
- общая игровая логика вынесена в `shared/game/`
- клиентский API-слой вынесен в `src/api/`
- игровой интерфейс разделён на специализированные компоненты `app`, `game`, `lobby`
- стили разложены по тематическим CSS-файлам вместо одного крупного файла
- добавлены отдельные сценарии `test:shared`, `test:contract`, `test:cleanup`, `test:smoke`, `test:ui`
- release-пакет теперь содержит Markdown-документацию по релизу и обновлениям

### Что входит в архив

- production-сборка фронтенда
- PHP API
- SQL-схема базы данных
- `README.md` с краткими инструкциями по публикации
- `RELEASE_NOTES.md` с перечнем возможностей и изменений

### Проверки перед выпуском

Для этого релиза были выполнены:

- `npm run release`
- `npm test`

### Для кого этот релиз

Релиз рассчитан на публикацию на обычном shared hosting, где можно разместить статические файлы, PHP-скрипты и подключение к MySQL без постоянного Node.js-процесса.

## English

### What this release is

`Naval Battle 1.0.0` is the browser release of the game prepared for shared hosting with `PHP 8.2` and `MySQL 8.0`.
The archive contains the production frontend, the PHP API, the database schema, and the current files required for deployment.

### Highlights

- online matches between players on different devices using a room code
- dedicated mode against a server-side bot with no need to wait for a second player
- server-authoritative room and battle flow with no client-only simulation of critical rules
- manual fleet placement with a preview before confirmation
- auto-placement without auto-confirm, keeping manual confirmation as a separate step
- extra turn after a hit or ship destruction
- turn timer reset after every new move, including hits and sunk ships
- surrender during battle
- rematch by mutual agreement
- fast new bot match using the same room contract
- mobile battle sidebar and small-screen adaptation
- light and dark interface themes
- interface and server message localization in `ru`, `en`, and `uk`
- presence heartbeat and online counter
- PWA files for adding the app to the home screen

### Technical changes and improvements

- the PHP API is split into modular action handlers and game subsystems
- shared game rules are extracted into `shared/game/`
- the client API layer is moved into `src/api/`
- the UI is divided into focused `app`, `game`, and `lobby` components
- styles are split into thematic CSS files instead of one oversized stylesheet
- separate `test:shared`, `test:contract`, `test:cleanup`, `test:smoke`, and `test:ui` scenarios are included
- the release package now contains Markdown documentation for deployment and release updates

### What is included in the archive

- production frontend build
- PHP API
- SQL database schema
- `README.md` with short deployment instructions
- `RELEASE_NOTES.md` with the feature and change summary

### Validation before shipping

The following commands were executed for this release:

- `npm run release`
- `npm test`

### Intended environment

This release is intended for regular shared hosting where static files, PHP scripts, and a MySQL connection can be deployed without a persistent Node.js process.
