const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ profileFails = false, passwordFails = false, oauth = false } = {}) {
  const crypto = require('node:crypto');
  const secure = new Map();
  const requests = [], writes = [];
  const axios = {
    post: async (url, body) => { requests.push({ url, body }); if (passwordFails) throw Error('rejected');
      return { data: { access_token: 'access', refresh_token: 'refresh', expires_at: 123 } }; },
    get: async (url, options) => { requests.push({ url, options });
      if (oauth && url.endsWith('/auth/google')) return { data: { url: 'https://example.invalid/authorize' } };
      if (profileFails) throw Error('profile unavailable');
      return { data: { user: { id: 'review-user', email: 'review@example.com' }, total: 3, remaining: 2, next_available_at: "2026-11-27T12:00:00Z", meal_total: 2, meal_remaining: 1 } }; },
  };
  const modules = {
    axios: { __esModule: true, default: axios, isAxiosError: () => false },
    '@react-native-async-storage/async-storage': { default: { removeItem: async () => {} } },
    'expo-crypto': {
      getRandomBytesAsync: async () => Buffer.alloc(32, 7),
      CryptoDigestAlgorithm: { SHA256: 'sha256' }, CryptoEncoding: { BASE64: 'base64' },
      digestStringAsync: async (_, data) => crypto.createHash('sha256').update(data).digest('base64'),
    },
    'expo-linking': { createURL: () => 'nutriveriapp://auth-callback' },
    'expo-secure-store': {
      setItemAsync: async (key, value) => secure.set(key, value),
      getItemAsync: async key => secure.get(key),
      deleteItemAsync: async key => secure.delete(key),
    },
    'expo-web-browser': { maybeCompleteAuthSession() {},
      openAuthSessionAsync: async () => ({ type: 'success', url: 'nutriveriapp://auth-callback?code=example-authorization-code' }),
    },
    'react-native': { Platform: { OS: 'android' } }, './authRedirect': { validateAuthRedirect() {} },
    './sessionStorage': { createSessionStorage: () => ({ write: async value => writes.push(value), clear: async () => {}, read: async () => null }) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/utils/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, console, URL, setTimeout: () => {}, process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.com' } },
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

test('Google exchanges a PKCE code once even when both Android callback handlers receive it', async () => {
  const f = fixture({ oauth: true });
  const result = await f.exports.signInWithGoogle();
  const duplicate = await f.exports.completeAuthCode('example-authorization-code');
  assert.equal(duplicate.session.user.id, result.session.user.id);
  const exchanges = f.requests.filter(r => r.url.endsWith('/auth/exchange'));
  assert.equal(exchanges.length, 1);
  const { code, verifier } = exchanges[0].body;
  assert.equal(code, 'example-authorization-code');
  const challenge = require('node:crypto').createHash('sha256').update(verifier).digest('base64url');
  assert.equal(f.requests[0].options.params.code_challenge, challenge);
  assert.equal(f.requests[0].options.params.redirect_uri, 'nutriveriapp://auth-callback');
  assert.ok(!JSON.stringify(f.requests[0]).includes(verifier));
  assert.equal(f.writes.length, 1);
});

test('a callback code without a local login transaction cannot open a session', async () => {
  const f = fixture();
  await assert.rejects(f.exports.completeAuthCode('example-authorization-code'));
  assert.equal(f.requests.length, 0);
  assert.equal(f.writes.length, 0);
});
