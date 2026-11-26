import { clearFavorites } from '@/utils/favorites';
import { clearPhotoAnalysisHistory } from '@/utils/photoAnalysisHistory';
import { clearScanHistory } from '@/utils/scanHistory';

export type LocalDataScope = 'scans' | 'photos' | 'favorites';

type LocalDataListener = () => void;
const listeners = new Set<LocalDataListener>();

/**
 * Cihazdaki geçmiş/favori verileri silindiğinde ekranların listelerini yenilemesi için abonelik.
 */
export function subscribeLocalDataChanges(listener: LocalDataListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyLocalDataChanged() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Yerel veri dinleyicisi hatası:', error);
    }
  });
}

/**
 * Seçilen kapsamdaki cihaz verilerini siler. Veriler yalnızca cihazda tutulduğu için
 * sunucuya herhangi bir istek gönderilmez.
 */
export async function clearLocalData(scopes: LocalDataScope[]): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (scopes.includes('scans')) tasks.push(clearScanHistory());
  if (scopes.includes('photos')) tasks.push(clearPhotoAnalysisHistory());
  if (scopes.includes('favorites')) tasks.push(clearFavorites());

  await Promise.all(tasks);
  notifyLocalDataChanged();
}
