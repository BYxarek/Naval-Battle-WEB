import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const apiDir = resolve(root, 'api');
const databaseDir = resolve(root, 'database');
const releaseNotesFile = resolve(root, 'RELEASE_NOTES.md');

if (!existsSync(distDir)) {
  throw new Error('Не найдена папка dist. Сначала выполните сборку.');
}

if (!existsSync(releaseNotesFile)) {
  throw new Error('Не найден файл RELEASE_NOTES.md. Добавьте release notes перед сборкой релиза.');
}

const releaseRoot = resolve(root, 'release');
const stagingDir = join(releaseRoot, 'morskoy-boy');
const archiveFile = join(releaseRoot, 'morskoy-boy-hosting.zip');

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

cpSync(distDir, stagingDir, { recursive: true });
cpSync(apiDir, join(stagingDir, 'api'), { recursive: true });
cpSync(databaseDir, join(stagingDir, 'database'), { recursive: true });
cpSync(releaseNotesFile, join(releaseRoot, 'RELEASE_NOTES.md'));
cpSync(releaseNotesFile, join(stagingDir, 'RELEASE_NOTES.md'));
rmSync(join(stagingDir, '.htaccess'), { force: true });

const readme = `# Hosting Release / Релиз для хостинга

## Русский

Этот архив подготовлен для публикации браузерной игры "Морской Бой" на shared hosting.

### Что внутри

- production-файлы фронтенда
- PHP API
- SQL-схема базы данных
- \`RELEASE_NOTES.md\` с описанием новшеств и состава релиза

### Как развернуть

1. Распакуйте архив локально.
2. Загрузите содержимое папки \`morskoy-boy/\` в каталог сайта.
3. При необходимости импортируйте \`database/schema.sql\`.
4. Настройте серверный конфиг и доступ к базе данных.

## English

This archive is prepared for deploying the "Naval Battle" browser game to shared hosting.

### Included

- production frontend files
- PHP API
- SQL database schema
- \`RELEASE_NOTES.md\` with the release summary and new features

### Deployment steps

1. Extract the archive locally.
2. Upload the contents of the \`morskoy-boy/\` folder to your site directory.
3. Import \`database/schema.sql\` if required.
4. Configure the server settings and database access.
`;

writeFileSync(join(releaseRoot, 'README.md'), readme, 'utf8');
writeFileSync(join(stagingDir, 'README.md'), readme, 'utf8');

const psScript = `
$ErrorActionPreference = 'Stop'
$zipPath = ${JSON.stringify(archiveFile)}
$sourcePath = ${JSON.stringify(stagingDir)}
Compress-Archive -Path (Join-Path $sourcePath '*') -DestinationPath $zipPath -Force
`;

execFileSync('powershell', ['-NoLogo', '-NoProfile', '-Command', psScript], {
  cwd: root,
  stdio: 'inherit',
});

const summary = {
  archive: archiveFile,
  staging: stagingDir,
};

writeFileSync(
  join(releaseRoot, 'release.json'),
  JSON.stringify(summary, null, 2),
  'utf8',
);

console.log(`Release archive created: ${archiveFile}`);
