import { AntDesign, Entypo, Feather, MaterialIcons } from '@expo/vector-icons';
import axios, { isAxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraCaptureModal } from '@/components/camera-capture-modal';
import { AssessmentSources } from '@/components/assessment-sources';
import { AnalysisFeedback } from '@/components/analysis-feedback';
import { EmailSignInButton } from '@/components/email-sign-in';
import { UnsupportedAuthEnvironmentError } from '@/utils/authRedirect';
import { AI_PRIVACY_NOTICE, aiConsentHeaders } from '@/utils/aiPrivacy';
import { discardPhoto, supportsPhotoPrivacy, type PreparedPhoto } from '@/utils/photoPrivacy';
import { RenameTitleModal } from '@/components/rename-title-modal';
import { getAdditiveRiskBadge, type AdditiveRisk } from '@/constants/riskLabels';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { parseIngredientDescription } from '@/utils/ingredientFormat';
import {
  type AuthSession,
  getStoredAuthSession,
  getValidAccessToken,
  signInWithGoogle,
  signOut,
  subscribeAuthChanges,
} from '@/utils/auth';
import {
  calculatePhotoRiskLevel,
  generatePhotoAnalysisTitle,
  type PhotoAnalysisRecord,
  savePhotoAnalysis,
  updatePhotoAnalysisTitle,
} from '@/utils/photoAnalysisHistory';


if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error(
    '[Verinaliz] EXPO_PUBLIC_API_URL ortam değişkeni tanımlı değil. ' +
    '.env.local dosyasını oluşturup değeri girin.',
  );
}
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const ANALYZE_IMAGE_API_URL = `${API_BASE_URL}/api/analyze-ingredients-image`;
const ANALYZE_MEAL_API_URL = `${API_BASE_URL}/api/analyze-meal-image`;
const ANALYSIS_QUOTA_API_URL = `${API_BASE_URL}/api/analysis-quota`;

export const MEAL_PLATE_DISCLAIMER_TEXT =
  'Kesin ölçüm değildir; pişirme yağı, sos, alerjen, gramaj vb. görselden anlaşılmayan içerikler olabileceği için yalnızca yaklaşık aralık sunulur. Yapay zeka hata yapabilir, son karar kullanıcıya aittir.';

function clearPhotoDrafts(drafts: Set<string>) {
  for (const uri of drafts) void discardPhoto(uri);
  drafts.clear();
}

export type AnalysisQuota = {
  total: number;
  remaining: number;
  meal_total?: number;
  meal_remaining?: number;
  label_pending?: number;
  meal_pending?: number;
  next_available_at?: string | null;
  meal_next_available_at?: string | null;
};

