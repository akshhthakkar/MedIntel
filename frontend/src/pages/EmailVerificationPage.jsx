import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import api from '../services/api';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Invalid or expired verification link');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-primary-900/5 sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
          
          {status === 'verifying' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
              <p className="text-sm text-gray-500">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-sm text-gray-600">
                Your email address has been successfully verified. You can now use all features of MedIntel.
              </p>
              <Link
                to="/login"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all mt-4"
              >
                Go to Login <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-2">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="text-sm text-red-600 px-4">
                {message}
              </p>
              <Link
                to="/login"
                className="w-full flex justify-center items-center py-3 px-4 mt-6 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all font-medium"
              >
                Return to Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
