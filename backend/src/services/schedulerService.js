const cron = require('node-cron');
const Medication = require('../models/Medication');
const User = require('../models/User');
const MedicalReport = require('../models/MedicalReport');
const SymptomLog = require('../models/SymptomLog');
const notificationService = require('./notificationService');

const activeJobs = new Map();
const checkInJobs = new Map();

function scheduleReminder(medication) {
  if (!medication.reminderTimes || medication.reminderTimes.length === 0) return;

  medication.reminderTimes.forEach((time, index) => {
    const [hour, minute] = time.split(':');
    if (!hour || !minute) return;

    const cronExpr = `${minute} ${hour} * * *`;
    const jobKey = `${medication._id}-${index}`;

    // Cancel existing job if any
    if (activeJobs.has(jobKey)) {
      activeJobs.get(jobKey).stop();
    }

    try {
      const job = cron.schedule(cronExpr, async () => {
        try {
          const user = await User.findById(medication.user).select('email');
          await notificationService.sendMedicationReminder(
            medication.user,
            user ? user.email : null,
            medication.name,
            `${medication.dosage} ${medication.unit || ''}`.trim(),
            '',
            time
          );

          // Log this as a scheduled dose
          const scheduledTime = new Date();
          await Medication.findByIdAndUpdate(medication._id, {
            $push: {
              adherenceLogs: {
                scheduledTime,
                status: 'pending'
              }
            }
          });

          // Check if taken 1 hour later
          setTimeout(async () => {
            try {
              const med = await Medication.findById(medication._id);
              if (!med || !med.isActive) return;

              const recentLog = med.adherenceLogs
                .filter(l => l.status === 'pending')
                .sort((a, b) => b.scheduledTime - a.scheduledTime)[0];

              if (recentLog) {
                await Medication.findByIdAndUpdate(medication._id, {
                  $set: { 'adherenceLogs.$[el].status': 'missed' }
                }, {
                  arrayFilters: [{ 'el._id': recentLog._id }]
                });

                await notificationService.sendMedicationMissed(
                  medication.user,
                  user ? user.email : null,
                  medication.name
                );
              }
            } catch (err) {
              console.warn('Missed medication check error:', err.message);
            }
          }, 60 * 60 * 1000);
        } catch (err) {
          console.warn('Medication reminder trigger error:', err.message);
        }
      });

      activeJobs.set(jobKey, job);
    } catch (err) {
      console.warn(`Failed to schedule cron for ${jobKey}:`, err.message);
    }
  });
}

function cancelJob(medicationId) {
  for (const [key, job] of activeJobs) {
    if (key.startsWith(medicationId.toString())) {
      job.stop();
      activeJobs.delete(key);
    }
  }
}