function formatQuotaTime(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export type DetectedAdditive = {
  code: string;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  risk?: AdditiveRisk | null;
};

export type DetectedFlaggedIngredient = {
  name: string;
  risk?: string | null;
  description?: string | null;
};

export type NutritionLevel = 'high' | 'moderate' | 'low' | 'neutral';

export type NutritionEvaluation = {
  nutrient: string;
  label: string;
  value: string;
  level: NutritionLevel;
  message: string;
};

export type NutritionData = {
  basis?: string | null;
  serving_size?: string | null;
  calories?: number | null;
  carbs?: number | null;
  sugar?: number | null;
  fiber?: number | null;
  protein?: number | null;
  fat?: number | null;
  saturated_fat?: number | null;
  salt?: number | null;
  evaluations?: NutritionEvaluation[];
};

export type DetectedMealItem = {
  name: string;
  estimated_portion_range?: string | null;
  estimated_calories_range?: string | null;
  notes?: string | null;
};

export type EstimatedMealTotals = {
  calories_range?: string | null;
  protein_range?: string | null;
  carbs_range?: string | null;
  fat_range?: string | null;
};

export type AnalysisResult = {
  analysis_type?: 'label' | 'meal_plate';
  label_type?: 'food' | 'cosmetic' | 'meal_plate';
  meal_title?: string | null;
  summary?: string | null;
  has_ingredients?: boolean;
  has_nutrition?: boolean;
  ingredients_text: string;
  ingredients_list?: string[];
  additives: DetectedAdditive[];
  flagged_ingredients: DetectedFlaggedIngredient[];
  nutrition?: NutritionData | null;
  detected_items?: DetectedMealItem[];
  estimated_totals?: EstimatedMealTotals | null;
  unseen_factors?: string[];
  disclaimer?: string | null;
  quota?: AnalysisQuota;
  remaining_quota?: number;
  meal_remaining_quota?: number;
};

type NutritionFieldKey =
  | 'calories'
  | 'carbs'
  | 'sugar'
  | 'fat'
  | 'saturated_fat'
  | 'protein'
  | 'fiber'
  | 'salt';

const NUTRITION_FIELDS: {
  key: NutritionFieldKey;
  label: string;
  unit: string;
  evaluationNutrient: string;
}[] = [
  { key: 'calories', label: 'Kalori', unit: 'kcal', evaluationNutrient: 'calories' },
  { key: 'carbs', label: 'Karbonhidrat', unit: 'g', evaluationNutrient: 'carbs' },
  { key: 'sugar', label: 'Şeker', unit: 'g', evaluationNutrient: 'sugar' },
  { key: 'fat', label: 'Yağ', unit: 'g', evaluationNutrient: 'fat' },
  { key: 'saturated_fat', label: 'Doymuş Yağ', unit: 'g', evaluationNutrient: 'saturated_fat' },
  { key: 'protein', label: 'Protein', unit: 'g', evaluationNutrient: 'protein' },
  { key: 'fiber', label: 'Lif', unit: 'g', evaluationNutrient: 'fiber' },
  { key: 'salt', label: 'Tuz', unit: 'g', evaluationNutrient: 'salt' },
];

function getEvaluationBadge(level?: NutritionLevel, nutrientKey?: string) {
  if (!level) return null;

  const isPositiveNutrient =
    nutrientKey && ['protein', 'fiber', 'lif'].includes(nutrientKey.toLowerCase());

  if (isPositiveNutrient) {
    if (level === 'high') {
      return { label: 'Zengin', color: colors.risk.safe, bg: colors.riskSurface.safe };
    }
    if (level === 'moderate') {
      return { label: 'Kaynak', color: colors.risk.safe, bg: colors.riskSurface.safe };
    }
    return null;
  }

  switch (level) {
    case 'high':
      return { label: 'Yüksek', color: colors.risk.high, bg: colors.riskSurface.high };
    case 'moderate':
      return { label: 'Orta', color: colors.risk.medium, bg: colors.riskSurface.medium };
    case 'low':
      return { label: 'Düşük', color: colors.risk.safe, bg: colors.riskSurface.safe };
    default:
      return null;
  }
}

function cleanSummaryText(summary?: string | null): string {
  if (!summary) return '';
  const sentences = summary.split(/(?<=[.!?])\s+/);
  const filtered = sentences.filter((s) => {
    const hasCalorieOrNutrientNumbers =
      /(?:\d+\s*(?:kcal|kalori|kj)|\b(?:100g|100\s*g|porsiyon)\b)/i.test(s) &&
      /(?:enerji|yağ|karbonhidrat|şeker|protein|tuz|lif|doymuş)/i.test(s);
    return !hasCalorieOrNutrientNumbers;
  });
  const cleaned = filtered.join(' ').trim();
  return cleaned || summary.trim();
}

function getServingBasisLabel(nutrition?: NutritionData | null): string {
  if (!nutrition) return "100g'da";
  if (nutrition.basis === 'porsiyon') {
    return 'Porsiyon Başına';
  }
  if (nutrition.basis === '100ml') {
    return '100ml için';
  }
  return '100g için';
}

function getPortionLabel(nutrition?: NutritionData | null): string | null {
  if (!nutrition?.serving_size) return null;
  const raw = nutrition.serving_size.trim();
  if (!raw || /^100\s*(g|ml)$/i.test(raw)) return null;
  if (nutrition.basis === 'porsiyon') return null;
  if (/^1\s*porsiyon/i.test(raw) || /^porsiyon/i.test(raw)) {
    return raw;
  }
  return `Porsiyon: ${raw}`;
}

type IngredientAlert = {
  hasAlert: boolean;
  color: string;
};

function normalizeForMatching(value: string): string {
  return value
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .toLowerCase()
    .trim();
}

function getIngredientAlert(
  ingredient: string,
  flaggedIngredients: DetectedFlaggedIngredient[],
  additives: DetectedAdditive[],
): IngredientAlert {
  const normIngredient = normalizeForMatching(ingredient);

  // 1. Check flagged ingredients
  for (const flagged of flaggedIngredients) {
    if (!flagged.name) continue;
    const normFlagged = normalizeForMatching(flagged.name);
    const parts = normFlagged.split(/[/(),]/).map((p) => p.trim()).filter((p) => p.length >= 3);
    const matches =
      normIngredient.includes(normFlagged) ||
      normFlagged.includes(normIngredient) ||
      parts.some((p) => normIngredient.includes(p));

    if (matches) {
      const isDangerous =
        flagged.risk?.toLowerCase() === 'high' ||
        flagged.risk?.toLowerCase() === 'dangerous';
      return {
        hasAlert: true,
        color: isDangerous ? colors.risk.high : colors.risk.medium,
      };
    }
  }

  // 2. Check additives
  for (const additive of additives) {
    if (additive.code) {
      const digitsMatch = additive.code.match(/\d{3,4}[a-z]?/i);
      if (digitsMatch) {
        const codeRegex = new RegExp(`E[-\\s]*${digitsMatch[0]}\\b`, 'i');
        if (codeRegex.test(normIngredient)) {
          const isDangerous = additive.risk === 'dangerous';
          return {
            hasAlert: true,
            color: isDangerous ? colors.risk.high : colors.risk.medium,
          };
        }
      }
    }

    if (additive.name) {
      const normName = normalizeForMatching(additive.name);
      if (
        normName.length >= 4 &&
        normName !== normalizeForMatching(additive.code) &&
        (normIngredient.includes(normName) || normName.includes(normIngredient))
      ) {
        const isDangerous = additive.risk === 'dangerous';
        return {
          hasAlert: true,
          color: isDangerous ? colors.risk.high : colors.risk.medium,
        };
      }
    }
  }

  return {
    hasAlert: false,
    color: colors.outlineVariant,
  };
}

function parseIngredientText(raw: string): { title: string; subtitle?: string } {
  const trimmed = raw.trim();
  const firstParen = trimmed.indexOf('(');
  if (firstParen !== -1) {
    const title = trimmed.slice(0, firstParen).trim();
    const remainder = trimmed.slice(firstParen).trim();
    const subtitle = remainder.replace(/^\(/, '').replace(/\)$/, '').trim();
    if (title && subtitle) {
      return { title, subtitle };
    }
  }
  return { title: trimmed };
}

export type IngredientAnalysisModalProps = {
  visible: boolean;
  onClose: () => void;
  initialRecord?: PhotoAnalysisRecord | null;
  initialMode?: 'label' | 'meal';
  onTitleChange?: (id: string, newTitle: string) => void;
  onOpenLegal?: (tab?: 'privacy' | 'terms') => void;
};

function getFlaggedRisk(risk?: string | null): AdditiveRisk | null {
  switch (risk?.toLowerCase()) {
    case 'high':
    case 'dangerous':
      return 'dangerous';
    case 'medium':
    case 'moderate':
    case 'controversial':
      return 'controversial';
    case 'safe':
      return 'safe';
    default:
      return null;
  }
}

export function IngredientAnalysisModal(props: IngredientAnalysisModalProps) {
  if (!props.visible) return null;
  return <IngredientAnalysisContent key={props.initialRecord?.id ?? props.initialMode ?? 'label'} {...props} />;
}

function IngredientAnalysisContent({
  visible,
  onClose,
  initialRecord,
  initialMode = 'label',
  onTitleChange,
  onOpenLegal,
}: IngredientAnalysisModalProps) {
  const { width, fontScale } = useWindowDimensions();
  const stackedLayout = width < 360 || fontScale >= 1.4;
  const [analysisMode, setAnalysisMode] = useState<'label' | 'meal'>(initialMode);
  const [selectedAssets, setSelectedAssets] = useState<PreparedPhoto[]>([]);
  const [initialImageUris] = useState<string[]>(() => initialRecord?.imageUris?.length
    ? initialRecord.imageUris : initialRecord?.imageUri ? [initialRecord.imageUri] : []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(initialRecord?.result ?? null);
  const [showRawText, setShowRawText] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>(initialRecord?.title || 'Analiz Tamamlandı');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(initialRecord?.id ?? null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [quotaRefresh, setQuotaRefresh] = useState(0);
  const [quota, setQuota] = useState<AnalysisQuota | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [reviewedPhotos, setReviewedPhotos] = useState<{ assets: PreparedPhoto[]; mode: 'label' | 'meal' } | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const analysisLock = useRef(false);
  const photoDrafts = useRef(new Set<string>());

  // Every new photo set or analysis purpose requires a fresh confirmation.
  const photoReviewed = reviewedPhotos?.assets === selectedAssets && reviewedPhotos.mode === analysisMode
    && selectedAssets.every(asset => asset.privacyChecked);

  function handleSwitchMode(nextMode: 'label' | 'meal') {
    setReviewedPhotos(null);
    setAnalysisMode(nextMode);
    if (nextMode === 'meal' && selectedAssets.length > 1) {
      handleRemoveAsset(1);
    }
  }

  useEffect(() => {
    const drafts = photoDrafts.current;
    const unsubscribe = subscribeAuthChanges((nextSession) => {
      setAuthSession(nextSession);
      if (!nextSession) {
        setQuota(null);
        setCameraVisible(false);
        clearPhotoDrafts(drafts);
        setSelectedAssets([]);
        setReviewedPhotos(null);
      }
    });
    return () => {
      unsubscribe();
      clearPhotoDrafts(drafts);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessionAndQuota() {
      try {
        const storedSession = await getStoredAuthSession();
        setAuthSession(storedSession);

        if (!storedSession) {
          setQuota(null);
          return;
        }

        const token = await getValidAccessToken();
        if (!token) {
          setAuthSession(null);
          setQuota(null);
          return;
        }

        const response = await axios.get<AnalysisQuota>(ANALYSIS_QUOTA_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          signal: controller.signal,
        });

        if (!controller.signal.aborted && typeof response.data?.remaining === 'number') setQuota(response.data);
      } catch (error) {
        if (!controller.signal.aborted) {
          if (isAxiosError(error) && error.response?.status === 401) {
            await signOut();
            setAuthSession(null);
            setQuota(null);
          } else {
            setQuota(null);
            console.error('Kota sorgulanamadı.');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAuthChecking(false);
        }
      }
    }

    void loadSessionAndQuota();

    return () => controller.abort();
  }, [quotaRefresh]);

  useEffect(() => {
    const times = [quota?.next_available_at, quota?.meal_next_available_at]
      .filter((t): t is string => Boolean(t)).map(Date.parse).filter(Number.isFinite);
    if (quota?.label_pending || quota?.meal_pending) times.push(Date.now() + 5000);
    if (!times.length) return;
    const timer = setTimeout(() => setQuotaRefresh(n => n + 1), Math.max(1000, Math.min(...times) - Date.now() + 500));
    return () => clearTimeout(timer);
  }, [quota]);

  async function handleGoogleSignIn() {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const authResult = await signInWithGoogle();
      if (authResult) {
        setAuthSession(authResult.session);
        setQuota(authResult.quota);
      }
    } catch (error) {
      let message = 'Google ile giriş yapılırken bir sorun oluştu. Lütfen tekrar deneyin.';
      if (isAxiosError(error) && error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error instanceof UnsupportedAuthEnvironmentError) {
        message = error.message;
      }
      Alert.alert('Giriş Yapılamadı', message);
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleConfirmSignOut() {
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

  async function handleSaveNewTitle(newTitle: string) {
    setCurrentTitle(newTitle);
    if (currentRecordId) {
      await updatePhotoAnalysisTitle(currentRecordId, newTitle);
      onTitleChange?.(currentRecordId, newTitle);
    }
  }

  function handleClose() {
    if (!analysisLock.current) {
      clearPhotoDrafts(photoDrafts.current);
      setSelectedAssets([]);
      setReviewedPhotos(null);
      onClose();
    }
  }

  const labelTotal = quota?.total ?? 3;
  const labelRemaining = Math.min(quota?.remaining ?? labelTotal, labelTotal);
  const mealTotal = quota?.meal_total ?? 2;
  const mealRemaining = Math.min(quota?.meal_remaining ?? mealTotal, mealTotal);

  const nextTime = formatQuotaTime(analysisMode === 'meal' ? quota?.meal_next_available_at : quota?.next_available_at);
  const activeRemaining = analysisMode === 'meal' ? mealRemaining : labelRemaining;

  async function takePhoto() {
    if (!supportsPhotoPrivacy) return;
    if (!authSession) {
      Alert.alert('Giriş Gerekli', 'Analiz yapabilmek için lütfen Google hesabınızla giriş yapın.');
      return;
    }

    if (activeRemaining === 0) {
      Alert.alert(
        'Limit Doldu',
        nextTime ? 'Sıradaki hakkınız ' + nextTime + ' itibarıyla açılır.' : 'Bu analiz türü için son yedi günlük hakkınız dolu.',
      );
      return;
    }

    setCameraVisible(true);
  }

  function handleAddSecondImage() {
    if (analysisMode === 'meal' || selectedAssets.length >= 2) return;
    Alert.alert(
      '2. Fotoğrafı Ekle',
      'Ambalajın diğer yüzünü (Besin Tablosu veya İçindekiler) ekleyin. Tek hak tüketilir:',
      [
        { text: 'Kamera ile Çek', onPress: () => void takePhoto() },
        { text: 'İptal', style: 'cancel' },
      ],
    );
  }

  function handleRemoveAsset(indexToRemove: number) {
    const asset = selectedAssets[indexToRemove];
    if (asset && photoDrafts.current.delete(asset.uri)) void discardPhoto(asset.uri);
    setSelectedAssets((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  function confirmAnalysis() {
    if (!selectedAssets.length || isAnalyzing || !photoReviewed) return;
    Alert.alert('Fotoğraf gönderimine onay',
      'Kırpılan karelerin analiz için Railway’deki Verinaliz sunucusuna ve Cloudflare Workers AI’a gönderilmesine onay veriyor musunuz?',
      [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla ve gönder', onPress: () => void analyzeSelectedImages() }]);
  }

  async function analyzeSelectedImages() {
    if (analysisLock.current) return;
    analysisLock.current = true;
    try { await performImageAnalysis(); }
    catch { Alert.alert('Analiz başlatılamadı', 'Lütfen bağlantınızı kontrol edip tekrar deneyin.'); }
    finally { analysisLock.current = false; }
  }

  async function performImageAnalysis() {
    if (selectedAssets.length === 0 || isAnalyzing || !photoReviewed || !supportsPhotoPrivacy) return;

    const token = await getValidAccessToken();
    if (selectedAssets.some(asset => !photoDrafts.current.has(asset.uri))) return;
    if (!token || !authSession) {
      Alert.alert('Oturum Gerekli', 'Analiz yapabilmek için lütfen Google hesabınızla giriş yapın.');
      return;
    }

    const isMealMode = analysisMode === 'meal';
    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    for (const asset of selectedAssets) {
      formData.append(isMealMode ? 'image' : 'images', {
        uri: asset.uri,
        name: 'analysis.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
    }

    try {
      const endpoint = isMealMode ? ANALYZE_MEAL_API_URL : ANALYZE_IMAGE_API_URL;
      const response = await axios.post<AnalysisResult>(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...aiConsentHeaders(analysisMode, photoReviewed),
        },
        timeout: 70000,
      });

      const analysisResult = response.data;
      setResult(analysisResult);

      if (analysisResult.quota) setQuota(analysisResult.quota);
      else setQuotaRefresh(n => n + 1);

      const riskLevel = calculatePhotoRiskLevel(analysisResult);
      const generatedTitle = generatePhotoAnalysisTitle(analysisResult);
      setCurrentTitle(generatedTitle);

      const uris = selectedAssets.map((a) => a.uri);
      for (const uri of uris) photoDrafts.current.delete(uri);
      savePhotoAnalysis({
        imageUri: uris[0],
        imageUris: uris,
        riskLevel,
        title: generatedTitle,
        result: analysisResult,
      })
        .then((saved) => setCurrentRecordId(saved.id))
        .catch((error) => console.error('Analiz geçmişe kaydedilemedi:', error));

    } catch (error) {
      // Axios errors may include the Authorization header and photo request body.
      console.error('Görsel analizi başarısız.');
      let errorMessage = 'Görsel analiz edilirken bir sorun oluştu. Lütfen tekrar deneyin.';

      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          await signOut();
          setAuthSession(null);
          setQuota(null);
          errorMessage =
            error.response?.data?.error ??
            'Oturumunuz sona erdi. Lütfen Google hesabınızla tekrar giriş yapın.';
        } else if (error.response?.data?.error) {
          const details = error.response.data;
          if (details.quota) setQuota(details.quota);
          errorMessage = details.error;
          const reset = formatQuotaTime(details.provider_reset_at);
          if (reset) errorMessage += ' Ortak ücretsiz kapasite ' + reset + ' itibarıyla yenilenir.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage =
            'Analiz isteği zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
        }
      }

      Alert.alert('Analiz Başarısız', errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const isMealResult =
    result?.analysis_type === 'meal_plate' || result?.label_type === 'meal_plate';
  const isCosmeticResult = result?.label_type === 'cosmetic';

  const hasDangerousAdditives =
    result?.additives?.some((additive) => additive.risk === 'dangerous') ?? false;
  const hasFlagged = (result?.flagged_ingredients?.length ?? 0) > 0;
  const hasHighNutrition =
    result?.nutrition?.evaluations?.some((e) => e.level === 'high') ?? false;
  const isCompletelySafe =
    result !== null && !isMealResult && !hasFlagged && !hasDangerousAdditives && !hasHighNutrition;

  const hasNutritionData = Boolean(
    !isMealResult &&
      result?.nutrition &&
      (
        result.nutrition.calories !== null ||
        result.nutrition.sugar !== null ||
        result.nutrition.fat !== null ||
        result.nutrition.protein !== null ||
        result.nutrition.carbs !== null ||
        (result.nutrition.evaluations && result.nutrition.evaluations.length > 0)
      ),
  );

  const ingredientsChips =
    Array.isArray(result?.ingredients_list) && result.ingredients_list.length > 0
      ? result.ingredients_list
      : result?.ingredients_text
        ? result.ingredients_text
            .replace(/^([iİıI]çindekiler|[iİıI]cindekiler|ingredients)\s*:\s*/i, '')
            .split(',')
            .map((item) => item.trim().replace(/^[-*•.]\s*/, '').replace(/[.;]+$/, '').trim())
            .filter(Boolean)
        : [];

  const displayedThumbnails =
    selectedAssets.length > 0
      ? selectedAssets.map((a) => a.uri)
      : initialImageUris;

  const modalHeaderTitle = result
    ? isMealResult
      ? 'AI Öğün Analizi'
      : isCosmeticResult
        ? 'AI Kozmetik İçerik Analizi'
        : 'AI Etiket & Besin Analizi'
    : analysisMode === 'meal'
      ? 'AI Öğün Analizi'
      : 'AI Etiket Analizi (Gıda & Kozmetik)';

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Üst Bar */}
        <View style={styles.headerBar}>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {modalHeaderTitle}
          </Text>
          <Pressable
            accessibilityLabel="Kapat"
            accessibilityRole="button"
            disabled={isAnalyzing}
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.buttonPressed,
              isAnalyzing && styles.buttonDisabled,
            ]}>
            <Feather name="x" size={21} color={colors.primary} />
          </Pressable>
        </View>

        {/* Yükleniyor Durumu */}
        {isAnalyzing && (
          <ScrollView contentContainerStyle={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text accessibilityLiveRegion="polite" style={styles.loadingTitle}>
              {analysisMode === 'meal'
                ? 'Öğün ve Porsiyonlar İnceleniyor...'
                : 'Etiket ve İçerikler İnceleniyor...'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {analysisMode === 'meal'
                ? 'Yapay zeka öğündeki görünen yiyecekleri ve yaklaşık porsiyon/besin aralıklarını tahmin ediyor'
                : 'Yapay zeka gıda veya kozmetik içindekiler metnini, bileşenleri ve besin tablosunu analiz ediyor'}
            </Text>
          </ScrollView>
        )}

        {/* Başlangıç Seçim / Önizleme Ekranı */}
        {!isAnalyzing && !result && (
          <ScrollView
            style={styles.emptyScrollView}
            contentContainerStyle={styles.emptyContainer}
            showsVerticalScrollIndicator={false}>
            {/* Mod Seçici Sekmeler */}
            <View style={[styles.modeTabsContainer, stackedLayout && styles.modeTabsStacked]}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: analysisMode === 'label' }}
                style={({ pressed }) => [
                  styles.modeTabButton,
                  stackedLayout && styles.modeTabButtonStacked,
                  analysisMode === 'label' && styles.modeTabButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleSwitchMode('label')}>
                <MaterialIcons
                  name="document-scanner"
                  size={17}
                  color={analysisMode === 'label' ? colors.primary : colors.onSurfaceVariant}
                />
                <View style={styles.modeTabTextCol}>
                  <Text
                    style={[
                      styles.modeTabTitle,
                      analysisMode === 'label' && styles.modeTabTitleActive,
                    ]}>
                    Etiket Analizi
                  </Text>
                  <Text
                    style={[
                      styles.modeTabSub,
                      analysisMode === 'label' && styles.modeTabSubActive,
                    ]}>
                    Gıda & Kozmetik {quota && <>({labelRemaining}/{labelTotal})</>}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: analysisMode === 'meal' }}
                style={({ pressed }) => [
                  styles.modeTabButton,
                  stackedLayout && styles.modeTabButtonStacked,
                  analysisMode === 'meal' && styles.modeTabButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleSwitchMode('meal')}>
                <MaterialIcons
                  name="restaurant"
                  size={17}
                  color={analysisMode === 'meal' ? colors.primary : colors.onSurfaceVariant}
                />
                <View style={styles.modeTabTextCol}>
                  <Text
                    style={[
                      styles.modeTabTitle,
                      analysisMode === 'meal' && styles.modeTabTitleActive,
                    ]}>
                    Öğün Analizi
                  </Text>
                  <Text
                    style={[
                      styles.modeTabSub,
                      analysisMode === 'meal' && styles.modeTabSubActive,
                    ]}>
                    Yaklaşık Tahmin {quota && <>({mealRemaining}/{mealTotal})</>}
                  </Text>
                </View>
              </Pressable>
            </View>

            {selectedAssets.length === 0 ? (
              <>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons
                    name={analysisMode === 'meal' ? 'restaurant' : 'document-scanner'}
                    size={40}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {analysisMode === 'meal'
                    ? 'Öğün Fotoğrafı Çekin'
                    : 'Gıda veya Kozmetik Etiketi Çekin'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {analysisMode === 'meal'
                    ? 'Öğününüzün (örn. pirinç pilavı, tavuk, salata) üstten ve net göründüğü bir fotoğraf çekin. Sistem yalnızca görünen yiyecekleri yaklaşık aralıklarla tahmin etmeye çalışır.'
                    : 'Gıda ürünlerinin (İçindekiler / Besin Tablosu) veya kozmetik ürünlerin (İçindekiler / Ingredients) fotoğrafını çekin. İkisi farklı yüzlerdeyse 2. fotoğrafı da ekleyebilirsiniz.'}
                </Text>

                {/* Öğün Modunda Bilgilendirme Kartı */}
                {analysisMode === 'meal' && (
                  <View style={styles.mealPreWarningCard}>
                    <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                    <Text style={styles.disclaimerText}>{MEAL_PLATE_DISCLAIMER_TEXT}</Text>
                  </View>
                )}

                {!supportsPhotoPrivacy ? (
                  <View style={styles.quotaWarningCard}>
                    <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                    <Text style={styles.disclaimerText}>
                      Fotoğraflı analiz için cihazda gizlilik kontrolünü destekleyen güncel Verinaliz mobil uygulamasını açın.
                    </Text>
                  </View>
                ) : isAuthChecking && !authSession ? (
                  <View style={styles.authLoadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.authLoadingText}>Hesap durumu kontrol ediliyor...</Text>
                  </View>
                ) : !authSession ? (
                  <View style={styles.authRequiredCard}>
                    <View style={styles.authCardHeader}>
                      <View style={styles.authGoogleBadge}>
                        <AntDesign name="google" size={20} color="#4285F4" />
                      </View>
                      <View style={styles.authCardTextGroup}>
                        <Text style={styles.authCardTitle}>Hesabınızla Giriş Yapın</Text>
                        <Text style={styles.authCardSubtitle}>
                          Yedi günde {labelTotal} etiket ve {mealTotal} öğün analizi için giriş yapın.
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityLabel="Google ile Giriş Yap"
                      accessibilityRole="button"
                      disabled={isSigningIn}
                      style={({ pressed }) => [
                        styles.googleSignInButton,
                        pressed && styles.buttonPressed,
                        isSigningIn && styles.buttonDisabled,
                      ]}
                      onPress={() => void handleGoogleSignIn()}>
                      {isSigningIn ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <AntDesign name="google" size={18} color={colors.onPrimary} />
                      )}
                      <Text style={styles.googleSignInButtonText}>
                        {isSigningIn ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap'}
                      </Text>
                    </Pressable>
                    <EmailSignInButton disabled={isSigningIn} onSignedIn={({ session, quota: nextQuota }) => {
                      setAuthSession(session);
                      setQuota(nextQuota);
                    }} />
                  </View>
                ) : (
                  <>
                    {/* Bağlı Hesap Çipi */}
                    <View style={styles.accountRowChip}>
                      <MaterialIcons name="verified-user" size={16} color={colors.primary} />
                      <Text style={styles.accountEmailText} numberOfLines={1}>
                        {authSession.user.email || authSession.user.name}
                      </Text>
                      <Pressable
                        accessibilityLabel="Hesaptan Çıkış Yap"
                        accessibilityRole="button"
                        hitSlop={8}
                        style={styles.accountLogoutBtn}
                        onPress={handleConfirmSignOut}>
                        <MaterialIcons name="logout" size={15} color={colors.onSurfaceVariant} />
                      </Pressable>
                    </View>

                    {/* Rozet: Fotoğraf çekme butonlarının üzerine */}
                    <View
                      style={[
                        styles.quotaBadge,
                        activeRemaining === 0
                          ? styles.quotaBadgeExhausted
                          : activeRemaining <= 1
                            ? styles.quotaBadgeWarning
                            : styles.quotaBadgeNormal,
                      ]}>
                      <Text
                        style={[
                          styles.quotaBadgeText,
                          activeRemaining === 0
                            ? styles.quotaBadgeTextExhausted
                            : activeRemaining <= 1
                              ? styles.quotaBadgeTextWarning
                              : styles.quotaBadgeTextNormal,
                        ]}>
                        {quota ? <>Son 7 gün · Etiket {labelRemaining}/{labelTotal} · Öğün {mealRemaining}/{mealTotal}</> : 'Kota bilgisi alınamadı'}
                      </Text>
                      {nextTime ? (
                        <Text style={styles.quotaNextTimeText}>
                          Sıradaki {analysisMode === 'meal' ? 'öğün' : 'etiket'} hakkı {nextTime}
                        </Text>
                      ) : null}
                    </View>

                    {activeRemaining === 0 ? (
                      <View style={styles.quotaWarningCard}>
                        <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                        <Text style={styles.disclaimerText}>
                          {(analysisMode === 'meal' ? quota?.meal_pending : quota?.label_pending)
                            ? 'Devam eden analiziniz tamamlandığında haklarınız güncellenecek.'
                            : 'Bu analiz türü için son yedi günlük hakkınız dolu.'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.actionButtonsRow}>
                        <Pressable
                          accessibilityLabel="Kamera ile Çek"
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.primaryActionButton,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() => void takePhoto()}>
                          <MaterialIcons name="photo-camera" size={20} color={colors.onPrimary} />
                          <Text style={styles.primaryActionButtonText}>Kamera ile Çek</Text>
                        </Pressable>

                      </View>
                    )}
                  </>
                )}
              </>
            ) : (
              /* Fotoğraflar seçildi: Önizleme ve 2. Yüz Ekleme Ekranı */
              <View style={styles.stagingContainer}>
                <Text style={styles.stagingTitle}>
                  {analysisMode === 'meal' ? 'Çekilen Öğün Fotoğrafı' : 'Çekilen Ambalaj Yüzleri'}
                </Text>
                <Text style={styles.stagingSubtitle}>
                  {analysisMode === 'meal'
                    ? 'Öğün fotoğrafınız hazır. Yaklaşık porsiyon ve kalori aralığı tahmini için başlatabilirsiniz.'
                    : selectedAssets.length === 1
                      ? '1 fotoğraf hazır. Farklı yüzdeyse besin tablosunu veya içindekiler listesini de ekleyebilirsiniz.'
                      : '2 yüz hazır. Her ikisi de tek bir hak kullanılarak analiz edilecek.'}
                </Text>

                <View style={styles.stagingPhotosRow}>
                  {selectedAssets.map((asset, index) => (
                    <View key={`${asset.uri}-${index}`} style={styles.stagingPhotoCard}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1}. fotoğrafı tam ekranda incele`}
                        onPress={() => setPreviewUri(asset.uri)}>
                      <Image source={{ uri: asset.uri }} style={styles.stagingPhotoThumbnail} />
                      </Pressable>
                      <View style={styles.stagingPhotoLabel}>
                        <Text style={styles.stagingPhotoLabelText}>
                          {analysisMode === 'meal'
                            ? 'Öğün Fotoğrafı'
                            : index === 0
                              ? '1. Fotoğraf'
                              : '2. Fotoğraf'}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel="Fotoğrafı Kaldır"
                        accessibilityRole="button"
                        style={styles.stagingRemoveBtn}
                        onPress={() => handleRemoveAsset(index)}>
                        <MaterialIcons name="close" size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}

                  {analysisMode === 'label' && selectedAssets.length === 1 && (
                    <Pressable
                      accessibilityLabel="2. Yüzü Ekle"
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.stagingAddPhotoCard,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={handleAddSecondImage}>
                      <MaterialIcons name="add-a-photo" size={26} color={colors.primary} />
                      <Text style={styles.stagingAddPhotoText}>+ 2. Yüzü Ekle</Text>
                      <Text style={styles.stagingAddPhotoSubtext}>(Besin / İçindekiler)</Text>
                    </Pressable>
                  )}
                </View>

                {/* Bilgilendirme Notu */}
                {analysisMode === 'meal' ? (
                  <View style={styles.mealPreWarningCard}>
                    <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                    <Text style={styles.disclaimerText}>{MEAL_PLATE_DISCLAIMER_TEXT}</Text>
                  </View>
                ) : (
                  <View style={styles.stagingHintBox}>
                    <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                    <Text style={styles.disclaimerText}>
                      İçindekiler ve besin değerleri tablosu ambalajın farklı yüzlerindeyse iki kareyi birlikte yükleyebilirsiniz. Tek analiz hakkı tüketilir.
                    </Text>
                  </View>
                )}

                <Text style={styles.privacyNoticeText}>{AI_PRIVACY_NOTICE}</Text>
                <Pressable accessibilityRole="checkbox" accessibilityLabel="Kırpılan kareleri kişisel bilgiler açısından kontrol ettim"
                  accessibilityState={{ checked: photoReviewed }}
                  onPress={() => setReviewedPhotos(photoReviewed ? null : { assets: selectedAssets, mode: analysisMode })} style={styles.privacyNoticeRuleRow}>
                  <MaterialIcons name={photoReviewed ? 'check-box' : 'check-box-outline-blank'} size={24} color={colors.primary} />
                  <Text style={[styles.privacyNoticeText, { flex: 1 }]}>Kırpılan kareleri inceledim. Karelerde kişisel, hassas veya gizli bilgi bulunmadığını onaylıyorum.</Text>
                </Pressable>
                {/* Analizi Başlat Butonu */}
                <Pressable
                  accessibilityLabel="Analizi Başlat"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !photoReviewed }}
                  disabled={!photoReviewed}
                  style={({ pressed }) => [
                    styles.primaryActionButton,
                    styles.stagingStartButton,
                    !photoReviewed && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={confirmAnalysis}>
                  <MaterialIcons name="auto-awesome" size={20} color={colors.onPrimary} />
                  <Text style={styles.primaryActionButtonText}>
                    {analysisMode === 'meal'
                      ? 'Öğün Analizini Başlat (1 Hak)'
                      : 'Analizi Başlat (1 Hak)'}
                  </Text>
                </Pressable>

                {/* Temizle Butonu */}
                <Pressable
                  accessibilityLabel="Fotoğrafları Değiştir"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.stagingClearButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    clearPhotoDrafts(photoDrafts.current);
                    setSelectedAssets([]);
                    setReviewedPhotos(null);
                  }}>
                  <Text style={styles.stagingClearButtonText}>Fotoğrafı Temizle</Text>
                </Pressable>
              </View>
            )}

            {/* Gizlilik ve Çekim Rehberi Bilgi Kartı */}
            <View style={styles.privacyNoticeCard}>
              <View style={styles.privacyNoticeHeader}>
                <MaterialIcons name="privacy-tip" size={18} color={colors.onSurface} />
                <Text style={styles.privacyNoticeHeaderTitle}>Gizlilik & Çekim Rehberi</Text>
              </View>

              <Text style={styles.privacyNoticeText}>
                {AI_PRIVACY_NOTICE}
              </Text>

              <View style={styles.privacyNoticeRuleRow}>
                <Entypo name="warning" size={16} color={colors.onSurface} style={styles.privacyNoticeRuleIcon} />
                <Text style={styles.privacyNoticeRuleText}>
                  {analysisMode === 'meal' ? (
                    <>
                      Lütfen yalnızca <Text style={styles.boldText}>öğününüzü</Text> çekiniz. İnsan görüntüsü veya kişisel veri içeren kareler yüklemeyiniz.
                    </>
                  ) : (
                    <>
                      Lütfen yalnızca ürünün <Text style={styles.boldText}>&ldquo;İçindekiler / Ingredients&rdquo;</Text> veya <Text style={styles.boldText}>&ldquo;Besin Değerleri&rdquo;</Text> tablosunu çekiniz. İnsan görüntüsü veya kişisel veri içeren kareler yüklemeyiniz.
                    </>
                  )}
                </Text>
              </View>

              {onOpenLegal ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gizlilik Politikasını İncele"
                  style={({ pressed }) => [
                    styles.privacyNoticeLinkButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => onOpenLegal('privacy')}>
                  <MaterialIcons name="privacy-tip" size={14} color={colors.onSurface} />
                  <Text style={styles.privacyNoticeLinkText}>Gizlilik Politikasını İncele →</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        )}

        {/* Sonuç Ekranı */}
        {!isAnalyzing && result && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Fotoğraf(lar) ve Başlık Bilgisi */}
            <View style={styles.topResultRow}>
              {displayedThumbnails.length > 0 && (
                <View style={styles.previewThumbnailsRow}>
                  {displayedThumbnails.map((uri, idx) => (
                    <Image key={`${uri}-${idx}`} source={{ uri }} style={styles.previewThumbnail} />
                  ))}
                </View>
              )}
              <View style={styles.topResultInfo}>
                <View style={styles.resultTypeBadge}>
                  <Text style={styles.resultTypeBadgeText}>
                    {isMealResult
                      ? 'Yaklaşık Öğün Analizi'
                      : isCosmeticResult
                        ? 'Kozmetik Etiket Analizi'
                        : 'Gıda Etiketi & Besin Analizi'}
                  </Text>
                </View>
                <View style={styles.topResultTitleRow}>
                  <Text style={styles.topResultTitle} numberOfLines={2}>
                    {currentTitle}
                  </Text>
                  <Pressable
                    accessibilityLabel="İsmi Düzenle"
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.editTitleButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setShowRenameModal(true)}>
                    <MaterialIcons name="edit" size={14} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ÖĞÜN ANALİZİ SONUÇ EKRANI */}
            {isMealResult ? (
              <>
                {/* Kesin Ölçüm Değildir Bilgilendirmesi (En Üstte Vurgulu) */}
                <View style={styles.mealDisclaimerHighlightCard}>
                  <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                  <Text style={styles.disclaimerText}>
                    {result.disclaimer || MEAL_PLATE_DISCLAIMER_TEXT}
                  </Text>
                </View>

                {/* Genel Öğün Gözlemi */}
                {result.summary ? (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <MaterialIcons name="restaurant-menu" size={20} color={colors.primary} />
                      <Text style={styles.summaryHeaderTitle}>Genel Öğün Gözlemi</Text>
                    </View>
                    <Text style={styles.summaryText}>{result.summary}</Text>
                    <View style={styles.aiGeneratedBadge}>
                      <MaterialIcons name="auto-awesome" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.aiGeneratedText}>
                        Yapay zeka tarafından yalnızca görseldeki unsurlara göre tahmin edilmiştir
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Yaklaşık Toplam Değer Aralıkları */}
                {result.estimated_totals && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Yaklaşık Toplam Aralıklar</Text>
                      <View style={styles.servingBadge}>
                        <Text style={styles.servingBadgeText}>Tahmini Aralık</Text>
                      </View>
                    </View>
                    <View style={styles.nutritionGrid}>
                      {result.estimated_totals.calories_range ? (
                        <View style={[styles.nutritionCard, stackedLayout && styles.nutritionCardFull]}>
                          <Text style={styles.nutritionLabel}>Yaklaşık Kalori</Text>
                          <Text style={styles.nutritionValue}>
                            {result.estimated_totals.calories_range}
                          </Text>
                        </View>
                      ) : null}
                      {result.estimated_totals.protein_range ? (
                        <View style={[styles.nutritionCard, stackedLayout && styles.nutritionCardFull]}>
                          <Text style={styles.nutritionLabel}>Yaklaşık Protein</Text>
                          <Text style={styles.nutritionValue}>
                            {result.estimated_totals.protein_range}
                          </Text>
                        </View>
                      ) : null}
                      {result.estimated_totals.carbs_range ? (
                        <View style={[styles.nutritionCard, stackedLayout && styles.nutritionCardFull]}>
                          <Text style={styles.nutritionLabel}>Yaklaşık Karbonhidrat</Text>
                          <Text style={styles.nutritionValue}>
                            {result.estimated_totals.carbs_range}
                          </Text>
                        </View>
                      ) : null}
                      {result.estimated_totals.fat_range ? (
                        <View style={[styles.nutritionCard, stackedLayout && styles.nutritionCardFull]}>
                          <Text style={styles.nutritionLabel}>Yaklaşık Yağ</Text>
                          <Text style={styles.nutritionValue}>
                            {result.estimated_totals.fat_range}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Öğünde Görünen Yiyecekler */}
                {Array.isArray(result.detected_items) && result.detected_items.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Öğünde Görünen Yiyecekler</Text>
                      <View style={styles.badgeCount}>
                        <Text style={styles.badgeCountText}>{result.detected_items.length}</Text>
                      </View>
                    </View>

                    {result.detected_items.map((item, idx) => (
                      <View key={`${item.name}-${idx}`} style={styles.mealItemCard}>
                        <View style={styles.mealItemHeader}>
                          <Text style={styles.mealItemTitle}>{item.name}</Text>
                        </View>
                        <View style={styles.mealItemRangesRow}>
                          {item.estimated_portion_range ? (
                            <View style={styles.mealRangeChip}>
                              <MaterialIcons name="scale" size={13} color={colors.primary} />
                              <Text style={styles.mealRangeChipText}>
                                {item.estimated_portion_range}
                              </Text>
                            </View>
                          ) : null}
                          {item.estimated_calories_range ? (
                            <View style={styles.mealRangeChip}>
                              <MaterialIcons
                                name="local-fire-department"
                                size={13}
                                color={colors.primary}
                              />
                              <Text style={styles.mealRangeChipText}>
                                {item.estimated_calories_range}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <Text style={styles.mealItemNotes}>{item.notes}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Görselden Anlaşılamayan Faktörler */}
                {Array.isArray(result.unseen_factors) && result.unseen_factors.length > 0 && (
                  <View style={styles.unseenFactorsCard}>
                    <View style={styles.evaluationsHeader}>
                      <MaterialIcons name="visibility-off" size={18} color={colors.onSurfaceVariant} />
                      <Text style={styles.evaluationsTitle}>
                        Görselden Anlaşılamayan Faktörler
                      </Text>
                    </View>
                    {result.unseen_factors.map((factor, idx) => (
                      <View key={`factor-${idx}`} style={styles.evaluationRow}>
                        <View
                          style={[
                            styles.evaluationDot,
                            { backgroundColor: colors.risk.medium },
                          ]}
                        />
                        <Text style={styles.evaluationMessage}>{factor}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              /* GIDA VEYA KOZMETİK ETİKET ANALİZİ SONUÇ EKRANI */
              <>
                {/* İçerik Özeti Kartı */}
                {cleanSummaryText(result.summary) ? (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <MaterialIcons name="notes" size={20} color={colors.primary} />
                      <Text style={styles.summaryHeaderTitle}>
                        {isCosmeticResult ? 'Kozmetik İçerik Özeti' : 'İçerik ve Besin Özeti'}
                      </Text>
                    </View>
                    <Text style={styles.summaryText}>{cleanSummaryText(result.summary)}</Text>
                    <View style={styles.aiGeneratedBadge}>
                      <MaterialIcons name="auto-awesome" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.aiGeneratedText}>Yapay zeka tarafından üretilmiştir</Text>
                    </View>
                  </View>
                ) : null}

                {/* Besin Değerleri Bölümü (Yalnızca Gıda) */}
                {hasNutritionData && result.nutrition && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleWithBadge}>
                        <Text style={styles.sectionTitle}>Besin Değerleri</Text>
                        <View style={styles.servingBadge}>
                          <Text style={styles.servingBadgeText}>
                            {getServingBasisLabel(result.nutrition)}
                          </Text>
                        </View>
                        {getPortionLabel(result.nutrition) ? (
                          <View style={styles.portionBadge}>
                            <Text style={styles.portionBadgeText}>
                              {getPortionLabel(result.nutrition)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* 2 Sütunlu Besin Kartları Izgarası */}
                    <View style={styles.nutritionGrid}>
                      {NUTRITION_FIELDS.map(({ key, label, unit, evaluationNutrient }) => {
                        const value = result.nutrition?.[key];
                        if (value === null || value === undefined) return null;
                        const evaluation = result.nutrition?.evaluations?.find(
                          (e) =>
                            e.nutrient.toLowerCase() === evaluationNutrient.toLowerCase() ||
                            e.label.toLowerCase() === label.toLowerCase(),
                        );
                        const evalBadge = getEvaluationBadge(evaluation?.level, evaluationNutrient);

                        return (
                          <View key={key} style={[styles.nutritionCard, stackedLayout && styles.nutritionCardFull]}>
                            <View style={styles.nutritionCardHeader}>
                              <Text style={styles.nutritionLabel}>{label}</Text>
                              {evalBadge && (
                                <View style={[styles.nutritionEvalBadge, { backgroundColor: evalBadge.bg }]}>
                                  <Text style={[styles.nutritionEvalBadgeText, { color: evalBadge.color }]}>
                                    {evalBadge.label}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.nutritionValue}>
                              {typeof value === 'number' ? `${value.toFixed(1)} ${unit}` : `${value} ${unit}`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* DSÖ Kriterli Besin Değerlendirme Listesi */}
                    {result.nutrition.evaluations && result.nutrition.evaluations.length > 0 && (
                      <View style={styles.nutritionEvaluationsCard}>
                        <View style={styles.evaluationsHeader}>
                          <MaterialIcons name="fact-check" size={18} color={colors.primary} />
                          <Text style={styles.evaluationsTitle}>Besin Öğesi Değerlendirmesi</Text>
                        </View>
                        {result.nutrition.evaluations.map((evalItem, index) => {
                          const isPositive = ['protein', 'fiber', 'lif'].includes(evalItem.nutrient.toLowerCase());
                          const badge = getEvaluationBadge(evalItem.level, evalItem.nutrient);
                          const dotColor = isPositive ? colors.risk.safe : (badge ? badge.color : colors.outline);
                          return (
                            <View key={`${evalItem.nutrient}-${index}`} style={styles.evaluationRow}>
                              <View style={[styles.evaluationDot, { backgroundColor: dotColor }]} />
                              <Text style={styles.evaluationMessage}>{evalItem.message}</Text>
                            </View>
                          );
                        })}
                        <Text style={styles.nutritionFootnote}>
                          * Renk ve seviye eşikleri Dünya Sağlık Örgütü (DSÖ) 100g gıda referanslarına dayanır.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Hiçbir Risk Bulunamadıysa Onay Kartı */}
                {isCompletelySafe && (
                  <View style={styles.safeBannerCard}>
                    <View style={styles.safeIconCircle}>
                      <MaterialIcons name="check" size={22} color="#ffffff" />
                    </View>
                    <View style={styles.safeBannerContent}>
                      <Text style={styles.safeBannerTitle}>
                        {isCosmeticResult
                          ? 'Dikkat çeken kozmetik bileşen tespit edilmedi'
                          : 'Riskli veya aşırı içerik tespit edilmedi'}
                      </Text>
                      <Text style={styles.safeBannerDescription}>
                        {isCosmeticResult
                          ? 'Okunabilen içerikte listemizdeki uyarılar eşleşmedi. Bu sonuç, ürünün alerji veya hassasiyet oluşturmayacağını garanti etmez.'
                          : 'Okunan etikette bilinen yüksek riskli bir bileşen, tehlikeli katkı maddesi veya aşırı şeker/tuz bulunamadı.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dikkat Çeken İçerikler Bölümü */}
                {result.flagged_ingredients.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {isCosmeticResult ? 'Dikkat Çeken Kozmetik Bileşenler' : 'Dikkat Çeken İçerikler'}
                      </Text>
                      <View style={styles.badgeCount}>
                        <Text style={styles.badgeCountText}>
                          {result.flagged_ingredients.length}
                        </Text>
                      </View>
                    </View>

                    {result.flagged_ingredients.map((item, index) => {
                      const riskBadge = getAdditiveRiskBadge(getFlaggedRisk(item.risk));
                      const { category: role, description: cleanDesc } = parseIngredientDescription(
                        item.description,
                      );

                      return (
                        <View
                          key={`${item.name}-${index}`}
                          style={styles.flaggedCard}>
                          <Text style={styles.flaggedChipText}>{item.name}</Text>
                          {riskBadge && (
                            <View style={[styles.riskBadge, { backgroundColor: riskBadge.bg }]}>
                              <Text style={[styles.riskBadgeText, { color: riskBadge.color }]}>{riskBadge.label}</Text>
                            </View>
                          )}
                          {role ? (
                            <View style={styles.flaggedRoleBadge}>
                              <Text style={styles.flaggedRoleLabel}>İşlev: </Text>
                              <Text style={styles.flaggedRoleValue}>{role}</Text>
                            </View>
                          ) : null}
                          {cleanDesc ? (
                            <Text style={styles.flaggedDescription}>{cleanDesc}</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Katkı Maddeleri Bölümü */}
                {result.additives.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {isCosmeticResult ? 'Kozmetik Bileşen Analizi' : 'Katkı Maddeleri'}
                      </Text>
                      <View style={styles.badgeCount}>
                        <Text style={styles.badgeCountText}>{result.additives.length}</Text>
                      </View>
                    </View>

                    {result.additives.map((additive, index) => {
                      const riskBadge = getAdditiveRiskBadge(additive.risk);
                      return (
                        <View
                          key={`${additive.code}-${index}`}
                          style={styles.additiveCard}>
                          <View style={styles.additiveHeader}>
                            <View style={styles.additiveCodeBadge}>
                              <Text style={styles.additiveCodeText}>{additive.code}</Text>
                            </View>
                            {riskBadge ? (
                              <View style={[styles.riskBadge, { backgroundColor: riskBadge.bg }]}>
                                <Text style={[styles.riskBadgeText, { color: riskBadge.color }]}>
                                  {riskBadge.label}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {additive.name && additive.name !== additive.code ? (
                            <Text style={styles.additiveName}>{additive.name}</Text>
                          ) : null}
                          {additive.category ? (
                            <Text style={styles.additiveCategory}>{additive.category}</Text>
                          ) : null}
                          {additive.description ? (
                            <Text style={styles.additiveDescription}>{additive.description}</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Okunan İçindekiler */}
                {ingredientsChips.length > 0 || result.ingredients_text ? (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {isCosmeticResult ? 'Okunan Kozmetik Bileşenleri' : 'Okunan İçindekiler'}
                      </Text>
                      {ingredientsChips.length > 0 && (
                        <View style={styles.badgeCount}>
                          <Text style={styles.badgeCountText}>{ingredientsChips.length}</Text>
                        </View>
                      )}
                    </View>

                    {ingredientsChips.length > 0 && (
                      <View style={styles.ingredientsListCard}>
                        {ingredientsChips.map((ingredient, index) => {
                          const alert = getIngredientAlert(
                            ingredient,
                            result.flagged_ingredients ?? [],
                            result.additives ?? [],
                          );
                          const dotColor = alert.hasAlert ? alert.color : colors.outlineVariant;
                          const { title, subtitle } = parseIngredientText(ingredient);
                          const isLast = index === ingredientsChips.length - 1;

                          return (
                            <View
                              key={`${ingredient}-${index}`}
                              style={[
                                styles.ingredientRow,
                                !isLast && styles.ingredientRowBorder,
                              ]}>
                              <View
                                style={[
                                  styles.ingredientRowDot,
                                  { backgroundColor: dotColor },
                                  subtitle ? styles.ingredientRowDotWithSubtitle : null,
                                ]}
                              />
                              <View style={styles.ingredientRowContent}>
                                <Text style={styles.ingredientRowTitle}>{title}</Text>
                                {alert.hasAlert && <Text style={[styles.riskBadgeText, { color: alert.color }]}>Dikkat çeken içerik</Text>}
                                {subtitle ? (
                                  <Text style={styles.ingredientRowSubtitle}>{subtitle}</Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {result.ingredients_text ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.toggleRawButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => setShowRawText((prev) => !prev)}>
                        <Text style={styles.toggleRawButtonText}>
                          {showRawText ? 'Ham Metni Gizle' : 'Ham Metni Göster'}
                        </Text>
                      </Pressable>
                    ) : null}

                    {showRawText && result.ingredients_text ? (
                      <View style={styles.rawTextContainer}>
                        <Text style={styles.rawText}>{result.ingredients_text}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}

            <AssessmentSources />
            <AnalysisFeedback key={currentRecordId ?? 'new'} mode={isMealResult ? 'meal' : isCosmeticResult ? 'cosmetic' : 'label'} />

            {/* Yasal Bilgilendirme */}
            {!isMealResult && (
              <View style={styles.disclaimerBox}>
                <Entypo name="warning" size={18} color={colors.onSurface} style={styles.disclaimerIcon} />
                <Text style={styles.disclaimerText}>
                  {isCosmeticResult
                    ? 'Yapay zeka analizi kozmetik içerik okuryazarlığını destekleme amaçlıdır; dermatolojik teşhis, tedavi veya tıbbi tavsiye niteliği taşımaz. Alerji ve cilt hassasiyetleri kişiden kişiye değişebilir; ambalaj üzerindeki resmi üretici etiketi esastır ve son karar kullanıcıya aittir.'
                    : 'Yapay zeka analizi etiket ve besin okuryazarlığını destekleme amaçlıdır; tıbbi teşhis, tedavi veya kişisel diyet tavsiyesi niteliği taşımaz. Besin öğesi referansları genel bilgilendirme amaçlı olup ambalaj üzerindeki resmi üretici etiketi esastır.'}
                </Text>
              </View>
            )}

            {/* Alt Buton */}
            <View style={styles.bottomButtonsRow}>
              <Pressable
                accessibilityLabel="Kapat"
                accessibilityRole="button"
                style={({ pressed }) => [styles.bottomCloseButton, pressed && styles.buttonPressed]}
                onPress={handleClose}>
                <Text style={styles.bottomCloseButtonText}>Kapat</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {cameraVisible && <CameraCaptureModal
        mode={analysisMode}
        onClose={() => setCameraVisible(false)}
        onCapture={(photo) => {
          const maxCount = analysisMode === 'meal' ? 1 : 2;
          if (authSession && selectedAssets.length < maxCount) {
            photoDrafts.current.add(photo.uri);
            setSelectedAssets(previous => [...previous, photo]);
          } else {
            void discardPhoto(photo.uri);
          }
          setCameraVisible(false);
        }}
      />}

      {previewUri && <Modal visible animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf önizlemesini kapat"
            onPress={() => setPreviewUri(null)} style={{ padding: 20 }}>
            <Text style={{ color: colors.onSurface }}>Önizlemeyi kapat</Text>
          </Pressable>
          <Image source={{ uri: previewUri }} resizeMode="contain" style={{ flex: 1 }} />
          <Text style={{ color: colors.onSurface, padding: 20 }}>Fotoğrafta insan görüntüsü, kişisel belge, adres veya sağlık bilgisi bulunmadığını kontrol edin.</Text>
        </SafeAreaView>
      </Modal>}

      <RenameTitleModal
        visible={showRenameModal}
        initialTitle={currentTitle}
        onSave={handleSaveNewTitle}
        onClose={() => setShowRenameModal(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.mobileMargin,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.headerSurface,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    ...typography.headlineSm,
    flex: 1,
    color: colors.primary,
  },
  closeButton: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  loadingContainer: {
    flexGrow: 1,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  loadingTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  loadingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyScrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: spacing.mobileMargin,
    paddingVertical: 20,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  quotaBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  quotaBadgeNormal: {
    backgroundColor: `${colors.primary}12`,
    borderColor: `${colors.primary}30`,
  },
  quotaBadgeWarning: {
    backgroundColor: colors.riskSurface.medium,
    borderColor: `${colors.risk.medium}40`,
  },
  quotaBadgeExhausted: {
    backgroundColor: colors.riskSurface.high,
    borderColor: `${colors.risk.high}40`,
  },
  quotaBadgeIcon: {
    fontSize: 14,
  },
  quotaBadgeText: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  quotaNextTimeText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    textAlign: 'center',
  },
  quotaBadgeTextNormal: {
    color: colors.primary,
  },
  quotaBadgeTextWarning: {
    color: colors.risk.medium,
  },
  quotaBadgeTextExhausted: {
    color: colors.risk.high,
  },
  quotaWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    width: '100%',
  },
  actionButtonsRow: {
    width: '100%',
    gap: 12,
  },
  primaryActionButton: {
    minHeight: spacing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryActionButtonText: {
    ...typography.action,
    flexShrink: 1,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  secondaryActionButton: {
    minHeight: spacing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  secondaryActionButtonText: {
    ...typography.action,
    flexShrink: 1,
    color: colors.onSurface,
    fontWeight: '600',
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  privacyNoticeCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 18,
    gap: 8,
    width: '100%',
  },
  privacyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyNoticeHeaderIcon: {
    fontSize: 16,
  },
  privacyNoticeHeaderTitle: {
    ...typography.action,
    flexShrink: 1,
    color: colors.onSurface,
    fontWeight: '700',
  },
  privacyNoticeText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    fontSize: 12,
  },
  privacyNoticeRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: 2,
  },
  privacyNoticeRuleIcon: {
    marginTop: 1,
  },
  privacyNoticeRuleText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  privacyNoticeLinkButton: {
    minHeight: spacing.touchTarget,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
  },
  privacyNoticeLinkText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: spacing.mobileMargin,
    paddingTop: 16,
    paddingBottom: 40,
    gap: spacing.stackGap,
  },
  topResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  previewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  topResultInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  topResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  topResultTitle: {
    ...typography.headlineSm,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    fontWeight: '700',
  },
  editTitleButton: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTitleIcon: {
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: colors.headerSurface,
    borderRadius: radius.xl,
    padding: 16,
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryHeaderTitle: {
    ...typography.headlineSm,
    flexShrink: 1,
    color: colors.onSurface,
    fontWeight: '700',
  },
  summaryText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  aiGeneratedText: {
    ...typography.bodySm,
    flexShrink: 1,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  safeBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.riskSurface.safe,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    gap: 12,
  },
  safeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeIconText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  safeBannerContent: {
    flex: 1,
    gap: 2,
  },
  safeBannerTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    lineHeight: 22,
    color: colors.primary,
    fontWeight: '700',
  },
  safeBannerDescription: {
    ...typography.bodySm,
    color: colors.secondary,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.headlineSm,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: colors.selectedSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeCountText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  flaggedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 6,
  },
  flaggedChipText: { ...typography.action, color: colors.onSurface },
  flaggedRoleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 2,
    marginBottom: 2,
  },
  flaggedRoleLabel: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  flaggedRoleValue: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  flaggedDescription: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  additiveCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 4,
  },
  additiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  additiveCodeBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  additiveCodeText: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.onSurface,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  riskBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  additiveName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  additiveCategory: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  additiveDescription: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  ingredientsListCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLowest,
  },
  ingredientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  ingredientRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  ingredientRowDotWithSubtitle: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  ingredientRowContent: {
    flex: 1,
    gap: 2,
  },
  ingredientRowTitle: {
    ...typography.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    fontWeight: '600',
  },
  ingredientRowSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  toggleRawButton: {
    minHeight: spacing.touchTarget,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  toggleRawButtonText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  rawTextContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginTop: 8,
  },
  rawText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginTop: 8,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimerText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    textAlign: 'left',
  },
  bottomCloseButton: {
    minHeight: spacing.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  bottomCloseButtonText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  bottomButtonsRow: {
    gap: 8,
    marginTop: 10,
  },
  previewThumbnailsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  servingBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  servingBadgeText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 11,
  },
  portionBadge: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  portionBadgeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 11,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  nutritionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 4,
  },
  nutritionCardFull: { flexBasis: '100%' },
  nutritionCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  nutritionValue: {
    ...typography.headlineMd,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  nutritionEvalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  nutritionEvalBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  nutritionEvaluationsCard: {
    marginTop: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 8,
  },
  evaluationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evaluationsTitle: {
    ...typography.headlineSm,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    fontWeight: '700',
  },
  evaluationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  evaluationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  evaluationMessage: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  nutritionFootnote: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  stagingContainer: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  stagingTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  stagingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
  stagingPhotosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 6,
  },
  stagingPhotoCard: {
    width: 130,
    minHeight: 155,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    position: 'relative',
  },
  stagingPhotoThumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  stagingPhotoLabel: {
    minHeight: 35,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  stagingPhotoLabelText: {
    ...typography.labelSm,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 11,
  },
  stagingRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagingAddPhotoCard: {
    width: 130,
    minHeight: 155,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: colors.surfaceContainerLowest,
    gap: 4,
  },
  stagingAddPhotoText: {
    ...typography.labelSm,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
  },
  stagingAddPhotoSubtext: {
    ...typography.labelSm,
    color: colors.outline,
    textAlign: 'center',
    fontSize: 10,
  },
  stagingHintBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stagingStartButton: {
    width: '100%',
    paddingVertical: 14,
    marginTop: 4,
  },
  stagingClearButton: {
    minHeight: spacing.touchTarget,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stagingClearButtonText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  authLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  authLoadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  authRequiredCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 16,
    gap: 14,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  authCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authGoogleBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCardTextGroup: {
    flex: 1,
    gap: 3,
  },
  authCardTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
    fontWeight: '700',
  },
  authCardSubtitle: {
    ...typography.bodySm,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.onSurfaceVariant,
  },
  googleSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.lg,
    paddingVertical: 13,
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  googleSignInButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  accountRowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 6,
    maxWidth: '92%',
  },
  accountEmailText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  accountLogoutBtn: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 16,
    gap: 6,
  },
  modeTabsStacked: { flexDirection: 'column' },
  modeTabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: spacing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTabButtonStacked: { flex: 0 },
  modeTabButtonActive: { backgroundColor: colors.selectedSurface, borderColor: colors.secondary },
  modeTabTextCol: { flex: 1, minWidth: 0, gap: 2 },
  modeTabTitle: { ...typography.action, color: colors.onSurface },
  modeTabTitleActive: { color: colors.primary },
  modeTabSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
  modeTabSubActive: { color: colors.onSecondaryFixedVariant },
  mealPreWarningCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  resultTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 2,
  },
  resultTypeBadgeText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  mealDisclaimerHighlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mealItemCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 8,
  },
  mealItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealItemTitle: {
    ...typography.headlineSm,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onSurface,
    fontWeight: '700',
  },
  mealItemRangesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealRangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  mealRangeChipText: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  mealItemNotes: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 18,
  },
  unseenFactorsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 8,
  },
});
