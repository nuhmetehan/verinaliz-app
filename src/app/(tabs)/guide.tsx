import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentSources } from '@/components/assessment-sources';
import { LegalModal } from '@/components/legal-modal';
import { ContentSkeleton } from '@/components/content-skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { SideDrawer } from '@/components/side-drawer';
import { WelcomeGuideModal } from '@/components/welcome-guide-modal';
import { getAdditiveRiskBadge, type AdditiveRisk } from '@/constants/riskLabels';
import { colors, elevation, radius, spacing, typography } from '@/theme/theme';
import { parseIngredientDescription } from '@/utils/ingredientFormat';

const ADDITIVES_API_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/additives`;
const OTHER_CATEGORY = 'Diğer Katkı Maddeleri';

const categoryOrder = [
  'Riskli Bileşenler',
  'Kozmetik Bileşenleri',
  'Tatlandırıcılar',
  'Renklendiriciler',
  'Koruyucular',
  'Emülgatörler',
  'Stabilizatörler',
  'Kıvam Vericiler',
  'Asitlik Düzenleyiciler',
  'Antioksidanlar',
  'Kabartıcılar',
  'Jelleştiriciler',
  'Lezzet Arttırıcılar',
  OTHER_CATEGORY,
];

type CommonAdditive = {
  code: string;
  name: string;
  categories: string[];
  kategori?: string;
  risk: AdditiveRisk | null;
  description: string | null;
};

type GuideAdditive = {
  id: string;
  code: string;
  name: string;
  category: string;
  risk: AdditiveRisk | null;
  description: string | null;
};

type AdditiveSection = {
  title: string;
  data: GuideAdditive[];
};

function buildSections(additives: CommonAdditive[]): AdditiveSection[] {
  const groupedAdditives = new Map<string, GuideAdditive[]>();

  for (const additive of additives) {
    const rawCategories = Array.isArray(additive.categories) && additive.categories.length > 0
      ? additive.categories
      : additive.kategori
        ? [additive.kategori]
        : [];
    const categories = rawCategories.length > 0 ? rawCategories : [OTHER_CATEGORY];

    for (const category of categories) {
      const categoryAdditives = groupedAdditives.get(category) ?? [];
      const code = additive.code ?? '';
      categoryAdditives.push({
        id: `${category}-${code || additive.name}`,
        code,
        name: additive.name,
        category,
        risk: additive.risk,
        description: additive.description,
      });
      groupedAdditives.set(category, categoryAdditives);
    }
  }

  return [...groupedAdditives.entries()]
    .map(([title, data]) => ({
      title,
      data: data.sort((left, right) => {
        if (!left.code && !right.code) {
          return left.name.localeCompare(right.name, 'tr-TR');
        }
        if (!left.code) return 1;
        if (!right.code) return -1;
        return left.code.localeCompare(right.code, 'en', { numeric: true });
      }),
    }))
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left.title);
      const rightIndex = categoryOrder.indexOf(right.title);
      const leftOrder = leftIndex === -1 ? categoryOrder.length : leftIndex;
      const rightOrder = rightIndex === -1 ? categoryOrder.length : rightIndex;
      return leftOrder - rightOrder || left.title.localeCompare(right.title, 'tr-TR');
    });
}

const RISKY_INGREDIENTS_CATALOG: CommonAdditive[] = [
  {
    code: '',
    name: 'Palm Yağı',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Doymuş yağ oranı yüksektir; dengeli beslenmede günlük tüketim miktarına dikkat edilmesi önerilir.',
  },
  {
    code: '',
    name: 'Glikoz / Fruktoz Şurubu',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Nişasta bazlı sıvı şeker türevidir; serbest şeker tüketimini artırdığından porsiyon kontrolü tavsiye edilir.',
  },
  {
    code: '',
    name: 'Trans Yağ',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Hidrojenize bitkisel yağdır; Dünya Sağlık Örgütü (DSÖ) günlük alımının sınırlandırılmasını tavsiye etmektedir.',
  },
  {
    code: '',
    name: 'Maltodekstrin',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Glisemik indeksi yüksek bir karbonhidrattır; kan şekeri dengesini gözeten bireylerce dikkate alınmalıdır.',
  },
  {
    code: '',
    name: 'Maya Özütü',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Doğal olarak serbest glutamat içeren bir lezzet bileşenidir; hassasiyeti olan tüketiciler için listelenmiştir.',
  },
  {
    code: '',
    name: 'İnvert Şeker Şurubu',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Glikoz ve fruktoz içeren sıvı şekerdir; ilave şeker alımında porsiyona dikkat edilmesi önerilir.',
  },
  {
    code: '',
    name: 'Margarin / Bitkisel Susuz Yağ',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'İşlenmiş katı bitkisel yağdır; doymuş yağ içeriği nedeniyle dengeli tüketilmesi önerilir.',
  },
  {
    code: '',
    name: 'Mekanik Ayrılmış Et (MOM)',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Kemiklerden mekanik yöntemlerle ayrıştırılmış et bileşenidir; geleneksel kıyma veya parça ete göre farklı dokusal özelliklere sahiptir.',
  },
  {
    code: '',
    name: 'Hidrolize Bitkisel Protein (HVP)',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Bitkisel proteinlerin ayrıştırılmasıyla elde edilen lezzet bileşenidir; serbest glutamat içerir.',
  },
  {
    code: '',
    name: 'Kanola / Kolza Yağı',
    categories: ['Riskli Bileşenler'],
    risk: 'controversial',
    description: 'Rafine edilmiş bitkisel tohum yağıdır; yağ asitleri dengesi açısından porsiyon kontrolü önerilir.',
  },
  {
    code: '',
    name: 'Soya Proteini / İzolatı',
    categories: ['Riskli Bileşenler'],
    risk: 'controversial',
    description: 'Soya fasulyesinden elde edilen bitkisel proteindir; yaygın bir alerjen olup protein kaynağı olarak kullanılır.',
  },
  {
    code: '',
    name: 'Dekstroz / Malt Şurubu',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Hızlı sindirilen basit şeker türüdür; günlük toplam şeker sınırları içinde değerlendirilmelidir.',
  },
  {
    code: '',
    name: 'Modifiye Nişasta',
    categories: ['Riskli Bileşenler'],
    risk: 'controversial',
    description: 'Fiziksel veya enzimatik yöntemlerle kıvam özelliği geliştirilmiş nişastadır.',
  },
  {
    code: '',
    name: 'Doğala Özdeş / Yapay Aroma Vericiler',
    categories: ['Riskli Bileşenler'],
    risk: 'controversial',
    description: 'Gıdaya tat ve koku profili kazandırmak için formüle edilen bileşenlerdir.',
  },
  {
    code: '',
    name: 'Peynir Altı Suyu Tozu (Demineralize)',
    categories: ['Riskli Bileşenler'],
    risk: 'controversial',
    description: 'Peynir altı suyunun kurutulmasıyla elde edilen süt türevidir; doğal laktoz ve protein içerir.',
  },
  {
    code: '',
    name: 'Pamuk / Pamuk Çekirdeği Yağı',
    categories: ['Riskli Bileşenler'],
    risk: 'dangerous',
    description: 'Pamuk tohumlarından rafine edilen bitkisel tohum yağıdır; yüksek doymuş yağ profiline sahiptir.',
  },
];

function getGuideRiskBadge(risk?: AdditiveRisk | 'high' | 'medium' | null) {
  if (risk === 'high') return getAdditiveRiskBadge('dangerous');
  if (risk === 'medium') return getAdditiveRiskBadge('controversial');
  return getAdditiveRiskBadge(risk);
}

export default function GuideScreen() {
  const [sections, setSections] = useState<AdditiveSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdditive, setSelectedAdditive] = useState<GuideAdditive | null>(null);
  const selectedRiskBadge = getGuideRiskBadge(selectedAdditive?.risk);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const filteredSections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const simpleQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return sections;
    }

    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter((additive) => {
          const code = (additive.code || '').trim();
          const name = (additive.name || '').trim();

          const matchesCode = code.length > 0 && (
            code.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
            code.toLowerCase().includes(simpleQuery)
          );

          const matchesName =
            name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
            name.toLowerCase().includes(simpleQuery);

          return matchesCode || matchesName;
        }),
      }))
      .filter((section) => section.data.length > 0);
  }, [searchQuery, sections]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAdditives() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await axios.get<CommonAdditive[]>(ADDITIVES_API_URL, {
          signal: controller.signal,
          timeout: 15000,
        });

        const apiData = Array.isArray(response.data) ? response.data : [];
        const existingNames = new Set(
          apiData.map((item) => item.name.trim().toLowerCase()),
        );
        const missingRisky = RISKY_INGREDIENTS_CATALOG.filter(
          (catalogItem) => !existingNames.has(catalogItem.name.trim().toLowerCase()),
        );

        setSections(buildSections([...missingRisky, ...apiData]));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Katkı rehberi yüklenemedi:', error);
          setErrorMessage('Katkı rehberi yüklenemedi. Lütfen tekrar deneyin.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadAdditives();
    return () => controller.abort();
  }, [retryKey]);

  return (
    <>
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Katkı Rehberi" subtitle="İçerikleri daha yakından tanıyın" onNavigate={() => setDrawerVisible(true)}>
        <View style={styles.searchField}>
          <Feather name="search" size={19} color={colors.onSurfaceVariant} />
          <TextInput
            accessibilityLabel="E-kodu veya madde adı ara"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            placeholder="E-kodu veya madde adı ara"
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </ScreenHeader>
      {isLoading ? <View style={styles.loadingContent}><ContentSkeleton label="Katkı rehberi yükleniyor…" /></View> : errorMessage ? <View style={styles.stateContainer}>
        <Feather name="alert-circle" size={26} color={colors.primary} />
        <Text accessibilityRole="alert" style={styles.stateText}>{errorMessage}</Text>
        {errorMessage && !isLoading ? <Pressable accessibilityRole="button" style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]} onPress={() => setRetryKey((value) => value + 1)}>
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </Pressable> : null}
      </View> : <SectionList
        style={styles.body}
        sections={filteredSections}
        contentContainerStyle={styles.content}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={<AssessmentSources />}
        ListEmptyComponent={
          <View style={styles.emptyResults}>
            <Feather name="search" size={25} color={colors.primary} />
            <Text style={styles.emptyResultsText}>Aramanıza uygun katkı maddesi bulunamadı.</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const riskBadge = getGuideRiskBadge(item.risk);
          const hasCode = Boolean(item.code && item.code.trim());

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[item.code, item.name, riskBadge?.label].filter(Boolean).join(', ')}
              style={({ pressed }) => [styles.additiveRow, pressed && styles.additiveRowPressed]}
              onPress={() => setSelectedAdditive(item)}>
              <View style={styles.additiveContent}>
                {hasCode && <Text style={styles.code}>{item.code}</Text>}
                <Text style={styles.additiveName}>{item.name}</Text>
                {riskBadge && (
                  <View style={[styles.riskBadge, { backgroundColor: riskBadge.bg }]}>
                    <View style={[styles.riskDot, { backgroundColor: riskBadge.color }]} />
                    <Text style={[styles.riskLabel, { color: riskBadge.color }]}>{riskBadge.label}</Text>
                  </View>
                )}
              </View>
              <Feather name="chevron-right" size={19} color={colors.outline} />
            </Pressable>
          );
        }}
      />}

      <Modal
        transparent
        animationType="fade"
        visible={selectedAdditive !== null}
        onRequestClose={() => setSelectedAdditive(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAdditive?.code ? 'Katkı maddesi' : 'Bileşen detayı'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Detayı kapat"
                style={({ pressed }) => [styles.modalCloseButtonIcon, pressed && styles.additiveRowPressed]}
                onPress={() => setSelectedAdditive(null)}>
                <Feather name="x" size={21} color={colors.primary} />
              </Pressable>
            </View>

            {Boolean(selectedAdditive?.code && selectedAdditive.code.trim()) ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>{'Kod'}</Text>
                <Text style={styles.detailCode}>{selectedAdditive?.code}</Text>
              </View>
            ) : null}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>{'İsim'}</Text>
              <Text style={styles.detailValue}>{selectedAdditive?.name}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>{'Kategori'}</Text>
              <Text style={styles.detailValue}>{selectedAdditive?.category}</Text>
            </View>
            {selectedRiskBadge ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>{'Risk değerlendirmesi'}</Text>
                <View style={[styles.riskBadge, { backgroundColor: selectedRiskBadge.bg }]}>
                  <View style={[styles.riskDot, { backgroundColor: selectedRiskBadge.color }]} />
                  <Text style={[styles.riskLabel, { color: selectedRiskBadge.color }]}>{selectedRiskBadge.label}</Text>
                </View>
              </View>
            ) : null}
            {selectedAdditive?.description ? (() => {
              const parsed = parseIngredientDescription(selectedAdditive.description);
              return (
                <>
                  {parsed.category ? (
                    <View style={styles.detailBlock}>
                      <Text style={styles.detailLabel}>{'İşlev'}</Text>
                      <Text style={styles.detailValue}>{parsed.category}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>{'Açıklama'}</Text>
                    <Text style={styles.detailValue}>{parsed.description}</Text>
                  </View>
                </>
              );
            })() : null}

            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.modalCloseButton, pressed && styles.additiveRowPressed]} onPress={() => setSelectedAdditive(null)}>
              <Text style={styles.modalCloseButtonText}>{'Kapat'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>

    <SideDrawer
      visible={drawerVisible}
      onClose={() => setDrawerVisible(false)}
      onOpenHowItWorks={() => setIsGuideVisible(true)}
      onOpenLegal={(tab) => {
        setLegalModalTab(tab || 'privacy');
        setIsLegalModalVisible(true);
      }}
    />

    <WelcomeGuideModal
      visible={isGuideVisible}
      onClose={() => setIsGuideVisible(false)}
    />

    <LegalModal
      visible={isLegalModalVisible}
      initialTab={legalModalTab}
      onClose={() => setIsLegalModalVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.headerSurface }, // #f8f9fa
  content: {
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: spacing.containerPadding,
    paddingBottom: 48,
  },
  body: { flex: 1, backgroundColor: colors.background },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    minWidth: 0,
    minHeight: spacing.touchTarget,
    color: colors.onSurface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.stackGap,
    marginBottom: 8,
  },
  // Kategori başlığı: PlusJakartaSans_600SemiBold, #191c1d (headlineMd token'dan gelir)
  sectionTitle: { ...typography.headlineSm, flexShrink: 1, color: colors.onSurface }, // #191c1d
  // Madde sayısı çipi: açık nane zemin, nane yeşili metin
  sectionCount: {
    ...typography.labelSm,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    textAlign: 'center',
    color: colors.secondary, // #416656
    backgroundColor: colors.selectedSurface, // #c3ecd7
    borderRadius: radius.full,
  },
  // Katkı maddesi satırı: beyaz zemin, hafif gölge, 16px köşe
  additiveRow: {
    ...elevation.level1Card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
    marginBottom: 8,
    paddingHorizontal: spacing.cardInternal,
    paddingVertical: 14,
    borderRadius: radius.xl, // 16px — liste satırı için uygun
  },
  additiveRowPressed: { backgroundColor: colors.selectedSurface },
  additiveContent: { flex: 1, minWidth: 0, gap: 4 },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  riskLabel: { ...typography.labelMd, flexShrink: 1 },
  riskDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  code: { ...typography.labelMd, color: colors.primary }, // #01261f
  additiveName: { ...typography.bodyMd, fontFamily: typography.action.fontFamily, color: colors.onSurface }, // #191c1d
  // Boş arama sonucu kartı: beyaz zemin, 16px köşe
  emptyResults: {
    ...elevation.level1Card,
    gap: 10,
    alignItems: 'center',
    marginTop: spacing.stackGap,
    padding: spacing.cardInternal,
    borderRadius: radius.xl, // 16px
  },
  emptyResultsText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  loadingContent: { flex: 1, padding: spacing.mobileMargin, backgroundColor: colors.background },
  stateContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.inlineGap,
    padding: spacing.cardInternal,
  },
  stateText: { ...typography.bodyLg, color: colors.onSurface, textAlign: 'center' },
  retryButton: {
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.primary, // #01261f
  },
  retryPressed: { backgroundColor: colors.primaryContainer },
  retryButtonText: { ...typography.action, color: colors.onPrimary },
  // Modal arka planı: %40 opak siyah — açık tema için daha hafif
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.mobileMargin,
    backgroundColor: '#00000066',
  },
  // Modal kartı: saf beyaz (#ffffff), 24px köşe, hafif gölge
  modalCard: {
    flexGrow: 0,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    alignSelf: 'center',
    borderRadius: radius.xxl, // 24px
    backgroundColor: colors.surfaceContainerLowest, // #ffffff explicit
  },
  modalContent: { padding: spacing.cardInternal, gap: spacing.inlineGap },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...typography.headlineSm, flexShrink: 1, color: colors.onSurface }, // #191c1d
  modalCloseButtonIcon: { width: spacing.touchTarget, height: spacing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLow },
  // Detay bloğu: çok açık zemin (#f3f4f5), koyu metin
  detailBlock: {
    gap: 4,
    padding: spacing.inlineGap,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow, // #f3f4f5
  },
  detailLabel: { ...typography.labelMd, color: colors.onSurfaceVariant }, // #414846
  detailCode: { ...typography.headlineMd, color: colors.primary }, // #01261f
  detailValue: { ...typography.bodyLg, color: colors.onSurface }, // #191c1d
  // Kapat butonu: açık nane zemin, koyu yeşil metin — temiz ve ağır basmayan
  modalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchTarget,
    marginTop: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.selectedSurface, // #c3ecd7
  },
  modalCloseButtonText: {
    ...typography.bodyMd,
    color: colors.onSecondaryContainer, // #476c5b
    fontWeight: '700',
  },
});
