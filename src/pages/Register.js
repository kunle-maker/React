import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');  
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await API.register(formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate('/verify-email', { replace: true });      
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4 py-12">
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
              Create your VesselX account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                className="w-full bg-gray-800/50 border border-gray-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 hover:border-gray-600"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                disabled={isLoading}
              />
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">@</span>
                </div>
                <input
                  type="text"
                  className="w-full bg-gray-800/50 border border-gray-700 text-white pl-10 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 hover:border-gray-600"
                  placeholder="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                className="w-full bg-gray-800/50 border border-gray-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 hover:border-gray-600"
                placeholder="youremail@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                className="w-full bg-gray-800/50 border border-gray-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 hover:border-gray-600"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-2">8+ characters with letters & numbers recommended</p>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 px-4 rounded-xl font-bold hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              disabled={isLoading || !formData.name || !formData.username || !formData.email || !formData.password}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>

            {/* Already have account link */}
            <p className="text-center text-gray-400 text-sm pt-6">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-400 font-semibold hover:text-blue-300 transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
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

export default Register;