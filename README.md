# 🏛️ Nietzsche Felsefî Değerlendirme Yarışması Platformu

Friedrich Nietzsche'nin perspektifinden kurumsal vakaları analiz etmek için tasarlanmış, yapay zeka destekli bir platform.

## 📋 Özellikler

- **🔐 Google OAuth**: Google hesabıyla güvenli giriş
- **🚫 Beyaz Liste Erişim Kontrolü**: Sadece yönetici + belirlenen 3 katılımcının e-postası platforma girebilir. Listede olmayan bir hesap giriş yapmaya çalıştığında oturumu anında kapatılır ve "ÇOK ŞANSSIZSINIZ! Friedrich Wilhelm Nietzsche Çalışma Grubu'nda olmadığınız için bu platforma erişemezsiniz" mesajı gösterilir. Aynı kısıtlama Firestore güvenlik kurallarında da uygulanır (tarayıcı konsolundan doğrudan erişim denemeleri de engellenir)
- **👀 Canlı Katılımcı Paneli**: Yönetici, kayıt olan katılımcıları anlık görür
- **🟢 Gerçek Zamanlı Çevrimiçi Durumu**: Katılımcı sekmesi açıkken her 15 saniyede bir "hâlâ buradayım" sinyali (heartbeat) gönderir. Admin panelindeki "Bağlı / Bağlı Değil" rozeti bu sinyale göre canlı hesaplanır — biri sekmesini kapatır ya da bağlantısını kaybederse ~40 saniye içinde otomatik olarak "Bağlı Değil" görünür, elle "Çıkar"a gerek kalmaz. Not: bir tur zaten başladıktan sonra "kaç kişi cevap vermesi bekleniyor" sayımı hâlâ ilk bağlanma anındaki kayda dayanır — turu ortasında sessizce ayrılan biri o turdan çıkarmak isterseniz yine elle "Çıkar" kullanmanız gerekir
- **🤖 AI-Destekli Vaka Üretimi**: Yarışma başlatıldığı anda Gemini API, önceden kimsenin bilmediği bir vaka üretir — yönetici de dahil herkes vakayı aynı anda görür
- **⏱️ Real-time Timer**: 30 dakikalık çalışma süresi, sayfa yenilense bile doğru kalır
- **⏳ Bekleme Ekranı**: Bir katılımcı cevabını gönderdiğinde diğerlerinin bitirmesini bekler
- **📊 Otomatik Değerlendirme**: Tüm katılımcılar cevaplayınca (veya süre dolunca) Gemini AI otomatik olarak puanlar
- **💸 Ücretsiz**: Gemini API'nin ücretsiz katmanı kullanılıyor — kredi kartı ya da ödeme gerekmez
- **🏆 Ödüllendirme**: Vaka başına en iyi cevaba 20.000 TL, kazanan otomatik belirlenir
- **📱 Responsive Design**: Mobil telefon ve tablet genişliklerinde (media query ile) düzen otomatik daralır — başlık, buton, sayaç, katılımcı kartları ve eğitim önizleme penceresi küçük ekranlarda taşma yapmadan yeniden düzenlenir
- **🎨 Pastel Tasarım**: Arayüz, gradyan, buton ve rozet renkleri daha yumuşak/pastel bir palete güncellendi (okunabilirlik korunarak)
- **📚 Geçmiş Denemeler**: Paylaşılmış her vaka "Deneme - N" olarak açılır/kapanır bir listede kalıcı olarak saklanır; herkes istediği zaman geri dönüp cevapları/puanları/gerekçeleri tekrar görebilir
- **✅ Kazanımlar / ❌ Hatalar**: Her değerlendirme artık sadece güçlü yönleri değil, puanın nereden/neden kırıldığını ve kişiye özel gelişim önerisini de ayrı ayrı gösterir
- **🎓 Eğitimler**: Admin, katılımcılar için eğitim dosyası (~650 KB'a kadar PDF/Word/Excel/metin/resim) yükleyebilir. Sadece "Oku" ile görüntülenir — indirme butonu yok; Word (.docx) ve Excel (.xlsx) dosyaları da tarayıcı içinde okunabilir şekilde gösterilir. Admin panelinde her eğitim için "kim okudu / kim okumadı" listesi görünür
- **⏱️ Eğitim Okuma Süresi Takibi**: "Oku"ya basıldığı an başlar, pencere kapatılınca (ya da sekme gizlenince) biter; okurken her 20 saniyede bir kısmi kayıt alınır, ani kapanmalarda en fazla ~20 saniyelik veri kaybı olur. Admin panelinde ayrı bir **"📊 Eğitim Katılım Raporu"** bölümünde her katılımcı × her eğitim için okundu/okunmadı ve toplam harcanan süre tek bir tabloda görünür

## 🧠 Nasıl Çalışır (Akış)

1. Admin ve katılımcılar Google ile giriş yapar. Admin panelinde kimlerin bağlı olduğu canlı görünür.
2. Admin "Yapay Zekadan Yeni Vaka İste ve Yarışmayı Başlat" butonuna basar.
3. Sunucu (backend), Gemini API'yi çağırarak o an, özgün bir vaka üretir ve Firestore'a yazar. Bu an itibarıyla hem admin hem tüm katılımcılar vakayı aynı anda görür — önceden kimse bilmez.
4. Katılımcı ekranında 30 dakikalık geri sayım başlar; herkes kendi cevabını metin kutusuna yazar.
5. Bir katılımcı "Cevabı Gönder"e bastığında ekranı "diğer katılımcıları bekliyoruz (X / Y cevapladı)" durumuna geçer.
6. **Tüm bağlı katılımcılar cevap verdiğinde (ya da 30 dakika dolduğunda)** — admin bir katılımcı sayılmaz, sadece gerçek katılımcılar beklenir — sistem otomatik olarak Gemini API'ye her cevabı gönderir, 4 kritere göre puanlar (0-25 puan x 4 = 100 puan) ve en yüksek puanı alanı o vakanın kazananı olarak belirler (20.000 TL).
7. **Değerlendirme bitince sonuçlar önce sadece admin'e görünür** (cevaplar + puanlar + gerekçeler). Admin panelinde "📢 Sonuçları Katılımcılara Paylaş" butonu belirir; admin sonuçları inceler.
8. Admin butona bastığında sonuçlar **tüm katılımcılara aynı anda** açılır — her katılımcı kendi puanını, gerekçesini ve diğer tüm katılımcıların cevap/puan/gerekçelerini görür. Amaç kişileri birbirine karşı yarıştırmak değil, Nietzsche'nin fikirlerine en yakın cevabı bulmak ve herkesin kendi eksiklerini görmesini sağlamaktır.
9. Admin bir sonraki vaka için tekrar "Yeni Vaka İste ve Başlat" butonuna basar (7 vaka için 7 kez).

## 🚀 Kurulum

### 1. Gereksinimler

- Node.js 18+
- Firebase projesi (Firestore + Google Authentication açık)
- Gemini API key (ücretsiz) — https://aistudio.google.com/apikey
- Railway hesabı (deployment için)

### 2. Firebase Setup

1. [Firebase Console](https://console.firebase.google.com) → projeni aç
2. **Firestore Database** oluştur (zaten yoksa)
3. **Authentication → Sign-in method → Google** etkinleştir
4. **Authentication → Settings → Authorized domains** kısmına Railway domain'ini ekle (örn. `nietzsche-yarismasi-production.up.railway.app`)
5. **Proje Ayarları (⚙️) → Service Accounts → Generate New Private Key** — bu indirdiğin JSON dosyasından `project_id`, `client_email`, `private_key` değerlerine ihtiyacın olacak (backend'in Firestore'a admin olarak yazabilmesi için)
6. **Firestore Database → Rules** kısmına bu repodaki `firestore.rules` dosyasının tam içeriğini yapıştır ve **Publish**'e bas (Eğitimler özelliği için `trainings` koleksiyonu kuralı eklendi — eskisinin üzerine tamamını yaz)

> **Katılımcı beyaz listesini güncellemek istersen:** `public/index.html` içindeki `ALLOWED_PARTICIPANT_EMAILS` dizisini ve `firestore.rules` içindeki `isAllowed()` fonksiyonundaki e-posta listesini **birlikte** güncelleyip Firestore Rules'u tekrar **Publish**'lemen gerekir — sadece birini değiştirmek yeterli olmaz (istemci ve sunucu tarafı ayrı ayrı kontrol ediyor).

### 3. Environment Variables (Railway)

Railway projende **Variables** sekmesine şunları ekle (kod içine ASLA yazılmaz, sadece Railway'e):

```
GEMINI_API_KEY=AIza...
FIREBASE_PROJECT_ID=nietzsche-yarismasi
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@nietzsche-yarismasi.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`GEMINI_API_KEY` için https://aistudio.google.com/apikey adresinden Google hesabınla saniyeler içinde ücretsiz bir key alabilirsin — kredi kartı istemez. Bir fatura hesabı bağlamadığın sürece ücretsiz katmanda kalırsın.

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
Yeni bir vaka üretir (Gemini ile), Firestore'a yazar, yarışmayı başlatır. Sadece admin panelindeki buton çağırır.

### POST `/api/evaluate-round`
Aktif vakanın tüm katılımcıları (admin hariç) cevapladıysa ya da süre dolduysa cevapları Gemini ile değerlendirir, kazananı belirler ve oturum durumunu `reviewed` yapar (sonuçlar bu noktada sadece admin'e görünür, katılımcılara henüz açılmaz). Katılımcı tarafında cevap gönderildiğinde ve süre dolduğunda otomatik çağrılır — çakışan çağrılara karşı sunucu tarafında kilitlenir (aynı vaka iki kez değerlendirilmez). Gemini'nin ücretsiz katman dakikalık istek sınırına takılırsa otomatik olarak kısa bekleyip yeniden dener.

### POST `/api/publish-results`
Oturum durumu `reviewed` iken çağrılabilir; durumu `finished` yapar ve bu anda sonuçlar (cevaplar + puanlar + gerekçeler) tüm katılımcı ekranlarında aynı anda görünür hale gelir. Sadece admin panelindeki "Sonuçları Katılımcılara Paylaş" butonu çağırır.

### GET `/api/winners`
Tüm vakaların kazananlarını ve toplam ödül tutarını döner.

## 🔧 Teknik Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (tek dosya, `public/index.html`)
- **Backend**: Node.js, Express.js (`backend/api.js`) — statik dosyaları da aynı sunucudan sunar
- **Database**: Firebase Firestore (gerçek zamanlı senkronizasyon)
- **Auth**: Firebase Authentication + Google OAuth
- **AI**: Gemini API (Google), `gemini-2.5-flash` modeli, ücretsiz katman — hem vaka üretimi hem değerlendirme için
- **Deployment**: Railway (tek servis)

## 📝 Değerlendirme Kriterleri

1. **Nietzsche Felsefesine Uygunluk** (0-25 puan)
2. **Temel Düşünceleri Doğru Temsil** (0-25 puan)
3. **Mantıksal Tutarlılık** (0-25 puan)
4. **Kurumsal Uygulanabilirlik** (0-25 puan)

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

### Gemini API hatası (vaka üretilmiyor / değerlendirme yapılmıyor)
- Railway Variables'da `GEMINI_API_KEY` doğru mu kontrol et (https://aistudio.google.com/apikey adresinden alınmış olmalı)
- Railway'deki **Deploy Logs**'a bak — backend konsola hatayı yazar
- Ücretsiz katmanın dakikalık istek sınırına takılırsa sistem otomatik tekrar dener; sürekli tekrarlıyorsa birkaç dakika bekleyip tekrar dene

### Vaka görünmüyor / yarışma başlamıyor
- Admin panelindeki Sistem Günlüğü'nde "Vaka başlatma hatası" var mı bak
- En az 1 katılımcının o an "Bağlı" (çevrimiçi) görünmesi gerekir (buton aksi halde pasif kalır) — hiç kimse bağlı değilse, ilgili katılımcının sayfayı açıp beklemesini iste

## 📧 İletişim

Sorularınız için: erginylmz@gmail.com

## 📄 Lisans

MIT License - Serbestçe kullanabilirsiniz

---

**Başarılı yarışmalar! 🏛️**
