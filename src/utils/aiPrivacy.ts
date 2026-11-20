export const AI_CONSENT_VERSION = 'photo-analysis-cloudflare-v2';
export const AI_PRIVACY_NOTICE = 'Yalnızca etiketi veya öğünü gönderin. Fotoğrafta yüz, çocuk, belge, adres veya sağlık bilgisi bulunmamalı. Verinaliz sunucusu fotoğrafın konum ve kamera bilgilerini kaldırır, ardından fotoğrafı şifreli bağlantıyla Cloudflare Workers AI’a iletir. Gemma 4 görseli doğrudan analiz eder. Fotoğraf sunucumuzda kalıcı olarak saklanmaz. AI Gateway kullanıldığında fotoğraf ve yanıt gövdesi kaydı kapalıdır.';

export function aiConsentHeaders(mode: 'label' | 'meal', reviewed: boolean) {
  if (!reviewed) throw new Error('Fotoğrafları ve veri aktarımını onaylayın.');
  return {
    'X-Verinaliz-AI-Consent': AI_CONSENT_VERSION,
    'X-Verinaliz-Content-Scope': mode,
    'X-Verinaliz-No-Personal-Data': 'true',
  };
}
