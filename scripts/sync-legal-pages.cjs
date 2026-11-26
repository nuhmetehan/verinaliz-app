const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const localEnv = path.join(root, '.env.local');
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

const missing = new Set();
const pages = [['PRIVACY_POLICY', 'privacy.md'], ['TERMS_OF_SERVICE', 'terms.md']].map(([name, target]) => {
  const source = path.join(root, 'docs', `${name}.md`);
  const template = existsSync(source) ? source : path.join(root, 'docs', `${name}.example.md`);
  const content = readFileSync(template, 'utf8').replace(/\{\{(SUPPORT_EMAIL|DATA_CONTROLLER|PUBLISHER_NAME)\}\}/g, (match, field) => {
    const key = `EXPO_PUBLIC_${field}`;
    const value = process.env[key]?.trim();
    if (!value) missing.add(key);
    return value || match;
  });
  return [target, content];
});
if (missing.size) {
  console.error(`Eksik ortam değişkenleri: ${[...missing].join(', ')}`);
  process.exit(1);
}

const backend = path.resolve(process.argv[2] || path.join(root, '../verinaliz-app-backend'));
const legalDir = path.join(backend, 'legal');
mkdirSync(legalDir, { recursive: true });
for (const [target, content] of pages) {
  writeFileSync(path.join(legalDir, target), content);
}
console.log('Backend gizlilik ve kullanım koşulları kaynakları güncellendi.');
