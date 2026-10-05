import { Search, Download, Calendar, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type FeePayment } from '../services/api';
import Pagination from '../components/Pagination';
import { formatDate, formatCsvDate } from '../services/utils';

export default function ReceiptReportScreen() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [feesRes, paymentsRes] = await Promise.all([
        api.getFees(),
        api.getAllFeePayments()
      ]);
      const feesList = Array.isArray(feesRes.data) ? feesRes.data : [];
      const paymentsList = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];

      const combined: any[] = [];
      const activeFees = feesList.filter((f: any) => f.status !== 'Deleted');
      const feesMap = new Map<number, any>();
      activeFees.forEach((f: any) => feesMap.set(f.admission_id, f));

      // Only add individual payment entries with actual payments (amount > 0)
      paymentsList.forEach((p: any) => {
        const feeAmount = Number(p.amount || 0);
        if (feeAmount <= 0) return; // Ignore 0 or empty payment entries

        const fee = feesMap.get(p.admission_id);
        // Exclude if associated student/fee is deleted
        if (feesList.some((f: any) => f.admission_id === p.admission_id && f.status === 'Deleted')) {
          return;
        }

        combined.push({
          id: p.id,
          admission_id: p.admission_id,
          student_name: (fee && fee.student_name) || p.student_name,
          mobile: (fee && fee.mobile) || p.mobile,
          amount: feeAmount,
          payment_date: p.payment_date || p.created_at,
          next_payment_date: p.next_payment_date || (fee && fee.next_payment_date),
          remark: p.remark || '-',
          created_at: p.created_at || p.payment_date,
          numeric_id: typeof p.id === 'number' ? p.id : Number(p.id) || 0
        });
      });

      setPayments(combined);
    } catch (err: any) {
      console.error('Failed to load receipts:', err);
      setError(err?.message || 'Failed to load receipt report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filter payments based on search query and optional date range
  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return payments.filter((item) => {
      // 1. Text Search matching
      const studentName = (item.student_name || '').toLowerCase();
      const mobile = (item.mobile || '').toLowerCase();
      const remark = (item.remark || '').toLowerCase();
      const amountStr = String(item.amount || '');
      const paymentDateFormatted = formatDate(item.payment_date || item.created_at).toLowerCase();
      const nextDateFormatted = formatDate(item.next_payment_date).toLowerCase();

      const matchesQuery = !q ||
        studentName.includes(q) ||
        mobile.includes(q) ||
        remark.includes(q) ||
        amountStr.includes(q) ||
        paymentDateFormatted.includes(q) ||
        nextDateFormatted.includes(q);

      if (!matchesQuery) return false;

      // 2. Date Range matching
      const rawDate = item.payment_date || item.created_at;
      if (rawDate && (startMs !== null || endMs !== null)) {
        const itemTime = new Date(rawDate).getTime();
        if (startMs !== null && itemTime < startMs) return false;
        if (endMs !== null && itemTime > endMs) return false;
      }

      return true;
    });
  }, [payments, query, startDate, endDate]);

  // UI DISPLAY: Strictly newest/latest-entered entry on top (DSC by numeric_id)
  const sortedPaymentsDesc = useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      const idA = typeof a.numeric_id === 'number' ? a.numeric_id : (Number(a.id) || 0);
      const idB = typeof b.numeric_id === 'number' ? b.numeric_id : (Number(b.id) || 0);
      if (idB !== idA) {
        return idB - idA; // Highest ID (last entered entry) on top!
      }
      const dateA = new Date(a.payment_date || a.created_at || '').getTime();
      const dateB = new Date(b.payment_date || b.created_at || '').getTime();
      return dateB - dateA;
    });
  }, [filteredPayments]);

  // EXCEL EXPORT: Strictly earliest-entered entry on top (ASC by numeric_id)
  const exportToExcel = () => {
    if (filteredPayments.length === 0) {
      alert('No receipts available to export.');
      return;
    }

    const sortedAsc = [...filteredPayments].sort((a, b) => {
      const idA = typeof a.numeric_id === 'number' ? a.numeric_id : (Number(a.id) || 0);
      const idB = typeof b.numeric_id === 'number' ? b.numeric_id : (Number(b.id) || 0);
      if (idA !== idB) {
        return idA - idB; // Lowest ID (earliest entered entry) on top!
      }
      const dateA = new Date(a.payment_date || a.created_at || '').getTime();
      const dateB = new Date(b.payment_date || b.created_at || '').getTime();
      return dateA - dateB;
    });

    const headers = ['No', 'Student Name', 'Payment Date', 'Amount', 'Next Payment Date', 'Remark'];

    const rows = sortedAsc.map((item, index) => {
      const no = index + 1;
      const studentName = `"${(item.student_name || '').replace(/"/g, '""')}"`;
      const paymentDate = formatCsvDate(item.payment_date || item.created_at);
      const amount = Number(item.amount || 0).toFixed(2);
      const nextPaymentDate = formatCsvDate(item.next_payment_date);
      const remark = `"${(item.remark || '').replace(/"/g, '""')}"`;

      return [no, studentName, paymentDate, amount, nextPaymentDate, remark].join(',');
    });

    // \uFEFF Byte Order Mark ensures Microsoft Excel displays UTF-8 characters properly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nowStr = new Date().toISOString().split('T')[0];
    link.download = `receipt_report_${nowStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setSuccessMsg('Receipt report exported successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Reset page when search or date filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, startDate, endDate]);

  const totalCount = sortedPaymentsDesc.length;

  // Pagination slicing (10 records per page)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPaymentsDesc.slice(start, start + itemsPerPage);
  }, [sortedPaymentsDesc, currentPage, itemsPerPage]);

  return (
    <section className="screen receipt-report">
      {/* Top Header Bar */}
      <header
        className="topbar"
        style={{
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
        }}
      >
        <h2 style={{ fontSize: '28px', whiteSpace: 'nowrap' }}>Receipt Report</h2>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          {/* Search Bar */}
          <label className="searchbox" style={{ margin: 0, width: 170 }}>
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student..."
              style={{ width: '100%' }}
            />
          </label>

          {/* Date Range Filtering */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={18} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12, padding: '0 8px' }}
              title="From Payment Date"
            />
            <span className="muted" style={{ fontSize: 12 }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--outline-variant)', height: 42, fontSize: 12, padding: '0 8px' }}
              title="To Payment Date"
            />
            {(startDate || endDate) && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ color: 'var(--error)', height: 42, display: 'flex', alignItems: 'center', gap: 4 }}
                title="Clear Date Filter"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* Refresh / Restart Button */}
          <button
            className="btn btn-ghost"
            onClick={loadData}
            style={{ border: '1px solid var(--outline-variant)', height: 42, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            title="Reload latest fees & receipts"
          >
            <RotateCcw size={14} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            className="btn btn-primary"
            onClick={exportToExcel}
            style={{ height: 42, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            title="Export CSV"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      {/* Success Notification Alert */}
      {successMsg && (
        <div
          className="card"
          style={{
            marginTop: 16,
            marginBottom: 8,
            padding: '10px 16px',
            backgroundColor: '#dcfce7',
            borderColor: '#86efac',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 8
          }}
        >
          <CheckCircle2 size={18} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Alert */}
      {error && (
        <div
          className="card"
          style={{
            marginTop: 16,
            marginBottom: 8,
            padding: '10px 16px',
            backgroundColor: '#fee2e2',
            borderColor: '#fca5a5',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 8
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Card with card-header-row */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header-row">
          <h3 style={{ margin: 0 }}>All Receipts</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                <th>Student Name</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Next Payment Date</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Loading receipt entries...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 16, color: '#374151' }}>No Receipt Entries Found</strong>
                      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        {query || startDate || endDate
                          ? 'Try adjusting your search query or date filters.'
                          : 'No fee payment entries have been logged in the system yet.'}
                      </p>
                      {(query || startDate || endDate) && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => { setQuery(''); setStartDate(''); setEndDate(''); }}
                          style={{ marginTop: 8, border: '1px solid var(--outline-variant)' }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                  const paymentDateFormatted = formatDate(item.payment_date || item.created_at);
                  const nextDateRaw = item.next_payment_date;
                  const nextDateFormatted = nextDateRaw && nextDateRaw !== '-' && nextDateRaw !== 'null' ? formatDate(nextDateRaw) : '-';

                  return (
                    <tr key={item.id || index}>
                      {/* 1. No */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>
                        {serialNo}
                      </td>

                      {/* 2. Student Name */}
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {item.student_name || '-'}
                        </div>
                        {item.mobile && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>
                            {item.mobile}
                          </div>
                        )}
                      </td>

                      {/* 3. Payment Date */}
                      <td>
                        <span>{paymentDateFormatted}</span>
                      </td>

                      {/* 4. Amount */}
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 5. Next Payment Date */}
                      <td>
                        {nextDateFormatted !== '-' ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 500,
                              fontSize: 13
                            }}
                          >
                            {nextDateFormatted}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>

                      {/* 6. Remark */}
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {item.remark || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}
