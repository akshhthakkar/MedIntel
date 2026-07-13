const Groq = require('groq-sdk');
const axios = require('axios');

// ── Groq client (primary) ────────────────────────────
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL
  || 'llama-3.3-70b-versatile';

// ── Gemini client (fallback only) ────────────────────
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  // @google/generative-ai not installed or key missing
  // Gemini fallback will be disabled
}

const GEMINI_MODEL = process.env.GEMINI_MODEL
  || 'gemini-1.5-flash';

/**
 * Unified AI caller — Groq primary, Gemini fallback.
 * All functions in this file must use this instead of
 * calling Groq or Gemini directly.
 *
 * @param {string} prompt - The full prompt string
 * @param {object} options
 * @param {number} options.maxTokens - Max output tokens (default 2048)
 * @param {number} options.temperature - 0.0-1.0 (default 0.2)
 * @returns {Promise<string>} - Raw text response from AI
 */
async function callAI(prompt, options = {}) {
  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature || 0.2;
  const systemPrompt = options.systemPrompt || 
                       'You are a precise medical report analyzer. ' +
                       'Always respond with valid JSON when asked. ' +
                       'Never add markdown, backticks, or extra text ' +
                       'around JSON output.';
  const startTime = Date.now();

  // ── 1. TRY GROQ ──────────────────────────────────────
  if (groq) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens
        });

        const text = response.choices[0]?.message?.content || '';
        if (!text) throw new Error('Groq returned empty response');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(
          `[AI] Provider: Groq | Model: ${GROQ_MODEL} | Latency: ${duration}s | Token Usage: ` +
          `${response.usage?.total_tokens || '?'} total`
        );
        return text;

      } catch (err) {
        const status       = err?.status || err?.statusCode;
        const isRateLimit  = status === 429
          || String(err?.message).includes('rate_limit')
          || String(err?.message).includes('Rate limit');
        const isTooLong    = status === 413
          || String(err?.message).includes('too large');

        if (isTooLong) {
          console.warn('[AI] Groq: prompt too large, switching to Gemini');
          break;
        }

        if (isRateLimit) {
          if (attempt < 3) {
            const delay = attempt * 2000;
            console.warn(
              `[AI] Groq rate limit. ` +
              `Retry ${attempt}/3 after ${delay / 1000}s...`
            );
            await new Promise(r => setTimeout(r, delay));
            continue;
          } else {
            console.warn('[AI] Groq rate limit exhausted. Falling back to Gemini.');
            break;
          }
        }

        // Any other Groq error
        console.warn(
          `[AI] Groq attempt ${attempt}/3 failed: ${err.message}`
        );
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.warn('[AI] All Groq attempts failed. Falling back to Gemini.');
        break;
      }
    }
  } else {
    console.warn('[AI] Groq not configured. Using Gemini.');
  }

  // ── 2. FALLBACK: GEMINI ───────────────────────────────
  if (!genAI) {
    throw new Error(
      'No AI provider available. ' +
      'Set GROQ_API_KEY in backend/.env'
    );
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      });

      const result = await model.generateContent(prompt);
      const text   = result.response.text();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AI] Provider: Gemini | Model: ${GEMINI_MODEL} | Latency: ${duration}s | Token Usage: N/A (${text.length} chars)`);
      return text;

    } catch (err) {
      const isRateLimit = err?.status === 429
        || String(err?.message).includes('quota')
        || String(err?.message).includes('rate');

      if (isRateLimit && attempt < 3) {
        const delay = attempt * 3000;
        console.warn(
          `[AI] Gemini rate limit. ` +
          `Retry ${attempt}/3 after ${delay / 1000}s...`
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.error(
        `[AI] Gemini attempt ${attempt}/3 failed: ${err.message}`
      );
      if (attempt === 3) {
        throw new Error(
          'All AI providers failed. ' +
          'Check GROQ_API_KEY and GEMINI_API_KEY in backend/.env'
        );
      }
    }
  }
}

/**
 * Safely parse JSON from an AI response.
 * Handles markdown code fences, leading/trailing text,
 * and common formatting issues from Llama models.
 */
function parseJSON(text) {
  if (!text || !text.trim()) {
    throw new Error('AI returned empty response');
  }

  let cleaned = text.trim();

  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  if (cleaned.includes('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }

  // If response has text before the JSON object, find the JSON
  const firstBrace   = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON object found in AI response');
  }

  // Find where JSON actually starts
  let jsonStart = firstBrace;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    jsonStart = firstBracket;
  }

  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  // Find where JSON ends (last } or ])
  const lastBrace   = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const jsonEnd     = Math.max(lastBrace, lastBracket);
if (jsonEnd !== -1 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }

  // Parse
  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    // Last resort: try to fix common issues (trailing commas)
    const fixed = cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(fixed);
  }
}

const path = require('path');
const fs = require('fs');

let categorySchemas = {};
try {
  categorySchemas = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../shared/categorySchemas.json'), 'utf8'));
} catch (err) {
  console.warn('[AI] Failed to load shared category schemas, using empty fallback:', err.message);
}

// Few-Shot Examples by Category to reduce format drift
const fewShotExamples = {
  blood_test: `
