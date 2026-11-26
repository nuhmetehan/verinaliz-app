import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoCropEditor } from '@/components/photo-crop-editor';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { discardPhoto, inspectPhoto, type PreparedPhoto } from '@/utils/photoPrivacy';
import { type PhotoFrame } from '@/utils/photoPrivacyRules';

type CapturedPhoto = { uri: string; width: number; height: number };

export function CameraCaptureModal({ mode, onCapture, onClose }: {
  mode: 'label' | 'meal';
  onCapture: (photo: PreparedPhoto) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const captureLock = useRef(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [torch, setTorch] = useState(false);
  const [rawPhoto, setRawPhoto] = useState<CapturedPhoto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activePhoto = useRef<CapturedPhoto | null>(null);
  const mounted = useRef(true);

  function discardRawPhoto() {
    const photo = activePhoto.current;
    activePhoto.current = null;
    if (photo) void discardPhoto(photo.uri);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardRawPhoto();
    };
  }, []);

  async function capture() {
    if (!ready || captureLock.current || !camera.current) return;
    captureLock.current = true;
    setTaking(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.8, imageType: 'jpg', exif: false });
      if (!photo) throw new Error('No photo');
      if (!mounted.current) {
        void discardPhoto(photo.uri);
        return;
      }
      activePhoto.current = photo;
      setRawPhoto(photo);
    } catch {
      if (mounted.current) Alert.alert('Fotoğraf Çekilemedi', 'Kamerayı kontrol edip tekrar deneyin.');
    } finally {
      captureLock.current = false;
      if (mounted.current) setTaking(false);
    }
  }

  async function checkFrame(frame: PhotoFrame) {
    if (captureLock.current || !activePhoto.current) return;
    captureLock.current = true;
    setTaking(true);
    setMessage(null);
    try {
      const result = await inspectPhoto(activePhoto.current.uri, frame);
      if (!mounted.current) {
        if ('photo' in result) void discardPhoto(result.photo.uri);
        return;
      }
      if ('issue' in result) {
        setMessage(result.issue === 'person'
          ? 'Kadrajda insan görüntüsü algılandı. Kadrajı daraltın veya yeniden çekin.'
          : 'Kadrajda kişisel bilgi olabilecek bir yazı algılandı. Kadrajı daraltın veya yeniden çekin.');
        return;
      }
      discardRawPhoto();
      onCapture(result.photo);
    } catch {
      if (mounted.current) setMessage('Cihazdaki kontrol tamamlanamadı. Tekrar deneyin veya yeni bir kare çekin.');
    } finally {
      captureLock.current = false;
      if (mounted.current) setTaking(false);
    }
  }

  function close() {
    if (captureLock.current) return;
    discardRawPhoto();
    onClose();
  }

  return <Modal animationType="slide" onRequestClose={close}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text accessibilityRole="header" style={styles.title}>{rawPhoto ? 'Fotoğrafı kırp' : 'Fotoğraf çek'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Kamerayı kapat" accessibilityState={{ disabled: taking }}
          disabled={taking} onPress={close} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
          <Text style={styles.control}>Vazgeç</Text>
        </Pressable>
      </View>
      {rawPhoto ? <PhotoCropEditor image={rawPhoto} busy={taking} message={message} mode={mode}
        onApply={frame => void checkFrame(frame)} onRetake={() => {
          discardRawPhoto();
          setReady(false);
          setMessage(null);
          setRawPhoto(null);
        }} /> : !permission ? (
        <View style={styles.permission} accessibilityRole="progressbar" accessibilityLabel="Kamera hazırlanıyor">
          <ActivityIndicator color={colors.onPrimary} />
          <Text style={styles.hint}>Kamera hazırlanıyor…</Text>
        </View>
      ) : permission.granted ? <>
        <CameraView ref={camera} style={styles.camera} facing="back" mode="picture" enableTorch={torch}
          onCameraReady={() => setReady(true)}
          onMountError={() => { setReady(false); Alert.alert('Kamera Açılamadı', 'Kameranın başka bir uygulama tarafından kullanılmadığından emin olun.'); }} />
        <Text style={styles.hint}>Yalnızca etiketi veya öğünü kadraja alın. İnsan görüntüsü, belge, adres ve diğer kişisel bilgileri dışarıda bırakın.</Text>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Feneri kapat' : 'Feneri aç'}
            accessibilityState={{ selected: torch, disabled: taking }} onPress={() => setTorch(!torch)} disabled={taking}
            style={({ pressed }) => [styles.toolbarButton, torch && styles.torchActive, pressed && styles.pressed]}>
            <Feather name={torch ? 'zap' : 'zap-off'} size={21} color={torch ? colors.primary : colors.onPrimary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf çek"
            accessibilityState={{ disabled: !ready || taking, busy: taking }} disabled={!ready || taking} onPress={() => void capture()}
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed, !ready && styles.shutterDisabled]}>
            {taking ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.shutterText}>Çek</Text>}
          </Pressable>
        </View>
      </> : <ScrollView contentContainerStyle={styles.permission}>
        <Feather name="camera" size={26} color={colors.primaryFixed} />
        <Text accessibilityRole="header" style={styles.permissionTitle}>Kamera izni gerekli</Text>
        <Text style={styles.hint}>Kamera, etiket veya öğün fotoğrafı çekmek için kullanılır. Fotoğraf cihazda kırpılır ve kontrol edilir. Gönderime onay verirseniz kırpılan kare analiz için Railway’deki Verinaliz sunucusuna ve Cloudflare Workers AI’a iletilir.</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]} onPress={() => {
          const action = permission.canAskAgain ? requestPermission() : Linking.openSettings();
          void action.catch(() => Alert.alert('İzin Verilemedi', 'Cihaz ayarlarından kamera iznini kontrol edin.'));
        }}><Text style={styles.control}>{permission.canAskAgain ? 'Kamera İzni Ver' : 'Ayarları Aç'}</Text></Pressable>
      </ScrollView>}
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cameraSurface },
  camera: { flex: 1, backgroundColor: colors.cameraSurface },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.mobileMargin, gap: 12 },
  title: { ...typography.headlineSm, flex: 1, color: colors.onPrimary },
  toolbarButton: {
    minWidth: spacing.touchTarget,
    minHeight: spacing.touchTarget,
    maxWidth: '55%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inversePrimary,
  },
  torchActive: { backgroundColor: colors.primaryFixed },
  control: { ...typography.action, color: colors.onPrimary, textAlign: 'center' },
  hint: { ...typography.bodySm, color: colors.primaryFixed, textAlign: 'center', padding: 16, paddingBottom: 0 },
  permission: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.mobileMargin, gap: 12 },
  permissionTitle: { ...typography.headlineSm, textAlign: 'center', color: colors.onPrimary },
  pressed: { backgroundColor: colors.primaryContainer },
  shutter: { minWidth: 72, minHeight: 56, paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.xl, backgroundColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { backgroundColor: colors.primaryFixed },
  shutterDisabled: { opacity: 0.55 },
  shutterText: { ...typography.action, color: colors.primary },
});
