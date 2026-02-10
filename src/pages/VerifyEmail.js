import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      // Auto-focus next input
      if (value !== '' && index < 5) {
        document.getElementById(`digit-${index + 1}`).focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`digit-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Call the verify email endpoint
      const data = await API.verifyEmailCode(user.email, verificationCode);
      
      // Update user data with verified status
      const updatedUser = {
        ...user,
        emailVerified: true
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess('Email verified successfully! Redirecting...');
      
      // Redirect to feed after successful verification
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    try {
      await API.request('/api/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: user.email })
      });
      setSuccess('Verification code has been resent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-4xl font-bold text-white tracking-tight">VesselX</span>
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.7)] animate-pulse"></div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-10 shadow-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              Verify Your Email
            </h1>
            <p className="text-gray-400 text-sm">
              Enter the verification code sent to
              <span className="font-semibold text-white ml-1">{user?.email || 'your email'}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm">
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Verification Code Inputs */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300 text-center">
                6-Digit Verification Code
              </label>
              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`digit-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-16 h-16 bg-gray-800/50 border-2 border-gray-700 text-white text-3xl font-bold text-center rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all hover:border-gray-600"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 px-4 rounded-xl font-bold hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              disabled={isLoading || code.join('').length !== 6}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify Email'}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium hover:underline"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Didn't receive a code? Resend
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Powered by Gabimaru Tech
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;