import axios, { isAxiosError } from 'axios';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/theme/theme';


if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error(
    '[Verinaliz] EXPO_PUBLIC_API_URL ortam değişkeni tanımlı değil. ' +
    '.env.local dosyasını oluşturup değeri girin.',
  );
}
const PRODUCT_SUBMISSIONS_API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/product-submissions`;


const ALLERGEN_OPTIONS = [
  'Gluten',
  'Süt / Laktoz',
  'Soya',
  'Fındık / Fıstık',
  'Yumurta',
  'Susam',
  'Balık',
  'Kereviz',
  'Hardal',
  'Kükürt Dioksit',
  'Kabuklular',
] as const;

type NutritionState = {
  calories: string;
  fat: string;
  saturated_fat: string;
  carbs: string;
  sugar: string;
  fiber: string;
  protein: string;
  salt: string;
};

const INITIAL_NUTRITION: NutritionState = {
  calories: '',
  fat: '',
  saturated_fat: '',
  carbs: '',
  sugar: '',
  fiber: '',
  protein: '',
  salt: '',
};

type ProductSubmissionFormProps = {
  barcode: string;
  visible: boolean;
  onClose: () => void;
};

function getSubmissionErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error
      ?? 'Bildirim gönderilemedi. Lütfen tekrar deneyin.';
  }

  return 'Bildirim gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
}

function parseNutrientValue(value: string): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const normalized = value.trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductSubmissionForm({ barcode, visible, onClose }: ProductSubmissionFormProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [nutrition, setNutrition] = useState<NutritionState>(INITIAL_NUTRITION);
  const [ingredientsText, setIngredientsText] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  function resetForm() {
    setName('');
    setBrand('');
    setNutrition(INITIAL_NUTRITION);
    setIngredientsText('');
    setSelectedAllergens([]);
  }

  function closeForm() {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }

  function updateNutritionField(field: keyof NutritionState, text: string) {
    // Sadece rakam, nokta ve virgül girişine izin ver
    const sanitized = text.replace(/[^0-9.,]/g, '');
    setNutrition((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  }

  function toggleAllergen(allergen: string) {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((item) => item !== allergen) : [...prev, allergen],
    );
  }

  async function submitProduct() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Eksik bilgi', 'Lütfen ürün adını giriniz.');
      return;
    }

    if (!barcode) {
      Alert.alert('Bildirim gönderilemedi', 'Geçerli bir barkod bulunamadı.');
      return;
    }

    const payload = {
      barcode,
      name: trimmedName,
      brand: brand.trim() || null,
      nutrition: {
        calories: parseNutrientValue(nutrition.calories),
        fat: parseNutrientValue(nutrition.fat),
        saturated_fat: parseNutrientValue(nutrition.saturated_fat),
        carbs: parseNutrientValue(nutrition.carbs),
        sugar: parseNutrientValue(nutrition.sugar),
        fiber: parseNutrientValue(nutrition.fiber),
        protein: parseNutrientValue(nutrition.protein),
        salt: parseNutrientValue(nutrition.salt),
      },
      ingredients_text: ingredientsText.trim() || null,
      allergens: selectedAllergens,
    };

    setIsSubmitting(true);

    try {
      const response = await axios.post(PRODUCT_SUBMISSIONS_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Beklenmeyen yanıt kodu: ${response.status}`);
      }

      resetForm();
      onClose();
      Alert.alert(
        'Teşekkürler!',
        'Ürün bildirimi başarıyla iletildi. İncelendikten sonra sisteme eklenecektir.',
      );
    } catch (error) {
      Alert.alert('Bildirim gönderilemedi', getSubmissionErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeForm}
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Eksik Ürünü Bildir</Text>
              <Text style={styles.description}>
                Ürün bilgilerini girerek veritabanımıza katkıda bulunun.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Formu kapat"
              disabled={isSubmitting}
              hitSlop={10}
              onPress={closeForm}
              style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {/* Barcode Pill */}
          {barcode ? (
            <View style={styles.barcodeBadge}>
              <Text style={styles.barcodeLabel}>Barkod:</Text>
              <Text style={styles.barcodeValue}>{barcode}</Text>
            </View>
          ) : null}

          {/* Form Scroll Area */}
          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}>

              {/* Bölüm 1: Temel Bilgiler */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>1. Temel Bilgiler</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Ürün Adı <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    editable={!isSubmitting}
                    placeholder="Örn: Sütlü Çikolata, Yulaf Ezmesi"
                    placeholderTextColor={colors.outline}
                    returnKeyType="next"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Marka</Text>
                  <TextInput
                    editable={!isSubmitting}
                    placeholder="Örn: Ülker, Eti, Sütaş (opsiyonel)"
                    placeholderTextColor={colors.outline}
                    returnKeyType="next"
                    style={styles.input}
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>
              </View>

              {/* Bölüm 2: Besin Değerleri (100g / 100ml için) */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>2. Besin Değerleri (100g / 100ml)</Text>
                <Text style={styles.sectionHint}>
                  Paket üzerindeki besin tablosundaki değerleri giriniz (opsiyonel).
                </Text>

                <View style={styles.nutritionGrid}>
                  {/* Kalori */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Kalori / Enerji</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.calories}
                        onChangeText={(t) => updateNutritionField('calories', t)}
                      />
                      <Text style={styles.nutritionUnit}>kcal</Text>
                    </View>
                  </View>

                  {/* Toplam Yağ */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Toplam Yağ</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.fat}
                        onChangeText={(t) => updateNutritionField('fat', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Doymuş Yağ */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Doymuş Yağ</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.saturated_fat}
                        onChangeText={(t) => updateNutritionField('saturated_fat', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Karbonhidrat */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Karbonhidrat</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.carbs}
                        onChangeText={(t) => updateNutritionField('carbs', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Şeker */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Şeker</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.sugar}
                        onChangeText={(t) => updateNutritionField('sugar', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Lif */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Lif</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.fiber}
                        onChangeText={(t) => updateNutritionField('fiber', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Protein */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.protein}
                        onChangeText={(t) => updateNutritionField('protein', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Tuz */}
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Tuz</Text>
                    <View style={styles.nutritionInputWrapper}>
                      <TextInput
                        editable={!isSubmitting}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={colors.outline}
                        style={styles.nutritionInput}
                        value={nutrition.salt}
                        onChangeText={(t) => updateNutritionField('salt', t)}
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bölüm 3: İçindekiler Listesi */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>3. İçindekiler Listesi</Text>
                <Text style={styles.sectionHint}>
                  Paket arkasındaki içindekiler metnini yazabilirsiniz (opsiyonel).
                </Text>
                <TextInput
                  editable={!isSubmitting}
                  multiline
                  numberOfLines={4}
                  placeholder="Örn: Buğday unu, şeker, bitkisel yağ (palm), kakao kitlesi, tam yağlı süt tozu, emülgatör (soya lesitini)..."
                  placeholderTextColor={colors.outline}
                  style={styles.textArea}
                  textAlignVertical="top"
                  value={ingredientsText}
                  onChangeText={setIngredientsText}
                />
              </View>

              {/* Bölüm 4: Alerjenler */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>4. Alerjenler</Text>
                <Text style={styles.sectionHint}>
                  Varsa ürünün içerdiği veya iz miktarda bulunabilecek alerjenleri seçin (opsiyonel).
                </Text>
                <View style={styles.allergenChipsContainer}>
                  {ALLERGEN_OPTIONS.map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen);
                    return (
                      <Pressable
                        key={allergen}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        disabled={isSubmitting}
                        onPress={() => toggleAllergen(allergen)}
                        style={({ pressed }) => [
                          styles.allergenChip,
                          isSelected && styles.allergenChipSelected,
                          pressed && styles.buttonPressed,
                        ]}>
                        <Text
                          style={[
                            styles.allergenChipText,
                            isSelected && styles.allergenChipTextSelected,
                          ]}>
                          {isSelected ? `✓ ${allergen}` : allergen}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Actions Footer */}
            <View style={styles.footer}>
              {!name.trim() ? (
                <Text style={styles.validationNotice}>* Ürün adı zorunludur.</Text>
              ) : null}
              <View style={styles.actionButtons}>
                <Pressable
                  disabled={isSubmitting}
                  onPress={closeForm}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </Pressable>
                <Pressable
                  disabled={!canSubmit}
                  onPress={() => void submitProduct()}
                  style={({ pressed }) => [
                    styles.submitButton,
                    !canSubmit && styles.buttonDisabled,
                    pressed && canSubmit && styles.buttonPressed,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Ürünü Gönder</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.mobileMargin,
  },
  card: {
    ...elevation.level1Card,
    width: '100%',
    maxWidth: 540,
    height: '88%',
    maxHeight: 760,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  formScrollView: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardInternal,
    paddingTop: spacing.cardInternal,
    paddingBottom: 8,
    gap: spacing.inlineGap,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 30,
    color: colors.onSurfaceVariant,
    fontWeight: '300',
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing.cardInternal,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    gap: 6,
  },
  barcodeLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  barcodeValue: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  formScrollContent: {
    paddingHorizontal: spacing.cardInternal,
    paddingTop: 8,
    paddingBottom: spacing.stackGap * 2,
    gap: spacing.stackGap,
  },
  sectionCard: {
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    gap: 12,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: -6,
  },
  field: {
    gap: 6,
  },
  label: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  requiredStar: {
    color: colors.error,
  },
  input: {
    ...typography.bodyMd,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  nutritionItem: {
    width: '48%',
    gap: 4,
  },
  nutritionLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    fontSize: 13,
  },
  nutritionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  nutritionInput: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.onSurface,
    paddingVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  nutritionUnit: {
    ...typography.bodySm,
    color: colors.outline,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  textArea: {
    ...typography.bodyMd,
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: 10,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
  },
  allergenChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  allergenChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allergenChipText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  allergenChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.cardInternal,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    backgroundColor: colors.surfaceContainerLowest,
    gap: 8,
  },
  validationNotice: {
    ...typography.labelSm,
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  cancelButtonText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  submitButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
