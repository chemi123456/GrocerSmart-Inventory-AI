import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { chequesAPI, creditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Cheques() {
  const { isAdmin, isManager } = useAuth();
  const [cheques, setCheques] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [chequeToUpdate, setChequeToUpdate] = useState(null);
  const [chequeToDelete, setChequeToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    chequeNumber: '',
    amount: '',
    bankName: '',
    issuedDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    customer: '',
    type: 'INCOMING',
    notes: ''
  });

  const [statusData, setStatusData] = useState({
    status: '',
    actionDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chequesRes, customersRes] = await Promise.all([
        chequesAPI.getAll({ search: searchTerm }),
        creditAPI.getAll()
      ]);
      setCheques(chequesRes.data.data);
      setCustomers(customersRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch cheques data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleOpenForm = () => {
    setFormData({
      chequeNumber: '',
      amount: '',
      bankName: '',
      issuedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      customer: '',
      type: 'INCOMING',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenStatusUpdate = (cheque) => {
    setChequeToUpdate(cheque);
    // Determine next logical status
    let nextStatus = 'PENDING';
    if (cheque.status === 'PENDING') nextStatus = 'DEPOSITED';
    else if (cheque.status === 'DEPOSITED') nextStatus = 'CLEARED';

    setStatusData({
      status: nextStatus,
      actionDate: new Date().toISOString().split('T')[0]
    });
    setIsStatusOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await chequesAPI.create(formData);
      toast.success('Cheque recorded successfully');
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { status: statusData.status };
      if (statusData.status === 'DEPOSITED') payload.depositDate = statusData.actionDate;
      if (statusData.status === 'CLEARED') payload.clearedDate = statusData.actionDate;

      await chequesAPI.updateStatus(chequeToUpdate._id, payload);
      toast.success(`Cheque status updated to ${statusData.status}`);
      setIsStatusOpen(false);
      fetchData();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleDelete = async () => {
    try {
      await chequesAPI.delete(chequeToDelete._id);
      toast.success('Cheque removed successfully');
      setIsConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete cheque');
    }
  };

  const columns = [
    { 
      label: 'Cheque Info', 
      key: 'info', 
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>#{row.chequeNumber}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.bankName}</div>
        </div>
      ) 
    },
    { 
      label: 'Customer', 
      key: 'customer', 
      render: (row) => row.customer?.name || 'Unknown' 
    },
    { label: 'Amount', key: 'amount', render: (row) => `Rs. ${row.amount.toFixed(2)}` },
    { 
      label: 'Dates', 
      key: 'dates', 
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div>Iss: {new Date(row.issuedDate).toLocaleDateString()}</div>
          <div style={{ color: 'var(--accent)', fontWeight: '600' }}>Due: {new Date(row.dueDate).toLocaleDateString()}</div>
        </div>
      ) 
    },
    { label: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(isAdmin || isManager) && row.status !== 'CLEARED' && (
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={(e) => { e.stopPropagation(); handleOpenStatusUpdate(row); }}
              title="Update Status"
            >
              <FiRefreshCw /> Update
            </button>
          )}
          
          {(isAdmin || isManager) && row.status === 'PENDING' && (
            <button 
              className="btn-icon btn-ghost" 
              style={{ color: 'var(--danger)' }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setChequeToDelete(row); 
                setIsConfirmOpen(true); 
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank & Cheque Management</h1>
          <p className="page-subtitle">Track PDC lifecycle (Pending → Deposited → Cleared/Bounced)</p>
        </div>
        {(isAdmin || isManager) && (
          <button className="btn btn-primary" onClick={handleOpenForm}>
            <FiPlus /> Record Cheque
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search cheque number or bank..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={cheques} />
      )}

      {/* Record Cheque Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Record New Cheque (PDC)"
        onSubmit={handleSubmit}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Cheque Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="6 digits"
              pattern="\d{6}"
              value={formData.chequeNumber}
              onChange={(e) => setFormData({...formData, chequeNumber: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (Rs)</label>
            <input 
              type="number" 
              className="form-input" 
              min="0.01" step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bank Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.bankName}
            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Customer</label>
          <select 
            className="form-select"
            value={formData.customer}
            onChange={(e) => setFormData({...formData, customer: e.target.value})}
            required
          >
            <option value="">Select Customer...</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Issued Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={formData.issuedDate}
              onChange={(e) => setFormData({...formData, issuedDate: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              required
            />
          </div>
        </div>
      </FormModal>

      {/* Update Status Modal */}
      <FormModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        title={`Update Cheque #${chequeToUpdate?.chequeNumber}`}
        onSubmit={handleStatusSubmit}
      >
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Status: <StatusBadge status={chequeToUpdate?.status} /></div>
          <div style={{ fontSize: '0.875rem' }}>Bank: {chequeToUpdate?.bankName}</div>
          <div style={{ fontSize: '0.875rem' }}>Amount: Rs. {chequeToUpdate?.amount.toFixed(2)}</div>
        </div>

        <div className="form-group">
          <label className="form-label">New Status</label>
          <select 
            className="form-select"
            value={statusData.status}
            onChange={(e) => setStatusData({...statusData, status: e.target.value})}
            required
          >
            <option value="">Select Status...</option>
            {chequeToUpdate?.status === 'PENDING' && <option value="DEPOSITED">Deposited</option>}
            {chequeToUpdate?.status === 'PENDING' && <option value="BOUNCED">Bounced</option>}
            {chequeToUpdate?.status === 'DEPOSITED' && <option value="CLEARED">Cleared</option>}
            {chequeToUpdate?.status === 'DEPOSITED' && <option value="BOUNCED">Bounced</option>}
            {chequeToUpdate?.status === 'BOUNCED' && <option value="PENDING">Reset to Pending</option>}
          </select>
        </div>

        {(statusData.status === 'DEPOSITED' || statusData.status === 'CLEARED') && (
          <div className="form-group animation-slideDown">
            <label className="form-label">{statusData.status === 'DEPOSITED' ? 'Deposit' : 'Cleared'} Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={statusData.actionDate}
              onChange={(e) => setStatusData({...statusData, actionDate: e.target.value})}
              required
            />
          </div>
        )}
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Cheque"
        message={`Are you sure you want to delete cheque #${chequeToDelete?.chequeNumber}?`}
        confirmText="Delete"
      />
    </div>
  );
}
