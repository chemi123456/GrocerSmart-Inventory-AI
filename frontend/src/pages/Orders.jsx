import React, { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiTrash2, FiSearch, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { ordersAPI, productsAPI, creditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    paymentType: 'CASH',
    creditCustomer: '',
    items: [],
    notes: ''
  });
  
  // Add item form state
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: 1,
    unitPrice: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, productsRes, creditRes] = await Promise.all([
        ordersAPI.getAll({ search: searchTerm }),
        productsAPI.getAll({ status: 'ACTIVE' }),
        creditAPI.getAll({ status: 'ACTIVE' })
      ]);
      setOrders(ordersRes.data.data);
      setProducts(productsRes.data.data);
      setCreditCustomers(creditRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleOpenForm = () => {
    setFormData({
      paymentType: 'CASH',
      creditCustomer: '',
      items: [],
      notes: ''
    });
    setCurrentItem({ product: '', quantity: 1, unitPrice: 0 });
    setIsFormOpen(true);
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setCurrentItem({
        ...currentItem,
        product: productId,
        unitPrice: product.unitPrice
      });
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      toast.error('Please select a valid product, quantity, and price');
      return;
    }

    const product = products.find(p => p._id === currentItem.product);
    
    // Check if item already exists
    const existingIndex = formData.items.findIndex(item => item.product === currentItem.product);
    
    let newItems = [...formData.items];
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += Number(currentItem.quantity);
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].unitPrice;
    } else {
      newItems.push({
        ...currentItem,
        quantity: Number(currentItem.quantity),
        productName: product.name,
        subtotal: currentItem.quantity * currentItem.unitPrice
      });
    }

    setFormData({ ...formData, items: newItems });
    setCurrentItem({ product: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    
    if (formData.paymentType === 'CREDIT' && !formData.creditCustomer) {
      toast.error('Please select a credit customer');
      return;
    }

    try {
      await ordersAPI.create(formData);
      toast.success('Order created successfully');
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleVoid = async () => {
    try {
      await ordersAPI.delete(orderToDelete._id);
      toast.success('Order voided successfully');
      setIsConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to void order');
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const columns = [
    { label: 'Invoice No', key: 'invoiceNumber', render: (row) => <strong>{row.invoiceNumber}</strong> },
    { label: 'Date', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { label: 'Total Amount', key: 'totalAmount', render: (row) => `Rs. ${row.totalAmount.toFixed(2)}` },
    { 
      label: 'Payment', 
      key: 'paymentType', 
      render: (row) => (
        <div>
          <StatusBadge status={row.paymentType} />
          {row.paymentType === 'CREDIT' && row.creditCustomer && (
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
              {row.creditCustomer.name}
            </div>
          )}
        </div>
      ) 
    },
    { label: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { label: 'Cashier', key: 'cashier', render: (row) => row.createdBy?.fullName || 'Unknown' },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn-icon btn-ghost" 
            title="View Invoice"
            onClick={(e) => { e.stopPropagation(); toast('View invoice feature coming soon!'); }}
          >
            <FiFileText />
          </button>
          {row.status === 'COMPLETED' && (
            <button 
              className="btn-icon btn-ghost" 
              style={{ color: 'var(--danger)' }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setOrderToDelete(row); 
                setIsConfirmOpen(true); 
              }}
              title="Void Order"
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
          <h1 className="page-title">Point of Sale / Orders</h1>
          <p className="page-subtitle">Process new sales, view invoices, and void transactions</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenForm}>
          <FiPlus /> New Sale
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search invoice number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={orders} />
      )}

      {/* POS Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Create New Sale"
        onSubmit={handleSubmit}
        submitText={`Checkout — Rs. ${calculateTotal().toFixed(2)}`}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Left Column: Items */}
          <div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Add Item</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div className="form-group mb-0">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Product</label>
                  <select 
                    className="form-select"
                    value={currentItem.product}
                    onChange={(e) => handleProductSelect(e.target.value)}
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.unitConfig.retailUnit})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Quantity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" step="any"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Price</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="0" step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({...currentItem, unitPrice: Number(e.target.value)})}
                  />
                </div>
                <button type="button" className="btn btn-secondary" style={{ marginBottom: '0' }} onClick={handleAddItem}>
                  Add
                </button>
              </div>
            </div>

            {/* Cart Table */}
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Cart is empty</td></tr>
                  ) : (
                    formData.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unitPrice.toFixed(2)}</td>
                        <td>{item.subtotal.toFixed(2)}</td>
                        <td>
                          <button type="button" className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveItem(index)}>
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Payment */}
          <div>
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Total:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
                  Rs. {calculateTotal().toFixed(2)}
                </span>
              </div>
              <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />
              
              <div className="form-group">
                <label className="form-label">Payment Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  {['CASH', 'CARD', 'CREDIT'].map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="paymentType" 
                        value={type} 
                        checked={formData.paymentType === type}
                        onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {formData.paymentType === 'CREDIT' && (
                <div className="form-group animation-slideDown">
                  <label className="form-label">Credit Customer</label>
                  <select 
                    className="form-select"
                    value={formData.creditCustomer}
                    onChange={(e) => setFormData({...formData, creditCustomer: e.target.value})}
                    required
                  >
                    <option value="">Select Customer...</option>
                    {creditCustomers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} (Limit: {c.creditLimit})</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea 
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Void Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleVoid}
        title="Void Order"
        message={`Are you sure you want to void order ${orderToDelete?.invoiceNumber}? This will reverse stock deductions and credit customer balances.`}
        confirmText="Void Order"
      />
    </div>
  );
}
