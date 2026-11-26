import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGAL_CONSENT_STORAGE_KEY, LegalModal } from '@/components/legal-modal';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { colors } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surfaceContainerLowest,
    border: colors.divider,
    text: colors.onSurface,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(LEGAL_CONSENT_STORAGE_KEY)
      .then(value => setAccepted(value === 'true')).catch(() => setAccepted(false));
  }, []);
  const acceptLegal = async () => {
    await AsyncStorage.setItem(LEGAL_CONSENT_STORAGE_KEY, 'true').catch(() => {});
    setAccepted(true);
  };
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      SplashScreen.preventAutoHideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || accepted === null) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      {accepted ? <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[barcode]" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="auth-callback" />
      </Stack> : <LegalModal visible isFirstLaunch onAccept={acceptLegal} onClose={() => {}} />}
    </ThemeProvider>
  );
}
