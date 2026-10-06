import { Menu, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import DashboardSidebar from './components/DashboardSidebar';
import InquiryScreen from './screens/InquiryScreen';
import FollowUpScreen from './screens/FollowUpScreen';
import CoursesScreen from './screens/CoursesScreen';
import AdmissionScreen from './screens/AdmissionScreen';
import FeesScreen from './screens/FeesScreen';
import FeesReportScreen from './screens/FeesReportScreen';
import ReceiptReportScreen from './screens/ReceiptReportScreen';
import DashboardScreen from './screens/DashboardScreen';
import PendingFeesScreen from './screens/PendingFeesScreen';

import LoginScreen from './screens/LoginScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import DatabaseBackupScreen from './screens/DatabaseBackupScreen';
import SettingsScreen from './screens/SettingsScreen';
import { applyDesignTokens } from './theme/designTokens';
import type { Inquiry } from './services/api';
import { ToastProvider } from './components/Toast';

function AppContent() {
  const navigate = useNavigate();
  const [admissionMode, setAdmissionMode] = useState<'create' | 'list'>('list');
  const [admissionInquiry, setAdmissionInquiry] = useState<Inquiry | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    applyDesignTokens();
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleInquiryCompleted = (inq: Inquiry) => {
    setAdmissionInquiry(inq);
    setAdmissionMode('create');
    navigate('/admission');
  };

  const handleFollowUpCompleted = (inq: Inquiry) => {
    setAdmissionInquiry(inq);
    setAdmissionMode('create');
    navigate('/admission');
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div
          className="offcanvas-md offcanvas-start border-end app-offcanvas-sidebar"
          tabIndex={-1}
          id="sidebarMenu"
          aria-labelledby="sidebarMenuLabel"
        >
          <div className="offcanvas-header d-md-none">
            <h5 className="offcanvas-title" id="sidebarMenuLabel">Menu</h5>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
          </div>
          <div className="offcanvas-body d-flex flex-column p-0 h-100">
            <div className="w-100 h-100">
              <DashboardSidebar
                onAdmissionClick={() => {
                  setAdmissionMode('list');
                  setAdmissionInquiry(null);
                }}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>

        <main className="flex-grow-1 w-100 overflow-hidden p-3 p-md-4 p-lg-5 app-main-content">
          <div className="d-md-none d-flex align-items-center justify-content-between gap-3 mobile-topbar app-mobile-nav">
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-light border shadow-sm"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#sidebarMenu"
                aria-controls="sidebarMenu"
              >
                <Menu size={24} />
              </button>
              <h2 className="m-0 fs-4 fw-bold">FEES-CRM</h2>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>

          <div className="d-md-none app-mobile-nav-spacer"></div>

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/inquiry" element={<InquiryScreen onCompleted={handleInquiryCompleted} />} />
            <Route path="/follow-up" element={<FollowUpScreen onCompleted={handleFollowUpCompleted} />} />
            <Route path="/courses" element={<CoursesScreen />} />
            <Route
              path="/admission"
              element={
                <AdmissionScreen
                  mode={admissionMode}
                  inquiry={admissionInquiry}
                  onListMode={() => setAdmissionMode('list')}
                />
              }
            />
            <Route path="/fees" element={<FeesScreen />} />
            <Route path="/fees-report" element={<FeesReportScreen />} />
            <Route path="/receipt-report" element={<ReceiptReportScreen />} />
            <Route path="/pending-fees" element={<PendingFeesScreen />} />

            <Route path="/change-password" element={<ChangePasswordScreen />} />
            <Route path="/database-backup" element={<DatabaseBackupScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}
