import os
import json
import time
import re
import asyncio
import logging
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Groq client (primary) ────────────────────────────
groq_client = None
try:
    from groq import Groq
    if os.getenv('GROQ_API_KEY'):
        groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
except ImportError:
    pass  # groq not installed

GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')

# ── Gemini client (fallback only) ────────────────────
gemini_configured = False
try:
    import google.generativeai as genai
    gemini_key = os.getenv('GEMINI_API_KEY')
    if gemini_key:
        genai.configure(api_key=gemini_key.strip())
        gemini_configured = True
except ImportError:
    pass  # google-generativeai not installed

GEMINI_MODEL = (os.getenv('GEMINI_MODEL') or 'gemini-1.5-flash').strip()


def call_ai(prompt: str,
            max_tokens: int = 2048,
            temperature: float = 0.2) -> str:
    """Unified AI caller — Groq primary, Gemini fallback."""


    # ── 1. TRY GROQ ──────────────────────────────────────
    if groq_client:
        for attempt in range(1, 4):
            try:
                response = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {
                            'role': 'system',
                            'content': (
                                'You are a precise medical report analyzer. '
                                'Always respond with valid JSON when asked. '
                                'Never add markdown, backticks, or extra text '
                                'around JSON output.'
                            )
                        },
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                text = response.choices[0].message.content or ''
                if not text:
                    raise ValueError('Groq returned empty response')
                logger.info(f'[AI] Groq response OK')
                return text

            except Exception as e:
                err_str = str(e)
                is_rate_limit = '429' in err_str or 'rate_limit' in err_str
                is_too_large = '413' in err_str or 'too large' in err_str

                if is_too_large:
                    logger.warning('[AI] Groq: prompt too large, falling back to Gemini')
                    break

                if is_rate_limit:
                    if attempt < 3:
                        delay = attempt * 2
                        logger.warning(f'[AI] Groq rate limit. Retry {attempt}/3 in {delay}s...')
                        time.sleep(delay)
                        continue
                    else:
                        logger.warning('[AI] Groq rate limit exhausted. Falling back to Gemini.')
                        break

                logger.warning(f'[AI] Groq attempt {attempt}/3 failed: {e}')
                if attempt < 3:
                    time.sleep(1)
                    continue
                logger.warning('[AI] All Groq attempts failed. Falling back to Gemini.')
                break

    # ── 2. FALLBACK: GEMINI ───────────────────────────────
    if not gemini_configured:
        raise RuntimeError(
            'No AI provider available. '
            'Set GROQ_API_KEY in ai-service/.env'
        )

    for attempt in range(1, 4):
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            logger.info(f'[AI] Gemini fallback OK (attempt {attempt})')
            return response.text

        except Exception as e:
            err_str = str(e)
            is_rate_limit = '429' in err_str or 'quota' in err_str

            if is_rate_limit and attempt < 3:
                delay = attempt * 3
                logger.warning(f'[AI] Gemini rate limit. Retry {attempt}/3 in {delay}s...')
                time.sleep(delay)
                continue

            logger.error(f'[AI] Gemini attempt {attempt}/3 failed: {e}')
            if attempt == 3:
                raise RuntimeError(
                    'All AI providers failed. '
                    'Check GROQ_API_KEY and GEMINI_API_KEY.'
                )

    # Should never reach here, but satisfy type checker
    raise RuntimeError('All AI providers failed.')


def parse_json_safely(text: str) -> Optional[dict]:
    """
    Safely parse JSON from an AI response.
    Handles markdown fences and extra text around JSON.
    """
    if not text or not text.strip():
        return None

    cleaned: str = text.strip()

    # Remove markdown code fences
    if '```' in cleaned:
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)
        cleaned = cleaned.strip()

    # Find where JSON starts
    first_brace: int = cleaned.find('{')
    first_bracket: int = cleaned.find('[')

    if first_brace == -1 and first_bracket == -1:
        preview: str = str(cleaned)[:100]
        logger.error(f'No JSON found in AI response: {preview}...')
        return None

    if first_bracket != -1 and (first_brace == -1
                                or first_bracket < first_brace):
        json_start: int = first_bracket
    else:
        json_start = first_brace

    cleaned = str(cleaned)[json_start:]

    # Find where JSON ends
    last_brace: int = cleaned.rfind('}')
    last_bracket: int = cleaned.rfind(']')
    json_end: int = max(last_brace, last_bracket)

    if json_end != -1 and json_end < len(cleaned) - 1:
        cleaned = str(cleaned)[:json_end + 1]

    # Fix trailing commas
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f'JSON parse error: {e}\nRaw text:\n{cleaned}')
        return None


