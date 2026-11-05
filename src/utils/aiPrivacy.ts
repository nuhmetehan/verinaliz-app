export const AI_CONSENT_VERSION = 'photo-analysis-v1';
export const AI_PRIVACY_NOTICE = 'Fotoğraflar yalnızca etiket veya tabak içermeli; yüz, çocuk, kimlik, adres, belge ve kişisel sağlık bilgisi içermemeli. Fotoğraf ve yanıt Google Gemini tarafından işlenir. Ücretsiz hizmette model geliştirme ve insan incelemesi için kullanılabilir. Sunucumuzda kalıcı fotoğraf saklanmaz. Görüntüdeki kişisel bilgileri otomatik olarak tespit ettiğimiz veya anonimleştirdiğimiz garantisi yoktur.';

export function aiConsentHeaders(mode: 'label' | 'meal', reviewed: boolean) {
  if (!reviewed) throw new Error('Fotoğrafları ve veri aktarımını onaylayın.');
  return {
    'X-Verinaliz-AI-Consent': AI_CONSENT_VERSION,
    'X-Verinaliz-Content-Scope': mode,
    'X-Verinaliz-No-Personal-Data': 'true',
  };
}
