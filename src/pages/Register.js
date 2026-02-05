// Register.js - Updated with exact screenshot design
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiAtSign } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo" style={{ marginBottom: '20px' }}>
            <span className="logo-text">VesselX</span>
            <div className="logo-dot"></div>
          </div>
          <h1 className="login-title">Create your VesselX account</h1>
          <p className="login-subtitle">Join our community of authentic voices</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Full Name</label>
            <div className="input-with-icon">
              <FiUser size={20} />
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <FiAtSign size={20} />
              <input
                type="text"
                className="form-input"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <FiMail size={20} />
              <input
                type="email"
                className="form-input"
                placeholder="john@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <FiLock size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            <p className="password-hint">Use 8+ characters with letters and numbers</p>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="login-btn" 
            disabled={isLoading || !formData.name || !formData.username || !formData.email || !formData.password}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="demo-notice">
            <div className="demo-icon">ℹ️</div>
            <span>This is a demo. Email verification is simulated for testing.</span>
          </div>

          <p className="signup-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;