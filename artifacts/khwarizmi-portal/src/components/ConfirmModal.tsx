import { useEffect } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ open, title, message, confirmText = 'تأكيد', danger = false, onConfirm, onClose }: ConfirmModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className={`modal-icon-wrapper ${danger ? 'modal-icon-danger' : 'modal-icon-primary'}`}>
          <i className={`fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-btn-row">
          <button onClick={onClose} className="modal-btn cancel-btn">إلغاء</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`modal-btn ${danger ? 'table-btn-danger' : 'table-btn'}`} style={{ padding: '0.65rem 1.5rem' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
