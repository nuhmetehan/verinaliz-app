import { AntDesign, FontAwesome5, Fontisto, MaterialIcons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  type AuthSession,
  deleteAccount,
  getStoredAuthSession,
  signInWithGoogle,
  signOut,
  subscribeAuthChanges,
} from '@/utils/auth';
import { clearLocalData } from '@/utils/localData';
import { UnsupportedAuthEnvironmentError } from '@/utils/authRedirect';
import { EmailSignInButton } from '@/components/email-sign-in';

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

type MenuSection = {
  id: string;
  items: MenuItem[];
};

type SideDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onOpenHowItWorks?: () => void;
  onOpenLegal?: (tab?: 'privacy' | 'terms') => void;
};

const DRAWER_WIDTH_RATIO = 0.75;
const ANIMATION_DURATION = 280;

export function SideDrawer({ visible, onClose, onOpenHowItWorks, onOpenLegal }: SideDrawerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = screenWidth * DRAWER_WIDTH_RATIO;
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const closeDuration = reducedMotion ? 0 : 200;
  // Hiç açılıp açılmadığını takip et — visible bir kez true olduktan sonra render yapılır
  const [hasEverOpened, setHasEverOpened] = useState(visible);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    void getStoredAuthSession().then(setAuthSession);
    const unsubscribe = subscribeAuthChanges(setAuthSession);
    return unsubscribe;
  }, []);

  async function handleDrawerGoogleSignIn() {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Giriş Yapılamadı', error instanceof UnsupportedAuthEnvironmentError
        ? error.message : 'Google ile giriş yapılırken bir sorun oluştu.');
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleDrawerSignOut() {
    Alert.alert(
      'Hesaptan Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            void signOut().catch(() => Alert.alert('Çıkış Yapılamadı', 'Oturum cihazdan temizlenemedi. Lütfen tekrar deneyin.'));
          },
        },
      ],
    );
  }

  async function performAccountDeletion(alsoClearLocalData: boolean) {
    try {
      await deleteAccount();
      if (alsoClearLocalData) {
        await clearLocalData(['scans', 'photos', 'favorites']);
      }
      onClose();
      Alert.alert('Hesap Silindi', 'Hesabınız ve hesaba bağlı kota kayıtlarınız silindi. Geçici kötüye kullanım önleme özeti gizlilik politikasındaki süre boyunca saklanır.');
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : 'Hesabınız silinirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.';
      Alert.alert('Hesap Silinemedi', message);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabımı Sil',
      'Hesap bilgileriniz silinecek. Yeniden açılan hesaplarda kotayı korumak için takma adlı kullanım kaydı her analizden yedi gün sonraki temizlik döngüsüne kadar saklanır. Bu işlem geri alınamaz. Cihazınızdaki geçmiş ve favoriler de silinsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sadece Hesabı Sil',
          style: 'destructive',
          onPress: () => void performAccountDeletion(false),
        },
        {
          text: 'Hesap ve Tüm Verileri Sil',
          style: 'destructive',
          onPress: () => void performAccountDeletion(true),
        },
      ],
    );
  }

  if (visible && !hasEverOpened) setHasEverOpened(true);

  useEffect(() => {
    if (reducedMotion) { progress.setValue(visible ? 1 : 0); return; }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? ANIMATION_DURATION : closeDuration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, progress, reducedMotion, closeDuration]);

  function navigateTo(path: string) {
    onClose();
    // Small delay so the drawer close animation plays before navigation
    setTimeout(() => {
      router.push(path as never);
    }, closeDuration);
  }

  const menuSections: MenuSection[] = [
    {
      id: 'guides',
      items: [
        {
          icon: <FontAwesome5 name="info-circle" size={20} color={colors.primary} solid />,
          label: 'Nasıl Çalışır?',
          onPress: () => {
            onClose();
            if (onOpenHowItWorks) {
              setTimeout(() => {
                onOpenHowItWorks();
              }, closeDuration);
            } else {
              setTimeout(() => {
                router.push({ pathname: '/', params: { openGuide: 'true' } } as never);
              }, closeDuration);
            }
          },
        },
        {
          icon: <MaterialIcons name="menu-book" size={22} color={colors.primary} />,
          label: 'Katkı Rehberi',
          onPress: () => navigateTo('/(tabs)/guide'),
        },
      ],
    },
    {
      id: 'personal',
      items: [
        {
          icon: <Fontisto name="favorite" size={20} color={colors.primary} />,
          label: 'Favorilerim',
          onPress: () => navigateTo('/favorites'),
        },
        {
          icon: <MaterialIcons name="history" size={22} color={colors.primary} />,
          label: 'Geçmiş',
          onPress: () => navigateTo('/(tabs)/explore'),
        },
      ],
    },
    {
      id: 'data',
      items: [
        ...(authSession
          ? [
              {
                icon: <MaterialIcons name="no-accounts" size={22} color={colors.error} />,
                label: 'Hesabımı Sil',
                onPress: handleDeleteAccount,
              },
            ]
          : []),
      ],
    },
    {
      id: 'legal',
      items: [
        {
          icon: <MaterialIcons name="privacy-tip" size={22} color={colors.primary} />,
          label: 'Gizlilik Politikası',
          onPress: () => {
            onClose();
            if (onOpenLegal) {
              setTimeout(() => {
                onOpenLegal('privacy');
              }, closeDuration);
            } else {
              setTimeout(() => {
                router.push({ pathname: '/', params: { openLegal: 'true', legalTab: 'privacy' } } as never);
              }, closeDuration);
            }
          },
        },
        {
          icon: <MaterialIcons name="description" size={22} color={colors.primary} />,
          label: 'Kullanım Koşulları',
          onPress: () => {
            onClose();
            if (onOpenLegal) {
              setTimeout(() => {
                onOpenLegal('terms');
              }, closeDuration);
            } else {
              setTimeout(() => {
                router.push({ pathname: '/', params: { openLegal: 'true', legalTab: 'terms' } } as never);
              }, closeDuration);
            }
          },
        },
      ],
    },
  ];

  // Hiç açılmadıysa render etme (ekstra bir katman kaydedilir)
  if (!visible && !hasEverOpened) {
    return null;
  }


  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] }) }],
          },
        ]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoGroup}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <Text style={styles.logoText}>Verinaliz</Text>
          </View>
          <Pressable
            accessibilityLabel="Menüyü kapat"
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            onPress={onClose}>
            <Text style={styles.closeButtonText}>{'\u00d7'}</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Menu Items */}
        <View style={styles.menuList}>
          {menuSections.map((section, sectionIndex) => (
            <Animated.View key={section.id} style={[styles.menuSection, {
              opacity: progress.interpolate({ inputRange: [sectionIndex * 0.08, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            }]}>
              {sectionIndex > 0 && <View style={styles.sectionDivider} />}
              {section.items.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={item.onPress}>
                  <View style={styles.menuIconContainer}>{item.icon}</View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </Animated.View>
          ))}
        </View>

        {/* Hesap / Google Giriş Bölümü */}
        <View style={styles.accountFooter}>
          <View style={styles.divider} />
          {authSession ? (
            <View style={styles.accountCard}>
              <View style={styles.accountAvatar}>
                <MaterialIcons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {authSession.user.name}
                </Text>
                {authSession.user.email && (
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {authSession.user.email}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityLabel="Çıkış Yap"
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => [styles.signOutButton, pressed && styles.closeButtonPressed]}
                onPress={handleDrawerSignOut}>
                <MaterialIcons name="logout" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.signInBox}>
              <Pressable
                accessibilityLabel="Google ile Giriş Yap"
                accessibilityRole="button"
                disabled={isSigningIn}
                style={({ pressed }) => [
                  styles.googleSignInBtn,
                  pressed && styles.closeButtonPressed,
                ]}
                onPress={() => void handleDrawerGoogleSignIn()}>
                {isSigningIn ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <AntDesign name="google" size={16} color={colors.onPrimary} />
                )}
                <Text style={styles.googleSignInBtnText}>
                  {isSigningIn ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap'}
                </Text>
              </Pressable>
              <EmailSignInButton disabled={isSigningIn} />
              <Text style={styles.signInHintText}>
                AI analiz kotanızı hesabınızla eşleştirin
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#00000066',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopRightRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardInternal,
    paddingTop: 56,
    paddingBottom: 16,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
  },
  logoText: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.cardInternal,
    backgroundColor: colors.outlineVariant,
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  menuSection: {},
  sectionDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  accountFooter: {
    paddingBottom: 32,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.cardInternal,
    paddingTop: 14,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 13.5,
  },
  accountEmail: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
  },
  signOutButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBox: {
    paddingHorizontal: spacing.cardInternal,
    paddingTop: 14,
    gap: 6,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 11,
  },
  googleSignInBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 13.5,
  },
  signInHintText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
  },
});
