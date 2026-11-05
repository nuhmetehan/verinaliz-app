import type { Href } from 'expo-router';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import type { ComponentPropsWithRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import {
  colors as themeColors,
  spacing,
  typography,
} from '@/theme/theme';

// Router 58 still types slot refs as the View component rather than its native instance.
type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & Pick<ComponentPropsWithRef<typeof Pressable>, 'ref'>;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.tabContent} />
      <TabList asChild>
        <CustomTabList>
          {/* Sol: Geçmiş */}
          <TabTrigger name="explore" href="/(tabs)/explore" asChild>
            <TabButton icon="history">Geçmiş</TabButton>
          </TabTrigger>

          {/* Orta: Tara (Raised Floating Button) */}
          <TabTrigger name="home" href="/(tabs)" asChild>
            <ScanTabButton />
          </TabTrigger>

          {/* Sağ: Rehber */}
          <TabTrigger name="guide" href={'/(tabs)/guide' as Href} asChild>
            <TabButton icon="book">Rehber</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabButtonProps & { icon: 'history' | 'book' }) {
  const tintColor = isFocused ? themeColors.primary : themeColors.outline;

  const iconName =
    icon === 'history'
      ? { ios: 'clock' as const, android: 'history' as const, web: 'history' as const }
      : { ios: 'book' as const, android: 'menu_book' as const, web: 'menu_book' as const };

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <SymbolView name={iconName} size={24} tintColor={tintColor} />
      <Text style={[styles.tabLabel, { color: tintColor }]}>{children}</Text>
    </Pressable>
  );
}

function ScanTabButton({
  isFocused,
  ...props
}: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel="Tara"
      style={({ pressed }) => [
        styles.scanButtonWrapper,
        pressed && styles.pressed,
      ]}>
      <View style={styles.scanButton}>
        <SymbolView
          name={{
            ios: 'viewfinder',
            android: 'qr_code_scanner',
            web: 'qr_code_scanner',
          }}
          size={26}
          tintColor={themeColors.onPrimary}
        />
      </View>
    </Pressable>
  );
}

function CustomTabList({
  children,
  style,
  ...props
}: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: spacing.mobileMargin,
    borderTopWidth: 1,
    borderTopColor: themeColors.inverseOnSurface,
    backgroundColor: themeColors.surfaceContainerLowest,
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.75,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    ...typography.labelSm,
    fontWeight: '600',
  },
  scanButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  scanButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
