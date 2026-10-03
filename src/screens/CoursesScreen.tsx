import { Download, FileUp, Pencil, Plus, Search, Trash2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Course } from '../services/api';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const emptyForm: Course = {
  name: '',
  duration: '',
  fees: '',
  details: '',
};

export default function CoursesScreen() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewCourse, setViewCourse] = useState<Course | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Course>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [durationNumber, setDurationNumber] = useState('');
  const [durationUnit, setDurationUnit] = useState('Months');
  const [startDate] = useState('');
  const [endDate] = useState('');
  const itemsPerPage = 10;

  const loadCourses = async () => {
    try {
      const response = await api.getCourses();
      setCourses(response.data);
    } catch (e) {
      toast.error('Unable to connect to backend. Please ensure backend is running.');
      setCourses([]);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const filtered = useMemo(() => {
    let result = courses;
    const needle = query.trim().toLowerCase();

    if (needle) {
      result = result.filter((row) =>
        [row.course_code, row.name, row.duration, row.fees, row.details, row.status]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(needle)),
      );
    }

    if (startDate) {
      result = result.filter((row) => row.created_at && row.created_at >= startDate);
    }

    if (endDate) {
      result = result.filter((row) => row.created_at && row.created_at <= (endDate + ' 23:59:59'));
    }

    if (showDeleted) {
      result = result.filter((row) => row.status === 'Deleted');
    } else {
      result = result.filter((row) => row.status !== 'Deleted');
    }

    setCurrentPage(1);
    return result;
  }, [courses, query, startDate, endDate, showDeleted]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [filtered]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDurationNumber('');
    setDurationUnit('Months');
    setIsFormOpen(true);
  };

  const validate = (data: Course) => {
    if (!String(data.name ?? '').trim()) return 'Course Name is required';
    if (!String(data.duration ?? '').trim()) return 'Duration is required';
    if (!String(data.fees ?? '').trim()) return 'Fees is required';
    if (!String(data.details ?? '').trim()) return 'Details is required';
    return null;
  };

  const openEditForm = (row: Course) => {
    setEditingId(row.id ?? null);
    setFormData({
      name: row.name,
      duration: row.duration ?? '',
      fees: row.fees ?? '',
      details: row.details ?? '',
    });
    const dur = row.duration ?? '';
    const numMatch = dur.match(/\d+/);
    const unitMatch = dur.match(/[A-Za-z]+/);
    setDurationNumber(numMatch ? numMatch[0] : '');
    setDurationUnit(unitMatch ? unitMatch[0] : 'Months');
    setIsFormOpen(true);
  };

  const saveCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const dataToSave = { ...formData, duration: `${durationNumber} ${durationUnit}` };
      const validationError = validate(dataToSave);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (editingId) {
        await api.updateCourse(editingId, dataToSave);
      } else {
        await api.createCourse(dataToSave);
      }
      setSuccess(editingId ? 'Course updated successfully' : 'Course added successfully');
      setIsFormOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      await loadCourses();
    } catch (e) {
      setError('Failed to save or update. Please check backend console.');
    }
  };

  const softDeleteCourse = async (row: Course) => {
    if (!row.id) return;
    if (!window.confirm('Are you sure you want to move this course to deleted items?')) return;
    try {
      setError(null);
      await api.updateCourse(row.id, { ...row, status: 'Deleted' });
      await loadCourses();
      toast.success('Course moved to deleted items');
    } catch (e) {
      setError('Failed to delete. Please check backend console.');
    }
  };

  const restoreCourse = async (row: Course) => {
    if (!row.id) return;
    try {
      setError(null);
      await api.updateCourse(row.id, { ...row, status: 'Active' });
      await loadCourses();
      toast.success('Course restored successfully');
    } catch (e) {
      setError('Failed to restore. Please check backend console.');
    }
  };

  const deleteCourse = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to permanently delete this course?')) return;
    try {
      setError(null);
      await api.deleteCourse(id);
      await loadCourses();
      toast.success('Course deleted permanently');
    } catch (e) {
      setError('Failed to delete. Please check backend console.');
    }
  };



  const toCsv = (rows: Course[]) => {
    const headers: Array<keyof Course | 'id'> = ['id', 'name', 'duration', 'fees', 'details'];
    const lines = rows.map((row) =>
      headers
        .map((key) => `"${String(row[key as keyof Course] ?? '').replace(/"/g, '""')}"`)
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
    const activeCourses = courses.filter(c => c.status !== 'Deleted');
    downloadFile(toCsv(activeCourses), 'courses.csv', 'text/csv;charset=utf-8;');
  };

  // Excel export removed (CSV only)

  const parseCsv = (text: string): Course[] => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const headers = rawHeaders.map(h => h.toLowerCase());

    const required = ['name', 'duration', 'fees'];
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
        duration: obj.duration ?? '',
        fees: obj.fees ?? '',
        details: obj.details ?? '',
      };
    });
  };

  const importCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const text = await file.text();
      const imported = parseCsv(text);
      if (imported.length === 0) {
        toast.error('CSV file is empty or invalid.');
        return;
      }
      for (const row of imported) {
        await api.createCourse(row);
      }
      await loadCourses();
      toast.success('Courses imported successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      const msg = e.message || 'Import failed. Please check the CSV format.';
      setError(msg);
      toast.error(msg);
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
        <div style={{ whiteSpace: 'nowrap' }}>
          <h2 style={{ fontSize: '28px' }}>{showDeleted ? 'Deleted Courses' : 'Course Portfolio'}</h2>
        </div>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          <label className="searchbox">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." style={{ width: 140 }} />
          </label>

          <button
            className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowDeleted(!showDeleted)}
            style={{ height: '40px', minWidth: '40px', border: showDeleted ? 'none' : '1px solid var(--outline-variant)' }}
            title="Toggle Deleted Records"
          >
            <Trash2 size={20} />
          </button>
          {!showDeleted && (
            <button className="btn btn-primary" onClick={openCreateForm} style={{ height: '40px' }}>
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </header>


      {error && (
        <div className="card" style={{ padding: 14, borderColor: 'color-mix(in srgb, var(--error) 25%, var(--surface-container-high))' }}>
          <strong style={{ color: 'var(--error)' }}>{error}</strong>
        </div>
      )}

      {success && (
        <div className="card" style={{ padding: 14, borderColor: 'rgba(16,185,129,0.35)' }}>
          <strong style={{ color: '#047857' }}>{success}</strong>
        </div>
      )}

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 style={{ marginBottom: 16 }}>{editingId ? 'Update Course' : 'Add Course'}</h3>
            <form className="form-grid" onSubmit={saveCourse}>
              <div>
                <label>Course Name</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label>Duration</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" value={durationNumber} onChange={(e) => setDurationNumber(e.target.value)} required placeholder="e.g. 6" />
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Fees</label>
                <input value={formData.fees ?? ''} onChange={(e) => setFormData({ ...formData, fees: e.target.value })} required inputMode="decimal" />
              </div>
              <div className="span-2">
                <label>Details</label>
                <input value={formData.details ?? ''} onChange={(e) => setFormData({ ...formData, details: e.target.value })} required />
              </div>
              <div className="inline-actions form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Course' : 'Save Course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewCourse && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 style={{ marginBottom: 16 }}>Course Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* <div><strong>Course Code:</strong> {viewCourse.course_code ?? 'N/A'}</div> */}
              <div><strong>Name:</strong> {viewCourse.name}</div>
              <div><strong>Duration:</strong> {viewCourse.duration}</div>
              <div><strong>Fees:</strong> {viewCourse.fees}</div>
              <div><strong>Details:</strong> {viewCourse.details}</div>
            </div>
            <div className="inline-actions form-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setViewCourse(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h3 style={{ margin: 0 }}>{showDeleted ? 'Deleted Academic Programs' : 'All Academic Programs'}</h3>
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
                <th>Course Name</th>
                <th>Duration</th>
                <th>Fees</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.length === 0 ? (
                <tr><td colSpan={6}>No courses found.</td></tr>
              ) : (
                sortedFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                  <tr key={row.id ?? `${row.name}-${index}`}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.duration}</td>
                    <td>{row.fees}</td>
                    <td className="truncate-text-lg" title={row.details}>{row.details}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => setViewCourse(row)} title="View"><Search size={14} /></button>
                        {!showDeleted && <button className="icon-btn" onClick={() => openEditForm(row)} title="Edit"><Pencil size={14} /></button>}
                        {showDeleted ? (
                          <>
                            <button className="icon-btn" onClick={() => restoreCourse(row)} title="Restore" style={{ color: 'var(--primary)' }}><RotateCcw size={14} /></button>
                            <button className="icon-btn" onClick={() => void deleteCourse(row.id)} title="Permanent Delete" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                          </>
                        ) : (
                          <button className="icon-btn" onClick={() => softDeleteCourse(row)} title="Move to Deleted"><Trash2 size={14} /></button>
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
