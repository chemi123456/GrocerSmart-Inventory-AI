import React from 'react';
import { FiX } from 'react-icons/fi';

export function FormModal({ isOpen, onClose, title, children, onSubmit, submitText = 'Save', isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {children}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
