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
      <header className="topbar topbar-sticky">
        <div className="topbar-title-wrap">
          <CalendarClock size={24} className="text-danger-icon" />
          <h2 className="topbar-title-text">Pending Fees</h2>
        </div>
        <div className="topbar-actions">
          <label className="searchbox">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name/mobile..." className="search-input-sm" />
          </label>
        </div>
      </header>

      {error && (
        <div className="card crm-alert-card alert-error">
          <strong>{error}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <div>
            <h3>Fees Due in {monthName}</h3>
            <p className="muted text-muted-sm">
              Students whose next payment date falls in the current month
            </p>
          </div>
          <span className="pending-badge-count">
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
                  <td colSpan={9} className="table-empty-cell">
                    <CalendarClock size={36} className="table-empty-icon" />
                    <div className="text-semibold">No pending fees for {monthName}</div>
                    <div className="muted text-muted-sm">All payments are up to date or no next payment dates are set</div>
                  </td>
                </tr>
              ) : (
                filteredFees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((f, index) => (
                  <tr key={f.id} className="pending-row-highlight">
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="text-semibold">{f.student_name}</td>
                    <td>{f.mobile}</td>
                    <td>₹{f.total_amount?.toFixed(2)}</td>
                    <td className="text-success-bold">₹{f.paid_amount?.toFixed(2)}</td>
                    <td className="text-danger-bold">₹{f.remaining_amount?.toFixed(2)}</td>
                    <td>
                      <span className={`tag tag-${f.status?.toLowerCase().replace(' ', '-')}`}>
                        {f.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge-overdue">
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
                            window.location.hash = '#/fees';
                          }}
                          title="Go to Fees to Add Payment"
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
          <div className="modal-content-custom">
            <div className="card-header-row p-0 mb-3">
              <h3>Fee Report: {reportFee.student_name}</h3>
              <button className="btn btn-ghost" onClick={() => setReportFee(null)}>Close</button>
            </div>

            <div className="card modal-summary-box">
              <div className="form-grid modal-summary-grid">
                <div>
                  <label className="muted modal-label-sm">Total Fees</label>
                  <div className="text-bold">₹{reportFee.total_amount}</div>
                </div>
                <div>
                  <label className="muted modal-label-sm">Total Paid</label>
                  <div className="text-bold text-success-bold">₹{reportFee.paid_amount}</div>
                </div>
                <div>
                  <label className="muted modal-label-sm">Remaining</label>
                  <div className="text-bold text-danger-bold">₹{reportFee.remaining_amount}</div>
                </div>
              </div>
            </div>

            <h4>Payment History</h4>
            <div className="table-responsive table-scroll-container">
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
                        <td className="text-semibold">₹{p.amount}</td>
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
