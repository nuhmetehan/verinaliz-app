# Verinaliz Gizlilik Politikası
**Son Güncelleme:** 3 Kasım 2026

Yayıncı markası: **{{PUBLISHER_NAME}}**. Uygulama: **Verinaliz**. İletişim: **{{SUPPORT_EMAIL}}**.

Verinaliz ("Uygulama") olarak kullanıcılarımızın gizliliğine ve kişisel verilerinin korunmasına azami özen gösteriyoruz. Bu Gizlilik Politikası, Verinaliz mobil uygulamasını kullandığınızda verilerinizin nasıl ele alındığını, işlendiğini ve korunduğunu açıklamaktadır.

---

### 1. Toplanan Bilgiler ve Veri İşleme Prensipleri

#### A. Yapay Zeka (AI) Etiket, Kozmetik ve Öğün Analizi ile Fotoğraf Verileri (ÖNEMLİ)
* **Gönderim Öncesi Kontrol:** Her yeni fotoğraf grubu veya analiz türü için fotoğrafları incelemeniz ve Google Gemini’ye aktarımı ayrıca onaylamanız istenir. Fotoğrafa dokunarak tam ekranda inceleyebilirsiniz. Sunucu gerçek görsel biçimini doğrular, yeniden kodlayarak EXIF/GPS gibi metaverileri kaldırır ve özgün dosya adını Google’a iletmez. Bu işlem görüntüdeki kişileri veya kişisel yazıları anonimleştirmez; otomatik kişisel veri tespiti garantisi verilmez. Kişisel, hassas veya gizli bilgi içeren görseller gönderilmemelidir.
* **Teknik Kullanım Ölçümü:** Etkinse analiz türü, model, token sayıları ve tahmini maliyet gibi teknik sayaçlar sunucu kayıtlarına yazılır. Fotoğraf, komut/yanıt metni, hesap kimliği veya e-posta bu ölçüme eklenmez. Bu kayıtlar altyapı sağlayıcısının kayıt saklama yapılandırmasına tabidir.
* **Kapsam:** Yapay zeka analizi üç amaçla kullanılabilir: (1) gıda ambalajındaki "İçindekiler" ve "Besin Değerleri" bölümlerinin okunması, (2) kozmetik/kişisel bakım ürünlerindeki "İçindekiler / Ingredients (INCI)" listesinin okunması, (3) yemek tabağı/öğün fotoğrafından **yaklaşık** porsiyon ve besin aralığı tahmini yapılması.
* **Kalıcı Olarak Saklanmama Güvencesi:** Bu amaçlarla kameranızla çektiğiniz fotoğraflar **Verinaliz sunucularında, disklerinde veya veritabanlarında ASLA KALICI OLARAK KAYDEDİLMEZ VE SAKLANMAZ**.
* **Google Servisleri ile Anlık İşleme:** Çekip analiz için gönderdiğiniz fotoğraf yalnızca sunucumuzun geçici çalışma belleğinde (RAM) tutulur; eşzamanlı olarak metin tanıma (OCR), bileşen analizi veya görsel porsiyon tahmini yapılması amacıyla **Google Generative AI (Gemini)** servislerine güvenli şifreli bağlantı (HTTPS/TLS) ile iletilir. Görsel diske veya veritabanına yazılmaz; istek tamamlandıktan sonra geçici bellek çalışma ortamı tarafından geri kazanılır. Belleğin anında fiziksel olarak silindiği garantisi verilmez. Fotoğrafın Google tarafında işlenmesi, Google'ın kendi gizlilik ve veri işleme koşullarına (Gemini API hizmet şartları) tabidir; bu sağlayıcının veri işlemesine ilişkin kullanıcıları bilgilendirme ve uygun hizmet yapılandırmasını seçme sorumluluğumuz devam eder.
* **Fotoğraf Çekim Kuralı ve Kullanıcı Sorumluluğu:**
  * Kullanıcılar yalnızca **ürün ambalajının "İçindekiler / Besin Değerleri" bölümünün** veya **öğünlerinin** fotoğrafını çekmekle yükümlüdür.
  * Fotoğraf karesine insan yüzü, kimlik belgesi, özel hayatın gizliliğini ihlal edebilecek unsurlar, kredi kartı, fatura, ev ortamı veya herhangi bir kişisel/özel veri dahil **EDİLMEMELİDİR**.
  * Yanlışlıkla kişisel veri gönderdiyseniz destek adresinden bize ulaşın. Bu çekim kuralları, veri sorumlusu olarak yasal yükümlülüklerimizi ortadan kaldırmaz.

