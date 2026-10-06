import { Download, FileUp, Pencil, Plus, Search, Trash2, Eye, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type Inquiry } from '../services/api';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import { formatDate } from '../services/utils';


interface InquiryScreenProps {
  onCompleted: (inquiry: Inquiry) => void;
}

const statusOptions = ['Pending', 'Completed', 'Deleted', 'Not Interested'];

const emptyForm: Inquiry = {
  name: '',
  mobile: '',
  reference_name: '',
  inquiry_for: '',
  remark: '',
  status: 'Pending',
};

export default function InquiryScreen({ onCompleted }: InquiryScreenProps) {
  const toast = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [formData, setFormData] = useState<Inquiry>(emptyForm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const itemsPerPage = 10;

  const loadInquiries = async () => {
    try {
      const response = await api.getInquiries();
      setInquiries(response.data);
    } catch (e) {
      toast.error('Unable to connect to backend.');
      setInquiries([]);
    }
  };

  const location = useLocation();
  const [isFromAdmission, setIsFromAdmission] = useState(false);

  useEffect(() => {
    void loadInquiries();
    if (location.state && (location.state as any).openAddForm) {
      setIsFromAdmission(true);
      setEditingId(null);
      setFormData({
        ...emptyForm,
        status: (location.state as any).defaultStatus || 'Pending'
      });
      setIsFormOpen(true);
      // Clear state but keep our local flag
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filtered = useMemo(() => {
    let result = inquiries;
    const needle = query.trim().toLowerCase();

    if (needle) {
      result = result.filter((row) =>
        [row.name, row.mobile, row.reference_name, row.inquiry_for, row.status]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(needle)),
      );
    }

    if (startDate) {
      result = result.filter((row) => {
        if (!row.created_at) return false;
        const datePart = row.created_at.split('T')[0];
        return datePart >= startDate;
      });
    }

    if (endDate) {
      result = result.filter((row) => {
        if (!row.created_at) return false;
        const datePart = row.created_at.split('T')[0];
        return datePart <= endDate;
      });
    }

    if (statusFilter) {
      result = result.filter((row) => row.status === statusFilter);
    }

    if (showDeleted) {
      result = result.filter((row) => row.status === 'Deleted' || row.status === 'Not Interested');
    } else {
      result = result.filter((row) => row.status !== 'Deleted' && row.status !== 'Not Interested');
    }

    setCurrentPage(1);
    return result;
  }, [inquiries, query, startDate, endDate, statusFilter, showDeleted]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [filtered]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (row: Inquiry) => {
    setEditingId(row.id ?? null);
    setFormData({
      name: row.name,
      mobile: row.mobile,
      reference_name: row.reference_name,
      inquiry_for: row.inquiry_for,
      remark: row.remark,
      status: row.status || 'Pending',
    });
    setIsFormOpen(true);
  };

  const validate = (data: Inquiry) => {
    if (!data.name.trim()) return 'Full Name is required';
    if (/\d/.test(data.name)) return 'Full Name should not contain numbers';
    if (!data.mobile.trim()) return 'Mobile Number is required';
    const digits = data.mobile.replace(/\D/g, '');
    if (digits.length !== 10) return 'Mobile Number must be 10 digits';
    if (!data.reference_name.trim()) return 'Reference is required';
    if (/\d/.test(data.reference_name)) return 'Reference should not contain numbers';
    if (!data.inquiry_for.trim()) return 'Inquiry For is required';
    if (!data.remark.trim()) return 'Remark is required';
    if (!data.status) return 'Status is required';

    return null;
  };

  const saveInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const validationError = validate(formData);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      if (editingId) {
        await api.updateInquiry(editingId, formData);
        toast.success('Inquiry updated successfully');
      } else {
        await api.createInquiry(formData);
        toast.success('Inquiry added successfully');
      }
      setIsFormOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      await loadInquiries();
      if (formData.status === 'Completed' || isFromAdmission) {
        const completed: Inquiry = {
          ...(editingId ? { id: editingId } : {}),
          ...formData,
        };
        onCompleted(completed);
      }
    } catch (e) {
      toast.error('Failed to save. Please check backend.');
    }
  };

  const softDeleteInquiry = async (row: Inquiry) => {
    if (!row.id) return;
    if (!window.confirm('Are you sure you want to move this inquiry to deleted items?')) return;
    try {
      await api.updateInquiry(row.id, { ...row, status: 'Deleted' });
      await loadInquiries();
      toast.success('Inquiry moved to deleted items');
    } catch (e) {
      toast.error('Failed to delete.');
    }
  };

  const restoreInquiry = async (row: Inquiry) => {
    if (!row.id) return;
    try {
      await api.updateInquiry(row.id, { ...row, status: 'Pending' });
      await loadInquiries();
      toast.success('Inquiry restored successfully');
    } catch (e) {
      toast.error('Failed to restore.');
    }
  };

  const deleteInquiry = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to permanently delete this inquiry?')) return;
    try {
      await api.deleteInquiry(id);
      await loadInquiries();
      toast.success('Inquiry deleted permanently');
    } catch (e) {
      toast.error('Failed to delete.');
    }
  };

  const toCsv = (rows: Inquiry[]) => {
    const headers: Array<keyof Inquiry> = ['name', 'mobile', 'reference_name', 'inquiry_for', 'remark', 'status'];
    const lines = rows.map((row) =>
      headers
        .map((key) => `"${String(row[key as keyof Inquiry] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    return [headers.join(','), ...lines].join('\n');
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const activeInquiries = inquiries.filter(i => i.status !== 'Deleted' && i.status !== 'Not Interested');
    downloadFile(toCsv(activeInquiries), 'inquiries.csv', 'text/csv;charset=utf-8;');
  };

  const parseCsv = (text: string): Inquiry[] => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const headers = rawHeaders.map(h => h.toLowerCase());

    const required = ['name', 'mobile'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`Invalid CSV format. Missing required columns: ${missing.join(', ')}`);
    }

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      const obj = rawHeaders.reduce<Record<string, string>>((acc, header, idx) => {
        acc[header.toLowerCase()] = values[idx] ?? '';
        return acc;
      }, {});
      return {
        name: obj.name ?? '',
        mobile: obj.mobile ?? '',
        reference_name: obj.reference_name ?? '',
        inquiry_for: obj.inquiry_for ?? '',
        remark: obj.remark ?? '',
        status: obj.status || 'Pending',
      };
    });
  };

  const importCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseCsv(text);
      if (imported.length === 0) {
        toast.error('CSV file is empty or invalid.');
        return;
      }

      for (const row of imported) {
        await api.createInquiry(row);
      }
      await loadInquiries();
      toast.success('Import completed successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      toast.error(e.message || 'Import failed. Check CSV format.');
    }
  };

  return (
    <section className="screen">
      <header className="topbar topbar-sticky">
        <div className="topbar-flex-header">
          <h2 className="topbar-title-md">{showDeleted ? 'Deleted' : 'Inquiry'}</h2>
        </div>
        <div className="topbar-actions topbar-actions-nowrap">
          <label className="searchbox searchbox-compact">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name/mobile..." className="w-full-input" />
          </label>
          <div className="filter-group-date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="btn btn-ghost filter-input-date"
              title="Start Date"
            />
            <span className="text-on-surface-variant">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="btn btn-ghost filter-input-date"
              title="End Date"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="btn btn-ghost filter-select-course"
          >
            <option value="">All Status</option>
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <button
            className="btn btn-sm btn-ghost filter-btn-clear"
            onClick={() => { setQuery(''); setStartDate(''); setEndDate(''); setStatusFilter(''); }}
          >
            Clear All
          </button>
          <button
            className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary filter-btn-toggle-deleted active' : 'btn-ghost filter-btn-toggle-deleted'}`}
            onClick={() => setShowDeleted(!showDeleted)}
            title="Toggle Deleted Records"
          >
            <Trash2 size={20} />
          </button>
          <button
            className="btn btn-primary px-4 py-1 text-sm btn-action-add"
            onClick={openCreateForm}
          >
            <Plus size={20} />
            Add
          </button>
        </div>
      </header>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 className="mb-16">{editingId ? 'Update Inquiry' : 'Add Inquiry'}</h3>
            <form className="form-grid" onSubmit={saveInquiry}>
              <div>
                <label>Full Name</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[0-9]/g, '') })} required />
              </div>
              <div>
                <label>Mobile Number</label>
                <input value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} required inputMode="numeric" />
              </div>
              <div>
                <label>Reference</label>
                <input value={formData.reference_name} onChange={(e) => setFormData({ ...formData, reference_name: e.target.value.replace(/[0-9]/g, '') })} required />
              </div>
              <div>
                <label>Inquiry For</label>
                <input value={formData.inquiry_for} onChange={(e) => setFormData({ ...formData, inquiry_for: e.target.value.replace(/[0-9]/g, '') })} required />
              </div>
              <div className="span-2">
                <label>Remark</label>
                <input value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} required />
              </div>
              <div>
                <label>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="inline-actions form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Inquiry' : 'Save Inquiry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewInquiry && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 className="mb-16">Inquiry Details</h3>
            <div className="flex-col-gap-12">
              <div><strong>Name:</strong> {viewInquiry.name}</div>
              <div><strong>Mobile:</strong> {viewInquiry.mobile}</div>
              <div><strong>Reference:</strong> {viewInquiry.reference_name}</div>
              <div><strong>Inquiry For:</strong> {viewInquiry.inquiry_for}</div>
              <div><strong>Remark:</strong> {viewInquiry.remark}</div>
              <div><strong>Status:</strong> {viewInquiry.status}</div>
            </div>
            <div className="inline-actions form-actions mt-16 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setViewInquiry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h3 className="card-title-m0">{showDeleted ? 'Deleted Listed' : 'All Active Inquiries'}</h3>
          <div className="inline-actions">
            {showDeleted && (
              <button
                className="btn btn-ghost topbar-btn-back"
                onClick={() => setShowDeleted(false)}
              >
                <RotateCcw size={14} className="rotate-icon-back" />
                Back
              </button>
            )}
            {!showDeleted && (
              <>
                <input ref={fileInputRef} type="file" accept=".csv" className="d-none-input" onChange={importCsv} />
                <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}><FileUp size={14} />Import CSV</button>
                <button className="btn btn-ghost" onClick={exportCsv}><Download size={14} />Export CSV</button>
              </>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table table">
            <thead>
              <tr>
                <th>No</th>
                <th>Date</th>
                <th>Full Name</th>
                <th>Mobile Number</th>
                <th>Reference</th>
                <th>Inquiry For</th>
                <th>Remark</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={9}>No inquiries found.</td>
                </tr>
              ) : (
                sortedFiltered
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((row, index) => (
                    <tr key={row.id ?? `${row.name}-${index}`}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.name}</td>
                      <td>{row.mobile}</td>
                      <td>{row.reference_name}</td>
                      <td className="truncate-text" title={row.inquiry_for}>{row.inquiry_for}</td>
                      <td className="truncate-text" title={row.remark}>{row.remark}</td>
                      <td>
                        <select
                          value={row.status || 'Pending'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            if (row.id) {
                              try {
                                await api.updateInquiry(row.id, { ...row, status: newStatus });
                                await loadInquiries();
                                toast.success(`Status updated to ${newStatus}`);
                                if (newStatus === 'Completed') onCompleted({ ...row, status: newStatus });
                              } catch (error) {
                                toast.error('Failed to update status');
                              }
                            }
                          }}
                          className="select-plain-bold"
                        >
                          {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => setViewInquiry(row)} title="View"><Eye size={14} /></button>
                          {!showDeleted && <button className="icon-btn" onClick={() => openEditForm(row)} title="Edit"><Pencil size={14} /></button>}
                          {showDeleted ? (
                            <>
                              <button className="icon-btn text-primary-btn" onClick={() => restoreInquiry(row)} title="Restore"><RotateCcw size={14} /></button>
                              <button className="icon-btn text-error-btn" onClick={() => void deleteInquiry(row.id)} title="Permanent Delete"><Trash2 size={14} /></button>
                            </>
                          ) : (
                            <button className="icon-btn" onClick={() => softDeleteInquiry(row)} title="Move to Deleted"><Trash2 size={14} /></button>
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
          totalItems={sortedFiltered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}
