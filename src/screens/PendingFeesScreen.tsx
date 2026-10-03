import { Search, Wallet, FileText, CalendarClock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type FeeSummary, type FeePayment } from '../services/api';
import Pagination from '../components/Pagination';
import { formatDate } from '../services/utils';

export default function PendingFeesScreen() {
  const [fees, setFees] = useState<FeeSummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [reportFee, setReportFee] = useState<FeeSummary | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const loadFees = async () => {
    try {
      setError(null);
      const response = await api.getFees();
      setFees(response.data);
    } catch {
      setError('Failed to load fees');
    }
  };

  useEffect(() => {
    void loadFees();
  }, []);

  // Only fees with next_payment_date in the current month and not complete
  const filteredFees = useMemo(() => {
    let result = fees.filter((f) => {
      if (!f.next_payment_date || f.status === 'Complete' || f.status === 'Deleted') return false;
      const d = new Date(f.next_payment_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter((f) =>
        [f.student_name, f.mobile].some(v => String(v ?? '').toLowerCase().includes(needle))
      );
    }

    setCurrentPage(1);
    return result;
  }, [fees, query, currentYear, currentMonth]);

  const openReport = async (fee: FeeSummary) => {
    try {
      const res = await api.getFeePayments(fee.admission_id);
      setPayments(res.data);
      setReportFee(fee);
    } catch {
      setError('Failed to load payments report');
    }
  };

  return (
    <section className="screen fees">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarClock size={24} style={{ color: '#dc2626' }} />
          <h2 style={{ fontSize: '28px', whiteSpace: 'nowrap' }}>Pending Fees</h2>
        </div>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="searchbox">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name/mobile..." style={{ width: 160 }} />
          </label>
        </div>
      </header>

      {error && (
        <div className="card" style={{ padding: 14, borderColor: 'var(--error)' }}>
          <strong style={{ color: 'var(--error)' }}>{error}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <div>
            <h3 style={{ margin: 0 }}>Fees Due in {monthName}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Students whose next payment date falls in the current month
            </p>
          </div>
          <span style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: '#dc2626',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 20,
            padding: '4px 14px',
            fontWeight: 700,
            fontSize: 14
          }}>
            {filteredFees.length} pending
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table table">
            <thead>
              <tr>
                <th>No</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Total Fees</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Next Payment Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>
                    <CalendarClock size={36} style={{ color: 'var(--outline)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>No pending fees for {monthName}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>All payments are up to date or no next payment dates are set</div>
                  </td>
                </tr>
              ) : (
                filteredFees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((f, index) => (
                  <tr key={f.id} style={{ backgroundColor: 'rgba(220, 38, 38, 0.02)' }}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                    <td>{f.mobile}</td>
                    <td>₹{f.total_amount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{f.paid_amount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 700 }}>₹{f.remaining_amount?.toFixed(2)}</td>
                    <td>
                      <span className={`tag tag-${f.status?.toLowerCase().replace(' ', '-')}`}>
                        {f.status}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {formatDate(f.next_payment_date)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          onClick={() => openReport(f)}
                          title="Fee Report"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => {
                            // Navigate to Fees Management to add payment
                            window.location.hash = '#/fees';
                          }}
                          title="Go to Fees to Add Payment"
                          style={{ color: 'var(--primary)' }}
                        >
                          <Wallet size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredFees.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Report Modal */}
      {reportFee && (
        <div className="modal-overlay">
          <div className="modal-content-custom" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Fee Report: {reportFee.student_name}</h3>
              <button className="btn btn-ghost" onClick={() => setReportFee(null)}>Close</button>
            </div>

            <div className="card" style={{ background: 'var(--surface-container-low)', marginBottom: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', padding: 12 }}>
                <div>
                  <label className="muted" style={{ fontSize: 11 }}>Total Fees</label>
                  <div style={{ fontWeight: 700 }}>₹{reportFee.total_amount}</div>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 11 }}>Total Paid</label>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{reportFee.paid_amount}</div>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 11 }}>Remaining</label>
                  <div style={{ fontWeight: 700, color: 'var(--error)' }}>₹{reportFee.remaining_amount}</div>
                </div>
              </div>
            </div>

            <h4>Payment History</h4>
            <div className="table-responsive" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="data-table table mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={3}>No payments yet.</td></tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>₹{p.amount}</td>
                        <td>{p.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
