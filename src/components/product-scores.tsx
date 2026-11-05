import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, elevation, radius, typography } from '@/theme/theme';

const novaLabels = ['İşlenmemiş veya az işlenmiş gıda', 'İşlenmiş mutfak malzemesi', 'İşlenmiş gıda', 'Ultra işlenmiş gıda'];
const grades = ['A', 'B', 'C', 'D', 'E'] as const;
const gradeColors = ['#176044', '#44752B', '#806400', '#9A4A13', '#A32332'];

function NovaSegment({ level, nova }: { level: number; nova: number }) {
  const reducedMotion = useReducedMotion();
  const [fill] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion || level > nova) { fill.setValue(1); return; }
    fill.setValue(0);
    const animation = Animated.timing(fill, {
      toValue: 1, duration: 240, delay: 100 + (level - 1) * 60,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, level, nova, reducedMotion]);
  return <View style={styles.novaSegment}>
    {level <= nova && <Animated.View style={[
      StyleSheet.absoluteFill, styles.novaSegmentFilled,
      level === nova && styles.novaSegmentSelected,
      { borderRadius: radius.full, transformOrigin: 'left center', transform: [{ scaleX: fill }] },
    ]} />}
  </View>;
}

export function ProductScores({ grade, nova }: { grade?: string | null; nova?: number | null }) {
  const reducedMotion = useReducedMotion();
  const [emphasis] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion) { emphasis.setValue(1); return; }
    emphasis.setValue(0.92);
    const animation = Animated.sequence([
      Animated.delay(120),
      Animated.spring(emphasis, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [emphasis, grade, reducedMotion]);
  const validGrade = typeof grade === 'string' && /^[a-e]$/i.test(grade);
  const validNova = typeof nova === 'number' && Number.isInteger(nova) && nova >= 1 && nova <= 4;
  if (!validGrade && !validNova) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Beslenme ve işlenme bilgisi</Text>
      {validGrade && <View style={styles.card}>
        <Text style={styles.eyebrow}>BESİN PROFİLİ</Text>
        <Text style={styles.title}>Nutri-Score</Text>
        <View accessible accessibilityLabel={`Nutri-Score: ${grade!.toUpperCase()}. A ile E arasında besin profili.`} style={styles.scale}>
          {grades.map((letter, index) => {
            const selected = letter === grade!.toUpperCase();
            return <View key={letter} style={styles.gradeColumn}>
              <Animated.View style={[styles.gradeCell, { backgroundColor: selected ? gradeColors[index] : colors.surfaceContainerLow, borderColor: selected ? gradeColors[index] : colors.outlineVariant, transform: [{ scale: selected ? emphasis : 1 }] }]}>
                <Text style={[styles.gradeLetter, { color: selected ? colors.onPrimary : gradeColors[index] }]}>{letter}</Text>
              </Animated.View>
              <Text style={styles.selectionMarker}>{selected ? '●' : ' '}</Text>
            </View>;
          })}
        </View>
        <Text style={styles.result}>Besin profili: {grade!.toUpperCase()}</Text>
        <Text style={styles.text}>Besin içeriği değerlendirmesi. A daha elverişli, E daha az elverişli besin profilini belirtir.</Text>
      </View>}
      {validNova && <View style={styles.card}>
        <Text style={styles.eyebrow}>İŞLENME DÜZEYİ</Text>
        <Text style={styles.title}>NOVA</Text>
        <View accessible accessibilityLabel={`NOVA ${nova}, 4 grup içinde. ${novaLabels[nova! - 1]}.`} style={styles.scale}>
          {[1, 2, 3, 4].map((level) => <View key={level} style={styles.novaColumn}>
            <Text style={[styles.novaNumber, level === nova && styles.novaNumberSelected]}>{level}</Text>
            <NovaSegment level={level} nova={nova!} />
            <Text style={styles.selectionMarker}>{level === nova ? '●' : ' '}</Text>
          </View>)}
        </View>
        <Text style={styles.result}>Grup {nova} · {novaLabels[nova! - 1]}</Text>
        <Text style={styles.text}>Gıdanın işlenme biçimi ve amacına göre sınıflandırılmasıdır.</Text>
      </View>}
      <Text style={styles.text}>Kaynak: Open Food Facts. Değerler kaynaktan aktarılmıştır; uygulama tarafından hesaplanmaz. Tek başına tüketim miktarını veya sıklığını belirlemez.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { ...typography.headlineSm, color: colors.onSurface },
  card: { ...elevation.level1Card, padding: 20, gap: 8, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primary + '0D' },
  eyebrow: { ...typography.labelSm, color: colors.secondary, letterSpacing: 1 },
  title: { ...typography.headlineSm, color: colors.primary },
  text: { ...typography.bodySm, color: colors.onSurfaceVariant },
  result: { ...typography.bodyMd, fontFamily: typography.labelMd.fontFamily, color: colors.primary },
  scale: { flexDirection: 'row', gap: 8, marginTop: 8 },
  gradeColumn: { flex: 1, alignItems: 'center' },
  gradeCell: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1 },
  gradeLetter: { ...typography.headlineSm },
  selectionMarker: { fontSize: 10, lineHeight: 18, color: colors.primary },
  novaColumn: { flex: 1, alignItems: 'center', gap: 6 },
  novaNumber: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  novaNumberSelected: { fontFamily: typography.labelMd.fontFamily, color: colors.primary },
  novaSegment: { height: 8, width: '100%', borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh },
  novaSegmentFilled: { backgroundColor: colors.inversePrimary },
  novaSegmentSelected: { backgroundColor: colors.primary },
});
