import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { reportsAPI } from '../services/api';
import { 
  FileText, Search, Plus, Trash2, Loader2, ChevronRight, 
  Activity, AlertCircle, Sparkles, Filter, CheckCircle2, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const categoryTabs = [
  { id: 'all', label: 'All Reports', countKey: 'all' },
  { id: 'blood', label: 'Blood Tests', countKey: 'blood' },
  { id: 'imaging', label: 'Imaging & Scans', countKey: 'imaging' },
  { id: 'prescription', label: 'Prescriptions', countKey: 'prescription' },
  { id: 'ecg', label: 'ECG/EKG', countKey: 'ecg' },
  { id: 'urinalysis', label: 'Urinalysis', countKey: 'urine_test' },
  { id: 'other', label: 'Other Docs', countKey: 'other' }
];

const matchesTab = (reportType, tabId) => {
  if (tabId === 'all') return true;
  const type = reportType?.toLowerCase() || '';
  if (tabId === 'blood') {
    return ['cbc', 'lipid panel', 'lft', 'thyroid profile', 'diabetes panel', 'blood_test', 'blood'].some(t => type.includes(t));
  }
  if (tabId === 'imaging') {
    return ['x_ray', 'imaging', 'mri', 'ct_scan', 'ultrasound', 'imaging/radiology report', 'x-ray', 'scan'].some(t => type.includes(t));
  }
  if (tabId === 'prescription') {
    return type === 'prescription';
  }
  if (tabId === 'ecg') {
    return type === 'ecg';
  }
  if (tabId === 'urinalysis') {
    return type === 'urine_test' || type.includes('urine');
  }
  if (tabId === 'other') {
    const isStandard = ['cbc', 'lipid panel', 'lft', 'thyroid profile', 'diabetes panel', 'blood_test', 'blood', 'x_ray', 'imaging', 'mri', 'ct_scan', 'ultrasound', 'imaging/radiology report', 'x-ray', 'scan', 'prescription', 'ecg', 'urine_test', 'urine'].some(t => type.includes(t));
    return !isStandard;
  }
  return true;
};

const getUrgencyStyles = (urgency) => {
  const norm = urgency?.toLowerCase();
  if (norm === 'urgent') return {
    border: 'border-t-4 border-red-500',
    bg: 'bg-red-50/10',
    badgeText: 'text-red-700 bg-red-50 border-red-100',
    banner: 'bg-gradient-to-r from-red-500/10 to-transparent'
  };
  if (norm === 'soon') return {
    border: 'border-t-4 border-amber-500',
    bg: 'bg-amber-50/10',
    badgeText: 'text-amber-700 bg-amber-50 border-amber-100',
    banner: 'bg-gradient-to-r from-amber-500/10 to-transparent'
  };
  return {
    border: 'border-t-4 border-emerald-500',
    bg: 'bg-emerald-50/10',
    badgeText: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    banner: 'bg-gradient-to-r from-emerald-500/10 to-transparent'
  };
};

const ReportsListPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setError(null);
      const res = await reportsAPI.getAll();
      setReports(res.data.data.reports);
    } catch (err) {
      toast.error('Failed to load reports');
      setError('Could not retrieve reports. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await reportsAPI.delete(id);
      setReports(reports.filter(r => r._id !== id));
      toast.success('Report deleted successfully');
      
      // Update selected compare items
      if (selectedForCompare.includes(id)) {
        setSelectedForCompare(selectedForCompare.filter(itemId => itemId !== id));
      }
    } catch (err) {
      toast.error('Failed to delete report');
    }
  };

  // Category counts helper
  const getCategoryCount = (tabId) => {
    return reports.filter(r => matchesTab(r.reportType, tabId)).length;
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.reportType?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = matchesTab(r.reportType, activeTab);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Reports</h1>
          <p className="mt-1.5 text-gray-500 text-sm">Review, search, and visually compare your AI-translated clinical documents.</p>
        </div>
        
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }} 
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm border transition-all duration-200 shadow-sm
              ${compareMode 
                ? 'bg-primary-100 text-primary-700 border-primary-200 ring-2 ring-primary-50' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            {compareMode ? 'Cancel Compare' : 'Compare Reports'}
          </button>
          
          {compareMode && (
            <button 
              onClick={() => {
                if (selectedForCompare.length === 2) {
                  window.location.href = `/reports/compare?id1=${selectedForCompare[0]}&id2=${selectedForCompare[1]}`;
                }
              }}
              disabled={selectedForCompare.length !== 2}
              className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all duration-200 flex items-center gap-1.5
                ${selectedForCompare.length === 2 
                  ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white hover:shadow-md' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Compare Selected ({selectedForCompare.length}/2)</span>
            </button>
          )}

          {!compareMode && (
            <Link to="/upload" className="btn-primary w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-primary-600 to-blue-600 shadow-sm hover:shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> Upload Report
            </Link>
          )}
        </div>
      </div>

      {/* Compare Mode Help Banner */}
      {compareMode && (
        <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-100 flex items-start gap-3 animate-fade-in">
          <Info className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-primary-800">Report Comparison Mode</h4>
            <p className="text-xs text-primary-700 mt-0.5">Select two reports of the **same category** (e.g. two Blood Tests) to analyze how your parameters have trended over time.</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {reports.length > 0 && (
        <div className="space-y-4">
          {/* Search Row */}
          <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm flex items-center p-0.5 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-transparent border-0 focus:ring-0 text-sm text-gray-900 rounded-xl outline-none"
              placeholder="Search by report title, test parameters, or doctor names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Interactive Categories Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            <Filter className="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0 hidden md:block" />
            {categoryTabs.map(tab => {
              const count = getCategoryCount(tab.id);
              const isSelected = activeTab === tab.id;
              if (count === 0 && tab.id !== 'all') return null; // Hide empty tabs
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap border
                    ${isSelected 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {error ? (
        <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-red-100 shadow-sm text-center animate-fade-in">
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Connection Error</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchReports();
            }}
            className="btn-primary w-full rounded-xl"
          >
            Retry Connection
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-9 w-9 text-primary-500 animate-spin" />
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => {
            const isSelected = selectedForCompare.includes(report._id);
            const urgency = report.aiAnalysis?.urgencyLevel;
            const style = getUrgencyStyles(urgency);
            
            // Calculate abnormal parameter count
            const anomalies = report.extractedData?.testResults?.filter(t => 
              ['abnormal', 'high', 'low', 'critical'].includes(t.status?.toLowerCase())
            ).length || 0;

            return (
              <div 
                key={report._id} 
                onClick={() => {
                  if (compareMode) {
                    if (isSelected) {
                      setSelectedForCompare(selectedForCompare.filter(id => id !== report._id));
                    } else if (selectedForCompare.length < 2) {
                      if (selectedForCompare.length === 1) {
                        const firstReport = reports.find(r => r._id === selectedForCompare[0]);
                        if (firstReport && firstReport.reportType !== report.reportType) {
                          toast.error('Please select reports of the same category for comparison.');
                          return;
                        }
                      }
                      setSelectedForCompare([...selectedForCompare, report._id]);
                    }
                  } else {
                    window.location.href = `/reports/${report._id}`;
                  }
                }}
                className={`card relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer bg-white border border-gray-100 flex flex-col justify-between
                  ${style.border} 
                  ${compareMode && isSelected ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/10' : ''}`}
              >
                {/* Background color block */}
                <div className={`absolute top-0 left-0 right-0 h-10 -z-10 ${style.banner}`} />

                <div className="p-5 flex flex-col justify-between flex-grow">
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      {compareMode ? (
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                          className="h-5 w-5 text-primary-600 rounded border-gray-300 pointer-events-none focus:ring-0"
                        />
                      ) : (
                        <div className="h-9 w-9 bg-blue-50 text-primary-600 rounded-lg flex items-center justify-center border border-blue-100">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                      )}
                      
                      {!compareMode && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(report._id, e); }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1" title={report.title}>
                      {report.title}
                    </h3>
                    
                    {/* Meta info */}
                    <div className="text-xs text-gray-400 mb-3 flex items-center">
                      <span className="capitalize">{report.reportType?.replace(/_/g, ' ')}</span>
                      <span className="mx-1.5 font-bold text-gray-300">•</span>
                      <time>{format(new Date(report.date || Date.now()), 'MMM d, yyyy')}</time>
                    </div>
                  </div>

                  {/* Urgency and Findings Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {report.processingStatus === 'done' ? (
                       <StatusBadge 
                        status={urgency === 'urgent' ? 'critical' : 
                                 urgency === 'soon' ? 'borderline' : 'normal'} 
                      />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                        Processing...
                      </span>
                    )}

                    {anomalies > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-100 shadow-sm animate-pulse">
                        <Activity className="h-3 w-3 mr-1" /> {anomalies} anomalies
                      </span>
                    )}
                  </div>
                  
                  {/* Summary Text */}
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                    {report.processingStatus === 'processing' 
                      ? 'Analyzing document text layers and running clinical rules engine...' 
                      : report.aiAnalysis?.overallSummary || 'No clinical summary generated.'}
                  </p>
                  
                  {/* Bottom Footer Action */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-primary-600 text-xs font-bold">
                    <span>{compareMode ? (isSelected ? 'Selected' : 'Select for comparison') : 'View Full Analysis'}</span>
                    {!compareMode && <ChevronRight className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState 
          icon={FileText}
          title={searchQuery ? "No matching reports" : "No reports uploaded"}
          message={searchQuery ? "Try checking spelling or adjusting your category filter." : "Upload your medical reports to generate structured clinician summaries and analytics."}
          actionLabel={!searchQuery ? "Upload Report" : null}
          onAction={() => window.location.href = '/upload'}
        />
      )}
    </div>
  );
};

export default ReportsListPage;
