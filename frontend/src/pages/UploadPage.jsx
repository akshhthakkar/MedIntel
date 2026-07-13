import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, 
  FileText, Droplets, Activity, Shield, Heart, Image, Languages, Sparkles 
} from 'lucide-react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';

const languages = [
  'English', 'Spanish', 'French', 'Hindi', 'Chinese', 'Arabic', 'Russian'
];

const reportTypes = [
  { value: 'other', label: 'General Report', desc: 'Doctor notes, discharge summaries, or general medical text', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  { value: 'CBC', label: 'Complete Blood Count (CBC)', desc: 'Red/white blood cells, hemoglobin, platelets', icon: Droplets, color: 'text-red-600 bg-red-50' },
  { value: 'Lipid Panel', label: 'Lipid Panel', desc: 'Cholesterol, HDL, LDL, triglycerides', icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'LFT', label: 'Liver Function Test (LFT)', desc: 'ALT, AST, ALP, bilirubin, proteins', icon: Shield, color: 'text-indigo-600 bg-indigo-50' },
  { value: 'Thyroid Profile', label: 'Thyroid Panel', desc: 'TSH, Free T3, Free T4 values', icon: Heart, color: 'text-pink-600 bg-pink-50' },
  { value: 'Diabetes Panel', label: 'Metabolic & Diabetes', desc: 'HbA1c, glucose, insulin levels', icon: Activity, color: 'text-amber-600 bg-amber-50' },
  { value: 'urine_test', label: 'Urinalysis', desc: 'Urine chemical and microscopic analyses', icon: Droplets, color: 'text-cyan-600 bg-cyan-50' },
  { value: 'x_ray', label: 'Imaging / Radiology', desc: 'X-Ray, MRI, CT, Ultrasound reports', icon: Image, color: 'text-violet-600 bg-violet-50' },
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
    setUploadProgress(5);

    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('reportType', reportType);
      formData.append('language', language);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          // Slow down progress as it goes higher to keep user engaged
          const increment = prev < 40 ? 15 : prev < 75 ? 8 : 3;
          return prev + increment;
        });
      }, 700);

      const res = await reportsAPI.upload(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.data.success) {
        toast.success(res.data.message || 'Report analyzed successfully!');
        setTimeout(() => {
          navigate('/reports');
        }, 1200);
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

  // Determine stage active status
  const currentStage = isUploading ? 3 : file ? 2 : 1;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Visual Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Upload Report</h1>
        <p className="mt-2 text-gray-500 text-sm md:text-base">
          Upload your clinical medical reports, imaging sheets, or doctor's prescriptions to generate clear, plain-language summaries and breakdown analyses.
        </p>
      </div>

      {/* Modern Horizontal Steps Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-3 gap-2">
        <div className={`flex flex-col items-center text-center p-2 rounded-lg transition-colors ${currentStage >= 1 ? 'bg-primary-50/50' : ''}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${currentStage >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
          <span className={`text-xs font-semibold ${currentStage >= 1 ? 'text-primary-700' : 'text-gray-400'}`}>Select File</span>
        </div>
        <div className={`flex flex-col items-center text-center p-2 rounded-lg transition-colors ${currentStage >= 2 ? 'bg-primary-50/50' : ''}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${currentStage >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
          <span className={`text-xs font-semibold ${currentStage >= 2 ? 'text-primary-700' : 'text-gray-400'}`}>Verify Details</span>
        </div>
        <div className={`flex flex-col items-center text-center p-2 rounded-lg transition-colors ${currentStage >= 3 ? 'bg-primary-50/50' : ''}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${currentStage >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>3</div>
          <span className={`text-xs font-semibold ${currentStage >= 3 ? 'text-primary-700' : 'text-gray-400'}`}>AI Analysis</span>
        </div>
      </div>

      <div className="card p-6 md:p-8 bg-white border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Main interactive form */}
        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          
          {/* Drag & Drop Zone */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-gray-900">1. Select Medical Document</h3>
            <div 
              {...getRootProps()} 
              className={`mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                ${isDragActive ? 'border-primary-500 bg-primary-50/40 shadow-inner' : isDragReject ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-100/50 hover:border-gray-400'} 
                ${file ? 'border-emerald-500 bg-emerald-50/10 pb-8 pt-8 shadow-sm' : ''}
                ${isUploading ? 'pointer-events-none opacity-90' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="space-y-2 text-center">
                {file ? (
                  <div className="flex flex-col items-center animate-fade-in">
                    <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-emerald-100">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div className="flex items-center text-base text-gray-900 font-semibold mb-1">
                      <FileType className="h-4.5 w-4.5 mr-2 text-gray-500" />
                      {file.name}
                    </div>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    {!isUploading && (
                      <button 
                        type="button" 
                        onClick={removeFile}
                        className="mt-4 text-xs bg-white text-red-600 hover:text-red-500 font-bold border border-red-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                      >
                        Choose another file
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="h-14 w-14 bg-blue-50 text-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div className="flex text-sm text-gray-600 justify-center font-medium">
                      <span className="text-primary-600 hover:underline">Upload a file</span>
                      <p className="pl-1">or drag and drop here</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      PDF, PNG, JPG, or WEBP files up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
            {isDragReject && (
              <p className="mt-2 text-sm text-red-500 flex items-center animate-fade-in">
                <AlertCircle className="h-4 w-4 mr-1" /> File format not supported or too large.
              </p>
            )}
          </div>

          {/* Conditional Detail Form */}
          {file && (
            <div className="space-y-6 pt-6 border-t border-gray-100 animate-fade-in">
              {/* Category selector grid */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <span>2. Select Report Category</span>
                  <span className="text-xs font-normal text-gray-400">(Helps refine analysis accuracy)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {reportTypes.map(rt => {
                    const IconComponent = rt.icon;
                    const isSelected = reportType === rt.value;
                    return (
                      <div
                        key={rt.value}
                        onClick={() => !isUploading && setReportType(rt.value)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 text-left flex flex-col justify-between hover:shadow-sm
                          ${isSelected 
                            ? 'border-primary-500 ring-2 ring-primary-50/50 bg-primary-50/20' 
                            : 'border-gray-200 bg-white hover:border-gray-300'}
                          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                      >
                        <div>
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${rt.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">{rt.label}</h4>
                          <p className="text-xs text-gray-400 leading-normal">{rt.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="mt-3 flex justify-end">
                            <span className="h-2 w-2 rounded-full bg-primary-600"></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label htmlFor="language" className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <Languages className="h-4.5 w-4.5 text-gray-400" />
                    <span>Preferred Language</span>
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isUploading}
                    className="block w-full pl-3 pr-10 py-2.5 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-lg shadow-sm"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">AI will translate and explain medical terminology in this language.</p>
                </div>
              </div>

              {/* Upload Progress Steps Checklist */}
              {isUploading && (
                <div className="p-5 bg-primary-50/30 rounded-2xl border border-primary-50/50 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center text-sm font-bold text-primary-800">
                    <span>Clinical Interpretation Engine running...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200/80 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  
                  {/* Pipeline checklist */}
                  <div className="grid gap-2.5 text-sm pt-2">
                    <div className="flex items-center gap-2">
                      {uploadProgress >= 30 ? (
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-4.5 w-4.5 text-primary-500 animate-spin flex-shrink-0" />
                      )}
                      <span className={`${uploadProgress >= 30 ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>Scanning document text (OCR engine)...</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadProgress >= 70 ? (
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                      ) : uploadProgress >= 30 ? (
                        <Loader2 className="h-4.5 w-4.5 text-primary-500 animate-spin flex-shrink-0" />
                      ) : (
                        <span className="h-4.5 w-4.5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">2</span>
                      )}
                      <span className={`${uploadProgress >= 70 ? 'text-gray-400 line-through' : uploadProgress >= 30 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>Extracting structured parameters and limits...</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadProgress >= 95 ? (
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                      ) : uploadProgress >= 70 ? (
                        <Loader2 className="h-4.5 w-4.5 text-primary-500 animate-spin flex-shrink-0" />
                      ) : (
                        <span className="h-4.5 w-4.5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">3</span>
                      )}
                      <span className={`${uploadProgress >= 95 ? 'text-gray-400 line-through' : uploadProgress >= 70 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>Formulating clinical summary & safety recommendations...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="btn-primary px-6 py-2.5 bg-gradient-to-r from-primary-600 to-blue-600 shadow-md hover:shadow-lg hover:from-primary-500 hover:to-blue-500 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin h-4.5 w-4.5" />
                      <span>Analyzing Report...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>Start Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
