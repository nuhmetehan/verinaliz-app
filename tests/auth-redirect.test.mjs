import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAuthRedirect, UnsupportedAuthEnvironmentError } from '../src/utils/authRedirect.ts';

test('Expo Go redirects fail before starting an OAuth session', () => {
  for (const uri of ['exp://192.168.1.5:8081/--/auth-callback', 'exps://host/--/auth-callback']) {
    assert.throws(() => validateAuthRedirect(uri), UnsupportedAuthEnvironmentError);
  }
});

test('installed app and web callback URLs remain supported', () => {
  for (const uri of ['nutriveriapp://auth-callback', 'verinalizapp://auth-callback', 'https://example.com/auth-callback']) {
    assert.doesNotThrow(() => validateAuthRedirect(uri));
  }
});
