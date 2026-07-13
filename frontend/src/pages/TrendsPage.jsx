import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend
} from 'recharts';
import { format } from 'date-fns';
import {
  Activity, TrendingUp, TrendingDown, Minus,
  BarChart3, AlertTriangle, CheckCircle, ChevronRight,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';

const navy = '#152E57';
const teal = '#0d9488';

// ── Custom tooltip
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  const { originalValue, status } = payload[0].payload;
  const statusColor =
    status?.toLowerCase() === 'normal' ? '#059669' :
    status?.toLowerCase() === 'borderline' ? '#d97706' : '#dc2626';
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      minWidth: 140
    }}>
      <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: navy }}>{originalValue} <span style={{ fontSize: 12, color: '#94a3b8' }}>{unit}</span></p>
      {status && (
        <span style={{
          display: 'inline-block',
          marginTop: 4,
          padding: '2px 8px',
          borderRadius: 99,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          background: `${statusColor}18`,
          color: statusColor,
        }}>
          {status}
        </span>
      )}
    </div>
  );
};

// ── Custom dot
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const status = payload?.status?.toLowerCase();
  const color = status === 'normal' ? '#059669' : status === 'borderline' ? '#d97706' : '#dc2626';
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#fff" stroke={color} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={3} fill={color} />
    </g>
  );
};

