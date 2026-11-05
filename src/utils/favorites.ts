import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ScanHistoryItem, ScanRiskLevel } from './scanHistory';

export const FAVORITES_STORAGE_KEY = '@foodscan/favorites';

export type FavoriteProduct = {
  barcode: string;
  name?: string | null;
  brand?: string | null;
  riskLevel?: ScanRiskLevel;
  timestamp?: number;
};

function isFavoriteItem(value: unknown): value is ScanHistoryItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.barcode === 'string' &&
    (typeof item.name === 'string' || item.name === null) &&
    (typeof item.brand === 'string' || item.brand === null) &&
    (
      item.riskLevel === undefined
      || item.riskLevel === null
      || item.riskLevel === 'high'
      || item.riskLevel === 'medium'
      || item.riskLevel === 'safe'
    ) &&
    typeof item.timestamp === 'number'
  );
}

/**
 * AsyncStorage'dan tüm favori ürünleri döner.
 */
export async function getFavorites(): Promise<ScanHistoryItem[]> {
  const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);

  if (!storedFavorites) {
    return [];
  }

  try {
    const parsedFavorites: unknown = JSON.parse(storedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      return [];
    }

    return parsedFavorites
      .filter(isFavoriteItem)
      .sort((first, second) => second.timestamp - first.timestamp);
  } catch {
    return [];
  }
}

/**
 * Belirtilen barkodun favorilerde olup olmadığını kontrol eder.
 */
export async function isFavorite(barcode?: string | null): Promise<boolean> {
  if (!barcode) {
    return false;
  }

  const favorites = await getFavorites();
  return favorites.some((item) => item.barcode === barcode);
}

/**
 * Ürünü favorilere ekler veya varsa favorilerden çıkarır.
 * Favoriye eklendiyse `true`, çıkarıldıysa `false` döner.
 */
export async function toggleFavorite(product: FavoriteProduct): Promise<boolean> {
  if (!product.barcode) {
    return false;
  }

  const favorites = await getFavorites();
  const exists = favorites.some((item) => item.barcode === product.barcode);

  if (exists) {
    const nextFavorites = favorites.filter((item) => item.barcode !== product.barcode);
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    return false;
  }

  const favoriteItem: ScanHistoryItem = {
    barcode: product.barcode,
    name: product.name ?? null,
    brand: product.brand ?? null,
    riskLevel: product.riskLevel ?? null,
    timestamp: product.timestamp ?? Date.now(),
  };

  const nextFavorites = [favoriteItem, ...favorites];
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
  return true;
}

/**
 * Cihazdaki tüm favori ürünleri siler.
 */
export async function clearFavorites(): Promise<void> {
  await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
}
