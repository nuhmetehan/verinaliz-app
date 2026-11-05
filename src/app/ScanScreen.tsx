import { Feather, FontAwesome5 } from '@expo/vector-icons';
import type { BarcodeScanningResult, BarcodeSettings } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IngredientAnalysisModal } from '@/components/ingredient-analysis-modal';
import { LEGAL_CONSENT_STORAGE_KEY, LegalModal } from '@/components/legal-modal';
import { SideDrawer } from '@/components/side-drawer';
import { ONBOARDING_STORAGE_KEY, WelcomeGuideModal } from '@/components/welcome-guide-modal';
import { colors, radius, spacing, typography } from '@/theme/theme';

const barcodeScannerSettings: BarcodeSettings = {
  barcodeTypes: ['ean8', 'ean13', 'upc_a', 'upc_e'],
};

export default function ScanScreen() {
  const params = useLocalSearchParams<{
    openGuide?: string;
    openLegal?: string;
    legalTab?: 'privacy' | 'terms';
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerFocused, setScannerFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setScannerFocused(true);
    return () => setScannerFocused(false);
  }, []));
  const [isReading, setIsReading] = useState(false);
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [analysisModalMode, setAnalysisModalMode] = useState<'label' | 'meal'>('label');
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [isFirstLaunchLegal, setIsFirstLaunchLegal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
  const isScanLocked = useRef(false);
  const navigationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewfinderPulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    async function checkFirstTimeUser() {
      try {
        const [hasAcceptedLegal, hasSeenGuide] = await Promise.all([
          AsyncStorage.getItem(LEGAL_CONSENT_STORAGE_KEY),
          AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
        ]);

        if (!hasAcceptedLegal) {
          setIsFirstLaunchLegal(true);
          setLegalModalTab('privacy');
          setIsLegalModalVisible(true);
        } else if (!hasSeenGuide) {
          setIsGuideVisible(true);
        }
      } catch (error) {
        console.error('İlk açılış durumu kontrol edilemedi:', error);
      }
    }
    void checkFirstTimeUser();
  }, []);

  const handleAcceptLegal = async () => {
    try {
      await AsyncStorage.setItem(LEGAL_CONSENT_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Yasal onay durumu kaydedilemedi:', error);
    }
    setIsLegalModalVisible(false);
    setIsFirstLaunchLegal(false);

    try {
      const hasSeenGuide = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!hasSeenGuide) {
        setTimeout(() => {
          setIsGuideVisible(true);
        }, 300);
      }
    } catch (error) {
      console.error('Rehber durumu kontrol edilemedi:', error);
    }
  };


  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission?.status, requestPermission]);

  useEffect(() => {
    return () => {
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
      if (unlockTimeout.current) clearTimeout(unlockTimeout.current);
    };
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (isScanLocked.current || isGuideVisible || isLegalModalVisible || params.openGuide === 'true' || params.openLegal === 'true') return;

      isScanLocked.current = true;
      setIsReading(true);
      viewfinderPulse.setValue(0);

      Animated.sequence([
        Animated.timing(viewfinderPulse, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(viewfinderPulse, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      navigationTimeout.current = setTimeout(() => {
        router.push({
          pathname: '/product/[barcode]',
          params: { barcode: data },
        });
      }, 350);

      unlockTimeout.current = setTimeout(() => {
        isScanLocked.current = false;
        setIsReading(false);
      }, 2000);
    },
    [viewfinderPulse, isGuideVisible, isLegalModalVisible, params.openGuide, params.openLegal],
  );

  if (!permission) {
    return <View style={styles.loading} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Text style={styles.permissionIconText}>{'\u25a3'}</Text>
        </View>
        <Text style={styles.permissionTitle}>{'Kamera izni gerekli'}</Text>
        <Text style={styles.permissionDescription}>
          {'Ürünleri ve etiketleri taramak için kamera erişimine izin vermeniz gerekiyor.'}
        </Text>
        <Pressable style={styles.permissionButton} onPress={() => void Linking.openSettings()}>
          <Text style={styles.permissionButtonText}>{'Ayarlara Git'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.cameraStage}>
        {scannerFocused && !isAnalysisModalVisible && <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={isTorchEnabled}
          barcodeScannerSettings={barcodeScannerSettings}
          onBarcodeScanned={handleBarcodeScanned}
        />}
        <View pointerEvents="none" style={styles.cameraTint} />
        <ScrollView contentContainerStyle={styles.cameraContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <Pressable
              accessibilityLabel="Menüyü aç"
              accessibilityRole="button"
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              onPress={() => setIsDrawerVisible(true)}>
              <Feather name="menu" size={21} color={colors.onPrimary} />
            </Pressable>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.brandLogo}
              contentFit="contain"
            />
            <View>
              <Text style={styles.brandName}>Verinaliz</Text>
              <Text style={styles.brandSubtitle}>Gıda & Kozmetik</Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Pressable
              accessibilityLabel="Ayarlar"
              accessibilityRole="button"
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              onPress={() => void Linking.openSettings()}>
              <Feather name="settings" size={21} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              accessibilityLabel={isTorchEnabled ? 'Flaşı kapat' : 'Flaşı aç'}
              accessibilityRole="button"
              accessibilityState={{ selected: isTorchEnabled }}
              style={({ pressed }) => [
                styles.iconButton,
                isTorchEnabled && styles.iconButtonActive,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => setIsTorchEnabled((enabled) => !enabled)}>
              <Feather name="zap" size={21} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.scannerArea}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.viewfinder,
              {
                opacity: viewfinderPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
                transform: [
                  {
                    scale: viewfinderPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.025],
                    }),
                  },
                ],
              },
            ]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </Animated.View>

          <View accessibilityLiveRegion="polite" style={[styles.scanStatus, isReading && styles.scanStatusReading]}>
            <View style={styles.statusDot} />
            <Text style={styles.scanStatusText}>
              {isReading ? 'OKUNUYOR...' : 'TARAMAYA HAZIR'}
            </Text>
          </View>
          <Text style={styles.viewfinderHint}>Barkodu çerçevenin içine hizalayın</Text>
        </View>
        <View style={styles.controlPanel}>
          <Text style={styles.panelTitle}>Ürünün içeriğini keşfedin</Text>
          <Text style={styles.panelDescription}>Barkodu tarayın veya etiketi yapay zekâ ile inceleyin.</Text>
          <View style={styles.modeSwitcherContainer}>
            <View style={styles.modeActive}>
              <FontAwesome5 name="barcode" size={16} color={colors.onPrimary} />
              <Text style={styles.modeActiveText}>Barkod</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Etiket Analizi, yapay zekâ ile etiketi incele"
              style={({ pressed }) => [
                styles.modeInactive,
                pressed && styles.modePressed,
              ]}
              onPress={() => {
                setAnalysisModalMode('label');
                setIsAnalysisModalVisible(true);
              }}>
              <FontAwesome5 name="camera" size={16} color={colors.primary} />
              <Text style={styles.modeInactiveText}>Etiket Analizi</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Barkod verileri hakkında bilgi"
            accessibilityState={{ expanded: showBarcodeDetails }}
            style={({ pressed }) => [
              styles.trBarcodeHintCard,
              pressed && styles.modePressed,
            ]}
            onPress={() => setShowBarcodeDetails((visible) => !visible)}>
            <FontAwesome5
              name="info-circle"
              size={16}
              color={colors.onSurface}
              solid
              style={styles.trBarcodeHintIcon}
            />
            <Text style={styles.trBarcodeHintText}>
              Barkod verileri eksik olabilir. <Text style={styles.trBarcodeHintBold}>{showBarcodeDetails ? 'Detayları gizle' : 'Detayları gör'}</Text>
            </Text>
            <FontAwesome5 name={showBarcodeDetails ? 'chevron-up' : 'chevron-down'} size={12} color={colors.secondary} />
          </Pressable>
          {showBarcodeDetails && <Text style={styles.hintDetails}>
            Türkiye pazarındaki gıda ve kozmetik ürünlerinde açık kaynak barkod verileri eksik veya hatalı olabilir. Etiket Analizi ile ambalajı okuyabilirsiniz. Yapay zekâ da hata yapabilir; sonuçları fiziki ambalajla karşılaştırın.
          </Text>}
        </View>
        </ScrollView>
      </View>

    </SafeAreaView>

      <SideDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        onOpenHowItWorks={() => setIsGuideVisible(true)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab || 'privacy');
          setIsLegalModalVisible(true);
        }}
      />

      <WelcomeGuideModal
        visible={isGuideVisible || params.openGuide === 'true'}
        onClose={() => {
          setIsGuideVisible(false);
          router.setParams({ openGuide: undefined });
        }}
      />

      <IngredientAnalysisModal
        visible={isAnalysisModalVisible}
        initialMode={analysisModalMode}
        onClose={() => setIsAnalysisModalVisible(false)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab || 'privacy');
          setIsLegalModalVisible(true);
        }}
      />

      <LegalModal
        visible={isLegalModalVisible || params.openLegal === 'true'}
        initialTab={params.openLegal === 'true' ? (params.legalTab || 'privacy') : legalModalTab}
        isFirstLaunch={isFirstLaunchLegal}
        onAccept={handleAcceptLegal}
        onClose={() => {
          setIsLegalModalVisible(false);
          setIsFirstLaunchLegal(false);
          router.setParams({ openLegal: undefined, legalTab: undefined });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraStage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
  },
  // Açık tema: kamera üzerine hafif siyah örtü (%18 opak) — vizörü ön plana çıkarır
  cameraTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#01261F55',
  },
  cameraContent: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  brandGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
  },
  brandName: {
    ...typography.bodyLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  brandSubtitle: {
    ...typography.labelSm,
    color: colors.onPrimary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 7,
  },
  // Kamera görüntüsünden ayrılan, yüksek kontrastlı kontroller.
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#FFFFFF33',
    borderRadius: radius.full,
    backgroundColor: '#01261FAA',
  },
  // Aktif (flaş açık): Orman Yeşili dolu buton
  iconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  scannerArea: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  viewfinder: {
    width: '82%',
    maxWidth: 340,
    aspectRatio: 1.75,
  },
  // Nane rengi köşeler kamera üzerinde görünür kalır.
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.lg,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: radius.lg,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.lg,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: radius.lg,
  },
  // İnce tarama çizgisi.
  scanLine: {
    position: 'absolute',
    top: '50%',
    right: 16,
    left: 16,
    height: 1,
    backgroundColor: colors.secondaryContainer + '90',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  // Durum rozeti — bekleme: açık nane (#c3ecd7) zemin, koyu orman yeşili metin
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.secondaryContainer + 'E6', // #c3ecd7 %90 opak
  },
  // Okuma sırasında durum rozetinin kenarlığı belirginleşir.
  scanStatusReading: {
    borderColor: colors.primary,
    backgroundColor: colors.secondaryContainer,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  scanStatusText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginBottom: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.primary + '18',
  },
  permissionIconText: {
    fontSize: 30,
    color: colors.primary,
  },
  permissionTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  permissionDescription: {
    ...typography.bodyLg,
    maxWidth: 320,
    marginTop: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 24,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant + '55',
    borderWidth: 1,
    borderRadius: 9999,
    padding: 4,
    gap: 4,
    marginTop: 18,
  },
  modeActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeActiveText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  modeInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: 'transparent',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeInactiveText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '500',
  },
  modePressed: {
    opacity: 0.7,
  },
  trBarcodeHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  trBarcodeHintIcon: {
    marginTop: 1,
  },
  trBarcodeHintText: {
    ...typography.bodySm,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    textAlign: 'left',
  },
  trBarcodeHintBold: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  viewfinderHint: { ...typography.bodySm, color: colors.onPrimary, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  controlPanel: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#FFFFFFF2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF88',
    padding: spacing.cardInternal,
  },
  panelTitle: { ...typography.headlineSm, color: colors.primary },
  panelDescription: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 6 },
  hintDetails: { ...typography.bodySm, color: colors.onSurfaceVariant, paddingHorizontal: 4, marginTop: 12 },
});
