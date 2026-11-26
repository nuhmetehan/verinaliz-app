export const AI_CONSENT_VERSION = 'photo-analysis-cloudflare-v2';
export const AI_PRIVACY_NOTICE = 'Kırpılan kare, gönderime onay verirseniz Railway’de çalışan Verinaliz sunucusuna ulaşır. Sunucu EXIF/GPS gibi meta verileri kaldırır ve kareyi şifreli bağlantıyla analiz için Cloudflare Workers AI’a iletir. Sağlayıcılar verileri Türkiye dışında işleyebilir. Verinaliz sunucusu fotoğrafı işlem sırasında bellekte tutar. Cihazdaki kontrol bazı ayrıntıları kaçırabilir. İnsan görüntüsü, kimlik belgesi, adres, sağlık bilgisi veya başka kişisel, hassas ya da gizli bilgi içeren kareyi kaldırıp yeniden çekin.';

export function aiConsentHeaders(mode: 'label' | 'meal', reviewed: boolean) {
  if (!reviewed) throw new Error('Fotoğrafları ve veri aktarımını onaylayın.');
  return {
    'X-Verinaliz-AI-Consent': AI_CONSENT_VERSION,
    'X-Verinaliz-Content-Scope': mode,
    'X-Verinaliz-No-Personal-Data': 'true',
  };
}
