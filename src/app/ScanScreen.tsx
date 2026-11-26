import { Feather } from '@expo/vector-icons';
import type { BarcodeScanningResult, BarcodeSettings } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IngredientAnalysisModal } from '@/components/ingredient-analysis-modal';
import { LegalModal } from '@/components/legal-modal';
import { SideDrawer } from '@/components/side-drawer';
import { ONBOARDING_STORAGE_KEY, WelcomeGuideModal } from '@/components/welcome-guide-modal';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
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
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [scannerFocused, setScannerFocused] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    setScannerFocused(true);
    return () => {
      setScannerFocused(false);
      setCameraReady(false);
    };
  }, []));
  const [isReading, setIsReading] = useState(false);
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
  const isScanLocked = useRef(false);
  const navigationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const [viewfinderPulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then(seen => {
      if (active && !seen) setIsGuideVisible(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void getPermission().catch((error) => console.error('Kamera izni kontrol edilemedi:', error));
      }
    });

    return () => subscription.remove();
  }, [getPermission]);

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

      if (!reducedMotion) Animated.sequence([
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
    [viewfinderPulse, reducedMotion, isGuideVisible, isLegalModalVisible, params.openGuide, params.openLegal],
  );

  return (
    <>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Menüyü aç"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed && styles.controlPressed]}
            onPress={() => setIsDrawerVisible(true)}>
            <Feather name="menu" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.brandGroup}>
            <Image source={require('../../assets/images/icon.png')} style={styles.brandLogo} contentFit="contain" />
            <Text accessibilityRole="header" style={styles.brandName}>Verinaliz</Text>
          </View>
          <Pressable
            accessibilityLabel="Ayarlar"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed && styles.controlPressed]}
            onPress={() => void Linking.openSettings()}>
            <Feather name="settings" size={21} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.cameraContent}>
          {!permission?.granted ? (
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Barkod taramak için kamera erişimi</Text>
              <Text style={styles.permissionDescription}>Kamera barkodu cihazınızda okur. Ürünü bulmak için yalnızca barkod numarası sunucuya gönderilir.</Text>
              <Pressable accessibilityRole="button" disabled={!permission} style={styles.permissionButton}
                onPress={() => void (permission?.canAskAgain ? requestPermission() : Linking.openSettings()).catch(() =>
                  Alert.alert('Kamera izni', 'Cihaz ayarlarından kamera erişimini kontrol edin.'))}>
                <Text style={styles.permissionButtonText}>{permission?.canAskAgain ? 'Kameraya izin ver' : permission ? 'Ayarları aç' : 'Kamera hazırlanıyor…'}</Text>
              </Pressable>
            </View>
          ) : <View style={styles.scannerArea}>
            <View style={styles.scannerHeading}>
              <View style={styles.scannerCopy}>
                <Text accessibilityRole="header" style={styles.scannerTitle}>Barkod tara</Text>
                <Text style={styles.scannerHint}>Barkodu çerçevenin içine hizalayın.</Text>
              </View>
              <Pressable
                accessibilityLabel={isTorchEnabled ? 'Flaşı kapat' : 'Flaşı aç'}
                accessibilityRole="button"
                accessibilityState={{ selected: isTorchEnabled, disabled: !cameraReady }}
                disabled={!cameraReady}
                style={({ pressed }) => [
                  styles.iconButton,
                  isTorchEnabled && styles.iconButtonActive,
                  !cameraReady && styles.iconButtonDisabled,
                  pressed && styles.controlPressed,
                ]}
                onPress={() => setIsTorchEnabled((enabled) => !enabled)}>
                <Feather name={isTorchEnabled ? 'zap' : 'zap-off'} size={22} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.cameraStage}>
              {scannerFocused && !isAnalysisModalVisible && (
                <CameraView
                  key={cameraAttempt}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={isTorchEnabled}
                  barcodeScannerSettings={barcodeScannerSettings}
                  onBarcodeScanned={handleBarcodeScanned}
                  onCameraReady={() => {
                    setCameraReady(true);
                    setCameraError(false);
                  }}
                  onMountError={() => {
                    setCameraReady(false);
                    setCameraError(true);
                  }}
                />
              )}
              <View pointerEvents="none" style={styles.cameraTint} />
              {cameraError ? (
                <View style={styles.cameraError}>
                  <Feather name="alert-circle" size={24} color={colors.onPrimary} />
                  <Text accessibilityRole="alert" style={styles.cameraErrorText}>Kamera açılamadı. Diğer kamera uygulamalarını kapatıp tekrar deneyin.</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.cameraRetry, pressed && styles.primaryPressed]}
                    onPress={() => {
                      setCameraError(false);
                      setCameraAttempt((attempt) => attempt + 1);
                    }}>
                    <Text style={styles.permissionButtonText}>Tekrar dene</Text>
                  </Pressable>
                </View>
              ) : (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.viewfinder,
                    { transform: [{ scale: viewfinderPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.025],
                    }) }] },
                  ]}>
                  {[styles.topLeft, styles.topRight, styles.bottomLeft, styles.bottomRight].map((position, index) => (
                    <View key={index} style={[styles.corner, position]}>
                      <View style={[styles.cornerHighlight, position]} />
                    </View>
                  ))}
                  <View style={styles.scanLine} />
                </Animated.View>
              )}
            </View>
            {!cameraError && (
              <View accessibilityLiveRegion="polite" style={[styles.scanStatus, isReading && styles.scanStatusReading]}>
                {isReading || !cameraReady ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={styles.statusDot} />}
                <Text style={styles.scanStatusText}>
                  {isReading ? 'Barkod okunuyor…' : cameraReady ? 'Taramaya hazır' : 'Kamera hazırlanıyor…'}
                </Text>
              </View>
            )}
          </View>}

          <View style={styles.controlPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Etiket ve öğün analizi"
              accessibilityHint="Fotoğrafla inceleme seçeneklerini açar"
              style={({ pressed }) => [styles.analysisButton, pressed && styles.controlPressed]}
              onPress={() => {
                setCameraReady(false);
                setIsAnalysisModalVisible(true);
              }}>
              <View style={styles.analysisIcon}>
                <Feather name="camera" size={22} color={colors.primary} />
              </View>
              <View style={styles.analysisCopy}>
                <Text style={styles.analysisTitle}>Etiket ve öğün analizi</Text>
                <Text style={styles.analysisSubtitle}>Fotoğrafla incele</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Barkod verileri hakkında"
              accessibilityState={{ expanded: showBarcodeDetails }}
              style={({ pressed }) => [styles.barcodeHint, pressed && styles.controlPressed]}
              onPress={() => setShowBarcodeDetails((visible) => !visible)}>
              <Feather name="info" size={17} color={colors.onSurfaceVariant} />
              <Text style={styles.barcodeHintText}>Barkod verileri hakkında</Text>
              <Feather name={showBarcodeDetails ? 'chevron-up' : 'chevron-down'} size={17} color={colors.onSurfaceVariant} />
            </Pressable>
            {showBarcodeDetails && <Text style={styles.hintDetails}>
              Türkiye pazarındaki gıda ve kozmetik ürünlerinde açık kaynak barkod verileri eksik veya hatalı olabilir. Etiket Analizi ile ambalajı okuyabilirsiniz. Yapay zekâ da hata yapabilir; sonuçları fiziki ambalajla karşılaştırın.
            </Text>}
          </View>
        </ScrollView>
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
        onClose={() => setIsAnalysisModalVisible(false)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab || 'privacy');
          setIsLegalModalVisible(true);
        }}
      />

      <LegalModal
        visible={isLegalModalVisible || params.openLegal === 'true'}
        initialTab={params.openLegal === 'true' ? (params.legalTab || 'privacy') : legalModalTab}
        onClose={() => {
          setIsLegalModalVisible(false);
          router.setParams({ openLegal: undefined, legalTab: undefined });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.mobileMargin,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surfaceContainerLowest,
  },
  brandGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brandLogo: { width: 30, height: 30, borderRadius: radius.md },
  brandName: { ...typography.headlineSm, flexShrink: 1, color: colors.primary },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  iconButtonActive: { backgroundColor: colors.selectedSurface, borderColor: colors.secondary },
  iconButtonDisabled: { opacity: 0.55 },
  controlPressed: { backgroundColor: colors.selectedSurface },
  primaryPressed: { backgroundColor: colors.primaryContainer },
  cameraContent: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.mobileMargin, gap: 16 },
  scannerArea: { flexGrow: 1, gap: 12 },
  scannerHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scannerCopy: { flex: 1, gap: 4 },
  scannerTitle: { ...typography.headlineLgMobile, color: colors.primary },
  scannerHint: { ...typography.bodySm, color: colors.onSurfaceVariant },
  cameraStage: {
    flexGrow: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    overflow: 'hidden',
    borderRadius: radius.xxl,
    backgroundColor: colors.cameraSurface,
  },
  cameraTint: { ...StyleSheet.absoluteFill, backgroundColor: colors.cameraSurface + '3D' },
  cameraError: { alignItems: 'center', gap: 8, marginHorizontal: 20, padding: 16, borderRadius: radius.lg, backgroundColor: colors.cameraSurface },
  cameraErrorText: { ...typography.bodySm, textAlign: 'center', color: colors.onPrimary },
  cameraRetry: { minHeight: spacing.touchTarget, justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.inversePrimary, paddingHorizontal: 12, paddingVertical: 8 },
  viewfinder: { width: '78%', maxWidth: 320, aspectRatio: 2 },
  corner: { position: 'absolute', width: 34, height: 30, borderColor: colors.cameraSurface, borderWidth: 2 },
  cornerHighlight: { position: 'absolute', width: 30, height: 26, borderColor: colors.primaryFixed, borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: radius.lg },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: radius.lg },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: radius.lg },
  bottomRight: { right: 0, bottom: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: radius.lg },
  scanLine: { position: 'absolute', top: '50%', right: 12, left: 12, height: 1, backgroundColor: colors.primaryFixed + 'C0' },
  scanStatus: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingVertical: 4 },
  scanStatusReading: { backgroundColor: colors.selectedSurface, paddingHorizontal: 10, borderRadius: radius.md },
  statusDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.secondary },
  scanStatusText: { ...typography.action, flexShrink: 1, color: colors.primary },
  permissionContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: spacing.mobileMargin },
  permissionIcon: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.selectedSurface },
  permissionTitle: { ...typography.headlineMd, color: colors.primary, textAlign: 'center' },
  permissionDescription: { ...typography.bodyMd, maxWidth: 320, color: colors.onSurfaceVariant, textAlign: 'center' },
  permissionButton: { marginTop: 8, minHeight: spacing.touchTarget, justifyContent: 'center', borderRadius: radius.lg, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary },
  permissionButtonText: { ...typography.action, color: colors.onPrimary, textAlign: 'center' },
  controlPanel: { gap: 4, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 },
  analysisButton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  analysisIcon: { padding: 10, borderRadius: radius.lg, backgroundColor: colors.selectedSurface },
  analysisCopy: { flex: 1, gap: 2 },
  analysisTitle: { ...typography.action, color: colors.primary },
  analysisSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  barcodeHint: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: spacing.touchTarget, paddingHorizontal: 4, paddingVertical: 8, borderRadius: radius.lg },
  barcodeHintText: { ...typography.bodySm, flex: 1, color: colors.onSurfaceVariant },
  hintDetails: { ...typography.bodySm, color: colors.onSurfaceVariant, paddingHorizontal: 4 },
});
