import React, { useState } from 'react';
import { api } from '../services/api';
import { Lock, KeyRound, ShieldCheck, ChevronRight } from 'lucide-react';
import Loader from '../components/Loader';

const ChangePasswordScreen: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Since we are logged in, we don't need to send username 
      // (the backend will get it from the token if we use protect, 
      // but my current change-password supports both. 
      // I'll send it without username to test the token logic)
      await api.changePassword({ oldPassword, newPassword });
      setSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Make sure old password is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen">
      <header className="topbar">
        <h2>Security Settings</h2>
      </header>

      <div style={styles.content}>
        <div className="card" style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconCircle}>
              <ShieldCheck size={32} color="var(--primary)" />
            </div>
            <h3>Change Account Password</h3>
            <p className="muted">Ensure your account is using a long, random password to stay secure.</p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleChangePassword} style={styles.form}>
            <div className="form-group" style={styles.inputGroup}>
              <label style={styles.label}>Old Password</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={styles.inputGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.footer}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={styles.button}>
                {loading ? <Loader size={18} color="#fff" text="" /> : 'Update Password'}
                {!loading && <ChevronRight size={18} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  content: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    padding: '32px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(var(--primary-rgb, 59, 130, 246), 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--on-surface)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--on-surface-variant)',
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    borderRadius: '8px',
    border: '1px solid var(--outline-variant)',
    background: 'var(--surface-container-low)',
    color: 'var(--on-surface)',
    fontSize: '14px',
    outline: 'none',
  },
  footer: {
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorBox: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  successBox: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
};

export default ChangePasswordScreen;
