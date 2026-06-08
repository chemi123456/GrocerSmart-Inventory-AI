import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiShoppingCart, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { suppliersAPI, productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Suppliers() {
  const { isAdmin, isManager } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPOOpen, setIsPOOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [selectedSupplierForPO, setSelectedSupplierForPO] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIVE'
  });

  // PO state
  const [poData, setPoData] = useState({
    items: [],
    notes: ''
  });
  
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: 1,
    unitCost: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, productsRes] = await Promise.all([
        suppliersAPI.getAll({ search: searchTerm }),
        productsAPI.getAll({ status: 'ACTIVE' })
      ]);
      setSuppliers(suppliersRes.data.data);
      setProducts(productsRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleOpenForm = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || '',
        status: supplier.status
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE'
      });
    }
    setIsFormOpen(true);
  };

  const handleOpenPO = (supplier) => {
    setSelectedSupplierForPO(supplier);
    setPoData({ items: [], notes: '' });
    setCurrentItem({ product: '', quantity: 1, unitCost: 0 });
    setIsPOOpen(true);
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setCurrentItem({
        ...currentItem,
        product: productId,
        unitCost: product.purchasePrice || (product.bulkPrice * 0.8) // Default to 80% of bulk price if no purchase price
      });
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || currentItem.quantity <= 0 || currentItem.unitCost <= 0) {
      toast.error('Please valid product, quantity, and cost');
      return;
    }

    const product = products.find(p => p._id === currentItem.product);
    const existingIndex = poData.items.findIndex(item => item.product === currentItem.product);
    
    let newItems = [...poData.items];
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += Number(currentItem.quantity);
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].unitCost;
    } else {
      newItems.push({
        ...currentItem,
        quantity: Number(currentItem.quantity),
        productName: product.name,
        subtotal: currentItem.quantity * currentItem.unitCost
      });
    }

    setPoData({ ...poData, items: newItems });
    setCurrentItem({ product: '', quantity: 1, unitCost: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier._id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Supplier added successfully');
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault();
    if (poData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      await suppliersAPI.createPO(selectedSupplierForPO._id, poData);
      toast.success('Purchase order created successfully');
      setIsPOOpen(false);
      fetchData();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleDelete = async () => {
    try {
      await suppliersAPI.delete(supplierToDelete._id);
      toast.success('Supplier removed successfully');
      setIsConfirmOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const calculateTotal = () => {
    return poData.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const columns = [
    { 
      label: 'Supplier Info', 
      key: 'name', 
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact: {row.contactPerson}</div>
        </div>
      ) 
    },
    { 
      label: 'Contact', 
      key: 'contact', 
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div>{row.phone}</div>
          {row.email && <div style={{ color: 'var(--text-muted)' }}>{row.email}</div>}
        </div>
      ) 
    },
    { 
      label: 'Payable Balance', 
      key: 'payable', 
      render: (row) => (
        <div style={{ fontWeight: row.outstandingPayable > 0 ? '600' : 'normal', color: row.outstandingPayable > 0 ? 'var(--danger-light)' : 'inherit' }}>
          Rs. {row.outstandingPayable.toFixed(2)}
        </div>
      ) 
    },
    { label: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(isAdmin || isManager) && (
            <>
              <button 
                className="btn btn-sm btn-primary" 
                onClick={(e) => { e.stopPropagation(); handleOpenPO(row); }}
                disabled={row.status === 'INACTIVE'}
                title={row.status === 'INACTIVE' ? 'Supplier Inactive' : 'Create Purchase Order'}
              >
                <FiShoppingCart /> PO
              </button>
              <button 
                className="btn-icon btn-ghost" 
                onClick={(e) => { e.stopPropagation(); handleOpenForm(row); }}
                title="Edit Supplier"
              >
                <FiEdit2 />
              </button>
              {isAdmin && row.status === 'INACTIVE' && row.outstandingPayable === 0 && (
                <button 
                  className="btn-icon btn-ghost" 
                  style={{ color: 'var(--danger)' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSupplierToDelete(row); 
                    setIsConfirmOpen(true); 
                  }}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              )}
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Management</h1>
          <p className="page-subtitle">Manage suppliers and purchase orders</p>
        </div>
        {(isAdmin || isManager) && (
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            <FiPlus /> Add Supplier
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search suppliers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={suppliers} />
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">Supplier Company Name</label>
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
            <label className="form-label">Contact Person</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.contactPerson}
              onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
              required
            />
          </div>
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
        </div>

        <div className="form-group">
          <label className="form-label">Email (Optional)</label>
          <input 
            type="email" 
            className="form-input" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address (Optional)</label>
          <textarea 
            className="form-textarea"
            style={{ minHeight: '60px' }}
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
          ></textarea>
        </div>

        {editingSupplier && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
      </FormModal>

      {/* PO Modal */}
      <FormModal
        isOpen={isPOOpen}
        onClose={() => setIsPOOpen(false)}
        title={`Create Purchase Order — ${selectedSupplierForPO?.name}`}
        onSubmit={handlePOSubmit}
        submitText={`Create PO (Total: Rs. ${calculateTotal().toFixed(2)})`}
      >
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <div className="form-group mb-0">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Product (Bulk)</label>
              <select 
                className="form-select"
                value={currentItem.product}
                onChange={(e) => handleProductSelect(e.target.value)}
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.unitConfig.bulkUnit})</option>
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
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Unit Cost (Rs)</label>
              <input 
                type="number" 
                className="form-input" 
                min="0" step="0.01"
                value={currentItem.unitCost}
                onChange={(e) => setCurrentItem({...currentItem, unitCost: Number(e.target.value)})}
              />
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginBottom: '0' }} onClick={handleAddItem}>
              Add
            </button>
          </div>
        </div>

        <div className="data-table-container" style={{ marginBottom: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {poData.items.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No items added</td></tr>
              ) : (
                poData.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitCost.toFixed(2)}</td>
                    <td>{item.subtotal.toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => {
                        const newItems = poData.items.filter((_, i) => i !== index);
                        setPoData({ ...poData, items: newItems });
                      }}>
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <input 
            type="text" 
            className="form-input" 
            value={poData.notes}
            onChange={(e) => setPoData({...poData, notes: e.target.value})}
            placeholder="Delivery instructions, PO references..."
          />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Remove Supplier"
        message={`Are you sure you want to remove ${supplierToDelete?.name}?`}
        confirmText="Remove"
      />
    </div>
  );
}