def get_fallback_analysis() -> dict:
    """Return a safe fallback structure when extraction fails."""
    return {
        "reportType": "Unknown",
        "language": "English",
        "testResults": [],
        "keyFindings": ["AI analysis temporarily unavailable"],
        "concerningValues": [],
        "positiveIndicators": [],
        "overallSummary": "AI analysis is currently unavailable. Please consult your healthcare provider for interpretation.",
        "urgencyLevel": "routine",
        "suggestedPrecautions": ["Consult your healthcare provider for interpretation"]
    }

category_schemas = {}
try:
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../shared/categorySchemas.json'))
    with open(schema_path, 'r', encoding='utf-8') as f:
        category_schemas = json.load(f)
except Exception as e:
    logger.warning(f"[AI] Failed to load shared category schemas: {str(e)}")

FEW_SHOT_EXAMPLES = {
    "blood_test": """
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
}""",
    "imaging": """
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
}""",
    "prescription": """
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
}""",
    "ecg": """
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
}"""
}

async def auto_detect_report_type(text: str) -> str:
    prompt = f"""Classify this medical report text into exactly one of these categories:
- blood_test
- urine_test
- imaging (for X-ray, MRI, CT scan, Ultrasound, etc.)
- ecg
- prescription
- discharge_summary
- other

MEDICAL TEXT:
{text[:1000]}

Return ONLY the category name as a single word in lowercase. Do not write anything else."""
    try:
        response = call_ai(prompt, max_tokens=32, temperature=0.1)
        detected = response.strip().lower()
        valid_types = ['blood_test', 'urine_test', 'imaging', 'ecg', 'prescription', 'discharge_summary', 'other']
        return detected if detected in valid_types else 'other'
    except Exception as e:
        logger.warning(f"[AI] Report type auto-detection failed: {str(e)}")
        return 'other'

def get_category_instructions(category: str) -> str:
    if category == 'blood_test':
        return "Extract every measured blood analyte parameter. Group results into standard panels (e.g. CBC, Lipid Panel, LFT, KFT, Thyroid Profile, Diabetes Panel, Electrolytes). Ensure parameters are populated as testResults."
    elif category == 'urine_test':
        return "Extract urinalysis measurements (Color, Clarity, Specific Gravity, pH, Protein, Glucose, Ketones, Bilirubin, Urobilinogen, Nitrite, Leukocytes, Blood). Populate as testResults."
    elif category == 'imaging':
        return "Do NOT populate testResults. Instead, extract 'bodyRegion' (e.g., Chest, Brain, Abdomen), 'findings' (array of observation sentences), 'impression' (array of summary conclusions), 'recommendations', and 'abnormalities'."
    elif category == 'ecg':
        return "Do NOT populate testResults. Instead, extract heartRate, rhythm, prInterval, qrsDuration, qtInterval, qtcInterval, findings (array of statements), and abnormalities (array of abnormalities)."
    elif category == 'prescription':
        return "Do NOT populate testResults. Instead, extract 'medications' array. For each medication, extract: name, dosage, frequency (must be one of: once_daily, twice_daily, thrice_daily, four_times_daily, every_6_hours, every_8_hours, every_12_hours, as_needed, weekly), duration, and instructions."
    elif category == 'discharge_summary':
        return "Do NOT populate testResults. Instead, extract diagnoses, procedures, dischargeMedications (array of medications with name, dosage, frequency), followUpInstructions, and carePlan."
    else:
        return "Extract any parameters as testResults. Describe observations and recommendations."