Source Text:
"Complete Blood Count (CBC)
Hemoglobin: 12.1 g/dL (Normal Range: 13.5 - 17.5)
WBC: 6.2 x10^3/uL (Normal Range: 4.5 - 11.0)"

Expected JSON Output:
{
  "reportType": "blood_test",
  "language": "English",
  "testResults": [
    {
      "testName": "Hemoglobin",
      "value": "12.1",
      "unit": "g/dL",
      "normalRange": "13.5 - 17.5",
      "status": "Abnormal",
      "explanation": "Your hemoglobin level is slightly low, which could indicate mild anemia.",
      "symptoms": ["Fatigue", "Weakness", "Shortness of breath"],
      "remedies": ["Increase dietary iron", "Discuss iron supplements with your doctor"],
      "confidence": "high"
    },
    {
      "testName": "White Blood Cells (WBC)",
      "value": "6.2",
      "unit": "x10^3/uL",
      "normalRange": "4.5 - 11.0",
      "status": "Normal",
      "explanation": "Your white blood cells are within normal reference range.",
      "symptoms": [],
      "remedies": [],
      "confidence": "high"
    }
  ],
  "keyFindings": ["Hemoglobin level is low at 12.1 g/dL."],
  "concerningValues": ["Hemoglobin: 12.1 g/dL (low)"],
  "positiveIndicators": ["White blood cells are in normal range."],
  "overallSummary": "The blood report shows a low hemoglobin count which suggests mild anemia, while other key white blood cell markers are normal.",
  "urgencyLevel": "soon",
  "suggestedPrecautions": ["Monitor fatigue symptoms.", "Schedule a follow-up appointment with your physician."]
}`,
  imaging: `
Source Text:
"Chest X-Ray PA:
Lungs are clear. Mild cardiomegaly is noted with cardiothoracic ratio of 55%."

Expected JSON Output:
{
  "reportType": "imaging",
  "language": "English",
  "bodyRegion": "Chest",
  "findings": ["The lungs are clear.", "Mild cardiomegaly is noted with a cardiothoracic ratio of 55%."],
  "impression": ["Mild cardiomegaly (enlarged heart)."],
  "recommendations": ["Suggest clinical correlation and comparison with prior radiographs."],
  "abnormalities": ["Mild cardiomegaly"],
  "overallSummary": "The chest X-ray shows clear lungs but identifies a mildly enlarged heart (cardiomegaly).",
  "urgencyLevel": "soon",
  "suggestedPrecautions": ["Share results with your doctor.", "Avoid strenuous exercises until reviewed."]
}`,
  prescription: `
Source Text:
"Rx:
- Lisinopril 10mg: Once daily in the morning after food. Qty: 30 days."

Expected JSON Output:
{
  "reportType": "prescription",
  "language": "English",
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "once_daily",
      "duration": "30 days",
      "instructions": "Once daily in the morning after food"
    }
  ],
  "instructions": "Take medications as prescribed.",
  "diagnoses": [],
  "overallSummary": "A prescription containing one daily blood pressure medication (Lisinopril).",
  "urgencyLevel": "routine",
  "suggestedPrecautions": ["Take consistently in the morning.", "Monitor blood pressure regularly."]
}`,
  ecg: `
Source Text:
"ECG Report:
Heart Rate: 72 bpm. Sinus Rhythm. PR interval is 150 ms. QRS duration 95 ms."

