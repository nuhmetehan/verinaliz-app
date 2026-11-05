import { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, radius, spacing, typography } from '@/theme/theme';

export function ContentSkeleton({ product = false, label = 'İçerik yükleniyor…' }: { product?: boolean; label?: string }) {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion) { opacity.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.5, duration: 750, easing: Easing.inOut(Easing.quad), isInteraction: false, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), isInteraction: false, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.container}>
    <Text accessibilityLiveRegion="polite" style={styles.label}>{label}</Text>
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.blocks, { opacity }]}>
      {product && <View style={styles.card}>
        <View style={styles.image} />
        <View style={styles.shortLine} /><View style={styles.titleLine} /><View style={styles.line} />
      </View>}
      {[0, 1, 2].map((row) => <View key={row} style={[styles.card, styles.row]}>
        <View style={styles.thumbnail} />
        <View style={styles.lines}><View style={styles.titleLine} /><View style={styles.line} /><View style={styles.shortLine} /></View>
      </View>)}
    </Animated.View>
  </View>;
}

export function ProductLoadingSkeleton() {
  return <SafeAreaView edges={['top']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}><ContentSkeleton product label="Ürün bilgileri yükleniyor…" /></ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.mobileMargin },
  container: { gap: 16, width: '100%' },
  label: { ...typography.bodySm, color: colors.onSurfaceVariant },
  blocks: { gap: 16 },
  card: { padding: 20, borderRadius: radius.xxl, backgroundColor: colors.surfaceContainerLowest, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerHigh },
  image: { height: 148, borderRadius: radius.xl, backgroundColor: colors.surfaceContainerHigh, marginBottom: 8 },
  lines: { flex: 1, gap: 10 },
  titleLine: { width: '85%', height: 20, borderRadius: radius.sm, backgroundColor: colors.surfaceContainerHigh },
  line: { width: '70%', height: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceContainerHigh },
  shortLine: { width: '40%', height: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceContainerHigh },
});
