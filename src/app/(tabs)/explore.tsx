import { Feather, FontAwesome } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IngredientAnalysisModal } from '@/components/ingredient-analysis-modal';
import { LegalModal } from '@/components/legal-modal';
import { ContentSkeleton } from '@/components/content-skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { SideDrawer } from '@/components/side-drawer';
import { WelcomeGuideModal } from '@/components/welcome-guide-modal';
import { colors, elevation, radius, spacing, typography } from '@/theme/theme';
import {
  getPhotoAnalysisHistory,
  deletePhotoAnalysisItems,
  type PhotoAnalysisRecord,
} from '@/utils/photoAnalysisHistory';
import { subscribeLocalDataChanges } from '@/utils/localData';
import { deleteScanHistoryItems, getScanHistory, type ScanHistoryItem } from '@/utils/scanHistory';

type DateGroup = 'BUGÜN' | 'DÜN' | 'DAHA ÖNCE';
type HistoryFilter = 'all' | 'barcodes' | 'photos';

type UnifiedHistoryItem =
  | {
      type: 'barcode';
      id: string;
      timestamp: number;
      barcodeItem: ScanHistoryItem;
    }
  | {
      type: 'photo';
      id: string;
      timestamp: number;
      photoRecord: PhotoAnalysisRecord;
    };

type GroupedHistory = {
  label: DateGroup;
  items: UnifiedHistoryItem[];
};

/** Gün başlangıcını (00:00:00) döndürür */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Bir timestamp'in hangi gruba ait olduğunu belirler */
function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const yesterdayStart = todayStart - 86_400_000; // 24 saat

  if (timestamp >= todayStart) return 'BUGÜN';
  if (timestamp >= yesterdayStart) return 'DÜN';
  return 'DAHA ÖNCE';
}

/**
 * Saat formatı:
 * - BUGÜN / DÜN → yalnızca saat ("16:14")
 * - DAHA ÖNCE   → tarih + saat ("11 Eylül 16:02")
 */
function formatScanTime(timestamp: number, group: DateGroup): string {
  const date = new Date(timestamp);

  if (group === 'BUGÜN' || group === 'DÜN') {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Geçmiş listesini tarih gruplarına ayırır */
function groupHistoryByDate(history: UnifiedHistoryItem[]): GroupedHistory[] {
  const order: DateGroup[] = ['BUGÜN', 'DÜN', 'DAHA ÖNCE'];
  const groups = new Map<DateGroup, UnifiedHistoryItem[]>();

  for (const item of history) {
    const group = getDateGroup(item.timestamp);
    const existing = groups.get(group);

    if (existing) {
      existing.push(item);
    } else {
      groups.set(group, [item]);
    }
  }

  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }));
}

function BarcodeThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (imageUrl && failedUri !== imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.photoCardThumbnail}
        onError={() => setFailedUri(imageUrl)}
      />
    );
  }

  return (
    <View style={styles.photoCardIconPlaceholder}>
      <Feather name="box" size={20} color={colors.outline} />
    </View>
  );
}

function PhotoThumbnail({ imageUri }: { imageUri?: string | null }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (imageUri && failedUri !== imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.photoCardThumbnail}
        onError={() => setFailedUri(imageUri)}
      />
    );
  }

  return (
    <View style={styles.photoCardIconPlaceholder}>
      <FontAwesome name="photo" size={20} color={colors.outline} />
    </View>
  );
}

