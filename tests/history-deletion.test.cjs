const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(file, key, records) {
  const data = new Map([[key, JSON.stringify(records)], ['favorites', '["keep"]']]);
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  };
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, console, require: () => ({ __esModule: true, default: storage }) });
  return { exports, data, storage, records: () => JSON.parse(data.get(key)) };
}

const cases = [
  { file: 'src/utils/scanHistory.ts', key: '@foodscan/scan-history', method: 'deleteScanHistoryItems',
    records: ['1', '2', '3'].map(barcode => ({ barcode, name: null, brand: null, timestamp: 123 })), id: 'barcode' },
  { file: 'src/utils/photoAnalysisHistory.ts', key: '@foodscan/photo-analysis-history', method: 'deletePhotoAnalysisItems',
    records: ['1', '2', '3'].map(id => ({ id, timestamp: 123, riskLevel: 'safe', title: id, result: {} })), id: 'id' },
];

for (const c of cases) {
  test(`${c.method}: removes only one or multiple selected records and preserves favorites`, async () => {
    for (const ids of [['2'], ['1', '3']]) {
      const f = fixture(c.file, c.key, c.records);
      await f.exports[c.method](ids);
      assert.deepEqual(f.records(), c.records.filter(record => !ids.includes(record[c.id])));
      assert.equal(f.data.get('favorites'), '["keep"]');
    }
  });

  test(`${c.method}: supports all/empty selections and surfaces write/read failures`, async () => {
    const f = fixture(c.file, c.key, c.records);
    await f.exports[c.method]([]);
    assert.deepEqual(f.records(), c.records);
    await f.exports[c.method](['1', '2', '3']);
    assert.deepEqual(f.records(), []);
    f.storage.setItem = async () => { throw Error('disk full'); };
    await assert.rejects(f.exports[c.method](['1']), /disk full/);
    f.data.set(c.key, 'invalid json');
    await assert.rejects(f.exports[c.method](['1']));
    assert.equal(f.data.get(c.key), 'invalid json');
  });
}
