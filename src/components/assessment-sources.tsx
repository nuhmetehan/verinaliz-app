import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/theme';

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
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.link}>Değerlendirme sınırları ve kaynaklar {expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && <>
        <Text style={styles.text}>
          Rozetler uygulamanın genel sınıflandırmasıdır; ürünün sizin için güvenli olduğunu veya bir maddenin her dozda zararlı olduğunu göstermez. Miktar, kullanım koşulları ve kişisel hassasiyetler önemlidir. Alerjenin saptanmaması, bulunmadığı anlamına gelmez. Ambalaj etiketini kontrol edin; sağlık kararlarında hekiminize danışın.
        </Text>
        <Text style={styles.text}>
          Aşağıdaki resmi kaynaklar genel bilgi içindir; her rozetin bu kurumlarca onaylandığı veya her bileşen için ayrı kaynak doğrulaması yapıldığı anlamına gelmez. AI sonuçları hata içerebilir; öğün değerleri yaklaşık tahminlerdir.
        </Text>
        {sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => {
          void Linking.openURL(source.url).catch(() => Alert.alert('Bağlantı Açılamadı', 'Lütfen daha sonra tekrar deneyin.'));
        }}><Text style={styles.link}>{source.title} ↗</Text></Pressable>)}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerLowest },
  text: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 20 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600', paddingVertical: 6 },
});
