import React, { useState, useEffect } from 'react';
import { symptomsAPI } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import SkeletonCard from '../components/ui/SkeletonCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function SymptomsPage() {
  const [activeTab, setActiveTab] = useState('log'); // 'log' or 'history'

  // Form State
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [currentSeverity, setCurrentSeverity] = useState(5);
  const [symptomsList, setSymptomsList] = useState([]);
  
  const [painLevel, setPainLevel] = useState(0);
  const [mood, setMood] = useState('Fair');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState('Good');
  const [appetite, setAppetite] = useState('Normal');
  const [notes, setNotes] = useState('');
  
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    oxygenSaturation: ''
  });

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [painTrends, setPainTrends] = useState([]);
  const [moodTrends, setMoodTrends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('30'); // '7', '30', 'all'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [aiInsight, setAiInsight] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const moodOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'];

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(1, true);
      fetchTrends();
    }
  }, [activeTab, dateRange]);

  const fetchHistory = async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoadingHistory(true);
        setPage(1);
      }
      
      const res = await symptomsAPI.getAll({ 
        page: pageNum, 
        limit: 10,
        days: dateRange === 'all' ? undefined : dateRange,
        search: searchQuery
      });
      
      if (res.data.success) {
        setHistory(prev => reset ? (res.data.data.symptoms || []) : [...prev, ...(res.data.data.symptoms || [])]);
        setHasMore(res.data.data.pagination.page < res.data.data.pagination.pages);
        if(!reset) setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      if (reset) setLoadingHistory(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const days = dateRange === 'all' ? 365 : parseInt(dateRange);
      const [painRes, moodRes] = await Promise.all([
        symptomsAPI.painTrends(days),
        symptomsAPI.moodTrends(days)
      ]);
      
      if (painRes.data.success) {
        const formattedPain = (painRes.data.data.trends || []).map(d => ({
          date: format(parseISO(d.date), 'MMM dd'),
          painLevel: d.painLevel
        }));
        setPainTrends(formattedPain);
      }
      
      if (moodRes.data.success) {
        const formattedMood = (moodRes.data.data.trends || []).map(d => ({
          date: format(parseISO(d.date), 'MMM dd'),
          mood: d.moodScore
        }));
        setMoodTrends(formattedMood);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    }
  };

  const handleAddSymptom = () => {
    if (!currentSymptom.trim()) return;
    setSymptomsList([...symptomsList, { name: currentSymptom.trim(), severity: currentSeverity }]);
    setCurrentSymptom('');
    setCurrentSeverity(5);
  };

  const handleRemoveSymptom = (index) => {
    setSymptomsList(symptomsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    // Allow submission if any meaningful data is present
    const hasMeaningfulData =
      symptomsList.length > 0 ||
      painLevel > 0 ||
      notes.trim().length > 0 ||
      (showVitals && Object.values(vitals).some(v => v !== ''));

    if (!hasMeaningfulData) {
      setSubmitError('Please add at least one symptom, set a pain level above 0, or add notes before saving.');
      return;
    }

    setSubmitLoading(true);
    try {
      // Map mood/appetite/sleepQuality to lowercase to match model enums
      const moodLower = mood.toLowerCase().replace(/\s+/g, '_');  // 'Very Poor' -> 'very_poor'
      const appetiteLower = appetite.toLowerCase();                // 'Normal' -> 'normal'
      const sleepQualityLower = sleepQuality.toLowerCase();        // 'Good' -> 'good'

      // Build vitalSigns matching model shape
      let vitalSigns = undefined;
      if (showVitals) {
        vitalSigns = {};
        if (vitals.temperature) vitalSigns.temperature = Number(vitals.temperature);
        if (vitals.heartRate) vitalSigns.heartRate = Number(vitals.heartRate);
        if (vitals.oxygenSaturation) vitalSigns.oxygenSaturation = Number(vitals.oxygenSaturation);
        // Parse '120/80' string into { systolic, diastolic }
        if (vitals.bloodPressure && vitals.bloodPressure.includes('/')) {
          const [sys, dia] = vitals.bloodPressure.split('/');
          vitalSigns.bloodPressure = {
            systolic: Number(sys) || 0,
            diastolic: Number(dia) || 0
          };
        }
        // Only include if at least one field is set
        if (Object.keys(vitalSigns).length === 0) vitalSigns = undefined;
      }

      const payload = {
        ...(symptomsList.length > 0 && { symptoms: symptomsList }),
        painLevel,
        mood: moodLower,
        energyLevel,
        sleepQuality: { hours: Number(sleepHours) || 0, quality: sleepQualityLower },
        appetite: appetiteLower,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(vitalSigns && { vitalSigns }),
      };

      const res = await symptomsAPI.create(payload);
      if (res.data.success) {
        // Reset form
        setSymptomsList([]);
        setPainLevel(0);
        setMood('Fair');
        setEnergyLevel(5);
        setSleepHours(8);
        setSleepQuality('Good');
        setAppetite('Normal');
        setNotes('');
        setVitals({ temperature: '', bloodPressure: '', heartRate: '', oxygenSaturation: '' });
        setShowVitals(false);
        setSubmitError('');
        
        if (res.data.data.symptomLog && res.data.data.symptomLog.aiInsights) {
          setAiInsight(res.data.data.symptomLog.aiInsights);
        }
        
        setActiveTab('history');
      }
    } catch (err) {
      console.error('Failed to log symptoms:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.message
        || err.response?.data?.error
        || `Server error ${err.response?.status || ''}: Could not save. Try again.`;
      setSubmitError(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await symptomsAPI.delete(id);
      setHistory(history.filter(h => h._id !== id));
      fetchTrends();
    } catch (err) {
      console.error('Failed to delete symptom log:', err);
      alert('Could not delete entry.');
    }
  };

  const getColorForLevel = (level) => {
    if (level <= 3) return 'bg-success';
    if (level <= 6) return 'bg-warning';
    return 'bg-danger';
  };

  const navy = '#152E57';
  const teal = '#0d9488';
  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition";

  const painColor = painLevel <= 3 ? teal : painLevel <= 6 ? '#f59e0b' : '#ef4444';
  const energyColor = energyLevel >= 7 ? teal : energyLevel >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
          style={{ background: '#EBF2FF', color: navy }}>
          Wellness Tracking
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: navy }}>Symptoms Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Log how you feel to discover patterns and get AI-powered insights.</p>
      </div>

      {/* AI Insight banner */}
      {aiInsight && (
        <div className="mb-6 rounded-2xl overflow-hidden border" style={{ borderColor: '#bfdbfe' }}>
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
            <span className="text-xl">💡</span>
            <span className="font-bold text-white text-sm">AI Noticed A Pattern</span>
            <button onClick={() => setAiInsight(null)} className="ml-auto text-white/60 hover:text-white text-lg leading-none">✕</button>
          </div>
          <div className="px-5 py-4 bg-blue-50">
            {aiInsight?.recommendations?.length > 0 && (
              <div className="space-y-1 mb-2">
                {aiInsight.recommendations.map((rec, i) => (
                  <p key={i} className="text-sm text-blue-800">• {rec}</p>
                ))}
              </div>
            )}
            {aiInsight?.patterns?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {aiInsight.patterns.map((pat, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: '#dbeafe', color: '#1e40af' }}>{pat}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        {[{ id: 'log', label: 'Log Symptoms' }, { id: 'history', label: 'History & Trends' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === tab.id
              ? { background: `linear-gradient(135deg, ${navy}, #1e4a8c)`, color: '#fff', boxShadow: '0 2px 8px rgba(21,46,87,0.25)' }
              : { color: '#94a3b8' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'log' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${navy}, ${teal})` }} />
          <div className="p-6 md:p-8 space-y-7">

            {/* Symptoms input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: navy }}>
                Symptoms
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input type="text" placeholder="e.g. Headache, Nausea, Fatigue…"
                  className={`flex-1 ${inputCls}`}
                  value={currentSymptom}
                  onChange={e => setCurrentSymptom(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); } }} />
                <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold" style={{ color: navy }}>
                  <span>Severity: {currentSeverity}</span>
                  <input type="range" min="1" max="10"
                    value={currentSeverity} onChange={e => setCurrentSeverity(Number(e.target.value))}
                    className="w-24 sm:w-20" style={{ accentColor: teal }} />
                </div>
                <button type="button" onClick={handleAddSymptom}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white justify-center flex"
                  style={{ background: `linear-gradient(135deg, ${teal}, #14b8a6)` }}>
                  + Add
                </button>
              </div>
              {symptomsList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {symptomsList.map((sym, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                      style={{ background: '#EBF2FF', color: navy }}>
                      {sym.name}
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: navy, color: '#fff' }}>
                        {sym.severity}/10
                      </span>
                      <button type="button" onClick={() => handleRemoveSymptom(idx)}
                        className="text-gray-400 hover:text-red-500 leading-none">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sliders row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: navy }}>Pain Level</label>
                  <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg text-white"
                    style={{ background: painColor }}>{painLevel}/10</span>
                </div>
                <input type="range" min="0" max="10" value={painLevel}
                  onChange={e => setPainLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${teal} ${painLevel * 10}%, #e5e7eb ${painLevel * 10}%)`, accentColor: painColor }} />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>No pain</span><span>Severe</span></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: navy }}>Energy Level</label>
                  <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg text-white"
                    style={{ background: energyColor }}>{energyLevel}/10</span>
                </div>
                <input type="range" min="0" max="10" value={energyLevel}
                  onChange={e => setEnergyLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${teal} ${energyLevel * 10}%, #e5e7eb ${energyLevel * 10}%)`, accentColor: energyColor }} />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Exhausted</span><span>Energetic</span></div>
              </div>
            </div>

            {/* Mood & Sleep */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: navy }}>Mood</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[['😄','Excellent'],['😊','Good'],['😐','Fair'],['😟','Poor'],['😢','Very Poor']].map(([em, val]) => (
                    <button key={val} type="button" onClick={() => setMood(val)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all min-w-[60px]"
                      style={mood === val
                        ? { background: navy, color: '#fff', borderColor: navy }
                        : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}>
                      {em}<br/><span className="text-[10px]">{val}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: navy }}>Sleep Last Night</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="number" min="0" max="24" step="0.5"
                      value={sleepHours} onChange={e => setSleepHours(e.target.value)}
                      className={`${inputCls} pr-10`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">hrs</span>
                  </div>
                  <select value={sleepQuality} onChange={e => setSleepQuality(e.target.value)} className={`flex-1 ${inputCls}`}>
                    {['Excellent','Good','Fair','Poor'].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Appetite */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: navy }}>Appetite</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Normal','Increased','Decreased','None'].map(opt => (
                  <button key={opt} type="button" onClick={() => setAppetite(opt)}
                    className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                    style={appetite === opt
                      ? { background: navy, color: '#fff', borderColor: navy }
                      : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Vitals (collapsible) */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <button type="button" onClick={() => setShowVitals(!showVitals)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold transition-colors"
                style={{ background: '#f8fafc', color: navy }}>
                <span>📊 Vital Signs <span className="text-gray-400 font-normal">(optional)</span></span>
                <span style={{ color: '#94a3b8' }}>{showVitals ? '▲' : '▼'}</span>
              </button>
              {showVitals && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
                  {[
                    { label: 'Temperature', key: 'temperature', placeholder: '98.6 °F' },
                    { label: 'Blood Pressure', key: 'bloodPressure', placeholder: '120/80' },
                    { label: 'Heart Rate', key: 'heartRate', placeholder: 'bpm' },
                    { label: 'SpO₂', key: 'oxygenSaturation', placeholder: '%' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">{label}</label>
                      <input type="text" placeholder={placeholder} value={vitals[key]}
                        onChange={e => setVitals({ ...vitals, [key]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: navy }}>Notes</label>
              <textarea rows="3" maxLength="500" value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any other details, symptoms, or context…"
                className={inputCls + " resize-none"} />
              <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/500</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ background: '#f8fafc' }}>
            {submitError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex-1 text-sm text-red-700">
                <span className="flex-shrink-0 font-bold">⚠</span>
                <span>{submitError}</span>
                <button type="button" onClick={() => setSubmitError('')}
                  className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
              </div>
            )}
            <button type="submit" disabled={submitLoading}
              className="ml-auto inline-flex items-center gap-2 px-8 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
              {submitLoading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Saving…</>
              ) : '✓ Log Symptoms'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Trend Charts */}
          {(painTrends.length > 0 || moodTrends.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: navy }}>Your Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {painTrends.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Pain Level — Last {dateRange === 'all' ? 'All' : dateRange} Days</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={painTrends} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="painLevel" stroke="#ef4444" fillOpacity={1} fill="url(#colorPain)" name="Pain" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {moodTrends.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Mood Score — Last {dateRange === 'all' ? 'All' : dateRange} Days</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={moodTrends} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis domain={[1, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => ['','😢','😟','😐','😊','😄'][v] || v} />
                          <Tooltip formatter={(v) => [v.toFixed(1), 'Mood']} contentStyle={{ borderRadius: 10, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" name="Mood" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input type="text" placeholder="Search entries…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchHistory(1, true)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* History list */}
          <div className="space-y-3">
            {loadingHistory ? (
              Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : history.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF2FF' }}>
                  <span className="text-3xl">🩺</span>
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: navy }}>
                  {searchQuery ? 'No entries found' : 'No symptoms logged yet'}
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'Start tracking how you feel each day'}
                </p>
                {!searchQuery && (
                  <button onClick={() => setActiveTab('log')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold shadow"
                    style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                    Log First Symptom
                  </button>
                )}
              </div>
            ) : (
              history.map(log => (
                <div key={log._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="px-5 py-3 flex justify-between items-center border-b border-gray-50"
                    style={{ background: '#f8fafc' }}>
                    <span className="text-sm font-bold" style={{ color: navy }}>
                      {format(new Date(log.loggedAt), 'MMM dd, yyyy')}
                      <span className="text-gray-400 font-normal ml-2">{format(new Date(log.loggedAt), 'h:mm a')}</span>
                    </span>
                    <button onClick={() => handleDelete(log._id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {log.symptoms?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.symptoms.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: '#EBF2FF', color: navy }}>
                            {s.name} <span className="opacity-60">({s.severity}/10)</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-t border-b border-gray-50">
                      {[
                        { label: 'Pain', value: `${log.painLevel}/10` },
                        { label: 'Mood', value: log.mood?.replace('_', ' ') },
                        { label: 'Energy', value: `${log.energyLevel}/10` },
                        { label: 'Sleep', value: log.sleepQuality?.hours ? `${log.sleepQuality.hours}h` : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-1 bg-gray-50/50 rounded-lg sm:bg-transparent">
                          <p className="text-[10px] sm:text-xs text-gray-400 font-semibold">{label}</p>
                          <p className="text-xs sm:text-sm font-bold capitalize" style={{ color: navy }}>{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                    {log.notes && (
                      <p className="text-sm text-gray-500 italic">"{log.notes}"</p>
                    )}
                    {log.aiInsights && (
                      <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <span className="flex-shrink-0">💡</span>
                        <div className="text-blue-800 text-xs leading-relaxed">
                          {typeof log.aiInsights === 'string' ? log.aiInsights
                            : (log.aiInsights?.recommendations || []).map((r, i) => <p key={i}>• {r}</p>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {hasMore && !loadingHistory && history.length > 0 && (
              <button onClick={() => fetchHistory(page + 1)}
                className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                Load More Entries
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
