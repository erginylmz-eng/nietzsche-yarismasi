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
const MODEL = 'gemini-3.5-flash';

const THEMES = ['Adalet', 'Eşitlik', 'Özgürlük', 'Ahlak/Etik'];
const ROUND_DURATION_MS = 30 * 60 * 1000;
const ADMIN_EMAIL = 'erginylmz@gmail.com';

// Ücretsiz katmanın dakikalık istek sınırına takılırsak ya da Google'ın
// sunucuları geçici olarak aşırı yüklüyse (503 UNAVAILABLE) kısa bekleyip tekrar dene.
async function callGemini(prompt, maxRetries = 4) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY tanımlı değil. Railway → Variables kısmında bu değişkeni ekleyip yeniden deploy et.');
    }

    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: MODEL,
                contents: prompt
            });
            return response.text;
        } catch (error) {
            lastError = error;
            const status = error?.status || error?.code;
            const message = error?.message || '';
            const isRetryable =
                status === 429 || status === 503 ||
                /rate.?limit|quota/i.test(message) ||
                /UNAVAILABLE|overloaded|high demand|internal error|try again later/i.test(message);

            if (isRetryable && attempt < maxRetries - 1) {
                // Kademeli bekleme: 3sn, 6sn, 12sn (üst sınır 12sn)
                const waitMs = Math.min(3000 * Math.pow(2, attempt), 12000);
                console.log(`Gemini geçici hata (${status || '?'}), ${waitMs}ms bekleyip tekrar deneniyor (deneme ${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            throw error;
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

    const prompt = `Sen bir kurumsal etik danışmanısın. "${theme}" teması çerçevesinde gerçekçi, özgün bir kurumsal vaka yaz. Bu vaka, katılımcıların cevapları daha sonra ayrı ve gizli bir değerlendirme aşamasında bir felsefi çerçeveye göre puanlanacak — ama bu ÇERÇEVE VAKANIN İÇİNDE ASLA BELİRTİLMEMELİ. Katılımcının hangi düşünce sistemini uygulayacağını kendi başına, dışarıdan hiçbir ipucu almadan bulması gerekiyor; vaka metninde herhangi bir felsefi yönlendirme veya ipucu olursa bu katılımcıyı yönlendirir ve değerlendirmeyi anlamsızlaştırır.

Vaka şunları içermeli:
1. Gerçekçi bir kurumsal/organizasyonel durum
2. Etik bir ikilem veya çatışma — birden fazla makul bakış açısına açık, tek doğru cevabı olmayan bir durum
3. Karar alınması gereken somut bir nokta

Vaka 250-400 kelime uzunluğunda, akıcı bir anlatı olarak yazılsın (madde işareti kullanma, düz metin). ASLA hiçbir filozofun adını, felsefi akımı, kavramı veya terimini (örneğin güç istenci, köle/efendi ahlakı, değerlerin yeniden değerlendirilmesi gibi) kullanma veya ima etme — vaka sade, nötr bir iş/organizasyon anlatısı olmalı. Vakanın sonunda katılımcıya yöneltilen açık ve nötr bir karar sorusu olsun — sadece şu kalıba benzer bir şey: "Bu durumda yönetici olarak ne karar verirdiniz? Kararınızı ve gerekçenizi açıklayın." Bu soruda da hiçbir felsefi referans, isim veya kavram GEÇMEMELİ.

Sadece vakanın kendisini yaz, başka açıklama ekleme. İlk satırda kısa, çarpıcı bir başlık olsun (örn: "Terfi Kararı"), sonrasında vaka metni gelsin.`;

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

Şu 4 kritere göre değerlendir (her biri 0-25 puan, toplam 0-100):
1. Nietzsche Felsefesine Uygunluk
2. Temel Düşünceleri Doğru Temsil Etme
3. Mantıksal Tutarlılık
4. Kurumsal/Pratik Uygulanabilirlik

Değerlendirmeni İKİ ayrı bölüm halinde sun:
1. KAZANIMLAR: Cevabın puan kazandığı, güçlü olduğu noktalar.
2. HATALAR: Puanın nereden ve NEDEN kırıldığı — hangi kriterde, hangi eksiklik/yanlış anlama yüzünden puan kaybedildiği somut örneklerle. Ayrıca bu kişiye özel, hangi konuya/kavrama odaklanarak kendini geliştirmesi gerektiğine dair kısa bir tavsiye ver.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme, markdown code fence kullanma:
{
  "total_score": 0,
  "criteria": {
    "nietzsche_alignment": 0,
    "fundamental_thoughts": 0,
    "logical_consistency": 0,
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
