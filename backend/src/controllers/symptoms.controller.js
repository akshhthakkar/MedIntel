const SymptomLog = require('../models/SymptomLog');
const Medication = require('../models/Medication');
const aiService = require('../services/aiService');

exports.create = async (req, res) => {
  try {
    const logData = { ...req.body, user: req.user._id };

    // Get active medications for correlation based on start and end dates relative to symptom date
    let aiInsights = null;
    try {
      const logDate = logData.date ? new Date(logData.date) : new Date();
      const activeMeds = await Medication.find({
        user: req.user._id,
        isActive: true,
        startDate: { $lte: logDate },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: logDate } }
        ]
      }).select('name dosage sideEffects startDate endDate');

      if (activeMeds.length > 0 && (logData.symptoms?.length > 0 || logData.symptom)) {
        const symptomNames = logData.symptoms?.map(s => s.name) || [logData.symptom];
        const medNames = activeMeds.map(m => ({
          name: m.name,
          dosage: m.dosage,
          sideEffects: m.sideEffects,
          startDate: m.startDate,
          endDate: m.endDate
        }));
        aiInsights = await aiService.analyzeSymptomPatterns(symptomNames, medNames);
      }
    } catch (aiErr) {
      console.warn('AI symptom analysis failed:', aiErr.message);
    }

    if (aiInsights) {
      logData.aiInsights = aiInsights;
      logData.correlatedMedications = aiInsights.correlatedMedications || [];
    }

    const symptomLog = await SymptomLog.create(logData);
    res.status(201).json({ success: true, data: { symptomLog } });
  } catch (error) {
    console.error('Create symptom error:', error);
    res.status(500).json({ success: false, error: 'Failed to log symptom' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    const total = await SymptomLog.countDocuments(query);
    const symptoms = await SymptomLog.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: total,
      data: {
        symptoms,
        pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch symptoms' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const symptomLog = await SymptomLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!symptomLog) {
      return res.status(404).json({ success: false, error: 'Symptom log not found' });
    }
    res.json({ success: true, data: { symptomLog } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch symptom log' });
  }
};

exports.update = async (req, res) => {
  try {
    const symptomLog = await SymptomLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!symptomLog) {
      return res.status(404).json({ success: false, error: 'Symptom log not found' });
    }
    res.json({ success: true, data: { symptomLog } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update symptom log' });
  }
};

exports.delete = async (req, res) => {
  try {
    const symptomLog = await SymptomLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!symptomLog) {
      return res.status(404).json({ success: false, error: 'Symptom log not found' });
    }
    res.json({ success: true, message: 'Symptom log deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete symptom log' });
  }
};

exports.getPainTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await SymptomLog.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: 1 }).select('date painLevel');

    const trends = logs.map(log => ({
      date: log.date,
      painLevel: log.painLevel || 0
    }));

    res.json({ success: true, data: { trends } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pain trends' });
  }
};

exports.getMoodTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const moodMap = { 'excellent': 5, 'good': 4, 'fair': 3, 'poor': 2, 'very_poor': 1 };
    const logs = await SymptomLog.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: 1 }).select('date mood');

    const trends = logs.map(log => ({
      date: log.date,
      mood: log.mood,
      moodScore: moodMap[log.mood] || 3
    }));

    res.json({ success: true, data: { trends } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch mood trends' });
  }
};
