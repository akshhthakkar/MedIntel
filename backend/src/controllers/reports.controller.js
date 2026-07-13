const MedicalReport = require('../models/MedicalReport');
const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload.middleware');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const axios = require('axios');

const LANGUAGE_MAP = {
  'en': 'English', 'hi': 'Hindi', 'gu': 'Gujarati', 'mr': 'Marathi',
  'ta': 'Tamil', 'te': 'Telugu', 'es': 'Spanish', 'fr': 'French',
  'ar': 'Arabic', 'bn': 'Bengali', 'ur': 'Urdu', 'de': 'German', 'zh': 'Mandarin'
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Invalid file type. Only PDF, JPG, PNG, WEBP allowed.' });
    }

    const langCode = req.body.language || req.user.preferredLanguage || 'English';
    const language = LANGUAGE_MAP[langCode] || langCode;

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';

    // Upload to Cloudinary
    let cloudResult = { secure_url: '', public_id: '' };
    try {
      cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'medintel/reports',
        resource_type: 'auto'
      });
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed, continuing without cloud storage:', cloudErr.message);
    }

    // Create report with processing status
    const report = await MedicalReport.create({
      user: req.user._id,
      title: req.body.title || req.file.originalname,
      reportType: req.body.reportType || 'other',
      date: req.body.date || Date.now(),
      hospital: req.body.hospital ? JSON.parse(req.body.hospital) : undefined,
      doctor: req.body.doctor ? JSON.parse(req.body.doctor) : undefined,
      originalFile: {
        filename: req.file.originalname,
        path: cloudResult.secure_url,
        publicId: cloudResult.public_id,
        mimetype: req.file.mimetype,
        size: req.file.size
      },
      fileType,
      language,
      processingStatus: 'processing'
    });

    // Process in background (don't await)
    if (process.env.NODE_ENV !== 'test') {
      processReport(report, req.file.buffer, fileType, language, req.user).catch(err => {
        console.error('Background report processing failed:', err);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report uploaded. AI analysis in progress.',
      data: { reportId: report._id, processingStatus: 'processing' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
};

async function processReport(report, fileBuffer, fileType, language, user) {
  try {
    let extractedText = '';
    let aiResult = null;

    // Try Python AI service first
    const pythonUrl = process.env.PYTHON_AI_URL;
    if (pythonUrl) {
      try {
        const FormData = require('form-data');
        const formData = new FormData();
        // Include proper file extension so Python service can detect file type
        const ext = fileType === 'pdf' ? '.pdf' : '.png';
        formData.append('file', fileBuffer, { filename: `report${ext}`, contentType: report.originalFile.mimetype });
        formData.append('file_type', fileType);
        formData.append('language', language);

        const response = await axios.post(`${pythonUrl}/process/analyze`, formData, {
          headers: formData.getHeaders(),
          timeout: 120000
        });
        aiResult = response.data;
        extractedText = aiResult.rawText || '';
      } catch (pyErr) {
        console.warn('Python AI service unavailable, falling back to Node.js:', pyErr.message);
      }
    }

    // Fallback to Node.js AI service (with OCR text extraction)
    if (!aiResult) {
      try {
        let text = '';

        // Extract text from the uploaded file
        if (fileType === 'pdf') {
          try {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(fileBuffer);
            text = pdfData.text || '';
            console.log(`[OCR] PDF text extracted: ${text.length} chars`);
          } catch (pdfErr) {
            console.warn('[OCR] PDF parse failed:', pdfErr.message);
          }
        } else {
          // Image — use tesseract.js for OCR
          try {
            const Tesseract = require('tesseract.js');
            const { data: { text: ocrText } } = await Tesseract.recognize(fileBuffer, 'eng', {
              logger: () => {} // suppress progress logs
            });
            text = ocrText || '';
            console.log(`[OCR] Image text extracted: ${text.length} chars`);
          } catch (ocrErr) {
            console.warn('[OCR] Tesseract OCR failed:', ocrErr.message);
          }
        }

        if (!text || text.trim().length < 20) {
          console.warn('[OCR] Extracted text too short, AI may return fallback');
          text = text || `[File uploaded: ${report.originalFile?.filename || 'report'}, type: ${fileType}]`;
        }

        const [entityResult, analysisResult] = await Promise.all([
          aiService.extractMedicalEntities(text),
          aiService.analyzeReport(text, report.reportType, language)
        ]);
        aiResult = { ...entityResult, ...analysisResult, rawText: text };
        extractedText = text;
      } catch (fallbackErr) {
        console.warn('Node.js AI fallback also failed:', fallbackErr.message);
      }
    }

    const updateData = {
      extractedText: extractedText || aiResult?.rawText || '',
      rawText: extractedText || aiResult?.rawText || '',
      processingStatus: 'done'
    };

    if (aiResult) {
      updateData.extractedData = {
        testResults: (aiResult.testResults || aiResult.results || []).map(r => ({
          parameter: r.testName || r.parameter,
          testName: r.testName || r.parameter,
          value: r.value,
          unit: r.unit,
          normalRange: r.normalRange,
          status: r.status || 'Normal',
          explanation: r.explanation || '',
          symptoms: r.symptoms || [],
          remedies: r.remedies || [],
          confidence: r.confidence || 'medium'
        })),
        diagnoses: aiResult.diagnoses || [],
        medications: (aiResult.medications || []).map(m => ({
          name: m.name,
          genericName: m.genericName || '',
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration || '',
          instructions: m.instructions || ''
        })),
        observations: aiResult.observations || [],
        recommendations: aiResult.recommendations || [],
        
        // Category parameters
        bodyRegion: aiResult.bodyRegion || '',
        findings: aiResult.findings || [],
        impression: aiResult.impression || [],
        abnormalities: aiResult.abnormalities || [],
        
        heartRate: aiResult.heartRate || '',
        rhythm: aiResult.rhythm || '',
        prInterval: aiResult.prInterval || '',
        qrsDuration: aiResult.qrsDuration || '',
        qtInterval: aiResult.qtInterval || '',
        qtcInterval: aiResult.qtcInterval || '',
        
        procedures: aiResult.procedures || [],
        followUpInstructions: aiResult.followUpInstructions || [],
        carePlan: aiResult.carePlan || ''
      };
      updateData.aiAnalysis = {
        simplifiedExplanation: aiResult.simplifiedExplanation || aiResult.overallSummary || '',
        keyFindings: aiResult.keyFindings || [],
        concerningValues: aiResult.concerningValues || [],
        positiveIndicators: aiResult.positiveIndicators || [],
        suggestedPrecautions: aiResult.suggestedPrecautions || [],
        overallSummary: aiResult.overallSummary || '',
        urgencyLevel: aiResult.urgencyLevel || 'routine',
        language: language,
        generatedAt: new Date()
      };
      if (aiResult.reportType) {
        updateData.reportType = aiResult.reportType;
      }
    }

    await MedicalReport.findByIdAndUpdate(report._id, updateData);

    // Send notifications
    try {
      const abnormalResults = (updateData.extractedData?.testResults || []).filter(
        r => ['Abnormal', 'critical', 'high', 'low'].includes(r.status)
      );

      await notificationService.sendReportReadyNotification(
        user._id, 
        user.email,
        report._id,
        report.reportType || 'Medical Report',
        abnormalResults.length
      );

      for (const result of abnormalResults) {
        await notificationService.sendAbnormalResultNotification(
          user._id, 
          user.email,
          result.testName, 
          result.value, 
          report._id
        );
      }
    } catch (notifErr) {
      console.warn('Notification failed:', notifErr.message);
    }
  } catch (error) {
    console.error('Report processing error:', error);
    await MedicalReport.findByIdAndUpdate(report._id, { processingStatus: 'failed' });
  }
}

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { user: req.user._id, isArchived: { $ne: true } };
    if (req.query.reportType) query.reportType = req.query.reportType;

    const total = await MedicalReport.countDocuments(query);
    const reports = await MedicalReport.find(query)
      .select('-extractedText -rawText')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: total,
      data: {
        reports,
        pagination: {
          page, limit, total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, data: { report } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
};

exports.update = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const allowedUpdates = ['tags', 'isArchived', 'title'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        report[key] = req.body[key];
      }
    });
    await report.save();

    res.json({ success: true, data: { report } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
};

exports.delete = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Delete from Cloudinary
    if (report.originalFile?.publicId) {
      try {
        await deleteFromCloudinary(report.originalFile.publicId);
      } catch (cloudErr) {
        console.warn('Cloudinary delete failed:', cloudErr.message);
      }
    }

    // Unlink medications linked to this report to keep active reminders schedule
    const Medication = require('../models/Medication');
    await Medication.updateMany(
      { prescriptionReport: report._id },
      { $set: { prescriptionReport: null } }
    );

    await report.deleteOne();
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
};

function normalizeTestValue(value, unit, testName = '') {
  const numericVal = parseFloat(value);
  if (isNaN(numericVal)) return { value, unit, numericValue: null };

  const normTest = String(testName).toLowerCase();
  const normUnit = String(unit).toLowerCase().replace(/\s+/g, '');

  if (normTest.includes('glucose') || normTest.includes('sugar')) {
    if (normUnit === 'mmol/l') {
      return {
        value: (numericVal * 18.0182).toFixed(2),
        unit: 'mg/dL',
        numericValue: numericVal * 18.0182
      };
    }
  }

  if (normTest.includes('cholesterol') || normTest.includes('ldl') || normTest.includes('hdl')) {
    if (normUnit === 'mmol/l') {
      return {
        value: (numericVal * 38.67).toFixed(2),
        unit: 'mg/dL',
        numericValue: numericVal * 38.67
      };
    }
  }

  if (normTest.includes('triglyceride')) {
    if (normUnit === 'mmol/l') {
      return {
        value: (numericVal * 88.57).toFixed(2),
        unit: 'mg/dL',
        numericValue: numericVal * 88.57
      };
    }
  }

  if (normTest.includes('creatinine')) {
    if (normUnit === 'umol/l') {
      return {
        value: (numericVal / 88.4).toFixed(2),
        unit: 'mg/dL',
        numericValue: numericVal / 88.4
      };
    }
  }

  return { value, unit, numericValue: numericVal };
}

exports.compare = async (req, res) => {
  try {
    const [report1, report2] = await Promise.all([
      MedicalReport.findById(req.params.id1),
      MedicalReport.findById(req.params.id2)
    ]);

    if (!report1 || !report2) {
      return res.status(404).json({ success: false, error: 'One or both reports not found' });
    }
    if (report1.user.toString() !== req.user._id.toString() ||
        report2.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const tests1 = report1.extractedData?.testResults || [];
    const tests2 = report2.extractedData?.testResults || [];

    // Build differences array from shared test parameters
    const differences = [];
    const r1Map = new Map(tests1.map(r => [(r.parameter || r.testName || '').toLowerCase().trim(), r]));
    const matchedR2Keys = new Set();

    for (const t2 of tests2) {
      const key = (t2.parameter || t2.testName || '').toLowerCase().trim();
      const t1 = r1Map.get(key);
      if (t1) {
        matchedR2Keys.add(key);
        const testName = t1.parameter || t1.testName;
        const normT1 = normalizeTestValue(t1.value, t1.unit, testName);
        const normT2 = normalizeTestValue(t2.value, t2.unit, testName);
        const val1 = normT1.numericValue;
        const val2 = normT2.numericValue;
        const delta = (val1 !== null && val2 !== null) ? (val2 - val1).toFixed(2) : null;

        let changeType = 'no_change';
        if (t1.status !== t2.status) {
          const normalStatuses = ['normal'];
          const wasNormal = normalStatuses.includes((t1.status || '').toLowerCase());
          const isNormal = normalStatuses.includes((t2.status || '').toLowerCase());
          if (wasNormal && !isNormal) changeType = 'worsened';
          else if (!wasNormal && isNormal) changeType = 'improved';
          else changeType = 'changed';
        } else if (delta !== null && Math.abs(parseFloat(delta)) > 0) {
          changeType = 'changed';
        }

        differences.push({
          testName: testName,
          value1: normT1.value,
          value2: normT2.value,
          unit: normT1.unit || normT2.unit || '',
          range: t1.normalRange || t2.normalRange || '',
          status1: t1.status || 'Unknown',
          status2: t2.status || 'Unknown',
          delta,
          changeType
        });
      }
    }

    // Tests only in report1 (not matched)
    const onlyInReport1 = tests1.filter(t => {
      const key = (t.parameter || t.testName || '').toLowerCase().trim();
      return !matchedR2Keys.has(key) && ![...tests2].some(t2 =>
        (t2.parameter || t2.testName || '').toLowerCase().trim() === key
      );
    });

    // Tests only in report2 (not matched)
    const onlyInReport2 = tests2.filter(t2 => {
      const key = (t2.parameter || t2.testName || '').toLowerCase().trim();
      return !r1Map.has(key);
    });

    res.json({
      success: true,
      data: {
        report1: { id: report1._id, title: report1.title, date: report1.date, reportType: report1.reportType, hospital: report1.hospital },
        report2: { id: report2._id, title: report2.title, date: report2.date, reportType: report2.reportType, hospital: report2.hospital },
        differences,
        onlyInReport1,
        onlyInReport2
      }
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ success: false, error: 'Failed to compare reports' });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ user: req.user._id })
      .select('date extractedData.testResults reportType')
      .sort({ date: 1 });

    const trends = {};
    for (const report of reports) {
      for (const test of (report.extractedData?.testResults || [])) {
        const name = test.testName || test.parameter;
        if (!name) continue;
        const norm = normalizeTestValue(test.value, test.unit, name);
        if (!trends[name]) trends[name] = [];
        trends[name].push({
          date: report.date,
          value: norm.value,
          numericValue: norm.numericValue,
          unit: norm.unit,
          status: test.status,
          normalRange: test.normalRange,
          reportId: report._id
        });
      }
    }

    res.json({ success: true, data: { trends } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
};

exports.retranslate = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const langCode = req.body.language || 'English';
    const language = LANGUAGE_MAP[langCode] || langCode;

    const text = report.extractedText || report.rawText;
    if (!text) {
      return res.status(400).json({ success: false, error: 'No text to translate' });
    }

    const analysisResult = await aiService.analyzeReport(text, report.reportType, language);

    const updatedResults = (analysisResult.testResults || analysisResult.results || []).map(r => ({
      parameter: r.testName || r.parameter,
      testName: r.testName || r.parameter,
      value: r.value,
      unit: r.unit,
      normalRange: r.normalRange,
      status: r.status || 'Normal',
      explanation: r.explanation || '',
      symptoms: r.symptoms || [],
      remedies: r.remedies || []
    }));

    report.extractedData.testResults = updatedResults;
    report.aiAnalysis = {
      ...report.aiAnalysis,
      simplifiedExplanation: analysisResult.simplifiedExplanation || analysisResult.overallSummary || '',
      keyFindings: analysisResult.keyFindings || [],
      concerningValues: analysisResult.concerningValues || [],
      positiveIndicators: analysisResult.positiveIndicators || [],
      suggestedPrecautions: analysisResult.suggestedPrecautions || [],
      overallSummary: analysisResult.overallSummary || '',
      urgencyLevel: analysisResult.urgencyLevel || 'routine',
      language: language,
      generatedAt: new Date()
    };
    report.language = language;
    await report.save();

    res.json({ success: true, data: { report } });
  } catch (error) {
    console.error('Retranslation error:', error);
    res.status(500).json({ success: false, error: 'Translation failed' });
  }
};
