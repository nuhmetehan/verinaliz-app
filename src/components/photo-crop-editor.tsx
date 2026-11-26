import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/theme';
import { initialPhotoFrame, moveFrameEdge, type FrameEdge, type PhotoFrame } from '@/utils/photoPrivacyRules';

const edgeLabels: Record<FrameEdge, string> = {
  top: 'Üst kenar', bottom: 'Alt kenar', left: 'Sol kenar', right: 'Sağ kenar',
};
const resizeActions = [{ name: 'increment' as const }, { name: 'decrement' as const }];

function FrameHandle({ edge, frame, width, height, disabled, onChange }: {
  edge: FrameEdge;
  frame: PhotoFrame;
  width: number;
  height: number;
  disabled: boolean;
  onChange: Dispatch<SetStateAction<PhotoFrame>>;
}) {
  const horizontal = edge === 'left' || edge === 'right';
  const position = useRef<number | null>(null);
  const x = (horizontal ? frame[edge] : (frame.left + frame.right) / 2) * width;
  const y = (horizontal ? (frame.top + frame.bottom) / 2 : frame[edge]) * height;
  return (
    <View accessible accessibilityRole="adjustable"
      onStartShouldSetResponder={() => !disabled}
      onResponderGrant={({ nativeEvent }) => {
        position.current = horizontal ? nativeEvent.pageX : nativeEvent.pageY;
      }}
      onResponderMove={({ nativeEvent }) => {
        if (nativeEvent.touches.length !== 1) position.current = null;
        if (position.current === null || disabled) return;
        const next = horizontal ? nativeEvent.pageX : nativeEvent.pageY;
        const delta = (next - position.current) / (horizontal ? width : height);
        position.current = next;
        onChange(current => moveFrameEdge(current, edge, delta));
      }}
      onResponderRelease={() => { position.current = null; }}
      onResponderTerminate={() => { position.current = null; }}
      accessibilityLabel={edgeLabels[edge]} accessibilityState={{ disabled }}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(frame[edge] * 100) }}
      accessibilityActions={resizeActions}
      onAccessibilityAction={({ nativeEvent }) => {
        if (!disabled) onChange(current => moveFrameEdge(current, edge, nativeEvent.actionName === 'increment' ? 0.04 : -0.04));
      }}
      style={[styles.handle, { left: x, top: y }]}>
      <View style={[styles.handleMark, horizontal && styles.verticalHandleMark]} />
    </View>
  );
}

export function PhotoCropEditor({ image, busy, message, mode, onRetake, onApply }: {
  image: { uri: string; width: number; height: number };
  busy: boolean;
  message: string | null;
  mode: 'label' | 'meal';
  onRetake: () => void;
  onApply: (frame: PhotoFrame) => void;
}) {
  const [frame, setFrame] = useState(initialPhotoFrame);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const scale = Math.min((available.width - spacing.touchTarget) / image.width,
    (available.height - spacing.touchTarget) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const canApply = !busy && width > 0 && height > 0;
  return (
    <>
      <Text style={styles.hint}>
        {mode === 'meal' ? 'Kenarları sürükleyip yalnızca öğünü kadrajda bırakın.'
          : 'Kenarları sürükleyip yalnızca içindekiler veya besin değerleri bölümünü bırakın.'}
      </Text>
      <View style={styles.canvas} onLayout={({ nativeEvent: { layout } }) => {
        setAvailable({ width: layout.width, height: layout.height });
      }}>
        {width > 0 && height > 0 && <View style={{ width: width + spacing.touchTarget, height: height + spacing.touchTarget }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: spacing.touchTarget / 2, top: spacing.touchTarget / 2, width, height }}>
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
            <View style={[styles.shade, { left: 0, right: 0, top: 0, height: frame.top * height }]} />
            <View style={[styles.shade, { left: 0, right: 0, bottom: 0, height: (1 - frame.bottom) * height }]} />
            <View style={[styles.shade, { left: 0, top: frame.top * height, width: frame.left * width, height: (frame.bottom - frame.top) * height }]} />
            <View style={[styles.shade, { right: 0, top: frame.top * height, width: (1 - frame.right) * width, height: (frame.bottom - frame.top) * height }]} />
            <View style={[styles.outline, {
              left: frame.left * width, top: frame.top * height,
              width: (frame.right - frame.left) * width, height: (frame.bottom - frame.top) * height,
            }]} />
          </View>
          {(Object.keys(edgeLabels) as FrameEdge[]).map(edge => <FrameHandle key={edge}
            edge={edge} frame={frame} width={width} height={height} disabled={busy} onChange={setFrame} />)}
        </View>}
      </View>
      {message && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.message}>{message}</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onRetake}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Yeniden çek</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canApply, busy }}
          disabled={!canApply} onPress={() => onApply(frame)}
          style={({ pressed }) => [styles.primary, !canApply && styles.disabled, pressed && styles.pressed]}>
          {busy && <ActivityIndicator color={colors.primary} />}
          <Text style={styles.primaryText}>{busy ? 'Cihazda taranıyor…' : 'Kırp ve kontrol et'}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { ...typography.bodySm, color: colors.primaryFixed, paddingHorizontal: spacing.mobileMargin },
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.62)' },
  outline: { position: 'absolute', borderWidth: 2, borderColor: colors.onPrimary },
  handle: {
    position: 'absolute', width: spacing.touchTarget, height: spacing.touchTarget,
    alignItems: 'center', justifyContent: 'center',
  },
  handleMark: { width: 28, height: 7, borderRadius: radius.full, backgroundColor: colors.onPrimary, borderColor: colors.cameraSurface, borderWidth: 1 },
  verticalHandleMark: { height: 28, width: 7 },
  message: { ...typography.bodySm, color: colors.onPrimary, paddingHorizontal: spacing.mobileMargin },
  actions: { padding: spacing.mobileMargin, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  secondary: { justifyContent: 'center', minHeight: spacing.touchTarget, borderWidth: 1, borderColor: colors.inversePrimary, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryText: { ...typography.action, color: colors.onPrimary, textAlign: 'center' },
  primary: { minHeight: spacing.touchTarget, alignItems: 'center', flexDirection: 'row', gap: 8, borderRadius: radius.lg, backgroundColor: colors.onPrimary, paddingHorizontal: 16, paddingVertical: 8 },
  primaryText: { ...typography.action, color: colors.primary, flexShrink: 1 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
