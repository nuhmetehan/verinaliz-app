import { Entypo, MaterialIcons } from '@expo/vector-icons';
import axios, { isAxiosError } from 'axios';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SymbolView } from 'expo-symbols';
import { AssessmentSources } from '@/components/assessment-sources';
import { MotionReveal } from '@/components/motion-reveal';
import { ProductLoadingSkeleton } from '@/components/content-skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ProductScores } from '@/components/product-scores';
import { IngredientAnalysisModal } from '@/components/ingredient-analysis-modal';
import { ProductSubmissionForm } from '@/components/product-submission-form';
import { type AdditiveRisk, riskLabels } from '@/constants/riskLabels';
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
const REPORT_API_URL = `${API_BASE_URL}/api/reports`;


type ReportField = 'ingredients' | 'nutrition' | 'additives' | 'allergens' | null;

const reportFieldOptions: { label: string; value: ReportField }[] = [
  { label: 'İçerik Bilgisi', value: 'ingredients' },
  { label: 'Besin Değeri', value: 'nutrition' },
  { label: 'Katkı Maddesi', value: 'additives' },
  { label: 'Alerjen', value: 'allergens' },
  { label: 'Genel', value: null },
];

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

function getFlaggedColor(severity: FlaggedSeverity) {
  return severity === 'high' ? colors.risk.high : colors.risk.medium;
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

function getRiskColor(risk: AdditiveRisk | null) {
  switch (risk) {
    case 'dangerous':
      return colors.risk.high;
    case 'controversial':
      return colors.risk.medium;
    case 'safe':
      return colors.risk.safe;
    default:
      return null;
  }
}

function getReportErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? 'Bildirim gönderilemedi. Lütfen tekrar deneyin.';
  }

  return 'Bildirim gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ barcode?: string | string[] }>();
  const barcode = Array.isArray(params.barcode) ? params.barcode[0] : params.barcode;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(barcode));
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(barcode ? null : 'Geçersiz barkod');
  const [isFav, setIsFav] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportField, setReportField] = useState<ReportField>('ingredients');
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSubmissionFormVisible, setIsSubmissionFormVisible] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  const reducedMotion = useReducedMotion();
  const [favoriteScale] = useState(() => new Animated.Value(1));
  const favoritePending = useRef(false);
  useEffect(() => {
    if (reducedMotion) { favoriteScale.stopAnimation(); favoriteScale.setValue(1); }
    return () => favoriteScale.stopAnimation();
  }, [favoriteScale, reducedMotion]);

  const reportBarcode = product?.barcode ?? barcode;

  function closeReportModal() {
    if (!isSubmittingReport) {
      setIsReportModalVisible(false);
    }
  }

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

  async function submitIncorrectReport() {
    if (!reportBarcode) {
      Alert.alert('Bildirim gönderilemedi', 'Geçerli bir barkod bulunamadı.');
      return;
    }

    setIsSubmittingReport(true);

    try {
      await axios.post(
        REPORT_API_URL,
        {
          barcode: reportBarcode,
          type: 'incorrect',
          field: reportField ?? undefined,
          comment: reportComment.trim(),
        },
        { timeout: 8000 },
      );
      setIsReportModalVisible(false);
      setReportComment('');
      setReportField('ingredients');
      Alert.alert('Teşekkürler', 'Bildiriminiz alındı, teşekkürler');
    } catch (error) {
      Alert.alert('Bildirim gönderilemedi', getReportErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  }

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
          setErrorMessage('Ürün bilgisi alınamadı. Lütfen tekrar deneyin.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [barcode, isBarcodeValid]);


  if (isLoading) {
    return <ProductLoadingSkeleton />;
  }

  if (isNotFound) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.stateScreen}>
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{'Barkod Kaydı Bulunamadı'}</Text>
            <Text style={styles.stateDescription}>
              {'Open Food Facts / Open Beauty Facts veritabanları Türkiye pazarındaki gıda ve kozmetik ürünleri için sıklıkla eksik veya güncel değildir. Etiketi AI Analizi ile okuyabilirsiniz; sonuçları fiziki ambalajla karşılaştırın.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.analyzeIngredientsButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsAnalysisModalVisible(true)}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.onPrimary} />
              <Text style={styles.analyzeIngredientsButtonText}>
                {'AI ile Etiketi Analiz Et (Önerilen)'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.contributionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsSubmissionFormVisible(true)}>
              <Text style={styles.contributionButtonText}>{'Eksik Ürünü Bildir'}</Text>
            </Pressable>
          </View>
        </View>

        <ProductSubmissionForm
          barcode={barcode ?? ''}
          visible={isSubmissionFormVisible}
          onClose={() => setIsSubmissionFormVisible(false)}
        />

        <IngredientAnalysisModal
          visible={isAnalysisModalVisible}
          onClose={() => setIsAnalysisModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  if (errorMessage || !product || !isBarcodeValid) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.stateTitle}>
          {!isBarcodeValid ? 'Geçersiz barkod formatı.' : (errorMessage ?? 'Ürün bilgisi alınamadı')}
        </Text>
      </View>
    );
  }

  const isCosmetic =
    product.product_type === 'cosmetic' || product.data_source === 'openbeautyfacts';
  const flaggedIngredients = (product.flagged_ingredients ?? [])
    .map(normalizeFlaggedIngredient)
    .filter((item): item is FlaggedIngredient => item !== null);
  const ingredientsText = product.ingredients_text?.trim();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotionReveal key={product.barcode} style={styles.header}>
          <View style={styles.headerRow}>
            {product.image_url && !imageError ? (
              <Image
                source={{ uri: product.image_url }}
                style={styles.productImage}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.productImageFallback}>
                <SymbolView
                  name={{
                    ios: 'cube.box',
                    android: 'inventory_2',
                    web: 'inventory_2',
                  }}
                  type="monochrome"
                  size={28}
                  tintColor={colors.outline}
                  fallback={<Text style={styles.productImageFallbackIcon}>📦</Text>}
                />
              </View>
            )}
            <Pressable
              accessibilityLabel={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              accessibilityRole="button"
              accessibilityState={{ selected: isFav }}
              hitSlop={8}
              onPress={() => void handleToggleFavorite()}
              style={({ pressed }) => [
                styles.favoriteButton,
                isFav && styles.favoriteButtonActive,
                pressed && styles.buttonPressed,
              ]}>
              <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
              <SymbolView
                name={{
                  ios: isFav ? 'heart.fill' : 'heart',
                  android: isFav ? 'favorite' : 'favorite_border',
                  web: isFav ? 'favorite' : 'favorite_border',
                }}
                type="monochrome"
                size={22}
                tintColor={isFav ? '#e53935' : colors.outline}
              />
              </Animated.View>
            </Pressable>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.productBadges}>
              <Text style={styles.categoryBadge}>{isCosmetic ? 'KOZMETİK' : 'GIDA'}</Text>
              {product.data_source && <Text style={styles.sourceBadge}>
                {product.data_source === 'openfoodfacts' ? 'Open Food Facts' : 'Open Beauty Facts'}
              </Text>}
            </View>
            <Text style={styles.productName}>{product.name ?? 'Adsız ürün'}</Text>
            <Text style={styles.brand}>{product.brand ?? 'Marka bilgisi yok'}</Text>
            <Text selectable style={styles.barcodeLabel}>Barkod · {product.barcode}</Text>
          </View>
        </MotionReveal>

        <MotionReveal key={`${product.barcode}-sections`} delay={80} style={styles.resultSections}>
        {/* Bilgilendirme Kartı */}
        <View style={styles.disclaimerBox}>
          <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            Barkod aramalarında veritabanı kaynaklı eksik veya yanlış bilgiler gelebilir. Etiketi AI Analiz ile okuyabilirsiniz; AI da hata yapabilir, fiziki ambalajı kontrol edin.
          </Text>
        </View>

        {!isCosmetic && product.data_source === 'openfoodfacts' && (
          <ProductScores grade={product.nutriscore_grade} nova={product.nova_group} />
        )}

        {!isCosmetic && (
          <View style={styles.section}>
            <View style={styles.nutritionHeading}>
              <Text style={styles.sectionTitle}>{'Besin Değerleri'}</Text>
              <Text style={styles.nutritionUnitLabel}>{"(100g'da)"}</Text>
            </View>
            <View style={styles.nutritionGrid}>
              {nutritionItems.map(({ key, label, unit }) => (
                <View key={key} style={styles.nutritionCard}>
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
            <Text style={styles.sectionTitle}>
              {isCosmetic ? 'Dikkat Çeken Kozmetik Bileşenler' : 'Dikkat Çeken İçerikler'}
            </Text>
            {flaggedIngredients.length > 0 ? (
              <Text style={styles.countChip}>{flaggedIngredients.length}</Text>
            ) : null}
          </View>

          {flaggedIngredients.length > 0 ? (
            <View style={styles.flaggedList}>
              {flaggedIngredients.map((item) => {
                const accent = getFlaggedColor(item.severity);
                const { category: role, description: cleanDesc } = parseIngredientDescription(
                  item.description,
                  item.category,
                );

                return (
                  <View
                    key={item.name}
                    style={[styles.flaggedCard, { borderLeftColor: accent }]}>
                    <View
                      style={[
                        styles.flaggedChip,
                        { borderColor: accent, backgroundColor: `${accent}1F` },
                      ]}>
                      <Text style={[styles.flaggedChipText, { color: accent }]}>{item.name}</Text>
                    </View>
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
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>
              {isCosmetic ? 'Kozmetik Bileşen & Katkı Kayıtları' : 'Katkı Maddeleri'}
            </Text>
            <Text style={styles.countChip}>{product.additives.length}</Text>
          </View>

          {product.additives.length > 0 ? (
            <View style={styles.additivesList}>
              {product.additives.map((rawAdditive) => {
                const additive = normalizeAdditive(rawAdditive);
                const riskColor = getRiskColor(additive.risk);

                return (
                  <View
                    key={additive.code}
                    style={[styles.additiveCard, { borderLeftColor: riskColor ?? colors.outlineVariant }]}>
                    <View style={styles.additiveTopRow}>
                      <Text style={styles.codeChip}>{additive.code}</Text>
                      {riskColor && additive.risk ? (
                        <View
                          style={[
                            styles.riskBadge,
                            { borderColor: riskColor, backgroundColor: `${riskColor}1F` },
                          ]}>
                          <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                            {riskLabels[additive.risk]}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerjenler</Text>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bu ürün bilgisini hatalı olarak bildir"
          style={styles.reportButton}
          onPress={() => setIsReportModalVisible(true)}>
          <Text style={styles.reportButtonText}>{'Bu bilgi yanlış mı?'}</Text>
        </Pressable>
        </MotionReveal>
      </ScrollView>

      <IngredientAnalysisModal
        visible={isAnalysisModalVisible}
        onClose={() => setIsAnalysisModalVisible(false)}
      />

      <Modal
        transparent
        animationType="fade"
        visible={isReportModalVisible}
        onRequestClose={closeReportModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'Hatalı Verileri Bildir'}</Text>
              <Pressable
                accessibilityLabel="Bildirimi kapat"
                disabled={isSubmittingReport}
                hitSlop={10}
                onPress={closeReportModal}>
                <Text style={styles.modalClose}>{'\u00d7'}</Text>
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>{'Bir hata mı fark ettin? Yanlış olan kısmı ve doğru bilgiyi paylaş, kullanıcılar için düzeltelim.'}</Text>
            <View style={styles.reportFieldOptions}>
              {reportFieldOptions.map((option) => {
                const isSelected = option.value === reportField;

                return (
                  <Pressable
                    key={option.label}
                    style={[styles.reportFieldOption, isSelected && styles.reportFieldOptionSelected]}
                    disabled={isSubmittingReport}
                    onPress={() => setReportField(option.value)}>
                    <Text
                      style={[
                        styles.reportFieldOptionText,
                        isSelected && styles.reportFieldOptionTextSelected,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.commentLabel}>{'Buraya yanlış olan kısmı ve doğru verileri yazın.'}</Text>
            <TextInput
              multiline
              editable={!isSubmittingReport}
              maxLength={1000}
              placeholder="Düzeltilmesi gereken verileri yazın"
              placeholderTextColor={colors.outline}
              style={styles.commentInput}
              textAlignVertical="top"
              value={reportComment}
              onChangeText={setReportComment}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                disabled={isSubmittingReport}
                onPress={closeReportModal}>
                <Text style={styles.cancelButtonText}>{'İptal'}</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, isSubmittingReport && styles.buttonDisabled]}
                disabled={isSubmittingReport}
                onPress={() => void submitIncorrectReport()}>
                {isSubmittingReport ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.submitButtonText}>{'Gönder'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background, // #f8f9fa
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.inlineGap,
    padding: spacing.cardInternal,
    backgroundColor: colors.background,
  },
  stateCard: {
    ...elevation.level1Card,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.stackGap,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
  },
  stateTitle: {
    ...typography.headlineMd,
    color: colors.onSurface, // #191c1d
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  stateDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
    textAlign: 'center',
  },
  analyzeIngredientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.primary, // #01261f
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  analyzeIngredientsButtonIcon: {
    fontSize: 16,
  },
  analyzeIngredientsButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary, // #ffffff
    fontWeight: '700',
    textAlign: 'center',
  },
  contributionButton: {
    width: '100%',
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributionButtonText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    gap: spacing.stackGap + 8,
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: spacing.containerPadding,
    paddingBottom: 48,
  },
  resultSections: { gap: spacing.stackGap + 8 },
  header: {
    ...elevation.level1Card,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primary + '0D',
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.inlineGap,
  },
  productImage: {
    flex: 1,
    height: 148,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerLow,
  },
  productImageFallback: {
    flex: 1,
    height: 148,
    borderRadius: radius.xl,
    backgroundColor: colors.secondaryContainer + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageFallbackIcon: {
    fontSize: 28,
  },
  headerInfo: {
    gap: 8,
  },
  productBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  categoryBadge: {
    ...typography.labelMd,
    color: colors.primary,
    backgroundColor: colors.secondaryContainer,
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
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...elevation.level1Card,
  },
  favoriteButtonActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  eyebrow: {
    ...typography.labelMd,
    color: colors.primary, // #01261f
  },
  productName: {
    ...typography.headlineLgMobile,
    color: colors.onSurface, // #191c1d
  },
  brand: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
  },
  section: {
    gap: spacing.inlineGap,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.onSurface, // #191c1d
  },
  nutritionHeading: {
    gap: 2,
  },
  nutritionUnitLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    opacity: 0.8,
  },
  // Katkı sayı etiketi: açık nane zemin, orman yeşili metin
  countChip: {
    ...typography.labelSm,
    minWidth: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: 'hidden',
    textAlign: 'center',
    color: colors.secondary, // #416656
    backgroundColor: colors.secondaryContainer, // #c3ecd7
    borderRadius: radius.full,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.inlineGap,
  },
  // Besin kartı: saf beyaz (#ffffff), 24px köşe, hafif gölge
  nutritionCard: {
    ...elevation.level1Card,
    flexGrow: 1,
    flexBasis: '45%',
    gap: 6,
    minHeight: 94,
    justifyContent: 'center',
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
  },
  nutritionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant, // #414846
  },
  nutritionValue: {
    ...typography.headlineMd,
    color: colors.primary, // #01261f
  },
  flaggedList: {
    gap: spacing.inlineGap,
  },
  // Kritik içerik kartı: beyaz zemin, sol kenarda risk rengi şerit
  flaggedCard: {
    ...elevation.level1Card,
    gap: 8,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
    borderLeftWidth: 4,
  },
  // Kritik içerik çipi: risk rengi border + %12 opak zemin
  flaggedChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flaggedChipText: {
    ...typography.bodyMd,
    fontWeight: '700',
  },
  flaggedRoleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
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
    color: colors.onSurfaceVariant, // #414846
    lineHeight: 20,
  },
  // İçindekiler kartı: saf beyaz, 24px köşe
  ingredientsCard: {
    ...elevation.level1Card,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
  },
  ingredientsText: {
    ...typography.bodyMd,
    color: colors.onSurface, // #191c1d
    lineHeight: 26,
  },
  additivesList: {
    gap: spacing.inlineGap,
  },
  // Katkı maddesi kartı: saf beyaz, 24px köşe — risk rengi border ile gelir
  additiveCard: {
    ...elevation.level1Card,
    gap: 8,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
    borderLeftWidth: 4,
    borderLeftColor: colors.outlineVariant,
  },
  additiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.inlineGap,
  },
  // E-kodu çipi: açık nane zemin, orman yeşili metin
  codeChip: {
    ...typography.labelMd,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    color: colors.secondary, // #416656
    backgroundColor: colors.secondaryContainer, // #c3ecd7
    borderRadius: radius.full,
  },
  riskBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  riskBadgeText: {
    ...typography.labelSm,
  },
  additiveName: {
    ...typography.bodyLg,
    color: colors.onSurface, // #191c1d
    fontWeight: '600',
  },
  additiveCategory: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
  },
  additiveDescription: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  emptyCard: {
    ...elevation.level1Card,
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  allergenList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Alerjen çipi: çok açık nane (#f3f4f5) zemin, hafif yeşil-gri border, koyu metin
  allergenChip: {
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #c1c8c4
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surfaceContainerLow, // #f3f4f5
  },
  allergenChipText: {
    ...typography.bodyMd,
    color: colors.onSurface, // #191c1d
  },
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
  reportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #c1c8c4
    borderRadius: radius.full,
    paddingHorizontal: 18,
    backgroundColor: colors.surfaceContainerLowest, // #ffffff
  },
  reportButtonText: {
    ...typography.bodyMd,
    color: colors.onSurface, // #191c1d
    fontWeight: '700',
  },
  // Modal arka planı: siyah yarı saydam
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.mobileMargin,
    backgroundColor: '#00000066', // %40 opak — açık tema için daha hafif
  },
  // Modal kartı: saf beyaz, 24px köşe
  modalCard: {
    ...elevation.level1Card,
    gap: spacing.inlineGap,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: spacing.cardInternal,
    borderRadius: radius.xxl, // 24px
    backgroundColor: colors.surfaceContainerLowest, // #ffffff explicit
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.headlineMd,
    color: colors.onSurface, // #191c1d
  },
  modalClose: {
    fontSize: 30,
    lineHeight: 30,
    color: colors.onSurfaceVariant, // #414846
  },
  modalDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
  },
  reportFieldOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Alan seçim çipleri: açık zemin, seçili → orman yeşili dolu
  reportFieldOption: {
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #c1c8c4
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surfaceContainerLow, // #f3f4f5
  },
  reportFieldOptionSelected: {
    borderColor: colors.primary, // #01261f
    backgroundColor: colors.primary,
  },
  reportFieldOptionText: {
    ...typography.bodyMd,
    color: colors.onSurface, // #191c1d
    fontWeight: '600',
  },
  reportFieldOptionTextSelected: {
    color: colors.onPrimary, // #ffffff
  },
  commentLabel: {
    ...typography.bodyMd,
    color: colors.onSurface, // #191c1d
    fontWeight: '600',
  },
  // Yorum alanı: saf beyaz zemin, açık gri border
  commentInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #c1c8c4
    borderRadius: radius.md,
    padding: 12,
    color: colors.onSurface, // #191c1d
    backgroundColor: colors.surfaceContainerLowest, // #ffffff
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.inlineGap,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant, // #414846
    fontWeight: '700',
  },
  // Gönder butonu: Orman Yeşili (#01261f) dolu
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    minHeight: 44,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    backgroundColor: colors.primary, // #01261f
  },
  submitButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary, // #ffffff
    fontWeight: '700',
  },
  trMarketBannerCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftWidth: 4,
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
