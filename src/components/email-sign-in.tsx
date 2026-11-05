import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/theme';
import { signInWithEmail } from '@/utils/auth';

type SignInResult = Awaited<ReturnType<typeof signInWithEmail>>;

export function EmailSignInButton({ disabled, onSignedIn }: {
  disabled?: boolean;
  onSignedIn?: (result: SignInResult) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled: !!disabled }}
      onPress={() => setOpen(true)} style={styles.button}>
      <Text style={styles.link}>E-posta ile giriş</Text>
    </Pressable>
    {open && <EmailSignInForm onClose={() => setOpen(false)} onSignedIn={onSignedIn} />}
  </>;
}

export function EmailSignInForm({ onClose, onSignedIn }: {
  onClose: () => void;
  onSignedIn?: (result: SignInResult) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const canSubmit = !!email.trim() && !!password && !busy;
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();

  async function submit() {
    if (lock.current || !email.trim() || !password) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await signInWithEmail(email, password);
      setPassword('');
      onSignedIn?.(result);
      onClose();
    } catch (failure) {
      // Do not log Axios errors: the request contains a password.
      const status = isAxiosError(failure) ? failure.response?.status : undefined;
      setPassword('');
      setError(status === 401 ? 'E-posta veya şifre doğrulanamadı.'
        : status === 429 ? 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.'
          : 'Giriş tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <Modal visible animationType="slide" onRequestClose={() => { if (!lock.current) onClose(); }}>
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>E-posta ile giriş</Text>
          <Text style={styles.text}>
            Mevcut e-posta hesabınızla giriş yapın. Bu ekran yeni hesap oluşturmaz.
            {supportEmail && ` Hesap erişimi için ${supportEmail} adresinden destek alabilirsiniz.`}
          </Text>
          <Text style={styles.text}>E-posta</Text>
          <TextInput accessibilityLabel="E-posta" value={email} onChangeText={setEmail} editable={!busy}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
            maxLength={254} style={styles.input} />
          <Text style={styles.text}>Şifre</Text>
          <TextInput accessibilityLabel="Şifre" value={password} onChangeText={setPassword} editable={!busy}
            secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
            maxLength={1024} style={styles.input} onSubmitEditing={() => void submit()} />
          {!!error && <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="E-posta ile oturum aç" disabled={!canSubmit}
            accessibilityState={{ disabled: !canSubmit, busy }} onPress={() => void submit()}
            style={[styles.submit, !canSubmit && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>Giriş Yap</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.button}>
            <Text style={styles.link}>Vazgeç</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: '700' },
  text: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: colors.outline, borderRadius: 12, padding: 14, color: colors.onSurface, fontSize: 16 },
  button: { paddingVertical: 12, paddingHorizontal: 6, minHeight: 48, justifyContent: 'center' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  submit: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
});
