/**
 * Modal
 * Simple accessible modal with overlay and header close, controlled by isOpen.
 */
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title || 'Modal dialog'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900" id="modal-title">{title}</h3>
          <button onClick={onClose} aria-label="Close modal" className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-6" aria-labelledby="modal-title">{children}</div>
      </div>
    </div>
  );
};

export default Modal;


