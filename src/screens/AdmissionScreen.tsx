import { Search, Trash2, Pencil, Download, FileUp, RotateCcw, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, type Admission, type Course, type Inquiry } from '../services/api';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import { formatDate } from '../services/utils';


type StepKey = 1 | 2 | 3;

type SelectedCourse = {
  courseId?: number;
  courseCode?: string;
  courseName: string;
  duration?: string;
  baseFees: string;
  details?: string;
  startDate: string;
  finalFees: string;
  hasDocument?: boolean;
  hasCertificate?: boolean;
};

function safeParseCourses(payloadJson: string): SelectedCourse[] {
  try {
    const parsed = JSON.parse(payloadJson) as { courses?: Array<Partial<SelectedCourse>> };
    if (!Array.isArray(parsed.courses)) return [];
    return parsed.courses.map((c) => ({
      courseId: c.courseId ?? undefined,
      courseCode: c.courseCode ?? undefined,
      courseName: c.courseName ?? '',
      duration: c.duration ?? undefined,
      baseFees: String(c.baseFees ?? ''),
      details: c.details ?? undefined,
      startDate: c.startDate ?? '',
      finalFees: c.finalFees ?? '',
      hasDocument: !!c.hasDocument,
      hasCertificate: !!c.hasCertificate,
    }));
  } catch {
    return [];
  }
}

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AdmissionScreenProps {
  mode: 'create' | 'list';
  inquiry: Inquiry | null;
  onListMode?: () => void;
}

