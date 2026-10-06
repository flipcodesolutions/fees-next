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
    } catch {
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
      <header className="topbar">
        <h2>Database Backup & Restore</h2>
      </header>

      {message && (
        <div className={`card crm-alert-card ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertTriangle size={20} />
          )}
          <strong>{message.text}</strong>
        </div>
      )}

      <div className="backup-grid">
        {/* Export Card */}
        <div className="card backup-card">
          <div>
            <div className="backup-card-header">
              <div className="backup-icon-box backup-icon-export">
                <Database size={24} />
              </div>
              <h3>Backup Database</h3>
            </div>
            <p className="backup-card-desc">
              Download the complete system database as a <code>database.sqlite</code> file. You can keep this file safe as a backup copy.
            </p>
          </div>
          <button
            className="btn btn-primary backup-btn-full"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Download Backup File'}
          </button>
        </div>

        {/* Import Card */}
        <div className="card backup-card">
          <div>
            <div className="backup-card-header">
              <div className="backup-icon-box backup-icon-import">
                <Upload size={24} />
              </div>
              <h3>Restore Database</h3>
            </div>
            <p className="backup-card-desc">
              Upload a previously downloaded <code>database.sqlite</code> file to restore all student, inquiry, and payment records.
              <br />
              <strong className="text-error-btn">Warning: This will overwrite current data!</strong>
            </p>
          </div>
          <label className="btn btn-outline-danger backup-btn-full">
            <Upload size={18} />
            {isImporting ? 'Restoring...' : 'Upload SQLite File'}
            <input
              type="file"
              accept=".sqlite,.db,.sqlite3,*"
              onChange={handleImport}
              disabled={isImporting}
              className="d-none-input"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