Expected JSON Output:
{
  "reportType": "ecg",
  "language": "English",
  "heartRate": "72",
  "rhythm": "Sinus Rhythm",
  "prInterval": "150 ms",
  "qrsDuration": "95 ms",
  "qtInterval": "Not provided",
  "qtcInterval": "Not provided",
  "findings": ["Normal sinus rhythm at 72 bpm.", "Normal PR and QRS intervals."],
  "abnormalities": [],
  "overallSummary": "ECG findings indicate a healthy normal sinus rhythm with no conduction delays.",
  "urgencyLevel": "routine",
  "suggestedPrecautions": ["Maintain regular cardio exercises.", "Discuss during routine checkup."]
}`
};

// Auto-detect report type from raw text
async function autoDetectReportType(text) {
  const prompt = `Classify this medical report text into exactly one of these categories:
- blood_test
- urine_test
- imaging (for X-ray, MRI, CT scan, Ultrasound, etc.)
- ecg
- prescription
- discharge_summary
- other

MEDICAL TEXT:
${text.substring(0, 1000)}

Return ONLY the category name as a single word in lowercase. Do not write anything else.`;

  try {
    const response = await callAI(prompt, { maxTokens: 32, temperature: 0.1 });
    const detected = response.trim().toLowerCase();
    const validTypes = ['blood_test', 'urine_test', 'imaging', 'ecg', 'prescription', 'discharge_summary', 'other'];
    return validTypes.includes(detected) ? detected : 'other';
  } catch (err) {
    console.warn('[AI] Report type auto-detection failed:', err.message);
    return 'other';
  }
}

// Category-specific prompt fragments
function getCategoryInstructions(category) {
  switch (category) {
    case 'blood_test':
      return `Extract every measured blood analyte parameter. Group results into standard panels (e.g. CBC, Lipid Panel, LFT, KFT, Thyroid Profile, Diabetes Panel, Electrolytes). Ensure parameters are populated as testResults.`;
    case 'urine_test':
      return `Extract urianlysis measurements (Color, Clarity, Specific Gravity, pH, Protein, Glucose, Ketones, Bilirubin, Urobilinogen, Nitrite, Leukocytes, Blood). Populate as testResults.`;
    case 'imaging':
      return `Do NOT populate testResults. Instead, extract 'bodyRegion' (e.g., Chest, Brain, Abdomen), 'findings' (array of observation sentences), 'impression' (array of summary conclusions), 'recommendations', and 'abnormalities'.`;
    case 'ecg':
      return `Do NOT populate testResults. Instead, extract heartRate, rhythm, prInterval, qrsDuration, qtInterval, qtcInterval, findings (array of statements), and abnormalities (array of abnormalities).`;
    case 'prescription':
      return `Do NOT populate testResults. Instead, extract 'medications' array. For each medication, extract: name, dosage, frequency (must be one of: once_daily, twice_daily, thrice_daily, four_times_daily, every_6_hours, every_8_hours, every_12_hours, as_needed, weekly), duration, and instructions.`;
    case 'discharge_summary':
      return `Do NOT populate testResults. Instead, extract diagnoses, procedures, dischargeMedications (array of medications with name, dosage, frequency), followUpInstructions, and carePlan.`;
    default:
      return `Extract any parameters as testResults. Describe observations and recommendations.`;
  }
}

// Structured schema validator
function validateAgainstSchema(data, category) {
  const schema = categorySchemas[category] || categorySchemas['other'];
  const errors = [];

  if (schema && schema.fields) {
    for (const field of schema.fields) {
      if (field.required && (data[field.name] === undefined || data[field.name] === null)) {
        errors.push(`Missing required field: ${field.name}`);
      }
    }
  }
  return errors;
}

function chunkText(text, maxChars = 10000) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.substring(index, index + maxChars));
    index += maxChars;
  }
  return chunks;
}

function mergeAnalysisResults(results, category) {
  if (!results || results.length === 0) return getFallbackAnalysis();
  if (results.length === 1) return results[0];

  const merged = { ...results[0] };
  
  merged.keyFindings = [...new Set(results.flatMap(r => r.keyFindings || []))];
  merged.concerningValues = [...new Set(results.flatMap(r => r.concerningValues || []))];
  merged.positiveIndicators = [...new Set(results.flatMap(r => r.positiveIndicators || []))];
  merged.suggestedPrecautions = [...new Set(results.flatMap(r => r.suggestedPrecautions || []))];
  
  if (category === 'blood_test' || category === 'urine_test' || category === 'other') {
    const testResultsMap = new Map();
    results.flatMap(r => r.testResults || []).forEach(tr => {
      if (tr.testName) {
        testResultsMap.set(tr.testName.toLowerCase(), tr);
      }
    });
    merged.testResults = Array.from(testResultsMap.values());
  } else if (category === 'imaging') {
    merged.findings = [...new Set(results.flatMap(r => r.findings || []))];
    merged.impression = [...new Set(results.flatMap(r => r.impression || []))];
    merged.recommendations = [...new Set(results.flatMap(r => r.recommendations || []))];
    merged.abnormalities = [...new Set(results.flatMap(r => r.abnormalities || []))];
  } else if (category === 'ecg') {
    merged.findings = [...new Set(results.flatMap(r => r.findings || []))];
    merged.abnormalities = [...new Set(results.flatMap(r => r.abnormalities || []))];
  } else if (category === 'prescription') {
    const medMap = new Map();
    results.flatMap(r => r.medications || []).forEach(m => {
      if (m.name) medMap.set(m.name.toLowerCase(), m);
    });
    merged.medications = Array.from(medMap.values());
    merged.diagnoses = [...new Set(results.flatMap(r => r.diagnoses || []))];
  } else if (category === 'discharge_summary') {
    merged.diagnoses = [...new Set(results.flatMap(r => r.diagnoses || []))];
    merged.procedures = [...new Set(results.flatMap(r => r.procedures || []))];
    merged.followUpInstructions = [...new Set(results.flatMap(r => r.followUpInstructions || []))];
    const medMap = new Map();
    results.flatMap(r => r.dischargeMedications || []).forEach(m => {
      if (m.name) medMap.set(m.name.toLowerCase(), m);
    });
    merged.dischargeMedications = Array.from(medMap.values());
  }

  const urgencies = results.map(r => r.urgencyLevel || 'routine');
  if (urgencies.includes('urgent')) merged.urgencyLevel = 'urgent';
  else if (urgencies.includes('soon')) merged.urgencyLevel = 'soon';
  else merged.urgencyLevel = 'routine';

  return merged;
}

async function analyzeReport(text, reportType, language = 'English') {
  if (!text || text.trim().length < 20) return getFallbackAnalysis();

  let category = reportType;
  if (!category || category === 'other' || category === 'Unknown') {
    category = await autoDetectReportType(text);
    console.log(`[AI] Auto-detected report category: ${category}`);
  }

  const chunks = chunkText(text, 10000);
  if (chunks.length > 1) {
    console.log(`[AI] Multi-page report detected (${text.length} chars). Split into ${chunks.length} chunks.`);
  }

  const chunkResults = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    const result = await analyzeSingleChunk(chunks[idx], category, language, text);
    chunkResults.push(result);
  }

  return mergeAnalysisResults(chunkResults, category);
}

async function analyzeSingleChunk(chunkTextContent, category, language, fullOriginalText) {
  const categoryInstructions = getCategoryInstructions(category);
  const fewShotExample = fewShotExamples[category] || fewShotExamples['blood_test'];

  const prompt = `You are a clinical medical report analyzer and patient educator.
