import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/theme';
import { completeAuthCode } from '@/utils/auth';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    let active = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    async function handleCallback() {
      try {
        if (typeof code !== 'string' || !code) {
          fallbackTimer = setTimeout(() => { if (active) router.replace('/'); }, 1500);
          return;
        }
        await completeAuthCode(code);
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
  }, [code]);

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
