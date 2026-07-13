import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import StatusBadge from '../components/ui/StatusBadge';
import PageLoader from '../components/ui/PageLoader';

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
          setError(`Cannot compare reports of different categories. First report is "${r1.reportType}" and second report is "${r2.reportType}".`);
        } else {
          setData(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to compare reports:', err);
      setError(
        err.response?.data?.error ||
        'Could not load comparison. Make sure both reports belong to you.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) return <PageLoader />;

  // ── Error state ──
  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Could Not Load Comparison</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/reports')}
          className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          ← Back to Reports
        </button>
      </div>
    );
  }

  // ── No data yet ──
  if (!data) return null;

  // ── Safe to destructure — data is confirmed non-null ──
  const {
    report1 = {},
    report2 = {},
    differences = [],
    onlyInReport1 = [],
    onlyInReport2 = []
  } = data;

  const date1 = report1.date ? format(new Date(report1.date), 'MMM dd, yyyy') : 'Unknown';
  const date2 = report2.date ? format(new Date(report2.date), 'MMM dd, yyyy') : 'Unknown';

  // Prepare chart data from differences (shared tests only)
  const chartData = differences
    .filter(d => !isNaN(parseFloat(d.value1)) && !isNaN(parseFloat(d.value2)))
    .map(item => ({
      name: item.testName,
      Report1: parseFloat(item.value1) || 0,
      Report2: parseFloat(item.value2) || 0,
      unit: item.unit
    }));

  const getStatusIcon = (status) => {
    if (status === 'Normal') return '✅';
    if (status === 'Borderline') return '⚠️';
    if (status === 'Abnormal') return '🔴';
    return '';
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/reports')} className="text-gray-500 hover:text-gray-900">
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compare Reports</h1>
          <p className="text-gray-500">Side-by-side analysis of your test results.</p>
        </div>
      </div>

      {/* Report header cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <h2 className="text-lg font-bold text-gray-900">{report1.title || 'Report 1'}</h2>
          <p className="text-sm text-gray-500">{date1}</p>
          {report1.reportType && <p className="text-xs text-gray-400 mt-1">{report1.reportType}</p>}
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <h2 className="text-lg font-bold text-gray-900">{report2.title || 'Report 2'}</h2>
          <p className="text-sm text-gray-500">{date2}</p>
          {report2.reportType && <p className="text-xs text-gray-400 mt-1">{report2.reportType}</p>}
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
          {differences.length} shared parameters
        </span>
        {onlyInReport1.length > 0 && (
          <span className="px-3 py-1 bg-blue-50 rounded-full text-sm text-blue-600">
            {onlyInReport1.length} only in Report 1
          </span>
        )}
        {onlyInReport2.length > 0 && (
          <span className="px-3 py-1 bg-indigo-50 rounded-full text-sm text-indigo-600">
            {onlyInReport2.length} only in Report 2
          </span>
        )}
      </div>

      {/* Shared parameters comparison table */}
      {differences.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10">
          <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider">
            <div className="p-4 border-r border-gray-200 text-center">Report 1 ({date1})</div>
            <div className="p-4 text-center">Report 2 ({date2})</div>
          </div>

          <div className="divide-y divide-gray-100">
            {differences.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 hover:bg-gray-50 transition-colors">
                <div className="p-4 border-b md:border-b-0 md:border-r border-gray-100">
                  <div className="font-medium text-gray-800 mb-1">{item.testName}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-900">{item.value1} {item.unit}</span>
                    <span className="flex items-center gap-1 text-gray-600">
                      {getStatusIcon(item.status1)} {item.status1}
                    </span>
                  </div>
                  {item.range && (
                    <div className="text-xs text-gray-400 mt-1">Range: {item.range}</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-medium text-gray-800 mb-1 md:hidden">{item.testName}</div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-900">{item.value2} {item.unit}</span>
                    <span className="flex items-center gap-1 text-gray-600">
                      {getStatusIcon(item.status2)} {item.status2}
                    </span>
                  </div>

                  {/* Delta / Change Indicator */}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    {item.changeType === 'worsened' && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                        ↑ {item.testName} worsened ({item.delta > 0 ? '+' : ''}{item.delta} {item.unit}) ⚠️
                      </span>
                    )}
                    {item.changeType === 'improved' && (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                        ↓ {item.testName} improved ({item.delta > 0 ? '+' : ''}{item.delta} {item.unit}) ✅
                      </span>
                    )}
                    {(item.changeType === 'no_change' || item.changeType === 'changed') && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {item.delta !== null ? `Δ ${item.delta > 0 ? '+' : ''}${item.delta} ${item.unit}` : 'No significant change'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tests only in Report 1 */}
      {onlyInReport1.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Only in Report 1</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {onlyInReport1.map((test, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-gray-800">
                    {test.parameter || test.testName}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {test.value} {test.unit}
                  </span>
                </div>
                <StatusBadge status={test.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tests only in Report 2 */}
      {onlyInReport2.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Only in Report 2</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {onlyInReport2.map((test, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-gray-800">
                    {test.parameter || test.testName}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {test.value} {test.unit}
                  </span>
                </div>
                <StatusBadge status={test.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {differences.length === 0 && onlyInReport1.length === 0 && onlyInReport2.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-medium">No test parameters found to compare.</p>
          <p className="text-sm mt-2">
            Both reports may be of different types, or the AI could not extract structured test values.
          </p>
        </div>
      )}

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Compare Values Visually</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value, name, props) => [`${value} ${props.payload.unit}`, name === 'Report1' ? (report1.title || 'Report 1') : (report2.title || 'Report 2')]}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Report1" fill="#93C5FD" name="Report 1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Report2" fill="#3B82F6" name="Report 2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
