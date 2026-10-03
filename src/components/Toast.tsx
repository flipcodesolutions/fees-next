import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const success = (msg: string) => showToast(msg, 'success');
  const error = (msg: string) => showToast(msg, 'error');

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}
      <div style={styles.container}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle size={20} color="#22c55e" />,
    error: <AlertCircle size={20} color="#ef4444" />,
    info: <Info size={20} color="#3b82f6" />,
    warning: <Bell size={20} color="#f59e0b" />,
  };

  const bgColors = {
    success: '#f0fdf4',
    error: '#fef2f2',
    info: '#eff6ff',
    warning: '#fffbeb',
  };

  const borderColors = {
    success: '#bbf7d0',
    error: '#fecaca',
    info: '#bfdbfe',
    warning: '#fef3c7',
  };

  return (
    <div style={{
      ...styles.toast,
      backgroundColor: bgColors[toast.type],
      borderColor: borderColors[toast.type],
    }}>
      <div style={styles.icon}>{icons[toast.type]}</div>
      <div style={styles.message}>{toast.message}</div>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        style={styles.closeBtn}
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    minWidth: '300px',
    maxWidth: '450px',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease-out forwards',
  },
  icon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    padding: '8px',
    margin: '-4px',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto',
  },
};

// Add this to your global CSS
// @keyframes slideIn {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
