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

      <div className="security-content-wrap">
        <div className="card security-card">
          <div className="security-header">
            <div className="security-icon-circle">
              <ShieldCheck size={32} color="var(--primary)" />
            </div>
            <h3>Change Account Password</h3>
            <p className="muted">Ensure your account is using a long, random password to stay secure.</p>
          </div>

          {error && <div className="security-error-box">{error}</div>}
          {success && <div className="security-success-box">{success}</div>}

          <form onSubmit={handleChangePassword} className="security-form">
            <div className="security-input-group">
              <label className="security-label">Old Password</label>
              <div className="security-input-wrapper">
                <KeyRound size={18} className="security-input-icon" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="security-input"
                  required
                />
              </div>
            </div>

            <div className="security-input-group">
              <label className="security-label">New Password</label>
              <div className="security-input-wrapper">
                <Lock size={18} className="security-input-icon" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="security-input"
                  required
                />
              </div>
            </div>

            <div className="security-input-group">
              <label className="security-label">Confirm New Password</label>
              <div className="security-input-wrapper">
                <Lock size={18} className="security-input-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="security-input"
                  required
                />
              </div>
            </div>

            <div className="security-footer">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary security-submit-btn"
              >
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

export default ChangePasswordScreen;
