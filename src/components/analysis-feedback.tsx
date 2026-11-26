import axios, { isAxiosError } from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/theme';
import { getValidAccessToken } from '@/utils/auth';

export function AnalysisFeedback({ mode }: { mode: 'label' | 'cosmetic' | 'meal' }) {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<'incorrect' | 'unsafe' | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (sending || !kind) return;
    setSending(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Bildirim göndermek için menüden hesabınızla giriş yapın.');
        return;
      }
      await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/ai-feedback`, {
        mode, kind,
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
      setSent(true);
    } catch (error) {
      const message = isAxiosError(error) && typeof error.response?.data?.error === 'string'
        ? error.response.data.error : 'Bildirim gönderilemedi. Lütfen tekrar deneyin.';
      Alert.alert('Bildirim Gönderilemedi', message);
    } finally {
      setSending(false);
    }
  }

  return <View style={styles.card}>
    {sent ? <Text style={styles.text} accessibilityLiveRegion="polite">Bildiriminiz alındı. Teşekkürler.</Text> : <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} disabled={sending}>
        <Text style={styles.link}>AI sonucunu bildir</Text>
      </Pressable>
      {expanded && <>
        <Text style={styles.text}>Bildirim nedenini seçin. Yöneticiler seçiminizi ve analiz türünü görür.</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Bildirim nedeni" style={styles.row}>{(['incorrect', 'unsafe'] as const).map(value => <Pressable key={value}
          accessibilityRole="radio" accessibilityState={{ checked: kind === value }} disabled={sending}
          onPress={() => setKind(value)} style={[styles.choice, kind === value && styles.selected]}>
          <Text style={styles.text}>{value === 'incorrect' ? 'Hatalı bilgi' : 'Zararlı / uygunsuz içerik'}</Text>
        </Pressable>)}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: sending || !kind }}
          style={!kind && styles.disabled} disabled={sending || !kind} onPress={() => void submit()}>
          {sending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.link}>Bildirimi Gönder</Text>}
        </Pressable>
      </>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerLowest },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { padding: 8, borderWidth: 1, borderColor: colors.outline, borderRadius: 10 },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
  text: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600', paddingVertical: 8 },
  disabled: { opacity: 0.5 },
});
