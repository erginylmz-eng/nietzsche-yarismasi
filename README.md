# 🏛️ Nietzsche Felsefî Değerlendirme Yarışması Platformu

Friedrich Nietzsche'nin perspektifinden kurumsal vakaları analiz etmek için tasarlanmış, yapay zeka destekli bir platform.

## 📋 Özellikler

- **🔐 Google OAuth**: Google hesabıyla güvenli giriş
- **🚫 Beyaz Liste Erişim Kontrolü**: Sadece yönetici + belirlenen 3 katılımcının e-postası platforma girebilir. Listede olmayan bir hesap giriş yapmaya çalıştığında oturumu anında kapatılır ve "ÇOK ŞANSSIZSINIZ! Friedrich Wilhelm Nietzsche Çalışma Grubu'nda olmadığınız için bu platforma erişemezsiniz" mesajı gösterilir. Aynı kısıtlama Firestore güvenlik kurallarında da uygulanır (tarayıcı konsolundan doğrudan erişim denemeleri de engellenir)
- **👀 Canlı Katılımcı Paneli**: Yönetici, kayıt olan katılımcıları anlık görür
- **🟢 Gerçek Zamanlı Çevrimiçi Durumu**: Katılımcı sekmesi açıkken her 15 saniyede bir "hâlâ buradayım" sinyali (heartbeat) gönderir. Admin panelindeki "Bağlı / Bağlı Değil" rozeti bu sinyale göre canlı hesaplanır — biri sekmesini kapatır ya da bağlantısını kaybederse ~40 saniye içinde otomatik olarak "Bağlı Değil" görünür, elle "Çıkar"a gerek kalmaz. Not: bir tur zaten başladıktan sonra "kaç kişi cevap vermesi bekleniyor" sayımı hâlâ ilk bağlanma anındaki kayda dayanır — turu ortasında sessizce ayrılan biri o turdan çıkarmak isterseniz yine elle "Çıkar" kullanmanız gerekir
- **🤖 AI-Destekli Vaka Üretimi**: Yarışma başlatıldığı anda yapay zeka, önceden kimsenin bilmediği bir vaka üretir — yönetici de dahil herkes vakayı aynı anda görür. Yapay zeka, "30 yıllık birikime sahip bir lojistik şirketinde yönetim kurulu başkanı" rolünü üstlenerek kendi şirketinin karşılaştığı gerçekçi bir yönetim ikilemini (otomasyon, ekip küçültme, maliyet kısma vb.) anlatır ve sonunda 2-3 alt sorudan oluşan bir karar sorusu sorar — vaka hiçbir felsefi isim/kavram içermez, katılımcı Nietzsche'nin bakış açısını kendi başına uygulamak zorundadır
- **⏱️ Real-time Timer**: 30 dakikalık çalışma süresi, sayfa yenilense bile doğru kalır
- **⏳ Bekleme Ekranı**: Bir katılımcı cevabını gönderdiğinde diğerlerinin bitirmesini bekler
- **📊 Otomatik Değerlendirme**: Tüm katılımcılar cevaplayınca (veya süre dolunca) yapay zeka otomatik olarak puanlar
- **💸 Ücretsiz**: Groq API'nin ücretsiz katmanı kullanılıyor — kredi kartı/ödeme yöntemi hiç istenmez
- **🏆 Ödüllendirme**: Vaka başına en iyi cevaba 20.000 TL, kazanan otomatik belirlenir
- **📱 Responsive Design**: Mobil telefon ve tablet genişliklerinde (media query ile) düzen otomatik daralır — başlık, buton, sayaç, katılımcı kartları ve eğitim önizleme penceresi küçük ekranlarda taşma yapmadan yeniden düzenlenir
- **🎨 Pastel Tasarım**: Arayüz, gradyan, buton ve rozet renkleri daha yumuşak/pastel bir palete güncellendi (okunabilirlik korunarak)
- **📚 Geçmiş Denemeler**: Paylaşılmış her vaka "Deneme - N" olarak açılır/kapanır bir listede kalıcı olarak saklanır; herkes istediği zaman geri dönüp cevapları/puanları/gerekçeleri tekrar görebilir
- **✅ Kazanımlar / ❌ Hatalar**: Her değerlendirme artık sadece güçlü yönleri değil, puanın nereden/neden kırıldığını ve kişiye özel gelişim önerisini de ayrı ayrı gösterir
- **📄 Size Özel Gelişim Makalesi**: Değerlendirme tamamlandığında, her katılımcı için ayrıca ikinci bir yapay zeka çağrısı yapılır — kişinin en düşük puan aldığı kriter(ler)i hedef alan, kurumsal/profesyonel dilde yazılmış 300-500 kelimelik bir gelişim makalesi üretilir (sonunda somut "Uygulama Notları" ile birlikte). Sonuç kartında "Hatalar" kutusunun altında açılır/kapanır bir bölüm olarak görünür; mevcut şeffaflık ilkesine uygun olarak herkes herkesin makalesini görebilir
- **🏆 Örnek En İyi Cevap**: Değerlendirme sırasında, vaka başına bir kez (katılımcı başına değil), yapay zeka o vakaya verilebilecek 100 puanlık örnek/model bir cevap üretir ve bunun 5 kriterin her birinden neden tam puan aldığını ayrı ayrı açıklar. Bu bilgi hiçbir şekilde vaka aktifken/cevaplanırken gösterilmez; sadece admin "Sonuçları Katılımcılara Paylaş"a bastıktan sonra, ilgili "Deneme - N" kaydının vaka metninin hemen altında, katılımcı sonuçlarından önce görünür hale gelir
- **🎓 Eğitimler**: Admin, katılımcılar için eğitim dosyası (~650 KB'a kadar PDF/Word/Excel/metin/resim) yükleyebilir. Sadece "Oku" ile görüntülenir — indirme butonu yok; Word (.docx) ve Excel (.xlsx) dosyaları da tarayıcı içinde okunabilir şekilde gösterilir. Admin panelinde her eğitim için "kim okudu / kim okumadı" listesi görünür
- **⏱️ Eğitim Okuma Süresi Takibi**: "Oku"ya basıldığı an başlar, pencere kapatılınca (ya da sekme gizlenince) biter; okurken her 20 saniyede bir kısmi kayıt alınır, ani kapanmalarda en fazla ~20 saniyelik veri kaybı olur. Admin panelinde ayrı bir **"📊 Eğitim Katılım Raporu"** bölümünde her katılımcı × her eğitim için okundu/okunmadı ve toplam harcanan süre tek bir tabloda görünür
- **🧪 Pratik Modu**: Katılımcı ekranında, "Eğitimler" bölümünün hemen altında, gerçek yarışmadan tamamen bağımsız kişisel bir alan. Bir katılımcı istediği an "Yeni Pratik Vakası Oluştur"a basarak kendine özel, gerçek yarışma vakalarıyla aynı tarz/persona ile üretilmiş bir pratik vaka alır, kendi hızında cevap yazıp gönderir ve anında SADECE kendi puanını/kriterlerini/kazanım-hata detaylarını görür. Diğer katılımcılar bu pratik denemeyi göremez, bekleme sayaçlarını etkilemez, gerçek yarışma sonuçlarına ya da ödüle hiçbir şekilde karışmaz. Günlük ücretsiz yapay zeka kotasının asıl 7 yarışma turu için yeterli kalması adına, katılımcı başına günde en fazla 5 pratik vakası ile sınırlıdır (bu sınır `backend/api.js` içindeki `PRACTICE_DAILY_LIMIT` sabitinden değiştirilebilir). Geçmiş pratik denemeleri "Geçmiş Pratik Denemeleri" listesinde kalıcı olarak saklanır

## 🧠 Nasıl Çalışır (Akış)

1. Admin ve katılımcılar Google ile giriş yapar. Admin panelinde kimlerin bağlı olduğu canlı görünür.
2. Admin "Yapay Zekadan Yeni Vaka İste ve Yarışmayı Başlat" butonuna basar.
3. Sunucu (backend), yapay zeka servisini çağırarak o an, özgün bir vaka üretir ve Firestore'a yazar. Bu an itibarıyla hem admin hem tüm katılımcılar vakayı aynı anda görür — önceden kimse bilmez.
4. Katılımcı ekranında 30 dakikalık geri sayım başlar; herkes kendi cevabını metin kutusuna yazar.
5. Bir katılımcı "Cevabı Gönder"e bastığında ekranı "diğer katılımcıları bekliyoruz (X / Y cevapladı)" durumuna geçer.
6. **Tüm bağlı katılımcılar cevap verdiğinde (ya da 30 dakika dolduğunda)** — admin bir katılımcı sayılmaz, sadece gerçek katılımcılar beklenir — sistem otomatik olarak yapay zeka servisine her cevabı gönderir, 5 kritere göre ağırlıklı puanlar (toplam 100 puan) ve en yüksek puanı alanı o vakanın kazananı olarak belirler (20.000 TL). Aynı adımda, vaka başına bir kez, o vakaya verilebilecek 100 puanlık örnek en iyi cevap da üretilir.
7. **Değerlendirme bitince sonuçlar önce sadece admin'e görünür** (cevaplar + puanlar + gerekçeler). Admin panelinde "📢 Sonuçları Katılımcılara Paylaş" butonu belirir; admin sonuçları inceler.
8. Admin butona bastığında sonuçlar **tüm katılımcılara aynı anda** açılır — her katılımcı kendi puanını, gerekçesini ve diğer tüm katılımcıların cevap/puan/gerekçelerini görür. Aynı anda, ilgili "Geçmiş Denemeler" kaydında vaka metninin altında örnek en iyi cevap ve bu cevabın neden tam puan aldığının açıklaması da görünür hale gelir. Amaç kişileri birbirine karşı yarıştırmak değil, Nietzsche'nin fikirlerine en yakın cevabı bulmak ve herkesin kendi eksiklerini görmesini sağlamaktır.
9. Admin bir sonraki vaka için tekrar "Yeni Vaka İste ve Başlat" butonuna basar (7 vaka için 7 kez).

## 🚀 Kurulum

### 1. Gereksinimler

- Node.js 18+
- Firebase projesi (Firestore + Google Authentication açık)
- Groq API key (ücretsiz, kredi kartı istemez) — https://console.groq.com/keys
- Railway hesabı (deployment için)

### 2. Firebase Setup

1. [Firebase Console](https://console.firebase.google.com) → projeni aç
2. **Firestore Database** oluştur (zaten yoksa)
3. **Authentication → Sign-in method → Google** etkinleştir
4. **Authentication → Settings → Authorized domains** kısmına Railway domain'ini ekle (örn. `nietzsche-yarismasi-production.up.railway.app`)
5. **Proje Ayarları (⚙️) → Service Accounts → Generate New Private Key** — bu indirdiğin JSON dosyasından `project_id`, `client_email`, `private_key` değerlerine ihtiyacın olacak (backend'in Firestore'a admin olarak yazabilmesi için)
6. **Firestore Database → Rules** kısmına bu repodaki `firestore.rules` dosyasının tam içeriğini yapıştır ve **Publish**'e bas (Eğitimler özelliği için `trainings`, Pratik Modu için `practice_attempts` koleksiyon kuralları eklendi — eskisinin üzerine tamamını yaz)

> **Katılımcı beyaz listesini güncellemek istersen:** `public/index.html` içindeki `ALLOWED_PARTICIPANT_EMAILS` dizisini ve `firestore.rules` içindeki `isAllowed()` fonksiyonundaki e-posta listesini **birlikte** güncelleyip Firestore Rules'u tekrar **Publish**'lemen gerekir — sadece birini değiştirmek yeterli olmaz (istemci ve sunucu tarafı ayrı ayrı kontrol ediyor).

### 3. Environment Variables (Railway)

Railway projende **Variables** sekmesine şunları ekle (kod içine ASLA yazılmaz, sadece Railway'e):

```
GROQ_API_KEY=gsk_...
FIREBASE_PROJECT_ID=nietzsche-yarismasi
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@nietzsche-yarismasi.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`GROQ_API_KEY` için https://console.groq.com/keys adresinden e-posta ya da Google hesabınla saniyeler içinde ücretsiz bir key alabilirsin — ödeme yöntemi/kredi kartı HİÇ istemez, bu yüzden Google Gemini'de yaşanan "aylık harcama tavanı" riski burada söz konusu değildir.

`FIREBASE_PRIVATE_KEY` değerini service account JSON dosyasındaki `private_key` alanından **tırnaklarıyla birlikte** kopyala (içindeki `\n` karakterleri olduğu gibi kalsın).

`.env.example` dosyası tam olarak hangi alanların gerektiğini gösterir.

### 4. Lokal Çalıştırma (opsiyonel)

```bash
npm install
cp .env.example .env   # .env dosyasını doldur
npm start               # backend/api.js hem API'yi hem public/ klasörünü aynı porttan sunar
```

## 📦 Deployment (Railway)

Bu repo artık **tek bir Node.js sunucusu** olarak çalışır (kök dizindeki `package.json` sayesinde) — hem `/api/...` uçlarını hem `public/index.html`'i aynı Railway servisinden sunar. Ayrı bir statik site / ayrı bir backend servisi gerekmez.

```bash
git add .
git commit -m "..."
git push origin main
```

Railway, push sonrası otomatik olarak yeniden deploy eder. Environment variable'lar (yukarıdaki 4 değer) Railway Dashboard → Variables kısmında bir kez ayarlanır, her deploy'da kalıcıdır.

## 📐 API Endpoints

### POST `/api/start-round`
Yeni bir vaka üretir (yapay zeka ile), Firestore'a yazar, yarışmayı başlatır. Sadece admin panelindeki buton çağırır.

### POST `/api/evaluate-round`
Aktif vakanın tüm katılımcıları (admin hariç) cevapladıysa ya da süre dolduysa cevapları yapay zeka ile değerlendirir, kazananı belirler ve oturum durumunu `reviewed` yapar (sonuçlar bu noktada sadece admin'e görünür, katılımcılara henüz açılmaz). Katılımcı tarafında cevap gönderildiğinde ve süre dolduğunda otomatik çağrılır — çakışan çağrılara karşı sunucu tarafında kilitlenir (aynı vaka iki kez değerlendirilmez). Ücretsiz katmanın dakikalık/günlük istek sınırına takılırsa otomatik olarak kısa bekleyip yeniden dener, gerekirse yedek bir modele geçer.

### POST `/api/publish-results`
Oturum durumu `reviewed` iken çağrılabilir; durumu `finished` yapar ve bu anda sonuçlar (cevaplar + puanlar + gerekçeler) tüm katılımcı ekranlarında aynı anda görünür hale gelir. Sadece admin panelindeki "Sonuçları Katılımcılara Paylaş" butonu çağırır.

### GET `/api/winners`
Tüm vakaların kazananlarını ve toplam ödül tutarını döner.

## 🔧 Teknik Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (tek dosya, `public/index.html`)
- **Backend**: Node.js, Express.js (`backend/api.js`) — statik dosyaları da aynı sunucudan sunar
- **Database**: Firebase Firestore (gerçek zamanlı senkronizasyon)
- **Auth**: Firebase Authentication + Google OAuth
- **AI**: Groq API, `openai/gpt-oss-120b` modeli (birincil), `llama-3.3-70b-versatile` ve `llama-3.1-8b-instant` yedek modeller — ücretsiz katman, kredi kartı/ödeme yöntemi istemez — hem vaka üretimi hem değerlendirme için
- **Deployment**: Railway (tek servis)

## 📝 Değerlendirme Kriterleri

1. **Filozofun Bakış Açısına Sadakat** (0-30 puan)
2. **Mantıksal Tutarlılık** (0-20 puan)
3. **Vakaya Uygunluk** (0-20 puan)
4. **İkna Gücü ve Retorik Yetkinlik** (0-15 puan)
5. **Kurumsal Uygulanabilirlik** (0-15 puan)

## 🏆 Ödüllendirme

- Her vaka için 1 katılımcı seçilir (en yüksek toplam puan)
- Ödül: **20.000 TL**
- Toplam: **7 vaka × 20.000 TL = 140.000 TL**

## 🐛 Sorun Giderme

Sayfanın en altındaki siyah/yeşil **Sistem Günlüğü** kutusu her ekranda (giriş/admin/katılımcı) görünür ve önemli her adımı (Firestore yazmaları, hata kodları, API çağrı sonuçları) canlı gösterir — ilk bakılacak yer burasıdır.

### Firebase bağlantısı hatası
- Railway Variables'da `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` doğru mu kontrol et
- `FIREBASE_PRIVATE_KEY` içindeki `\n` karakterleri bozulmamış mı kontrol et (tırnak içinde kopyalanmalı)

### Google girişinde "unauthorized-domain" hatası
- Firebase Console → Authentication → Settings → Authorized domains kısmına Railway domain'ini ekle

### Yapay zeka hatası (vaka üretilmiyor / değerlendirme yapılmıyor)
- Railway Variables'da `GROQ_API_KEY` doğru mu kontrol et (https://console.groq.com/keys adresinden alınmış olmalı)
- Railway'deki **Deploy Logs**'a bak — backend konsola hatayı yazar
- Ücretsiz katmanın dakikalık/günlük istek sınırına takılırsa sistem otomatik tekrar dener, gerekirse yedek bir modele geçer; sürekli tekrarlıyorsa birkaç dakika bekleyip tekrar dene
- Her katılımcı için artık iki yapay zeka çağrısı yapılıyor (puanlama + gelişim makalesi), buna ek olarak vaka başına bir kez örnek en iyi cevap için bir çağrı daha yapılıyor; bu yüzden değerlendirme aşaması katılımcı sayısı arttıkça biraz daha uzun sürebilir — bu normaldir, admin panelinde "🤖 yapay zeka değerlendiriyor" durumunda bekle
- **Model otomatik geçişi:** Sağlayıcılar zaman zaman bir modeli emekliye ayırabiliyor ya da günlük ücretsiz kullanım hakkı beklenenden düşük çıkabiliyor. Bunun için sistem tek bir model adına bağımlı değil; `backend/api.js` içindeki `MODEL_CANDIDATES` listesinde sırayla denenecek modeller tutulur (şu an: önce `openai/gpt-oss-120b`, o çalışmazsa `llama-3.3-70b-versatile`, o da çalışmazsa `llama-3.1-8b-instant`). Bir model "bulunamadı" hatası ya da **günlük** kota hatası verirse sistem otomatik olarak listedeki bir sonraki modele geçer — elle müdahaleye gerek kalmaz
- **"rate_limit_exceeded" hatası (günlük limit):** O an denenen modelin ücretsiz katmanda bir günde izin verdiği toplam istek sayısı dolmuş demektir. Sistem bu durumda zaten otomatik olarak bir sonraki modele geçmeyi dener (yukarıya bak); TÜM modellerin günlük kotası aynı anda dolarsa ertesi gün kotalar sıfırlanınca sorun kendiliğinden düzelir
- **Neden Groq (ve neden Google Gemini değil):** Bu proje başlangıçta Google Gemini API kullanıyordu, ancak art arda iki ücretsiz-katman sorunuyla karşılaşıldı: önce bir modelin günlük istek hakkının beklenenden çok düşük çıkması, sonra da Google hesabına bir ödeme yöntemi bağlı olduğu için devreye giren "aylık harcama tavanı" hatası (bkz. https://ai.google.dev/gemini-api/docs/billing#project-spend-caps). Groq'a geçildi çünkü Groq, ödeme yöntemi/kredi kartı **hiç** istemeden ücretsiz bir API anahtarı veriyor — bu yüzden bu proje için "harcama tavanı" riski tamamen ortadan kalkıyor

### Vaka görünmüyor / yarışma başlamıyor
- Admin panelindeki Sistem Günlüğü'nde "Vaka başlatma hatası" var mı bak
- En az 1 katılımcının o an "Bağlı" (çevrimiçi) görünmesi gerekir (buton aksi halde pasif kalır) — hiç kimse bağlı değilse, ilgili katılımcının sayfayı açıp beklemesini iste

## 📧 İletişim

Sorularınız için: erginylmz@gmail.com

## 📄 Lisans

MIT License - Serbestçe kullanabilirsiniz

---

**Başarılı yarışmalar! 🏛️**
