const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

// Initialize Claude API
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============ API ENDPOINTS ============

// 1. Generate New Case
app.post('/api/generate-case', async (req, res) => {
    try {
        const themes = ['Adalet', 'Eşitlik', 'Özgürlük', 'Ahlak/Etik'];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];

        const prompt = `Sen bir kurumsal etik danışmanısın. Nietzsche felsefesinin perspektifinden değerlendirilmesi için,
        "${randomTheme}" teması çerçevesinde, gerçekçi bir kurumsal vaka yaratmalısın.

        Vaka şu unsurları içermeli:
        1. Gerçekçi bir kurumsal durum
        2. Etik bir ikilem veya problem
        3. Karar alınması gereken bir nokta
        4. Nietzsche'nin felsefesine göre analiz edilebilecek yönler

        Vakanın Nietzsche'nin perspektifinden analiz edilebilmesi için yeterli detay verir misin?

        Format:
        BAŞLIK: [Kısa başlık]
        DURUM: [Ayrıntılı durum açıklaması]
        PROBLEM: [Çözülmesi gereken sorun]
        NIETZSCHE AÇISI: [Nietzsche'nin bu duruma nasıl bakabileceğinin ipuçları]`;

        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const caseContent = message.content[0].type === 'text' ? message.content[0].text : '';

        // Save to Firebase
        await db.collection('cases').doc('current').set({
            theme: randomTheme,
            content: caseContent,
            created_at: new Date(),
            status: 'active'
        });

        res.json({
            success: true,
            case: {
                theme: randomTheme,
                content: caseContent
            }
        });

    } catch (error) {
        console.error('Error generating case:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Evaluate Responses
app.post('/api/evaluate-responses', async (req, res) => {
    try {
        const { responses } = req.body;

        if (!responses || responses.length === 0) {
            return res.status(400).json({ error: 'No responses provided' });
        }

        // Get current case
        const caseDoc = await db.collection('cases').doc('current').get();
        if (!caseDoc.exists) {
            return res.status(400).json({ error: 'No active case' });
        }

        const caseData = caseDoc.data();
        const evaluations = [];

        // Evaluate each response
        for (const response of responses) {
            const evaluationPrompt = `Friedrich Nietzsche'nin felsefesine göre aşağıdaki cevabı değerlendir:

VAKA:
${caseData.content}

TEMA: ${caseData.theme}

KATILIMCININ CEVABI:
${response.answer}

Lütfen şu kriterlere göre değerlendir (0-100):
1. Nietzsche Felsefesine Uygunluk (0-25 puan)
2. Temel Düşünceleri Doğru Temsil (0-25 puan)
3. Mantıksal Tutarlılık (0-25 puan)
4. Kurumsal Uygulanabilirlik (0-25 puan)

Yanıtında şunları içer:
- Toplam Puan (0-100)
- Her kriterden aldığı puan
- Güçlü Yönler (neden yüksek puan aldığı)
- Eksiklikler (nerelerden puan kaybettiği)
- Genel Değerlendirme

JSON formatında yanıt ver:
{
    "total_score": 0,
    "criteria": {
        "nietzsche_alignment": 0,
        "fundamental_thoughts": 0,
        "logical_consistency": 0,
        "institutional_applicability": 0
    },
    "strengths": "...",
    "weaknesses": "...",
    "general_evaluation": "..."
}`;

            const message = await client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                messages: [
                    {
                        role: 'user',
                        content: evaluationPrompt
                    }
                ]
            });

            const evaluationText = message.content[0].type === 'text' ? message.content[0].text : '';

            // Parse JSON from response
            let evaluation = {};
            try {
                const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    evaluation = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.error('Error parsing evaluation JSON:', e);
                evaluation = {
                    total_score: 0,
                    criteria: {},
                    strengths: '',
                    weaknesses: '',
                    general_evaluation: evaluationText
                };
            }

            evaluations.push({
                participant_id: response.participant_id,
                participant_email: response.participant_email,
                answer: response.answer,
                evaluation: evaluation,
                evaluated_at: new Date()
            });

            // Save to Firebase
            await db.collection('evaluations').doc(response.participant_id).set({
                participant_id: response.participant_id,
                participant_email: response.participant_email,
                answer: response.answer,
                evaluation: evaluation,
                evaluated_at: new Date(),
                case_theme: caseData.theme
            });
        }

        // Rank responses by score
        evaluations.sort((a, b) => (b.evaluation.total_score || 0) - (a.evaluation.total_score || 0));

        // Award prize to top responder
        if (evaluations.length > 0) {
            const winner = evaluations[0];
            await db.collection('winners').doc(caseData.theme).set({
                participant_id: winner.participant_id,
                participant_email: winner.participant_email,
                score: winner.evaluation.total_score,
                case_theme: caseData.theme,
                prize: 20000,
                awarded_at: new Date()
            });
        }

        res.json({
            success: true,
            evaluations: evaluations,
            ranked: true
        });

    } catch (error) {
        console.error('Error evaluating responses:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Current Case
app.get('/api/case', async (req, res) => {
    try {
        const caseDoc = await db.collection('cases').doc('current').get();

        if (!caseDoc.exists) {
            return res.status(404).json({ error: 'No active case' });
        }

        res.json({
            success: true,
            case: caseDoc.data()
        });

    } catch (error) {
        console.error('Error fetching case:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Get Evaluations
app.get('/api/evaluations', async (req, res) => {
    try {
        const snapshot = await db.collection('evaluations').get();
        const evaluations = [];

        snapshot.forEach(doc => {
            evaluations.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            evaluations: evaluations
        });

    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Responses
app.get('/api/responses', async (req, res) => {
    try {
        const snapshot = await db.collection('responses').get();
        const responses = [];

        snapshot.forEach(doc => {
            responses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            responses: responses
        });

    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Get Winners
app.get('/api/winners', async (req, res) => {
    try {
        const snapshot = await db.collection('winners').get();
        const winners = [];

        snapshot.forEach(doc => {
            winners.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            winners: winners,
            total_prize: winners.length * 20000
        });

    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;