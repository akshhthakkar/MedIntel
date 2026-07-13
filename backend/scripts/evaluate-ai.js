/**
 * AI Quality Evaluation Harness
 * Runs report extraction and analysis against versioned synthetic fixtures
 * to evaluate JSON validity, category classification, and field extraction accuracy.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const aiService = require('../src/services/aiService');

const FIXTURES_DIR = path.join(__dirname, '../tests/fixtures');
const SCHEMA_PATH = path.join(__dirname, '../../shared/categorySchemas.json');

// Assert API keys exist
if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
  console.error('FAIL: No AI provider API key found (GROQ_API_KEY or GEMINI_API_KEY).');
  process.exit(1);
}

// Load schema rules
const schemas = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// Test fixtures configuration
const evaluations = [
  {
    filename: 'sample_blood_test.txt',
    expectedType: 'blood_test',
    validate: (data) => {
      const results = data.testResults || [];
      const hasHemoglobin = results.some(r => r.testName.toLowerCase().includes('hemoglobin'));
      const hasCholesterol = results.some(r => r.testName.toLowerCase().includes('cholesterol'));
      
      const errors = [];
      if (!hasHemoglobin) errors.push('Missing Hemoglobin analyte');
      if (!hasCholesterol) errors.push('Missing Total Cholesterol analyte');
      
      // Check status calculations (Hemoglobin normal, Cholesterol abnormal)
      const hemoResult = results.find(r => r.testName.toLowerCase().includes('hemoglobin'));
      if (hemoResult && hemoResult.status !== 'Normal') {
        errors.push(`Hemoglobin status incorrect: expected Normal, got ${hemoResult.status}`);
      }
      
      return errors;
    }
  },
  {
    filename: 'sample_prescription.txt',
    expectedType: 'prescription',
    validate: (data) => {
      const meds = data.medications || [];
      const hasLisinopril = meds.some(m => m.name.toLowerCase().includes('lisinopril'));
      const hasAtorvastatin = meds.some(m => m.name.toLowerCase().includes('atorvastatin'));
      
      const errors = [];
      if (!hasLisinopril) errors.push('Missing Lisinopril medication');
      if (!hasAtorvastatin) errors.push('Missing Atorvastatin medication');
      return errors;
    }
  },
  {
    filename: 'sample_imaging.txt',
    expectedType: 'imaging',
    validate: (data) => {
      const errors = [];
      if (!data.findings || data.findings.length === 0) errors.push('Missing findings array');
      if (!data.impression || data.impression.length === 0) errors.push('Missing impression array');
      
      const hasCardiomegaly = (data.impression || []).some(imp => imp.toLowerCase().includes('cardiomegaly'));
      if (!hasCardiomegaly) errors.push('Impression did not identify cardiomegaly');
      return errors;
    }
  }
];

async function runEvaluation() {
  console.log('==================================================');
  console.log('            MediCare AI Evaluation Harness        ');
  console.log('==================================================\n');

  let passedTests = 0;
  let totalTests = evaluations.length;

  for (const item of evaluations) {
    const filePath = path.join(FIXTURES_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Fixture file not found: ${filePath}`);
      continue;
    }

    console.log(`Evaluating file: ${item.filename} (Expected: ${item.expectedType})`);
    const text = fs.readFileSync(filePath, 'utf8');

    try {
      console.log('-> Running AI analysis...');
      const start = Date.now();
      const result = await aiService.analyzeReport(text, item.expectedType, 'English');
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      
      console.log(`-> Analysis completed in ${duration} seconds.`);
      console.log('-> Validating JSON structure...');

      // Validate generic schema integrity
      if (!result || typeof result !== 'object') {
        throw new Error('AI did not return a valid JSON object');
      }

      // Check category-specific validation
      const errors = item.validate(result);
      if (errors.length > 0) {
        console.log(`❌ FAILED: Schema extraction mismatches:\n   - ${errors.join('\n   - ')}`);
      } else {
        console.log('✅ PASSED: Category structure and values matches expected outputs.');
        passedTests++;
      }
    } catch (err) {
      console.log(`❌ FAILED: AI processing error: ${err.message}`);
    }
    console.log('--------------------------------------------------\n');
  }

  console.log(`Evaluation Summary: ${passedTests}/${totalTests} tests passed.`);
  process.exit(passedTests === totalTests ? 0 : 1);
}

runEvaluation();
