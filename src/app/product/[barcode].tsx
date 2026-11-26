import { Entypo, Feather, MaterialIcons } from '@expo/vector-icons';
import axios, { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentSources } from '@/components/assessment-sources';
import { MotionReveal } from '@/components/motion-reveal';
import { ContentSkeleton } from '@/components/content-skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ScreenHeader } from '@/components/screen-header';
import { ProductScores } from '@/components/product-scores';
import { IngredientAnalysisModal } from '@/components/ingredient-analysis-modal';
import { getAdditiveRiskBadge, type AdditiveRisk, riskLabels } from '@/constants/riskLabels';
import { colors, elevation, radius, spacing, typography } from '@/theme/theme';
import { parseIngredientDescription } from '@/utils/ingredientFormat';
import { isFavorite, toggleFavorite } from '@/utils/favorites';
import { addScanToHistory } from '@/utils/scanHistory';

type RiskLevel = 'high' | 'medium' | 'safe' | null;

type Additive = {
  code: string;
  name: string | null;
  category: string | null;
  description: string | null;
  risk: AdditiveRisk | null;
};

type FlaggedSeverity = 'high' | 'medium' | null;

type FlaggedIngredient = {
  name: string;
  category?: string | null;
  description: string | null;
  severity: FlaggedSeverity;
};

type RawFlaggedIngredient =
  | string
  | {
      name?: string | null;
      label?: string | null;
      ingredient?: string | null;
      category?: string | null;
      description?: string | null;
      reason?: string | null;
      severity?: string | null;
      risk?: string | null;
    };

type Product = {
  barcode: string;
  product_type?: 'food' | 'cosmetic';
  data_source?: 'openfoodfacts' | 'openbeautyfacts';
  nutriscore_grade?: string | null;
  nova_group?: number | null;
  name: string | null;
  brand: string | null;
  image_url?: string | null;
  nutrition: {
    calories: number | null;
    carbs: number | null;
    sugar: number | null;
    fiber: number | null;
    protein: number | null;
    fat: number | null;
    salt: number | null;
  };
  additives: (Additive | string)[];
  allergens: string[];
  flagged_ingredients?: RawFlaggedIngredient[] | null;
  ingredients_text?: string | null;
};

type NutritionItem = {
  key: keyof Product['nutrition'];
  label: string;
  unit: string;
};


if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error(
    '[Verinaliz] EXPO_PUBLIC_API_URL ortam değişkeni tanımlı değil. ' +
    '.env.local dosyasını oluşturup değeri girin.',
  );
}
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const PRODUCT_API_URL = `${API_BASE_URL}/api/product`;
const nutritionItems: NutritionItem[] = [
  { key: 'calories', label: 'Kalori', unit: 'kcal' },
  { key: 'carbs', label: 'Karbonhidrat', unit: 'g' },
  { key: 'sugar', label: 'Şeker', unit: 'g' },
  { key: 'fiber', label: 'Lif', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'fat', label: 'Yağ', unit: 'g' },
  { key: 'salt', label: 'Tuz', unit: 'g' },
];

const displayValue = (value: number | null, unit: string) =>
  value === null ? '-' : `${value.toFixed(1)} ${unit}`;

function formatAdditiveCode(code: string) {
  return code.trim().replace(/^[a-z]{2,3}:/i, '').replace(/^e/i, 'E');
}

function normalizeAdditive(additive: Additive | string): Additive {
  if (typeof additive !== 'string') {
    return additive;
  }

  const code = formatAdditiveCode(additive);

  return {
    code,
    name: code,
    category: null,
    description: null,
    risk: null,
  };
}

function normalizeSeverity(value: string | null | undefined): FlaggedSeverity {
  switch (value?.toLowerCase()) {
    case 'high':
    case 'dangerous':
    case 'yuksek':
    case 'yüksek':
      return 'high';
    case 'medium':
    case 'moderate':
    case 'controversial':
    case 'orta':
      return 'medium';
    default:
      return null;
  }
}