export default function TrendsPage() {
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParameter, setSelectedParameter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTrends(); }, []);

  const fetchTrends = async () => {
    try {
      const res = await reportsAPI.trends();
      const rawTrends = res.data.data.trends || {};
      const grouped = Array.isArray(rawTrends)
        ? rawTrends
        : Object.entries(rawTrends).map(([testName, values]) => ({
            testName, values, count: values.length
          }));
      setTrendsData(grouped);
      if (grouped.length > 0) setSelectedParameter(grouped[0].testName);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const getChartData = () => {
    const p = trendsData.find(d => d.testName === selectedParameter);
    if (!p) return { data: [], unit: '', range: '' };
    const data = p.values.map(v => ({
      date: format(new Date(v.date), 'MMM d'),
      timestamp: new Date(v.date).getTime(),
      value: parseFloat(v.value.replace(/[^0-9.]/g, '')),
      originalValue: v.value,
      status: v.status
    })).sort((a, b) => a.timestamp - b.timestamp);
    return { data, unit: p.values[0]?.unit || '', range: p.values[0]?.normalRange || '' };
  };

  const { data: chartData, unit, range } = getChartData();

  // Trend direction
  let trendDir = null, trendPct = '0%';
  if (chartData.length >= 2) {
    const first = chartData[0].value, last = chartData[chartData.length - 1].value;
    if (first && last && first !== 0) {
      const diff = last - first;
      trendDir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      trendPct = Math.abs((diff / first) * 100).toFixed(1) + '%';
    }
  }

  // Most recent status
  const lastStatus = chartData.length ? chartData[chartData.length - 1].status?.toLowerCase() : null;
  const statusColor = lastStatus === 'normal' ? '#059669' : lastStatus === 'borderline' ? '#d97706' : '#dc2626';
  const statusBg = lastStatus === 'normal' ? '#f0fdf4' : lastStatus === 'borderline' ? '#fffbeb' : '#fef2f2';

  const filtered = trendsData.filter(d =>
    d.testName.toLowerCase().includes(search.toLowerCase())
  );

  const trendColor = trendDir === 'down' ? '#059669' : trendDir === 'up' ? '#dc2626' : '#6b7280';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="h-8 w-56 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (trendsData.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-16 text-center px-4">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: '#EBF2FF' }}>
          <BarChart3 className="w-10 h-10" style={{ color: navy }} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: navy }}>No trend data yet</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Upload at least two medical reports containing the same lab test to see trends over time.</p>
        <Link to="/upload"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
          <Upload className="w-4 h-4" /> Upload a Report
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
            style={{ background: '#EBF2FF', color: navy }}>
            Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: navy }}>Health Trends</h1>
          <p className="text-sm text-gray-500 mt-1">Track how your biomarkers evolve across reports over time.</p>
        </div>
        <span className="text-sm font-semibold px-3 py-1.5 rounded-xl flex-shrink-0" style={{ background: '#f1f5f9', color: '#64748b' }}>
          {trendsData.length} parameter{trendsData.length !== 1 ? 's' : ''} tracked
        </span>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
        {/* ── Sidebar: horizontal scroll chips on mobile, vertical list on desktop */}
        <div className="lg:col-span-3">
          {/* Mobile: horizontal chip scroll */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {filtered.map((d, idx) => {
              const isActive = selectedParameter === d.testName;
              const st = d.values[d.values.length - 1]?.status?.toLowerCase();
              const dotColor = st === 'normal' ? '#059669' : st === 'borderline' ? '#d97706' : '#dc2626';
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedParameter(d.testName)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all"
                  style={isActive
                    ? { background: navy, color: '#fff', borderColor: navy }
                    : { background: '#f8fafc', color: '#374151', borderColor: '#e2e8f0' }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? '#fff' : dotColor }} />
                  {d.testName}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical sidebar */}
          <div className="hidden lg:flex bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-col" style={{ maxHeight: 640 }}>
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search parameters…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No parameters found</p>
              )}
              {filtered.map((d, idx) => {
                const isActive = selectedParameter === d.testName;
                const st = d.values[d.values.length - 1]?.status?.toLowerCase();
                const dotColor = st === 'normal' ? '#059669' : st === 'borderline' ? '#d97706' : '#dc2626';
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedParameter(d.testName)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 transition-colors flex items-center justify-between gap-2 group"
                    style={isActive ? { background: '#EBF2FF' } : {}}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? navy : dotColor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: isActive ? navy : '#374151' }}>{d.testName}</p>
                        <p className="text-[11px] text-gray-400">{d.count} data point{d.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Chart Area */}
        <div className="lg:col-span-9 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Latest Value */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Latest Value</p>
              <p className="text-2xl font-black" style={{ color: navy }}>
                {chartData.length ? chartData[chartData.length - 1].originalValue : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
              </p>
            </div>
            {/* Status */}
            <div className="rounded-2xl border shadow-sm p-5" style={{ background: statusBg, borderColor: `${statusColor}30` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: statusColor }}>
                Current Status
              </p>
              <p className="text-xl font-extrabold capitalize" style={{ color: statusColor }}>
                {lastStatus || '—'}
              </p>
            </div>
            {/* Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Trend</p>
              <div className="flex items-center gap-2">
                {trendDir === 'up' && <TrendingUp className="w-5 h-5" style={{ color: trendColor }} />}
                {trendDir === 'down' && <TrendingDown className="w-5 h-5" style={{ color: trendColor }} />}
                {trendDir === 'flat' && <Minus className="w-5 h-5 text-gray-400" />}
                {!trendDir && <Minus className="w-5 h-5 text-gray-300" />}
                <span className="text-xl font-extrabold" style={{ color: trendColor }}>
                  {trendDir ? trendPct : '—'}
                </span>
              </div>
              {range && <p className="text-[11px] text-gray-400 mt-1">Ref: {range}</p>}
            </div>
          </div>

          {/* Chart card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold" style={{ color: navy }}>{selectedParameter}</h2>
                {range && <p className="text-xs text-gray-400 mt-0.5">Normal range: {range} {unit}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Normal</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Borderline</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Abnormal</span>
              </div>
            </div>

            {chartData.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-gray-500 text-sm font-medium">Need at least 2 reports to draw a trend line.</p>
                <p className="text-gray-400 text-xs mt-1">Upload more reports containing <strong>{selectedParameter}</strong>.</p>
              </div>
            ) : (
              <div style={{ height: 260 }} className="sm:h-80 lg:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={navy} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={navy} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dx={-8}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip unit={unit} />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={navy}
                      strokeWidth={2.5}
                      dot={<CustomDot />}
                      activeDot={{ r: 9, fill: navy, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