export default function HistoryScreen() {
  const [barcodeHistory, setBarcodeHistory] = useState<ScanHistoryItem[]>([]);
  const [photoHistory, setPhotoHistory] = useState<PhotoAnalysisRecord[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<PhotoAnalysisRecord | null>(null);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const [scans, photos] = await Promise.all([
        getScanHistory(),
        getPhotoAnalysisHistory(),
      ]);

      setBarcodeHistory(scans);
      setPhotoHistory(photos);
    } catch (error) {
      console.error('Tarama geçmişi yüklenemedi:', error);
      setHasLoadError(true);
      setBarcodeHistory([]);
      setPhotoHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  // Hesapla birlikte yerel veriler silindiğinde listeyi yenile.
  useEffect(() => subscribeLocalDataChanges(() => void loadHistory()), [loadHistory]);

  const combinedHistory = useMemo(() => {
    const list: UnifiedHistoryItem[] = [];

    if (filter === 'all' || filter === 'barcodes') {
      for (const item of barcodeHistory) {
        list.push({
          type: 'barcode',
          id: `barcode-${item.barcode}-${item.timestamp}`,
          timestamp: item.timestamp,
          barcodeItem: item,
        });
      }
    }

    if (filter === 'all' || filter === 'photos') {
      for (const item of photoHistory) {
        list.push({
          type: 'photo',
          id: `photo-${item.id}`,
          timestamp: item.timestamp,
          photoRecord: item,
        });
      }
    }

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [barcodeHistory, photoHistory, filter]);

  const grouped = useMemo(() => groupHistoryByDate(combinedHistory), [combinedHistory]);

  function changeFilter(next: HistoryFilter) {
    if (deleting) return;
    setFilter(next);
    setSelectedIds(new Set());
  }

  function toggleSelection(id: string) {
    if (deleting) return;
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function confirmDelete(entries: UnifiedHistoryItem[]) {
    if (deleting || !entries.length) return;
    Alert.alert('Geçmişten sil', `${entries.length} kayıt silinsin mi? Bu işlem geri alınamaz.`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => void performDelete(entries) },
    ]);
  }

  async function performDelete(entries: UnifiedHistoryItem[]) {
    setDeleting(true);
    try {
      // Attempt both stores and refresh even if one fails, to reflect partial success.
      const results = await Promise.allSettled([
        deleteScanHistoryItems(entries.filter(e => e.type === 'barcode').map(e => e.barcodeItem.barcode)),
        deletePhotoAnalysisItems(entries.filter(e => e.type === 'photo').map(e => e.photoRecord.id)),
      ]);
      await loadHistory();
      setSelectedIds(new Set());
      if (results.some(result => result.status === 'rejected')) {
        Alert.alert('Silme tamamlanamadı', 'Bazı kayıtlar silinemedi. Listede kalan kayıtlar için tekrar deneyin.');
      } else {
        setSelecting(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  function recordAction(entry: UnifiedHistoryItem) {
    return selecting ? (
      <View accessible accessibilityLabel={selectedIds.has(entry.id) ? 'Seçili' : 'Seçili değil'}>
        <FontAwesome name={selectedIds.has(entry.id) ? 'check-square-o' : 'square-o'} size={24} color={colors.primary} />
      </View>
    ) : (
      <Pressable accessibilityRole="button" accessibilityLabel="Bu kaydı geçmişten sil" disabled={deleting}
        hitSlop={8} style={styles.actionButton} onPress={event => { event.stopPropagation(); confirmDelete([entry]); }}>
        <FontAwesome name="trash-o" size={22} color={colors.error} />
      </Pressable>
    );
  }

  function getEmptyMessage(): { title: string; text: string } {
    if (filter === 'barcodes') {
      return {
        title: 'Henüz barkod taramadınız',
        text: 'Barkod okutarak ürün ekleyebilirsiniz.',
      };
    }
    if (filter === 'photos') {
      return {
        title: 'Henüz AI analizi yapmadınız',
        text: 'Kamera butonuyla içindekiler fotoğrafı çekerek AI analizi yapabilirsiniz.',
      };
    }
    return {
      title: 'Henüz ürün taramadınız',
      text: 'Taradığınız veya AI ile analiz ettiğiniz ürünler burada görünecek.',
    };
  }

  const emptyMsg = getEmptyMessage();

  return (
    <>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Geçmiş" subtitle="Son incelediğiniz ürünler" onNavigate={() => setDrawerVisible(true)}
          action={<Pressable accessibilityRole="button" accessibilityLabel={selecting ? 'Seçimi iptal et' : 'Kayıt seç'}
            disabled={isLoading || deleting || (!selecting && combinedHistory.length === 0)}
            onPress={() => { setSelecting(!selecting); setSelectedIds(new Set()); }}
            style={({ pressed }) => [styles.headerAction, (pressed || isLoading || deleting || (!selecting && combinedHistory.length === 0)) && styles.headerActionDimmed]}>
            <Text style={styles.filterChipText}>{selecting ? 'İptal' : 'Seç'}</Text>
          </Pressable>}>
          {/* Filtre Çipleri */}
          <View style={styles.filterRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              accessibilityState={{ selected: filter === 'all', disabled: deleting }}
              disabled={deleting}
              onPress={() => changeFilter('all')}>
              <Text
                style={[
                  styles.filterChipText,
                  filter === 'all' && styles.filterChipTextActive,
                ]}>
                Tümü
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.filterChip, filter === 'barcodes' && styles.filterChipActive]}
              accessibilityState={{ selected: filter === 'barcodes', disabled: deleting }}
              disabled={deleting}
              onPress={() => changeFilter('barcodes')}>
              <Text
                style={[
                  styles.filterChipText,
                  filter === 'barcodes' && styles.filterChipTextActive,
                ]}>
                Barkodlar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.filterChip, filter === 'photos' && styles.filterChipActive]}
              accessibilityState={{ selected: filter === 'photos', disabled: deleting }}
              disabled={deleting}
              onPress={() => changeFilter('photos')}>
              <Text
                style={[
                  styles.filterChipText,
                  filter === 'photos' && styles.filterChipTextActive,
                ]}>
                AI Analizleri
              </Text>
            </Pressable>
          </View>

          {selecting && <View style={styles.selectionBar}>
            <Text style={styles.filterChipText}>{selectedIds.size} kayıt seçildi</Text>
            <Pressable accessibilityRole="button" style={styles.actionButton} disabled={deleting || !combinedHistory.length}
              onPress={() => setSelectedIds(selectedIds.size === combinedHistory.length ? new Set() : new Set(combinedHistory.map(item => item.id)))}>
              <Text style={styles.filterChipText}>{selectedIds.size === combinedHistory.length ? 'Seçimi kaldır' : 'Tümünü seç'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={deleting || !selectedIds.size}
              style={[styles.actionButton, { opacity: !selectedIds.size || deleting ? 0.4 : 1 }]}
              onPress={() => confirmDelete(combinedHistory.filter(item => selectedIds.has(item.id)))}>
              <Text style={[styles.filterChipText, { color: colors.error }]}>{deleting ? 'Siliniyor…' : 'Sil'}</Text>
            </Pressable>
          </View>}

        </ScreenHeader>
        <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? <ContentSkeleton label="Geçmiş yükleniyor…" /> : hasLoadError ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><Feather name="alert-circle" size={23} color={colors.primary} /></View>
              <Text accessibilityRole="alert" style={styles.emptyTitle}>Geçmiş yüklenemedi</Text>
              <Pressable accessibilityRole="button"
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
                onPress={() => void loadHistory()}>
                <Text style={styles.retryText}>Tekrar dene</Text>
              </Pressable>
            </View>
          ) : combinedHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><Feather name="clock" size={23} color={colors.primary} /></View>
              <Text accessibilityRole="header" style={styles.emptyTitle}>{emptyMsg.title}</Text>
              <Text style={styles.emptyText}>{emptyMsg.text}</Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.label} style={styles.groupContainer}>
                {/* Grup başlığı: sol etiket + sağ çizgi */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{group.label}</Text>
                  <View style={styles.sectionLine} />
                </View>

                {/* Gruptaki kartlar */}
                <View style={styles.list}>
                  {group.items.map((entry) => {
                    if (entry.type === 'barcode') {
                      const barcodeItem = entry.barcodeItem;
                      return (
                        <Pressable
                          key={entry.id}
                          disabled={deleting}
                          accessibilityRole={selecting ? 'checkbox' : 'button'}
                          accessibilityState={selecting ? { checked: selectedIds.has(entry.id) } : undefined}
                          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                          onPress={() => selecting ? toggleSelection(entry.id) :
                            router.push({
                              pathname: '/product/[barcode]',
                              params: { barcode: barcodeItem.barcode },
                            })
                          }>
                          <View style={styles.photoCardContent}>
                            <BarcodeThumbnail imageUrl={barcodeItem.imageUrl} />
                            <View style={styles.photoCardDetails}>
                              <Text style={styles.productName} numberOfLines={2}>
                                {barcodeItem.name ?? 'Adsız ürün'}
                              </Text>
                              <Text style={styles.brand} numberOfLines={2}>
                                {barcodeItem.brand ?? 'Marka bilgisi yok'}
                              </Text>
                              <Text style={styles.timestamp}>
                                {formatScanTime(barcodeItem.timestamp, group.label)}
                              </Text>
                            </View>
                            {recordAction(entry)}
                          </View>
                        </Pressable>
                      );
                    }

                    // Fotoğraf Analizi Kartı
                    const photoItem = entry.photoRecord;
                    const isMeal =
                      photoItem.result.analysis_type === 'meal_plate' ||
                      photoItem.result.label_type === 'meal_plate';
                    const isCosmetic = photoItem.result.label_type === 'cosmetic';
                    const ingredientCount =
                      photoItem.result.ingredients_list?.length ?? 0;
                    const hasNutr = Boolean(photoItem.result.nutrition || photoItem.result.has_nutrition);
                    const hasIngr = ingredientCount > 0 || Boolean(photoItem.result.ingredients_text);

                    let cardCategory = 'AI İçerik Analizi';
                    if (isMeal) {
                      cardCategory = 'AI Öğün Analizi';
                    } else if (isCosmetic) {
                      cardCategory = 'AI Kozmetik Analizi';
                    } else if (hasIngr && hasNutr) {
                      cardCategory = 'AI Etiket & Besin Analizi';
                    } else if (hasNutr) {
                      cardCategory = 'AI Besin Değerleri';
                    }

                    const extraDetails: string[] = [];
                    if (isMeal) {
                      const mealItemCount = photoItem.result.detected_items?.length ?? 0;
                      if (mealItemCount > 0) {
                        extraDetails.push(`${mealItemCount} çeşit`);
                      }
                      if (photoItem.result.estimated_totals?.calories_range) {
                        extraDetails.push(photoItem.result.estimated_totals.calories_range);
                      }
                    } else {
                      if (ingredientCount > 0) {
                        extraDetails.push(`${ingredientCount} bileşen`);
                      }
                      if (photoItem.result.nutrition?.calories) {
                        extraDetails.push(`${photoItem.result.nutrition.calories} kcal`);
                      }
                    }
                    const detailSuffix = extraDetails.length > 0 ? ` • ${extraDetails.join(' • ')}` : '';

                    return (
                      <Pressable
                        key={entry.id}
                        disabled={deleting}
                        accessibilityRole={selecting ? 'checkbox' : 'button'}
                        accessibilityState={selecting ? { checked: selectedIds.has(entry.id) } : undefined}
                        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                        onPress={() => {
                          if (selecting) { toggleSelection(entry.id); return; }
                          setSelectedPhotoRecord(photoItem);
                          setIsPhotoModalVisible(true);
                        }}>
                        <View style={styles.photoCardContent}>
                          <PhotoThumbnail imageUri={photoItem.imageUri} />
                          <View style={styles.photoCardDetails}>
                            <Text style={styles.productName} numberOfLines={2}>
                              {photoItem.title}
                            </Text>

                            <Text style={styles.brand} numberOfLines={2}>
                              {cardCategory}{detailSuffix}
                            </Text>

                            <Text style={styles.timestamp}>
                              {formatScanTime(photoItem.timestamp, group.label)}
                            </Text>
                          </View>
                          {recordAction(entry)}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onOpenHowItWorks={() => setIsGuideVisible(true)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab || 'privacy');
          setIsLegalModalVisible(true);
        }}
      />

      <WelcomeGuideModal
        visible={isGuideVisible}
        onClose={() => setIsGuideVisible(false)}
      />

      <LegalModal
        visible={isLegalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalVisible(false)}
      />

      <IngredientAnalysisModal
        visible={isPhotoModalVisible}
        onClose={() => {
          setIsPhotoModalVisible(false);
          setSelectedPhotoRecord(null);
          void loadHistory();
        }}
        initialRecord={selectedPhotoRecord}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab || 'privacy');
          setIsLegalModalVisible(true);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: { minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' },
  selectionBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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
  headerAction: { minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, paddingHorizontal: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  headerActionDimmed: { opacity: 0.4 },
  // Filtre Çipleri
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.selectedSurface,
    borderColor: colors.secondary,
  },
  filterChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  // Tarih grubu kapsayıcı
  groupContainer: {
    gap: spacing.inlineGap,
  },
  // Stitch tarzı bölüm başlığı: etiket + çizgi
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.outline,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  list: {
    gap: spacing.inlineGap,
  },
  // Ürün kartı: saf beyaz, 16px köşe, hafif gölge, 14px iç boşluk
  card: {
    ...elevation.level1Card,
    gap: 6,
    padding: 14,
    borderRadius: radius.xl, // 16px
  },
  cardPressed: {
    backgroundColor: colors.selectedSurface,
  },
  productName: {
    ...typography.bodyMd,
    fontFamily: typography.action.fontFamily,
    color: colors.onSurface, // #191c1d
    flex: 1,
  },
  brand: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant, // #414846
  },
  timestamp: {
    ...typography.labelMd,
    marginTop: 4,
    color: colors.onSurfaceVariant, // #414846
  },
  // Fotoğraf analizi kart içeriği
  photoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoCardThumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  photoCardIconPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardDetails: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // Boş durum kartı
  emptyCard: {
    ...elevation.level1Card,
    gap: spacing.inlineGap,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  emptyIcon: { alignSelf: 'flex-start', padding: 10, backgroundColor: colors.selectedSurface, borderRadius: radius.lg },
  retryButton: { alignSelf: 'flex-start', minHeight: spacing.touchTarget, paddingHorizontal: 16, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primary },
  retryPressed: { backgroundColor: colors.primaryContainer },
  retryText: { ...typography.action, color: colors.onPrimary },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface, // #191c1d
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
  },
});
