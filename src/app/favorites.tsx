import { Feather } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentSkeleton } from '@/components/content-skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { colors, elevation, radius, spacing, typography } from '@/theme/theme';
import { getFavorites } from '@/utils/favorites';
import type { ScanHistoryItem } from '@/utils/scanHistory';

function formatFavoriteDate(timestamp: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<ScanHistoryItem[]>([]);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    let isActive = true;

    async function loadFavorites() {
      setIsLoading(true);
      setHasError(false);

      try {
        const items = await getFavorites();
        if (isActive) setFavorites(items);
      } catch (error) {
        console.error('Favoriler yüklenemedi:', error);
        if (isActive) setHasError(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadFavorites();
    return () => { isActive = false; };
  }, [isFocused, retryKey]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Favorilerim" subtitle="Tekrar bakmak için kaydettikleriniz" navigation="back"
        onNavigate={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
      <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? <ContentSkeleton label="Favoriler yükleniyor…" /> : hasError ? (
          <View style={styles.emptyCard}>
            <View style={styles.icon}><Feather name="alert-circle" size={23} color={colors.primary} /></View>
            <Text accessibilityRole="alert" style={styles.emptyTitle}>Favoriler yüklenemedi</Text>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]} onPress={() => setRetryKey((value) => value + 1)}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.icon}><Feather name="heart" size={23} color={colors.primary} /></View>
            <Text accessibilityRole="header" style={styles.emptyTitle}>Henüz favori ürününüz yok</Text>
            <Text style={styles.emptyText}>
              {'Ürün detay sayfasındaki kalp ikonuna dokunarak favorilerinize ekleyebilirsiniz.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((item) => (
              <Pressable
                key={item.barcode}
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() =>
                  router.push({
                    pathname: '/product/[barcode]',
                    params: { barcode: item.barcode },
                  })
                }>
                <View style={styles.icon}><Feather name="heart" size={19} color={colors.primary} /></View>
                <View style={styles.cardText}>
                  <Text style={styles.productName}>{item.name ?? 'Adsız ürün'}</Text>
                  <Text style={styles.brand}>{item.brand ?? 'Marka bilgisi yok'}</Text>
                  <Text style={styles.timestamp}>{formatFavoriteDate(item.timestamp)}</Text>
                </View>
                <Feather name="chevron-right" size={19} color={colors.outline} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.headerSurface,
  },
  content: {
    gap: spacing.stackGap,
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: spacing.containerPadding,
    paddingBottom: 48,
  },
  body: { flex: 1, backgroundColor: colors.background },
  list: {
    gap: spacing.inlineGap,
  },
  card: {
    ...elevation.level1Card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
  },
  cardPressed: {
    backgroundColor: colors.selectedSurface,
  },
  cardText: { flex: 1, minWidth: 0, gap: 3 },
  icon: { alignSelf: 'flex-start', padding: 10, backgroundColor: colors.selectedSurface, borderRadius: radius.lg },
  productName: {
    ...typography.bodyMd,
    fontFamily: typography.action.fontFamily,
    color: colors.onSurface,
  },
  brand: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  timestamp: {
    ...typography.labelMd,
    marginTop: 4,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    ...elevation.level1Card,
    gap: spacing.inlineGap,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  retry: { alignSelf: 'flex-start', minHeight: spacing.touchTarget, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.lg },
  retryPressed: { backgroundColor: colors.primaryContainer },
  retryText: { ...typography.action, color: colors.onPrimary },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
