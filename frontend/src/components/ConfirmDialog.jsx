import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger', isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-body confirm-dialog">
          <div className="confirm-icon" style={{ color: type === 'danger' ? 'var(--danger)' : 'var(--accent)' }}>
            <FiAlertTriangle />
          </div>
          <h3>{title}</h3>
          <p>{message}</p>
          
          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button 
              className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
