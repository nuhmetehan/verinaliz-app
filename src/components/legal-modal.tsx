import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/theme/theme';

export const LEGAL_CONSENT_STORAGE_KEY = '@foodscan/has_accepted_legal_v4_photo_privacy';

export type LegalTab = 'privacy' | 'terms';

type LegalModalProps = {
  visible: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
  isFirstLaunch?: boolean;
  onAccept?: () => void;
};

type LegalSection = {
  id: string;
  title: string;
  content: string;
};

const PRIVACY_SECTIONS: LegalSection[] = [
  { id: 'privacy-photo-review', title: 'Fotoğraf kontrolü ve teknik korumalar', content: 'Her yeni fotoğraf grubu ve analiz türü için fotoğrafları inceleyip veri aktarımını ayrıca onaylamanız gerekir. Fotoğrafa dokunarak tam ekranda inceleyebilirsiniz. Sunucu görseli doğrular, yeniden kodlar ve EXIF/GPS gibi metaverileri Cloudflare’a göndermeden önce kaldırır; özgün dosya adı aktarılmaz. Görüntünün içindeki kişileri veya kişisel yazıları otomatik olarak tespit etme ya da anonimleştirme garantisi verilmez. Bu nedenle kişisel, hassas veya gizli bilgi içeren fotoğrafları göndermeyin. Teknik kullanım ölçümü açıksa analiz türü, rota, başarı durumu, varsa token veya neuron sayıları ve tahmini maliyet gibi sayaçlar kaydedilir; fotoğraf, kullanıcı kimliği, komut veya yanıt metni bu ölçüme eklenmez.' },
  { id: 'privacy-email', title: 'E-posta ile giriş', content: 'Önceden oluşturulmuş e-posta hesaplarıyla giriş yapılabilir. E-posta ve şifre HTTPS üzerinden Verinaliz sunucusuna ve doğrulama için Supabase Auth hizmetine iletilir. Şifre uygulamada veya Verinaliz veritabanında saklanmaz, uygulama hata kayıtlarına yazılmaz; doğrulama ve güvenli saklama Supabase Auth tarafından yürütülür. Bu şifre Google hesabı şifresi değildir. E-posta hesaplarında da aynı oturum, kota ve hesap silme işlemleri uygulanır.' },
  { id: 'privacy-updates', title: 'Uygulama güncellemeleri (Expo)', content: 'Uygulama güncellemelerini kontrol etmek ve indirmek için Expo / EAS Update sunucularına bağlanılır. IP adresi, platform, çalışma zamanı/sürüm ve güncelleme bilgileri ile EAS istemci/kurulum kimliği işlenebilir. Başlatılamayan önceki güncellemeye ait sınırlı teknik hata bilgisi de gönderilebilir. Bu mekanizma üzerinden analiz fotoğrafı veya tarama geçmişi yüklenmez. Sağlayıcı tarafındaki saklama Expo hizmet koşulları ve yapılandırmasına bağlıdır.' },
  { id: 'privacy-provider', title: 'Cloudflare ile görsel işleme', content: 'Cloudflare Workers AI etiket ve öğün fotoğraflarını işler. AI Gateway kullanıldığında istek ve yanıt gövdelerinin kaydı kapalıdır. Cloudflare faturalandırma için teknik kullanım kayıtları tutabilir. Sağlayıcı yurt dışında veri işleyebilir.' },

  {
    id: 'privacy-1a',
    title: '1.A. AI Etiket & Öğün Analizi ve Fotoğraf Verileri',
    content:
      '• **Kalıcı Olarak Saklanmama Güvencesi:** Gıda veya kozmetik ambalajındaki "İçindekiler / Ingredients" ve "Besin Değerleri" bölümünü okutmak ya da öğününüzün yaklaşık porsiyon tahminini yapmak için kameranızla çektiğiniz fotoğraflar Verinaliz sunucularında, disklerinde veya veritabanlarında ASLA KALICI OLARAK KAYDEDİLMEZ VE SAKLANMAZ.\n\n• **Cloudflare ile görsel işleme.** Verinaliz sunucusu, dosya biçimini denetleyip konum ve kamera metaverilerini kaldırır. Fotoğrafı HTTPS üzerinden Cloudflare Workers AI’a gönderir. Gemma 4 etiket veya öğün görselini doğrudan analiz eder. Görsel sunucumuzda yalnızca işlem sırasında geçici bellekte tutulur.\n\n• **Fotoğraf Çekim Kuralı ve Kullanıcı Sorumluluğu:**\n- Kullanıcılar yalnızca ürün ambalajının "İçindekiler / Besin Değerleri" bölümünün veya öğünlerinin fotoğrafını çekmekle yükümlüdür.\n- Fotoğraf karesine insan yüzü, kimlik belgesi, özel hayatın gizliliğini ihlal edebilecek unsurlar, kredi kartı, fatura, ev ortamı veya herhangi bir kişisel/özel veri dahil EDİLMEMELİDİR.\n- Yanlışlıkla kişisel veri gönderdiyseniz destek adresinden bize ulaşın. Veri sorumlusu olarak yasal yükümlülüklerimiz devam eder.',
  },
  {
    id: 'privacy-1bc',
    title: '1.B & 1.C. Kamera, Barkod ve Bildirimler',
    content:
      '• **Kamera ve Barkod Taraması:** Kameranız barkod okuma amacıyla kullanıldığında görüntü işleme doğrudan cihazınız üzerinde (on-device) yerel olarak gerçekleşir. Kamera akışı hiçbir sunucuya aktarılmaz veya kaydedilmez. Okunan barkod ürün sorgusu için sunucumuza ve gerektiğinde Open Food Facts / Open Beauty Facts servislerine gönderilir.\n\n• **Eksik Ürün Bildirimleri (Topluluk Katkıları):** Veritabanında bulunmayan bir ürünü bildirmek için sunulan formlar tamamen metin tabanlıdır. AI sonucu bildirimlerinde de yalnızca sizin yazdığınız açıklama, analiz ve bildirim türü inceleme amacıyla kaydedilir; fotoğraf, otomatik analiz kopyası, hesap kimliği veya e-posta bildirime eklenmez. Bildirimler yönetici incelemesinden sonra silinir. Gönderilen metin formları ve hata bildirimleri hesabınızla, cihazınızla veya IP adresinizle ilişkilendirilmez; bu formlarda sizden kişisel bilgi istenmez. Kayıtlar ürün veritabanının iyileştirilmesi için tutulur; serbest metin alanlarına kişisel bilgi yazmayınız, yanlışlıkla yazılan bilginin silinmesini yayıncının iletişim adresinden talep edebilirsiniz.',
  },
  {
    id: 'privacy-1de',
    title: '1.D, 1.E & 1.F. Hesap Girişi, Kota ve Yerel Depolama',
    content:
      '• **Google ile Giriş (OAuth 2.0) ve Hesap Bazlı Kota:** Giriş yapan her hesap son yedi gün içinde üç başarılı etiket ve iki başarılı öğün analizi yapabilir. Aynı istekteki iki ambalaj fotoğrafı bir etiket hakkı kullanır. Her hak, kullanıldığı andan yedi gün sonra açılır. Google veya önceden oluşturulmuş e-posta hesabıyla giriş yapılabilir. Giriş yaptığınızda temel hesap bilgileriniz (kullanıcı ID\'si, adınız, e-posta adresiniz ve varsa Google profil fotoğrafı bağlantınız) kimlik doğrulama ve yedi günlük analiz kotanızın takibi amacıyla Supabase üzerinde işlenir; Google şifreniz uygulamamızla asla paylaşılmaz. Barkod tarama ve katkı rehberi özellikleri ise giriş gerektirmeden kullanılabilir. Hesap silindiğinde doğrudan hesap bağlantısı kaldırılır. Yeniden hesap açılması halinde kalan hakları korumak için Google hesap kimliği veya e-posta adresinden türetilen HMAC özeti, analiz türü ve hakkın açılma zamanı saklanır. Bu takma adlı kayıt kişisel veridir. Her analizden yedi gün sonraki 15 dakikalık temizlik döngüsünde silinir. Kesintiden sonra temizlik yeniden başlatılır. İşlemenin dayanağı hizmetin adil kullanımına yönelik meşru menfaattir (KVKK m.5/2-f). İtiraz ve anında silme talebi için {{SUPPORT_EMAIL}} adresine başvurabilirsiniz.\n\n• **Yerel Olarak Saklanan Veriler:** Taranan ürün geçmişiniz, favori ürünleriniz ve geçmiş AI analiz kayıtlarınız (analiz için çektiğiniz fotoğrafların cihazınızdaki bağlantıları ve analiz sonuçları dahil) kendi cihazınızın yerel hafızasında (AsyncStorage) tutulur. Bu geçmiş/favori kayıtları otomatik olarak sunucuya yüklenmez; analiz için çekilen fotoğraf ise Cloudflare’a iletilir. Oturum ve yenileme belirteçleri mobilde işletim sisteminin güvenli depolamasında (SecureStore), webde yalnızca geçici bellekte tutulur; eski yerel oturum kaydı ilk erişimde taşınarak kaldırılır; "Hesaptan Çıkış Yap" işlemi güvenli depolamadaki oturum belirtecinizi cihazdan siler.\n\n• **Güvenlik ve İstek Sınırlama (Rate Limiting):** Hız sınırlama ve bölgesel erişim kontrolü için IP adresi geçici bellekte işlenir. Ülke sunucuda yaklaşık olarak belirlenir; IP adresi bu sorgu için harici bir konum servisine gönderilmez. Railway ve Supabase güvenlik ve işletim amaçlı teknik istek/oturum kayıtları işleyebilir; saklama süresi sağlayıcı yapılandırmasına bağlıdır. Fotoğraf, oturum belirteci ve AI yanıtının tam metni uygulama sunucusunun hata kayıtlarına bilinçli olarak yazılmaz.\n\n• **Admin Oturum Çerezi:** Yalnızca yetkili yöneticiler için HttpOnly güvenlik çerezi kullanılmaktadır. Bu çerez son kullanıcıları etkilemez.',
  },
  {
    id: 'privacy-2',
    title: '2. Bilgilerin Paylaşımı ve Üçüncü Taraf Servisler',
    content:
      'Kişisel verileriniz hiçbir şekilde üçüncü taraflara satılmaz, kiralanmaz veya reklam/pazarlama amacıyla paylaşılmaz. Hizmetin yürütülmesi için yalnızca aşağıdaki altyapı sağlayıcıları kullanılır:\n\n• **Google OAuth.** Google ile giriş için kimlik doğrulaması sağlar.\n• **Cloudflare.** Cloudflare Workers AI etiket ve öğün fotoğraflarını işler. AI Gateway kullanıldığında istek ve yanıt gövdelerinin kaydı kapalıdır. Cloudflare faturalandırma için teknik kullanım kayıtları tutabilir. Sağlayıcı yurt dışında veri işleyebilir.\n• **Open Food Facts & Open Beauty Facts:** Barkod taramalarında kamuya açık gıda ve kozmetik ürün bilgilerini sorgulamak için (Open Database License — ODbL).\n• **Supabase:** Ürün metin kataloğunun, topluluk katkılarının, Google OAuth oturum doğrulamasının ve kullanıcı bazlı yedi günlük analiz kotalarının yönetimi için (fotoğraflar barındırılmaz).\n• **Railway:** Uygulama sunucusunun barındırıldığı bulut altyapı sağlayıcısı.',
  },
  {
    id: 'privacy-3',
    title: '3. Veri Güvenliği',
    content:
      'Uygulama ile sunucular arasındaki tüm veri akışı endüstri standardı modern SSL/TLS şifreleme protokolleri ile güvence altındadır.',
  },
  {
    id: 'privacy-4',
    title: '4. Kullanıcı Hakları (KVKK & GDPR)',
    content:
      'Kullanıcılar;\n• Haklarında herhangi bir kişisel veri işlenip işlenmediğini öğrenme,\n• Uygulama içerisinden diledikleri an Google hesaplarından çıkış yapma, "Hesabımı Sil" ile hesaplarını ve hesaba bağlı sunucu kota kayıtlarını silme (geçici kötüye kullanım önleme özeti yukarıdaki süre boyunca saklanır), Geçmiş ekranında kayıtları tek tek veya seçerek silme ve favori ürünlerini Favorilerim ekranından kaldırma,\n• Sunucularımızda bulunan hesap/kota kayıtlarının veya bildirim/katkı kayıtlarının silinmesini talep etme hakkına sahiptir.\n\n• **Unutulma Hakkı (Right to Erasure):** GDPR kapsamında AB\'li kullanıcılar ile KVKK kapsamında Türkiye\'deki kullanıcılar, işlenen verilerinin silinmesini talep edebilir. Talepler en geç **30 gün** içinde yanıtlanır.\n\n• **İletişim ve Talepler:** {{SUPPORT_EMAIL}}',
  },
  {
    id: 'privacy-5',
    title: '5. Yaş Sınırı',
    content:
      "Verinaliz 18 yaş ve üzerindeki yetişkinlere yöneliktir. 18 yaşından küçüklerin uygulamayı kullanmaması gerekir. Ebeveyn onayı bu yaş sınırının yerine geçmez. Yaş sınırının altında bir kullanıcıya ait veri işlendiğini düşünüyorsanız yayıncının iletişim adresinden silme talebinde bulunabilirsiniz.",
  },
  {
    id: 'privacy-6',
    title: '6. İletişim',
    content:
      'Veri sorumlusu: {{DATA_CONTROLLER}}. Yayıncı markası: {{PUBLISHER_NAME}}. Uygulama: Verinaliz. Son güncelleme: 3 Kasım 2026. Gizlilik politikası ile ilgili sorularınız için:\n• **E-posta:** {{SUPPORT_EMAIL}}',
  },
];

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'terms-1',
    title: '1. Hizmetin Niteliği',
    content:
      'Verinaliz; ambalajlı gıda ve kozmetik ürünlerinin barkodlarının taranması, ürün üzerindeki "İçindekiler" bölümünün fotoğraflanması veya öğün görsellerinin incelenmesi yoluyla ürün bileşenleri, katkı maddeleri, kozmetik bileşenleri ve yaklaşık öğün aralıkları hakkında tüketicileri bilgilendirmeyi amaçlayan bağımsız bir analiz rehberidir.',
  },
  {
    id: 'terms-2',
    title: '2. Tıbbi Tavsiye, Dermatoloji ve Teşhis Sorumluluk Reddi',
    content:
      '• **Tıbbi veya Dermatolojik Hizmet Değildir:** Verinaliz tıbbi cihaz değildir; herhangi bir hastalığı teşhis etmez, tedavi etmez veya önlemez. Verinaliz bir tıp kuruluşu, sağlık personeli, dermatolog veya diyetisyenlik hizmeti değildir.\n\n• **Teşhis veya Tedavi Amacı Taşımaz:** Uygulama tarafından sunulan gıda/kozmetik risk seviyeleri, içerik uyarıları, özetler ve yaklaşık öğün kalori tahminleri yalnızca tüketici bilgilendirme amaçlıdır; hiçbir surette tıbbi tavsiye, klinik/dermatolojik teşhis veya alerji/intolerans tedavisi yerine geçmez.\n\n• **Öğün Analizi Sınırlaması:** Öğün analizi kesin ölçüm değildir; pişirme yağı, sos, alerjen, gramaj vb. görselden anlaşılmayan içerikler olabileceği için yalnızca yaklaşık aralık sunulur. Yapay zeka hata yapabilir, son karar kullanıcıya aittir.\n\n• **Uzman Görüşü Esastır:** Sağlık durumunuzu, cilt hassasiyetlerinizi, ciddi alerjilerinizi, çölyak veya metabolik hastalıklarınızı ilgilendiren her türlü kararda mutlaka hekiminize veya yetkili bir uzmana danışınız.',
  },
  {
    id: 'terms-3',
    title: '3. Ambalaj Bilgisinin Üstünlüğü ve Veri Sorumluluğu',
    content:
      '• **Üretici Değişiklikleri ve Açık Kaynak Veritabanları:** Üretici firmalar ürün içeriklerini ve formülasyonlarını önceden bildirmeksizin değiştirebilir. Ayrıca Open Food Facts ve Open Beauty Facts açık kaynak veritabanlarındaki Türkiye pazarı ürünleri çoğunlukla eksik veya güncel olmayabilir.\n\n• **Fiziki Ambalaj Esastır:** Veritabanındaki veya yapay zeka analizindeki olası uyuşmazlıklarda her zaman ürünün fiziki ambalajı üzerindeki en güncel etiket bilgileri geçerlidir.\n\n• **Çapraz Bulaşma Uyarısı:** Üretim hattındaki eser miktardaki çapraz bulaşmalar ("iz miktarda içerebilir" ibareleri) veri tabanlarında veya görsel analizlerde her zaman tespit edilemeyebilir. Ciddi alerjik reaksiyon riski taşıyan bireyler ambalajı bizzat okumalıdır.',
  },
  {
    id: 'terms-4',
    title: '4. AI Analizi ve Fotoğraf Çekim Kuralları',
    content:
      'Verinaliz, ürün ambalajındaki içindekiler yazısını okumak ve öğün görsellerini incelemek için üçüncü taraf yapay zeka teknolojilerinden (Cloudflare Workers AI) yararlanır:\n\n• **Fotoğrafların işlenmesi.** Verinaliz sunucusu, dosya biçimini denetleyip konum ve kamera metaverilerini kaldırır. Fotoğrafı HTTPS üzerinden Cloudflare Workers AI’a gönderir. Gemma 4 etiket veya öğün görselini doğrudan analiz eder. Görsel sunucumuzda yalnızca işlem sırasında geçici bellekte tutulur.\n\n• **Fotoğraf Çekiminde Kullanıcı Yükümlülükleri:**\n1. Kullanıcı, yalnızca ambalajın "İçindekiler / Besin Değerleri" bölümünün veya öğününün net bir fotoğrafını çekmeyi taahhüt eder.\n2. Fotoğraf karesinde insan yüzü, çocuk görüntüsü, kimlik belgesi, özel yaşam alanları veya herhangi bir kişisel veri yer alamaz.\n3. Kişisel veri içeren bir görsel yanlışlıkla gönderilirse destek adresine bildirilmelidir. Veri sorumlusu olarak yasal yükümlülüklerimiz devam eder.\n4. Yapay zekayı yanıltmaya yönelik manipülatif veya kötü niyetli komutlar içeren görsellerin yüklenmesi yasaktır.',
  },
  {
    id: 'terms-5',
    title: '5. Tarafsızlık ve Marka Bağımsızlığı',
    content:
      '• **Bağımsızlık:** Verinaliz bağımsız bir girişimdir; hiçbir gıda veya kozmetik markası, üreticisi ya da perakendecisi ile sponsorluk veya ticari bağımlılığı yoktur.\n\n• **Kaynakların Kapsamı:** Resmi kaynak bağlantıları genel bilgi içindir. Her bileşen, AI sonucu veya rozet için ayrı bilimsel doğrulama yapıldığı veya kurumların uygulamayı onayladığı iddia edilmez. Sınıflandırmalar kişisel güvenlik garantisi değildir.\n\n• **Tarafsızlık:** Hiçbir ürün hedef alınmaz, karalanmaz veya haksız olarak övülmez.\n\n• **Düzeltme Talepleri:** Marka sahipleri ve üreticiler, ürün bilgilerine ilişkin güncelleme veya düzeltme taleplerini yayıncının iletişim adresinden iletebilirler.',
  },
  {
    id: 'terms-6',
    title: '6. Kullanım Kotaları, Hesap Girişi ve Hizmet Sürekliliği',
    content:
      '• **Adil Kullanım ve Hesap Kotası:** Sistem kaynaklarını korumak ve adil kullanımı sağlamak amacıyla yapay zeka görsel analizi özelliğini kullanabilmek için Google ile veya önceden oluşturulmuş e-posta hesabıyla giriş yapılması gerekmektedir. Giriş yapan her hesap son yedi gün içinde üç başarılı etiket ve iki başarılı öğün analizi yapabilir. Aynı istekteki iki ambalaj fotoğrafı bir etiket hakkı kullanır. Her hak, kullanıldığı andan yedi gün sonra açılır.\n\n• **Hizmet Değişiklikleri:** Verinaliz, hizmet özelliklerini önceden haber vermeksizin güncelleme, kota politikalarını değiştirme veya geçici bakım durumlarında durdurma hakkını saklı tutar.',
  },
  {
    id: 'terms-7',
    title: '7. Sorumluluğun Sınırlandırılması',
    content:
      'Yürürlükteki mevzuatın izin verdiği azami ölçüde Verinaliz;\n• Uygulama içerisindeki olası eksik veya güncel olmayan bilgilerden,\n• Tespit edilemeyen alerjen, kozmetik bileşen veya katkı maddelerinden kaynaklı doğrudan/dolaylı sağlık/cilt sorunlarından veya alerjik reaksiyonlardan,\n• Tabak/öğün tahminindeki yaklaşık aralıklardan veya kullanıcının yapay zeka analizine dayanarak aldığı tüketim/kullanım kararlarından sorumlu tutulamaz.',
  },
  {
    id: 'terms-8',
    title: '8. Yaş Sınırı',
    content:
      "Verinaliz 18 yaş ve üzerindeki yetişkinlere yöneliktir. 18 yaşından küçüklerin uygulamayı kullanmaması gerekir. Ebeveyn onayı bu yaş sınırının yerine geçmez. Yaş sınırının altında bir kullanıcıya ait veri işlendiğini düşünüyorsanız yayıncının iletişim adresinden silme talebinde bulunabilirsiniz.",
  },
  {
    id: 'terms-9',
    title: '9. Yürürlük ve İletişim',
    content:
      'Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir.\n\n• **İletişim:** {{SUPPORT_EMAIL}}',
  },
];

