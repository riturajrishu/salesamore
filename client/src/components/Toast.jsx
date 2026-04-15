import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'var(--emerald)',
  error: 'var(--rose)',
  info: 'var(--accent-1)',
};

export default function Toast({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <Icon size={18} color={colors[toast.type]} />
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => onRemove(toast.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
