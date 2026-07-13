const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const MedicalReport = require('../models/MedicalReport');
const Medication = require('../models/Medication');
const SymptomLog = require('../models/SymptomLog');

// GET /api/timeline — Full health timeline
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const dateQuery = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const [reports, medications, symptoms] = await Promise.all([
      MedicalReport.find({ user: req.user._id, ...dateQuery }).sort({ date: -1 }).select('title reportType date aiAnalysis.overallSummary processingStatus extractedData.testResults'),
      Medication.find({ user: req.user._id }).sort({ startDate: -1 }).select('name dosage unit frequency startDate isActive'),
      SymptomLog.find({ user: req.user._id, ...dateQuery }).sort({ date: -1 }).select('symptom symptoms painLevel mood date')
    ]);

    const events = [
      ...reports.map(r => ({
        type: 'report', id: r._id, date: r.date,
        title: r.title, subtype: r.reportType,
        summary: r.aiAnalysis?.overallSummary || '',
        status: r.processingStatus,
        abnormalCount: (r.extractedData?.testResults || []).filter(t => ['Abnormal', 'critical', 'high', 'low'].includes(t.status)).length
      })),
      ...medications.map(m => ({
        type: 'medication', id: m._id, date: m.startDate,
        title: `Started ${m.name}`, subtype: 'medication',
        summary: `${m.dosage} ${m.unit || ''} - ${m.frequency}`.trim(),
        isActive: m.isActive
      })),
      ...symptoms.map(s => ({
        type: 'symptom', id: s._id, date: s.date,
        title: s.symptom || (s.symptoms?.[0]?.name) || 'Symptom Log',
        subtype: 'symptom',
        summary: `Pain: ${s.painLevel || 'N/A'}, Mood: ${s.mood || 'N/A'}`,
        painLevel: s.painLevel, mood: s.mood
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: { events, counts: { reports: reports.length, medications: medications.length, symptoms: symptoms.length } } });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch timeline' });
  }
});

