import { Database, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';

export default function DatabaseBackupScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const response = await api.exportDatabase();
      const blob = new Blob([response.data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'database.sqlite';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Database exported successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to export database.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Importing a new database will completely overwrite all existing data. Do you want to proceed?')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;

        await api.importDatabase({ fileData: base64Data });
        setMessage({ type: 'success', text: 'Database imported successfully! Application is reloading...' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error: any) {
        const errText = error.response?.data?.error || 'Failed to import database. Please ensure it is a valid SQLite file.';
        setMessage({ type: 'error', text: errText });
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Error reading file.' });
      setIsImporting(false);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="screen database-backup">
      <header className="topbar" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Database Backup & Restore</h2>
      </header>

      {message && (
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '24px',
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--error)',
            backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
          ) : (
            <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
          )}
          <span style={{ fontWeight: 600, color: message.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {message.text}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Export Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                <Database size={24} />
              </div>
              <h3 style={{ margin: 0 }}>Backup Database</h3>
            </div>
            <p className="muted" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Download the complete system database as a <code>database.sqlite</code> file. You can keep this file safe as a backup copy.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '48px' }}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Download Backup File'}
          </button>
        </div>

        {/* Import Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <Upload size={24} />
              </div>
              <h3 style={{ margin: 0 }}>Restore Database</h3>
            </div>
            <p className="muted" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Upload a previously downloaded <code>database.sqlite</code> file to restore all student, inquiry, and payment records.
              <br />
              <strong style={{ color: 'var(--error)' }}>Warning: This will overwrite current data!</strong>
            </p>
          </div>
          <label
            className="btn btn-outline-danger"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '48px',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              opacity: isImporting ? 0.6 : 1,
              border: '1px solid #ef4444',
              color: '#ef4444',
              backgroundColor: 'transparent'
            }}
          >
            <Upload size={18} />
            {isImporting ? 'Restoring...' : 'Upload SQLite File'}
            <input
              type="file"
              accept=".sqlite,.db,.sqlite3,*"
              onChange={handleImport}
              disabled={isImporting}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