function normalizeFlaggedIngredient(raw: RawFlaggedIngredient): FlaggedIngredient | null {
  if (typeof raw === 'string') {
    const name = raw.trim();
    return name ? { name, description: null, severity: null } : null;
  }

  const name = (raw.name ?? raw.label ?? raw.ingredient ?? '').trim();

  if (!name) {
    return null;
  }

  return {
    name,
    category: raw.category ?? null,
    description: raw.description ?? raw.reason ?? null,
    severity: normalizeSeverity(raw.severity ?? raw.risk),
  };
}

function getOverallRiskLevel(additives: (Additive | string)[]): RiskLevel {
  const risks = additives
    .filter((additive): additive is Additive => typeof additive !== 'string')
    .map((additive) => additive.risk);

  if (risks.includes('dangerous')) return 'high';
  if (risks.includes('controversial')) return 'medium';
  if (risks.includes('safe')) return 'safe';
  return null;
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ barcode?: string | string[] }>();
  const barcode = Array.isArray(params.barcode) ? params.barcode[0] : params.barcode;
  const [product, setProduct] = useState<Product | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(barcode));
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(barcode ? null : 'Geçersiz barkod');
  const [isFav, setIsFav] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { width, fontScale } = useWindowDimensions();
  const useSingleColumn = width < 350 || fontScale >= 1.5;
  const reducedMotion = useReducedMotion();
  const [favoriteScale] = useState(() => new Animated.Value(1));
  const favoritePending = useRef(false);
  useEffect(() => {
    if (reducedMotion) { favoriteScale.stopAnimation(); favoriteScale.setValue(1); }
    return () => favoriteScale.stopAnimation();
  }, [favoriteScale, reducedMotion]);

  async function handleToggleFavorite() {
    if (!product || favoritePending.current) {
      return;
    }
    favoritePending.current = true;
    if (!reducedMotion) {
      favoriteScale.stopAnimation();
      favoriteScale.setValue(1);
      Animated.sequence([
        Animated.timing(favoriteScale, { toValue: 1.22, duration: 110, useNativeDriver: true }),
        Animated.spring(favoriteScale, { toValue: 1, speed: 24, bounciness: 5, useNativeDriver: true }),
      ]).start();
    }

    const previousFav = isFav;
    const nextFav = !previousFav;
    setIsFav(nextFav);

    try {
      const result = await toggleFavorite({
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        riskLevel: getOverallRiskLevel(product.additives),
      });
      setIsFav(result);
    } catch (error) {
      console.error('Favori güncellenemedi:', error);
      setIsFav(previousFav);
    } finally {
      favoritePending.current = false;
    }
  }

  useEffect(() => {
    if (!barcode) {
      return;
    }

    let isMounted = true;

    async function checkFavorite() {
      try {
        const fav = await isFavorite(barcode);
        if (isMounted) {
          setIsFav(fav);
        }
      } catch (error) {
        console.error('Favori durumu alınamadı:', error);
      }
    }

    void checkFavorite();

    return () => {
      isMounted = false;
    };
  }, [barcode]);

  // Barkod format doğrulaması (EAN-8, EAN-13, UPC-A, UPC-E) — backend ile eşleştirildi
  const BARCODE_REGEX = /^\d{8,14}$/;
  const isBarcodeValid = !barcode || BARCODE_REGEX.test(barcode);

  useEffect(() => {
    if (!barcode || !isBarcodeValid) {
      return;
    }

    const controller = new AbortController();
    const currentBarcode = barcode;

    async function loadProduct() {
      setIsLoading(true);
      setIsNotFound(false);
      setErrorMessage(null);
      setProduct(null);
      setImageError(false);

      const productUrl = `${PRODUCT_API_URL}/${encodeURIComponent(currentBarcode)}`;

      try {
        const response = await axios.get<Product>(productUrl, {
          signal: controller.signal,
          timeout: 8000,
        });

        const productData = response.data;
        setProduct(productData);
        void addScanToHistory({
          ...productData,
          imageUrl: productData.image_url,
          riskLevel: getOverallRiskLevel(productData.additives),
        }).catch((error) => {
          console.error('Tarama geçmişi kaydedilemedi:', error);
        });

      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (isAxiosError(error) && error.response?.status === 404) {
          setIsNotFound(true);
        } else {
          console.error('Ürün bilgisi alınamadı:', error);
          setErrorMessage('Bağlantınızı kontrol edip tekrar deneyin.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [barcode, isBarcodeValid, retryKey]);


  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');
  const pageHeader = <ScreenHeader title="Ürün detayı" navigation="back" onNavigate={goBack} />;

  if (isLoading && isBarcodeValid) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {pageHeader}
        <ScrollView style={styles.body} contentContainerStyle={styles.content}>
          <ContentSkeleton product label="Ürün bilgileri yükleniyor…" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isNotFound) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {pageHeader}
        <ScrollView style={styles.body} contentContainerStyle={styles.stateScreen}>
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}><Feather name="search" size={24} color={colors.primary} /></View>
            <Text accessibilityRole="header" style={styles.stateTitle}>Barkod kaydı bulunamadı</Text>
            <Text style={styles.stateDescription}>
              {'Open Food Facts / Open Beauty Facts veritabanları Türkiye pazarındaki gıda ve kozmetik ürünleri için sıklıkla eksik veya güncel değildir. Etiketi AI Analizi ile okuyabilirsiniz; sonuçları fiziki ambalajla karşılaştırın.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.analyzeIngredientsButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsAnalysisModalVisible(true)}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.onPrimary} />
              <Text style={styles.analyzeIngredientsButtonText}>
                Etiketi analiz et
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <IngredientAnalysisModal
          visible={isAnalysisModalVisible}
          onClose={() => setIsAnalysisModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  if (errorMessage || !product || !isBarcodeValid) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {pageHeader}
        <ScrollView style={styles.body} contentContainerStyle={styles.stateScreen}>
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}><Feather name="alert-circle" size={24} color={colors.primary} /></View>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              {!barcode || !isBarcodeValid ? 'Geçersiz barkod' : 'Ürün bilgisi alınamadı'}
            </Text>
            <Text accessibilityRole="alert" style={styles.stateDescription}>
              {!barcode || !isBarcodeValid ? 'Ürünün barkodunu yeniden tarayın.' : (errorMessage ?? 'Lütfen tekrar deneyin.')}
            </Text>
            {barcode && isBarcodeValid && (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.analyzeIngredientsButton, pressed && styles.buttonPressed]}
                onPress={() => setRetryKey((value) => value + 1)}>
                <Text style={styles.analyzeIngredientsButtonText}>Tekrar dene</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isCosmetic =
    product.product_type === 'cosmetic' || product.data_source === 'openbeautyfacts';
  const flaggedIngredients = (product.flagged_ingredients ?? [])
    .map(normalizeFlaggedIngredient)
    .filter((item): item is FlaggedIngredient => item !== null);
  const ingredientsText = product.ingredients_text?.trim();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Ürün detayı"
        navigation="back"
        onNavigate={goBack}
        action={
          <Pressable
            accessibilityLabel={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            accessibilityRole="button"
            accessibilityState={{ selected: isFav }}
            onPress={() => void handleToggleFavorite()}
            style={({ pressed }) => [
              styles.favoriteButton,
              isFav && styles.favoriteButtonActive,
              pressed && styles.buttonPressed,
            ]}>
            <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
              <MaterialIcons
                name={isFav ? 'favorite' : 'favorite-border'}
                size={22}
                color={isFav ? colors.primary : colors.outline}
                allowFontScaling={false}
              />
            </Animated.View>
          </Pressable>
        }
      />
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <MotionReveal key={product.barcode} style={[styles.header, useSingleColumn && styles.headerStacked]}>
          {product.image_url && !imageError ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.productImageFallback}>
              <Feather name="box" size={25} color={colors.outline} allowFontScaling={false} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <View style={styles.productBadges}>
              <Text style={styles.categoryBadge}>{isCosmetic ? 'Kozmetik' : 'Gıda'}</Text>
              {product.data_source && <Text style={styles.sourceBadge}>
                {product.data_source === 'openfoodfacts' ? 'Open Food Facts' : 'Open Beauty Facts'}
              </Text>}
            </View>
            <Text accessibilityRole="header" style={styles.productName}>{product.name ?? 'Adsız ürün'}</Text>
            <Text style={styles.brand}>{product.brand ?? 'Marka bilgisi yok'}</Text>
            <Text selectable style={styles.barcodeLabel}>Barkod · {product.barcode}</Text>
          </View>
        </MotionReveal>

        <MotionReveal key={`${product.barcode}-sections`} delay={80} style={styles.resultSections}>
          <View style={[styles.section, styles.allergenCard, product.allergens.length > 0 && styles.allergenCardWarning]}>
            <View style={styles.allergenHeading}>
              <Feather name={product.allergens.length > 0 ? 'alert-triangle' : 'info'} size={19} color={product.allergens.length > 0 ? colors.risk.high : colors.primary} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>Alerjenler</Text>
            </View>
            {product.allergens.length > 0 ? (
              <View style={styles.allergenList}>
                {product.allergens.map((allergen) => (
                  <View key={allergen} style={styles.allergenChip}>
                    <Text style={styles.allergenChipText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {'Veritabanında alerjen kaydı bulunmuyor — bu ürünün alerjen içermediği anlamına gelmez. Fiziki ambalajı mutlaka kontrol edin veya AI Etiket Analizi kullanın.'}
              </Text>
            )}
          </View>

          {!isCosmetic && product.data_source === 'openfoodfacts' && (
            <ProductScores grade={product.nutriscore_grade} nova={product.nova_group} />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {isCosmetic ? 'Dikkat Çeken Kozmetik Bileşenler' : 'Dikkat Çeken İçerikler'}
              </Text>
              {flaggedIngredients.length > 0 ? (
                <Text style={styles.countChip}>{flaggedIngredients.length}</Text>
              ) : null}
            </View>

            {flaggedIngredients.length > 0 ? (
              <View style={styles.flaggedList}>
                {flaggedIngredients.map((item) => {
                  const { category: role, description: cleanDesc } = parseIngredientDescription(
                    item.description,
                    item.category,
                  );

                  return (
                    <View
                      key={item.name}
                      style={styles.flaggedCard}>
                      <Text style={styles.flaggedChipText}>{item.name}</Text>
                      {item.severity && (
                        <View style={[styles.riskBadge, { backgroundColor: colors.riskSurface[item.severity] }]}>
                          <Text style={[styles.riskBadgeText, { color: colors.risk[item.severity] }]}>
                            {item.severity === 'high' ? riskLabels.dangerous : riskLabels.controversial}
                          </Text>
                        </View>
                      )}
                      {role ? (
                        <View style={styles.flaggedRoleBadge}>
                          <Text style={styles.flaggedRoleLabel}>İşlev: </Text>
                          <Text style={styles.flaggedRoleValue}>{role}</Text>
                        </View>
                      ) : null}
                      {cleanDesc ? (
                        <Text style={styles.flaggedDescription}>{cleanDesc}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {isCosmetic
                    ? 'Barkod kaydında dikkat çeken kozmetik bileşen tespit edilmedi (İçindekiler metni eksik olabilir; AI analizi önerilir)'
                    : 'Barkod kaydında dikkat edilmesi gereken içerik tespit edilmedi (Veri eksikliğine karşı AI analizi önerilir)'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {'İçindekiler'}
            </Text>
            <View style={styles.ingredientsCard}>
              {ingredientsText ? (
                <Text style={styles.ingredientsText}>{ingredientsText}</Text>
              ) : (
                <Text style={styles.emptyText}>
                  {'Veritabanında içindekiler metni bulunmuyor. Ürünün etiketini AI Analizi ile fotoğraflayarak tüm bileşenleri inceleyebilirsiniz.'}
                </Text>
              )}
            </View>
          </View>

          {!isCosmetic && (
            <View style={styles.section}>
              <View style={styles.nutritionHeading}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{'Besin Değerleri'}</Text>
                <Text style={styles.nutritionUnitLabel}>{"(100g'da)"}</Text>
              </View>
              <View style={styles.nutritionGrid}>
                {nutritionItems.map(({ key, label, unit }) => (
                  <View key={key} style={[styles.nutritionCard, useSingleColumn && styles.nutritionCardFull]}>
                    <Text style={styles.nutritionLabel}>{label}</Text>
                    <Text style={styles.nutritionValue}>
                      {displayValue(product.nutrition[key], unit)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {isCosmetic ? 'Kozmetik Bileşen & Katkı Kayıtları' : 'Katkı Maddeleri'}
              </Text>
              <Text style={styles.countChip}>{product.additives.length}</Text>
            </View>

            {product.additives.length > 0 ? (
              <View style={styles.additivesList}>
                {product.additives.map((rawAdditive) => {
                  const additive = normalizeAdditive(rawAdditive);
                  const riskBadge = getAdditiveRiskBadge(additive.risk);

                  return (
                    <View
                      key={additive.code}
                      style={styles.additiveCard}>
                      <View style={styles.additiveTopRow}>
                        <Text style={styles.codeChip}>{additive.code}</Text>
                        {riskBadge ? (
                          <View
                            style={[
                              styles.riskBadge,
                              { backgroundColor: riskBadge.bg },
                            ]}>
                            <Text style={[styles.riskBadgeText, { color: riskBadge.color }]}>
                              {riskBadge.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.additiveName}>{additive.name ?? additive.code}</Text>
                      <Text style={styles.additiveCategory}>
                        {additive.category ?? 'Kategori bilgisi yok'}
                      </Text>
                      {additive.description ? (
                        <Text style={styles.additiveDescription}>{additive.description}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {isCosmetic ? 'Kayıtlı kozmetik katkı/bileşen bilgisi yok' : 'Katkı maddesi bilgisi yok'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.disclaimerBox}>
            <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
            <Text style={styles.disclaimerText}>
              Barkod aramalarında veritabanı kaynaklı eksik veya yanlış bilgiler gelebilir. Etiketi AI Analiz ile okuyabilirsiniz; AI da hata yapabilir, fiziki ambalajı kontrol edin.
            </Text>
          </View>

          <View style={styles.disclaimerBox}>
            <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
            <Text style={styles.disclaimerText}>
              {'Bilgilendirme: Üreticiler ürün içerik ve formülasyonlarını dönemsel olarak değiştirebilir. Açık kaynaklı veritabanındaki olası gecikmeler ve Türkiye pazarındaki veri eksiklikleri sebebiyle her zaman fiziki ürünün üzerindeki son etiket bilgisi esastır.'}
            </Text>
          </View>

          <AssessmentSources />

          <View style={styles.attributionBox}>
            <Text style={styles.attributionText}>
              {'Ürün verileri '}
              <Text accessibilityRole="link" style={styles.attributionLink} onPress={() => {
                const host = product.data_source === 'openbeautyfacts' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';
                void Linking.openURL(`https://${host}/product/${encodeURIComponent(product.barcode)}`).catch(() => Alert.alert('Bağlantı açılamadı'));
              }}>
                {product.data_source === 'openbeautyfacts' ? 'Open Beauty Facts' : 'Open Food Facts'}
              </Text>
              {' açık veritabanından alınmaktadır (Open Database License — ODbL).'}
            </Text>
            <Text accessibilityRole="link" style={styles.attributionLink} onPress={() => {
              void Linking.openURL('https://opendatacommons.org/licenses/odbl/1-0/').catch(() => Alert.alert('Bağlantı açılamadı'));
            }}>ODbL 1.0 lisansı ve yeniden kullanım koşulları ↗</Text>
          </View>

        </MotionReveal>
      </ScrollView>

      <IngredientAnalysisModal
        visible={isAnalysisModalVisible}
        onClose={() => setIsAnalysisModalVisible(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.headerSurface,
  },
  body: { flex: 1, backgroundColor: colors.background },
  stateScreen: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.inlineGap,
    padding: spacing.cardInternal,
    backgroundColor: colors.background,
  },
  stateCard: {
    ...elevation.level1Card,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.stackGap,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  stateIcon: { padding: 14, borderRadius: radius.xl, backgroundColor: colors.selectedSurface },
  stateTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  stateDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  analyzeIngredientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: spacing.touchTarget,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  analyzeIngredientsButtonText: {
    ...typography.action,
    flexShrink: 1,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 680,
    gap: spacing.stackGap + 8,
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: spacing.containerPadding,
    paddingBottom: 48,
  },
  resultSections: { gap: spacing.stackGap + 8 },
  header: {
    ...elevation.level1Card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.xl,
    gap: 16,
  },
  headerStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  productImage: {
    width: 76,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  productImageFallback: {
    width: 76,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flexShrink: 1, minWidth: 0, gap: 4 },
  productBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  categoryBadge: {
    ...typography.labelMd,
    color: colors.primary,
    backgroundColor: colors.selectedSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sourceBadge: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barcodeLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  favoriteButton: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceContainerLowest,
  },
  favoriteButtonActive: { borderColor: colors.secondary, backgroundColor: colors.selectedSurface },
  buttonPressed: {
    opacity: 0.7,
  },
  productName: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
  },
  brand: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  section: {
    gap: spacing.inlineGap,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.headlineSm,
    flexShrink: 1,
    color: colors.onSurface,
  },
  nutritionHeading: {
    gap: 2,
  },
  nutritionUnitLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  countChip: {
    ...typography.labelSm,
    minWidth: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: 'hidden',
    textAlign: 'center',
    color: colors.secondary,
    backgroundColor: colors.selectedSurface,
    borderRadius: radius.full,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.inlineGap,
  },
  nutritionCard: {
    ...elevation.level1Card,
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
    gap: 6,
    minHeight: 94,
    justifyContent: 'center',
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  nutritionCardFull: { flexBasis: '100%' },
  nutritionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  nutritionValue: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  flaggedList: {
    gap: spacing.inlineGap,
  },
  flaggedCard: {
    ...elevation.level1Card,
    gap: 8,
    padding: 16,
    borderRadius: radius.xl,
  },
  flaggedChipText: { ...typography.action, color: colors.onSurface },
  flaggedRoleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    marginTop: 2,
    marginBottom: 2,
  },
  flaggedRoleLabel: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  flaggedRoleValue: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  flaggedDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  ingredientsCard: {
    ...elevation.level1Card,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  ingredientsText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 26,
  },
  additivesList: {
    gap: spacing.inlineGap,
  },
  additiveCard: {
    ...elevation.level1Card,
    gap: 8,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  additiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  // E-kodu çipi: açık nane zemin, orman yeşili metin
  codeChip: {
    ...typography.labelMd,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    color: colors.secondary,
    backgroundColor: colors.selectedSurface,
    borderRadius: radius.full,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  riskBadgeText: {
    ...typography.labelSm,
  },
  additiveName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  additiveCategory: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  additiveDescription: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  emptyCard: {
    ...elevation.level1Card,
    padding: spacing.cardInternal,
    borderRadius: radius.xl,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  allergenCard: { padding: 16, borderRadius: radius.xl, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.divider },
  allergenCardWarning: { backgroundColor: colors.riskSurface.high, borderColor: colors.errorContainer },
  allergenHeading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  allergenList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    maxWidth: '100%',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceContainerLowest,
  },
  allergenChipText: { ...typography.action, color: colors.onErrorContainer },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimerText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  // Open Food Facts ODbL kaynak atfı
  attributionBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  attributionText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  attributionLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  // "Bu bilgi yanlış mı?" butonu: beyaz zemin, outline kenarlık
  trMarketBannerCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftColor: colors.primary,
    padding: spacing.cardInternal,
    gap: 8,
  },
  trMarketBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trMarketBannerTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  trMarketBannerText: {
    ...typography.bodySm,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