#### B. Kamera ve Barkod Taraması
* Kameranız barkod okuma amacıyla kullanıldığında görüntü işleme doğrudan cihazınız üzerinde (on-device) yerel olarak gerçekleşir. Kamera akışı hiçbir sunucuya aktarılmaz veya kaydedilmez.
* Okunan barkod ürün sorgulaması için Verinaliz sunucusuna, gerektiğinde Open Food Facts veya Open Beauty Facts servislerine gönderilir.

#### C. Eksik Ürün Bildirimleri (Topluluk Katkıları)
* Veritabanında bulunmayan bir ürünü bildirmek için sunulan formlar **tamamen metin tabanlıdır**. Uygulama üzerinden ürün ambalajı veya herhangi bir fotoğraf toplanmaz ve depolanmaz.
* Gönderilen metin formları (ürün adı, marka, barkod, besin değerleri, içerik bilgisi) ve hata bildirimleri **hesabınızla, cihazınızla veya IP adresinizle ilişkilendirilmez**; bu formlarda sizden herhangi bir kişisel bilgi istenmez. Kayıtlar, admin incelemesine ve ürün veritabanının iyileştirilmesine hizmet etmek üzere sunucumuzda (Supabase) tutulur. Lütfen serbest metin alanlarına kişisel bilgi yazmayınız; yanlışlıkla yazılan bir bilginin silinmesini **{{SUPPORT_EMAIL}}** adresinden talep edebilirsiniz.

#### AI Sonuç Bildirimleri
* "AI sonucunu bildir" seçeneğiyle gönderdiğiniz açıklama, analiz türü ve bildirim türü Supabase üzerinde inceleme amacıyla tutulur. Kimlik doğrulamak için oturumunuz kullanılır; hesabınızın kimliği, e-posta adresiniz, fotoğrafınız veya analiz sonucunuzun otomatik kopyası bildirim kaydına eklenmez. Sorunlu ifadeyi açıklamaya kendiniz yazabilirsiniz; kişisel ve sağlık bilgisi yazmayınız.
* Bildirimler yönetici incelemesi tamamlandıktan sonra silinir; yanlışlıkla eklediğiniz kişisel bilginin silinmesini iletişim adresimizden talep edebilirsiniz.

