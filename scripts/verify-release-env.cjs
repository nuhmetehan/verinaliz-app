module.exports = function verifyReleaseEnvironment(env) {
  const api = new URL(env.EXPO_PUBLIC_API_URL);
  if (api.protocol !== 'https:' || api.hostname.endsWith('.example.com')) {
    throw new Error('Üretim API adresini HTTPS olarak tanımlayın.');
  }
  for (const name of ['EXPO_PUBLIC_SUPPORT_EMAIL', 'EXPO_PUBLIC_DATA_CONTROLLER', 'EXPO_PUBLIC_PUBLISHER_NAME']) {
    if (!env[name]?.trim() || /[{}]/.test(env[name])) throw new Error('Üretim değeri eksik: ' + name);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL)) {
    throw new Error('Geçerli bir destek e-postası tanımlayın.');
  }
};
