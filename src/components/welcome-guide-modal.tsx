import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/theme/theme';

export const ONBOARDING_STORAGE_KEY = '@foodscan/has_seen_onboarding';

type WelcomeGuideModalProps = {
  visible: boolean;
  onClose: () => void;
};

type GuideStep = {
  tag: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    tag: 'ADIM 1 / 4',
    title: 'Barkod & Türkiye Pazarı Uyarısı',
    description:
      'Gıda ve kozmetik barkodlarını tarayabilirsiniz. Ancak açık kaynak veritabanlarındaki (Open Food Facts / Open Beauty Facts) Türkiye pazarı verileri çoğunlukla eksik veya hatalı olduğundan, en doğru sonuç için AI Analizi yöntemini kullanmanızı öneririz.',
    icon: <MaterialCommunityIcons name="barcode-scan" size={36} color={colors.primary} />,
  },
  {
    tag: 'ADIM 2 / 4',
    title: 'AI Gıda & Kozmetik Analizi',
    description:
      'Google hesabınızla giriş yaparak hem gıda (İçindekiler & Besin Tablosu) hem de kozmetik ürünlerin (İçindekiler / Ingredients) etiketlerini fotoğraflayıp çok daha doğru biçimde analiz edebilirsiniz (son 7 günde 3 etiket analiz hakkı).',
    icon: <MaterialIcons name="document-scanner" size={36} color={colors.primary} />,
  },
  {
    tag: 'ADIM 3 / 4',
    title: 'AI Öğün Analizi',
    description:
      'Öğününüzün fotoğrafını çekerek görünen porsiyonları inceleyebilirsiniz (son 7 günde 2 öğün hakkı). Kesin ölçüm değildir; pişirme yağı, sos, alerjen, gramaj vb. görselden anlaşılmayan içerikler olabileceği için yalnızca yaklaşık aralık sunulur, son karar kullanıcıya aittir.',
    icon: <MaterialIcons name="restaurant" size={36} color={colors.primary} />,
  },
  {
    tag: 'ADIM 4 / 4',
    title: 'Ürün Bildirimi',
    description:
      'Eksik veya hatalı barkod kayıtlarını bildirerek veritabanının geliştirilmesine ve herkes için güncellenmesine katkıda bulunabilirsiniz.',
    icon: <MaterialIcons name="post-add" size={36} color={colors.primary} />,
  },
];

export function WelcomeGuideModal({ visible, onClose }: WelcomeGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Onboarding tamamlanma durumu kaydedilemedi:', error);
    }
    setCurrentStep(0);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const activeStep = GUIDE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleFinish}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Üst Bar: Adım Etiketi ve Kapat / Geç Butonu */}
          <View style={styles.header}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{activeStep.tag}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rehberi kapat"
              hitSlop={12}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              onPress={handleFinish}>
              <Text style={styles.closeButtonText}>{'\u00d7'}</Text>
            </Pressable>
          </View>

          {/* İkon / Görsel Alanı */}
          <View style={styles.iconContainer}>
            {activeStep.icon}
          </View>

          {/* Başlık ve Açıklama Metinleri */}
          <Text style={styles.title}>{activeStep.title}</Text>
          <Text style={styles.description}>{activeStep.description}</Text>

          {/* Adım Göstergeleri (Dots) */}
          <View style={styles.dotsContainer}>
            {GUIDE_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Eylem Butonları */}
          <View style={styles.actionsRow}>
            {currentStep > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Önceki adım"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={handlePrev}>
                <Text style={styles.secondaryButtonText}>Geri</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rehberi atla"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleFinish}>
                <Text style={styles.secondaryButtonText}>Atla</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLastStep ? 'Anladım' : 'İleri'}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={handleNext}>
              <Text style={styles.primaryButtonText}>
                {isLastStep ? 'Anladım' : 'İleri'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.cardInternal,
  },
  modalCard: {
    ...elevation.level1Card,
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xxl,
    padding: spacing.cardInternal + 4,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  tagBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.secondaryContainer + '80',
    borderWidth: 1.5,
    borderColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stepIcon: {
    fontSize: 36,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    minHeight: 88,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.outlineVariant,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
