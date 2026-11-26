const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { initialPhotoFrame, moveFrameEdge, hasSensitivePhotoText } = require('../src/utils/photoPrivacyRules.ts');
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
    assert.equal(headers['X-Verinaliz-AI-Consent'], 'photo-analysis-cloudflare-v2');
  }
});

test('crop sides stay inside the photo and cannot cross one another', () => {
  assert.equal(moveFrameEdge(initialPhotoFrame, 'left', -3).left, 0);
  assert.equal(moveFrameEdge(initialPhotoFrame, 'bottom', 4).bottom, 1);
  const narrow = moveFrameEdge(initialPhotoFrame, 'right', -4);
  assert.equal(narrow.right, narrow.left + 0.2);
  assert.equal(moveFrameEdge(initialPhotoFrame, 'top', 4).top, initialPhotoFrame.bottom - 0.2);
});

test('local OCR checks flag document headers and private contact patterns', () => {
  for (const text of ['TÜRKİYE CUMHURİYETİ KİMLİK\nKARTI', 'deneme@example.test',
    'Tel +90 (555) 010 20 30', 'Adres: Örnek Mahallesi', 'TR00 0000 0000 0000 0000 0000 00', '4242 4242 4242 4242']) {
    assert.equal(hasSensitivePhotoText(text), true, text);
  }
  for (const text of ['İçindekiler: su, şeker. Besin değeri 100 g için 2,4 g', '8690000000000', 'L2026-12-31']) {
    assert.equal(hasSensitivePhotoText(text), false, text);
  }
});