function scheduleWeeklySummary() {
  cron.schedule('0 19 * * 0', async () => {
    console.log('Running weekly health summary job...');
    try {
      const users = await User.find({
        'notificationPreferences.email': true
      }).select('_id email name');

      const weekEnd   = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekEnd.getDate() - 7);

      for (const user of users) {
        try {
          const [reports, symptoms, medications, adherenceData] =
            await Promise.all([
              MedicalReport.find({
                user: user._id,
                date: { $gte: weekStart, $lte: weekEnd }
              }),
              SymptomLog.find({
                user: user._id,
                loggedAt: { $gte: weekStart, $lte: weekEnd }
              }),
              Medication.find({
                user: user._id,
                isActive: true
              }),
              Medication.find({
                user: user._id,
                'adherenceLog.scheduledTime': {
                  $gte: weekStart,
                  $lte: weekEnd
                }
              })
            ]);

          let taken = 0, total = 0;
          adherenceData.forEach(med => {
            med.adherenceLog.forEach(log => {
              const logDate = new Date(log.scheduledTime);
              if (logDate >= weekStart && logDate <= weekEnd) {
                total++;
                if (log.status === 'taken') taken++;
              }
            });
          });

          let topConcern = null;
          for (const report of reports) {
            const abnormal = report.extractedData?.testResults
              ?.find(t => t.status === 'Abnormal');
            if (abnormal) {
              topConcern = abnormal.parameter || abnormal.testName;
              break;
            }
          }

          await notificationService.sendWeeklyHealthSummary(
            user._id, 
            user.email, 
            user.name,
            {
              reportsThisWeek:   reports.length,
              abnormalCount:     reports.reduce((sum, r) =>
                sum + (r.extractedData?.testResults?.filter(
                  t => t.status === 'Abnormal').length || 0), 0),
              medicationsActive: medications.length,
              adherenceRate:     total > 0
                ? Math.round((taken / total) * 100) : 0,
              symptomsLogged:    symptoms.length,
              topConcern,
              weekStartDate:     weekStart.toLocaleDateString('en-IN'),
              weekEndDate:       weekEnd.toLocaleDateString('en-IN')
            }
          );

        } catch (userErr) {
          console.error(`Weekly summary failed for ${user._id}:`, userErr.message);
        }
      }
      console.log(`Weekly summaries sent to ${users.length} users`);
    } catch (err) {
      console.error('Weekly summary cron failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
}

function scheduleUserCheckIn(user) {
  const userId = user._id.toString();

  // Cancel existing job for this user if any
  if (checkInJobs.has(userId)) {
    checkInJobs.get(userId).stop();
    checkInJobs.delete(userId);
  }

  // Only schedule if user has enabled daily check-in
  if (!user.notificationPreferences?.dailyCheckIn) {
    return;
  }

  const timeStr = user.notificationPreferences?.checkInTime || '09:00';

  // Validate HH:mm format
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    console.warn(`[Scheduler] Invalid checkInTime for user ${userId}: ${timeStr}`);
    return;
  }

  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`[Scheduler] Invalid time values for user ${userId}`);
    return;
  }

  // Build cron expression: "minutes hours * * *" = every day at HH:mm
  const cronExpression = `${minutes} ${hours} * * *`;

  try {
    const job = cron.schedule(
      cronExpression,
      async () => {
        try {
          console.log(`[Scheduler] Firing daily check-in for user ${userId}`);
          // Re-fetch user in case preferences changed
          const currentUser = await User.findById(userId)
            .select('email name notificationPreferences');

          if (!currentUser) {
            // User was deleted — cancel this job
            checkInJobs.get(userId)?.stop();
            checkInJobs.delete(userId);
            return;
          }

          // Only fire if still enabled
          if (!currentUser.notificationPreferences?.dailyCheckIn) {
            checkInJobs.get(userId)?.stop();
            checkInJobs.delete(userId);
            return;
          }

          await notificationService.sendDailyCheckInReminder(
            currentUser._id,
            currentUser.email,
            currentUser.name
          );
        } catch (err) {
          console.error(`[Scheduler] Check-in job error for ${userId}:`, err.message);
        }
      },
      {
        timezone: process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata'
      }
    );

    checkInJobs.set(userId, job);
    console.log(`[Scheduler] Daily check-in scheduled for user ${userId} at ${timeStr}`);
  } catch (err) {
    console.error(`[Scheduler] Failed to schedule check-in for ${userId}:`, err.message);
  }
}

function rescheduleUserCheckIn(user) {
  scheduleUserCheckIn(user);
}

async function initializeAllSchedulers() {
  try {
    const medications = await Medication.find({ isActive: true });
    medications.forEach(scheduleReminder);
    console.log(`Scheduler initialized: ${medications.length} active medications`);
    
    scheduleWeeklySummary();
    console.log('✅ Weekly summary scheduler registered (Sundays 7 PM IST)');

    // ── Schedule daily check-in reminders ─────────────────
    try {
      const usersWithCheckIn = await User.find({
        'notificationPreferences.dailyCheckIn': true
      }).select('_id email name notificationPreferences');

      let checkInCount = 0;
      for (const user of usersWithCheckIn) {
        scheduleUserCheckIn(user);
        checkInCount++;
      }
      console.log(`✅ Daily check-in: ${checkInCount} users scheduled`);
    } catch (err) {
      console.error('[Scheduler] Check-in init failed:', err.message);
    }

    // Register 15-minute missed-dose persistent sweep
    try {
      cron.schedule('*/15 * * * *', async () => {
        console.log('[Scheduler] Running 15-minute persistent missed-dose sweep...');
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const medications = await Medication.find({
            isActive: true,
            'adherenceLogs': {
              $elemMatch: {
                status: 'pending',
                scheduledTime: { $lte: oneHourAgo }
              }
            }
          });

          for (const med of medications) {
            let updated = false;
            const user = await User.findById(med.user).select('email');
            
            for (const log of med.adherenceLogs) {
              if (log.status === 'pending' && new Date(log.scheduledTime) <= oneHourAgo) {
                log.status = 'missed';
                updated = true;
                
                try {
                  await notificationService.sendMedicationMissed(
                    med.user,
                    user ? user.email : null,
                    med.name
                  );
                } catch (notifErr) {
                  console.warn(`[Scheduler] Failed to send missed dose notification: ${notifErr.message}`);
                }
              }
            }

            if (updated) {
              await med.save();
              console.log(`[Scheduler] Marked missed doses for medication: ${med.name}`);
            }
          }
        } catch (err) {
          console.error('[Scheduler] Missed-dose sweep error:', err.message);
        }
      });
      console.log('✅ Missed-dose persistent 15-minute sweep registered');
    } catch (sweepErr) {
      console.error('[Scheduler] Failed to start missed-dose sweep:', sweepErr.message);
    }
  } catch (error) {
    console.warn('Scheduler initialization failed:', error.message);
  }
}

module.exports = { 
  scheduleReminder, 
  cancelJob, 
  initializeAllSchedulers,
  scheduleUserCheckIn,
  rescheduleUserCheckIn
};
