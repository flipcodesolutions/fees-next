import { Search, FileUp, Download, Trash2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Inquiry } from '../services/api';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import { formatDate } from '../services/utils';

const statusOptions = ['Pending', 'Completed', 'Deleted', 'Not Interested'];

interface FollowUpScreenProps {
  onCompleted: (inquiry: Inquiry) => void;
}

export default function FollowUpScreen({ onCompleted }: FollowUpScreenProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const load = async () => {
    try {
      const response = await api.getInquiries();
      setInquiries(response.data);
    } catch {
      toast.error('Unable to connect to backend.');
      setInquiries([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let result = inquiries;
    const needle = query.trim().toLowerCase();

    if (needle) {
      result = result.filter((t) =>
        [t.name, t.mobile, t.reference_name, t.inquiry_for, t.remark, t.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
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
      // Only show Pending follow-ups by default as requested
      result = result.filter((row) => row.status === 'Pending');
    }

    setCurrentPage(1);
    return result;
  }, [query, inquiries, startDate, endDate, statusFilter, showDeleted]);

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
    const activeInquiries = inquiries.filter(i => i.status === 'Pending');
    downloadFile(toCsv(activeInquiries), 'followups.csv', 'text/csv;charset=utf-8;');
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
      await load();
      toast.success('Import completed successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      toast.error(e.message || 'Import failed. Check CSV format.');
    }
  };

  const softDeleteInquiry = async (row: Inquiry) => {
    if (!row.id) return;
    if (!window.confirm('Are you sure you want to move this inquiry to deleted items?')) return;
    try {
      await api.updateInquiry(row.id, { ...row, status: 'Deleted' });
      await load();
      toast.success('Inquiry moved to deleted items');
    } catch (e) {
      toast.error('Failed to delete.');
    }
  };

  const restoreInquiry = async (row: Inquiry) => {
    if (!row.id) return;
    try {
      await api.updateInquiry(row.id, { ...row, status: 'Pending' });
      await load();
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
      await load();
      toast.success('Inquiry deleted permanently');
    } catch (e) {
      toast.error('Failed to delete.');
    }
  };

  return (
    <section className="screen">
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
        <h2 style={{ fontSize: '28px', whiteSpace: 'nowrap' }}>{showDeleted ? 'Deleted' : 'Follow-up'}</h2>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
          <label className="searchbox" style={{ margin: 0, width: '220px' }}>
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name/mobile..."
              style={{ width: '100%' }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--outline-variant)', height: '40px', fontSize: '13px', padding: '0 8px', width: '130px' }}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--outline-variant)', height: '40px', fontSize: '13px', padding: '0 8px', width: '130px' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="btn btn-ghost"
            style={{ border: '1px solid var(--outline-variant)', height: '40px', fontSize: '13px', padding: '0 8px', width: '140px' }}
          >
            <option value="">All Status</option>
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => { setQuery(''); setStartDate(''); setEndDate(''); setStatusFilter(''); }}
            style={{ color: 'var(--error)', padding: '0 8px', fontWeight: 600, border: '1px solid var(--error)', background: 'transparent' }}
          >
            Clear All
          </button>
          <button
            className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowDeleted(!showDeleted)}
            style={{ height: '40px', minWidth: '40px', border: showDeleted ? 'none' : '1px solid var(--outline-variant)' }}
            title="Toggle Deleted Records"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="card">
        <div className="card-header-row">
          <h3 style={{ margin: 0 }}>{showDeleted ? 'Deleted/Non-Interested Follow-ups' : 'Pending Follow-ups'}</h3>
          <div className="inline-actions">
            {showDeleted && (
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowDeleted(false)}
                style={{ padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid var(--outline-variant)' }}
              >
                <RotateCcw size={14} style={{ transform: 'rotate(-90deg)' }} />
                Back
              </button>
            )}
            {!showDeleted && (
              <>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCsv} />
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
                <th>Name</th>
                <th>Mobile</th>
                <th>Remark</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>No follow-ups found.</td></tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((task, index) => (
                  <tr key={task.id ?? index}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{formatDate(task.created_at)}</td>
                    <td>{task.name}</td>
                    <td>{task.mobile}</td>
                    <td className="truncate-text" title={task.remark}>{task.remark}</td>
                    <td>
                      <select
                        value={task.status || 'Pending'}
                        onChange={async (e) => {
                          const next = e.target.value;
                          try {
                            if (task.id) await api.updateInquiry(task.id, { ...task, status: next });
                            if (next === 'Completed') onCompleted({ ...task, status: next });
                            else await load();
                            toast.success(`Status updated to ${next}`);
                          } catch {
                            toast.error('Update failed.');
                          }
                        }}
                        style={{ border: 'none', background: 'transparent', fontWeight: 'bold' }}
                      >
                        {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        {showDeleted ? (
                          <>
                            <button className="icon-btn" onClick={() => restoreInquiry(task)} title="Restore" style={{ color: 'var(--primary)' }}><RotateCcw size={14} /></button>
                            <button className="icon-btn" onClick={() => void deleteInquiry(task.id)} title="Permanent Delete" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                          </>
                        ) : (
                          <button className="icon-btn" onClick={() => softDeleteInquiry(task)} title="Move to Deleted"><Trash2 size={14} /></button>
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
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}
