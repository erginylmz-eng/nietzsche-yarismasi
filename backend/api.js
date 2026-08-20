import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ==================== FIREBASE ADMIN ====================
const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ==================== GEMINI (ÜCRETSİZ KATMAN) ====================
// API key: https://aistudio.google.com/apikey adresinden ücretsiz alınır,
// kredi kartı gerektirmez. Fatura hesabı bağlamadığın sürece ücretsiz katmanda kalır.
if (!process.env.GEMINI_API_KEY) {
    console.error('✗ UYARI: GEMINI_API_KEY ortam değişkeni tanımlı değil! Railway → Variables kısmını kontrol et.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Google, ücretsiz modelleri sık sık değiştiriyor/emekliye ayırıyor (bu proje
// boyunca birden fazla kez bir model adı aniden "bulunamadı" hatası vermeye
// başladı ya da günlük ücretsiz kullanım hakkı beklenenden çok daha düşük
// çıktı). Tek bir model adına kilitlenmek yerine, sırayla denenecek bir liste
// tutuyoruz: birinci model ya "bulunamadı" (kaldırılmış/yeniden adlandırılmış)
// hatası ya da GÜNLÜK kota hatası verirse, otomatik olarak bir sonraki modele
// geçilir — sistem tek bir modelin durumuna bağımlı kalmaz.
//   1) gemini-2.5-flash: ücretsiz katmanda günde ~250 istek hakkı verir (bu
//      projenin ihtiyacı için yeterli), ancak Google tarafından "deprecated"
//      işaretlenmiş ve 16 Ekim 2026'da tamamen kapatılması planlanıyor.
//   2) gemini-3.5-flash: güncel/desteklenen model ama ücretsiz katmanda
//      günde sadece 20 istek hakkı veriyor — yedek olarak tutuluyor.
// Bu tarih yaklaştıkça ya da yeni bir model deneyip "bulunamadı" hatası
// alındıkça, bu listeye güncel model adını eklemek yeterli olacak.
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-3.5-flash'];

const THEMES = ['Adalet', 'Eşitlik', 'Özgürlük', 'Ahlak/Etik'];
const ROUND_DURATION_MS = 30 * 60 * 1000;
const ADMIN_EMAIL = 'erginylmz@gmail.com';

// Ücretsiz katmanın dakikalık istek sınırına takılırsak ya da Google'ın
// sunucuları geçici olarak aşırı yüklüyse (503 UNAVAILABLE) kısa bekleyip tekrar dene.
// Bir modelin kendisi kaldırılmışsa ("not found") ya da o modelin GÜNLÜK kotası
// tükenmişse, aynı modeli tekrar denemek yerine listedeki bir sonraki modele geçilir.
async function callGemini(prompt, maxRetries = 4) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY tanımlı değil. Railway → Variables kısmında bu değişkeni ekleyip yeniden deploy et.');
    }

    let lastError;
    for (const model of MODEL_CANDIDATES) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt
                });
                return response.text;
            } catch (error) {
                lastError = error;
                const status = error?.status || error?.code;
                const message = error?.message || '';

                // Model kaldırılmış/yeniden adlandırılmış, ya da bu modelin günlük
                // (dakikalık değil) kotası tükenmiş — bu modeli tekrar denemenin
                // anlamı yok, listedeki bir sonraki modele geç.
                const isModelGone = status === 404 || /not found|NOT_FOUND/i.test(message);
                const isDailyQuotaGone = /PerDay/i.test(message) && (status === 429 || /RESOURCE_EXHAUSTED/i.test(message));
                if (isModelGone || isDailyQuotaGone) {
                    console.warn(`⚠ Model "${model}" kullanılamıyor (${isModelGone ? 'bulunamadı/kaldırılmış' : 'günlük kota doldu'}), sıradaki modele geçiliyor...`);
                    break;
                }

                const isRetryable =
                    status === 429 || status === 503 ||
                    /rate.?limit|quota/i.test(message) ||
                    /UNAVAILABLE|overloaded|high demand|internal error|try again later/i.test(message);

                if (isRetryable && attempt < maxRetries - 1) {
                    // Kademeli bekleme: 3sn, 6sn, 12sn (üst sınır 12sn)
                    const waitMs = Math.min(3000 * Math.pow(2, attempt), 12000);
                    console.log(`Gemini geçici hata (${status || '?'}, model: ${model}), ${waitMs}ms bekleyip tekrar deneniyor (deneme ${attempt + 1}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                // Kalıcı, tekrar denenemez bir hata — bu modelden vazgeç, sıradaki
                // modele geç (belki de sorun sadece bu modele özgüdür).
                console.warn(`⚠ Model "${model}" için kalıcı hata, sıradaki modele geçiliyor: ${message}`);
                break;
            }
        }
    }
    throw lastError;
}

async function pickTheme() {
    // Önceki vakayla aynı temayı arka arkaya seçmemeye çalış
    try {
        const prev = await db.collection('session').doc('current').get();
        const prevTheme = prev.exists ? prev.data().lastTheme : null;
        const pool = prevTheme ? THEMES.filter(t => t !== prevTheme) : THEMES;
        return pool[Math.floor(Math.random() * pool.length)];
    } catch (e) {
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    }
}

async function generateCaseWithAI() {
    const theme = await pickTheme();

    const prompt = `Sen, 30 yıllık birikime sahip, bir lojistik şirketinde yönetim kurulu başkanısın. "${theme}" ekseninde, kendi şirketinin karşılaştığı gerçekçi, özgün bir yönetim ikilemini vaka olarak anlat. Bu vaka, katılımcıların cevapları daha sonra ayrı ve gizli bir değerlendirme aşamasında bir felsefi çerçeveye göre puanlanacak — ama bu ÇERÇEVE VAKANIN İÇİNDE ASLA BELİRTİLMEMELİ. Katılımcının hangi düşünce sistemini uygulayacağını kendi başına, dışarıdan hiçbir ipucu almadan bulması gerekiyor; vaka metninde herhangi bir felsefi yönlendirme veya ipucu olursa bu katılımcıyı yönlendirir ve değerlendirmeyi anlamsızlaştırır.

Örnek vaka (tarz, uzunluk ve soru yapısını referans al — konusunu birebir kopyalama, her seferinde farklı bir yönetim kararı anlat):

"Şirket, depo operasyonlarında verimliliği artırmak amacıyla yapay zekâ destekli bir planlama sistemine geçmeye karar vermiştir. Yeni sistem sayesinde raporlama, vardiya planlama ve sipariş analizleri otomatik olarak gerçekleştirilebilecektir. Bu dönüşüm sonucunda 10 kişilik ekibin iş yükü önemli ölçüde azalacak, ancak yapılan değerlendirmelere göre 3 pozisyona artık ihtiyaç duyulmayacaktır.

SORU: Bu durumda yapay zekâ sistemini uygulamaya alır mıydınız? İşini kaybetme riski bulunan çalışanlar için nasıl bir yol izlerdiniz? Teknolojik gelişim ile çalışanlara karşı etik sorumluluk arasında nasıl bir denge kurulması gerektiğini gerekçeleriyle açıklayınız."

Vaka şunları içermeli:
1. Bu lojistik şirketinde geçen, gerçekçi ve somut bir operasyonel/yönetimsel durum (otomasyon, ekip küçültme, maliyet kısma, tedarikçi/müşteri ilişkileri, dış kaynak kullanımı, performans yönetimi vb. olabilir)
2. Bir gelişme/verimlilik adımı ile bundan etkilenen kişiler (çalışanlar, tedarikçiler, müşteriler) arasındaki gerilim — birden fazla makul bakış açısına açık, tek doğru cevabı olmayan bir durum
3. Karar alınması gereken somut bir nokta

Vaka 80-150 kelime uzunluğunda, akıcı bir anlatı olarak yazılsın (madde işareti kullanma, düz metin, örnekteki gibi kısa ve öz). ASLA hiçbir filozofun adını, felsefi akımı, kavramı veya terimini (örneğin güç istenci, köle/efendi ahlakı, değerlerin yeniden değerlendirilmesi gibi) kullanma veya ima etme — vaka sade, nötr bir iş/organizasyon anlatısı olmalı.

Vakanın sonunda "SORU:" ile başlayan, örnekteki gibi 2-3 alt sorudan oluşan nötr bir karar sorusu bloğu olsun: (a) katılımcının bu durumda ne karar vereceğini sorar, (b) etkilenen kişiler için nasıl bir yol izleyeceğini sorar, (c) rekabet eden değerler arasında (ör. verimlilik/gelişim ile insanlara karşı sorumluluk) nasıl bir denge kurulması gerektiğini gerekçeleriyle sorar. Bu soru bloğunda da hiçbir felsefi referans, isim veya kavram GEÇMEMELİ.

Sadece vakanın kendisini yaz, başka açıklama ekleme. İlk satırda kısa, çarpıcı bir başlık olsun (örn: "Depo Otomasyonu Kararı"), sonrasında vaka metni ve SORU bloğu gelsin.`;

    // Güvenlik ağı: yapay zeka talimata rağmen yine de bir felsefi isim/kavram
    // sızdırırsa (ör. "Nietzsche", "güç istenci") vakayı katılımcılara yönlendirici
    // olmaması için bir kez daha üretmeyi dener. İkinci denemede de sızarsa,
    // en azından bariz "Nietzsche" kelimesini metinden temizleyerek devam eder.
    const LEAK_PATTERN = /nietzsche|güç istenci|köle ahlakı|efendi ahlakı|übermensch|üstinsan|ebedi dönüş/i;

    async function generateOnce() {
        const raw = (await callGemini(prompt)).trim();
        const lines = raw.split('\n').filter(l => l.trim().length > 0);
        const title = lines[0]?.replace(/^#+\s*/, '').trim() || theme;
        const content = lines.slice(1).join('\n\n').trim() || raw;
        return { title, content };
    }

    let { title, content } = await generateOnce();

    if (LEAK_PATTERN.test(title) || LEAK_PATTERN.test(content)) {
        console.warn('⚠ Vaka üretiminde felsefi referans sızıntısı tespit edildi, yeniden deneniyor...');
        const retry = await generateOnce();
        if (!LEAK_PATTERN.test(retry.title) && !LEAK_PATTERN.test(retry.content)) {
            title = retry.title;
            content = retry.content;
        } else {
            console.warn('⚠ İkinci denemede de sızıntı var, isimler metinden temizleniyor.');
            title = title.replace(LEAK_PATTERN, '').trim();
            content = content.replace(LEAK_PATTERN, '').trim();
        }
    }

    return { theme, title, content };
}

async function evaluateResponseWithAI(caseData, response) {
    const prompt = `Friedrich Nietzsche'nin felsefesi perspektifinden aşağıdaki katılımcı cevabını değerlendir.

VAKA (Tema: ${caseData.theme}):
${caseData.title ? caseData.title + '\n' : ''}${caseData.content}

KATILIMCININ CEVABI:
${response.answer}

Şu 5 kritere göre, belirtilen ağırlıklarla değerlendir (toplam 0-100):
1. Filozofun Bakış Açısına Sadakat (0-30 puan) — cevap Nietzsche'nin felsefesini ne kadar doğru ve sadık şekilde yansıtıyor
2. Mantıksal Tutarlılık (0-20 puan) — argüman iç tutarlı mı, çelişki içeriyor mu
3. Vakaya Uygunluk (0-20 puan) — cevap somut vakaya gerçekten değiniyor mu, yoksa genel geçer/ezber bir anlatı mı
4. İkna Gücü ve Retorik Yetkinlik (0-15 puan) — argümantasyon ne kadar ikna edici ve iyi kurgulanmış
5. Kurumsal Uygulanabilirlik (0-15 puan) — önerilen yaklaşım gerçek bir şirkette ne kadar uygulanabilir

Değerlendirmeni İKİ ayrı bölüm halinde sun:
1. KAZANIMLAR: Cevabın puan kazandığı, güçlü olduğu noktalar.
2. HATALAR: Puanın nereden ve NEDEN kırıldığı — hangi kriterde, hangi eksiklik/yanlış anlama yüzünden puan kaybedildiği somut örneklerle. Ayrıca bu kişiye özel, hangi konuya/kavrama odaklanarak kendini geliştirmesi gerektiğine dair kısa bir tavsiye ver.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme, markdown code fence kullanma:
{
  "total_score": 0,
  "criteria": {
    "philosopher_fidelity": 0,
    "logical_consistency": 0,
    "case_relevance": 0,
    "persuasive_rhetoric": 0,
    "institutional_applicability": 0
  },
  "strengths": "KAZANIMLAR: Puan kazandıran güçlü yönler, somut (2-3 cümle)",
  "weaknesses": "HATALAR: Puanın nereden ve neden kırıldığı, hangi kriterde ne eksikti, somut (2-3 cümle)",
  "improvement_advice": "Bu kişiye özel gelişim önerisi: hangi konuya/kavrama odaklanarak kendini geliştirmeli (2-3 cümle)",
  "general_evaluation": "Genel değerlendirme (2-3 cümle)"
}`;

    const text = await callGemini(prompt);
    let evaluation = null;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) evaluation = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error('Evaluation JSON parse error:', e.message);
    }

    if (!evaluation || typeof evaluation.total_score !== 'number') {
        evaluation = {
            total_score: 0,
            criteria: {},
            strengths: '',
            weaknesses: '',
            improvement_advice: '',
            general_evaluation: text || 'Değerlendirme ayrıştırılamadı.'
        };
    }

    if (typeof evaluation.improvement_advice !== 'string') {
        evaluation.improvement_advice = '';
    }

    return evaluation;
}

// Kriter anahtarlarının okunabilir adları ve azami puanları (bkz. evaluateResponseWithAI).
const CRITERIA_LABELS = {
    philosopher_fidelity: 'Filozofun Bakış Açısına Sadakat',
    logical_consistency: 'Mantıksal Tutarlılık',
    case_relevance: 'Vakaya Uygunluk',
    persuasive_rhetoric: 'İkna Gücü ve Retorik Yetkinlik',
    institutional_applicability: 'Kurumsal Uygulanabilirlik'
};
const CRITERIA_MAX = {
    philosopher_fidelity: 30,
    logical_consistency: 20,
    case_relevance: 20,
    persuasive_rhetoric: 15,
    institutional_applicability: 15
};

// Değerlendirme tamamlandıktan sonra, kişinin kendi zayıf noktalarına özel,
// kurumsal dilde yazılmış bir gelişim makalesi üretir. Katılımcı sonuçlarını
// gördüğünde "nerede eksik kaldığını" sadece 2-3 cümlelik bir notla değil,
// bunu geliştirmesine yardımcı olacak dolu bir okuma materyaliyle görsün diye.
async function generateDevelopmentArticle(caseData, response, evaluation) {
    const criteriaSummary = Object.entries(evaluation.criteria || {})
        .map(([key, val]) => `${CRITERIA_LABELS[key] || key}: ${val} / ${CRITERIA_MAX[key] || '?'}`)
        .join('\n') || 'Kriter puanı bulunamadı.';

    const prompt = `Sen, kurumsal eğitim ve liderlik gelişimi alanında uzman bir danışmansın. Aşağıda bir yönetim vakası, bir katılımcının bu vakaya verdiği cevap ve bu cevabın Friedrich Nietzsche'nin felsefesi perspektifinden yapılmış değerlendirmesi var. Bu kişiye özel, onun ZAYIF olduğu noktaları hedef alan, kurumsal/profesyonel dilde yazılmış bir gelişim makalesi hazırla.

VAKA:
${caseData.title ? caseData.title + '\n' : ''}${caseData.content}

KATILIMCININ CEVABI:
${response.answer}

KRİTER PUANLARI:
${criteriaSummary}

DEĞERLENDİRMEDEKİ HATALAR/EKSİKLER:
${evaluation.weaknesses || '-'}

GELİŞİM ÖNERİSİ:
${evaluation.improvement_advice || '-'}

Makale şöyle olsun:
- 300-500 kelime, akıcı bir kurumsal gelişim/eğitim yazısı üslubunda — akademik bir felsefe makalesi gibi değil, bir şirketin iç eğitim dokümanı ya da liderlik gelişim bülteni gibi anlaşılır ve profesyonel bir dille yazılsın.
- Kişinin en düşük puan aldığı 1-2 kriteri merkeze alsın; Nietzsche'nin ilgili düşüncelerini somut, güncel kurumsal örneklerle açıklasın.
- Kişiyi suçlayıcı değil, yapıcı ve geliştirici bir tonda olsun.
- Sonunda, kişinin bir dahaki vakada nelere dikkat edebileceğine dair 2-3 maddelik kısa ve somut bir "Uygulama Notları" bölümü olsun.
- İlk satırda kısa, çarpıcı bir başlık olsun (örn: "Gücün Kaynağını Yeniden Düşünmek"), sonrasında makale metni gelsin.

Sadece makaleyi yaz, başka açıklama ekleme.`;

    try {
        return (await callGemini(prompt)).trim();
    } catch (e) {
        console.error('Gelişim makalesi üretilemedi:', e.message);
        return '';
    }
}

// Bir vakaya, Nietzsche'nin felsefesi perspektifinden verilebilecek EN İYİ
// (100 puan alacak) cevabı ve bu cevabın 5 kritere göre neden tam puan
// aldığının açıklamasını üretir. Katılımcı başına değil, vaka başına BİR KEZ
// üretilir (tüm katılımcılar için ortak bir referans/model cevaptır).
// Değerlendirme sırasında üretilip vaka kaydına yazılır; sadece "Geçmiş
// Denemeler" listesinde, o deneme yayınlandıktan sonra görünür hale gelir —
// vaka aktif sorulurken hiçbir ekranda gösterilmez.
async function generateIdealAnswer(caseData) {
    const prompt = `Friedrich Nietzsche'nin felsefesi perspektifinden aşağıdaki vakaya, bir katılımcının verebileceği EN İYİ, kusursuz cevabı sen yaz — bu cevap, aşağıda tanımlanan 5 kriterin her birinden tam puan alacak nitelikte olmalı.

VAKA (Tema: ${caseData.theme}):
${caseData.title ? caseData.title + '\n' : ''}${caseData.content}

Değerlendirme kriterleri (bu örnek cevap her birinden tam puan alacak şekilde yazılmalı):
1. Filozofun Bakış Açısına Sadakat (30 puan) — Nietzsche'nin felsefesini derin ve doğru şekilde yansıtmalı
2. Mantıksal Tutarlılık (20 puan) — argüman baştan sona iç tutarlı olmalı, çelişki içermemeli
3. Vakaya Uygunluk (20 puan) — genel geçer/ezber bir anlatı değil, doğrudan bu somut vakaya değinmeli
4. İkna Gücü ve Retorik Yetkinlik (15 puan) — ikna edici, iyi kurgulanmış bir argümantasyon olmalı
5. Kurumsal Uygulanabilirlik (15 puan) — önerilen yaklaşım gerçek bir şirkette uygulanabilir olmalı

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme, markdown code fence kullanma:
{
  "ideal_answer": "Vakaya verilecek örnek en iyi cevabın tam metni (Nietzsche'nin bakış açısını uygulayan, vakadaki soruların hepsini yanıtlayan, 4-6 paragraf uzunluğunda dolu bir cevap)",
  "scoring_explanation": "Bu örnek cevabın yukarıdaki 5 kriterin her birinden neden tam puan aldığının, kritere kritere somut gerekçelerle açıklaması (her kriter için 1-2 cümle)"
}`;

    try {
        const text = await callGemini(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.ideal_answer === 'string' && typeof parsed.scoring_explanation === 'string') {
                return parsed;
            }
        }
        console.error('İdeal cevap JSON formatı beklenmedik, ham metin kullanılıyor.');
        return { ideal_answer: text.trim(), scoring_explanation: '' };
    } catch (e) {
        console.error('İdeal cevap üretilemedi:', e.message);
        return { ideal_answer: '', scoring_explanation: '' };
    }
}

// ==================== API: YENİ VAKA BAŞLAT ====================
app.post('/api/start-round', async (req, res) => {
    try {
        const sessionSnap = await db.collection('session').doc('current').get();
        const lastCaseNumber = sessionSnap.exists ? (sessionSnap.data().caseNumber || 0) : 0;
        const nextCaseNumber = lastCaseNumber + 1;

        console.log(`Vaka #${nextCaseNumber} için yapay zekadan içerik isteniyor...`);
        const { theme, title, content } = await generateCaseWithAI();

        const caseData = {
            caseNumber: nextCaseNumber,
            theme,
            title,
            content,
            generated_at: FieldValue.serverTimestamp()
        };

        const batch = db.batch();
        batch.set(db.collection('cases').doc('current'), caseData);
        batch.set(db.collection('cases').doc('case_' + nextCaseNumber), caseData);
        await batch.commit();

        const startTime = Date.now();
        await db.collection('session').doc('current').set({
            status: 'started',
            caseNumber: nextCaseNumber,
            startTime,
            duration: ROUND_DURATION_MS,
            evaluationStatus: 'pending',
            lastTheme: theme
        });

        console.log(`✓ Vaka #${nextCaseNumber} (${theme}) başlatıldı`);
        res.json({ success: true, caseNumber: nextCaseNumber, theme, title, content });
    } catch (error) {
        console.error('start-round error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== API: TURU DEĞERLENDİR ====================
app.post('/api/evaluate-round', async (req, res) => {
    const sessionRef = db.collection('session').doc('current');

    try {
        const claim = await db.runTransaction(async (tx) => {
            const sessionDoc = await tx.get(sessionRef);
            if (!sessionDoc.exists) return { proceed: false, reason: 'no-session' };

            const session = sessionDoc.data();
            if (session.status !== 'started') {
                return { proceed: false, reason: 'not-started', status: session.status };
            }
            if (session.evaluationStatus && session.evaluationStatus !== 'pending') {
                return { proceed: false, reason: 'already-' + session.evaluationStatus };
            }

            const caseNumber = session.caseNumber;
            const participantsSnap = await tx.get(db.collection('participants').where('status', '==', 'connected'));
            const responsesSnap = await tx.get(db.collection('responses').where('case_number', '==', caseNumber));

            // Admin bir katılımcı değildir; sayıma dahil edilmez.
            const totalParticipants = participantsSnap.docs.filter(d => d.data().email !== ADMIN_EMAIL).length;
            const submittedCount = responsesSnap.size;
            const timeUp = (Date.now() - session.startTime) >= session.duration;

            if (submittedCount < totalParticipants && !timeUp) {
                return { proceed: false, reason: 'waiting', submittedCount, totalParticipants };
            }

            tx.update(sessionRef, { status: 'evaluating', evaluationStatus: 'evaluating' });

            return {
                proceed: true,
                caseNumber,
                responses: responsesSnap.docs.map(d => d.data())
            };
        });

        if (!claim.proceed) {
            return res.json({ success: true, skipped: true, ...claim });
        }

        const { caseNumber, responses } = claim;
        console.log(`Vaka #${caseNumber} değerlendiriliyor (${responses.length} cevap)...`);

        const caseDoc = await db.collection('cases').doc('case_' + caseNumber).get();
        const caseData = caseDoc.exists ? caseDoc.data() : (await db.collection('cases').doc('current').get()).data();

        const evaluations = [];
        for (const response of responses) {
            const evaluation = await evaluateResponseWithAI(caseData, response);
            evaluation.development_article = await generateDevelopmentArticle(caseData, response, evaluation);
            evaluations.push({ ...response, evaluation });

            await db.collection('evaluations').doc(`case${caseNumber}_${response.participant_id}`).set({
                participant_id: response.participant_id,
                participant_email: response.participant_email,
                participant_name: response.participant_name || '',
                case_number: caseNumber,
                answer: response.answer,
                evaluation,
                evaluated_at: FieldValue.serverTimestamp()
            });
        }

        evaluations.sort((a, b) => (b.evaluation.total_score || 0) - (a.evaluation.total_score || 0));

        // Vaka başına bir kez: bu vakaya verilebilecek en iyi cevap ve neden tam
        // puan aldığının açıklaması. Katılımcı sonuçlarıyla birlikte değil, doğrudan
        // vaka kaydının üzerine yazılır — "Geçmiş Denemeler" ekranı bu kaydı zaten
        // sadece o deneme yayınlandıktan (published) sonra okuyup gösterir.
        console.log(`Vaka #${caseNumber} için örnek en iyi cevap üretiliyor...`);
        const { ideal_answer: idealAnswer, scoring_explanation: idealAnswerExplanation } = await generateIdealAnswer(caseData);
        await db.collection('cases').doc('case_' + caseNumber).set({
            idealAnswer,
            idealAnswerExplanation,
            idealAnswerGeneratedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        if (evaluations.length > 0) {
            const winner = evaluations[0];
            await db.collection('winners').doc('case' + caseNumber).set({
                participant_id: winner.participant_id,
                participant_email: winner.participant_email,
                participant_name: winner.participant_name || '',
                case_number: caseNumber,
                score: winner.evaluation.total_score || 0,
                prize: 20000,
                awarded_at: FieldValue.serverTimestamp()
            });
        }

        // Değerlendirme bitti ama sonuçlar henüz katılımcılara açık değil —
        // önce sadece admin görür ("reviewed"). Admin "Sonuçları Paylaş"
        // butonuna basınca /api/publish-results status'u 'finished' yapar.
        await sessionRef.update({ status: 'reviewed', evaluationStatus: 'done' });

        console.log(`✓ Vaka #${caseNumber} değerlendirmesi tamamlandı (admin onayı bekleniyor)`);
        res.json({ success: true, skipped: false, caseNumber, count: evaluations.length });
    } catch (error) {
        console.error('evaluate-round error:', error);
        try {
            await sessionRef.update({ evaluationStatus: 'pending', status: 'started' });
        } catch (e2) { /* ignore */ }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== API: SONUÇLARI KATILIMCILARA YAYINLA ====================
// Admin, değerlendirmeyi inceledikten sonra bu uca istek atınca sonuçlar
// (cevaplar + puanlar + gerekçeler) tüm katılımcılara açılır.
app.post('/api/publish-results', async (req, res) => {
    const sessionRef = db.collection('session').doc('current');
    try {
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            return res.status(400).json({ success: false, error: 'Aktif oturum yok.' });
        }
        const session = sessionDoc.data();
        if (session.status !== 'reviewed') {
            return res.status(400).json({ success: false, error: `Sonuçlar şu an paylaşılamaz (durum: ${session.status}).` });
        }

        await sessionRef.update({ status: 'finished' });

        // Vakayı kalıcı olarak "yayınlandı" işaretle — session/current bir sonraki
        // vaka başladığında üzerine yazılacağı için, "Geçmiş Denemeler" listesinin
        // hangi vakaların gerçekten paylaşıldığını bilmesi için bu işaret cases
        // koleksiyonunda kalıcı olarak saklanır.
        const batch = db.batch();
        batch.set(db.collection('cases').doc('case_' + session.caseNumber), {
            published: true,
            publishedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        batch.set(db.collection('cases').doc('current'), {
            published: true,
            publishedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        await batch.commit();

        console.log(`✓ Vaka #${session.caseNumber} sonuçları katılımcılara yayınlandı`);
        res.json({ success: true, caseNumber: session.caseNumber });
    } catch (error) {
        console.error('publish-results error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DİĞER YARDIMCI UÇLAR ====================
app.get('/api/winners', async (req, res) => {
    try {
        const snapshot = await db.collection('winners').orderBy('case_number').get();
        const winners = [];
        snapshot.forEach(doc => winners.push({ id: doc.id, ...doc.data() }));
        res.json({ success: true, winners, total_prize: winners.length * 20000 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ==================== STATİK DOSYALAR (frontend) ====================
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==================== HATA YÖNETİMİ ====================
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
