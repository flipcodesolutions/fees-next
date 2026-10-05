import { Search, Wallet, FileText, Download, Trash2, Printer, Edit2, MessageCircle, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type FeeSummary, type FeePayment } from '../services/api';
import Pagination from '../components/Pagination';
import { generateReceiptHtml } from '../components/FeeReceiptTemplate';
import { formatDate, formatCsvDate } from '../services/utils';

const normalizeFeeStatus = (fee: FeeSummary): FeeSummary => {
  if (fee.status === 'Deleted') return fee;
  if (fee.remaining_amount <= 0) {
    return { ...fee, status: 'Complete' };
  }
  if (fee.paid_amount > 0) {
    return { ...fee, status: 'Half Complete' };
  }
  return { ...fee, status: 'Pending' };
};

const getCourseNames = (payloadJson?: string): string => {
  if (!payloadJson) return '';
  try {
    const parsed = JSON.parse(payloadJson);
    if (parsed && Array.isArray(parsed.courses)) {
      return parsed.courses.map((c: any) => c.courseName || '').filter(Boolean).join(', ');
    }
  } catch {
    return '';
  }
  return '';
};

export default function FeesScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const statusFilter = statusParam !== null ? statusParam : '';

  const [fees, setFees] = useState<FeeSummary[]>([]);
  const [query, setQuery] = useState('');

  const [showDeleted, setShowDeleted] = useState(false);
  const [editingDateAdmissionId, setEditingDateAdmissionId] = useState<number | null>(null);
  const [tempNextDate, setTempNextDate] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sendingReceiptId, setSendingReceiptId] = useState<number | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  const [singleConfirmFee, setSingleConfirmFee] = useState<FeeSummary | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);


  const [payingFee, setPayingFee] = useState<FeeSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentNextDate, setPaymentNextDate] = useState('');

  const [reportFee, setReportFee] = useState<FeeSummary | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRemark, setEditRemark] = useState('');

  const loadFees = async () => {
    try {
      setError(null);
      const response = await api.getFees();
      setFees(response.data.map(normalizeFeeStatus));
    } catch (e) {
      setError('Failed to load fees');
    }
  };

  useEffect(() => {
    void loadFees();
  }, []);

  const filteredFees = useMemo(() => {
    let result = fees;
    const needle = query.trim().toLowerCase();

    if (needle) {
      result = result.filter((f) => {
        const courseNames = getCourseNames(f.payload_json);
        return [f.student_name, f.mobile, courseNames].some(v => String(v ?? '').toLowerCase().includes(needle));
      });
    }

    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }

    if (showDeleted) {
      result = result.filter((f) => f.status === 'Deleted');
    } else {
      result = result.filter((f) => f.status !== 'Deleted');
    }

    setCurrentPage(1);
    return result;
  }, [fees, query, statusFilter, showDeleted]);

  const executeExport = async () => {
    try {
      // 1. Fetch fees
      const feesRes = await api.getFees();
      let filteredFees = feesRes.data;

      // Exclude deleted fee records
      filteredFees = filteredFees.filter((f: any) => f.status !== 'Deleted');

      if (exportStatus) {
        filteredFees = filteredFees.filter((f: any) => f.status === exportStatus);
      }

      // 2. Fetch payments
      const paymentsRes = await api.getAllFeePayments();
      let allPayments = paymentsRes.data;

      // 3. Date filters for payments
      const start = exportStartDate ? new Date(exportStartDate).getTime() : 0;
      const end = exportEndDate ? new Date(exportEndDate + 'T23:59:59').getTime() : Infinity;
      const hasDateFilter = !!(exportStartDate || exportEndDate);

      const rows: string[] = [];


      for (const f of filteredFees) {
        // Find payments for this admission
        let studentPayments = allPayments.filter((p: any) => p.admission_id === f.admission_id);

        // Sort by created_at ascending so first installment is first
        studentPayments.sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        });

        // Filter payments by date range
        let filteredPayments = studentPayments;
        if (hasDateFilter) {
          filteredPayments = studentPayments.filter((p: any) => {
            const t = p.created_at ? new Date(p.created_at).getTime() : 0;
            return t >= start && t <= end;
          });

          // If date filter is active and this student has no payments in range, skip them
          if (filteredPayments.length === 0) {
            continue;
          }
        }

        // Parse course name and start date from payload_json
        let courseName = '';
        let courseStartDate = '';
        if (f.payload_json) {
          try {
            const parsed = JSON.parse(f.payload_json);
            if (parsed && Array.isArray(parsed.courses)) {
              courseName = parsed.courses.map((c: any) => c.courseName || '').filter(Boolean).join(', ');
              courseStartDate = parsed.courses.map((c: any) => c.startDate ? formatDate(c.startDate) : '').filter(Boolean).join(', ');
            }
          } catch (e) {
            console.error('Failed to parse payload_json for admission_id:', f.admission_id, e);
          }
        }

        const studentNameEscaped = (f.student_name ?? '').replace(/"/g, '""');
        const mobileEscaped = (f.mobile ?? '').replace(/"/g, '""');
        const courseNameEscaped = courseName.replace(/"/g, '""');
        const courseStartDateEscaped = courseStartDate.replace(/"/g, '""');
        const totalFees = f.total_amount ?? 0;
        const overallPaid = f.paid_amount ?? 0;
        const overallRemaining = f.remaining_amount ?? 0;

        if (filteredPayments.length === 0) {
          // Student with no payments
          rows.push(`"${studentNameEscaped}","${mobileEscaped}","${courseNameEscaped}","${courseStartDateEscaped}","${totalFees}","${overallPaid}","${overallRemaining}","","",""`);
        } else {
          // Student with payments
          filteredPayments.forEach((p: any, idx: number) => {
            const payDate = formatCsvDate(p.created_at);
            const payAmount = p.amount ?? 0;
            const payRemark = (p.remark ?? '').replace(/"/g, '""');

            if (idx === 0) {
              // First row includes student details
              rows.push(`"${studentNameEscaped}","${mobileEscaped}","${courseNameEscaped}","${courseStartDateEscaped}","${totalFees}","${overallPaid}","${overallRemaining}",${payDate},"${payAmount}","${payRemark}"`);
            } else {
              // Subsequent rows leave student details blank
              rows.push(`"","","","","","","",${payDate},"${payAmount}","${payRemark}"`);
            }
          });
        }
      }

      if (rows.length === 0) {
        alert('No fee records found matching the selected filters.');
        return;
      }

      const headers = [
        'Student Name',
        'Mobile',
        'Course',
        'Start Date',
        'Total Fees',
        'Overall Paid',
        'Overall Remaining',
        'Payment Date',
        'Amount Paid (Inst)',
        'Installment Remark'
      ];

      const content = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_fee_status_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to export CSV. Ensure backend is updated.');
    }
  };


  const handleRestoreFee = async (f: FeeSummary) => {
    try {
      let activeStatus = 'Pending';
      if (f.paid_amount > 0) {
        activeStatus = f.remaining_amount <= 0 ? 'Complete' : 'Half Complete';
      }
      await api.updateFeeStatus(f.admission_id, activeStatus);
      await loadFees();
      setSuccessMsg('Fee record restored successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to restore fee record');
    }
  };

  const handlePermanentDeleteFee = async (admissionId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this fee record and all its payments?')) return;
    try {
      await api.deleteFeeSummary(admissionId);
      await loadFees();
      setSuccessMsg('Fee record deleted permanently');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to delete fee record permanently');
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      await api.deleteFeePayment(paymentId);
      if (reportFee) {
        // Refresh payments inside the open report
        const res = await api.getFeePayments(reportFee.admission_id);
        setPayments(res.data);
      }
      await loadFees(); // refresh main table
    } catch (e) {
      setError('Failed to delete payment');
    }
  };

  const printReceipt = (payment: FeePayment) => {
    const receiptHtml = generateReceiptHtml(payment, reportFee || undefined, payingFee || undefined);

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(receiptHtml);
      doc.close();

      // The script inside generateReceiptHtml will handle window.print()
      // We just need to remove the iframe after some time
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 10000); // Wait 10 seconds before cleanup to ensure print dialog finished
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editAmount) return;
    try {
      await api.updateFeePayment(editingPayment.id!, {
        amount: Number(editAmount),
        remark: editRemark,
        created_at: editDate
      });
      setEditingPayment(null);
      if (reportFee) {
        const res = await api.getFeePayments(reportFee.admission_id);
        setPayments(res.data);
      }
      await loadFees();
    } catch (e) {
      setError('Failed to update payment');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingFee || !paymentAmount) return;
    try {
      const isFullPayment = Number(paymentAmount) >= payingFee.remaining_amount;
      await api.addFeePayment({
        admission_id: payingFee.admission_id,
        amount: Number(paymentAmount),
        remark: paymentRemark,
        created_at: paymentDate,
        next_payment_date: isFullPayment ? undefined : (paymentNextDate || undefined)
      });
      setPayingFee(null);
      setPaymentAmount('');
      setPaymentRemark('');
      setPaymentDate('');
      setPaymentNextDate('');
      await loadFees();
    } catch (e) {
      setError('Failed to add payment');
    }
  };

  const openReport = async (fee: FeeSummary) => {
    try {
      const res = await api.getFeePayments(fee.admission_id);
      setPayments(res.data);
      setReportFee(fee);
    } catch (e) {
      setError('Failed to load payments report');
    }
  };

  const sendWhatsAppReminder = async (f: FeeSummary) => {
    if (!f.mobile) {
      setError(`No mobile number found for ${f.student_name}`);
      setTimeout(() => setError(null), 4000);
      return;
    }
    setSendingReminderId(f.admission_id);
    try {
      await api.sendWhatsAppReminder({
        to: f.mobile,
        studentName: f.student_name!,
        remainingAmount: f.remaining_amount
      });
      setSuccessMsg(`WhatsApp reminder sent to ${f.student_name} (${f.mobile})`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to send reminder';
      setError(`WhatsApp Reminder Failed: ${errMsg}`);
      setTimeout(() => setError(null), 6000);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleOpenSingleReminderConfirm = (f: FeeSummary) => {
    if (!f.mobile) {
      setError(`No mobile number found for ${f.student_name}`);
      setTimeout(() => setError(null), 4000);
      return;
    }
    setSingleConfirmFee(f);
  };

  const handleConfirmSingleReminder = async () => {
    if (!singleConfirmFee) return;
    const target = singleConfirmFee;
    setSingleConfirmFee(null);
    await sendWhatsAppReminder(target);
  };

  const handleOpenBulkConfirm = () => {
    const targetStudents = filteredFees.filter(f => f.mobile && f.status !== 'Deleted');
    if (targetStudents.length === 0) {
      alert('No students found with valid mobile numbers for the current selection.');
      return;
    }
    setIsBulkConfirmOpen(true);
  };

  const handleConfirmBulkReminders = async () => {
    setIsBulkConfirmOpen(false);
    await executeBulkReminders();
  };

  const executeBulkReminders = async () => {
    const targetStudents = filteredFees.filter(f => f.mobile && f.status !== 'Deleted');
    if (targetStudents.length === 0) return;

    const filterLabel = statusFilter
      ? `status "${statusFilter}"`
      : (query.trim() ? `search "${query}"` : 'All Status');

    setIsBulkSending(true);
    let successCount = 0;
    let failCount = 0;
    for (const s of targetStudents) {
      try {
        await api.sendWhatsAppReminder({
          to: s.mobile!,
          studentName: s.student_name!,
          remainingAmount: s.remaining_amount
        });
        successCount++;
      } catch (e: any) {
        console.error(`Failed to send reminder to ${s.student_name}:`, e);
        failCount++;
      }
    }
    setIsBulkSending(false);
    if (failCount > 0) {
      setSuccessMsg(`Bulk reminders: Sent ${successCount} successfully, ${failCount} failed.`);
    } else {
      setSuccessMsg(`Bulk reminders sent successfully to all ${successCount} student(s) (${filterLabel}).`);
    }
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const sendWhatsAppReceipt = async (paymentId: number) => {
    setSendingReceiptId(paymentId);
    try {
      await api.sendWhatsAppReceipt({ paymentId });
      setSuccessMsg('Receipt sent via WhatsApp');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to send receipt via WhatsApp');
    } finally {
      setSendingReceiptId(null);
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
        <h2 style={{ fontSize: '28px', whiteSpace: 'nowrap' }}>Fees Management</h2>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <label className="searchbox">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name/mobile..." style={{ width: 150 }} />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setSearchParams({ status: e.target.value })}
            className="btn btn-ghost"
            style={{ border: '1px solid var(--outline-variant)', height: 42, padding: '0 12px' }}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Half Complete">Half Complete</option>
            <option value="Complete">Complete</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleOpenBulkConfirm}
            disabled={isBulkSending}
            style={{ backgroundColor: '#25D366', borderColor: '#128C7E', display: 'flex', alignItems: 'center', gap: 6, height: 42 }}
          >
            <Send size={16} />
            {isBulkSending ? 'Sending...' : 'Send All'}
          </button>
          <button
            className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowDeleted(!showDeleted)}
            style={{ height: '42px', minWidth: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: showDeleted ? 'none' : '1px solid var(--outline-variant)' }}
            title="Toggle Deleted Records"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>



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

      {error && (
        <div className="card" style={{ padding: 14, borderColor: 'var(--error)' }}>
          <strong style={{ color: 'var(--error)' }}>{error}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h3>{showDeleted ? 'Deleted Fee Records' : 'Student Fee Status'}</h3>
          <div className="inline-actions">
            {showDeleted ? (
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleted(false)}
                style={{ padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid var(--outline-variant)' }}
              >
                <RotateCcw size={14} style={{ transform: 'rotate(-90deg)' }} />
                Back
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setIsExportModalOpen(true)} style={{ fontSize: 13 }}>
                <Wallet size={14} style={{ marginRight: 6 }} /> Export CSV
              </button>
            )}
          </div>
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
                <th>Next Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.length === 0 ? (
                <tr><td colSpan={9}>No fee records found.</td></tr>
              ) : (
                filteredFees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((f, index) => (
                  <tr key={f.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.student_name}</div>
                      {getCourseNames(f.payload_json) && (
                        <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 2, fontWeight: 500 }}>
                          {getCourseNames(f.payload_json)}
                        </div>
                      )}
                    </td>
                    <td>{f.mobile}</td>
                    <td>₹{f.total_amount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{f.paid_amount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 600 }}>₹{f.remaining_amount?.toFixed(2)}</td>
                    <td>
                      <span className={`tag tag-${f.status?.toLowerCase().replace(' ', '-')}`}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: f.next_payment_date ? 'var(--primary)' : 'var(--outline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {formatDate(f.next_payment_date)}
                        {f.remaining_amount > 0 && (
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingDateAdmissionId(f.admission_id);
                              setTempNextDate(f.next_payment_date ? f.next_payment_date.slice(0, 10) : '');
                            }}
                            style={{ padding: 2, height: 'auto', color: 'var(--outline)' }}
                            title="Edit Next Payment Date"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {showDeleted ? (
                          <>
                            <button
                              className="icon-btn"
                              onClick={() => handleRestoreFee(f)}
                              title="Restore"
                              style={{ color: 'var(--primary)' }}
                            >
                              <RotateCcw size={18} />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => handlePermanentDeleteFee(f.admission_id)}
                              title="Permanent Delete"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-btn"
                              onClick={() => {
                                setPayingFee(f);
                                const today = new Date();
                                const yyyy = today.getFullYear();
                                const mm = String(today.getMonth() + 1).padStart(2, '0');
                                const dd = String(today.getDate()).padStart(2, '0');
                                setPaymentDate(`${yyyy}-${mm}-${dd}`);
                                setPaymentNextDate(f.next_payment_date ? f.next_payment_date.slice(0, 10) : '');
                              }}
                              disabled={f.remaining_amount <= 0}
                              style={{ color: f.remaining_amount <= 0 ? 'var(--outline)' : 'var(--primary)' }}
                              title="Pay Fees"
                            >
                              <Wallet size={18} />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => openReport(f)}
                              title="Fee Report"
                            >
                              <FileText size={18} />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => handleOpenSingleReminderConfirm(f)}
                              disabled={!f.mobile || sendingReminderId === f.admission_id}
                              style={{ color: f.mobile ? '#25D366' : 'var(--outline)' }}
                              title={f.mobile ? `Send WhatsApp Reminder to ${f.student_name}` : 'No mobile number'}
                            >
                              <MessageCircle size={18} fill={f.mobile ? '#25D366' : 'none'} />
                            </button>

                          </>
                        )}
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

      {/* Payment Modal */}
      {payingFee && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3>Add Payment - {payingFee.student_name}</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Total: ₹{payingFee.total_amount} | Remaining: ₹{payingFee.remaining_amount}
            </p>
            <form onSubmit={handlePay} className="form-grid">
              <div className="span-2">
                <label>Amount to Pay (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={payingFee.remaining_amount}
                  required
                />
              </div>
              <div className="span-2">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div className="span-2">
                <label>Next Payment Date {Number(paymentAmount) >= payingFee.remaining_amount ? <span style={{ color: 'var(--outline)', fontWeight: 400, fontSize: 11 }}>(N/A – Full Payment)</span> : null}</label>
                <input
                  type="date"
                  value={paymentNextDate}
                  onChange={(e) => setPaymentNextDate(e.target.value)}
                  disabled={Number(paymentAmount) >= payingFee.remaining_amount}
                  style={{ opacity: Number(paymentAmount) >= payingFee.remaining_amount ? 0.4 : 1 }}
                  placeholder="Next installment due date"
                />
              </div>
              <div className="span-2">
                <label>Remark</label>
                <input
                  value={paymentRemark}
                  onChange={(e) => setPaymentRemark(e.target.value)}
                  placeholder="e.g. Cash, GPay, Check..."
                />
              </div>
              <div className="inline-actions form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setPayingFee(null); setPaymentNextDate(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportFee && (
        <div className="modal-overlay">
          <div className="modal-content-custom" style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Fee Report: {reportFee.student_name}</h3>
              <div className="inline-actions">
                <button className="btn btn-ghost" onClick={() => setReportFee(null)}>Close</button>
              </div>
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
                  <label className="muted" style={{ fontSize: 11 }}>Total Remaining</label>
                  <div style={{ fontWeight: 700, color: 'var(--error)' }}>₹{reportFee.remaining_amount}</div>
                </div>
              </div>
            </div>

            <h4>Payment History</h4>
            <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="data-table table mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Remark</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={4}>No payments yet.</td></tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>₹{p.amount}</td>
                        <td>{p.remark}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" onClick={() => printReceipt(p)} title="Print Receipt"><Printer size={14} /></button>
                            <button
                              className="icon-btn"
                              onClick={() => p.id && sendWhatsAppReceipt(p.id)}
                              disabled={sendingReceiptId === p.id}
                              style={{ color: '#25D366' }}
                              title="Send WhatsApp Receipt"
                            >
                              <MessageCircle size={14} fill="#25D366" />
                            </button>
                            <button className="icon-btn" onClick={() => {
                              setEditingPayment(p);
                              setEditAmount(p.amount.toString());
                              setEditRemark(p.remark);
                              setEditDate(p.created_at ? p.created_at.slice(0, 10) : '');
                            }} title="Edit Payment" style={{ color: 'var(--primary)' }}><Edit2 size={14} /></button>
                            <button className="icon-btn" onClick={() => p.id && handleDeletePayment(p.id)} title="Delete Payment" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content-custom">
            <h3>Edit Payment</h3>
            <form onSubmit={handleUpdatePayment} className="form-grid">
              <div className="span-2">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                />
              </div>
              <div className="span-2">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>
              <div className="span-2">
                <label>Remark</label>
                <input
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                />
              </div>
              <div className="inline-actions form-actions span-2">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingPayment(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 style={{ marginBottom: 16 }}>Export Fee Installments</h3>
            <p className="muted" style={{ marginBottom: 20 }}>Select filters below to download specific fee payments.</p>
            <div className="form-grid">
              <div>
                <label>Start Date</label>
                <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} />
              </div>
              <div className="span-2">
                <label>Status</label>
                <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Half Complete">Half Complete</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
              <div className="inline-actions form-actions span-2">
                <button type="button" className="btn btn-ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setExportStartDate(''); setExportEndDate(''); setExportStatus(''); }} style={{ color: 'var(--error)' }}>Clear</button>
                <button type="button" className="btn btn-primary" onClick={executeExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={16} /> Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Next Payment Date Modal */}
      {editingDateAdmissionId !== null && (
        <div className="modal-overlay">
          <div className="modal-content-custom" style={{ maxWidth: 350 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Update Next Payment Date</h3>
              <button className="btn btn-ghost" onClick={() => setEditingDateAdmissionId(null)}>Close</button>
            </div>
            <div className="form-grid">
              <div>
                <label>Next Payment Date</label>
                <input
                  type="date"
                  value={tempNextDate}
                  onChange={(e) => setTempNextDate(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}
                />
                <p className="muted mt-2" style={{ fontSize: 12 }}>Leave blank to clear the date.</p>
              </div>
            </div>
            <div className="inline-actions" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setEditingDateAdmissionId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                api.updateFeeNextPaymentDate(editingDateAdmissionId, tempNextDate || null)
                  .then(() => {
                    setEditingDateAdmissionId(null);
                    loadFees();
                  })
                  .catch(() => alert('Failed to update date'));
              }}>
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single WhatsApp Reminder Confirmation Modal */}
      {singleConfirmFee && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content-custom" style={{ maxWidth: 440, textAlign: 'center', padding: '28px 24px' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#25D366'
            }}>
              <MessageCircle size={32} fill="#25D366" color="#25D366" />
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Send WhatsApp Reminder?</h3>
            <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
              Are you sure you want to send a fee reminder message on WhatsApp to this student?
            </p>

            <div style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'left',
              marginBottom: 24,
              border: '1px solid var(--outline-variant)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span className="muted">Student Name:</span>
                <strong>{singleConfirmFee.student_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span className="muted">Mobile Number:</span>
                <strong style={{ color: '#25D366' }}>{singleConfirmFee.mobile}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span className="muted">Remaining Fees:</span>
                <strong style={{ color: 'var(--error)' }}>₹{singleConfirmFee.remaining_amount?.toFixed(2)}</strong>
              </div>
              {singleConfirmFee.next_payment_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span className="muted">Next Payment Date:</span>
                  <strong>{formatDate(singleConfirmFee.next_payment_date)}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSingleConfirmFee(null)}
                style={{ flex: 1, height: 42, border: '1px solid var(--outline-variant)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSingleReminder}
                style={{
                  flex: 1,
                  height: 42,
                  backgroundColor: '#25D366',
                  borderColor: '#128C7E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Send size={16} /> Okay, Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Reminders Confirmation Modal */}
      {isBulkConfirmOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content-custom" style={{ maxWidth: 460, textAlign: 'center', padding: '28px 24px' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#25D366'
            }}>
              <Send size={30} color="#25D366" />
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Send All Fee Reminders?</h3>
            <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
              Are you sure you want to send WhatsApp fee reminder messages to all students in the current view?
            </p>

            <div style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'left',
              marginBottom: 24,
              border: '1px solid var(--outline-variant)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span className="muted">Total Recipients:</span>
                <strong style={{ color: '#25D366', fontSize: 15 }}>
                  {filteredFees.filter(f => f.mobile && f.status !== 'Deleted').length} Student
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span className="muted">Current Status Filter:</span>
                <strong>{statusFilter || 'All Status (Pending, Half Complete & Complete)'}</strong>
              </div>
              {query && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span className="muted">Search Filter:</span>
                  <strong>"{query}"</strong>
                </div>
              )}
              {/* <div style={{ fontSize: 12, color: 'var(--outline)', marginTop: 8, borderTop: '1px dashed var(--outline-variant)', paddingTop: 8 }}>
                ℹ️ Messages will be sent to all {filteredFees.filter(f => f.mobile && f.status !== 'Deleted').length} student(s) with valid mobile numbers matching your current filter.
              </div> */}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsBulkConfirmOpen(false)}
                style={{ flex: 1, height: 42, border: '1px solid var(--outline-variant)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmBulkReminders}
                style={{
                  flex: 1,
                  height: 42,
                  backgroundColor: '#25D366',
                  borderColor: '#128C7E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Send size={16} /> Okay, Send All
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