Your job is to analyze medical reports strictly based on the
information present in the report text provided to you.

ABSOLUTE RULES — NEVER VIOLATE THESE:
1. Only analyze parameters that are explicitly written in the
   report text. Never invent, assume, or hallucinate any test
   names, values, units, or diagnoses not present in the text.
2. If a test appears multiple times, use only the most recent value.
3. Ignore hospital names, doctor signatures, patient IDs, barcodes, and logos.
4. If the report text contains OCR noise, only extract confident values.
5. If a parameter has no reference range, set normalRange to "Not provided in report".
6. Never diagnose diseases. Only describe clinical significance in plain language.
7. Borderline = value within 5% of reference limit. Beyond 5% = Abnormal.
8. Urgency: routine (all Normal/Borderline), soon (Abnormal but not critical),
   urgent (>30% beyond limit or acute risk values).
9. All Normal report = urgencyLevel "routine" + calm summary.
10. Multiple abnormal values from same organ system: note without naming disease.
11. Unreadable/non-medical text = fallback with "Unable to interpret" summary.
12. For all extracted parameters, supply a self-reported field confidence score: "high", "medium", or "low".
13. Reduce hallucination risk on numeric values: only output values that appear verbatim or near-match in the raw text.
14. SYMPTOM GENERATION RULES:
    a. Never imply certainty: Do not state/imply that the patient has, will develop, or is expected to experience symptoms solely based on abnormal lab values. Use probabilistic/uncertainty language (e.g., "may", "could", "is sometimes associated with"). Never use "you have", "is causing", "is due to", "defines", "diagnoses".
    b. Symptoms are optional: Acknowledge that mild abnormalities are often asymptomatic (e.g., "Some individuals with this finding have no symptoms. If symptoms occur, they may include...").
    c. Severity-aware: Wording must match severity. Mild abnormalities must only list common mild symptoms and never list emergency/severe symptoms. Moderate lists common associated symptoms. Severe lists more likely warning symptoms and recommends evaluation.
    d. Symptoms are associations, not diagnoses: Wording must present symptoms as associated manifestations, not caused by the abnormality.
    e. Separate findings from symptoms: Present laboratory findings and symptoms independently.
    f. Avoid diagnostic inference: Do not infer or state diagnoses from lab results (e.g. say "associated with impaired glucose regulation", never "you have diabetes").
    g. Safety constraint: Lab values alone must never be used to confirm/exclude a diagnosis. Frame all interpretations as informational and encourage clinical correlation with patient's medical history.