// GET /api/timeline/summary — Doctor-ready summary (AI-generated)
router.get('/summary', auth, async (req, res) => {
  try {
    const { callAI } = require('../services/aiService');
    const User = require('../models/User');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [user, reports, medications, symptoms] = await Promise.all([
      User.findById(req.user._id).select('allergies chronicConditions healthConditions name gender dateOfBirth'),
      MedicalReport.find({ user: req.user._id, date: { $gte: thirtyDaysAgo } })
        .sort({ date: -1 }).limit(10)
        .select('title reportType date aiAnalysis.keyFindings aiAnalysis.concerningValues aiAnalysis.urgencyLevel extractedData'),
      Medication.find({ user: req.user._id, isActive: true })
        .select('name dosage unit frequency timing prescribedBy startDate'),
      SymptomLog.find({ user: req.user._id, date: { $gte: thirtyDaysAgo } })
        .sort({ date: -1 }).limit(10)
        .select('symptoms painLevel mood energyLevel date loggedAt vitalSigns')
    ]);

    if (reports.length === 0 && medications.length === 0 && symptoms.length === 0) {
      return res.json({
        success: true,
        data: { summary: 'No health data found. Upload a report, add medications, or log symptoms to generate a doctor summary.' }
      });
    }

    let medicalHistoryContext = 'None on file';
    if (user) {
      const historyParts = [];
      if (user.allergies && user.allergies.length > 0) {
        historyParts.push(`Allergies: ${user.allergies.join(', ')}`);
      }
      if (user.chronicConditions && user.chronicConditions.length > 0) {
        historyParts.push(`Chronic Conditions: ${user.chronicConditions.join(', ')}`);
      }
      if (user.healthConditions && user.healthConditions.length > 0) {
        historyParts.push(`Health Conditions: ${user.healthConditions.join(', ')}`);
      }
      if (historyParts.length > 0) {
        medicalHistoryContext = historyParts.join(' | ');
      }
    }
    const patientInfo = user ? `Patient: ${user.name || 'N/A'} | Gender: ${user.gender || 'N/A'}${user.dateOfBirth ? ` | DOB: ${new Date(user.dateOfBirth).toLocaleDateString()}` : ''}` : '';

    const reportsContext = reports.map((r, index) => {
      let reportStr = `Report #${index + 1}: ${r.title || r.reportType} (${new Date(r.date).toLocaleDateString()})\n` +
        `Type: ${r.reportType}\n` +
        `Key findings: ${(r.aiAnalysis?.keyFindings || []).join(', ') || 'None'}\n` +
        `Concerning values: ${(r.aiAnalysis?.concerningValues || []).join(', ') || 'None'}\n` +
        `Urgency: ${r.aiAnalysis?.urgencyLevel || 'routine'}`;

      if (r.extractedData?.testResults && r.extractedData.testResults.length > 0) {
        const resultsList = r.extractedData.testResults.map(t => 
          `- ${t.parameter || t.testName || 'Result'}: ${t.value} ${t.unit || ''} (Range: ${t.normalRange || 'N/A'}, Status: ${t.status})`
        ).join('\n');
        reportStr += `\nTest Results:\n${resultsList}`;
      }

      if (r.extractedData?.bodyRegion) reportStr += `\nBody Region: ${r.extractedData.bodyRegion}`;
      if (r.extractedData?.findings && r.extractedData.findings.length > 0) {
        reportStr += `\nFindings: ${r.extractedData.findings.join('; ')}`;
      }
      if (r.extractedData?.impression && r.extractedData.impression.length > 0) {
        reportStr += `\nImpression: ${r.extractedData.impression.join('; ')}`;
      }
      if (r.extractedData?.abnormalities && r.extractedData.abnormalities.length > 0) {
        reportStr += `\nAbnormalities: ${r.extractedData.abnormalities.join('; ')}`;
      }

      if (r.extractedData?.procedures && r.extractedData.procedures.length > 0) {
        reportStr += `\nProcedures: ${r.extractedData.procedures.join(', ')}`;
      }
      if (r.extractedData?.followUpInstructions && r.extractedData.followUpInstructions.length > 0) {
        reportStr += `\nFollow-up Instructions: ${r.extractedData.followUpInstructions.join(', ')}`;
      }
      if (r.extractedData?.carePlan) {
        reportStr += `\nCare Plan: ${r.extractedData.carePlan}`;
      }

      return reportStr;
    }).join('\n\n');

    const medicationsContext = medications.map(m =>
      `- ${m.name} ${m.dosage}${m.unit || ''} — ${m.frequency} — ${m.timing || 'anytime'}`
      + (m.prescribedBy?.name ? ` (prescribed by Dr. ${m.prescribedBy.name})` : '')
    ).join('\n');

    const symptomsContext = symptoms.map(s => {
      const dateStr = new Date(s.date || s.loggedAt || s.createdAt).toLocaleDateString();
      const symList = (s.symptoms || []).map(sym => `${sym.name} (severity: ${sym.severity}/10${sym.duration ? `, duration: ${sym.duration}` : ''})`).join(', ');
      
      let vitalStr = '';
      if (s.vitalSigns) {
        const v = s.vitalSigns;
        const bpStr = v.bloodPressure ? `BP: ${v.bloodPressure.systolic || 'N/A'}/${v.bloodPressure.diastolic || 'N/A'}` : '';
        const tempStr = v.temperature ? `Temp: ${v.temperature}°C` : '';
        const hrStr = v.heartRate ? `HR: ${v.heartRate} bpm` : '';
        const o2Str = v.oxygenSaturation ? `O2: ${v.oxygenSaturation}%` : '';
        vitalStr = [bpStr, tempStr, hrStr, o2Str].filter(Boolean).join(', ');
      }

      return `${dateStr}: ${symList || 'None logged'} | Pain: ${s.painLevel || 'N/A'}/10 | Mood: ${s.mood || 'N/A'}` + (vitalStr ? ` | Vitals: ${vitalStr}` : '');
    }).join('\n');

    const followUpQuestions = req.query.questions || req.query.followUp || '';

    const prompt = `System Prompt: Doctor Visit Summary Generator

You are an AI clinical documentation assistant whose purpose is to prepare a concise, medically accurate summary for a healthcare professional.

Your output is **not** a diagnosis.

Your role is to organize laboratory findings, patient-reported information, and historical reports into a structured clinical summary that helps a physician quickly understand the patient's current status.

---

## General Rules

### 1. Prioritize the latest report
If multiple laboratory reports are available:
* Treat the newest report (based on the report date) as the current clinical status.
* Use older reports only for trend comparison.
* Never merge findings from multiple reports into one report.
* Clearly distinguish "Previous" vs "Current" findings.

### 2. Detect trends
When serial laboratory reports exist, highlight meaningful changes.
Example:
* Hemoglobin decreased from 14.8 g/dL to 9.4 g/dL
* WBC increased from 7.2 to 13.8 ×10³/µL
* Platelet count increased from 265 to 485 ×10³/µL
Only report clinically meaningful changes.

### 3. Group abnormalities by body system
Instead of listing every abnormal value separately, organize findings.
Examples:
**Hematology**
* Low hemoglobin
* Low hematocrit
* Low RBC count
Possible pattern: Microcytic anemia.

**Infection / Inflammation**
* Elevated WBC
* Neutrophilia
Possible pattern: Acute inflammatory or infectious process.

**Kidney Function**
* Elevated creatinine
* Elevated BUN
* Reduced eGFR
Possible pattern: Mild reduction in kidney function.

**Liver Function**
* Elevated AST
* Elevated ALT
Possible pattern: Mild liver enzyme elevation.

### 4. Never diagnose
Never state: "Patient has diabetes", "Patient has kidney disease", "Patient has liver failure", "Patient has iron deficiency anemia".
Instead use: "Findings may be consistent with...", "Pattern may suggest...", "Findings warrant further evaluation", "Clinical correlation is recommended".

### 5. Mention severity
Describe abnormalities as: Mild, Moderate, Marked, Severe. Avoid using only "abnormal".
Example: Mild anemia, Moderate leukocytosis, Mild thrombocytosis.

### 6. Include relevant symptoms
Only include symptoms reported by the patient or recorded previously. Never invent symptoms. If none exist: "No symptoms have been documented."

### 7. Current medications
If medications exist, summarize them. Otherwise: "No current medications reported."

### 8. Prioritize important abnormalities
Discuss abnormalities in clinical importance rather than report order.
Example priority:
1. Critical abnormalities
2. Significant organ dysfunction
3. Major hematologic abnormalities
4. Electrolyte disturbances
5. Mild isolated abnormalities

### 9. Create a detailed physician handoff
The final summary should resemble documentation used during a consultation. Make sure the Clinical Summary is highly detailed, explaining the patient status and clinical significance in a deep, professional manner.

### 10. Items requiring physician review
List only clinically important findings.
Example:
* Hemoglobin 9.4 g/dL
* WBC 13.8 ×10³/µL
* Platelets 485 ×10³/µL
* Progressive decline in hemoglobin compared with previous CBC
* Consider correlation with iron studies if clinically indicated
Avoid listing every laboratory value.

### 11. Maintain uncertainty
Use cautious medical language.
Preferred phrases: may indicate, may suggest, compatible with, warrants evaluation, clinical correlation recommended, consider further investigation.
Avoid: confirms, proves, definitely has, diagnosed with.

### 12. Response Format Requirement
You must output a single JSON object containing EXACTLY these keys:
- "Reason for Visit": A detailed 1-2 sentence description of why the patient is presenting.
- "Clinical Summary": A thorough, detailed paragraph explaining the patient's health status, grouping findings by body system and explaining their clinical significance.
- "Laboratory Trends": A detailed analysis of parameter changes over time if multiple reports exist (otherwise "No previous laboratory data available for comparison.").
- "Current Medications": A summary of current medications (otherwise "No current medications reported.").
- "Reported Symptoms": A summary of symptoms and vitals (otherwise "No symptoms have been documented.").
- "Key Issues for Physician Review": An array of 3-8 strings containing the most critical findings requiring action.

Never add markdown headers, backticks, or any conversational text around the JSON. Your entire output must be valid JSON matching the format above.

---

PATIENT DATA TO PROCESS:

${patientInfo ? `${patientInfo}\n` : ''}MEDICAL HISTORY:
${medicalHistoryContext}

RECENT MEDICAL REPORTS:
${reportsContext || 'None on file'}

CURRENT MEDICATIONS:
${medicationsContext || 'No current medications reported.'}

RECENT SYMPTOMS:
${symptomsContext || 'No symptoms have been documented.'}

FOLLOW-UP QUESTIONS ASKED BY THE PATIENT:
${followUpQuestions || 'None reported'}`;

    const summaryText = await callAI(prompt, { maxTokens: 1000, temperature: 0.2 });

    let summaryObj = null;
    let formattedText = '';

    try {
      let jsonText = summaryText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }
      
      const parsed = JSON.parse(jsonText);
      summaryObj = {
        reasonForVisit: parsed["Reason for Visit"] || parsed.reasonForVisit || '',
        clinicalSummary: parsed["Clinical Summary"] || parsed.clinicalSummary || '',
        laboratoryTrends: parsed["Laboratory Trends"] || parsed.laboratoryTrends || '',
        currentMedications: parsed["Current Medications"] || parsed.currentMedications || '',
        reportedSymptoms: parsed["Reported Symptoms"] || parsed.reportedSymptoms || '',
        keyIssues: parsed["Key Issues for Physician Review"] || parsed.keyIssues || []
      };

      // Format as beautiful Markdown
      formattedText = `## Reason for Visit\n${summaryObj.reasonForVisit}\n\n` +
        `## Clinical Summary\n${summaryObj.clinicalSummary}\n\n` +
        `## Laboratory Trends\n${summaryObj.laboratoryTrends}\n\n` +
        `## Current Medications\n${summaryObj.currentMedications}\n\n` +
        `## Reported Symptoms\n${summaryObj.reportedSymptoms}\n\n` +
        `## Key Issues for Physician Review\n` +
        (Array.isArray(summaryObj.keyIssues)
          ? summaryObj.keyIssues.map(issue => `* ${issue}`).join('\n')
          : summaryObj.keyIssues);

    } catch (e) {
      console.warn('[timeline/summary] Failed to parse JSON, falling back to raw text extraction:', e.message);
      formattedText = summaryText;

      // Extract parts using regular expressions
      const reasonMatch = summaryText.match(/## Reason for Visit\s*\n+([^#]+)/i) || summaryText.match(/"Reason for Visit":\s*"([^"]+)"/i);
      const summaryMatch = summaryText.match(/## Clinical Summary\s*\n+([^#]+)/i) || summaryText.match(/"Clinical Summary":\s*"([^"]+)"/i);
      const trendsMatch = summaryText.match(/## Laboratory Trends\s*\n+([^#]+)/i) || summaryText.match(/"Laboratory Trends":\s*"([^"]+)"/i);
      const medsMatch = summaryText.match(/## Current Medications\s*\n+([^#]+)/i) || summaryText.match(/"Current Medications":\s*"([^"]+)"/i);
      const symptomsMatch = summaryText.match(/## Reported Symptoms\s*\n+([^#]+)/i) || summaryText.match(/"Reported Symptoms":\s*"([^"]+)"/i);

      summaryObj = {
        reasonForVisit: reasonMatch ? reasonMatch[1].trim() : '',
        clinicalSummary: summaryMatch ? summaryMatch[1].trim() : '',
        laboratoryTrends: trendsMatch ? trendsMatch[1].trim() : 'No previous laboratory data available for comparison.',
        currentMedications: medsMatch ? medsMatch[1].trim() : 'No current medications reported.',
        reportedSymptoms: symptomsMatch ? symptomsMatch[1].trim() : 'No symptoms have been documented.',
        keyIssues: []
      };

      const keyIssuesMatch = summaryText.match(/## Key Issues for Physician Review\s*\n+([^#]+)/i);
      if (keyIssuesMatch) {
        const issuesText = keyIssuesMatch[1].trim();
        summaryObj.keyIssues = issuesText
          .split('\n')
          .map(line => line.replace(/^[\s*\-•*]+/, '').trim())
          .filter(Boolean);
      } else {
        const listMatch = summaryText.match(/"Key Issues for Physician Review":\s*\[([^\]]+)\]/i);
        if (listMatch) {
          summaryObj.keyIssues = listMatch[1]
            .split(',')
            .map(item => item.replace(/"/g, '').trim())
            .filter(Boolean);
        }
      }
    }

    return res.json({ success: true, data: { summary: formattedText.trim(), summaryObj } });
  } catch (error) {
    console.error('[timeline/summary] Error:', error.message);
    res.status(500).json({ success: false, error: 'Could not generate summary. Please try again.' });
  }
});

// GET /api/timeline/dashboard — Structured stats for DashboardPage
router.get('/dashboard', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentReports, activeMedications, recentSymptoms] = await Promise.all([
      MedicalReport.find({ user: req.user._id, date: { $gte: thirtyDaysAgo } })
        .sort({ date: -1 }).limit(5)
        .select('title reportType date'),
      Medication.find({ user: req.user._id, isActive: true })
        .select('name dosage frequency'),
      SymptomLog.find({ user: req.user._id, date: { $gte: thirtyDaysAgo } })
    ]);

    // Calculate symptom summary
    let totalPain = 0;
    let painLogsCount = 0;
    const symptomCounts = {};

    recentSymptoms.forEach(log => {
      if (typeof log.painLevel === 'number') {
        totalPain += log.painLevel;
        painLogsCount++;
      }
      if (log.symptoms && Array.isArray(log.symptoms)) {
        log.symptoms.forEach(sym => {
          if (sym.name) {
            symptomCounts[sym.name] = (symptomCounts[sym.name] || 0) + 1;
          }
        });
      } else if (log.symptom) { // fallback
        symptomCounts[log.symptom] = (symptomCounts[log.symptom] || 0) + 1;
      }
    });

    const averagePain = painLogsCount > 0 ? (totalPain / painLogsCount).toFixed(1) : 'N/A';
    
    // Sort symptoms by frequency
    const topSymptoms = Object.entries(symptomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5

    res.json({
      success: true,
      data: {
        summary: {
          recentReports,
          activeMedications,
          symptomSummary: {
            totalLogs: recentSymptoms.length,
            averagePain,
            topSymptoms
          }
        }
      }
    });
  } catch (error) {
    console.error('[timeline/dashboard] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
