import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  file?: File;
};

export function CameraCaptureModal({ onCapture, onClose }: {
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const captureLock = useRef(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [torch, setTorch] = useState(false);

  async function capture() {
    if (!ready || captureLock.current || !camera.current) return;
    captureLock.current = true;
    setTaking(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.8, imageType: 'jpg', exif: false });
      if (!photo) throw new Error('No photo');
      const fileName = `capture_${Date.now()}.jpg`;
      let file: File | undefined;
      if (Platform.OS === 'web') {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        file = new File([blob], fileName, { type: 'image/jpeg' });
      }
      onCapture({ uri: photo.uri, width: photo.width, height: photo.height, mimeType: 'image/jpeg', fileName, file });
    } catch {
      Alert.alert('Fotoğraf Çekilemedi', 'Kamerayı kontrol edip tekrar deneyin.');
    } finally {
      captureLock.current = false;
      setTaking(false);
    }
  }

  return <Modal animationType="slide" onRequestClose={() => { if (!captureLock.current) onClose(); }}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Fotoğraf Çek</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Kamerayı kapat" disabled={taking} onPress={onClose}>
          <Text style={styles.control}>Vazgeç</Text>
        </Pressable>
      </View>
      {!permission ? <ActivityIndicator color="#fff" /> : permission.granted ? <>
        <CameraView ref={camera} style={styles.camera} facing="back" mode="picture" enableTorch={torch}
          onCameraReady={() => setReady(true)}
          onMountError={() => { setReady(false); Alert.alert('Kamera Açılamadı', 'Kameranın başka bir uygulama tarafından kullanılmadığından emin olun.'); }} />
        <Text style={styles.hint}>Yalnızca ambalajı veya öğününüzü kadraja alın. Yüz ve kişisel bilgi içermesin.</Text>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: torch }} onPress={() => setTorch(!torch)} disabled={taking}>
            <Text style={styles.control}>{torch ? 'Feneri Kapat' : 'Feneri Aç'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf çek" disabled={!ready || taking} onPress={() => void capture()} style={styles.shutter}>
            {taking ? <ActivityIndicator color="#000" /> : <Text style={styles.shutterText}>Çek</Text>}
          </Pressable>
        </View>
      </> : <View style={styles.permission}>
        <Text style={styles.hint}>Fotoğraf çekmek için kamera izni gerekiyor.</Text>
        <Pressable accessibilityRole="button" onPress={() => {
          const action = permission.canAskAgain ? requestPermission() : Linking.openSettings();
          void action.catch(() => Alert.alert('İzin Verilemedi', 'Cihaz ayarlarından kamera iznini kontrol edin.'));
        }}><Text style={styles.control}>{permission.canAskAgain ? 'Kamera İzni Ver' : 'Ayarları Aç'}</Text></Pressable>
      </View>}
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1D1A' },
  camera: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, gap: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  control: { color: '#fff', padding: 10, fontSize: 16 },
  hint: { color: '#fff', textAlign: 'center', padding: 16, lineHeight: 22 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterText: { color: '#0D1D1A', fontWeight: '700', fontSize: 18 },
});