CATEGORY-SPECIFIC INSTRUCTIONS:
${categoryInstructions}

PATIENT'S PREFERRED LANGUAGE: ${language}

FEW-SHOT EXAMPLE WORKED PATHWAY:
${fewShotExample}

REPORT TEXT CHUNK:
${chunkTextContent}

REPORT TYPE / CATEGORY: ${category}

Complete these tasks IN ${language}:
TASK 1: Extract/populate fields matching the schema JSON format below.
TASK 2: Highlight key findings and positive/concerning indicators.
TASK 3: Provide precautions and overall summary in simple terms.

CRITICAL: Return ONLY valid JSON matching the target structure. No markdown, no backticks, no extra text.

TARGET SCHEMA JSON FORMAT:
{
  "reportType": "${category}",
  "language": "${language}",
  ${category === 'imaging' ? '"bodyRegion": "string",\n  "findings": ["string"],\n  "impression": ["string"],\n  "recommendations": ["string"],\n  "abnormalities": ["string"],' : ''}
  ${category === 'ecg' ? '"heartRate": "string",\n  "rhythm": "string",\n  "prInterval": "string",\n  "qrsDuration": "string",\n  "qtInterval": "string",\n  "qtcInterval": "string",\n  "findings": ["string"],\n  "abnormalities": ["string"],' : ''}
  ${category === 'prescription' ? '"medications": [\n    {\n      "name": "string",\n      "dosage": "string",\n      "frequency": "once_daily|twice_daily|thrice_daily|four_times_daily|every_6_hours|every_8_hours|every_12_hours|as_needed|weekly",\n      "duration": "string",\n      "instructions": "string"\n    }\n  ],\n  "instructions": "string",\n  "diagnoses": ["string"],' : ''}
  ${category === 'discharge_summary' ? '"diagnoses": ["string"],\n  "procedures": ["string"],\n  "dischargeMedications": [\n    {\n      "name": "string",\n      "dosage": "string",\n      "frequency": "string",\n      "duration": "string",\n      "instructions": "string"\n    }\n  ],\n  "followUpInstructions": ["string"],\n  "carePlan": "string",' : ''}
  ${category === 'blood_test' || category === 'urine_test' || category === 'other' ? '"testResults": [\n    {\n      "testName": "string",\n      "value": "string",\n      "unit": "string",\n      "normalRange": "string",\n      "status": "Normal|Borderline|Abnormal",\n      "explanation": "string",\n      "symptoms": ["string"],\n      "remedies": ["string"],\n      "confidence": "high|medium|low"\n    }\n  ],' : ''}
  "keyFindings": ["string"],
  "concerningValues": ["string"],
  "positiveIndicators": ["string"],
  "overallSummary": "string",
  "urgencyLevel": "routine|soon|urgent",
  "suggestedPrecautions": ["string"]
}`;

  let rawText = '';
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        let currentPrompt = prompt;
        if (attempt === 2) {
          console.log(`[AI] Attempt 2: Sending corrective prompt to fix formatting...`);
          currentPrompt = `Here was your previous response:\n${rawText}\n\nIt failed verification check. Please output ONLY the corrected valid JSON conforming strictly to the requested schema. No codeblocks, no markdown.`;
        }

        rawText = await callAI(currentPrompt, {
          maxTokens: 2048,
          temperature: 0.2
        });
        rawText = rawText.trim();

        let parsed = parseJSON(rawText);

        const validationErrors = validateAgainstSchema(parsed, category);
        if (validationErrors.length > 0) {
          console.warn(`[AI] Validation FAILED on attempt ${attempt}:`, validationErrors.join(', '));
          if (attempt === 1) continue;
        } else {
          console.log(`[AI] Validation PASSED on attempt ${attempt}`);
        }

        if (!parsed.reportType) parsed.reportType = category;
        if (!parsed.language) parsed.language = language;

        if (parsed.testResults && Array.isArray(parsed.testResults)) {
          parsed.testResults = parsed.testResults.map(r => ({
            ...r,
            status: r.status || 'Normal',
            confidence: r.confidence || 'medium',
            symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
            remedies: Array.isArray(r.remedies) ? r.remedies : []
          }));
        }

        if (parsed.testResults && Array.isArray(parsed.testResults)) {
          parsed.testResults.forEach(r => {
            const valNum = parseFloat(r.value);
            if (!isNaN(valNum) && !fullOriginalText.includes(r.value)) {
              console.warn(`[AI] Hallucination check triggered. Value ${r.value} for ${r.testName} not found verbatim. Flagging confidence: low.`);
              r.confidence = 'low';
            }
          });
        }

        return parsed;
      } catch (parseErr) {
        console.error(`[AI] Parsing error on attempt ${attempt}:`, parseErr.message);
        if (attempt === 1) continue;
      }
    }

    return getFallbackAnalysis();
  } catch (error) {
    console.error('AI analysis error:', error.message);
    return getFallbackAnalysis();
  }
}

async function extractMedicalEntities(text) {
  if (!text || text.trim().length < 20) return getFallbackExtraction();

  const prompt = `Extract medical entities from this text. Return ONLY valid JSON.

