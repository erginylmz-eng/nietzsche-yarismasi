# 🏛️ Nietzsche Felsefî Değerlendirme Yarışması Platformu

Friedrich Nietzsche'nin perspektifinden kurumsal vakaları analiz etmek için tasarlanmış, yapay zeka destekli bir platform.

## 📋 Özellikler

- **🔐 Google OAuth**: Google hesabıyla güvenli giriş
- **🤖 AI-Destekli Vaka Oluşturma**: Claude API ile otomatik kurumsal vaka oluşturma
- **⏱️ Real-time Timer**: 30 dakikalık çalışma süresi
- **📊 Otomatik Değerlendirme**: Claude AI ile detaylı puanlama ve feedback
- **🏆 Ödüllendirme**: En iyi cevaplara 20.000 TL ödül
- **📱 Responsive Design**: Tüm cihazlarda uyumlu arayüz

## 🚀 Kurulum

### 1. Gereksinimler

- Node.js 18+
- npm veya yarn
- Firebase projesi
- Claude API key
- Vercel hesabı (deployment için)

### 2. Lokal Setup

```bash
# Repository'yi klonla
git clone https://github.com/erginylmz-eng/nietzsche-yarismasi.git
cd nietzsche-yarismasi

# Dependencies'leri yükle
npm install
cd backend && npm install
cd ..
```

### 3. Firebase Setup

1. [Firebase Console](https://console.firebase.google.com) aç
2. Proje oluştur: `Nietzsche Yarismasi`
3. Firestore Database oluştur
4. Authentication → Google OAuth etkinleştir
5. Service Account credentials indir
6. `.env` dosyası oluştur (`.env.example`'dan kopyala)

### 4. Environment Variables

```bash
cp .env.example .env
```

`.env` dosyasını doldur:

```env
ANTHROPIC_API_KEY=sk-ant-...
FIREBASE_PROJECT_ID=nietzsche-yarismasi
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### 5. Lokal Çalıştırma

```bash
# Backend server'ını başlat
cd backend
node api.js

# Frontend'i ayrı bir terminalde aç
# public/index.html'i tarayıcıda aç
```

## 📦 Deployment (Vercel)

### 1. GitHub'a Push Et

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### 2. Vercel'de Import Et

1. [Vercel](https://vercel.com) → "New Project"
2. GitHub repo'yu seç
3. "Import" tıkla

### 3. Environment Variables Ekle

Vercel Dashboard → Settings → Environment Variables:

- `ANTHROPIC_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

### 4. Deploy Et

"Deploy" butonuna tıkla. Vercel otomatik olarak deploy edecek!

## 🎯 Kullanım

### Admin (Ergin Yılmaz)

1. Google ile giriş yap
2. Katılımcıları bekle
3. Tüm katılımcılar bağlandığında "Yarışmayı Başlat" tuşuna bas
4. Cevapları gör ve otomatik değerlendirmeyi takip et

### Katılımcılar (Ömer, İbrahim, Mustafa)

1. Google ile giriş yap
2. Yönetici süreci başlattığında vaka gösterilir
3. 30 dakika içinde Nietzsche perspektifinden cevap yaz
4. "Cevabı Gönder" tuşuna bas
5. Sonuçları gör

## 📐 API Endpoints

### POST `/api/generate-case`
Yeni bir vaka oluştur

### POST `/api/evaluate-responses`
Cevapları değerlendir

### GET `/api/case`
Mevcut vakayı al

### GET `/api/responses`
Tüm cevapları al

### GET `/api/evaluations`
Tüm değerlendirmeleri al

### GET `/api/winners`
Kazananları al

## 🔧 Teknik Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication + Google OAuth
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel

## 📝 Değerlendirme Kriterleri

1. **Nietzsche Felsefesine Uygunluk** (0-25 puan)
2. **Temel Düşünceleri Doğru Temsil** (0-25 puan)
3. **Mantıksal Tutarlılık** (0-25 puan)
4. **Kurumsal Uygulanabilirlik** (0-25 puan)

## 🏆 Ödüllendirme

- Her vaka için 1 katılımcı seçilir
- Ödül: **20.000 TL**
- Toplam: **7 vaka × 20.000 TL = 140.000 TL**

## 🐛 Sorun Giderme

### Firebase bağlantısı hatası
- `.env` dosyasında tüm Firebase credentials'ları kontrol et
- Private Key'in `\n` karakterleri doğru şekilde formatlanmış mı kontrol et

### Claude API hatası
- API key'in geçerli mi kontrol et
- Rate limiting'i kontrol et

### Vercel deployment hatası
- Environment variables'ları Vercel Dashboard'da kontrol et
- Build logs'ları kontrol et

## 📧 İletişim

Sorularınız için: erginylmz@gmail.com

## 📄 Lisans

MIT License - Serbestçe kullanabilirsiniz

---

**Başarılı yarışmalar! 🏛️**
