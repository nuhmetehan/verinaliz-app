import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import type { ComponentPropsWithRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import {
  colors as themeColors,
  radius,
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
          <TabTrigger name="explore" href="/(tabs)/explore" asChild>
            <TabButton icon="history">Geçmiş</TabButton>
          </TabTrigger>

          <TabTrigger name="home" href="/(tabs)" asChild>
            <ScanTabButton />
          </TabTrigger>

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

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonSelected, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon === 'history' ? 'history' : 'book-open-outline'}
        size={22} color={tintColor} allowFontScaling={false} accessible={false} importantForAccessibility="no" />
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
      accessibilityRole="tab"
      accessibilityLabel="Tara"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.scanButtonWrapper,
        isFocused && styles.scanSelected,
        pressed && styles.scanPressed,
      ]}>
      <View style={styles.scanButton}>
        <MaterialCommunityIcons name="barcode-scan" size={23} color={themeColors.onPrimary}
          allowFontScaling={false} accessible={false} importantForAccessibility="no" />
        <Text style={styles.scanLabel}>Tara</Text>
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
      <View style={styles.tabBarInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  tabBar: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeColors.divider,
    backgroundColor: themeColors.surfaceContainerLowest,
  },
  tabBarInner: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.mobileMargin,
    gap: 8,
  },
  pressed: { backgroundColor: themeColors.surfaceContainerLow },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: spacing.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRadius: radius.lg,
  },
  tabButtonSelected: { backgroundColor: themeColors.selectedSurface },
  tabLabel: { ...typography.labelSm, textAlign: 'center' },
  scanButtonWrapper: {
    flex: 1,
    minWidth: 0,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: themeColors.primary,
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  scanSelected: { borderColor: themeColors.secondaryFixedDim },
  scanPressed: { backgroundColor: themeColors.primaryContainer },
  scanButton: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 5 },
  scanLabel: { ...typography.labelSm, color: themeColors.onPrimary, textAlign: 'center' },
});
