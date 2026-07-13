import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { timelineAPI } from '../services/api';
import { 
  FileText, Activity, Pill, UploadCloud, 
  ChevronRight, AlertCircle
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await timelineAPI.getSummary();
      setData(res.data.data.summary);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Could not load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl border border-red-100 shadow-sm text-center animate-fade-in">
        <div className="h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Connection Error</h3>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchDashboardData();
          }}
          className="btn-primary w-full"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {data?.patient?.name?.split(' ')[0] || 'there'}!
        </h1>
        <Link to="/upload" className="btn-primary animate-fade-in w-full sm:w-auto justify-center">
          <UploadCloud className="h-4 w-4 mr-2" /> Upload Report
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <StatCard 
          title="Recent Reports" 
          value={data?.recentReports?.length || 0} 
          subtitle="In the last 30 days"
          icon={FileText}
          colorClass="bg-blue-50 text-blue-600"
          loading={loading}
        />
        <StatCard 
          title="Active Medications" 
          value={data?.activeMedications?.length || 0} 
          subtitle="Currently prescribed"
          icon={Pill}
          colorClass="bg-purple-50 text-purple-600"
          loading={loading}
        />
        <StatCard 
          title="Average Pain Level" 
          value={data?.symptomSummary?.averagePain || 'N/A'} 
          subtitle={`${data?.symptomSummary?.totalLogs || 0} logs this month`}
          icon={Activity}
          colorClass="bg-green-50 text-green-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
        {/* Recent Reports */}
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
            <Link to="/reports" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ) : data?.recentReports?.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {data.recentReports.slice(0, 3).map((report, idx) => (
                  <li key={idx} className="hover:bg-gray-50 transition-colors">
                    <Link to={`/reports/${report._id}`} className="block px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <span className="truncate">{report.type || 'Medical Report'}</span>
                            <span className="mx-2">•</span>
                            <time>{format(new Date(report.date || Date.now()), 'MMM d, yyyy')}</time>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState 
                icon={FileText}
                title="No recent reports"
                message="You haven't uploaded any medical reports in the last 30 days."
                actionLabel="Upload Now"
                onAction={() => window.location.href = '/upload'}
              />
            )}
          </div>
        </div>

        {/* Active Medications & Top Symptoms */}
        <div className="space-y-6">
          <div className="card px-6 py-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Medications</h3>
              <Link to="/medications" className="text-sm font-medium text-primary-600 hover:text-primary-700">Manage</Link>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ) : data?.activeMedications?.length > 0 ? (
              <ul className="space-y-3">
                {data.activeMedications.slice(0, 4).map((med, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{med.name}</p>
                        <p className="text-xs text-gray-500">{med.dosage} • {med.frequency.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center border border-gray-100 border-dashed">
                No active medications scheduled.
              </p>
            )}
          </div>

          <div className="card px-6 py-5">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Frequent Symptoms</h3>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 rounded w-full animate-pulse"></div>
                <div className="h-8 bg-gray-100 rounded w-3/4 animate-pulse"></div>
              </div>
            ) : data?.symptomSummary?.topSymptoms?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.symptomSummary.topSymptoms.map((sym, idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    {sym.name} <span className="ml-1.5 opacity-70 text-[10px]">{sym.count}x</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center border border-gray-100 border-dashed">
                No symptoms logged recently.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
