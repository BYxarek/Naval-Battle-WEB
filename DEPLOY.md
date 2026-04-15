# Deploy

## Хостинг

Целевой URL: `https://by-dev.ru/morskoy-boy/`

Стек:
- Apache
- PHP 8.0
- MySQL 8.0

## Что загрузить

1. Быстрый способ: выполнить `npm run release`
2. Взять архив `release/morskoy-boy-hosting.zip`
3. Загрузить на хостинг содержимое папки `morskoy-boy/` из архива

Ручной способ:

1. Собрать фронтенд: `npm run build`
2. Загрузить содержимое папки `dist/` в каталог сайта `morskoy-boy/`
3. Рядом с файлами фронтенда загрузить:
   - `api/`
   - `database/schema.sql`

Итоговая структура на хостинге:

```text
morskoy-boy/
  index.html
  assets/
  favicon.svg
  api/
    index.php
    bootstrap.php
    config.php
    game.php
```

## База данных

1. Импортировать [schema.sql](/d:/my-app/morskoy-boy/database/schema.sql)
2. Проверить, что в [config.php](/d:/my-app/morskoy-boy/api/config.php) заданы нужные параметры подключения

## Примечания

- Фронтенд работает из подпути и обращается к API по относительному пути `./api/index.php`
- Матч синхронизируется через polling, отдельный Node-процесс не нужен
- Файл `api/config.php` содержит чувствительные данные и должен оставаться только на сервере
- `.htaccess` не требуется, проект совместим с CGI-хостингом без rewrite-правил
