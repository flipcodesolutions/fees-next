import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Target,
  BookOpen,
  TrendingUp,
  Users,
  ArrowUpRight,
  FileX,
  Award,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';

import { api, type Inquiry, type FeeSummary, type Admission } from '../services/api';

function safeParseCourses(payloadJson: string) {
  try {
    const parsed = JSON.parse(payloadJson) as { courses?: Array<{ hasDocument?: boolean; hasCertificate?: boolean }> };
    if (!Array.isArray(parsed.courses)) return [];
    return parsed.courses;
  } catch {
    return [];
  }
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  subtitle?: string;
  trend?: string;
}

const StatCard = ({ title, value, icon, color, onClick, subtitle, trend }: StatCardProps) => (
  <div
    className="card dashboard-card"
    onClick={onClick}
    style={{
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid var(--outline-variant)',
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    <div className="card-body p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}
        >
          {icon}
        </div>
        <div className="d-flex align-items-center gap-1" style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 600 }}>
          {trend && <><ArrowUpRight size={16} /> {trend}</>}
        </div>
      </div>

      <div>
        <h3 className="muted mb-1" style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
        <div className="d-flex align-items-baseline gap-2">
          <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--on-surface)' }}>
            {value}
          </span>
        </div>
        {subtitle && (
          <p className="muted mt-2 mb-0" style={{ fontSize: '13px' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {/* Subtle gradient background element */}
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
      zIndex: 0
    }} />
  </div>
);

interface StatusCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  subtitle: string;
}

const StatusCard = ({ title, icon, color, onClick, subtitle }: StatusCardProps) => (
  <div
    className="card dashboard-card"
    onClick={onClick}
    style={{
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid var(--outline-variant)',
      overflow: 'hidden',
      position: 'relative',
      height: '100%'
    }}
  >
    <div className="card-body p-4 d-flex align-items-center gap-3">
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>
          {title}
        </h3>
        <p className="muted mb-0" style={{ fontSize: '13px' }}>
          {subtitle}
        </p>
      </div>
    </div>
    {/* Subtle gradient background element */}
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
      zIndex: 0
    }} />
  </div>
);

