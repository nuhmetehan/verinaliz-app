import AsyncStorage from '@react-native-async-storage/async-storage';

import { type AnalysisResult } from '@/components/ingredient-analysis-modal';

const PHOTO_ANALYSIS_STORAGE_KEY = '@foodscan/photo-analysis-history';
const MAX_HISTORY_ITEMS = 50;

export type PhotoAnalysisRiskLevel = 'high' | 'medium' | 'safe';

export type PhotoAnalysisRecord = {
  id: string;
  timestamp: number;
  imageUri?: string;
  imageUris?: string[];
  riskLevel: PhotoAnalysisRiskLevel;
  title: string; // İlk bileşenin adı veya "İçindekiler Analizi"
  result: AnalysisResult;
};

function isPhotoAnalysisRecord(value: unknown): value is PhotoAnalysisRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.timestamp === 'number' &&
    (record.riskLevel === 'high' || record.riskLevel === 'medium' || record.riskLevel === 'safe') &&
    typeof record.title === 'string' &&
    typeof record.result === 'object' &&
    record.result !== null
  );
}

/**
 * Analiz sonucuna göre genel risk seviyesini hesaplar:
 * - flagged_ingredients veya tehlikeli katkı varsa 'high'
 * - tartışmalı katkı veya yüksek besin öğesi (şeker/tuz/doymuş yağ) varsa 'medium'
 * - aksi halde 'safe'
 */
export function calculatePhotoRiskLevel(result: AnalysisResult): PhotoAnalysisRiskLevel {
  if (result.label_type === 'meal_plate' || result.analysis_type === 'meal_plate') {
    return 'safe';
  }

  const hasDangerousAdditives =
    result.additives?.some((additive) => additive.risk === 'dangerous') ?? false;
  const hasHighFlagged =
    result.flagged_ingredients?.some(
      (item) => item.risk === 'high' || item.risk === 'dangerous',
    ) ?? false;

  if (hasHighFlagged || hasDangerousAdditives) {
    return 'high';
  }

  const hasMediumFlagged = (result.flagged_ingredients?.length ?? 0) > 0;
  const hasControversialAdditives =
    result.additives?.some((additive) => additive.risk === 'controversial') ?? false;

  const hasHighNutrition =
    result.nutrition?.evaluations?.some(
      (e) =>
        e.level === 'high' &&
        !['protein', 'fiber', 'lif'].includes(e.nutrient.toLowerCase()),
    ) ?? false;

  if (hasMediumFlagged || hasControversialAdditives || hasHighNutrition) {
    return 'medium';
  }

  return 'safe';
}

/**
 * Analiz edilen etiket, kozmetik içeriği veya yemek tabağından uygun bir başlık üretir.
 */
export function generatePhotoAnalysisTitle(result: AnalysisResult): string {
  if (result.label_type === 'meal_plate' || result.analysis_type === 'meal_plate') {
    if (result.meal_title && result.meal_title.trim()) {
      return result.meal_title.trim();
    }
    if (Array.isArray(result.detected_items) && result.detected_items.length > 0) {
      const names = result.detected_items
        .map((i) => i.name?.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      if (names) {
        return names.length > 50 ? `${names.slice(0, 47)}...` : names;
      }
    }
    return 'Öğün Analizi';
  }

  let firstIngredient: string | null = null;

  if (Array.isArray(result.ingredients_list) && result.ingredients_list.length > 0) {
    const first = result.ingredients_list[0]?.trim();
    if (first) {
      firstIngredient = first;
    }
  }

  if (!firstIngredient && typeof result.ingredients_text === 'string' && result.ingredients_text.trim()) {
    const cleaned = result.ingredients_text
      .replace(/^([iİıI]çindekiler|[iİıI]cindekiler|ingredients)\s*:\s*/i, '')
      .split(/[,;\n]/)[0]
      ?.trim()
      ?.replace(/^[-*•.]\s*/, '')
      ?.replace(/[.;]+$/, '')
      ?.trim();

    if (cleaned) {
      firstIngredient = cleaned;
    }
  }

  if (firstIngredient) {
    const prefix = result.label_type === 'cosmetic' ? 'Kozmetik: ' : '';
    const full = `${prefix}${firstIngredient}`;
    return full.length > 50 ? `${full.slice(0, 47)}...` : full;
  }

  if (result.label_type === 'cosmetic') {
    return 'Kozmetik İçerik Analizi';
  }

  const hasNutrition = Boolean(result.nutrition || result.has_nutrition);
  if (hasNutrition) {
    return 'Besin Değerleri Analizi';
  }

  return 'İçerik & Besin Analizi';
}

/**
 * Yeni bir fotoğraf analizi kaydını listenin başına ekler (maksimum 50 kayıt) ve oluşturulan kaydı döner.
 */
export async function savePhotoAnalysis(
  record: Omit<PhotoAnalysisRecord, 'id' | 'timestamp'>,
): Promise<PhotoAnalysisRecord> {
  const currentList = await getPhotoAnalysisHistory();

  const newRecord: PhotoAnalysisRecord = {
    ...record,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
  };

  try {
    const nextList = [newRecord, ...currentList].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(PHOTO_ANALYSIS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (error) {
    console.error('Fotoğraf analizi geçmişe kaydedilemedi:', error);
  }

  return newRecord;
}

/**
 * Fotoğraf analizi geçmişini kronolojik sırada (en yeniden en eskiye) getirir.
 */
export async function getPhotoAnalysisHistory(): Promise<PhotoAnalysisRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(PHOTO_ANALYSIS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isPhotoAnalysisRecord)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Fotoğraf analizi geçmişi okunamadı:', error);
    return [];
  }
}

/**
 * Belirtilen ID'ye sahip fotoğraf analizi kaydını siler.
 */
export async function deletePhotoAnalysis(id: string): Promise<void> {
  try {
    const currentList = await getPhotoAnalysisHistory();
    const nextList = currentList.filter((item) => item.id !== id);
    await AsyncStorage.setItem(PHOTO_ANALYSIS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (error) {
    console.error('Fotoğraf analizi kaydı silinemedi:', error);
  }
}

export async function deletePhotoAnalysisItems(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const selected = new Set(ids);
  // Propagate storage/parse errors so the screen cannot report a failed deletion as successful.
  const stored = await AsyncStorage.getItem(PHOTO_ANALYSIS_STORAGE_KEY);
  const records: unknown = stored ? JSON.parse(stored) : [];
  if (!Array.isArray(records)) throw new Error('Geçmiş verisi okunamadı');
  await AsyncStorage.setItem(PHOTO_ANALYSIS_STORAGE_KEY, JSON.stringify(
    records.filter(item => !isPhotoAnalysisRecord(item) || !selected.has(item.id)),
  ));
}

/**
 * Belirtilen ID'ye sahip fotoğraf analiz kaydının başlığını günceller.
 */
export async function updatePhotoAnalysisTitle(id: string, newTitle: string): Promise<void> {
  try {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    const currentList = await getPhotoAnalysisHistory();
    const nextList = currentList.map((item) =>
      item.id === id ? { ...item, title: trimmedTitle } : item,
    );
    await AsyncStorage.setItem(PHOTO_ANALYSIS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (error) {
    console.error('Fotoğraf analizi başlığı güncellenemedi:', error);
  }
}

/**
 * Cihazdaki tüm fotoğraf (AI etiket/öğün) analizi geçmişini siler.
 */
export async function clearPhotoAnalysisHistory(): Promise<void> {
  await AsyncStorage.removeItem(PHOTO_ANALYSIS_STORAGE_KEY);
}
