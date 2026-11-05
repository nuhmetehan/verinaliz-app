import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  onNavigate: () => void;
  navigation?: 'menu' | 'back';
  action?: ReactNode;
  children?: ReactNode;
};

export function ScreenHeader({ title, subtitle, onNavigate, navigation = 'menu', action, children }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={navigation === 'menu' ? 'Menüyü aç' : 'Geri dön'}
          onPress={onNavigate}
          style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed]}>
          <Feather name={navigation === 'menu' ? 'menu' : 'arrow-left'} size={21} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {action}
      </View>
      {children ? <View style={styles.controls}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.headerSurface,
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary + '18',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navigationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFFB3',
    borderWidth: 1,
    borderColor: '#FFFFFFCC',
  },
  heading: { flex: 1, minWidth: 0, gap: 4 },
  title: { ...typography.headlineSm, fontFamily: typography.headlineLg.fontFamily, color: colors.primary },
  subtitle: { ...typography.bodySm, color: colors.secondary },
  controls: { marginTop: 18, gap: 12 },
  pressed: { opacity: 0.65 },
});
