const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(readFileSync('src/app/auth-callback.tsx', 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

function fixture({ complete = async () => ({ session: {} }), params = { code: 'mock-authorization-code' } } = {}) {
  const effects = [], routes = [], alerts = [];
  const timers = new Map();
  let timerId = 0;
  const modules = {
    react: { useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'expo-linking': { useURL: () => null, getInitialURL: async () => null },
    'expo-router': { router: { replace: path => routes.push(path) }, useLocalSearchParams: () => params },
    'react-native': { StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) } },
    '@/theme/theme': { colors: {}, typography: {} },
    '@/utils/auth': { completeAuthCode: complete },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => {
      if (!(name in modules)) throw Error('Unexpected import: ' + name);
      return modules[name];
    },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  exports.default();
  return { effects, routes, alerts, timers };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('profile request failure exits loading and offers another sign-in', async () => {
  const f = fixture({ complete: async () => { throw Error('network failure'); } });
  f.effects[0]();
  await flush();
  assert.deepEqual(f.routes, ['/']);
  assert.equal(f.alerts.length, 1);
});

test('a successful callback returns to the app', async () => {
  const f = fixture();
  f.effects[0]();
  await flush();
  assert.deepEqual(f.routes, ['/']);
  assert.equal(f.alerts.length, 0);
});

test('unmount during verification prevents stale navigation and alerts', async () => {
  let reject;
  const f = fixture({ complete: () => new Promise((_, fail) => { reject = fail; }) });
  f.effects[0]()();
  reject(Error('late error'));
  await flush();
  assert.deepEqual(f.routes, []);
  assert.deepEqual(f.alerts, []);
});

test('missing credentials leave the callback and fallback timers are cleaned up', async () => {
  const f = fixture({ params: {} });
  const cleanup = f.effects[0]();
  await flush();
  assert.equal(f.timers.size, 1);
  [...f.timers.values()][0]();
  assert.deepEqual(f.routes, ['/']);
  cleanup();
  assert.equal(f.timers.size, 0);
});
