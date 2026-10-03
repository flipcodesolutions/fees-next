import axios from 'axios';

// Central API Base URL definition.
// Allows changing backend endpoints in one place rather than in each individual screen.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Type definitions (interfaces) for consistency across all screens.
export interface Inquiry {
  id?: number;
  name: string;
  mobile: string;
  reference_name: string;
  inquiry_for: string;
  remark: string;
  status: string;
  created_at?: string;
}

export interface Course {
  id?: number;
  course_code?: string;
  name: string;
  duration?: string;
  fees?: string;
  details?: string;
  status?: string;
  created_at?: string;
}

export interface Admission {
  id?: number;
  inquiry_id?: number | null;
  student_name: string;
  mobile: string;
  reference_name?: string | null;
  inquiry_for?: string | null;
  remark?: string | null;
  payload_json: string;
  status?: string;
  created_at?: string;
}

export interface FeeSummary {
  id?: number;
  admission_id: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  next_payment_date?: string | null;
  updated_at?: string;
  student_name?: string;
  mobile?: string;
  payload_json?: string;
}

export interface FeePayment {
  id?: number;
  admission_id: number;
  amount: number;
  payment_date: string;
  remark: string;
  next_payment_date?: string | null;
  created_at?: string;
  student_name?: string;
  mobile?: string;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  status?: string;
  payload_json?: string;
  numeric_id?: number;
}

/**
 * REQUEST INTERCEPTOR:
 * Automatically extracts the authentication token from localStorage
 * and injects it into the HTTP headers for all outgoing API requests.
 * This saves us from having to write header-injection logic on every screen.
 */
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * RESPONSE INTERCEPTOR:
 * Handles responses globally. Specifically looks for 401 Unauthorized errors
 * (e.g. if the login token has expired or is invalid). If a 401 is received,
 * it clears the token and redirects the user back to the login page automatically.
 */
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // If we are not already on the login page, redirect
      if (!window.location.hash.includes('/login')) {
        window.location.href = '#/login';
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Centralized API calls object.
 * Screens import this 'api' object and call methods (e.g. api.getInquiries())
 * keeping the component files clean and focused entirely on the user interface.
 */
export const api = {
  // Auth APIs
  login: (data: { username: string; password: string }) => axios.post(`${API_URL}/auth/login`, data),
  changePassword: (data: { username?: string; oldPassword: string; newPassword: string }) => axios.post(`${API_URL}/auth/change-password`, data),
  getProfile: () => axios.get(`${API_URL}/auth/profile`),

  // Inquiry APIs
  getInquiries: () => axios.get(`${API_URL}/inquiries`),
  createInquiry: (data: Inquiry) => axios.post(`${API_URL}/inquiries`, data),
  updateInquiry: (id: number, data: Inquiry) => axios.put(`${API_URL}/inquiries/${id}`, data),
  deleteInquiry: (id: number) => axios.delete(`${API_URL}/inquiries/${id}`),

  // Course APIs
  getCourses: () => axios.get(`${API_URL}/courses`),
  createCourse: (data: Course) => axios.post(`${API_URL}/courses`, data),
  updateCourse: (id: number, data: Course) => axios.put(`${API_URL}/courses/${id}`, data),
  deleteCourse: (id: number) => axios.delete(`${API_URL}/courses/${id}`),
  deleteAllCourses: () => axios.delete(`${API_URL}/courses/all`),

  // Admission APIs
  getAdmissions: () => axios.get(`${API_URL}/admissions`),
  createAdmission: (data: Admission) => axios.post(`${API_URL}/admissions`, data),
  updateAdmission: (id: number, data: Admission) => axios.put(`${API_URL}/admissions/${id}`, data),
  deleteAdmission: (id: number) => axios.delete(`${API_URL}/admissions/${id}`),

  // Fees and Payments APIs
  getFees: () => axios.get(`${API_URL}/fees`),
  getAllFeePayments: () => axios.get(`${API_URL}/fees/all-payments`),
  getFeePayments: (admissionId: number) => axios.get(`${API_URL}/fees/${admissionId}/payments`),
  addFeePayment: (data: { admission_id: number; amount: number; remark: string; created_at?: string; next_payment_date?: string }) => axios.post(`${API_URL}/fees/pay`, data),
  updateFeePayment: (paymentId: number, data: { amount: number; remark: string; created_at?: string }) => axios.put(`${API_URL}/fees/payment/${paymentId}`, data),
  deleteFeePayment: (paymentId: number) => axios.delete(`${API_URL}/fees/payment/${paymentId}`),
  updateFeeStatus: (admissionId: number, status: string) => axios.put(`${API_URL}/fees/${admissionId}/status`, { status }),
  updateFeeNextPaymentDate: (admissionId: number, next_payment_date: string | null) => axios.put(`${API_URL}/fees/${admissionId}/next-payment-date`, { next_payment_date }),
  deleteFeeSummary: (admissionId: number) => axios.delete(`${API_URL}/fees/${admissionId}`),

  // WhatsApp APIs
  sendWhatsAppReminder: (data: { to: string, studentName: string, remainingAmount: number, courseName?: string }) =>
    axios.post(`${API_URL}/whatsapp/send-reminder`, data),
  sendWhatsAppReceipt: (data: { paymentId: number }) =>
    axios.post(`${API_URL}/whatsapp/send-receipt`, data),

  // Database Backup/Restore APIs
  exportDatabase: () => axios.get(`${API_URL}/backup/export`, { responseType: 'blob' }),
  importDatabase: (data: { fileData: string }) => axios.post(`${API_URL}/backup/import`, data),

  // Application Settings APIs
  getSettings: () => axios.get(`${API_URL}/settings`),
  updateSettings: (data: Record<string, string>) => axios.post(`${API_URL}/settings`, data),
  resetSettings: () => axios.delete(`${API_URL}/settings`),
};
