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
      <header className="topbar topbar-sticky">
        <h2 className="topbar-title-nowrap">Fees Management</h2>
        <div className="topbar-actions topbar-actions-flex">
          <label className="searchbox searchbox-sm">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name/mobile..." className="searchbox-sm" />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setSearchParams({ status: e.target.value })}
            className="btn btn-ghost filter-select-year"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Half Complete">Half Complete</option>
            <option value="Complete">Complete</option>
          </select>
          <button
            className="btn btn-primary whatsapp-btn"
            onClick={handleOpenBulkConfirm}
            disabled={isBulkSending}
          >
            <Send size={16} />
            {isBulkSending ? 'Sending...' : 'Send All'}
          </button>
          <button
            className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary filter-btn-toggle-deleted active' : 'btn-ghost filter-btn-toggle-deleted'}`}
            onClick={() => setShowDeleted(!showDeleted)}
            title="Toggle Deleted Records"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {successMsg && (
        <div className="crm-floating-banner">
          <CheckCircle2 size={20} />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="card crm-alert-card alert-error">
          <strong>{error}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h3>{showDeleted ? 'Deleted Fee Records' : 'Student Fee Status'}</h3>
          <div className="inline-actions">
            {showDeleted ? (
              <button
                className="btn btn-ghost topbar-btn-back"
                onClick={() => setShowDeleted(false)}
              >
                <RotateCcw size={14} className="rotate-icon-back" />
                Back
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setIsExportModalOpen(true)}>
                <Wallet size={14} className="mr-6" /> Export CSV
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
                      <div className="student-name-cell">{f.student_name}</div>
                      {getCourseNames(f.payload_json) && (
                        <div className="course-sub-label">
                          {getCourseNames(f.payload_json)}
                        </div>
                      )}
                    </td>
                    <td>{f.mobile}</td>
                    <td>₹{f.total_amount?.toFixed(2)}</td>
                    <td className="text-success-bold">₹{f.paid_amount?.toFixed(2)}</td>
                    <td className="text-error-bold">₹{f.remaining_amount?.toFixed(2)}</td>
                    <td>
                      <span className={`tag tag-${f.status?.toLowerCase().replace(' ', '-')}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className={f.next_payment_date ? 'next-date-active' : 'next-date-muted'}>
                      <div className="filter-group-gap-4">
                        {formatDate(f.next_payment_date)}
                        {f.remaining_amount > 0 && (
                          <button
                            className="icon-btn icon-edit-next-date"
                            onClick={() => {
                              setEditingDateAdmissionId(f.admission_id);
                              setTempNextDate(f.next_payment_date ? f.next_payment_date.slice(0, 10) : '');
                            }}
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
                              className="icon-btn text-primary-btn"
                              onClick={() => handleRestoreFee(f)}
                              title="Restore"
                            >
                              <RotateCcw size={18} />
                            </button>
                            <button
                              className="icon-btn text-error-btn"
                              onClick={() => handlePermanentDeleteFee(f.admission_id)}
                              title="Permanent Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`icon-btn ${f.remaining_amount <= 0 ? 'icon-disabled' : 'text-primary-btn'}`}
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
                              className={`icon-btn ${f.mobile ? 'text-success' : 'icon-disabled'}`}
                              onClick={() => handleOpenSingleReminderConfirm(f)}
                              disabled={!f.mobile || sendingReminderId === f.admission_id}
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
            <p className="muted mb-16">
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
                <label>Next Payment Date {Number(paymentAmount) >= payingFee.remaining_amount ? <span className="text-na-badge">(N/A – Full Payment)</span> : null}</label>
                <input
                  type="date"
                  value={paymentNextDate}
                  onChange={(e) => setPaymentNextDate(e.target.value)}
                  disabled={Number(paymentAmount) >= payingFee.remaining_amount}
                  className={Number(paymentAmount) >= payingFee.remaining_amount ? 'opacity-disabled' : 'opacity-normal'}
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
          <div className="modal-content-custom modal-content-600">
            <div className="modal-header-between">
              <h3>Fee Report: {reportFee.student_name}</h3>
              <div className="inline-actions">
                <button className="btn btn-ghost" onClick={() => setReportFee(null)}>Close</button>
              </div>
            </div>

            <div className="card card-surface-low">
              <div className="form-grid form-grid-3col">
                <div>
                  <label className="muted modal-label-sm">Total Fees</label>
                  <div className="text-bold-700">₹{reportFee.total_amount}</div>
                </div>
                <div>
                  <label className="muted modal-label-sm">Total Paid</label>
                  <div className="text-bold-700-success">₹{reportFee.paid_amount}</div>
                </div>
                <div>
                  <label className="muted modal-label-sm">Total Remaining</label>
                  <div className="text-bold-700-error">₹{reportFee.remaining_amount}</div>
                </div>
              </div>
            </div>

            <h4>Payment History</h4>
            <div className="table-responsive table-max-300">
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
                        <td className="student-name-cell">₹{p.amount}</td>
                        <td>{p.remark}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" onClick={() => printReceipt(p)} title="Print Receipt"><Printer size={14} /></button>
                            <button
                              className="icon-btn text-success"
                              onClick={() => p.id && sendWhatsAppReceipt(p.id)}
                              disabled={sendingReceiptId === p.id}
                              title="Send WhatsApp Receipt"
                            >
                              <MessageCircle size={14} fill="#25D366" />
                            </button>
                            <button className="icon-btn text-primary-btn" onClick={() => {
                              setEditingPayment(p);
                              setEditAmount(p.amount.toString());
                              setEditRemark(p.remark);
                              setEditDate(p.created_at ? p.created_at.slice(0, 10) : '');
                            }} title="Edit Payment"><Edit2 size={14} /></button>
                            <button className="icon-btn text-error-btn" onClick={() => p.id && handleDeletePayment(p.id)} title="Delete Payment"><Trash2 size={14} /></button>
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
        <div className="modal-overlay modal-overlay-z1100">
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
            <h3 className="mb-16">Export Fee Installments</h3>
            <p className="muted mb-20">Select filters below to download specific fee payments.</p>
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
                <button type="button" className="btn btn-ghost text-error-btn" onClick={() => { setExportStartDate(''); setExportEndDate(''); setExportStatus(''); }}>Clear</button>
                <button type="button" className="btn btn-primary filter-btn-primary" onClick={executeExport}>
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
          <div className="modal-content-custom modal-content-350">
            <div className="modal-header-between">
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
                  className="date-input-full"
                />
                <p className="muted mt-2 text-muted-xs">Leave blank to clear the date.</p>
              </div>
            </div>
            <div className="inline-actions justify-end mt-16">
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
        <div className="modal-overlay modal-overlay-z1200">
          <div className="modal-content-custom modal-content-440">
            <div className="confirm-icon-circle">
              <MessageCircle size={32} fill="#25D366" color="#25D366" />
            </div>

            <h3 className="modal-title-20">Send WhatsApp Reminder?</h3>
            <p className="muted modal-desc-14">
              Are you sure you want to send a fee reminder message on WhatsApp to this student?
            </p>

            <div className="confirm-info-box">
              <div className="confirm-info-row">
                <span className="muted">Student Name:</span>
                <strong>{singleConfirmFee.student_name}</strong>
              </div>
              <div className="confirm-info-row">
                <span className="muted">Mobile Number:</span>
                <strong className="text-success">{singleConfirmFee.mobile}</strong>
              </div>
              <div className="confirm-info-row">
                <span className="muted">Remaining Fees:</span>
                <strong className="text-error-bold">₹{singleConfirmFee.remaining_amount?.toFixed(2)}</strong>
              </div>
              {singleConfirmFee.next_payment_date && (
                <div className="confirm-info-row-last">
                  <span className="muted">Next Payment Date:</span>
                  <strong>{formatDate(singleConfirmFee.next_payment_date)}</strong>
                </div>
              )}
            </div>

            <div className="confirm-actions-row">
              <button
                type="button"
                className="btn btn-ghost confirm-btn-cancel"
                onClick={() => setSingleConfirmFee(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary confirm-btn-submit"
                onClick={handleConfirmSingleReminder}
              >
                <Send size={16} /> Okay, Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Reminders Confirmation Modal */}
      {isBulkConfirmOpen && (
        <div className="modal-overlay modal-overlay-z1200">
          <div className="modal-content-custom modal-content-460">
            <div className="confirm-icon-circle">
              <Send size={30} color="#25D366" />
            </div>

            <h3 className="modal-title-20">Send All Fee Reminders?</h3>
            <p className="muted modal-desc-14">
              Are you sure you want to send WhatsApp fee reminder messages to all students in the current view?
            </p>

            <div className="confirm-info-box">
              <div className="confirm-info-row">
                <span className="muted">Total Recipients:</span>
                <strong className="text-success-15">
                  {filteredFees.filter(f => f.mobile && f.status !== 'Deleted').length} Student
                </strong>
              </div>
              <div className="confirm-info-row">
                <span className="muted">Current Status Filter:</span>
                <strong>{statusFilter || 'All Status (Pending, Half Complete & Complete)'}</strong>
              </div>
              {query && (
                <div className="confirm-info-row">
                  <span className="muted">Search Filter:</span>
                  <strong>"{query}"</strong>
                </div>
              )}
            </div>

            <div className="confirm-actions-row">
              <button
                type="button"
                className="btn btn-ghost confirm-btn-cancel"
                onClick={() => setIsBulkConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary confirm-btn-submit"
                onClick={handleConfirmBulkReminders}
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
