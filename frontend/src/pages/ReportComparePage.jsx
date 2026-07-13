import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import PageLoader from '../components/ui/PageLoader';

// ── Status helpers ─────────────────────────────────────────────────────────
const statusColor = {
  Normal: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Borderline: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  Abnormal: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

const StatusPill = ({ status }) => {
  const s = statusColor[status] || { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || 'Unknown'}
    </span>
  );
};

const ChangeChip = ({ changeType, delta, unit }) => {
  if (changeType === 'improved') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <TrendingDown className="h-3 w-3" />
        Improved {delta !== null ? `(${delta > 0 ? '+' : ''}${delta} ${unit || ''})`.trim() : ''}
      </span>
    );
  }
  if (changeType === 'worsened') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
        <TrendingUp className="h-3 w-3" />
        Worsened {delta !== null ? `(${delta > 0 ? '+' : ''}${delta} ${unit || ''})`.trim() : ''}
      </span>
    );
  }
  const label = delta !== null ? `Δ ${delta > 0 ? '+' : ''}${delta} ${unit || ''}`.trim() : 'No change';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
      <Minus className="h-3 w-3" />
      {label}
    </span>
  );
};

// ── Custom tooltip for chart ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, r1Title, r2Title, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[160px]">
        <p className="text-xs font-extrabold text-gray-800 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs mb-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-500">{i === 0 ? r1Title : r2Title}:</span>
            <span className="font-bold text-gray-800">{p.value} {unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportComparePage() {
  const [searchParams] = useSearchParams();
  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id1 || !id2) {
      setError('Two report IDs are required. Go back and select 2 reports.');
      setLoading(false);
      return;
    }
    fetchComparison();
  }, [id1, id2]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsAPI.compare(id1, id2);
      if (res.data.success) {
        const r1 = res.data.data.report1;
        const r2 = res.data.data.report2;
        if (r1.reportType && r2.reportType && r1.reportType !== r2.reportType) {
          setError(`Cannot compare reports of different categories. First report is "${r1.reportType}" and second is "${r2.reportType}".`);
        } else {
          setData(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to compare reports:', err);
      setError(err.response?.data?.error || 'Could not load comparison. Make sure both reports belong to you.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Could Not Load Comparison</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    report1 = {},
    report2 = {},
    differences = [],
    onlyInReport1 = [],
    onlyInReport2 = []
  } = data;

  const date1 = report1.date ? format(new Date(report1.date), 'MMM d, yyyy') : 'Unknown';
  const date2 = report2.date ? format(new Date(report2.date), 'MMM d, yyyy') : 'Unknown';
  const r1Title = report1.title || 'Report 1';
  const r2Title = report2.title || 'Report 2';

  const improved = differences.filter(d => d.changeType === 'improved').length;
  const worsened = differences.filter(d => d.changeType === 'worsened').length;
  const unchanged = differences.length - improved - worsened;

  // Chart — only numeric shared params
  const chartData = differences
    .filter(d => !isNaN(parseFloat(d.value1)) && !isNaN(parseFloat(d.value2)))
    .slice(0, 12) // cap at 12 for readability
    .map(item => ({
      name: item.testName?.length > 14 ? item.testName.slice(0, 13) + '…' : item.testName,
      fullName: item.testName,
      Report1: parseFloat(item.value1) || 0,
      Report2: parseFloat(item.value2) || 0,
      unit: item.unit || '',
    }));

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 mb-8 pt-2">
        <button
          onClick={() => navigate('/reports')}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 leading-none">Report Comparison</h1>
          <p className="text-sm text-gray-400 mt-1">Side-by-side analysis of your health parameters over time.</p>
        </div>
      </div>

      {/* ── Report Header Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {[
          {
            report: report1, date: date1, label: 'Earlier Report', num: 1,
            style: { background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #4F46E5 100%)' }
          },
          {
            report: report2, date: date2, label: 'Later Report', num: 2,
            style: { background: 'linear-gradient(135deg, #152E57 0%, #1A3C6E 50%, #1E40AF 100%)' }
          },
        ].map(({ report, date, label, num, style }) => (
          <div key={num} className="rounded-2xl p-6 text-white shadow-lg" style={style}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 block mb-1">{label}</span>
                <h2 className="text-lg font-extrabold leading-snug mb-1">{report.title || `Report ${num}`}</h2>
                <p className="text-sm text-white/70">{date}</p>
              </div>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <span className="text-lg font-black text-white">R{num}</span>
              </div>
            </div>
            {report.reportType && (
              <span className="mt-3 inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {report.reportType.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Summary Stat Chips ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-700">{differences.length} shared parameters</span>
        </div>
        {improved > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
            <TrendingDown className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{improved} improved</span>
          </div>
        )}
        {worsened > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <TrendingUp className="h-4 w-4 text-red-600" />
            <span className="text-sm font-bold text-red-700">{worsened} worsened</span>
          </div>
        )}
        {unchanged > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
            <Minus className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-600">{unchanged} unchanged</span>
          </div>
        )}
        {onlyInReport1.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <span className="text-sm font-bold text-blue-700">{onlyInReport1.length} only in R1</span>
          </div>
        )}
        {onlyInReport2.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm">
            <span className="text-sm font-bold text-indigo-700">{onlyInReport2.length} only in R2</span>
          </div>
        )}
      </div>

      {/* ── Shared Parameters Comparison Table ── */}
      {differences.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-10">
          {/* Table Header */}
          <div className="grid grid-cols-11 bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
            <div className="col-span-3 px-5 py-3.5">Parameter</div>
            <div className="col-span-3 px-4 py-3.5 border-l border-gray-200 text-center">{r1Title} ({date1})</div>
            <div className="col-span-3 px-4 py-3.5 border-l border-gray-200 text-center">{r2Title} ({date2})</div>
            <div className="col-span-2 px-4 py-3.5 border-l border-gray-200 text-center">Change</div>
          </div>

          <div className="divide-y divide-gray-100">
            {differences.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-11 hover:bg-gray-50/50 transition-colors ${
                  item.changeType === 'worsened' ? 'border-l-4 border-l-red-400' :
                  item.changeType === 'improved' ? 'border-l-4 border-l-emerald-400' :
                  'border-l-4 border-l-transparent'
                }`}
              >
                {/* Parameter name */}
                <div className="col-span-3 px-5 py-4 flex flex-col justify-center">
                  <span className="font-bold text-sm text-gray-900">{item.testName}</span>
                  {item.range && (
                    <span className="text-[11px] text-gray-400 mt-0.5">Range: {item.range}</span>
                  )}
                </div>

                {/* Report 1 value */}
                <div className="col-span-3 px-4 py-4 border-l border-gray-100 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-base font-extrabold text-gray-800">
                    {item.value1}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                  <StatusPill status={item.status1} />
                </div>

                {/* Report 2 value */}
                <div className="col-span-3 px-4 py-4 border-l border-gray-100 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-base font-extrabold text-gray-800">
                    {item.value2}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                  <StatusPill status={item.status2} />
                </div>

                {/* Change chip */}
                <div className="col-span-2 px-4 py-4 border-l border-gray-100 flex items-center justify-center">
                  <ChangeChip changeType={item.changeType} delta={item.delta} unit={item.unit} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Bar Chart ── */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Visual Comparison</h3>
              <p className="text-xs text-gray-400 mt-0.5">Numeric parameter values side-by-side</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 20 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip r1Title={r1Title} r2Title={r2Title} />} />
                <Legend
                  iconType="circle"
                  formatter={(value) => (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      {value === 'Report1' ? r1Title : r2Title}
                    </span>
                  )}
                />
                <Bar dataKey="Report1" fill="#93C5FD" name="Report1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Report2" fill="#2563EB" name="Report2" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Unique Parameters ── */}
      {(onlyInReport1.length > 0 || onlyInReport2.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {onlyInReport1.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100">
                <h3 className="text-sm font-extrabold text-blue-800">Only in {r1Title}</h3>
                <p className="text-[11px] text-blue-500 mt-0.5">Parameters not tested in the second report</p>
              </div>
              <div className="divide-y divide-gray-100">
                {onlyInReport1.map((test, idx) => (
                  <div key={idx} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-sm text-gray-800">{test.parameter || test.testName}</span>
                      <span className="text-gray-500 text-sm ml-2">{test.value} {test.unit}</span>
                    </div>
                    <StatusPill status={test.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {onlyInReport2.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-indigo-50 border-b border-indigo-100">
                <h3 className="text-sm font-extrabold text-indigo-800">Only in {r2Title}</h3>
                <p className="text-[11px] text-indigo-500 mt-0.5">Parameters not tested in the first report</p>
              </div>
              <div className="divide-y divide-gray-100">
                {onlyInReport2.map((test, idx) => (
                  <div key={idx} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-sm text-gray-800">{test.parameter || test.testName}</span>
                      <span className="text-gray-500 text-sm ml-2">{test.value} {test.unit}</span>
                    </div>
                    <StatusPill status={test.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ── */}
      {differences.length === 0 && onlyInReport1.length === 0 && onlyInReport2.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-700 mb-2">No parameters found to compare</p>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Both reports may be of different types, or the AI could not extract structured test values from the documents.
          </p>
        </div>
      )}
    </div>
  );
}
