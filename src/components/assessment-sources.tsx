import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/theme';

const sources = [
  { title: 'EFSA — Gıda katkı maddeleri', url: 'https://www.efsa.europa.eu/en/topics/topic/food-additives' },
  { title: 'DSÖ — Sağlıklı beslenme', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  { title: 'SCCS — Kozmetik bileşen güvenliği', url: 'https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en' },
];

export function AssessmentSources() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <Text style={styles.text}>
        Verinaliz tıbbi cihaz değildir; hastalık teşhis etmez, tedavi etmez veya önlemez. Sağlık kararları için bir sağlık uzmanına danışın. Alerjen bilgilerini ambalajdan doğrulayın.
      </Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.link}>Değerlendirme sınırları ve kaynaklar</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
      </Pressable>
      {expanded && <>
        <Text style={styles.text}>
          Rozetler uygulamanın genel sınıflandırmasıdır; ürünün sizin için güvenli olduğunu veya bir maddenin her dozda zararlı olduğunu göstermez. Miktar, kullanım koşulları ve kişisel hassasiyetler önemlidir. Alerjenin saptanmaması, bulunmadığı anlamına gelmez. Ambalaj etiketini kontrol edin; sağlık kararlarında hekiminize danışın.
        </Text>
        <Text style={styles.text}>
          Aşağıdaki resmi kaynaklar genel bilgi içindir; her rozetin bu kurumlarca onaylandığı veya her bileşen için ayrı kaynak doğrulaması yapıldığı anlamına gelmez. AI sonuçları hata içerebilir; öğün değerleri yaklaşık tahminlerdir.
        </Text>
        {sources.map(source => <Pressable key={source.url} accessibilityRole="link"
          style={({ pressed }) => [styles.control, pressed && styles.pressed]} onPress={() => {
          void Linking.openURL(source.url).catch(() => Alert.alert('Bağlantı Açılamadı', 'Lütfen daha sonra tekrar deneyin.'));
        }}><Text style={styles.link}>{source.title}</Text><Feather name="external-link" size={17} color={colors.primary} /></Pressable>)}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8, borderRadius: radius.xl, backgroundColor: colors.surfaceContainerLowest },
  text: { ...typography.bodySm, color: colors.onSurfaceVariant },
  control: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4, minHeight: spacing.touchTarget, borderRadius: radius.md },
  pressed: { backgroundColor: colors.selectedSurface },
  link: { ...typography.action, flex: 1, color: colors.primary },
});
