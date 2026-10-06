import { LayoutDashboard, BookOpen, FileCheck2, MessageSquare, Target, Wallet, LogOut, ShieldCheck, BarChart2, Database, Clock, Settings, FileSpreadsheet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from "../assets/logo (1).png";

export type SectionKey = 'dashboard' | 'inquiry' | 'follow-up' | 'courses' | 'admission' | 'fees' | 'fees-report' | 'receipt-report' | 'pending-fees' | 'change-password' | 'database-backup' | 'settings';

interface DashboardSidebarProps {
  onAdmissionClick?: () => void;
  onLogout?: () => void;
  onBackupClick?: () => void;
}

const navItems: { key: SectionKey; label: string; icon: any; path: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'inquiry', label: 'Inquiry', icon: MessageSquare, path: '/inquiry' },
  { key: 'follow-up', label: 'Follow-up', icon: Target, path: '/follow-up' },
  { key: 'courses', label: 'Courses', icon: BookOpen, path: '/courses' },
  { key: 'admission', label: 'Admission', icon: FileCheck2, path: '/admission' },
  { key: 'fees', label: 'Fees Management', icon: Wallet, path: '/fees' },
  { key: 'fees-report', label: 'Fees Report', icon: BarChart2, path: '/fees-report' },
  { key: 'receipt-report', label: 'Receipt Report', icon: FileSpreadsheet, path: '/receipt-report' },
  { key: 'pending-fees', label: 'Pending Fees', icon: Clock, path: '/pending-fees' },
  { key: 'change-password', label: 'Change Password', icon: ShieldCheck, path: '/change-password' },
  { key: 'database-backup', label: 'Database Backup', icon: Database, path: '/database-backup' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function DashboardSidebar({ onAdmissionClick, onLogout }: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <div className="brand-block">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <h1 className="sidebar-brand-title">FEES-CRM</h1>
        <p className="sidebar-brand-subtitle">Student Success Platform</p>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (item.key === 'admission' && onAdmissionClick) {
                  onAdmissionClick();
                }
                const offcanvasEl = document.getElementById('sidebarMenu');
                if (offcanvasEl && window.innerWidth < 768) {
                  const closeBtn = offcanvasEl.querySelector('.btn-close') as HTMLElement;
                  if (closeBtn) closeBtn.click();
                }
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      {onLogout && (
        <div className="sidebar-logout-container">
          <button onClick={onLogout} className="sidebar-logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
  );
}
