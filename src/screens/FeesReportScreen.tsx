import { Search, Download, Calendar, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type FeeSummary, type FeePayment } from '../services/api';
import Pagination from '../components/Pagination';
import { formatDate } from '../services/utils';


export default function FeesReportScreen() {
  const [fees, setFees] = useState<FeeSummary[]>([]);
  const [allPayments, setAllPayments] = useState<FeePayment[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // Year logic: 2024-25, 2025-26 etc.
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const options = [];
    for (let i = -2; i <= 15; i++) {
      const start = currentYear + i;
      const end = (start + 1).toString().slice(-2);
      options.push({ label: `${start}-${end}`, startYear: start });
    }
    return options;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = async () => {
    try {
      setError(null);
      const [feesRes, paymentsRes, admissionsRes] = await Promise.all([
        api.getFees(),
        api.getAllFeePayments(),
        api.getAdmissions()
      ]);
      setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
      setAllPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setAdmissions(Array.isArray(admissionsRes.data) ? admissionsRes.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
      console.error('Load Data Error:', err);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const reportData = useMemo(() => {
    const startRange = customStartDate ? new Date(customStartDate) : (selectedYear ? new Date(`${selectedYear}-04-01T00:00:00`) : null);
    const endRange = customEndDate ? new Date(customEndDate + 'T23:59:59') : (selectedYear ? new Date(`${selectedYear + 1}-03-31T23:59:59`) : null);

    const feesArr = Array.isArray(fees) ? fees : [];
    const paymentsArr = Array.isArray(allPayments) ? allPayments : [];
    const admissionsArr = Array.isArray(admissions) ? admissions : [];

    const result = feesArr.map(f => {
      const studentPayments = paymentsArr.filter(p => {
        const pDate = new Date(p.created_at || '');
        const matchAdmission = p.admission_id === f.admission_id;
        const matchStart = !startRange || (pDate >= startRange);
        const matchEnd = !endRange || (pDate <= endRange);
        return matchAdmission && matchStart && matchEnd;
      });

      const admission = admissionsArr.find(a => a.id === f.admission_id);
      let courseNames = '-';
      let startDates = '-';
      if (admission) {
        try {
          const payload = typeof admission.payload_json === 'string' ? JSON.parse(admission.payload_json) : admission.payload_json;
          if (payload && payload.courses && Array.isArray(payload.courses)) {
            courseNames = payload.courses.map((c: any) => c.courseName).join(', ');
            startDates = payload.courses.map((c: any) => formatDate(c.startDate)).filter((v: any) => v && v !== '-').join(', ');
          }
        } catch (e) { /* ignore */ }
      }

      return {
        ...f,
        courseNames,
        startDates,
        paymentsInRange: studentPayments,
        totalPaidInRange: studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        installments: studentPayments.length
      };
    });

    return result.filter(d => {
      const studentName = d.student_name || '';
      const mobile = d.mobile || '';
      const courseNames = d.courseNames || '';
      const queryLower = query.toLowerCase();

      const queryMatch = !query.trim() ||
        studentName.toLowerCase().includes(queryLower) ||
        mobile.toLowerCase().includes(queryLower) ||
        courseNames.toLowerCase().includes(queryLower);

      const showAllStatuses = ['Pending', 'Half Complete', 'Complete'].includes(d.status);
      return queryMatch && showAllStatuses;
    });
  }, [fees, allPayments, admissions, selectedYear, query, customStartDate, customEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedYear, customStartDate, customEndDate]);

  const exportCsv = () => {
    const headers = ['Student Name', 'Mobile', 'Course', 'Start Date', 'Total Fees', 'Overall Paid', 'Overall Remaining', 'Payment Date', 'Amount Paid (Inst)', 'Installment Remark'];
    const lines: string[] = [];

    reportData.forEach(d => {
      if (d.paymentsInRange.length === 0) {
        lines.push(`"${d.student_name}","${d.mobile}","${d.courseNames}","${d.startDates}","${d.total_amount}","${d.paid_amount}","${d.remaining_amount}","-","0",""`);
      } else {
        d.paymentsInRange.forEach((p: any, index: number) => {
          const pDate = p.payment_date ? formatDate(p.payment_date) : formatDate(p.created_at);
          const rowPrefix = index === 0
            ? `"${d.student_name}","${d.mobile}","${d.courseNames}","${d.startDates}","${d.total_amount}","${d.paid_amount}","${d.remaining_amount}"`
            : '"","","","","","",""';
          lines.push(`${rowPrefix},"${pDate}","${p.amount}","${(p.remark || '').replace(/"/g, '""')}"`);
        });
      }
    });

    const content = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed_fees_report_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSuccessMsg('CSV exported successfully!');

    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);

    setIsExportModalOpen(false);
  };

  return (
    <section className="screen fees-report">
      <header className="topbar" style={{
        position: 'sticky',
        top: '-48px',
        zIndex: 100,
        background: 'var(--background)',
        padding: '12px 0',
        margin: '-48px 0 0 0',
        borderBottom: '1px solid var(--outline-variant)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        minHeight: '80px',
        width: 'calc(100% + 40px)',
        marginLeft: '-20px',
        paddingLeft: '20px',
        paddingRight: '20px'
      }}>
        <h2 style={{ fontSize: '28px', whiteSpace: 'nowrap' }}>Fees Report</h2>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <label className="searchbox" style={{ margin: 0, width: 180 }}>
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student..." style={{ width: '100%' }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} />
            <select
              value={selectedYear || 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedYear(val === 0 ? null : val);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--outline-variant)', height: 42 }}
            >
              <option value={0}>All Years</option>
              {yearOptions.map(opt => (
                <option key={opt.startYear} value={opt.startYear}>{opt.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="btn btn-ghost" style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12 }} title="Start Date" />
              <span className="muted">to</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="btn btn-ghost" style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12 }} title="End Date" />
            </div>
            {(customStartDate || customEndDate) && (
              <button className="btn btn-sm btn-ghost" onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }} style={{ color: 'var(--error)' }}>Reset</button>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setIsExportModalOpen(true)} style={{ height: 42 }}>
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 style={{ marginBottom: 16 }}>Export Fees Report</h3>
            <p className="muted" style={{ marginBottom: 20 }}>Select the year or a custom date range for the report.</p>
            <div className="form-grid">
              <div className="span-2">
                <label>Select Year</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} />
                  <select
                    value={selectedYear || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedYear(val === 0 ? null : val);
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="btn btn-ghost"
                    style={{ border: '1px solid var(--outline-variant)', height: 42, width: '100%' }}
                  >
                    <option value={0}>All Years</option>
                    {yearOptions.map(opt => (
                      <option key={opt.startYear} value={opt.startYear}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label>Custom Start Date</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="btn btn-ghost" style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12, width: '100%' }} />
              </div>
              <div>
                <label>Custom End Date</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="btn btn-ghost" style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12, width: '100%' }} />
              </div>
              <div className="inline-actions form-actions span-2" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setSelectedYear(currentYear); }} style={{ color: 'var(--error)' }}>Reset</button>
                <button type="button" className="btn btn-primary" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={16} /> Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: '#25D366',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 600,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <CheckCircle2 size={20} />
          {successMsg}
          <style>{`
            @keyframes slideDown {
              from { transform: translate(-50%, -100%); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Error Display */}
      {(fees.length === 0 && !query) && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid var(--error)', background: 'var(--error-container)' }}>
          <div style={{ padding: '12px 16px', color: 'var(--on-error-container)' }}>
            <strong>Note:</strong> No fee records found. Make sure the backend is running and data is available.
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          Showing records: <strong>{customStartDate || (selectedYear ? `01-Apr-${selectedYear}` : 'All Time')}</strong> to <strong>{customEndDate || (selectedYear ? `31-Mar-${selectedYear + 1}` : 'Now')}</strong>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table table">
            <thead>
              <tr>
                <th>No</th>
                <th>Student Name</th>
                <th>Course</th>
                <th>Start Date</th>
                <th>Total Fees</th>
                <th>Paid (Period)</th>
                <th>Remaining</th>
                <th>Installments</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td colSpan={8}>No pending fees found for the selected period.</td></tr>
              ) : (
                reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((d, index) => (
                  <tr key={d.admission_id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.student_name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{d.mobile}</div>
                    </td>
                    <td className="truncate-text" title={d.courseNames}>{d.courseNames}</td>
                    <td className="truncate-text" title={d.startDates}>{d.startDates}</td>
                    <td>₹{Number(d.total_amount || 0).toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{Number(d.totalPaidInRange || 0).toFixed(2)}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 600 }}>₹{Number(d.remaining_amount || 0).toFixed(2)}</td>
                    <td>{d.installments}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={reportData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}