#### D. Hesap Girişi ve Analiz Kotası
* **E-posta ile giriş:** Önceden oluşturulmuş e-posta hesaplarıyla da giriş yapılabilir; uygulamada açık e-posta kaydı sunulmaz. E-posta ve şifre HTTPS üzerinden Verinaliz sunucusuna, kimlik doğrulama için Supabase Auth hizmetine iletilir. Şifre uygulamada veya Verinaliz veritabanında saklanmaz ve uygulama hata kayıtlarına yazılmaz; şifre doğrulama ve güvenli saklama Supabase Auth tarafından yürütülür. Bu şifre, Google hesabı şifresi değildir. E-posta hesapları da aynı oturum, kota ve hesap silme işlemlerine tabidir.
* Yapay zeka (AI) analiz özelliklerini kullanabilmek ve günlük ücretsiz analiz haklarınızın (gıda ve kozmetik etiket analizi için günde 5, öğün analizi için günde 2 hak) adil şekilde hesabınıza tanımlanmasını sağlamak amacıyla **Google ile veya önceden oluşturulmuş e-posta hesabıyla** giriş yapmanız gerekir.
* Giriş yaptığınızda temel hesap bilgileriniz (**kullanıcı ID'si, adınız, e-posta adresiniz ve varsa Google profil fotoğrafı bağlantınız**) kimlik doğrulama ve günlük analiz kotanızın takibi (kullanıcı ID'si, tarih ve kullanılan hak sayısı) amacıyla Supabase üzerinde işlenir; Google şifreniz uygulamamızla asla paylaşılmaz. Oturumunuzun açık kalması için oturum ve yenileme belirteçleri mobil cihazınızda işletim sisteminin güvenli depolamasında (SecureStore) tutulur. Önceki sürümlerdeki yerel oturum kaydı ilk erişimde güvenli depolamaya taşınır ve eski kopya kaldırılır. Web sürümünde oturum yalnızca geçici bellekte tutulur.
* Barkod tarama ve katkı maddesi rehberi özellikleri ise herhangi bir hesap girişi gerektirmeden kullanılabilir.
* **Kötüye kullanımın önlenmesi:** Hesabınızı sildiğinizde, aynı gün içinde silip yeniden giriş yaparak günlük analiz haklarının sıfırlanmasını önlemek amacıyla yalnızca **o günün kullanım sayaçları**, Google hesap kimliğinizden (e-posta hesaplarında e-posta adresinden) geri döndürülemez biçimde türetilmiş bir özet (HMAC-SHA256) ile saklanır. Bu kayıt e-posta, ad gibi doğrudan kimlik bilgisi içermez; ancak sizinle ilişkilendirilebilen takma adlı (pseudonymised) bir tanımlayıcı olduğundan **kişisel veri olarak değerlendirilir** ve Türkiye saatiyle gün değiştikten sonra çalışan 15 dakikalık temizlik döngüsünde silinir; hizmet kesintisinde temizlik yeniden başlatıldığında denenir. Dayanak: hizmetin adil kullanımını ve kaynakların korunmasını sağlamaya yönelik meşru menfaat (KVKK m.5/2-f, GDPR m.6/1-f). Bu işlemeye itiraz etmek ve kaydın hemen silinmesini talep etmek için **{{SUPPORT_EMAIL}}** adresine başvurabilirsiniz.

#### E. Yerel Olarak Saklanan Veriler
* Taranan ürün geçmişiniz, favori ürünleriniz, günlük kota bilgisinin yerel kopyası ve geçmiş AI analiz kayıtlarınız (**analiz için çektiğiniz fotoğrafların cihazınızdaki bağlantıları ve analiz sonuçları dahil**) yalnızca **kendi cihazınızın yerel hafızasında** (AsyncStorage) tutulur. Bu yerel geçmiş/favori kayıtları otomatik olarak sunucularımıza yüklenmez ve uygulama içerisinden temizlenebilir; analiz için çektiğiniz fotoğraf ise analiz isteği sırasında sunucumuza ve Google Gemini’ye iletilir; "Hesaptan Çıkış Yap" işlemi güvenli depolamadaki oturum belirtecinizi ve yerel kota kopyanızı cihazdan siler.
* Geçmiş kayıtlarını silmek yerel kayıt ve bağlantıları kaldırır. Kamera tarafından oluşturulan geçici dosyalar işletim sisteminin önbelleğinde kalabilir; fiziksel dosyaların anında silineceği garantisi verilmez.

#### F. Güvenlik ve İstek Sınırlama (Rate Limiting)
* Uygulamanın güvenliğini sağlamak, sunucu kaynaklarını korumak ve kötüye kullanımı (spam/DDoS) önlemek amacıyla genel API isteklerinde geçici hız sınırlama uygulanır.
* Hız sınırlama ve bölgesel erişim kontrolü için IP adresi geçici bellekte işlenir. Ülke, sunucudaki GeoLite2 verisiyle yaklaşık olarak belirlenir; bu sorgu için IP adresi harici bir konum servisine gönderilmez. Barındırma ve kimlik doğrulama sağlayıcıları güvenlik/işletim amaçlı IP adresi, istek zamanı, durum kodu ve oturum olayları gibi teknik kayıtlar işleyebilir. Fotoğraflar, oturum belirteçleri ve AI yanıtlarının tam metni uygulama sunucusunun hata kayıtlarına bilinçli olarak yazılmaz. Altyapı kayıtlarının saklama süresi ilgili sağlayıcı yapılandırmasına bağlıdır; kalıcı kayıt tutulmadığı garantisi verilmez.

