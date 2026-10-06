import { Save, Eye, EyeOff, Edit3, X, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import Loader from '../components/Loader';

interface SettingsFormData {
  whatsapp_token: string;
  whatsapp_phone_number_id: string;
  whatsapp_business_account_id: string;
  whatsapp_api_url: string;
  whatsapp_template_name: string;
}

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
    } catch {
      toast.error('Failed to load settings from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

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
      } catch {
        toast.error('Failed to clear settings');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!token) {
      toast.error('WhatsApp API Token is required');
      return;
    }
    if (!phoneId) {
      toast.error('WhatsApp Phone Number ID is required');
      return;
    }

    setSaving(true);
    try {
      await api.updateSettings({
        whatsapp_token: token,
        whatsapp_phone_number_id: phoneId,
        whatsapp_business_account_id: businessId,
        whatsapp_api_url: apiUrl,
        whatsapp_template_name: templateName,
      });
      toast.success('WhatsApp configurations saved successfully!');
      await loadSettings();
      setIsEditing(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen settings-screen">
      <header className="topbar">
        <h2>Settings</h2>
      </header>

      {loading ? (
        <Loader text="Loading settings..." />
      ) : (
        <div className="card settings-main-card">
          <div className="settings-header-block">
            <div className="settings-header-icon">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="settings-title">WhatsApp</h3>
              <p className="settings-desc">
                Configure WhatsApp Business API credentials and reminder templates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {/* Field 1: WhatsApp API Key / Access Token */}
            <div className="settings-field-group">
              <label className="settings-label">
                WhatsApp API Key / Access Token
              </label>
              <div className="settings-input-wrapper">
                <input
                  type={showToken ? 'text' : 'password'}
                  className={`form-control settings-input-control settings-input-token ${isEditing ? 'editable' : 'readonly'}`}
                  value={formData.whatsapp_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                  placeholder="Enter API Key / Token"
                  disabled={!isEditing || saving}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="settings-token-toggle"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Row 2: Phone Number ID + Business Account ID */}
            <div className="row settings-field-group">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="settings-label">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  className={`form-control settings-input-control ${isEditing ? 'editable' : 'readonly'}`}
                  value={formData.whatsapp_phone_number_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                  placeholder="e.g. 1255775757621766"
                  disabled={!isEditing || saving}
                />
              </div>

              <div className="col-md-6">
                <label className="settings-label">
                  Username / Business Account ID
                </label>
                <input
                  type="text"
                  className={`form-control settings-input-control ${isEditing ? 'editable' : 'readonly'}`}
                  value={formData.whatsapp_business_account_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_business_account_id: e.target.value })}
                  placeholder="e.g. ShivComputersSurendranagar0549Wapp"
                  disabled={!isEditing || saving}
                />
              </div>
            </div>

            {/* Row 3: API Endpoint + Template Name */}
            <div className="row settings-field-group">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="settings-label">
                  API Base Endpoint URL
                </label>
                <input
                  type="text"
                  className={`form-control settings-input-control ${isEditing ? 'editable' : 'readonly'}`}
                  value={formData.whatsapp_api_url}
                  onChange={(e) => setFormData({ ...formData, whatsapp_api_url: e.target.value })}
                  placeholder="https://partnersv1.pinbot.ai/v3"
                  disabled={!isEditing || saving}
                />
              </div>

              <div className="col-md-6">
                <label className="settings-label">
                  Fee Reminder Template Name
                </label>
                <input
                  type="text"
                  className={`form-control settings-input-control ${isEditing ? 'editable' : 'readonly'}`}
                  value={formData.whatsapp_template_name}
                  onChange={(e) => setFormData({ ...formData, whatsapp_template_name: e.target.value })}
                  placeholder="fees_reminder"
                  disabled={!isEditing || saving}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="settings-actions-footer">
              {!isEditing ? (
                <button
                  type="button"
                  className="btn btn-primary settings-btn settings-btn-primary"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  <Edit3 size={16} />
                  Edit Configurations
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary settings-btn"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary settings-btn settings-btn-primary"
                    disabled={saving}
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