def validate_against_schema(data: dict, category: str) -> List[str]:
    schema = category_schemas.get(category, category_schemas.get('other', {}))
    errors = []
    if schema and 'fields' in schema:
        for field in schema['fields']:
            if field.get('required') and field.get('name') not in data:
                errors.append(f"Missing required field: {field.get('name')}")
    return errors

async def analyze_report(raw_text: str, language: str = 'English', file_bytes: Optional[bytes] = None, mime_type: Optional[str] = None) -> dict:
    """Analyze the extracted medical report text, returning a structured JSON response."""
    has_image = bool(file_bytes and mime_type and "image" in mime_type)
    if not has_image and (not raw_text or len(raw_text.strip()) < 20):
        logger.warning("No text provided or text too short, and no image provided.")
        fallback = get_fallback_analysis()
        fallback["language"] = language
        return fallback

    category = await auto_detect_report_type(raw_text or '')
    category_instructions = get_category_instructions(category)
    few_shot_example = FEW_SHOT_EXAMPLES.get(category, FEW_SHOT_EXAMPLES['blood_test'])

    prompt = f"""You are a clinical medical report analyzer and patient educator.
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
{category_instructions}

PATIENT'S PREFERRED LANGUAGE: {language}

FEW-SHOT EXAMPLE WORKED PATHWAY:
{few_shot_example}

REPORT TEXT:
{raw_text or 'See attached image'}

REPORT TYPE / CATEGORY: {category}

Complete these tasks IN {language}:
TASK 1: Extract/populate fields matching the schema JSON format below.
TASK 2: Highlight key findings and positive/concerning indicators.
TASK 3: Provide precautions and overall summary in simple terms.

CRITICAL: Return ONLY valid JSON matching the target structure. No markdown, no backticks, no extra text.

TARGET SCHEMA JSON FORMAT:
{{
  "reportType": "{category}",
  "language": "{language}",
  {'"bodyRegion": "string",\\n  "findings": ["string"],\\n  "impression": ["string"],\\n  "recommendations": ["string"],\\n  "abnormalities": ["string"],' if category == 'imaging' else ''}
  {'"heartRate": "string",\\n  "rhythm": "string",\\n  "prInterval": "string",\\n  "qrsDuration": "string",\\n  "qtInterval": "string",\\n  "qtcInterval": "string",\\n  "findings": ["string"],\\n  "abnormalities": ["string"],' if category == 'ecg' else ''}
  {'"medications": [\\n    {\\n      "name": "string",\\n      "dosage": "string",\\n      "frequency": "once_daily|twice_daily|thrice_daily|four_times_daily|every_6_hours|every_8_hours|every_12_hours|as_needed|weekly",\\n      "duration": "string",\\n      "instructions": "string"\\n    }\\n  ],\\n  "instructions": "string",\\n  "diagnoses": ["string"],' if category == 'prescription' else ''}
  {'"diagnoses": ["string"],\\n  "procedures": ["string"],\\n  "dischargeMedications": [\\n    {\\n      "name": "string",\\n      "dosage": "string",\\n      "frequency": "string",\\n      "duration": "string",\\n      "instructions": "string"\\n    }\\n  ],\\n  "followUpInstructions": ["string"],\\n  "carePlan": "string",' if category == 'discharge_summary' else ''}
  {'"testResults": [\\n    {\\n      "testName": "string",\\n      "value": "string",\\n      "unit": "string",\\n      "normalRange": "string",\\n      "status": "Normal|Borderline|Abnormal",\\n      "explanation": "string",\\n      "symptoms": ["string"],\\n      "remedies": ["string"],\\n      "confidence": "high|medium|low"\\n    }\\n  ],' if category in ['blood_test', 'urine_test', 'other'] else ''}
  "keyFindings": ["string"],
  "concerningValues": ["string"],
  "positiveIndicators": ["string"],
  "overallSummary": "string",
  "urgencyLevel": "routine|soon|urgent",
  "suggestedPrecautions": ["string"]
}}"""

    response_text = ""
    try:
        # Formatting retry loop
        for attempt in range(1, 3):
            try:
                current_prompt = prompt
                if attempt == 2:
                    logger.info("[AI] Attempt 2: Requesting corrected format JSON...")
                    current_prompt = f"Here was your previous response:\n{response_text}\n\nIt failed verification. Please output ONLY the corrected valid JSON conforming strictly to the requested schema. No codeblocks, no markdown."

                response_text = call_ai(current_prompt, max_tokens=4096, temperature=0.2)
                parsed_data = parse_json_safely(response_text)

                if not parsed_data:
                    if attempt == 1:
                        continue
                    return get_fallback_analysis()

                # Validate structure
                val_errors = validate_against_schema(parsed_data, category)
                if val_errors:
                    logger.warning(f"[AI] Validation failed: {', '.join(val_errors)}")
                    if attempt == 1:
                        continue

                # Data normalization
                if "testResults" in parsed_data and isinstance(parsed_data["testResults"], list):
                    for result in parsed_data["testResults"]:
                        if not isinstance(result.get("symptoms"), list):
                            raw = result.get("symptoms", "")
                            result["symptoms"] = [s.strip() for s in raw.split(',') if s.strip()] if isinstance(raw, str) else []
                        if not isinstance(result.get("remedies"), list):
                            raw = result.get("remedies", "")
                            result["remedies"] = [r.strip() for r in raw.split(',') if r.strip()] if isinstance(raw, str) else []
                        if result.get("status", "").lower() == "normal":
                            result["symptoms"] = []
                            result["remedies"] = []
                        result["confidence"] = result.get("confidence", "medium")

                        # Verbatim check to reduce hallucinations
                        if raw_text and result.get("value") is not None:
                            val_str = str(result["value"])
                            if val_str not in raw_text:
                                logger.warning(f"[AI] Verbatim value mismatch for {result.get('testName')}. Flagging low confidence.")
                                result["confidence"] = "low"

                return parsed_data
            except Exception as pe:
                logger.error(f"[AI] Parse attempt {attempt} failed: {pe}")
                if attempt == 1:
                    continue

        fallback = get_fallback_analysis()
        fallback["language"] = language
        return fallback

    except Exception as e:
        logger.error(f"Error analyzing report: {str(e)}")
        fallback = get_fallback_analysis()
        fallback["language"] = language
        return fallback


