import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/theme';
import { completeAuthFromCallbackUrl, completeAuthWithTokens } from '@/utils/auth';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    expires_in?: string;
  }>();
  const { access_token, refresh_token, expires_at, expires_in } = params;

  useEffect(() => {
    let active = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    async function handleCallback() {
      try {
        let completed = null;
        if (typeof access_token === 'string' && access_token) {
          completed = await completeAuthWithTokens({ access_token, refresh_token, expires_at, expires_in });
        } else {
          const callbackUrl = url || (await Linking.getInitialURL());
          if (callbackUrl && callbackUrl.includes('access_token')) {
            completed = await completeAuthFromCallbackUrl(callbackUrl);
          } else {
            // Allow Linking.useURL to deliver the callback before leaving.
            fallbackTimer = setTimeout(() => {
              if (active) router.replace('/');
            }, 1500);
            return;
          }
        }
        if (!completed) throw new Error('Oturum doğrulanamadı.');
        if (active) router.replace('/');
      } catch {
        if (active) {
          router.replace('/');
          Alert.alert('Giriş Tamamlanamadı', 'Bağlantınızı kontrol edip Google ile tekrar giriş yapın.');
        }
      }
    }

    void handleCallback();
    return () => {
      active = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [url, access_token, refresh_token, expires_at, expires_in]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Google hesabınız doğrulanıyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 14,
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
