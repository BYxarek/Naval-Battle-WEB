import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const apiDir = resolve(root, 'api');
const databaseDir = resolve(root, 'database');
const deployFile = resolve(root, 'DEPLOY.md');

if (!existsSync(distDir)) {
  throw new Error('Не найдена папка dist. Сначала выполните сборку.');
}

const releaseRoot = resolve(root, 'release');
const stagingDir = join(releaseRoot, 'morskoy-boy');
const archiveFile = join(releaseRoot, 'morskoy-boy-hosting.zip');

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

cpSync(distDir, stagingDir, { recursive: true });
cpSync(apiDir, join(stagingDir, 'api'), { recursive: true });
cpSync(databaseDir, join(stagingDir, 'database'), { recursive: true });
cpSync(deployFile, join(stagingDir, 'DEPLOY.md'));
rmSync(join(stagingDir, '.htaccess'), { force: true });

const readme = `Архив для хостинга by-dev.ru

Содержимое:
- файлы фронтенда из dist/
- PHP API из api/
- схема базы данных из database/schema.sql
- DEPLOY.md

Загрузка:
1. Распакуйте архив локально.
2. Залейте содержимое папки morskoy-boy/ в каталог сайта /morskoy-boy/
3. Если нужно, импортируйте database/schema.sql
`;

writeFileSync(join(releaseRoot, 'README.txt'), readme, 'utf8');

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
