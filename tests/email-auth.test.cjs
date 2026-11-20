const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ profileFails = false, passwordFails = false } = {}) {
  const requests = [], writes = [];
  const axios = {
    post: async (url, body) => { requests.push({ url, body }); if (passwordFails) throw Error('rejected');
      return { data: { access_token: 'access', refresh_token: 'refresh', expires_at: 123 } }; },
    get: async (url, options) => { requests.push({ url, options }); if (profileFails) throw Error('profile unavailable');
      return { data: { user: { id: 'review-user', email: 'review@example.com' }, total: 3, remaining: 2, next_available_at: "2026-11-27T12:00:00Z", meal_total: 2, meal_remaining: 1 } }; },
  };
  const modules = {
    axios: { __esModule: true, default: axios, isAxiosError: () => false },
    '@react-native-async-storage/async-storage': { default: { removeItem: async () => {} } },
    'expo-linking': {}, 'expo-secure-store': {}, 'expo-web-browser': { maybeCompleteAuthSession() {} },
    'react-native': { Platform: { OS: 'android' } }, './authRedirect': {},
    './sessionStorage': { createSessionStorage: () => ({ write: async value => writes.push(value), clear: async () => {}, read: async () => null }) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/utils/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, console, process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.com' } },
    require: name => { if (!(name in modules)) throw Error(name); return modules[name]; } });
  return { exports, requests, writes };
}

test('email sign-in verifies profile, stores tokens without password and notifies auth subscribers', async () => {
  const f = fixture();
  const sessions = [];
  f.exports.subscribeAuthChanges(session => sessions.push(session));
  const result = await f.exports.signInWithEmail(' Review@Example.com ', '  password  ');
  assert.equal(f.requests[0].body.email, 'review@example.com');
  assert.equal(f.requests[0].body.password, '  password  ');
  assert.equal(f.requests[1].options.headers.Authorization, 'Bearer access');
  assert.equal(result.quota.remaining, 2);
  assert.equal(result.quota.next_available_at, "2026-11-27T12:00:00Z");
  assert.equal(result.session.user.id, 'review-user');
  assert.equal(sessions.length, 1);
  assert.equal(f.writes.length, 1);
  assert.equal(JSON.parse(f.writes[0]).refresh_token, 'refresh');
  assert.ok(!f.writes[0].includes('password'));
});

test('rejected password never fetches a profile or saves a session', async () => {
  const f = fixture({ passwordFails: true });
  await assert.rejects(f.exports.signInWithEmail('a@b.com', 'wrong'));
  assert.equal(f.requests.length, 1);
  assert.equal(f.writes.length, 0);
});

test('profile verification failure never persists an unverified email session', async () => {
  const f = fixture({ profileFails: true });
  await assert.rejects(f.exports.signInWithEmail('a@b.com', 'password'));
  assert.equal(f.writes.length, 0);
});
