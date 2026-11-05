const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
test('a photo cannot be submitted without review and consent is scoped to its analysis type', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/utils/aiPrivacy.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  assert.throws(() => exports.aiConsentHeaders('label', false));
  assert.throws(() => exports.aiConsentHeaders('meal', false));
  for (const scope of ['label', 'meal']) {
    const headers = exports.aiConsentHeaders(scope, true);
    assert.equal(headers['X-Verinaliz-Content-Scope'], scope);
    assert.equal(headers['X-Verinaliz-AI-Consent'], 'photo-analysis-v1');
  }
});
