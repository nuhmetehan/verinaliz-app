import AsyncStorage from '@react-native-async-storage/async-storage';

const SCAN_HISTORY_STORAGE_KEY = '@foodscan/scan-history';
const MAX_SCAN_HISTORY_ITEMS = 100;


export type ScanRiskLevel = 'high' | 'medium' | 'safe' | null;

export type ScanHistoryItem = {
  barcode: string;
  name: string | null;
  brand: string | null;
  riskLevel?: ScanRiskLevel;
  imageUrl?: string | null;
  timestamp: number;
};

export type ScannedProduct = Pick<
  ScanHistoryItem,
  'barcode' | 'name' | 'brand' | 'riskLevel' | 'imageUrl'
>;

function isScanHistoryItem(value: unknown): value is ScanHistoryItem {
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
    (
      item.imageUrl === undefined
      || item.imageUrl === null
      || typeof item.imageUrl === 'string'
    ) &&
    typeof item.timestamp === 'number'
  );
}

export async function addScanToHistory(product: ScannedProduct): Promise<void> {
  const history = await getScanHistory();
  const existing = history.find((i) => i.barcode === product.barcode);

  const scan: ScanHistoryItem = {
    barcode: product.barcode,
    name: product.name ?? existing?.name ?? null,
    brand: product.brand ?? existing?.brand ?? null,
    riskLevel: product.riskLevel ?? existing?.riskLevel ?? null,
    imageUrl: product.imageUrl ?? existing?.imageUrl ?? null,
    timestamp: existing ? existing.timestamp : Date.now(),
  };

  const nextHistory = (existing
    ? history.map((item) => (item.barcode === product.barcode ? scan : item))
    : [scan, ...history]
  ).slice(0, MAX_SCAN_HISTORY_ITEMS);


  await AsyncStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
}

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const storedHistory = await AsyncStorage.getItem(SCAN_HISTORY_STORAGE_KEY);

  if (!storedHistory) {
    return [];
  }

  try {
    const parsedHistory: unknown = JSON.parse(storedHistory);

    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory
      .filter(isScanHistoryItem)
      .sort((first, second) => second.timestamp - first.timestamp);
  } catch {
    return [];
  }
}

/**
 * Cihazdaki tüm barkod tarama geçmişini siler.
 */
export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(SCAN_HISTORY_STORAGE_KEY);
}

export async function deleteScanHistoryItems(barcodes: string[]): Promise<void> {
  if (!barcodes.length) return;
  const selected = new Set(barcodes);
  const stored = await AsyncStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
  const history: unknown = stored ? JSON.parse(stored) : [];
  if (!Array.isArray(history)) throw new Error('Geçmiş verisi okunamadı');
  await AsyncStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(history.filter(item => !isScanHistoryItem(item) || !selected.has(item.barcode))));
}