function renderFormattedContent(text: string) {
  const missing = 'Bu derlemede belirtilmemiş';
  const parts = text
    .replaceAll('{{SUPPORT_EMAIL}}', () => process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || missing)
    .replaceAll('{{DATA_CONTROLLER}}', () => process.env.EXPO_PUBLIC_DATA_CONTROLLER?.trim() || missing)
    .replaceAll('{{PUBLISHER_NAME}}', () => process.env.EXPO_PUBLIC_PUBLISHER_NAME?.trim() || missing)
    .split('**');
  if (parts.length === 1) {
    return <Text style={styles.sectionText}>{text}</Text>;
  }

  return (
    <Text style={styles.sectionText}>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <Text key={index} style={styles.boldText}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

export function LegalModal(props: LegalModalProps) {
  if (!props.visible) return null;
  return <LegalModalContent key={props.initialTab} {...props} />;
}

function LegalModalContent({
  visible,
  onClose,
  initialTab = 'privacy',
  isFirstLaunch = false,
  onAccept,
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [isAdult, setIsAdult] = useState(false);


  const sections = activeTab === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={isFirstLaunch ? undefined : onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerEyebrow}>
                {isFirstLaunch ? 'HOŞ GELDİNİZ • YASAL BİLGİLENDİRME' : 'YASAL BİLGİLENDİRME'}
              </Text>
              <Text style={styles.title}>
                {activeTab === 'privacy' ? 'Gizlilik Politikası' : 'Kullanım Koşulları'}
              </Text>
            </View>
            {!isFirstLaunch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={12}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                onPress={onClose}>
                <Text style={styles.closeButtonText}>{'\u00d7'}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Sekme Seçici (Tabs) */}
          <View style={styles.tabContainer}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'privacy' }}
              style={[styles.tabButton, activeTab === 'privacy' && styles.tabButtonActive]}
              onPress={() => setActiveTab('privacy')}>
              <MaterialIcons
                name="privacy-tip"
                size={16}
                color={activeTab === 'privacy' ? colors.onPrimary : colors.onSurfaceVariant}
              />
              <Text
                style={[styles.tabButtonText, activeTab === 'privacy' && styles.tabButtonTextActive]}>
                Gizlilik Politikası
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'terms' }}
              style={[styles.tabButton, activeTab === 'terms' && styles.tabButtonActive]}
              onPress={() => setActiveTab('terms')}>
              <MaterialIcons
                name="description"
                size={16}
                color={activeTab === 'terms' ? colors.onPrimary : colors.onSurfaceVariant}
              />
              <Text
                style={[styles.tabButtonText, activeTab === 'terms' && styles.tabButtonTextActive]}>
                Kullanım Koşulları
              </Text>
            </Pressable>
          </View>

          {/* İçerik Listesi */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {renderFormattedContent(section.content)}
              </View>
            ))}
          </ScrollView>

          {/* Alt Onay Butonu */}
          <View style={styles.footer}>
            {isFirstLaunch && <Pressable accessibilityRole="checkbox"
              accessibilityState={{ checked: isAdult }} onPress={() => setIsAdult(!isAdult)}>
              <Text style={styles.consentNoticeText}>{isAdult ? '☑' : '☐'} 18 yaşında veya daha büyük olduğumu onaylıyorum.</Text>
            </Pressable>}
            {isFirstLaunch ? (
              <Text style={styles.consentNoticeText}>
                Devam ederek Gizlilik Politikası ve Kullanım Koşulları’nı okuduğunuzu ve kabul ettiğinizi beyan edersiniz.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isFirstLaunch && !isAdult}
              accessibilityState={{ disabled: isFirstLaunch && !isAdult }}
              accessibilityLabel={isFirstLaunch ? 'Kabul Ediyorum ve Devam Et' : 'Anladım'}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed, isFirstLaunch && !isAdult && { opacity: 0.45 }]}
              onPress={isFirstLaunch ? (onAccept ?? onClose) : onClose}>
              <Text style={styles.confirmButtonText}>
                {isFirstLaunch ? 'Kabul Ediyorum ve Devam Et' : 'Anladım'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.cardInternal,
  },
  modalCard: {
    ...elevation.level1Card,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xxl,
    padding: spacing.cardInternal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerTitleGroup: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  headerEyebrow: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    padding: 4,
    marginTop: 12,
    marginBottom: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  tabButtonText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.surfaceContainerLowest,
    fontWeight: '700',
  },
  scrollArea: {
    flexGrow: 0,
    marginTop: 10,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 14,
  },
  sectionTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 21,
  },
  boldText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    color: colors.onSurface,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  consentNoticeText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  confirmButtonText: {
    ...typography.bodyMd,
    color: colors.surfaceContainerLowest,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