TEXT: ${text}

{
  "testResults": [{"testName":"string","value":"string","unit":"string","normalRange":"string","status":"Normal|Borderline|Abnormal"}],
  "diagnoses": ["string"],
  "medications": [{"name":"string","dosage":"string","frequency":"string"}],
  "observations": ["string"],
  "recommendations": ["string"]
}`;

  try {
    const text_response = await callAI(prompt, {
      maxTokens: 1024,
      temperature: 0.1
    });

    let parsed;
    try {
      parsed = parseJSON(text_response);
    } catch (e) {
      console.error('[extractMedicalEntities] Parse error:', e.message);
      return getFallbackExtraction();
    }
    return parsed;
  } catch (error) {
    console.error('Entity extraction error:', error.message);
    return getFallbackExtraction();
  }
}

async function analyzeSymptomPatterns(symptoms, medications) {
  const prompt = `Analyze the relationship between these symptoms and medications.
Symptoms: ${JSON.stringify(symptoms)}
Medications: ${JSON.stringify(medications)}

Return ONLY valid JSON:
{
  "patterns": ["string"],
  "recommendations": ["string"],
  "urgencyLevel": "routine|soon|urgent",
  "correlatedMedications": [{"medication":"string","possibleSideEffect":"string","confidence":"high|medium|low"}]
}`;

  try {
    const text = await callAI(prompt, {
      maxTokens: 1024,
      temperature: 0.3
    });

    let parsed;
    try {
      parsed = parseJSON(text);
    } catch (e) {
      console.error('[analyzeSymptomPatterns] Parse error:', e.message);
      return {
        patterns: [],
        recommendations: ['Log your symptoms regularly for better insights.'],
        urgencyLevel: 'routine',
        correlatedMedications: []
      };
    }
    return parsed;
  } catch (error) {
    console.error('Symptom pattern analysis error:', error.message);
    return { patterns: [], recommendations: [], urgencyLevel: 'routine', correlatedMedications: [] };
  }
}

const localInteractions = {
  aspirin: {
    with: ["warfarin", "ibuprofen"],
    severity: "moderate",
    description: "May increase bleeding risk",
    recommendation: "Avoid concurrent use or monitor closely."
  },
  metformin: {
    with: ["alcohol"],
    severity: "moderate",
    description: "May increase risk of lactic acidosis",
    recommendation: "Limit alcohol intake while taking metformin."
  },
  warfarin: {
    with: ["aspirin", "ibuprofen"],
    severity: "severe",
    description: "Significantly increases bleeding risk",
    recommendation: "Contraindicated or requires active medical monitoring."
  }
};

async function checkOpenFDAInteractions(med1, med2) {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(med1)}"+AND+drug_interactions:"${encodeURIComponent(med2)}"&limit=1`;
    const res = await axios.get(url, { timeout: 3000 });
    if (res.data && res.data.results && res.data.results.length > 0) {
      const labelData = res.data.results[0];
      const interactionText = labelData.drug_interactions ? labelData.drug_interactions[0] : 'Interaction noted in FDA records';
      return {
        medication1: med1,
        medication2: med2,
        severity: interactionText.toLowerCase().includes('severe') || interactionText.toLowerCase().includes('fatal') || interactionText.toLowerCase().includes('contraindicated') ? 'severe' : 'moderate',
        description: interactionText.substring(0, 150) + '...',
        recommendation: 'Consult your physician before taking these medications together.',
        source: 'openFDA API'
      };
    }
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw new Error(`openFDA API failure: ${err.message}`);
  }
  return null;
}

