#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function extractKeys(content) {
  const keys = [];

  {
    const re = /getI18nText\(\s*['"` ]([^'"`]+?)['"`]/g;
    let m;
    while ((m = re.exec(content))) keys.push(m[1]);
  }

  {
    const re = /languageManager\.getText\(\s*['"`]([^'"`]+?)['"`]/g;
    let m;
    while ((m = re.exec(content))) keys.push(m[1]);
  }

  {
    const re = /data-i18n\s*=\s*['"`]([^'"`]+?)['"`]/g;
    let m;
    while ((m = re.exec(content))) keys.push(m[1]);
  }

  return keys;
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const enPath = path.join(projectRoot, 'shared-i18n', 'en.json');

  const en = readJson(enPath);
  const knownKeys = new Set(Object.keys(en));

  const globs = [
    'frontend/src/pages/dashboard/**/*.{vue,ts,js}',
    'frontend/src/components/dashboard/**/*.{vue,ts,js}',
    'frontend/src/utils/widgetRegistry.ts',
  ];

  const files = await fg(globs, {
    cwd: projectRoot,
    onlyFiles: true,
    absolute: true,
    dot: false,
    ignore: ['**/node_modules/**', '**/dist/**', '**/dist-frontend/**'],
  });

  const usedKeys = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    usedKeys.push(...extractKeys(content));
  }

  const uniqueUsed = uniq(usedKeys).sort();
  const missing = uniqueUsed.filter((k) => !knownKeys.has(k));

  console.log(`i18n audit (dashboard): scanned ${files.length} files`);
  console.log(`i18n audit (dashboard): found ${uniqueUsed.length} referenced keys`);

  if (missing.length) {
    console.error(`\nMissing keys in shared-i18n/en.json (${missing.length}):`);
    missing.forEach((k) => console.error(`- ${k}`));

    console.error('\nTip: add the same keys to shared-i18n/en.json and shared-i18n/es.json (and run node scripts/build-i18n.js).');
    process.exitCode = 1;
    return;
  }

  console.log('i18n audit (dashboard): OK (no missing keys)');
}

main().catch((err) => {
  console.error('i18n audit (dashboard) failed:', err);
  process.exitCode = 1;
});
