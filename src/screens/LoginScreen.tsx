import React, { useState } from 'react';
import { api } from '../services/api';
import { Lock, User, ChevronRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Loader from '../components/Loader';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.login({ username, password });
      onLoginSuccess(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Ambient background blur elements */}
      <div className="login-blob login-blob-top" />
      <div className="login-blob login-blob-bottom" />

      <div className="login-glass-card">
        <div className="login-icon-badge">
          <ShieldCheck size={28} color="#60a5fa" />
        </div>
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Enter your credentials to access the CRM</p>
        </div>

        {error && <div className="login-error-box">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <User size={18} className="login-input-icon" />
            <input
              id="login-username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              required
              autoComplete="username"
            />
          </div>
          <div className="login-input-group">
            <Lock size={18} className="login-input-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="login-eye-btn"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="login-button" id="login-btn">
            {loading ? <Loader size={20} color="#fff" text="" /> : 'Login Now'}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>

      <div className="login-footer">&copy; 2026 CRM Portal. All Rights Reserved.</div>
    </div>
  );
};

export default LoginScreen;