#### G. Admin Yönetim Paneli ve Oturum Çerezi
* Uygulama arka ucunda yalnızca **yetkili yöneticilerin** kullanabileceği bir admin paneli mevcuttur. Bu panele erişim için `HttpOnly`, `Secure` ve `SameSite=Strict` özellikli bir oturum çerezi kullanılmaktadır. Bu çerez **yalnızca yöneticileri** etkiler; son kullanıcılara hiçbir çerez yerleştirilmez.

---

### 2. Bilgilerin Paylaşımı ve Üçüncü Taraf Servisler
Kişisel verileriniz hiçbir şekilde üçüncü taraflara satılmaz, kiralanmaz veya reklam/pazarlama amacıyla paylaşılmaz. Hizmetin yürütülmesi için yalnızca aşağıdaki altyapı sağlayıcıları kullanılır:
* **Google (Google OAuth 2.0 & Google Generative AI / Gemini):** Güvenli kullanıcı girişi (Google Sign-In) ve ambalaj etiketlerinin (gıda/kozmetik) ile öğün görsellerinin yapay zeka ile anlık analizi için (görseller sunucumuzda kalıcı depolanmaz; Google tarafındaki işleme Google'ın kendi koşullarına tabidir).
* **Açık Kaynak Veritabanları (Open Food Facts & Open Beauty Facts):** Barkod taramalarında genel ve kamuya açık gıda ve kozmetik ürün bilgilerini sorgulamak için. Ürün verileri Open Database License (ODbL) kapsamında kullanılmaktadır.
* **Supabase:** Ürün metin kataloğunun, hata bildirimlerinin, topluluk katkılarının, Google OAuth oturum doğrulamasının ve kullanıcı bazlı günlük analiz kotalarının yönetimi için (ambalaj fotoğrafları barındırılmaz).
* **Railway:** Uygulama sunucusunun barındırılması için kullanılan bulut altyapı sağlayıcısı.
* **Expo / EAS Update:** Uygulama güncellemelerini kontrol etmek ve indirmek için Expo güncelleme sunucularına bağlanır. Bu isteklerde IP adresi, platform, uygulama çalışma zamanı/sürüm bilgileri, güncelleme bilgileri ve EAS istemci/kurulum kimliği işlenebilir. Önceki bir güncelleme başlatılamadıysa sınırlı teknik hata bilgisi de gönderilebilir. Bu mekanizma üzerinden analiz fotoğrafı veya tarama geçmişi yüklenmez. Teknik verilerin sağlayıcı tarafındaki saklanması Expo hizmet koşulları ve yapılandırmasına bağlıdır.

Google tarafındaki veri kullanımı kullanılan Gemini hizmet planına bağlıdır. Ücretsiz hizmetlerde girdiler/yanıtlar ürün ve model geliştirme amacıyla kullanılabilir ve insan incelemesine tabi olabilir; hassas, gizli veya kişisel veri gönderilmemelidir. Aktif faturalandırmaya bağlı ücretli API hizmetinde girdiler/yanıtlar ürün geliştirme amacıyla kullanılmaz; güvenlik ve kötüye kullanım denetimi için sınırlı süreli kayıt işlenebilir. Ayrıntılar: https://ai.google.dev/gemini-api/terms . Fotoğrafı kalıcı olarak kendi sunucumuzda saklamamamız, Google tarafında hiçbir işleme veya saklama yapılmadığı anlamına gelmez. Sağlayıcılar yurt dışında veri işleyebilir; veri aktarımına ilişkin geçerli yükümlülüklerimiz devam eder.

---

### 3. Veri Güvenliği
Uygulama ile sunucular arasındaki tüm veri akışı endüstri standardı modern SSL/TLS şifreleme protokolleri ile güvence altındadır.

---

### 4. Kullanıcı Hakları (KVKK & GDPR)
Kullanıcılar;
* Haklarında herhangi bir kişisel veri işlenip işlenmediğini öğrenme,
* Uygulama arayüzünden diledikleri an Google hesaplarından çıkış yapma, **"Hesabımı Sil"** seçeneğiyle hesaplarını ve hesaba bağlı sunucu kota kayıtlarını silme (yukarıda açıklanan günlük kötüye kullanım önleme özeti hariç), Geçmiş ekranından tarama/AI analiz kayıtlarını ve Favorilerim ekranından favorilerini kaldırma veya hesap silerken cihazdaki tüm kayıtları da temizlemeyi seçme (hesap silme bilgi sayfası: `/account-deletion`),
* Uygulamaya erişemiyorlarsa sunucularımızdaki hesap/kota kayıtlarının veya bildirim/katkı kayıtlarının silinmesini **{{SUPPORT_EMAIL}}** adresine e-posta göndererek talep etme hakkına sahiptir.

**Unutulma Hakkı (Right to Erasure):** GDPR kapsamında AB'li kullanıcılar ile KVKK kapsamında Türkiye'deki kullanıcılar, işlenen verilerinin silinmesini talep edebilir. Talepler en geç **30 gün** içinde yanıtlanır.

İletişim ve talepleriniz için: **{{SUPPORT_EMAIL}}**

---

### 5. Veri Saklama Süreleri
| Veri Türü | Saklama Süresi |
|---|---|
| AI analizi için yüklenen etiket/kozmetik/öğün fotoğrafları | Anlık işleme — sunucuda SAKLANMAZ |
| Google hesap bilgileri (ID, ad, e-posta, profil fotoğrafı bağlantısı) ve günlük kota sayacı (etiket + öğün) | Hesap aktif olduğu sürece (kullanıcı talebiyle silinebilir) |
| Hesap silme sonrası günlük kota özeti (takma adlı tanımlayıcı + o günün sayaçları) | Türkiye saatiyle gün değiştikten sonraki 15 dakikalık temizlik döngüsünde; kesintide yeniden başlatıldığında temizlik denenir |
| Genel API güvenlik (rate-limit) sayacı | Pencere süresi sonunda otomatik sıfırlanır (15 dk - 1 saat) |
| Expo güncelleme isteklerine ait teknik veriler ve istemci/kurulum kimliği | Sağlayıcı koşulları ve yapılandırmasına bağlı; gerçek saklama süresi ayrıca doğrulanmalıdır |
| Hata bildirimleri ve ürün katkı formları (kişisel veri içermez, hesaba bağlı değildir) | Ürün veritabanı iyileştirme amacıyla tutulur; talep halinde silinir |
| AI sonucu bildirim açıklaması ve türü | Yönetici incelemesi tamamlanıncaya kadar; talep halinde silinir |
| Cihaz üzerindeki geçmiş/favoriler | Kullanıcı silinceye kadar — sunucuya aktarılmaz |

---

### 6. Yaş Sınırı
Verinaliz 18 yaş ve üzerindeki yetişkinlere yöneliktir. 18 yaşından küçüklerin uygulamayı kullanmaması gerekir. Ebeveyn onayı bu yaş sınırının yerine geçmez. Yaş sınırının altında bir kullanıcıya ait veri işlendiğini düşünüyorsanız {{SUPPORT_EMAIL}} adresinden silme talebinde bulunabilirsiniz.

---

### 7. İletişim ve Veri Sorumlusu
* **Veri sorumlusu:** {{DATA_CONTROLLER}}
* **Geliştirici markası:** {{PUBLISHER_NAME}}

Gizlilik politikası ile ilgili sorularınız, veri silme/güncelleme talepleriniz için:
* **E-posta:** {{SUPPORT_EMAIL}}
