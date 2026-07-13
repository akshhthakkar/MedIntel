import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { reportsAPI } from '../services/api';
import { FileText, Search, Plus, Trash2, Loader2, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const ReportsListPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

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
    } catch (err) {
      toast.error('Failed to delete report');
    }
  };

  const filteredReports = reports.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.reportType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your AI-analyzed medical documents.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <button 
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }} 
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${compareMode ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
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
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${selectedForCompare.length === 2 ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Compare Selected ({selectedForCompare.length}/2)
            </button>
          )}

          {!compareMode && (
            <Link to="/upload" className="btn-primary w-full sm:w-auto whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" /> Upload New
            </Link>
          )}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="flex bg-white rounded-lg border border-gray-300 shadow-sm p-1">
          <div className="relative flex-grow focus-within:z-10 bg-white">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 py-2 border-0 focus:ring-0 sm:text-sm text-gray-900 rounded-l-md"
              placeholder="Search by title or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {error ? (
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
              fetchReports();
            }}
            className="btn-primary w-full"
          >
            Retry Connection
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => {
            const isSelected = selectedForCompare.includes(report._id);
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
                        toast.error('You can only compare reports of the same category (e.g., Blood Test with Blood Test).');
                        return;
                      }
                    }
                    setSelectedForCompare([...selectedForCompare, report._id]);
                  }
                } else {
                  window.location.href = `/reports/${report._id}`;
                }
              }}
              className={`card hover:-translate-y-1 transition-transform duration-200 cursor-pointer ${compareMode && isSelected ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/30' : ''}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {compareMode && (
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        className="h-5 w-5 text-primary-600 rounded border-gray-300 pointer-events-none"
                      />
                    )}
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(report._id, e); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    disabled={compareMode}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 truncate mb-1" title={report.title}>
                  {report.title}
                </h3>
                
                <div className="text-sm text-gray-500 mb-4 flex items-center">
                  <span className="truncate">{report.reportType}</span>
                  <span className="mx-2">•</span>
                  <time>{format(new Date(report.date), 'MMM d, yyyy')}</time>
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  {report.processingStatus === 'done' ? (
                     <StatusBadge 
                      status={report.aiAnalysis?.urgencyLevel === 'urgent' ? 'critical' : 
                               report.aiAnalysis?.urgencyLevel === 'soon' ? 'borderline' : 'normal'} 
                    />
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Processing...
                    </span>
                  )}
                  
                  {report.extractedData?.testResults?.some(t => ['abnormal', 'high', 'low', 'critical'].includes(t.status?.toLowerCase())) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                      <Activity className="h-3 w-3 mr-1" /> Findings
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {report.processingStatus === 'processing' 
                    ? 'AI is analyzing your report...' 
                    : report.aiAnalysis?.overallSummary || 'No summary available.'}
                </p>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-primary-600 text-sm font-medium">
                  {compareMode ? (isSelected ? 'Selected' : 'Click to select') : 'View Full Analysis'}
                  {!compareMode && <ChevronRight className="h-4 w-4" />}
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
          message={searchQuery ? "Try adjusting your search terms." : "Upload your first medical report to get AI-powered insights."}
          actionLabel={!searchQuery ? "Upload Report" : null}
          onAction={() => window.location.href = '/upload'}
        />
      )}
    </div>
  );
};

export default ReportsListPage;
