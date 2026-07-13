import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const navy = '#152E57';
const navyDark = '#0f1f3d';
const teal = '#0d9488';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    
    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setErrorMsg(result.error || 'Failed to login');
      toast.error('Login failed');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      {/* ── Left Side: Brand Panel (hidden on mobile) */}
      <div 
        className="hidden md:flex md:w-2/5 flex-col justify-between p-12 text-white relative"
        style={{ background: `linear-gradient(160deg, ${navyDark} 0%, ${navy} 60%, #1e4a8c 100%)` }}
      >
        {/* Subtle radial background glow */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, #0d9488 0%, transparent 60%)' }}
        />

        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <img src="/medintel-logo.jpg" alt="MedIntel" className="h-10 w-10 rounded-xl object-cover shadow-lg border border-white/10" />
          <span className="text-2xl font-extrabold tracking-tight">
            Med<span style={{ color: teal }}>Intel</span>
          </span>
        </Link>

        {/* Middle Value Props */}
        <div className="space-y-8 relative z-10 my-auto">
          <div>
            <h2 className="text-3xl font-black leading-tight">
              AI-Powered Medical Intelligence
            </h2>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              Log in to access your reports, monitor test trends over time, and build smart doctor consultation summaries.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Secure HIPAA-aware data processing',
              'Simplify complex medical terms instantly',
              'Track multi-report biomarker trends',
              'Interactive symptom & vitals logging'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-white/30 relative z-10 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          Secure & encrypted patient-centric ecosystem.
        </div>
      </div>

      {/* ── Right Side: Login Form (centered on mobile & desktop) */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 bg-gray-50 relative">
        {/* Decorative background blobs on mobile */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30 mix-blend-multiply pointer-events-none md:hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-teal-100 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blue-100 blur-3xl transform translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="mx-auto w-full max-w-md animate-fade-in">
          {/* Logo on mobile only */}
          <div className="flex justify-center md:hidden mb-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/medintel-logo.jpg" alt="MedIntel" className="h-10 w-10 rounded-xl object-cover shadow" />
              <span className="text-2xl font-extrabold" style={{ color: navy }}>
                Med<span style={{ color: teal }}>Intel</span>
              </span>
            </Link>
          </div>

          <div className="text-center md:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              Sign in to MedIntel
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              New to our platform?{' '}
              <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700 transition-colors">
                Create a free account
              </Link>
            </p>
          </div>

          <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50">
            {errorMsg && (
              <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2.5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: navy }}>
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: navy }}>
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2.5 text-sm font-medium text-gray-600 select-none">
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
                style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
