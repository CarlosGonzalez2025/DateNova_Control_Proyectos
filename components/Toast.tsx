import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { subscribeToToasts, ToastNotification } from '../utils/notifications';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((notification) => {
      setToasts(prev => [...prev, notification]);

      // Auto-remove después del duration
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notification.id));
      }, notification.duration || 4000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastProps {
  toast: ToastNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { type, title, message, action } = toast;

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="text-green-600" size={20} />,
      titleColor: 'text-green-900',
      messageColor: 'text-green-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle className="text-red-600" size={20} />,
      titleColor: 'text-red-900',
      messageColor: 'text-red-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <AlertTriangle className="text-yellow-600" size={20} />,
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="text-blue-600" size={20} />,
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-700'
    }
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right`}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">{style.icon}</div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold ${style.titleColor}`}>{title}</h4>
        {message && (
          <p className={`text-sm mt-1 ${style.messageColor}`}>{message}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-medium mt-2 ${style.titleColor} hover:underline`}
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Agregar animación CSS en index.html o global styles
export const toastStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;
