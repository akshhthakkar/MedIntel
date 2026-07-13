import React, { useState, useEffect } from 'react';
import { timelineAPI } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import {
  Calendar,
  FileText,
  Activity,
  Heart,
  CheckCircle2,
  ChevronRight,
  Copy,
  Printer,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Stethoscope,
  Pill,
  Thermometer,
  BarChart2,
  ClipboardList,
  Zap,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const navy = '#152E57';
const navyLight = '#1A3C6E';
const navyMid = '#1e4a8c';

function cleanTitle(title = '') {
  return title.replace(/_/g, ' ').replace(/\.pdf$/i, '').replace(/\.jpg$/i, '');
}

const EVENT_CONFIG = {
  report: {
    label: 'Lab Report',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: <FileText className="w-[18px] h-[18px]" />,
  },
  medication: {
    label: 'Medication',
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: <Pill className="w-[18px] h-[18px]" />,
  },
  symptom: {
    label: 'Symptom Log',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: <Thermometer className="w-[18px] h-[18px]" />,
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color }} className="flex-shrink-0">{icon}</span>
      <span
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

function InfoCard({ children, accent }) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: '#fff',
        borderColor: accent ? `${accent}33` : '#e5e7eb',
        borderLeft: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

function IssueItem({ index, text }) {
  return (
    <li className="flex gap-3 items-start rounded-xl p-3"
      style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5"
        style={{ background: '#fda4af', color: '#9f1239' }}
      >
        {index + 1}
      </span>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState(null);
  const [summaryObj, setSummaryObj] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryTab, setSummaryTab] = useState('structured');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [filter]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await timelineAPI.getFull(filter !== 'all' ? { type: filter } : {});
      if (res.data.success) setEvents(res.data.data.events || []);
    } catch (err) {
      console.error('Timeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await timelineAPI.getDoctorSummary();
      if (res.data.success) {
        setSummary(res.data.data.summary);
        setSummaryObj(res.data.data.summaryObj);
        setSummaryTab('structured');
      }
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printDoctorSummary = () => {
    if (!summaryObj && !summary) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const issuesList = summaryObj?.keyIssues?.length
      ? summaryObj.keyIssues.map((issue, i) =>
          `<li style="margin-bottom:8px;padding:10px 12px;background:#fff8f8;border-left:3px solid #e53e3e;border-radius:4px;">
             <span style="font-weight:700;color:#c53030;margin-right:8px;">${i + 1}.</span>${issue}
           </li>`
        ).join('')
      : '<li style="color:#718096;">No specific issues flagged.</li>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MedIntel Clinical Handover Note</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a202c; background: #fff; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #152E57; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 42px; height: 42px; background: linear-gradient(135deg,#152E57,#1e4a8c); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .brand-icon svg { width: 24px; height: 24px; fill: none; stroke: white; stroke-width: 2; }
    .brand-name { font-size: 22px; font-weight: 800; color: #152E57; }
    .brand-name span { color: #0d9488; }
    .brand-tag { font-size: 10px; color: #718096; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #718096; line-height: 1.8; }
    .meta strong { color: #1a202c; }

    /* Document title */
    .doc-title { margin-bottom: 28px; }
    .doc-title h1 { font-size: 20px; font-weight: 800; color: #152E57; margin-bottom: 4px; }
    .doc-title p { font-size: 11px; color: #e53e3e; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

    /* Sections */
    .section { margin-bottom: 24px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .section-label::after { content: ''; flex: 1; height: 1px; background: currentColor; opacity: 0.2; }
    .section-body { font-size: 13px; color: #2d3748; line-height: 1.75; background: #f7fafc; border-radius: 6px; padding: 14px 16px; border-left: 3px solid currentColor; }

    .reason .section-label { color: #152E57; }
    .reason .section-body { border-color: #152E57; font-weight: 600; background: #ebf2ff; }
    .clinical .section-label { color: #2b6cb0; }
    .clinical .section-body { border-color: #2b6cb0; }
    .trends .section-label { color: #6b46c1; }
    .trends .section-body { border-color: #6b46c1; }

    /* Two column grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .grid-card { border-radius: 6px; padding: 14px 16px; }
    .grid-card h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .meds-card { background: #f0fff4; border: 1px solid #9ae6b4; }
    .meds-card h4 { color: #276749; }
    .symp-card { background: #fffbeb; border: 1px solid #f6e05e; }
    .symp-card h4 { color: #975a16; }
    .grid-card p { font-size: 12px; color: #4a5568; line-height: 1.7; white-space: pre-line; }

    /* Issues */
    .issues-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #c53030; margin-bottom: 10px; }
    .issues-list { list-style: none; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0; }
    .disclaimer { font-size: 9px; color: #cbd5e0; text-align: center; margin-top: 8px; font-style: italic; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div>
        <div class="brand-name">Med<span>Intel</span></div>
        <div class="brand-tag">Understand Today. Healthier Tomorrow.</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Document Type:</strong> Clinical Handover Note</div>
      <div><strong>Generated:</strong> ${dateStr} at ${timeStr}</div>
      <div><strong>Classification:</strong> Confidential — For Physician Review</div>
    </div>
  </div>

  <!-- Title -->
  <div class="doc-title">
    <h1>Pre-Consultation Clinical Summary</h1>
    <p>⚠ Not a medical diagnosis — prepared for physician review only</p>
  </div>

  <!-- Reason for Visit -->
  ${summaryObj?.reasonForVisit ? `
  <div class="section reason">
    <div class="section-label">Reason for Visit</div>
    <div class="section-body" style="border-color:#152E57;">${summaryObj.reasonForVisit}</div>
  </div>` : ''}

  <!-- Clinical Summary -->
  ${summaryObj?.clinicalSummary ? `
  <div class="section clinical">
    <div class="section-label" style="color:#2b6cb0;">Clinical Summary</div>
    <div class="section-body" style="border-color:#2b6cb0;">${summaryObj.clinicalSummary}</div>
  </div>` : ''}

  <!-- Laboratory Trends -->
  ${summaryObj?.laboratoryTrends ? `
  <div class="section trends">
    <div class="section-label" style="color:#6b46c1;">Laboratory Trends</div>
    <div class="section-body" style="border-color:#6b46c1;">${summaryObj.laboratoryTrends}</div>
  </div>` : ''}

  <!-- Medications + Symptoms grid -->
  <div class="grid-2">
    <div class="grid-card meds-card">
      <h4>Current Medications</h4>
      <p>${summaryObj?.currentMedications || 'No current medications reported.'}</p>
    </div>
    <div class="grid-card symp-card">
      <h4>Reported Symptoms</h4>
      <p>${summaryObj?.reportedSymptoms || 'No symptoms documented.'}</p>
    </div>
  </div>

  <!-- Key Issues -->
  ${summaryObj?.keyIssues?.length ? `
  <div class="section">
    <div class="issues-label">⚑ Key Issues for Physician Review</div>
    <ul class="issues-list">${issuesList}</ul>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>MedIntel · medintel.app</span>
    <span>Patient-generated document · ${dateStr}</span>
  </div>
  <div class="disclaimer">This document was automatically generated by MedIntel AI and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.</div>

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:center;margin-top:32px;">
    <button onclick="window.print()" style="background:#152E57;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:12px;">🖨 Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#f7fafc;color:#4a5568;border:1px solid #e2e8f0;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Close</button>
  </div>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  return (
    <div className="min-h-screen" style={{ background: '#F4F7FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                style={{ background: '#EBF2FF', color: navy }}
              >
                Health Record
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: navy }}>
              Your Health Timeline
            </h1>
            <p className="mt-1 text-sm text-gray-500 max-w-lg">
              A complete chronological record of your reports, medications, and symptom logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {/* Filter */}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="flex-1 sm:flex-initial text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none font-medium"
              style={{ color: navy }}
            >
              <option value="all">All Events</option>
              <option value="report">Reports</option>
              <option value="medication">Medications</option>
              <option value="symptom">Symptoms</option>
            </select>

            <button
              onClick={printDoctorSummary}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors"
              style={{ color: navy }}
            >
              <Printer className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ════════════════════════════════════
              LEFT: Timeline Events
          ════════════════════════════════════ */}
          <div className="xl:col-span-7">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 bg-white rounded-2xl h-28 border border-gray-100" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">Your timeline is empty</h3>
                <p className="text-sm text-gray-400">Upload a medical report, add a medication, or log symptoms to get started.</p>
              </div>
            ) : (
              <div className="relative pl-5">
                {/* Animated timeline rail */}
                <div
                  className="absolute top-3 bottom-3 left-[18px] w-0.5 rounded-full"
                  style={{
                    background: `linear-gradient(to bottom, ${navy}22, ${navy}55, ${navy}22)`,
                  }}
                />

                <div className="space-y-5">
                  {events.map((event, idx) => {
                    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.report;
                    return (
                      <div
                        key={`${event.type}-${event.id || idx}`}
                        className="flex gap-4 group"
                        style={{ animation: `fadeInUp 0.4s ease both`, animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Dot + Icon */}
                        <div className="relative flex-shrink-0 flex flex-col items-center z-10">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110"
                            style={{
                              background: cfg.bg,
                              border: `2px solid ${cfg.border}`,
                              color: cfg.color,
                            }}
                          >
                            {cfg.icon}
                          </div>
                        </div>

                        {/* Card */}
                        <div
                          className="flex-1 bg-white rounded-2xl border shadow-sm p-5 transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 overflow-hidden"
                          style={{ borderColor: '#e5e7eb' }}
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {cfg.icon && React.cloneElement(cfg.icon, { className: 'w-3 h-3' })}
                              {cfg.label}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.date), 'MMM d, yyyy')}
                            </span>
                          </div>

                          {/* Title */}
                          <h3
                            className="text-[15px] font-bold mb-1.5 leading-snug transition-colors group-hover:text-blue-700"
                            style={{ color: navy }}
                          >
                            {cleanTitle(event.title)}
                          </h3>

                          {/* Summary excerpt */}
                          {event.summary && (
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
                              {event.summary}
                            </p>
                          )}

                          {/* Footer row */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                              {event.type === 'report' && (
                                <>
                                  {event.subtype && (
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                      {event.subtype}
                                    </span>
                                  )}
                                  {event.abnormalCount > 0 ? (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                                      <AlertTriangle className="w-3 h-3" />
                                      {event.abnormalCount} abnormal
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                      <CheckCircle2 className="w-3 h-3" />
                                      All normal
                                    </span>
                                  )}
                                </>
                              )}

                              {event.type === 'medication' && (
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${event.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                  {event.isActive ? '● Active' : 'Completed'}
                                </span>
                              )}

                              {event.type === 'symptom' && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                                  Entry logged
                                </span>
                              )}
                            </div>

                            {event.type === 'report' && event.id && (
                              <a
                                href={`/reports/${event.id}`}
                                className="inline-flex items-center gap-1 text-[12px] font-bold transition-colors hover:underline"
                                style={{ color: navyMid }}
                              >
                                View Analysis
                                <ChevronRight className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════
              RIGHT: Doctor Summary Panel
          ════════════════════════════════════ */}
          <div className="xl:col-span-5">
            <div
              className="rounded-2xl overflow-hidden border sticky top-6 shadow-lg"
              style={{ borderColor: '#dde3ed', background: '#fff' }}
            >
              {/* ── Panel Header ── */}
              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{
                  background: `linear-gradient(135deg, ${navy} 0%, ${navyMid} 100%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-extrabold text-base leading-tight">Doctor Summary</h3>
                    <p className="text-blue-200 text-[11px]">AI-generated clinical note</p>
                  </div>
                </div>
                <span
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#bfdbfe' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  AI Powered
                </span>
              </div>

              {/* ── Empty / CTA ── */}
              {!summary && !loadingSummary && (
                <div className="px-6 py-10 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner"
                    style={{ background: '#EBF2FF' }}
                  >
                    <Stethoscope className="w-8 h-8" style={{ color: navy }} />
                  </div>
                  <h4 className="font-extrabold text-lg mb-2" style={{ color: navy }}>
                    Generate Handover Note
                  </h4>
                  <p className="text-sm text-gray-400 mb-7 leading-relaxed max-w-xs mx-auto">
                    Create a professional clinical summary from your lab results, medications, and symptoms — ready for your doctor.
                  </p>
                  <button
                    onClick={generateSummary}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                    style={{ background: `linear-gradient(135deg, ${navy}, ${navyMid})` }}
                  >
                    <Zap className="w-4 h-4" />
                    Generate Summary
                  </button>
                </div>
              )}

              {/* ── Loading Shimmer ── */}
              {loadingSummary && (
                <div className="px-6 py-8 space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 animate-pulse rounded-full w-1/2" />
                      <div className="h-2 bg-gray-100 animate-pulse rounded-full w-1/3" />
                    </div>
                  </div>
                  {[80, 100, 60, 90, 75].map((w, i) => (
                    <div key={i} className={`h-3 bg-gray-100 animate-pulse rounded-full`} style={{ width: `${w}%` }} />
                  ))}
                  <div className="h-20 bg-gray-100 animate-pulse rounded-xl mt-4" />
                  <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
                </div>
              )}

              {/* ── Generated Summary ── */}
              {summary && !loadingSummary && (
                <>
                  {/* Tabs */}
                  <div
                    className="flex items-center gap-1 px-4 py-2.5 border-b"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    {['structured', 'markdown'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSummaryTab(tab)}
                        className="px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-150"
                        style={
                          summaryTab === tab
                            ? { background: '#fff', color: navy, boxShadow: '0 1px 3px rgba(0,0,0,0.10)', border: '1px solid #e2e8f0' }
                            : { color: '#94a3b8' }
                        }
                      >
                        {tab === 'structured' ? 'Structured View' : 'Raw Text'}
                      </button>
                    ))}
                    <button
                      onClick={generateSummary}
                      className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  {/* ── STRUCTURED VIEW ── */}
                  {summaryTab === 'structured' && (
                    <div
                      className="p-5 space-y-5 overflow-y-auto"
                      style={{ maxHeight: '62vh' }}
                    >
                      {/* Reason for Visit */}
                      {summaryObj?.reasonForVisit && (
                        <div
                          className="rounded-2xl p-4"
                          style={{
                            background: `linear-gradient(135deg, ${navy}08, ${navyMid}12)`,
                            border: `1px solid ${navy}20`,
                          }}
                        >
                          <SectionHeader
                            icon={<Activity className="w-3.5 h-3.5" />}
                            label="Reason for Visit"
                            color={navy}
                          />
                          <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                            {summaryObj.reasonForVisit}
                          </p>
                        </div>
                      )}

                      {/* Clinical Summary */}
                      {summaryObj?.clinicalSummary && (
                        <InfoCard accent="#3b82f6">
                          <SectionHeader
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Clinical Summary"
                            color="#3b82f6"
                          />
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {summaryObj.clinicalSummary}
                          </p>
                        </InfoCard>
                      )}

                      {/* Lab Trends */}
                      {summaryObj?.laboratoryTrends && (
                        <InfoCard accent="#8b5cf6">
                          <SectionHeader
                            icon={<BarChart2 className="w-3.5 h-3.5" />}
                            label="Laboratory Trends"
                            color="#8b5cf6"
                          />
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {summaryObj.laboratoryTrends}
                          </p>
                        </InfoCard>
                      )}

                      {/* Medications + Symptoms grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl p-4" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <SectionHeader
                            icon={<Heart className="w-3.5 h-3.5" />}
                            label="Medications"
                            color="#059669"
                          />
                          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                            {summaryObj?.currentMedications || 'None reported.'}
                          </p>
                        </div>

                        <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                          <SectionHeader
                            icon={<Thermometer className="w-3.5 h-3.5" />}
                            label="Symptoms"
                            color="#d97706"
                          />
                          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                            {summaryObj?.reportedSymptoms || 'None documented.'}
                          </p>
                        </div>
                      </div>

                      {/* Key Issues */}
                      {summaryObj?.keyIssues?.length > 0 && (
                        <div>
                          <SectionHeader
                            icon={<AlertTriangle className="w-3.5 h-3.5" />}
                            label="Key Issues for Physician Review"
                            color="#dc2626"
                          />
                          <ul className="space-y-2">
                            {summaryObj.keyIssues.map((issue, i) => (
                              <IssueItem key={i} index={i} text={issue} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── RAW TEXT VIEW ── */}
                  {summaryTab === 'markdown' && (
                    <div className="p-5">
                      <textarea
                        readOnly
                        value={summary}
                        rows={18}
                        className="w-full p-4 text-xs font-mono rounded-xl resize-none focus:outline-none leading-relaxed"
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#374151',
                        }}
                      />
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div
                    className="px-5 py-4 flex items-center justify-end gap-2 border-t"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-xl border transition-all"
                      style={{
                        borderColor: '#d1d5db',
                        background: copied ? '#ecfdf5' : '#fff',
                        color: copied ? '#059669' : '#374151',
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={printDoctorSummary}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl text-white shadow-sm transition-all hover:-translate-y-0.5"
                      style={{ background: `linear-gradient(135deg, ${navy}, ${navyMid})` }}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
