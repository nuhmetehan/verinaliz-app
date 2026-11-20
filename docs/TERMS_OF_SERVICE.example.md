# Verinaliz Kullanım Koşulları
**Son Güncelleme:** 20 Kasım 2026

Verinaliz uygulamasını ("Uygulama") kullanarak aşağıdaki Kullanım Koşullarını ("Koşullar") kabul etmiş sayılırsınız. Lütfen bu koşulları dikkatlice okuyunuz.

---

### 1. Hizmetin Niteliği
Verinaliz; ambalajlı gıda ve kozmetik/kişisel bakım ürünlerinin barkodlarının taranması, ambalaj üzerindeki "İçindekiler" bölümünün fotoğraflanması veya öğün görsellerinin incelenmesi yoluyla ürün bileşenleri, E-kodlu katkı maddeleri, kozmetik bileşenleri, potansiyel alerjenler ve yaklaşık öğün aralıkları hakkında tüketicileri bilgilendirmeyi amaçlayan bağımsız bir analiz rehberidir.

---

### 2. Tıbbi Tavsiye, Dermatoloji ve Teşhis Sorumluluk Reddi (ÖNEMLİ)
* **Tıbbi Hizmet Değildir:** Verinaliz tıbbi cihaz değildir; herhangi bir hastalığı teşhis etmez, tedavi etmez veya önlemez. Verinaliz bir tıp kuruluşu, sağlık personeli, dermatolog veya diyetisyenlik hizmeti değildir.
* **Teşhis veya Tedavi Amacı Taşımaz:** Uygulama tarafından sunulan risk seviyeleri, içerik uyarıları, özetler ve yaklaşık öğün kalori/besin tahminleri **yalnızca tüketici bilgilendirme amaçlıdır**; hiçbir surette tıbbi tavsiye, klinik/dermatolojik teşhis veya alerji/intolerans tedavisi yerine geçmez.
* **Uzman Görüşü Esastır:** Sağlık durumunuzu, cilt hassasiyetlerinizi, ciddi alerjilerinizi, çölyak veya metabolik hastalıklarınızı ilgilendiren her türlü karar için mutlaka hekiminize veya yetkili bir sağlık uzmanına danışınız.

---

### 3. Ambalaj Bilgisinin Üstünlüğü ve Veri Sorumluluğu
* **Üretici Değişiklikleri:** Üretici firmalar ürün içeriklerini, katkı maddesi oranlarını, alerjen uyarılarını ve üretim tesisi koşullarını önceden bildirmeksizin değiştirebilir.
* **Fiziki Ambalaj Esastır:** Veritabanındaki veya yapay zeka analizindeki olası uyuşmazlıklarda **her zaman ürünün fiziki ambalajı üzerindeki en güncel etiket bilgileri geçerlidir**.
* **Çapraz Bulaşma Uyarısı:** Üretim hattındaki eser miktardaki çapraz bulaşmalar ("iz miktarda içerebilir" ibareleri) veri tabanlarında veya görsel analizlerde her zaman tespit edilemeyebilir. Ciddi alerjik reaksiyon riski taşıyan bireyler ambalajı bizzat okumalıdır.

---