async function checkDrugInteractions(medications) {
  if (!medications || medications.length < 2) return [];

  const results = [];
  let apiFailed = false;

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const med1 = (typeof medications[i] === 'string' ? medications[i] : medications[i].name).toLowerCase().trim();
      const med2 = (typeof medications[j] === 'string' ? medications[j] : medications[j].name).toLowerCase().trim();

      try {
        const interaction = await checkOpenFDAInteractions(med1, med2);
        if (interaction) {
          results.push(interaction);
        }
      } catch (err) {
        console.warn(`[openFDA] API failed for ${med1} and ${med2}:`, err.message);
        apiFailed = true;
      }
    }
  }

  if (apiFailed) {
    console.log('[openFDA] Falling back to local database checks due to API failure...');
    const localResults = [];
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = (typeof medications[i] === 'string' ? medications[i] : medications[i].name).toLowerCase().trim();
        const med2 = (typeof medications[j] === 'string' ? medications[j] : medications[j].name).toLowerCase().trim();
        
        if (localInteractions[med1]?.with.includes(med2)) {
          localResults.push({
            medication1: medications[i].name || medications[i],
            medication2: medications[j].name || medications[j],
            severity: localInteractions[med1].severity,
            description: localInteractions[med1].description,
            recommendation: localInteractions[med1].recommendation,
            warningBanner: '⚠️ openFDA service is currently offline. Interaction check used local offline records.'
          });
        }
      }
    }
    return localResults;
  }

  return results;
}

async function translateText(text, targetLanguage) {
  const prompt = `Translate the following medical text to ${targetLanguage}. Keep medical terms accurate but explain in simple language.

TEXT: ${text}

Return only the translated text, nothing else.`;

  try {
    const translatedText = await callAI(prompt, {
      maxTokens: 2048,
      temperature: 0.1,
      systemPrompt: 'You are a precise translator. Translate the text directly and accurately. Do NOT output JSON. Respond with the translated text only.'
    });
    return translatedText.trim();
  } catch (error) {
    console.error('Translation error:', error.message);
    return text;
  }
}

function getFallbackAnalysis() {
  return {
    reportType: 'Unknown',
    language: 'English',
    testResults: [],
    keyFindings: ['AI analysis temporarily unavailable'],
    concerningValues: [],
    positiveIndicators: [],
    overallSummary: 'AI analysis is currently unavailable. Please consult your healthcare provider for interpretation.',
    urgencyLevel: 'routine',
    suggestedPrecautions: ['Consult your healthcare provider for a detailed interpretation']
  };
}

function getFallbackExtraction() {
  return {
    testResults: [],
    diagnoses: [],
    medications: [],
    observations: [],
    recommendations: []
  };
}

module.exports = {
  callAI,
  parseJSON,
  analyzeReport,
  extractMedicalEntities,
  analyzeSymptomPatterns,
  checkDrugInteractions,
  translateText,
  getFallbackAnalysis,
  getFallbackExtraction
};