export default function AdmissionScreen({ mode, inquiry, onListMode }: AdmissionScreenProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<StepKey>(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const itemsPerPage = 10;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  const [student, setStudent] = useState({
    student_name: inquiry?.name ?? '',
    mobile: inquiry?.mobile ?? '',
    reference_name: inquiry?.reference_name ?? '',
    inquiry_for: inquiry?.inquiry_for ?? '',
    remark: inquiry?.remark ?? '',
  });

  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);

  const [editingAdmissionId, setEditingAdmissionId] = useState<number | null>(null);
  const [view, setView] = useState<'wizard' | 'list'>(mode === 'create' ? 'wizard' : 'list');

  const load = async () => {
    try {
      setError(null);
      const [cRes, aRes] = await Promise.all([api.getCourses(), api.getAdmissions()]);
      setCourses(cRes.data);
      setAdmissions(aRes.data);
    } catch {
      setError('Unable to connect to backend. Please ensure backend is running and try again.');
      setCourses([]);
      setAdmissions([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!inquiry) return;
    setStudent({
      student_name: inquiry.name ?? '',
      mobile: inquiry.mobile ?? '',
      reference_name: inquiry.reference_name ?? '',
      inquiry_for: inquiry.inquiry_for ?? '',
      remark: inquiry.remark ?? '',
    });
    setStep(1);
    setSelectedCourseIds([]);
    setSelectedCourses([]);
    setEditingAdmissionId(null);
    setView('wizard');
  }, [inquiry]);

  useEffect(() => {
    setView(mode === 'create' ? 'wizard' : 'list');
  }, [mode]);

  const [courseFilter, setCourseFilter] = useState<string>('');
  const [docFilter, setDocFilter] = useState<string>('');
  const [certFilter, setCertFilter] = useState<string>('');

  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.docFilter) {
        setDocFilter(state.docFilter);
        setView('list');
      }
      if (state.certFilter) {
        setCertFilter(state.certFilter);
        setView('list');
      }
      if (onListMode) {
        onListMode();
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, onListMode]);

  const filteredAdmissions = useMemo(() => {
    let result = admissions;
    const needle = query.trim().toLowerCase();

    if (needle) {
      result = result.filter((a) => {
        const studentMatch = [a.student_name, a.mobile].some((v) => String(v ?? '').toLowerCase().includes(needle));
        const coursesList = safeParseCourses(a.payload_json);
        const courseMatch = coursesList.some(c => c.courseName.toLowerCase().includes(needle));
        return studentMatch || courseMatch;
      });
    }

    if (courseFilter) {
      result = result.filter((a) => {
        const coursesList = safeParseCourses(a.payload_json);
        return coursesList.some(c => c.courseName === courseFilter);
      });
    }

    if (startDate) {
      result = result.filter((row) => {
        if (!row.created_at) return false;
        const datePart = row.created_at.includes('T') ? row.created_at.split('T')[0] : row.created_at.split(' ')[0];
        return datePart >= startDate;
      });
    }

    if (endDate) {
      result = result.filter((row) => {
        if (!row.created_at) return false;
        const datePart = row.created_at.includes('T') ? row.created_at.split('T')[0] : row.created_at.split(' ')[0];
        return datePart <= endDate;
      });
    }

    if (showDeleted) {
      result = result.filter((row) => row.status === 'Deleted');
    } else {
      result = result.filter((row) => row.status !== 'Deleted');
    }

    if (docFilter === 'yes') {
      result = result.filter((a) => {
        const coursesList = safeParseCourses(a.payload_json);
        return coursesList.some(c => c.hasDocument);
      });
    } else if (docFilter === 'no') {
      result = result.filter((a) => {
        const coursesList = safeParseCourses(a.payload_json);
        return !coursesList.some(c => c.hasDocument);
      });
    }

    if (certFilter === 'yes') {
      result = result.filter((a) => {
        const coursesList = safeParseCourses(a.payload_json);
        return coursesList.some(c => c.hasCertificate);
      });
    } else if (certFilter === 'no') {
      result = result.filter((a) => {
        const coursesList = safeParseCourses(a.payload_json);
        return !coursesList.some(c => c.hasCertificate);
      });
    }

    setCurrentPage(1);
    return result;
  }, [admissions, query, startDate, endDate, showDeleted, courseFilter, docFilter, certFilter]);

  const courseMap = useMemo(() => new Map((courses ?? []).map((c) => [c.id ?? -1, c])), [courses]);

  const goNextFromDetails = () => setStep(2);

  const syncSelectedCourses = (ids: number[]) => {
    setSelectedCourseIds(ids);
    setSelectedCourses((prev) => {
      const prevById = new Map(prev.map((p) => [p.courseId, p]));
      return ids
        .map((id) => {
          const c = courseMap.get(id);
          if (!c) return null;
          const existing = prevById.get(id);
          return {
            courseId: c.id,
            courseCode: c.course_code ?? undefined,
            courseName: c.name,
            duration: c.duration ?? undefined,
            baseFees: c.fees ?? '',
            details: c.details ?? undefined,
            startDate: existing?.startDate || getTodayDateString(),
            finalFees: existing?.finalFees ?? '',
          } as SelectedCourse;
        })
        .filter((x): x is SelectedCourse => Boolean(x));
    });
  };

  const goNextFromCourses = () => {
    if (selectedCourses.length === 0) {
      setError('Please select at least one course.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const submitAdmission = async () => {
    try {
      setError(null);
      const missing = selectedCourses.filter((c) => !c.startDate || !c.finalFees);
      if (missing.length > 0) {
        setError('Enter the start date and final fees for all selected courses.');
        return;
      }
      const payload = {
        student,
        courses: selectedCourses,
      };

      const body: Admission = {
        inquiry_id: inquiry?.id ?? null,
        student_name: student.student_name,
        mobile: student.mobile,
        reference_name: student.reference_name,
        inquiry_for: student.inquiry_for,
        remark: student.remark,
        payload_json: JSON.stringify(payload),
      };

      if (editingAdmissionId) {
        await api.updateAdmission(editingAdmissionId, body);
      } else {
        await api.createAdmission(body);
      }

      setStep(1);
      setSelectedCourseIds([]);
      setSelectedCourses([]);
      setEditingAdmissionId(null);
      await load();
      setView('list');
      if (onListMode) onListMode();
    } catch {
      setError('Submission failed. Please check backend console.');
    }
  };

  const startEditAdmission = (row: Admission) => {
    setEditingAdmissionId(row.id ?? null);
    setStudent({
      student_name: row.student_name,
      mobile: row.mobile,
      reference_name: row.reference_name ?? '',
      inquiry_for: row.inquiry_for ?? '',
      remark: row.remark ?? '',
    });
    const parsedCourses = safeParseCourses(row.payload_json);
    setSelectedCourses(parsedCourses);
    setSelectedCourseIds(parsedCourses.map((c) => c.courseId).filter((v): v is number => typeof v === 'number'));
    setStep(1);
    setView('wizard');
  };

  const softDeleteAdmission = async (row: Admission) => {
    if (!row.id) return;
    if (!window.confirm('Are you sure you want to move this admission to deleted items?')) return;
    try {
      setError(null);
      await api.updateAdmission(row.id, { ...row, status: 'Deleted' });
      await load();
      toast.success('Admission moved to deleted items');
    } catch {
      setError('Failed to move to deleted items.');
    }
  };

  const restoreAdmission = async (row: Admission) => {
    if (!row.id) return;
    try {
      setError(null);
      await api.updateAdmission(row.id, { ...row, status: 'Active' });
      await load();
      toast.success('Admission restored successfully');
    } catch {
      setError('Failed to restore admission.');
    }
  };

  const deleteAdmission = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to permanently delete this admission?')) return;
    try {
      setError(null);
      await api.deleteAdmission(id);
      await load();
      toast.success('Admission permanently deleted');
    } catch {
      setError('Deletion failed. Please check backend console.');
    }
  };

  const toCsv = (rows: Admission[]) => {
    const baseHeaders = ['id', 'inquiry_id', 'student_name', 'mobile', 'reference_name', 'inquiry_for', 'remark', 'admitted_on'];
    const courseHeaders = [
      'c1_id', 'c1_code', 'c1_name', 'c1_duration', 'c1_baseFees', 'c1_details', 'c1_startDate', 'c1_finalFees',
      'c2_id', 'c2_code', 'c2_name', 'c2_duration', 'c2_baseFees', 'c2_details', 'c2_startDate', 'c2_finalFees',
      'c3_id', 'c3_code', 'c3_name', 'c3_duration', 'c3_baseFees', 'c3_details', 'c3_startDate', 'c3_finalFees'
    ];
    const headers = [...baseHeaders, ...courseHeaders];

    const lines = rows.map((row) => {
      const coursesList = safeParseCourses(row.payload_json);
      const rowValues = baseHeaders.map(key => {
        if (key === 'admitted_on') return row.created_at ? formatDate(row.created_at) : '';
        return String(row[key as keyof Admission] ?? '');
      });

      for (let i = 0; i < 3; i++) {
        const c = coursesList[i];
        if (c) {
          rowValues.push(
            String(c.courseId ?? ''),
            c.courseCode ?? '',
            c.courseName,
            c.duration ?? '',
            String(c.baseFees ?? ''),
            c.details ?? '',
            c.startDate,
            String(c.finalFees ?? '')
          );
        } else {
          rowValues.push('', '', '', '', '', '', '', '');
        }
      }

      return rowValues.map(val => `"${val.replace(/"/g, '""')}"`).join(',');
    });
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
    let toExport = admissions.filter(a => a.status !== 'Deleted');
    if (exportStartDate || exportEndDate) {
      toExport = toExport.filter(a => {
        if (!a.created_at) return false;
        const date = a.created_at.includes('T') ? a.created_at.split('T')[0] : a.created_at.split(' ')[0];
        const startOk = !exportStartDate || date >= exportStartDate;
        const endOk = !exportEndDate || date <= exportEndDate;
        return startOk && endOk;
      });
    }
    downloadFile(toCsv(toExport), 'admissions.csv', 'text/csv;charset=utf-8;');
    setIsExportModalOpen(false);
  };

  const parseCsv = (text: string): Admission[] => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const headers = rawHeaders.map(h => h.toLowerCase());

    const required = ['student_name', 'mobile'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`Invalid CSV format. Missing required columns: ${missing.join(', ')}`);
    }

    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (line[i] === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += line[i];
        }
      }
      values.push(current);

      const obj = rawHeaders.reduce<Record<string, string>>((acc, header, idx) => {
        acc[header.toLowerCase()] = values[idx] ?? '';
        return acc;
      }, {});

      const importedCourses: SelectedCourse[] = [];
      for (let i = 1; i <= 3; i++) {
        const c_id = obj[`c${i}_id`];
        const c_name = obj[`c${i}_name`];
        const c_baseFees = obj[`c${i}_basefees`];
        const c_startDate = obj[`c${i}_startdate`];
        const c_finalFees = obj[`c${i}_finalfees`];

        if (c_name && c_name.trim() !== '') {
          importedCourses.push({
            courseId: c_id ? Number(c_id) : undefined,
            courseName: c_name,
            baseFees: c_baseFees || '',
            startDate: c_startDate || getTodayDateString(),
            finalFees: c_finalFees || '',
          });
        }
      }

      const studentData = {
        student_name: obj.student_name ?? '',
        mobile: obj.mobile ?? '',
        reference_name: obj.reference_name ?? '',
        inquiry_for: obj.inquiry_for ?? '',
        remark: obj.remark ?? '',
      };

      const payload = { student: studentData, courses: importedCourses };

      return {
        inquiry_id: obj.inquiry_id && obj.inquiry_id !== 'null' ? Number(obj.inquiry_id) : null,
        student_name: studentData.student_name,
        mobile: studentData.mobile,
        reference_name: studentData.reference_name,
        inquiry_for: studentData.inquiry_for,
        remark: studentData.remark,
        payload_json: JSON.stringify(payload),
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
        await api.createAdmission(row);
      }
      await load();
      toast.success('Import completed successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      toast.error(e.message || 'Import failed. Please check the CSV format.');
    }
  };

  return (
    <section className="screen admission">
      <header className="topbar topbar-sticky">
        <h2 className="topbar-title-nowrap">{showDeleted ? 'Deleted' : 'Admissions'}</h2>
        <div className="topbar-actions topbar-actions-flex">
          <label className="searchbox searchbox-160">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student/course..." className="w-full-input" />
          </label>
          {view === 'list' && (
            <>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="btn btn-ghost filter-select-course-130"
              >
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="btn btn-ghost filter-input-date-sm" title="Start Date" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="btn btn-ghost filter-input-date-sm" title="End Date" />

              {(startDate || endDate || query || courseFilter || docFilter || certFilter) && (
                <button className="btn btn-sm btn-ghost filter-btn-clear-42" onClick={() => { setStartDate(''); setEndDate(''); setQuery(''); setCourseFilter(''); setDocFilter(''); setCertFilter(''); }}>Clear</button>
              )}
              <button
                className={`btn px-2 py-1 text-sm ${showDeleted ? 'btn-primary filter-btn-toggle-deleted active' : 'btn-ghost filter-btn-toggle-deleted'}`}
                onClick={() => setShowDeleted(!showDeleted)}
                title="Toggle Deleted Records"
              >
                <Trash2 size={20} />
              </button>
              <button className="btn btn-primary filter-btn-primary" onClick={() => navigate('/inquiry', { state: { openAddForm: true, defaultStatus: 'Completed' } })}>
                <Plus size={16} /> Add
              </button>
            </>
          )}
        </div>
      </header>


      {error && (
        <div className="card card-error-p14">
          <strong className="text-error-btn">{error}</strong>
        </div>
      )}

      {view === 'wizard' && (
        <div className="card inquiry-form-card">
          <div className="card-header-row card-header-p0-mb10">
            <h3>Create Admission</h3>
            <p className="muted mt-6">
              Step {step} of 3
            </p>
          </div>

          {step === 1 && (
            <div className="form-grid">
              <div>
                <label>Full Name</label>
                <input value={student.student_name} onChange={(e) => setStudent({ ...student, student_name: e.target.value })} />
              </div>
              <div>
                <label>Mobile</label>
                <input value={student.mobile} onChange={(e) => setStudent({ ...student, mobile: e.target.value })} />
              </div>
              <div>
                <label>Reference</label>
                <input value={student.reference_name} onChange={(e) => setStudent({ ...student, reference_name: e.target.value })} />
              </div>
              <div>
                <label>Inquiry For</label>
                <input value={student.inquiry_for} onChange={(e) => setStudent({ ...student, inquiry_for: e.target.value })} />
              </div>
              <div className="span-2">
                <label>Remark</label>
                <input value={student.remark} onChange={(e) => setStudent({ ...student, remark: e.target.value })} />
              </div>
              <div className="inline-actions form-actions">
                <button className="btn btn-primary" type="button" onClick={goNextFromDetails}>Next</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid-gap-14">
              <div className="field-grid field-grid-1col">
                <div className="span-2">
                  <label>Select Courses (multiple)</label>
                  <div className="course-select-grid">
                    {courses.map((c) => {
                      const id = c.id ?? -1;
                      const isSelected = selectedCourseIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`course-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const next = isSelected
                              ? selectedCourseIds.filter((x) => x !== id)
                              : [...selectedCourseIds, id];
                            syncSelectedCourses(next);
                          }}
                        >
                          <div className="course-card-top">
                            <strong>{c.name}</strong>
                            <span className={`tag ${isSelected ? 'tag-selected' : ''}`}>{isSelected ? 'Selected' : 'Select'}</span>
                          </div>
                          <div className="course-card-meta">
                            <span>{c.duration ? `Duration: ${c.duration}` : 'Duration: -'}</span>
                            <span>{c.fees ? `Fees: ₹${c.fees}` : 'Fees: -'}</span>
                          </div>
                          {c.details && <div className="course-card-details">{c.details}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCourses.length > 0 && (
                  <div className="span-2 mt-8">
                    <div className="text-bold-700 mb-8">Selected Courses</div>
                    <div className="table-responsive">
                      <table className="data-table mini-table table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Course</th>
                            <th>Duration</th>
                            <th>Base Fees</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourses.map((c, idx) => (
                            <tr key={`${c.courseId ?? c.courseName}-${idx}`}>
                              <td>{idx + 1}</td>
                              <td>{c.courseName}</td>
                              <td>{c.duration ?? '-'}</td>
                              <td>{c.baseFees}</td>
                              <td className="table-cell-ellipsis">
                                {c.details ?? '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="inline-actions justify-end">
                <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" type="button" onClick={goNextFromCourses}>Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid-gap-14">
              <div className="table-responsive">
                <table className="data-table table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Base Fees</th>
                      <th>Start Date</th>
                      <th>Final Fees</th>
                      <th className="text-center">Document</th>
                      <th className="text-center">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourses.length === 0 ? (
                      <tr><td colSpan={6}>No course selected</td></tr>
                    ) : (
                      selectedCourses.map((c, idx) => (
                        <tr key={`${c.courseId ?? c.courseName}-${idx}`}>
                          <td>{c.courseName}</td>
                          <td><input value={c.baseFees} readOnly /></td>
                          <td>
                            <input
                              type="date"
                              value={c.startDate}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSelectedCourses((prev) => prev.map((p, i) => (i === idx ? { ...p, startDate: v } : p)));
                              }}
                            />
                          </td>
                          <td>
                            <input
                              value={c.finalFees}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSelectedCourses((prev) => prev.map((p, i) => (i === idx ? { ...p, finalFees: v } : p)));
                              }}
                              placeholder="Final fees (₹)"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={!!c.hasDocument}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedCourses((prev) => prev.map((p, i) => (i === idx ? { ...p, hasDocument: checked } : p)));
                              }}
                              className="checkbox-custom"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={!!c.hasCertificate}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedCourses((prev) => prev.map((p, i) => (i === idx ? { ...p, hasCertificate: checked } : p)));
                              }}
                              className="checkbox-custom"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="inline-actions justify-end">
                <button className="btn btn-ghost" type="button" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-primary" type="button" onClick={submitAdmission}>Submit</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'list' && (
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title-m0">{showDeleted ? 'Deleted' : 'Admissions'}</h3>
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
                  <button className="btn btn-ghost" onClick={() => setIsExportModalOpen(true)}><Download size={14} />Export CSV</button>
                </>
              )}
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Student Name</th>
                  <th>Course Name</th>
                  <th>Start Date</th>
                  <th>Final Fees</th>
                  <th className="text-center">
                    <select
                      value={docFilter}
                      onChange={(e) => setDocFilter(e.target.value)}
                      className="select-table-filter"
                      title="Filter by Document Status"
                    >
                      <option value="">Doc</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </th>
                  <th className="text-center">
                    <select
                      value={certFilter}
                      onChange={(e) => setCertFilter(e.target.value)}
                      className="select-table-filter"
                      title="Filter by Certificate Status"
                    >
                      <option value="">Cert</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </th>
                  <th>Admitted On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.length === 0 ? (
                  <tr><td colSpan={9}>No admissions found.</td></tr>
                ) : (
                  filteredAdmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((a, index) => {
                    const coursesList = safeParseCourses(a.payload_json);
                    const courseNames = coursesList.map((c) => c.courseName).join(', ');
                    const startDates = coursesList.map((c) => formatDate(c.startDate)).filter((v: any) => v && v !== '-').join(', ');
                    const totalFinalFees = coursesList.reduce((sum, c) => {
                      const raw = String(c.finalFees ?? '').replace(/[^0-9.]/g, '');
                      const n = raw ? Number(raw) : 0;
                      return sum + (Number.isFinite(n) ? n : 0);
                    }, 0);
                    const hasDoc = coursesList.some((c) => c.hasDocument);
                    const hasCert = coursesList.some((c) => c.hasCertificate);
                    return (
                      <tr key={a.id ?? `${a.student_name}-${index}`}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>{a.student_name}</td>
                        <td className="truncate-text-lg" title={courseNames}>{courseNames}</td>
                        <td className="truncate-text" title={startDates || '-'}>{startDates || '-'}</td>
                        <td>{coursesList.length > 0 ? `₹${totalFinalFees.toFixed(2)}` : '-'}</td>
                        <td className="text-center">
                          <span className={hasDoc ? 'badge-doc-yes' : 'badge-doc-no'}>
                            {hasDoc ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={hasCert ? 'badge-doc-yes' : 'badge-doc-no'}>
                            {hasCert ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>{formatDate(a.created_at)}</td>
                        <td>
                          <div className="row-actions">
                            {!showDeleted && <button className="icon-btn" onClick={() => startEditAdmission(a)}><Pencil size={14} /></button>}
                            {showDeleted ? (
                              <>
                                <button className="icon-btn text-primary-btn" onClick={() => restoreAdmission(a)} title="Restore"><RotateCcw size={14} /></button>
                                <button className="icon-btn text-error-btn" onClick={() => void deleteAdmission(a.id)} title="Permanent Delete"><Trash2 size={14} /></button>
                              </>
                            ) : (
                              <button className="icon-btn" onClick={() => softDeleteAdmission(a)} title="Move to Deleted"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAdmissions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-custom">
            <h3 className="mb-16">Export Admissions</h3>
            <p className="muted mb-20">Select the date range to export admissions.</p>
            <div className="form-grid">
              <div>
                <label>Start Date</label>
                <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="btn btn-ghost filter-input-date-full" />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="btn btn-ghost filter-input-date-full" />
              </div>
              <div className="inline-actions form-actions span-2 mt-16">
                <button type="button" className="btn btn-ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-ghost text-error-btn" onClick={() => { setExportStartDate(''); setExportEndDate(''); }}>Reset</button>
                <button type="button" className="btn btn-primary filter-btn-primary" onClick={exportCsv}>
                  <Download size={16} /> Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