export default function DashboardScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inquiries: 0,
    followUps: 0,
    courses: 0,
    admissions: 0,
    totalReceived: 0,
    totalRemaining: 0,
    docPending: 0,
    certPending: 0,
    pendingFeesMonth: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [inqRes, courseRes, admRes, feeRes] = await Promise.all([
          api.getInquiries(),
          api.getCourses(),
          api.getAdmissions(),
          api.getFees()
        ]);

        const inquiries = Array.isArray(inqRes.data) ? inqRes.data : [];
        const fees = Array.isArray(feeRes.data) ? feeRes.data : [];
        const admissions = Array.isArray(admRes.data) ? admRes.data : [];

        // Active inquiries are those not deleted or not interested
        const activeInquiries = inquiries.filter((i: Inquiry) =>
          i.status !== 'Deleted' && i.status !== 'Not Interested'
        );

        // Follow-ups are those with status 'Pending'
        const followUps = activeInquiries.filter((i: Inquiry) =>
          i.status === 'Pending'
        );

        // Active admissions only
        const activeAdmissions = admissions.filter((a: Admission) => a.status !== 'Deleted');

        // Count doc and cert pending
        let docPending = 0;
        let certPending = 0;
        for (const a of activeAdmissions) {
          const courses = safeParseCourses(a.payload_json);
          const hasAnyDoc = courses.some((c) => c.hasDocument);
          const hasAnyCert = courses.some((c) => c.hasCertificate);
          if (!hasAnyDoc) docPending++;
          if (!hasAnyCert) certPending++;
        }

        // Count fees whose next_payment_date is in the current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed
        const pendingFeesMonth = fees.filter((f: FeeSummary) => {
          if (!f.next_payment_date || f.status === 'Complete' || f.status === 'Deleted') return false;
          const d = new Date(f.next_payment_date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;

        setStats({
          inquiries: activeInquiries.length,
          followUps: followUps.length,
          courses: Array.isArray(courseRes.data) ? courseRes.data.length : 0,
          admissions: activeAdmissions.length,
          totalReceived: fees.reduce((sum: number, f: FeeSummary) => sum + (Number(f.paid_amount) || 0), 0),
          totalRemaining: fees.reduce((sum: number, f: FeeSummary) => sum + (Number(f.remaining_amount) || 0), 0),
          docPending,
          certPending,
          pendingFeesMonth,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-screen p-0 p-md-2">
      <header className="mb-4">
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--on-surface)' }}>Dashboard</h2>
        <p className="muted">Welcome back! Here's what's happening today.</p>
      </header>

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Inquiries"
            value={stats.inquiries}
            icon={<MessageSquare size={24} />}
            color="#3b82f6"
            onClick={() => navigate('/inquiry')}
            subtitle="Total student inquiries"
            trend="+12%"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Follow-ups"
            value={stats.followUps}
            icon={<Target size={24} />}
            color="#f59e0b"
            onClick={() => navigate('/follow-up')}
            subtitle="Pending follow-ups"
            trend="Active"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Admissions"
            value={stats.admissions}
            icon={<Users size={24} />}
            color="#10b981"
            onClick={() => navigate('/admission')}
            subtitle="Successful enrollments"
            trend="+5%"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Courses"
            value={stats.courses}
            icon={<BookOpen size={24} />}
            color="#8b5cf6"
            onClick={() => navigate('/courses')}
            subtitle="Available programs"
          />
        </div>

        <div className="col-12 col-md-4">
          <StatusCard
            title="Fees Complete"
            icon={<CheckCircle2 size={24} />}
            color="#10b981"
            onClick={() => navigate('/fees?status=Complete')}
            subtitle="Full fees paid students"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatusCard
            title="Fees Half Complete"
            icon={<AlertCircle size={24} />}
            color="#f59e0b"
            onClick={() => navigate('/fees?status=Half Complete')}
            subtitle="Partially paid students"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatusCard
            title="Fees Pending"
            icon={<Clock size={24} />}
            color="#ef4444"
            onClick={() => navigate('/fees?status=Pending')}
            subtitle="Outstanding fees students"
          />
        </div>


        {/* New tracking cards */}
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Document Pending"
            value={stats.docPending}
            icon={<FileX size={24} />}
            color="#f97316"
            onClick={() => navigate('/admission', { state: { docFilter: 'no' } })}
            subtitle="Students without submitted docs"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Certificate Pending"
            value={stats.certPending}
            icon={<Award size={24} />}
            color="#a855f7"
            onClick={() => navigate('/admission', { state: { certFilter: 'no' } })}
            subtitle="Students awaiting certificate"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Fees Due This Month"
            value={stats.pendingFeesMonth}
            icon={<CalendarClock size={24} />}
            color="#dc2626"
            onClick={() => navigate('/pending-fees')}
            subtitle="Next payment date in current month"
            trend="Due"
          />
        </div>
      </div>

      <div className="row mt-4 g-4">
        <div className="col-12">
          <div className="card" style={{ border: '1px solid var(--outline-variant)', borderRadius: '16px' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Quick Insights</h3>
                <TrendingUp size={20} className="muted" />
              </div>
              <div className="row g-4 text-center">
                <div className="col-4">
                  <div className="p-3">
                    <h4 className="muted mb-1" style={{ fontSize: '13px' }}>Conversion Rate</h4>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stats.inquiries > 0 ? ((stats.admissions / stats.inquiries) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="col-4" style={{ borderLeft: '1px solid var(--outline-variant)', borderRight: '1px solid var(--outline-variant)' }}>
                  <div className="p-3">
                    <h4 className="muted mb-1" style={{ fontSize: '13px' }}>Collection %</h4>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stats.totalReceived + stats.totalRemaining > 0
                        ? ((stats.totalReceived / (stats.totalReceived + stats.totalRemaining)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3">
                    <h4 className="muted mb-1" style={{ fontSize: '13px' }}>Doc Submitted %</h4>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stats.admissions > 0 ? (((stats.admissions - stats.docPending) / stats.admissions) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px -10px rgba(0,0,0,0.1);
          border-color: var(--primary) !important;
        }
        .dashboard-screen {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
