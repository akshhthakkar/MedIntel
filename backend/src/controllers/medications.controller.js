const Medication = require('../models/Medication');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const schedulerService = require('../services/schedulerService');

exports.create = async (req, res) => {
  try {
    const { name, dosage, unit, frequency, timing, reminderTimes, startDate, endDate, prescribedBy, notes } = req.body;

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, error: 'Medication name required (min 2 chars)' });
    }
    if (!dosage) {
      return res.status(400).json({ success: false, error: 'Dosage is required' });
    }
    const validFrequencies = ['once_daily', 'twice_daily', 'thrice_daily', 'four_times_daily',
      'every_6_hours', 'every_8_hours', 'every_12_hours', 'as_needed', 'weekly', 'custom'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ success: false, error: 'Invalid frequency' });
    }

    // Check for duplicate active medication
    const existing = await Medication.findOne({ user: req.user._id, name: { $regex: new RegExp(`^${name}$`, 'i') }, isActive: true });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Medication already active' });
    }

    // Check drug interactions
    let interactions = [];
    try {
      const activeMeds = await Medication.find({ user: req.user._id, isActive: true }).select('name dosage');
      if (activeMeds.length > 0) {
        const allMedications = [
          ...activeMeds.map(m => ({ name: m.name, dosage: m.dosage })),
          { name, dosage }
        ];
        interactions = await aiService.checkDrugInteractions(allMedications);
      }
    } catch (interErr) {
      console.warn('Interaction check failed:', interErr.message);
    }

    // Generate schedule based on frequency
    const scheduleMap = {
      'once_daily': ['08:00'],
      'twice_daily': ['08:00', '20:00'],
      'thrice_daily': ['08:00', '14:00', '20:00'],
      'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
      'every_6_hours': ['06:00', '12:00', '18:00', '00:00'],
      'every_8_hours': ['08:00', '16:00', '00:00'],
      'every_12_hours': ['08:00', '20:00'],
    };
    const generatedTimes = reminderTimes?.length ? reminderTimes : (scheduleMap[frequency] || []);

    const medication = await Medication.create({
      user: req.user._id,
      name, dosage, unit, frequency, timing,
      reminderTimes: generatedTimes,
      startDate: startDate || Date.now(),
      endDate,
      prescribedBy: prescribedBy ? (typeof prescribedBy === 'string' ? { name: prescribedBy } : prescribedBy) : undefined,
      notes,
      interactions,
      reminderSettings: {
        enabled: true,
        reminderTimes: generatedTimes,
        notifyBefore: 15
      }
    });

    // Schedule reminders
    try {
      schedulerService.scheduleReminder(medication);
    } catch (schedErr) {
      console.warn('Scheduler failed:', schedErr.message);
    }

    // Send notification
    try {
      await notificationService.sendMedicationReminder(
        req.user._id, 
        req.user.email,
        name,
        `${dosage} ${unit || 'mg'}`.trim(),
        '',
        generatedTimes[0] || '08:00'
      );
    } catch (notifErr) {
      console.warn('Medication notification failed:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      data: { medication },
      interactions: interactions.length > 0 ? interactions : undefined,
      hasWarnings: interactions.some(i => i.severity === 'severe')
    });
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ success: false, error: 'Failed to add medication' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.active === 'true') query.isActive = true;

    const total = await Medication.countDocuments(query);
    const medications = await Medication.find(query)
      .sort({ isActive: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: total,
      data: {
        medications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch medications' });
  }
};

exports.getActive = async (req, res) => {
  try {
    const medications = await Medication.find({ user: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: medications.length, data: { medications } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active medications' });
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const medications = await Medication.find({ user: req.user._id, isActive: true });
    const today = new Date().toDateString();

    const schedule = medications.flatMap(med => {
      return (med.reminderTimes || []).map(time => {
        const takenToday = med.adherenceLogs.some(log => {
          const logDate = new Date(log.date || log.scheduledTime);
          if (logDate.toDateString() !== today || !log.taken) return false;
          
          const logSched = log.scheduledTime ? new Date(log.scheduledTime) : logDate;
          const logHours = String(logSched.getHours()).padStart(2, '0');
          const logMins = String(logSched.getMinutes()).padStart(2, '0');
          const logTimeStr = `${logHours}:${logMins}`;
          
          return logTimeStr === time;
        });

        return {
          medicationId: med._id,
          medicationName: med.name,
          dosage: `${med.dosage} ${med.unit || ''}`.trim(),
          time,
          taken: takenToday,
          takenAt: takenToday ? med.adherenceLogs.find(log => {
            const logDate = new Date(log.date || log.scheduledTime);
            if (logDate.toDateString() !== today || !log.taken) return false;
            
            const logSched = log.scheduledTime ? new Date(log.scheduledTime) : logDate;
            const logHours = String(logSched.getHours()).padStart(2, '0');
            const logMins = String(logSched.getMinutes()).padStart(2, '0');
            const logTimeStr = `${logHours}:${logMins}`;
            
            return logTimeStr === time;
          })?.takenAt : null
        };
      });
    }).sort((a, b) => a.time.localeCompare(b.time));

    res.json({ success: true, data: { schedule } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch schedule' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const medication = await Medication.findOne({ _id: req.params.id, user: req.user._id });
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }
    res.json({ success: true, data: { medication } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch medication' });
  }
};

exports.update = async (req, res) => {
  try {
    const medication = await Medication.findOne({ _id: req.params.id, user: req.user._id });
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    const allowedUpdates = ['name', 'dosage', 'unit', 'frequency', 'timing', 'reminderTimes', 'endDate', 'notes', 'isActive', 'reminderSettings'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        medication[key] = req.body[key];
      }
    });
    await medication.save();

    // Reschedule if reminder times changed
    if (req.body.reminderTimes) {
      schedulerService.cancelJob(medication._id);
      if (medication.isActive) {
        schedulerService.scheduleReminder(medication);
      }
    }

    res.json({ success: true, data: { medication } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update medication' });
  }
};

exports.logAdherence = async (req, res) => {
  try {
    const medication = await Medication.findOne({ _id: req.params.id, user: req.user._id });
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    let schedDate = new Date();
    if (typeof req.body.scheduledTime === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(req.body.scheduledTime)) {
      const [hrs, mins] = req.body.scheduledTime.split(':').map(Number);
      schedDate.setHours(hrs, mins, 0, 0);
    } else if (req.body.scheduledTime) {
      schedDate = new Date(req.body.scheduledTime);
    }

    const logEntry = {
      scheduledTime: schedDate,
      takenTime: req.body.status === 'taken' ? new Date() : undefined,
      date: new Date(),
      taken: req.body.status === 'taken',
      takenAt: req.body.status === 'taken' ? new Date() : undefined,
      status: req.body.status || 'taken',
      notes: req.body.notes
    };

    medication.adherenceLogs.push(logEntry);
    await medication.save();

    res.json({ success: true, data: { medication } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log adherence' });
  }
};

exports.checkInteractions = async (req, res) => {
  try {
    const medications = await Medication.find({ user: req.user._id, isActive: true }).select('name dosage');

    if (medications.length < 2) {
      return res.json({ success: true, data: { interactions: [], message: 'Need at least 2 medications to check interactions.' } });
    }

    const result = await aiService.checkDrugInteractions(
      medications.map(m => ({ name: m.name, dosage: m.dosage }))
    );
    res.json({ success: true, data: { interactions: result, hasWarnings: result.some(i => i.severity === 'severe') } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check interactions' });
  }
};

exports.delete = async (req, res) => {
  try {
    const medication = await Medication.findOne({ _id: req.params.id, user: req.user._id });
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    medication.isActive = false;
    await medication.save();

    // Cancel scheduled reminders
    schedulerService.cancelJob(medication._id);

    res.json({ success: true, message: 'Medication deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete medication' });
  }
};
