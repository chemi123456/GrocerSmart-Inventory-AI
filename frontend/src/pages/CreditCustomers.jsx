import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { creditAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function CreditCustomers() {
  const { isAdmin, isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [customerToPay, setCustomerToPay] = useState(null);
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [assessingRisk, setAssessingRisk] = useState(false);
  const [customerToAssess, setCustomerToAssess] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0,
    paymentTerms: 30,
    status: 'ACTIVE'
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'CASH',
    note: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await creditAPI.getAll({ search: searchTerm });
      setCustomers(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch credit customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const handleOpenForm = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        creditLimit: customer.creditLimit,
        paymentTerms: customer.paymentTerms,
        status: customer.status
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 10000,
        paymentTerms: 30,
        status: 'ACTIVE'
      });
    }
    setIsFormOpen(true);
  };

  const handleOpenPayment = (customer) => {
    setCustomerToPay(customer);
    setPaymentData({
      amount: customer.outstandingBalance,
      method: 'CASH',
      note: ''
    });
    setIsPaymentOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await creditAPI.update(editingCustomer._id, formData);
        toast.success('Customer updated successfully');
      } else {
        await creditAPI.create(formData);
        toast.success('Customer registered successfully');
      }
      setIsFormOpen(false);
      fetchCustomers();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await creditAPI.postPayment(customerToPay._id, paymentData);
      toast.success('Payment recorded successfully');
      setIsPaymentOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    }
  };

  const handleDelete = async () => {
    try {
      await creditAPI.delete(customerToDelete._id);
      toast.success('Customer removed successfully');
      setIsConfirmOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleAssessRisk = async (customer) => {
    try {
      setAssessingRisk(true);
      setRiskData(null);
      setCustomerToAssess(customer);
      setIsRiskOpen(true);
      
      const payload = {
        creditLimit: customer.creditLimit,
        outstandingBalance: customer.outstandingBalance,
        paymentTermsDays: customer.paymentTerms,
        daysPastDue: 0, // In a real system, compute from overdue invoices
        previousDefaults: 0 // Fetch from history
      };
      
      const res = await aiAPI.assessCreditRisk(payload);
      setRiskData(res.data);
    } catch (error) {
      toast.error('Failed to assess credit risk');
      setIsRiskOpen(false);
    } finally {
      setAssessingRisk(false);
    }
  };

  const columns = [
    { 
      label: 'Customer', 
      key: 'name', 
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.phone}</div>
        </div>
      ) 
    },
    { 
      label: 'Credit Status', 
      key: 'credit', 
      render: (row) => {
        const available = row.creditLimit - row.outstandingBalance;
        const isNearLimit = available < (row.creditLimit * 0.1); // Less than 10% remaining
        
        return (
          <div style={{ fontSize: '0.8125rem' }}>
            <div style={{ color: 'var(--danger)', fontWeight: row.outstandingBalance > 0 ? '600' : 'normal' }}>
              Due: Rs. {row.outstandingBalance.toFixed(2)}
            </div>
            <div style={{ color: isNearLimit ? 'var(--accent)' : 'var(--text-muted)' }}>
              Limit: Rs. {row.creditLimit.toFixed(2)}
            </div>
          </div>
        );
      } 
    },
    { label: 'Terms', key: 'paymentTerms', render: (row) => `${row.paymentTerms} days` },
    { label: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={(e) => { e.stopPropagation(); handleOpenPayment(row); }}
            disabled={row.outstandingBalance <= 0}
            title={row.outstandingBalance <= 0 ? "No balance due" : "Post Payment"}
          >
            <FiDollarSign /> Pay
          </button>
          
          {(isAdmin || isManager) && (
            <>
              <button 
                className="btn-icon btn-ghost" 
                onClick={(e) => { e.stopPropagation(); handleOpenForm(row); }}
                title="Edit Customer"
              >
                <FiEdit2 />
              </button>
              {isAdmin && row.outstandingBalance === 0 && (
                <button 
                  className="btn-icon btn-ghost" 
                  style={{ color: 'var(--danger)' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setCustomerToDelete(row); 
                    setIsConfirmOpen(true); 
                  }}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              )}
            </>
          )}
          <button 
            className="btn-icon btn-ghost" 
            style={{ color: 'var(--primary)' }}
            onClick={(e) => { e.stopPropagation(); handleAssessRisk(row); }}
            title="AI Risk Assessment"
          >
            🤖
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Credit Customer Management</h1>
          <p className="page-subtitle">Manage credit accounts, limits, and payments</p>
        </div>
        {(isAdmin || isManager) && (
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            <FiPlus /> Register Customer
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name, phone, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={customers} />
      )}

      {/* Customer Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? 'Edit Credit Customer' : 'Register Credit Customer'}
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea 
            className="form-textarea"
            style={{ minHeight: '60px' }}
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
          ></textarea>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Credit Limit (Rs)</label>
            <input 
              type="number" 
              className="form-input"
              min="1" step="any"
              value={formData.creditLimit}
              onChange={(e) => setFormData({...formData, creditLimit: Number(e.target.value)})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Terms (Days)</label>
            <input 
              type="number" 
              className="form-input"
              min="1" max="365" step="1"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({...formData, paymentTerms: Number(e.target.value)})}
              required
            />
          </div>
        </div>

        {editingCustomer && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="ACTIVE">Active</option>
              <option value="SETTLED">Settled</option>
              <option value="DEFAULTED">Defaulted</option>
            </select>
          </div>
        )}
      </FormModal>

      {/* Payment Modal */}
      <FormModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={`Post Payment for ${customerToPay?.name}`}
        onSubmit={handlePaymentSubmit}
        submitText="Confirm Payment"
      >
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Outstanding Balance:</span>
          <span style={{ fontWeight: '700', color: 'var(--danger-light)' }}>
            Rs. {customerToPay?.outstandingBalance.toFixed(2)}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Amount (Rs)</label>
          <input 
            type="number" 
            className="form-input" 
            min="0.01" step="0.01" max={customerToPay?.outstandingBalance}
            value={paymentData.amount}
            onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select 
            className="form-select"
            value={paymentData.method}
            onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
            required
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Note / Reference (Optional)</label>
          <input 
            type="text" 
            className="form-input" 
            value={paymentData.note}
            onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
            placeholder="e.g. Receipt #1234 or Cheque #987654"
          />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Remove Customer"
        message={`Are you sure you want to remove ${customerToDelete?.name}? This action cannot be undone.`}
        confirmText="Remove"
      />

      {/* AI Risk Modal */}
      {isRiskOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🤖 AI Credit Risk Assessment</h2>
              <button className="btn-close" onClick={() => setIsRiskOpen(false)}>&times;</button>
            </div>
            <div className="modal-content">
              {assessingRisk ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Evaluating financial profile...</p>
                </div>
              ) : riskData ? (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>{customerToAssess?.name}</h3>
                  <div style={{
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: riskData.risk_label === 'High' ? 'var(--danger-light)' 
                             : riskData.risk_label === 'Medium' ? 'var(--warning-light)' 
                             : 'var(--success-light)',
                    color: riskData.risk_label === 'High' ? 'var(--danger)' 
                        : riskData.risk_label === 'Medium' ? 'var(--warning)' 
                        : 'var(--success)',
                    textAlign: 'center',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{riskData.risk_label} Risk</div>
                  </div>
                  
                  <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>AI Confidence Analysis</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Low Risk Probability:</span>
                      <strong>{(riskData.probabilities.Low * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Medium Risk Probability:</span>
                      <strong>{(riskData.probabilities.Medium * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>High Risk Probability:</span>
                      <strong>{(riskData.probabilities.High * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Failed to load risk data.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsRiskOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
