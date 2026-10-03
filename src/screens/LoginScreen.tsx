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
    <div style={styles.container}>
      {/* Background blobs */}
      <div style={{ ...styles.blob, top: '-100px', left: '-100px', background: 'rgba(59,130,246,0.15)' }} />
      <div style={{ ...styles.blob, bottom: '-120px', right: '-80px', background: 'rgba(139,92,246,0.15)' }} />

      <div style={styles.glassCard}>
        <div style={styles.iconBadge}>
          <ShieldCheck size={28} color="#60a5fa" />
        </div>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Enter your credentials to access the CRM</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <User size={18} style={styles.inputIcon} />
            <input
              id="login-username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              autoComplete="username"
            />
          </div>
          <div style={styles.inputGroup}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeIconBtn}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} style={styles.button} id="login-btn">
            {loading ? <Loader size={20} color="#fff" text="" /> : 'Login Now'}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>

      <div style={styles.footer}>&copy; 2026 CRM Portal. All Rights Reserved.</div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(140deg, #f8f9ff, #eff4ff)',
    fontFamily: "'Inter', sans-serif",
    color: '#0b1c30',
    overflow: 'hidden',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    filter: 'blur(80px)',
    pointerEvents: 'none',
  },
  glassCard: {
    width: '100%',
    maxWidth: '420px',
    margin: '0 20px',
    padding: '40px',
    borderRadius: '24px',
    background: '#ffffff',
    border: '1px solid #dce9ff',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
    zIndex: 1,
  },
  iconBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: '#94a3b8',
  },
  eyeIconBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    padding: '4px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 48px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0b1c30',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  button: {
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.2s, opacity 0.2s',
    marginTop: '4px',
  },
  errorBox: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '8px',
    textAlign: 'center',
  },
  footer: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#64748b',
    zIndex: 1,
  },
};

const globalStyles = `
  input:focus {
    border-color: rgba(59, 130, 246, 0.5) !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
  }
  button:hover { opacity: 0.9; transform: translateY(-1px); }
  button:active { transform: translateY(0px); }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(globalStyles));
  document.head.appendChild(style);
}

export default LoginScreen;
