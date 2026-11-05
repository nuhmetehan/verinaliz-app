import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadFavorites() {
        setIsLoading(true);

        try {
          const items = await getFavorites();

          if (isActive) {
            setFavorites(items);
          }
        } catch (error) {
          console.error('Favoriler yüklenemedi:', error);

          if (isActive) {
            setFavorites([]);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadFavorites();

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Favorilerim" subtitle="Tekrar bakmak için kaydettikleriniz" navigation="back"
        onNavigate={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
      <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? <ContentSkeleton label="Favoriler yükleniyor…" /> : favorites.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{'Henüz favori ürününüz yok'}</Text>
            <Text style={styles.emptyText}>
              {'Ürün detay sayfasındaki kalp ikonuna dokunarak favorilerinize ekleyebilirsiniz.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((item) => (
              <Pressable
                key={item.barcode}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() =>
                  router.push({
                    pathname: '/product/[barcode]',
                    params: { barcode: item.barcode },
                  })
                }>
                <Text style={styles.productName}>{item.name ?? 'Adsız ürün'}</Text>
                <Text style={styles.brand}>{item.brand ?? 'Marka bilgisi yok'}</Text>
                <Text style={styles.timestamp}>{formatFavoriteDate(item.timestamp)}</Text>
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
    gap: 6,
    padding: 14,
    borderRadius: radius.xl,
  },
  cardPressed: {
    opacity: 0.8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  brand: {
    ...typography.bodyMd,
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
    borderRadius: radius.xxl,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