async def check_drug_interactions(existing_medications: List[str], new_medication: str) -> str:
    """Check clinical interactions between existing and new medications."""
    if not existing_medications or len(existing_medications) == 0:
        return "No known interactions found."

    prompt = f"""The patient currently takes these medications: {', '.join(existing_medications)}
They want to add this new medication: {new_medication}

In 2 sentences maximum, state if there are any known clinical interactions.
If none, say EXACTLY textually: "No known interactions found."
Use simple language. No medical jargon."""

    try:
        response_text = call_ai(prompt, max_tokens=256, temperature=0.1)
        return response_text.strip() if response_text else "No known interactions found."
    except Exception as e:
        logger.error(f"Error checking drug interactions: {str(e)}")
        return "Unable to check interactions at this time."


async def answer_question(report_text: str, question: str, language: str = "English") -> str:
    """Answer a patient's question based on their medical report."""
    if not report_text or not question:
        return "I don't have enough information to answer that question."

    prompt = f"""You are a helpful and empathetic AI medical assistant talking to a patient.
Your goal is to answer their question based ONLY on the provided medical report context.
Always use simple, accessible language. Do not use overly clinical terms without explaining them.
Keep your answer clear, direct, and under 3-4 paragraphs.
If the answer is NOT in the report or cannot be reasonably inferred from it, clearly state that you don't know based on this specific document.

MEDICAL REPORT CONTEXT:
{report_text}

PATIENT QUESTION:
{question}

Please answer the patient in {language}:"""

    try:
        response_text = call_ai(prompt, max_tokens=500, temperature=0.2)
        return response_text.strip() if response_text else "I couldn't generate an answer at this time. Please try again."
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error answering question: {str(e)}")
        return "I'm experiencing technical difficulties and cannot answer right now."
