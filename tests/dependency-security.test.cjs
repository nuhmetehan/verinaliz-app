const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');

test('legacy ESLint consumers use patched matching without losing the callable API', () => {
  for (const consumer of ['eslint', 'eslint-plugin-import', 'eslint-plugin-react']) {
    const requireForConsumer = createRequire(require.resolve(`${consumer}/package.json`));
    const match = requireForConsumer('minimatch');
    assert.equal(typeof match, 'function', consumer);
    assert.equal(match('src/components/view.tsx', '**/*.tsx'), true);
    assert.equal(match('src/components/view.tsx', '**/*.js'), false);
    assert.equal(new match.Minimatch('**/*.{ts,tsx}').match('src/view.tsx'), true);
    assert.deepEqual(match.match(['a.js', 'b.ts'], '*.ts'), ['b.ts']);
    assert.equal(match.defaults({ dot: true })('.env', '*'), true);
  }
});

test('amplifying glob preprocessing is bounded by the patched upstream matcher', () => {
  // Isolate the advisory's **/../ amplification pattern so regressions cannot
  // hang the test runner or exhaust its memory.
  const result = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', `
    const match = require('minimatch');
    try { new match.Minimatch('**/../'.repeat(80) + '*.js', { optimizationLevel: 2 }); }
    catch (error) { if (!(error instanceof RangeError) && !/pattern|limit|complex/i.test(error.message)) throw error; }
  `], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

const globPackages = Object.keys(require('../package-lock.json').packages)
  .filter(name => name.split('/').slice(-2).join('/') === 'node_modules/glob');
for (const installed of globPackages) test(`cancelled scans in ${installed} stop before reading the filesystem`, async () => {
  const { glob } = require(require('node:path').resolve(installed));
  const controller = new AbortController();
  controller.abort(new Error('security probe abort'));
  let reads = 0;
  await assert.rejects(glob('**/*', {
    signal: controller.signal,
    fs: { readdir() { reads++; throw new Error('unexpected filesystem access'); } },
  }), /security probe abort/);
  assert.equal(reads, 0);
});
