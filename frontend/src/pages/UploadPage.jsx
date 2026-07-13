import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';

const languages = [
  'English', 'Spanish', 'French', 'Hindi', 'Chinese', 'Arabic', 'Russian'
];

const reportTypes = [
  { value: 'other', label: 'General Medical Report' },
  { value: 'CBC', label: 'CBC (Complete Blood Count)' },
  { value: 'Lipid Panel', label: 'Lipid Panel' },
  { value: 'LFT', label: 'Liver Function Test' },
  { value: 'Thyroid Profile', label: 'Thyroid Panel' },
  { value: 'Diabetes Panel', label: 'Metabolic Panel' },
  { value: 'urine_test', label: 'Urinalysis' },
  { value: 'x_ray', label: 'Imaging/Radiology Report' },
];

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [reportType, setReportType] = useState('other');
  const [language, setLanguage] = useState('English');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const navigate = useNavigate();

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10); // Start progress

    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('reportType', reportType);
      formData.append('language', language);

      // We fake progress since axios doesn't track server-side processing precisely
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 800);

      const res = await reportsAPI.upload(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.data.success) {
        toast.success(res.data.message || 'Report uploaded successfully!');
        setTimeout(() => {
          navigate('/reports');
        }, 1500);
      }
    } catch (err) {
      setUploadProgress(0);
      setIsUploading(false);
      const msg = err.response?.data?.error || 'Failed to upload report';
      toast.error(msg);
      console.error(err);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Medical Report</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your lab results, imaging reports, or doctor's notes for AI analysis and simplification.
        </p>
      </div>

      <div className="card p-6 md:p-8">
        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          
          {/* Drag & Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Document</label>
            <div 
              {...getRootProps()} 
              className={`mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-xl transition-all duration-200 
                ${isDragActive ? 'border-primary-500 bg-primary-50' : isDragReject ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} 
                ${file ? 'border-green-500 bg-green-50 pb-8 pt-8' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="space-y-2 text-center">
                {file ? (
                  <div className="flex flex-col items-center animate-fade-in">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                    <div className="flex items-center text-sm text-gray-900 font-medium">
                      <FileType className="h-4 w-4 mr-2 text-gray-500" />
                      {file.name}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    {isUploading ? (
                      <div className="w-64 mt-4">
                        <div className="flex justify-between text-xs mb-1 text-gray-600 font-medium">
                          <span>Processing...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Extracting text and running AI analysis. This might take a minute.
                        </p>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={removeFile}
                        className="mt-4 text-sm text-red-600 font-medium hover:text-red-500"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <span>Upload a file</span>
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, PNG, JPG, WEBP up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
            {isDragReject && (
              <p className="mt-2 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" /> File format not supported or too large.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Type */}
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">
                Report Type
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={isUploading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
              >
                {reportTypes.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                Preferred Explanation Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isUploading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">AI will translate the medical jargon to this language.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="btn-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Processing...
                </>
              ) : (
                'Upload & Analyze'
              )}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
