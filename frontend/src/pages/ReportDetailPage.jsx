import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { reportsAPI, medicationsAPI } from '../services/api';
import { 
  ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, 
  Activity, Globe, Loader2, MessageCircle, Send, Trash2, Shield, Heart, Image, Sparkles
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';

// Helper to parse normal ranges and calculate current placement percentage
const parseRange = (valStr, rangeStr) => {
  if (!rangeStr || !valStr) return null;
  try {
    // Sanitize values
    const val = parseFloat(valStr.replace(/[^\d.]/g, ''));
    if (isNaN(val)) return null;

    // 1. Dash range match (e.g., "70 - 100" or "12.0-16.0")
    const dashMatch = rangeStr.replace(/\s+/g, '').match(/^([\d.]+)-([\d.]+)$/);
    if (dashMatch) {
      const min = parseFloat(dashMatch[1]);
      const max = parseFloat(dashMatch[2]);
      if (!isNaN(min) && !isNaN(max) && max > min) {
        // Position min at 25% and max at 75% to show buffer zone
        const rangeWidth = max - min;
        const percent = 25 + ((val - min) / rangeWidth) * 50;
        return { min, max, val, percent: Math.max(5, Math.min(95, percent)), type: 'range' };
      }
    }

    // 2. Less-than limit match (e.g., "< 130" or "<130")
    const ltMatch = rangeStr.match(/^<\s*([\d.]+)$/);
    if (ltMatch) {
      const limit = parseFloat(ltMatch[1]);
      if (!isNaN(limit)) {
        // Position limit at 75%
        const percent = (val / limit) * 75;
        return { limit, val, percent: Math.max(5, Math.min(95, percent)), type: 'lessThan' };
      }
    }

    // 3. Greater-than limit match (e.g., "> 50" or ">50")
    const gtMatch = rangeStr.match(/^>\s*([\d.]+)$/);
    if (gtMatch) {
      const limit = parseFloat(gtMatch[1]);
      if (!isNaN(limit)) {
        // Position limit at 25%
        const percent = val > limit ? 25 + ((val - limit) / limit) * 50 : (val / limit) * 25;
        return { limit, val, percent: Math.max(5, Math.min(95, percent)), type: 'greaterThan' };
      }
    }
  } catch (e) {
    // Fail silently
  }
  return null;
};

const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retranslating, setRetranslating] = useState(false);
  const [lang, setLang] = useState('');
  
  // Q&A State
  const [question, setQuestion] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const chatBottomRef = useRef(null);
  const languages = ['English', 'Spanish', 'French', 'Hindi', 'Chinese', 'Arabic', 'Russian'];

  useEffect(() => {
    fetchReport();
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchReport = async () => {
    try {
      const res = await reportsAPI.getOne(id);
      const fetchedReport = res.data.data.report;
      setReport(fetchedReport);
      setLang(fetchedReport.language || 'English');
      return fetchedReport;
    } catch (err) {
      toast.error('Failed to load report details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;
    if (report?.processingStatus === 'processing') {
      intervalId = setInterval(async () => {
        const updated = await fetchReport();
        if (updated && updated.processingStatus !== 'processing') {
          clearInterval(intervalId);
          if (updated.processingStatus === 'done') {
            toast.success('AI Analysis complete!');
          } else if (updated.processingStatus === 'failed') {
            toast.error('AI Analysis failed to process.');
          }
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [report?.processingStatus]);

  const handleRetranslate = async () => {
    if (!lang || lang === report.language) return;
    setRetranslating(true);
    try {
      const res = await reportsAPI.retranslate(id, lang);
      setReport(res.data.data.report);
      toast.success(`Translated to ${lang}`);
    } catch (err) {
      toast.error('Translation failed');
    } finally {
      setRetranslating(false);
    }
  };

  const handleImportMedications = async () => {
    const meds = report.extractedData?.medications || [];
    if (meds.length === 0) return;
    setRetranslating(true);
    try {
      const promises = meds.map(m => {
        let dosageStr = '1';
        let unitStr = 'tablet';
        if (m.dosage) {
          const matchNum = m.dosage.match(/^[0-9.]+/);
          const matchUnit = m.dosage.match(/[a-zA-Z]+/);
          if (matchNum) dosageStr = matchNum[0];
          if (matchUnit) {
            const parsedUnit = matchUnit[0].toLowerCase();
            const validUnits = ['mg', 'ml', 'mcg', 'iu', 'tablet', 'capsule'];
            if (validUnits.includes(parsedUnit)) {
              unitStr = parsedUnit;
            } else if (parsedUnit === 'tab') {
              unitStr = 'tablet';
            } else if (parsedUnit === 'cap') {
              unitStr = 'capsule';
            }
          }
        }
        
        let freq = m.frequency || 'once_daily';
        const validFreqs = [
          'once_daily', 'twice_daily', 'thrice_daily', 'four_times_daily',
          'every_6_hours', 'every_8_hours', 'every_12_hours', 'as_needed',
          'weekly', 'custom'
        ];
        if (!validFreqs.includes(freq)) {
          freq = 'once_daily';
        }

        const payload = {
          name: m.name,
          genericName: m.genericName || '',
          dosage: dosageStr,
          unit: unitStr,
          frequency: freq,
          timing: 'after_food',
          startDate: new Date().toISOString().split('T')[0],
          notes: m.instructions || 'Imported from prescription report',
          prescriptionReport: report._id
        };
        return medicationsAPI.create(payload);
      });
      await Promise.all(promises);
      toast.success('All medications successfully imported to your schedule!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to import some medications. Please check fields.');
    } finally {
      setRetranslating(false);
    }
  };

  const handleAskQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim() || answerLoading) return;

    const userMessage = { role: 'user', content: question };
    const newHistory = [...chatHistory, userMessage];

    setChatHistory(newHistory);
    setQuestion('');
    setAnswerLoading(true);

    try {
      const response = await reportsAPI.qa({
        question: userMessage.content,
        reportId: report._id,
        language: lang || 'English',
        history: newHistory.slice(-4)
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.data?.answer || response.data.data || 'No answer received.'
      };
      setChatHistory(prev => [...prev, assistantMessage]);

    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I could not answer that. Please try again.'
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setAnswerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-100 p-8 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
          </div>
          <div className="p-8 bg-gray-50/50 space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900">Report not found</h2>
        <Link to="/reports" className="mt-4 text-primary-600 hover:underline">Return to reports</Link>
      </div>
    );
  }

  if (report.processingStatus === 'processing') {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-4">
        <Loader2 className="h-12 w-12 text-primary-500 animate-spin" />
        <h2 className="text-xl font-bold text-gray-700">AI is analyzing your report...</h2>
        <p className="text-sm text-gray-500 max-w-sm text-center leading-normal">
          We are scanning your document and parsing values. This usually takes 10-20 seconds.
        </p>
      </div>
    );
  }

  const results = report.extractedData?.testResults || [];
  const abnormalResults = results.filter(r => ['abnormal', 'high', 'low', 'critical'].includes(r.status?.toLowerCase()));
  const normalResults = results.filter(r => r.status?.toLowerCase() === 'normal');
  const borderlineResults = results.filter(r => r.status?.toLowerCase() === 'borderline');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Top Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <Link to="/reports" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 py-1">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to reports
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm flex-1 sm:flex-initial p-0.5">
            <Globe className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="pl-2 pr-8 py-2 border-0 focus:ring-0 text-sm text-gray-700 bg-transparent rounded-lg flex-1 sm:flex-initial outline-none"
            >
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {lang !== report.language && (
              <button 
                onClick={handleRetranslate}
                disabled={retranslating}
                className="px-3.5 py-2 bg-primary-50 text-primary-700 text-xs font-extrabold border-l border-gray-200 rounded-r-xl hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                {retranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Translate'}
              </button>
            )}
          </div>
          
          {report.fileUrl && (
            <a href={report.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary rounded-xl font-bold text-xs md:text-sm py-2 px-4 shadow-sm hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" /> Original Document
            </a>
          )}
        </div>
      </div>

      {/* Main Split Grid (Left: findings, Right: Chat Assistant) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Report Analysis */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-blue-600 px-6 py-8 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> 
                  <span className="capitalize">{report.reportType?.replace(/_/g, ' ') || 'Medical Report'}</span>
                </span>
                <span className="text-xs font-bold bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
                  {format(new Date(report.date || Date.now()), 'MMMM d, yyyy')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">{report.title}</h1>
            </div>
            
            <div className="p-6 sm:p-8 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-xs font-extrabold tracking-wider text-gray-400 uppercase mb-2">Clinical Overall Summary</h3>
              <p className="text-gray-700 text-base md:text-lg leading-relaxed font-medium">
                {report.aiAnalysis?.overallSummary || 'No clinical summary available.'}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          {results.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Checked</span>
                <span className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 block">{results.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-red-500 block">Abnormal</span>
                <span className="text-xl sm:text-2xl font-black text-red-600 mt-0.5 block">{abnormalResults.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-500 block">Borderline</span>
                <span className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 block">{borderlineResults.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 block">Normal</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 block">{normalResults.length}</span>
              </div>
            </div>
          )}

          {/* Detailed Findings Content */}
          <div className="space-y-8 pt-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Activity className="h-5.5 w-5.5 text-primary-500" />
              <span>Diagnostic Parameter Breakdown</span>
            </h2>

            {/* Standard parameter cards list */}
            {['blood_test', 'urine_test', 'other', ''].includes(report.reportType || '') && (
              <div className="space-y-6">
                {abnormalResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-red-700 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" /> 
                      <span>Abnormal Indicators ({abnormalResults.length})</span>
                    </h3>
                    <div className="grid gap-4">
                      {abnormalResults.map((res, idx) => (
                        <ResultCard key={`abnormal-${idx}`} result={res} theme="red" />
                      ))}
                    </div>
                  </div>
                )}

                {borderlineResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-amber-700 flex items-center">
                      <Activity className="h-5 w-5 mr-2" /> 
                      <span>Borderline Indicators ({borderlineResults.length})</span>
                    </h3>
                    <div className="grid gap-4">
                      {borderlineResults.map((res, idx) => (
                        <ResultCard key={`borderline-${idx}`} result={res} theme="amber" />
                      ))}
                    </div>
                  </div>
                )}

                {normalResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-emerald-700 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" /> 
                      <span>Normal Indicators ({normalResults.length})</span>
                    </h3>
                    <div className="grid gap-4">
                      {normalResults.map((res, idx) => (
                        <ResultCard key={`normal-${idx}`} result={res} theme="emerald" />
                      ))}
                    </div>
                  </div>
                )}

                {results.length === 0 && (
                  <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800">No Structured Parameters Extracted</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto leading-normal">
                      The AI interpreted the document text in the clinical summary but did not parse structured parameter key-values.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Imaging Layout */}
            {['imaging', 'x_ray', 'mri', 'ct_scan', 'ultrasound'].some(t => (report.reportType || '').includes(t)) && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                {report.extractedData?.bodyRegion && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">Scanned Anatomical Region</span>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{report.extractedData.bodyRegion}</p>
                  </div>
                )}
                {report.extractedData?.findings?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2">Observations / Findings</span>
                    <ul className="list-disc pl-5 text-gray-700 text-sm space-y-2">
                      {report.extractedData.findings.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {report.extractedData?.impression?.length > 0 && (
                  <div className="p-4.5 bg-primary-50/20 rounded-xl border border-primary-100">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600 block mb-2">Clinical Impression</span>
                    <ul className="list-disc pl-5 text-gray-800 text-sm space-y-2 font-medium">
                      {report.extractedData.impression.map((imp, i) => <li key={i}>{imp}</li>)}
                    </ul>
                  </div>
                )}
                {report.extractedData?.abnormalities?.length > 0 && (
                  <div className="p-4.5 bg-red-50/30 rounded-xl border border-red-100">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 block mb-2">Noted Pathologies</span>
                    <div className="flex flex-wrap gap-2">
                      {report.extractedData.abnormalities.map((ab, i) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg shadow-sm border border-red-200">
                          {ab}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ECG/EKG Layout */}
            {report.reportType === 'ecg' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Heart Rate</span>
                    <p className="text-2xl font-black text-gray-900 mt-1">{report.extractedData?.heartRate || 'N/A'} <span className="text-xs font-normal text-gray-400">bpm</span></p>
                  </div>
                  <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Rhythm</span>
                    <p className="text-base font-black text-gray-900 mt-2 truncate" title={report.extractedData?.rhythm}>{report.extractedData?.rhythm || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">PR Interval</span>
                    <p className="text-base font-black text-gray-900 mt-2">{report.extractedData?.prInterval || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">QRS Duration</span>
                    <p className="text-base font-black text-gray-900 mt-2">{report.extractedData?.qrsDuration || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm text-center col-span-2 md:col-span-1">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">QT / QTc Intervals</span>
                    <p className="text-base font-black text-gray-900 mt-2">
                      {report.extractedData?.qtInterval || 'N/A'} / {report.extractedData?.qtcInterval || 'N/A'}
                    </p>
                  </div>
                </div>
                {report.extractedData?.findings?.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2">Findings</span>
                    <ul className="list-disc pl-5 text-gray-700 text-sm space-y-2">
                      {report.extractedData.findings.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Layout */}
            {report.reportType === 'prescription' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Identified Medications</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Click import to map these to your schedules.</p>
                  </div>
                  {report.extractedData?.medications?.length > 0 && (
                    <button
                      onClick={handleImportMedications}
                      disabled={retranslating}
                      className="px-4.5 py-2 bg-gradient-to-r from-primary-600 to-blue-600 hover:shadow-md text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 self-start"
                    >
                      {retranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import to Medication Tracker'}
                    </button>
                  )}
                </div>
                
                <div className="p-0 overflow-x-auto table-responsive">
                  {report.extractedData?.medications?.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold text-[10px] tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Medication</th>
                          <th className="px-6 py-4">Dosage</th>
                          <th className="px-6 py-4">Frequency</th>
                          <th className="px-6 py-4">Duration</th>
                          <th className="px-6 py-4">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white text-gray-900 font-medium">
                        {report.extractedData.medications.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-bold text-gray-900">{m.name} {m.genericName && <span className="text-xs font-normal text-gray-400">({m.genericName})</span>}</td>
                            <td className="px-6 py-4">{m.dosage}</td>
                            <td className="px-6 py-4 capitalize">{m.frequency?.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-4">{m.duration || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{m.instructions || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-gray-400 italic">No medications identified in this prescription.</div>
                  )}
                </div>
              </div>
            )}

            {/* Discharge Summary Layout */}
            {report.reportType === 'discharge_summary' && (
              <div className="space-y-6">
                {report.extractedData?.diagnoses?.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2.5">Diagnoses</span>
                    <div className="flex flex-wrap gap-2">
                      {report.extractedData.diagnoses.map((d, i) => (
                        <span key={i} className="px-3.5 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg border border-blue-100 shadow-sm">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {report.extractedData?.procedures?.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2">Procedures Performed</span>
                    <ul className="list-disc pl-5 text-gray-700 text-sm space-y-2">
                      {report.extractedData.procedures.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {report.extractedData?.dischargeMedications?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto table-responsive">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">Discharge Medications</span>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold text-[10px] tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Medication</th>
                          <th className="px-6 py-4">Dosage</th>
                          <th className="px-6 py-4">Frequency</th>
                          <th className="px-6 py-4">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white text-gray-900 font-medium font-medium">
                        {report.extractedData.dischargeMedications.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                            <td className="px-6 py-4">{m.dosage}</td>
                            <td className="px-6 py-4 capitalize">{m.frequency?.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{m.instructions || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {report.extractedData?.carePlan && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2">Care Instructions & Diet</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{report.extractedData.carePlan}</p>
                  </div>
                )}
                {report.extractedData?.followUpInstructions?.length > 0 && (
                  <div className="p-5 bg-amber-50/30 border border-amber-100 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-2">Follow-up Instructions</span>
                    <ul className="list-disc pl-5 text-gray-800 text-sm space-y-2">
                      {report.extractedData.followUpInstructions.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sticky AI Assistant Chat */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[520px]">
            {/* Chat Widget Header */}
            <div className="bg-gray-50 px-5 py-4.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary-50 rounded-lg flex items-center justify-center border border-primary-100 text-primary-600">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-none">AI Clinician Chat</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Contextual health guide</span>
                </div>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={() => setChatHistory([])}
                  className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin bg-gray-50/30">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Sparkles className="h-8 w-8 text-primary-500 mb-3 animate-pulse" />
                  <h4 className="font-bold text-gray-800 text-sm">Ask about your results</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-normal">
                    Get clear answers about abnormal values, precautions, or medical terminology.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`
                      max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm
                      ${msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'}
                    `}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {answerLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                    <div className="flex gap-1.2 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Footer Suggested Questions / Input */}
            <div className="p-4 bg-white border-t border-gray-100 space-y-3">
              {chatHistory.length === 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'What does my summary mean?',
                    `What is ${report.aiAnalysis?.concerningValues?.[0] || 'my highest value'}?`,
                    'Are there warning indicators?'
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(suggestion)}
                      className="text-[10px] font-bold px-2.5 py-1 border border-primary-100 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleAskQuestion} className="relative flex items-center">
                <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={answerLoading}
                  className="w-full pl-3.5 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all outline-none text-gray-900 font-medium"
                  placeholder="Ask a question..."
                />
                <button 
                  type="submit" 
                  disabled={!question.trim() || answerLoading}
                  className="absolute right-1.5 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const ResultCard = ({ result, theme }) => {
  const parsed = parseRange(result.value, result.normalRange);

  const themeClasses = {
    red: {
      border: 'border-l-4 border-red-500',
      badge: 'critical',
      shadow: 'hover:shadow-red-50/50'
    },
    amber: {
      border: 'border-l-4 border-amber-500',
      badge: 'borderline',
      shadow: 'hover:shadow-amber-50/50'
    },
    emerald: {
      border: 'border-l-4 border-emerald-500',
      badge: 'normal',
      shadow: 'hover:shadow-emerald-50/50'
    }
  };

  const style = themeClasses[theme] || themeClasses.emerald;

  return (
    <div className={`bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between ${style.border} ${style.shadow}`}>
      {result.confidence === 'low' && (
        <div className="absolute top-0 right-0 left-0 bg-yellow-50/80 text-yellow-800 text-[10px] py-1 px-4 border-b border-yellow-100/50 flex items-center gap-1.5 font-bold">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
          <span>Extracted value not verified verbatim in document text. Confirm manually.</span>
        </div>
      )}
      
      {/* Parameter Info and Value Row */}
      <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100 ${result.confidence === 'low' ? 'mt-6' : ''}`}>
        <div>
          <h4 className="text-base font-extrabold text-gray-900 mb-1.5">{result.testName}</h4>
          <StatusBadge status={result.status} />
        </div>
        <div className="text-left sm:text-right bg-gray-50/50 p-3 rounded-xl border border-gray-100 min-w-[120px]">
          <div className="text-xl font-black text-gray-900 leading-none">
            {result.value} <span className="text-xs font-normal text-gray-400 ml-0.5">{result.unit}</span>
          </div>
          <div className="text-[10px] font-extrabold text-gray-400 mt-1.5 block">Ref: {result.normalRange || 'N/A'}</div>
        </div>
      </div>
      
      {/* Clinician Explanation */}
      <p className="text-gray-600 text-xs md:text-sm leading-relaxed mb-4">
        {result.explanation || 'No clinician explanation generated.'}
      </p>

      {/* Range Visualizer Slider */}
      {parsed && (
        <div className="mb-4 bg-gray-50/50 border border-gray-100 p-3 rounded-xl">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-2.5">Visual Range Indicator</span>
          <div className="h-1.5 w-full bg-gray-200/80 rounded-full relative border border-gray-200/50 mb-1.5">
            {/* Reference range shading block */}
            {parsed.type === 'range' && (
              <div className="absolute top-0 bottom-0 left-[25%] right-[25%] bg-emerald-500/10 rounded-sm"></div>
            )}
            {parsed.type === 'lessThan' && (
              <div className="absolute top-0 bottom-0 left-0 right-[25%] bg-emerald-500/10 rounded-sm"></div>
            )}
            {parsed.type === 'greaterThan' && (
              <div className="absolute top-0 bottom-0 left-[25%] right-0 bg-emerald-500/10 rounded-sm"></div>
            )}

            {/* Marker point */}
            <div 
              className={`h-3 w-3 rounded-full absolute -top-0.8 -ml-1.5 shadow-sm border border-white transition-all duration-500
                ${theme === 'emerald' ? 'bg-emerald-500 shadow-emerald-200' : theme === 'amber' ? 'bg-amber-500 shadow-amber-200' : 'bg-red-500 shadow-red-200'}`}
              style={{ left: `${parsed.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 font-extrabold">
            {parsed.type === 'range' ? (
              <>
                <span>Min: {parsed.min}</span>
                <span className="text-primary-600">Your Value: {parsed.val}</span>
                <span>Max: {parsed.max}</span>
              </>
            ) : parsed.type === 'lessThan' ? (
              <>
                <span>0</span>
                <span className="text-primary-600">Your Value: {parsed.val}</span>
                <span>Limit: &lt;{parsed.limit}</span>
              </>
            ) : (
              <>
                <span>0</span>
                <span className="text-primary-600">Your Value: {parsed.val}</span>
                <span>Limit: &gt;{parsed.limit}</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Symptoms & Actionable Remedies Row */}
      {(result.symptoms?.length > 0 || result.remedies?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mt-1 text-xs bg-blue-50/20 p-4 rounded-xl border border-blue-50/50">
          {result.symptoms?.length > 0 && (
            <div>
              <span className="font-extrabold text-gray-800 block mb-1.5">Associated manifestations:</span>
              <ul className="list-disc pl-4 text-gray-500 space-y-1">
                {result.symptoms.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
              </ul>
            </div>
          )}
          {result.remedies?.length > 0 && (
            <div>
              <span className="font-extrabold text-gray-800 block mb-1.5">Suggested next steps:</span>
              <ul className="list-disc pl-4 text-gray-500 space-y-1">
                {result.remedies.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDetailPage;
