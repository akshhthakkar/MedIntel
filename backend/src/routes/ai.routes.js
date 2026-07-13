const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const aiService = require('../services/aiService');
const { callAI } = require('../services/aiService');
const reportsController = require('../controllers/reports.controller');

// POST /api/ai/translate
router.post('/translate', auth, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    const translated = await aiService.translateText(text, targetLanguage || 'English');
    res.json({ success: true, data: { translatedText: translated, language: targetLanguage } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Translation failed' });
  }
});

// POST /api/ai/analyze-text
router.post('/analyze-text', auth, async (req, res) => {
  try {
    const { text, reportType, language } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    const analysis = await aiService.analyzeReport(text, reportType, language);
    res.json({ success: true, data: { analysis } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

// POST /api/ai/extract-entities
router.post('/extract-entities', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    const entities = await aiService.extractMedicalEntities(text);
    res.json({ success: true, data: { entities } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Entity extraction failed' });
  }
});

// POST /api/ai/qa
router.post('/qa', auth, async (req, res) => {
  try {
    const { question, reportId, language, userLanguageHint, history = [] } = req.body;

    // Validate inputs
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'reportId is required. Send the ID of the report you are asking about.'
      });
    }

    // Fetch the full report — only if it belongs to this user
    const MedicalReport = require('../models/MedicalReport');
    const report = await MedicalReport.findOne({
      _id: reportId,
      user: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Detect the language the user typed in, so AI mirrors it
    const userText = userLanguageHint || question;
    let detectedLanguage = language || report.aiAnalysis?.language || 'English';

    // Simple heuristic: detect Hindi/Gujarati script characters
    const hindiRegex = /[\u0900-\u097F]/;
    const gujaratiRegex = /[\u0A80-\u0AFF]/;
    const arabicRegex = /[\u0600-\u06FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;

    if (gujaratiRegex.test(userText)) {
      detectedLanguage = 'Gujarati';
    } else if (hindiRegex.test(userText)) {
      detectedLanguage = 'Hindi';
    } else if (arabicRegex.test(userText)) {
      detectedLanguage = 'Arabic';
    } else if (chineseRegex.test(userText)) {
      detectedLanguage = 'Chinese';
    }
    // If message is plain ASCII, honour the selected language param
    const responseLanguage = detectedLanguage;

    const testResultsSummary = (
      report.extractedData?.testResults || []
    ).map(t =>
      `- ${t.parameter || t.testName}: ${t.value} ${t.unit || ''}` +
      ` (Normal range: ${t.normalRange || 'Not provided'})` +
      ` → Status: ${t.status}`
    ).join('\n');

    const keyFindings = (report.aiAnalysis?.keyFindings || [])
      .join('\n- ');

    const concerningValues = (
      report.aiAnalysis?.concerningValues || []
    ).join(', ');

    const overallSummary = report.aiAnalysis?.overallSummary
      || report.aiAnalysis?.simplifiedExplanation
      || 'No summary available';

    const reportDate = report.date
      ? new Date(report.date).toLocaleDateString('en-IN')
      : 'Unknown date';

    // Build conversation history string
    const historyText = history.length > 1
      ? '\nPREVIOUS CONVERSATION (for context only):\n' +
        history.slice(0, -1)
          .map(h => `${h.role === 'user' ? 'Patient' : 'Assistant'}: ${h.content}`)
          .join('\n') +
        '\n'
      : '';

    // Build the context-rich prompt
    const prompt = `
You are a patient-friendly medical report assistant.
The patient is asking a question about their specific medical report.
Answer ONLY based on the report data provided below.
Do NOT use general medical knowledge to fill gaps.

CRITICAL LANGUAGE RULE: The patient typed their question in ${responseLanguage}. 
You MUST respond entirely in ${responseLanguage}. 
Mirror the exact language and script the patient used. 
If the question is in Hindi (Devanagari script), reply in Hindi.
If the question is in Gujarati, reply in Gujarati.
If the question is in English, reply in English.
Never mix languages in your response.

REPORT INFORMATION:
Report Type: ${report.reportType || 'Medical Report'}
Report Date: ${reportDate}
Hospital: ${report.hospital?.name || 'Not specified'}

TEST RESULTS FROM THIS REPORT:
${testResultsSummary || 'No test results extracted'}

KEY FINDINGS FROM AI ANALYSIS:
- ${keyFindings || 'None recorded'}

VALUES NEEDING ATTENTION: ${concerningValues || 'None'}

OVERALL SUMMARY: ${overallSummary}
${historyText}
PATIENT'S CURRENT QUESTION: ${question}

RULES FOR YOUR ANSWER:
1. Answer ONLY using the report data shown above.
   Reference specific values and ranges from the report.
2. If the question asks about a test NOT in the report, say so in ${responseLanguage}.
3. If the question is completely unrelated, say so in ${responseLanguage}.
4. Never diagnose diseases.
5. Never recommend specific medications.
6. Keep the answer under 150 words.
7. Use simple, calm, non-alarming language.
8. Write the ENTIRE answer in ${responseLanguage}.
`;

    // Use shared callAI (Groq primary, Gemini fallback) with text-focused system prompt
    const answer = (await callAI(prompt, {
      maxTokens: 500,
      temperature: 0.2,
      systemPrompt: `You are a helpful and compassionate patient-friendly medical report assistant. ` +
                    `IMPORTANT: The user is communicating in ${responseLanguage}. ` +
                    `You MUST respond ENTIRELY in ${responseLanguage} — do not switch languages. ` +
                    `If ${responseLanguage} is Hindi, write in Hindi (Devanagari). ` +
                    `If ${responseLanguage} is Gujarati, write in Gujarati. ` +
                    `Use markdown paragraphs, lists, and bold text for readability. ` +
                    `Do NOT output JSON. Respond with direct text only.`
    })).trim();

    return res.json({
      success: true,
      data: {
        answer,
        language: reportLanguage,
        reportId
      }
    });

  } catch (err) {
    console.error('Q&A error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Could not generate answer. Please try again.'
    });
  }
});

// POST /api/ai/retranslate/:id — Re-analyze report in a different language
router.post('/retranslate/:id', auth, reportsController.retranslate);

module.exports = router;
