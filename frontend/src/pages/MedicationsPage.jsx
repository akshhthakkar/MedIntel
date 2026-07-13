import React, { useState, useEffect } from 'react';
import { medicationsAPI } from '../services/api';
import {
  Pill, Plus, AlertTriangle, Check, X, Bell, Clock,
  Loader2, Trash2, Calendar, User as UserIcon, FileText,
  ChevronDown, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const navy = '#152E57';
const teal = '#0d9488';

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition";

function Badge({ children, color = '#6b7280', bg = '#f3f4f6' }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color }}>
      {children}
    </span>
  );
}

const FREQ_LABELS = {
  once_daily: 'Once daily', twice_daily: 'Twice daily', thrice_daily: '3× daily',
  four_times_daily: '4× daily', every_6_hours: 'Every 6h', every_8_hours: 'Every 8h',
  every_12_hours: 'Every 12h', as_needed: 'As needed', weekly: 'Weekly'
};
const TIMING_LABELS = {
  before_food: 'Before food', after_food: 'After food', with_food: 'With food',
  empty_stomach: 'Empty stomach', anytime: 'Anytime'
};

export default function MedicationsPage() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [schedule, setSchedule] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [interactionWarning, setInteractionWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState('08:00');

  const [formData, setFormData] = useState({
    name: '', dosage: '', unit: 'mg', frequency: 'once_daily',
    timing: 'after_food', startDate: '', endDate: '',
    reminderTimes: [], prescribedBy: '', notes: '',
  });

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'schedule') {
        const res = await medicationsAPI.schedule();
        setSchedule(res.data.data.schedule);
      } else {
        const res = await medicationsAPI.active();
        setMedications(res.data.data.medications);
      }
    } catch {
      setError('Could not load medications. Please check your connection.');
    } finally { setLoading(false); }
  };

  const checkInteractions = async (medName) => {
    if (medName.length < 3 || medications.length === 0) return;
    try {
      const res = await medicationsAPI.checkInteractions();
      if (res.data.data.interactions && !res.data.data.interactions.includes('No known interactions')) {
        setInteractionWarning(res.data.data.interactions);
      } else { setInteractionWarning(''); }
    } catch { /* silent */ }
  };

  const addReminderTime = () => {
    if (!newReminderTime || formData.reminderTimes.includes(newReminderTime)) return;
    setFormData(prev => ({ ...prev, reminderTimes: [...prev.reminderTimes, newReminderTime].sort() }));
  };

  const removeReminderTime = (time) =>
    setFormData(prev => ({ ...prev, reminderTimes: prev.reminderTimes.filter(t => t !== time) }));

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Medication name is required');
    if (!formData.dosage) return toast.error('Dosage is required');
    if (!formData.startDate) return toast.error('Start date is required');
    if (formData.endDate && formData.endDate < formData.startDate) return toast.error('End date must be after start date');

    setIsSubmitting(true);
    try {
      await medicationsAPI.create({
        name: formData.name.trim(),
        dosage: formData.dosage, unit: formData.unit,
        frequency: formData.frequency, timing: formData.timing,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        reminderSettings: { enabled: formData.reminderTimes.length > 0, reminderTimes: formData.reminderTimes },
        prescribedBy: formData.prescribedBy ? { name: formData.prescribedBy } : undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Medication added!');
      setShowAddForm(false);
      setFormData({ name: '', dosage: '', unit: 'mg', frequency: 'once_daily', timing: 'after_food', startDate: '', endDate: '', reminderTimes: [], prescribedBy: '', notes: '' });
      setNewReminderTime('08:00');
      setInteractionWarning('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add medication');
    } finally { setIsSubmitting(false); }
  };

  const markTaken = async (medId, time) => {
    try {
      await medicationsAPI.markTaken(medId, time);
      toast.success('Marked as taken ✓');
      setSchedule(schedule.map(s =>
        s.medicationId === medId && s.time === time ? { ...s, taken: true, takenAt: new Date() } : s
      ));
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (medId) => {
    if (!window.confirm('Stop this medication?')) return;
    try {
      await medicationsAPI.delete(medId);
      toast.success('Medication removed');
      fetchData();
    } catch { toast.error('Failed to remove'); }
  };

  const takenCount = schedule.filter(s => s.taken).length;
  const adherencePct = schedule.length > 0 ? Math.round((takenCount / schedule.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
            style={{ background: '#EBF2FF', color: navy }}>
            Health Management
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: navy }}>Medications</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your prescriptions, schedule, and reminders.</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setInteractionWarning(''); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 w-full sm:w-auto"
          style={showAddForm
            ? { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }
            : { background: `linear-gradient(135deg, ${navy}, #1e4a8c)`, color: '#fff' }}>
          {showAddForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Medication</>}
        </button>
      </div>

      {/* ── Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"
            style={{ background: '#f8fafc' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#EBF2FF' }}>
              <Pill className="w-4 h-4" style={{ color: navy }} />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: navy }}>New Prescription</h3>
              <p className="text-xs text-gray-400">Fill in your medication details</p>
            </div>
          </div>

          {interactionWarning && (
            <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              {interactionWarning}
            </div>
          )}

          <form onSubmit={handleAddMedication} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>Medication Name *</label>
                <input type="text" required className={inputCls} placeholder="e.g. Lisinopril, Metformin…"
                  value={formData.name}
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); if (e.target.value.length > 3) checkInteractions(e.target.value); }} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>Dosage *</label>
                <div className="flex gap-2">
                  <input type="number" required className={inputCls} placeholder="10"
                    value={formData.dosage}
                    onChange={e => setFormData({ ...formData, dosage: e.target.value })} />
                  <select className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none"
                    value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                    {['mg','mcg','g','ml','tablet','capsule'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>Frequency</label>
                <select className={inputCls} value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                  {Object.entries(FREQ_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>Timing</label>
                <select className={inputCls} value={formData.timing} onChange={e => setFormData({ ...formData, timing: e.target.value })}>
                  {Object.entries(TIMING_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>Start Date *</label>
                <input type="date" required className={inputCls}
                  value={formData.startDate} max={formData.endDate || undefined}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>
                  End Date <span className="text-gray-400 font-normal normal-case">optional</span>
                </label>
                <input type="date" className={inputCls}
                  value={formData.endDate} min={formData.startDate || undefined}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>

            {/* Reminder Times */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>
                Reminder Times <span className="text-gray-400 font-normal normal-case">optional</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none" />
                <button type="button" onClick={addReminderTime}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${teal}, #14b8a6)` }}>
                  + Add
                </button>
              </div>
              {formData.reminderTimes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.reminderTimes.map(time => (
                    <span key={time} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ background: '#EBF2FF', color: navy }}>
                      🕐 {time}
                      <button type="button" onClick={() => removeReminderTime(time)}
                        className="text-gray-400 hover:text-red-500 font-bold leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400">No reminders set.</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>
                  Prescribed By <span className="text-gray-400 font-normal normal-case">optional</span>
                </label>
                <input type="text" className={inputCls} placeholder="e.g. Dr. Sharma"
                  value={formData.prescribedBy}
                  onChange={e => setFormData({ ...formData, prescribedBy: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: navy }}>
                  Notes <span className="text-gray-400 font-normal normal-case">optional</span>
                </label>
                <input type="text" className={inputCls} placeholder="Any special instructions…"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Save Medication
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        {[{ id: 'schedule', label: "Today's Schedule" }, { id: 'active', label: 'All Prescriptions' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === tab.id
              ? { background: `linear-gradient(135deg, ${navy}, #1e4a8c)`, color: '#fff', boxShadow: '0 2px 8px rgba(21,46,87,0.25)' }
              : { color: '#94a3b8' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content */}
      {error ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="font-bold text-gray-800 mb-2">Connection Error</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={fetchData} className="px-6 py-2.5 rounded-xl text-white font-bold"
            style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>Retry</button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'schedule' ? (
        schedule.length > 0 ? (
          <div className="space-y-4">
            {/* Adherence card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: navy }}>Today's Adherence</span>
                <span className="text-sm font-extrabold" style={{ color: teal }}>{takenCount}/{schedule.length} taken</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${adherencePct}%`,
                    background: adherencePct >= 80
                      ? `linear-gradient(90deg, ${teal}, #14b8a6)`
                      : adherencePct >= 50
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #ef4444, #f87171)'
                  }} />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">{adherencePct}% adherence today</p>
            </div>

            {schedule.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all"
                style={{ borderColor: item.taken ? '#d1fae5' : '#e2e8f0', borderLeft: item.taken ? `3px solid ${teal}` : `3px solid ${navy}` }}>
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: item.taken ? '#d1fae5' : '#EBF2FF' }}>
                      {item.taken
                        ? <Check className="w-5 h-5" style={{ color: teal }} />
                        : <Clock className="w-5 h-5" style={{ color: navy }} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-base"
                        style={{ color: item.taken ? '#94a3b8' : navy, textDecoration: item.taken ? 'line-through' : 'none' }}>
                        {item.medicationName}
                      </h4>
                      <p className="text-sm text-gray-500">{item.dosage} · {item.time}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {item.timing && (
                          <Badge bg="#f0fdf4" color="#166534">{TIMING_LABELS[item.timing] || item.timing}</Badge>
                        )}
                        {item.taken && item.takenAt && (
                          <Badge bg="#d1fae5" color="#065f46">
                            ✓ Taken at {new Date(item.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!item.taken && (
                    <button onClick={() => markTaken(item.medicationId, item.time)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 justify-center flex"
                      style={{ background: `linear-gradient(135deg, ${teal}, #14b8a6)` }}>
                      Mark Taken
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: '#EBF2FF' }}>
              <Pill className="w-9 h-9" style={{ color: navy }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: navy }}>No medications scheduled today</h3>
            <p className="text-gray-400 text-sm mb-6">Add your prescriptions to get automatic reminders and track adherence.</p>
            <button onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold shadow"
              style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
              <Plus className="w-4 h-4" /> Add First Medication
            </button>
          </div>
        )
      ) : (
        medications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.map(med => (
              <div key={med._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group relative overflow-hidden">
                {/* Decorative pill gradient top */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${navy}, ${teal})` }} />

                <div className="flex items-start justify-between mb-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#EBF2FF' }}>
                      <Pill className="w-5 h-5" style={{ color: navy }} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base" style={{ color: navy }}>{med.name}</h4>
                      <p className="text-sm text-gray-500">{med.dosage} {med.unit}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(med._id)}
                    className="p-1.5 rounded-xl border border-transparent hover:border-red-200 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge bg="#EBF2FF" color={navy}>
                    <Clock className="w-3 h-3" /> {FREQ_LABELS[med.frequency] || med.frequency}
                  </Badge>
                  {med.timing && (
                    <Badge bg="#f0fdf4" color="#166534">{TIMING_LABELS[med.timing] || med.timing}</Badge>
                  )}
                  {med.reminderSettings?.enabled && (
                    <Badge bg="#eff6ff" color="#1d4ed8">
                      <Bell className="w-3 h-3" /> Reminders on
                    </Badge>
                  )}
                </div>

                {med.reminderSettings?.reminderTimes?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {med.reminderSettings.reminderTimes.map(time => (
                      <span key={time} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: '#eff6ff', color: '#1d4ed8' }}>🕐 {time}</span>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-50 mt-3 pt-3 space-y-1">
                  {med.startDate && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(med.startDate).toLocaleDateString('en-IN')}
                      {med.endDate && ` → ${new Date(med.endDate).toLocaleDateString('en-IN')}`}
                    </p>
                  )}
                  {med.prescribedBy?.name && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3" /> {med.prescribedBy.name}
                    </p>
                  )}
                  {med.notes && (
                    <p className="text-xs text-gray-400 flex items-start gap-1.5">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{med.notes}</span>
                    </p>
                  )}
                </div>

                {med.interactions?.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                    Interaction: {med.interactions[0].description}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: '#EBF2FF' }}>
              <Pill className="w-9 h-9" style={{ color: navy }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: navy }}>No active prescriptions</h3>
            <p className="text-gray-400 text-sm mb-6">Start tracking your medications to manage your health.</p>
            <button onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold shadow"
              style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        )
      )}
    </div>
  );
}
