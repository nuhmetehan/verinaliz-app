import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionStorage } from '../src/utils/sessionStorage.ts';

function fixture(legacy = 'legacy-session') {
  const state = { legacy, secure: null };
  const adapter = {
    readSecure: async () => state.secure,
    writeSecure: async value => { state.secure = value; },
    removeSecure: async () => { state.secure = null; },
    readLegacy: async () => state.legacy,
    removeLegacy: async () => { state.legacy = null; },
  };
  return { state, adapter };
}

test('existing sessions migrate and the plaintext copy is removed', async () => {
  const { state, adapter } = fixture();
  assert.equal(await createSessionStorage(adapter).read(), 'legacy-session');
  assert.deepEqual(state, { legacy: null, secure: 'legacy-session' });
});

test('a failed secure write preserves the migration source and surfaces failure', async () => {
  const { state, adapter } = fixture();
  adapter.writeSecure = async () => { throw Error('device locked'); };
  await assert.rejects(createSessionStorage(adapter).read(), /device locked/);
  assert.equal(state.legacy, 'legacy-session');
});

test('sign-out queued during migration cannot resurrect the old session', async () => {
  const { state, adapter } = fixture();
  const store = createSessionStorage(adapter);
  await Promise.all([store.read(), store.clear()]);
  assert.deepEqual(state, { legacy: null, secure: null });
  assert.equal(await store.read(), null);
});

test('a new sign-in replaces the secure session and removes stale plaintext', async () => {
  const { state, adapter } = fixture();
  state.secure = 'current';
  const store = createSessionStorage(adapter);
  await store.write('new-session');
  assert.deepEqual(state, { legacy: null, secure: 'new-session' });
});

test('failed writes do not poison the queue or report successful persistence', async () => {
  const { state, adapter } = fixture(null);
  const normalWrite = adapter.writeSecure;
  adapter.writeSecure = async () => { throw Error('full'); };
  const store = createSessionStorage(adapter);
  await assert.rejects(store.write('first'), /full/);
  adapter.writeSecure = normalWrite;
  await store.write('second');
  assert.equal(state.secure, 'second');
});
