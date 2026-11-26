type SessionStorageAdapter = {
  readSecure: () => Promise<string | null>;
  writeSecure: (value: string) => Promise<void>;
  removeSecure: () => Promise<void>;
  readLegacy: () => Promise<string | null>;
  removeLegacy: () => Promise<void>;
};

// Serialize migration, sign-in and sign-out so a pending migration cannot restore
// a session after the user has signed out. Failed writes never discard the source.
export function createSessionStorage(adapter: SessionStorageAdapter) {
  let pending: Promise<void> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }

  return {
    read: () => enqueue(async () => {
      const secure = await adapter.readSecure();
      if (secure !== null) {
        await adapter.removeLegacy();
        return secure;
      }
      const legacy = await adapter.readLegacy();
      if (legacy === null) return null;
      await adapter.writeSecure(legacy);
      await adapter.removeLegacy();
      return legacy;
    }),
    write: (value: string) => enqueue(async () => {
      await adapter.writeSecure(value);
      await adapter.removeLegacy();
    }),
    clear: () => enqueue(async () => {
      await adapter.removeLegacy();
      await adapter.removeSecure();
    }),
  };
}