### 4. Yapay Zeka (AI) İçerik Analizi ve Fotoğraf Çekim Kuralları
Verinaliz; ürün ambalajındaki (gıda veya kozmetik) içindekiler yazısını okumak, katkı/bileşenleri sınıflandırmak ve öğün görsellerini yaklaşık olarak incelemek için üçüncü taraf yapay zeka teknolojilerinden (Cloudflare Workers AI) yararlanır:
* **Görsel analizi.** Verinaliz sunucusu, dosya biçimini denetleyip konum ve kamera metaverilerini kaldırır. Fotoğrafı HTTPS üzerinden Cloudflare Workers AI’a gönderir. Gemma 4 etiket veya öğün görselini doğrudan analiz eder. Görsel sunucumuzda yalnızca işlem sırasında geçici bellekte tutulur. AI Gateway kullanıldığında istek ve yanıt gövdelerinin kaydı kapalıdır. Cloudflare faturalandırma için teknik kullanım kayıtları tutabilir. Sağlayıcı yurt dışında veri işleyebilir.
* **Öğün Analizi Sınırlaması:** Öğün analizi **kesin ölçüm değildir**; pişirme yağı, sos, alerjen, gramaj gibi görselden anlaşılamayan unsurlar olabileceğinden yalnızca yaklaşık aralıklar sunulur. Yapay zeka hata yapabilir; son karar kullanıcıya aittir.
* **Fotoğraf Çekiminde Kullanıcı Yükümlülükleri:**
  1. Kullanıcı, yalnızca ambalajın **"İçindekiler / Besin Değerleri" bölümünün** veya **öğününün** net bir fotoğrafını çekmeyi taahhüt eder.
  2. Fotoğraf karesinde **insan yüzü, çocuk görüntüsü, kimlik belgesi, özel yaşam alanları veya herhangi bir kişisel veri yer alamaz**.
  3. Kişisel veri içeren bir görsel yanlışlıkla gönderilirse destek adresine bildirilmelidir. Veri sorumlusu olarak yasal yükümlülüklerimiz devam eder.
  4. Yapay zekayı yanıltmaya yönelik manipülatif veya kötü niyetli komutlar içeren görsellerin yüklenmesi yasaktır.

---

### 5. Tarafsızlık ve Marka Bağımsızlığı
* Verinaliz bağımsız bir girişimdir; hiçbir gıda markası, üreticisi ya da perakendecisi ile sponsorluk veya ticari bağımlılığı yoktur.
* EFSA, DSÖ ve diğer resmi kaynak bağlantıları genel bilgilendirme sağlar. Her bileşen, AI sonucu veya rozet için ayrı bilimsel doğrulama yapıldığı ya da bu kurumların uygulamayı onayladığı iddia edilmez. Sınıflandırmalar kişisel güvenlik garantisi değildir.
* Hiçbir ürün hedef alınmaz, karalanmaz veya haksız olarak övülmez.
* Marka sahipleri ve üreticiler, ürün bilgilerine ilişkin güncelleme veya düzeltme taleplerini **{{SUPPORT_EMAIL}}** adresinden iletebilirler.

---

### 6. Kullanım Kotaları, Hesap Girişi ve Hizmet Sürekliliği
* Giriş yapan her hesap son yedi gün içinde üç başarılı etiket ve iki başarılı öğün analizi yapabilir. Aynı istekteki iki ambalaj fotoğrafı bir etiket hakkı kullanır. Her hak, kullanıldığı andan yedi gün sonra açılır. Genel API hız sınırları ayrıca uygulanır.
* Verinaliz, hizmet özelliklerini önceden haber vermeksizin güncelleme, kota politikalarını değiştirme veya geçici bakım durumlarında durdurma hakkını saklı tutar.

---

### 7. Sorumluluğun Sınırlandırılması
Yürürlükteki mevzuatın izin verdiği azami ölçüde Verinaliz;
* Uygulama içerisindeki olası eksik veya güncel olmayan bilgilerden,
* Tespit edilemeyen alerjen veya katkı maddelerinden kaynaklı doğrudan/dolaylı sağlık sorunlarından veya alerjik reaksiyonlardan,
* Kullanıcının yapay zeka analizine dayanarak aldığı tüketim kararlarından sorumlu tutulamaz.

---

### 8. Yaş Sınırı
Verinaliz 18 yaş ve üzerindeki yetişkinlere yöneliktir. 18 yaşından küçüklerin uygulamayı kullanmaması gerekir. Ebeveyn onayı bu yaş sınırının yerine geçmez. Yaş sınırının altında bir kullanıcıya ait veri işlendiğini düşünüyorsanız {{SUPPORT_EMAIL}} adresinden silme talebinde bulunabilirsiniz.

---

### 9. Yürürlük ve İletişim
Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir.

* **İletişim:** {{SUPPORT_EMAIL}}
