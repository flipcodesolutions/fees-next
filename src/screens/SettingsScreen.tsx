import { Save, Eye, EyeOff, Edit3, X, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

interface SettingsFormData {
  whatsapp_token: string;
  whatsapp_phone_number_id: string;
  whatsapp_business_account_id: string;
  whatsapp_api_url: string;
  whatsapp_template_name: string;
}

/**
 * SettingsScreen manages WhatsApp Business API configurations with a clean, modern UI.
 */
export default function SettingsScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState<SettingsFormData>({
    whatsapp_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_api_url: '',
    whatsapp_template_name: '',
  });

  const [originalData, setOriginalData] = useState<SettingsFormData>({
    whatsapp_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_api_url: '',
    whatsapp_template_name: '',
  });

  /**
   * Load configurations from the settings table.
   */
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.getSettings();
      const data = response.data || {};
      const fields = {
        whatsapp_token: data.whatsapp_token || '',
        whatsapp_phone_number_id: data.whatsapp_phone_number_id || '',
        whatsapp_business_account_id: data.whatsapp_business_account_id || '',
        whatsapp_api_url: data.whatsapp_api_url || '',
        whatsapp_template_name: data.whatsapp_template_name || '',
      };
      setFormData(fields);
      setOriginalData(fields);
    } catch (error) {
      toast.error('Failed to load settings from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  /**
   * Revert changes and exit edit mode.
   */
  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  /**
   * Validate and update configuration records.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = formData.whatsapp_token.trim();
    const phoneId = formData.whatsapp_phone_number_id.trim();
    const businessId = formData.whatsapp_business_account_id.trim();
    const apiUrl = formData.whatsapp_api_url.trim();
    const templateName = formData.whatsapp_template_name.trim();

    const allEmpty = !token && !phoneId && !businessId && !apiUrl && !templateName;

    if (allEmpty) {
      if (!window.confirm('All fields are empty. Are you sure you want to clear WhatsApp configurations from database? This will revert the system to default server configurations in .env.')) {
        return;
      }
      setSaving(true);
      try {
        await api.resetSettings();
        toast.success('WhatsApp configurations cleared!');
        await loadSettings();
        setIsEditing(false);
      } catch (error) {
        toast.error('Failed to clear settings');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!token) {
      toast.error('WhatsApp API Key is required');
      return;
    }
    if (!phoneId) {
      toast.error('WhatsApp Phone Number ID is required');
      return;
    }
    if (!/^\d+$/.test(phoneId)) {
      toast.error('WhatsApp Phone Number ID must contain only digits');
      return;
    }

    setSaving(true);
    try {
      const payload: SettingsFormData = {
        whatsapp_token: token,
        whatsapp_phone_number_id: phoneId,
        whatsapp_business_account_id: businessId,
        whatsapp_api_url: apiUrl || 'https://partnersv1.pinbot.ai/v3',
        whatsapp_template_name: templateName || 'fees_reminder',
      };

      await api.updateSettings(payload as unknown as Record<string, string>);
      toast.success('Settings updated successfully!');
      setOriginalData(payload);
      setFormData(payload);
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen settings-screen" style={{ width: '100%', margin: 0, padding: 0 }}>
      <header className="topbar" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>Settings</h2>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem', marginBottom: '12px' }}></div>
          <div>Loading settings...</div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            padding: '28px',
            maxWidth: '820px',
            width: '100%',
            margin: '0'
          }}
        >
          {/* Header Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 211, 102, 0.12)',
                color: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>WhatsApp</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Configure WhatsApp Business API credentials and reminder templates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {/* Field 1: WhatsApp API Key / Access Token */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                WhatsApp API Key / Access Token
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  className="form-control"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    paddingRight: '48px',
                    paddingLeft: '14px',
                    fontSize: '14px',
                    backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                  value={formData.whatsapp_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                  placeholder="Enter API Key / Token"
                  disabled={!isEditing || saving}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Row 2: Phone Number ID + Username */}
            <div className="row" style={{ marginBottom: '22px' }}>
              <div className="col-md-6 mb-3 mb-md-0">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                    fontSize: '14px',
                    backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                  value={formData.whatsapp_phone_number_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                  placeholder="e.g. 1255775757621766"
                  disabled={!isEditing || saving}
                />
              </div>

              <div className="col-md-6">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Username / Business Account ID
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                    fontSize: '14px',
                    backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                  value={formData.whatsapp_business_account_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_business_account_id: e.target.value })}
                  placeholder="e.g. ShivComputersSurendranagar0549Wapp"
                  disabled={!isEditing || saving}
                />
              </div>
            </div>

            {/* Row 3: API Endpoint + Template Name */}
            <div className="row" style={{ marginBottom: '28px' }}>
              <div className="col-md-6 mb-3 mb-md-0">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  API Base Endpoint URL
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                    fontSize: '14px',
                    backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                  value={formData.whatsapp_api_url}
                  onChange={(e) => setFormData({ ...formData, whatsapp_api_url: e.target.value })}
                  placeholder="https://partnersv1.pinbot.ai/v3"
                  disabled={!isEditing || saving}
                />
              </div>

              <div className="col-md-6">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Fee Reminder Template Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    height: '46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                    fontSize: '14px',
                    backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                  value={formData.whatsapp_template_name}
                  onChange={(e) => setFormData({ ...formData, whatsapp_template_name: e.target.value })}
                  placeholder="fees_reminder"
                  disabled={!isEditing || saving}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '22px' }}>
              {!isEditing ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '44px',
                    padding: '0 24px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                  }}
                >
                  <Edit3 size={16} />
                  Edit Configurations
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '44px',
                      padding: '0 20px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '44px',
                      padding: '0 24px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
