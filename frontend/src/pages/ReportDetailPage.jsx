import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { reportsAPI, medicationsAPI } from '../services/api';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, Activity, Globe, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';

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
  // Each entry: { role: 'user'|'assistant', content: string }

  const chatBottomRef = useRef(null);

  const languages = ['English', 'Spanish', 'French', 'Hindi', 'Chinese', 'Arabic', 'Russian'];

  useEffect(() => {
    fetchReport();
  }, [id]);

  // Auto-scroll when chatHistory updates
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
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-pulse">
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
        <div className="h-6 w-48 bg-gray-200 rounded mt-8"></div>
        <div className="grid gap-4 mt-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-1/3">
                <div className="h-5 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
              </div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Report not found</h2>
        <Link to="/reports" className="mt-4 text-primary-600 hover:underline">Return to reports</Link>
      </div>
    );
  }

  if (report.processingStatus === 'processing') {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        <h2 className="text-xl font-medium text-gray-700">AI is analyzing your report...</h2>
        <p className="text-gray-500">This usually takes 10-20 seconds. Please wait.</p>
      </div>
    );
  }

  const results = report.extractedData?.testResults || [];
  const abnormalResults = results.filter(r => ['abnormal', 'high', 'low', 'critical'].includes(r.status?.toLowerCase()));
  const normalResults = results.filter(r => r.status?.toLowerCase() === 'normal');
  const borderlineResults = results.filter(r => r.status?.toLowerCase() === 'borderline');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <Link to="/reports" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 py-1">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to reports
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white border border-gray-300 rounded-md shadow-sm flex-1 sm:flex-initial">
            <Globe className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="pl-2 pr-8 py-2 border-0 focus:ring-0 text-sm text-gray-700 bg-transparent rounded-md flex-1 sm:flex-initial"
            >
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {lang !== report.language && (
              <button 
                onClick={handleRetranslate}
                disabled={retranslating}
                className="px-3 py-2 bg-primary-50 text-primary-700 text-sm font-medium border-l border-gray-300 hover:bg-primary-100 disabled:opacity-50"
              >
                {retranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Translate'}
              </button>
            )}
          </div>
          {report.fileUrl && (
            <a href={report.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary flex-1 sm:flex-initial justify-center">
              <Download className="h-4 w-4 mr-2" /> Original PDF
            </a>
          )}
        </div>
      </div>

      {/* Title Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-blue-600 px-5 py-6 sm:px-6 sm:py-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
              <FileText className="h-3 w-3 mr-1" /> {report.reportType || 'Medical Report'}
            </span>
            <span className="text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              {format(new Date(report.date || Date.now()), 'MMMM d, yyyy')}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold leading-tight">{report.title}</h1>
        </div>
        
        <div className="p-6 sm:p-8 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold tracking-wider text-gray-500 uppercase mb-3">AI Overall Summary</h3>
          <p className="text-gray-800 text-lg leading-relaxed">
            {report.aiAnalysis?.overallSummary || 'No summary available.'}
          </p>
        </div>
      </div>

      {/* Test Results Breakdown */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Detailed Findings</h2>

        {/* 1. Blood Test & Urine Test (standard parameters view) */}
        {(report.reportType === 'blood_test' || report.reportType === 'urine_test' || report.reportType === 'other' || !report.reportType) && (
          <>
            {abnormalResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-red-700 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" /> Abnormal Results ({abnormalResults.length})
                </h3>
                <div className="grid gap-4">
                  {abnormalResults.map((res, idx) => (
                    <ResultCard key={`abnormal-${idx}`} result={res} />
                  ))}
                </div>
              </div>
            )}

            {borderlineResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-yellow-700 flex items-center">
                  <Activity className="h-5 w-5 mr-2" /> Borderline Results ({borderlineResults.length})
                </h3>
                <div className="grid gap-4">
                  {borderlineResults.map((res, idx) => (
                    <ResultCard key={`borderline-${idx}`} result={res} />
                  ))}
                </div>
              </div>
            )}

            {normalResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-green-700 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" /> Normal Results ({normalResults.length})
                </h3>
                <div className="grid gap-4">
                  {normalResults.map((res, idx) => (
                    <ResultCard key={`normal-${idx}`} result={res} />
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No structured data found</h3>
                <p className="mt-1 text-sm text-gray-500">The AI could not extract specific test values from this document.</p>
              </div>
            )}
          </>
        )}

        {/* 2. Imaging View */}
        {(report.reportType === 'imaging' || report.reportType === 'x_ray' || report.reportType === 'mri' || report.reportType === 'ct_scan') && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
            {report.extractedData?.bodyRegion && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Scanned Region</span>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{report.extractedData.bodyRegion}</p>
              </div>
            )}
            {report.extractedData?.findings?.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Findings</span>
                <ul className="list-disc pl-5 text-gray-700 space-y-1.5">
                  {report.extractedData.findings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {report.extractedData?.impression?.length > 0 && (
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-2">Clinical Impression</span>
                <ul className="list-disc pl-5 text-gray-800 space-y-1.5 font-medium">
                  {report.extractedData.impression.map((imp, i) => <li key={i}>{imp}</li>)}
                </ul>
              </div>
            )}
            {report.extractedData?.abnormalities?.length > 0 && (
              <div className="p-4 bg-red-50/50 rounded-lg border border-red-100">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 block mb-2">Noted Abnormalities</span>
                <div className="flex flex-wrap gap-2">
                  {report.extractedData.abnormalities.map((ab, i) => (
                    <span key={i} className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                      {ab}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. ECG View */}
        {report.reportType === 'ecg' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-xs text-gray-400 block uppercase font-bold">Heart Rate</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">{report.extractedData?.heartRate || 'N/A'} bpm</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-xs text-gray-400 block uppercase font-bold">Rhythm</span>
                <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={report.extractedData?.rhythm}>{report.extractedData?.rhythm || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-xs text-gray-400 block uppercase font-bold">PR Interval</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{report.extractedData?.prInterval || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-xs text-gray-400 block uppercase font-bold">QRS Duration</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{report.extractedData?.qrsDuration || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center col-span-2 md:col-span-1">
                <span className="text-xs text-gray-400 block uppercase font-bold">QT / QTc</span>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {report.extractedData?.qtInterval || 'N/A'} / {report.extractedData?.qtcInterval || 'N/A'}
                </p>
              </div>
            </div>
            {report.extractedData?.findings?.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Findings</span>
                <ul className="list-disc pl-5 text-gray-700 space-y-1.5">
                  {report.extractedData.findings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 4. Prescription View */}
        {report.reportType === 'prescription' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Extracted Medications</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select and import these medications directly into your care schedule.</p>
              </div>
              {report.extractedData?.medications?.length > 0 && (
                <button
                  onClick={handleImportMedications}
                  disabled={retranslating}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  {retranslating ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Import to Schedule'}
                </button>
              )}
            </div>
            
            <div className="p-0 overflow-x-auto table-responsive">
              {report.extractedData?.medications?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-500">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-3">Medication</th>
                      <th className="px-6 py-3">Dosage</th>
                      <th className="px-6 py-3">Frequency</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
                    {report.extractedData.medications.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-semibold">{m.name} {m.genericName && <span className="text-xs font-normal text-gray-400">({m.genericName})</span>}</td>
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

        {/* 5. Discharge Summary View */}
        {report.reportType === 'discharge_summary' && (
          <div className="space-y-6">
            {report.extractedData?.diagnoses?.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Diagnoses</span>
                <div className="flex flex-wrap gap-2">
                  {report.extractedData.diagnoses.map((d, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-100">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.extractedData?.procedures?.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Procedures Performed</span>
                <ul className="list-disc pl-5 text-gray-700 space-y-1.5">
                  {report.extractedData.procedures.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {report.extractedData?.dischargeMedications?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto table-responsive">
                <div className="p-4 bg-gray-50 border-b border-gray-200 min-w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Discharge Medications</span>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-500">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-3">Medication</th>
                      <th className="px-6 py-3">Dosage</th>
                      <th className="px-6 py-3">Frequency</th>
                      <th className="px-6 py-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
                    {report.extractedData.dischargeMedications.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-semibold">{m.name}</td>
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
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Care Plan & Diet</span>
                <p className="text-gray-700 leading-relaxed">{report.extractedData.carePlan}</p>
              </div>
            )}
            {report.extractedData?.followUpInstructions?.length > 0 && (
              <div className="p-5 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-700 block mb-2">Follow-up Instructions</span>
                <ul className="list-disc pl-5 text-gray-800 space-y-1.5">
                  {report.extractedData.followUpInstructions.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Q&A Section */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-bold text-gray-900">Ask a Question</h2>
          </div>
          {chatHistory.length > 0 && (
            <button
              onClick={() => setChatHistory([])}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Clear chat
            </button>
          )}
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">Have questions about your report? Ask our AI medical assistant for simple, easy-to-understand explanations.</p>
          
          {/* Chat Messages */}
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto p-4 mb-4">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm
                  ${msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'}
                `}>
                  {msg.content}
                </div>
              </div>
            ))}
            {answerLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggested Questions */}
          {chatHistory.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                'What does my overall result mean?',
                `What is ${report.aiAnalysis?.concerningValues?.[0] || 'my most concerning value'}?`,
                'Should I be worried about anything?'
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(suggestion)}
                  className="text-xs px-3 py-1.5 border border-primary-200 text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleAskQuestion} className="relative">
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={answerLoading}
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
              placeholder="E.g. What does a high Hemoglobin level mean for me?"
            />
            <button 
              type="submit" 
              disabled={!question.trim() || answerLoading}
              className="absolute right-2 top-2 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ResultCard = ({ result }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {result.confidence === 'low' && (
        <div className="absolute top-0 right-0 left-0 bg-yellow-50 text-yellow-700 text-xs py-1.5 px-4 border-b border-yellow-100 flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Value is not found verbatim in document. Verify accuracy manually.</span>
        </div>
      )}
      <div className={`flex flex-col sm:flex-row sm:items-start justify-between mb-4 pb-4 border-b border-gray-100 ${result.confidence === 'low' ? 'mt-8' : ''}`}>
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-1">{result.testName}</h4>
          <StatusBadge status={result.status} />
        </div>
        <div className="mt-3 sm:mt-0 text-left sm:text-right bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {result.value} <span className="text-sm font-medium text-gray-500">{result.unit}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Ref: {result.normalRange || 'N/A'}</div>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">
        {result.explanation || 'No explanation provided.'}
      </p>
      
      {(result.symptoms?.length > 0 || result.remedies?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm bg-blue-50/50 p-4 rounded-lg">
          {result.symptoms?.length > 0 && (
            <div>
              <span className="font-bold text-gray-900 block mb-2">Possible Symptoms:</span>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {result.remedies?.length > 0 && (
            <div>
              <span className="font-bold text-gray-900 block mb-2">Actionable Steps:</span>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                {result.remedies.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDetailPage;
