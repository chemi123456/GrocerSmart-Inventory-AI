import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productsAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Inventory() {
  const { isAdmin, isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isForecastOpen, setIsForecastOpen] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [forecasting, setForecasting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unitConfig: {
      bulkUnit: '',
      retailUnit: '',
      conversionFactor: 1
    },
    unitPrice: 0,
    bulkPrice: 0,
    purchasePrice: 0,
    bulkStock: 0,
    retailStock: 0,
    reorderPoint: 1,
    status: 'ACTIVE'
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getAll({ 
        search: searchTerm,
        lowStock: filterLowStock 
      });
      setProducts(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, filterLowStock]);

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        description: product.description || '',
        unitConfig: { ...product.unitConfig },
        unitPrice: product.unitPrice,
        bulkPrice: product.bulkPrice,
        purchasePrice: product.purchasePrice,
        bulkStock: product.bulkStock,
        retailStock: product.retailStock,
        reorderPoint: product.reorderPoint,
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        unitConfig: {
          bulkUnit: 'kg',
          retailUnit: 'g',
          conversionFactor: 1000
        },
        unitPrice: '',
        bulkPrice: '',
        purchasePrice: 0,
        bulkStock: 0,
        retailStock: 0,
        reorderPoint: 10,
        status: 'ACTIVE'
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, formData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(formData);
        toast.success('Product added successfully');
      }
      setIsFormOpen(false);
      fetchProducts();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleDelete = async () => {
    try {
      await productsAPI.delete(productToDelete._id);
      toast.success('Product marked as discontinued');
      setIsConfirmOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to discontinue product');
    }
  };

  const handleForecast = async (product) => {
    try {
      setForecasting(true);
      setForecastData(null);
      setIsForecastOpen(true);
      // Dummy mapping for Kaggle families based on categories, or just use GROCERY I
      const family = product.category.toUpperCase().includes('PRODUCE') ? 'PRODUCE' : 'GROCERY I';
      const res = await aiAPI.forecastDemand({ store_nbr: 1, family: family });
      setForecastData(res.data);
    } catch (error) {
      toast.error('Failed to get demand forecast');
      setIsForecastOpen(false);
    } finally {
      setForecasting(false);
    }
  };

  const columns = [
    { 
      label: 'Product Info', 
      key: 'name', 
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.category}</div>
        </div>
      ) 
    },
    { 
      label: 'Pricing (Rs)', 
      key: 'price', 
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div>Retail: {row.unitPrice.toFixed(2)} / {row.unitConfig.retailUnit}</div>
          <div style={{ color: 'var(--text-muted)' }}>Bulk: {row.bulkPrice.toFixed(2)} / {row.unitConfig.bulkUnit}</div>
        </div>
      ) 
    },
    { 
      label: 'Stock Levels', 
      key: 'stock', 
      render: (row) => {
        const isLow = (row.bulkStock + row.retailStock) <= row.reorderPoint;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem' }}>
              <div>{row.retailStock} {row.unitConfig.retailUnit}</div>
              <div style={{ color: 'var(--text-muted)' }}>{row.bulkStock} {row.unitConfig.bulkUnit}</div>
            </div>
            {isLow && row.status === 'ACTIVE' && (
              <FiAlertCircle color="var(--accent)" title={`Low stock! Reorder point: ${row.reorderPoint}`} />
            )}
          </div>
        );
      } 
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
                className="btn-icon btn-ghost" 
                onClick={(e) => { e.stopPropagation(); handleOpenForm(row); }}
                title="Edit Product"
              >
                <FiEdit2 />
              </button>
              {row.status === 'ACTIVE' && (
                <button 
                  className="btn-icon btn-ghost" 
                  style={{ color: 'var(--danger)' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setProductToDelete(row); 
                    setIsConfirmOpen(true); 
                  }}
                  title="Discontinue"
                >
                  <FiTrash2 />
                </button>
              )}
              <button 
                className="btn-icon btn-ghost" 
                style={{ color: 'var(--primary)' }}
                onClick={(e) => { e.stopPropagation(); handleForecast(row); }}
                title="AI Demand Forecast"
              >
                ✨
              </button>
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
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Track products, bulk/retail stock, and pricing</p>
        </div>
        {(isAdmin || isManager) && (
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            <FiPlus /> Add Product
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search products or categories..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input 
            type="checkbox" 
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            style={{ accentColor: 'var(--primary)' }}
          />
          Show Low Stock Alerts
        </label>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={products} />
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">Product Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Category</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          />
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Unit Configuration</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group mb-0">
              <label className="form-label">Bulk Unit</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. kg, box"
                value={formData.unitConfig.bulkUnit}
                onChange={(e) => setFormData({...formData, unitConfig: {...formData.unitConfig, bulkUnit: e.target.value}})}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Retail Unit</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. g, piece"
                value={formData.unitConfig.retailUnit}
                onChange={(e) => setFormData({...formData, unitConfig: {...formData.unitConfig, retailUnit: e.target.value}})}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Conversion Factor</label>
              <input 
                type="number" 
                className="form-input"
                min="1"
                step="any"
                value={formData.unitConfig.conversionFactor}
                onChange={(e) => setFormData({...formData, unitConfig: {...formData.unitConfig, conversionFactor: Number(e.target.value)}})}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>How many retail in 1 bulk?</small>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Unit Price (Rs)</label>
            <input 
              type="number" 
              className="form-input"
              min="0.01" step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({...formData, unitPrice: Number(e.target.value)})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bulk Price (Rs)</label>
            <input 
              type="number" 
              className="form-input"
              min="0.01" step="0.01"
              value={formData.bulkPrice}
              onChange={(e) => setFormData({...formData, bulkPrice: Number(e.target.value)})}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Retail Stock</label>
            <input 
              type="number" 
              className="form-input"
              min="0" step="any"
              value={formData.retailStock}
              onChange={(e) => setFormData({...formData, retailStock: Number(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bulk Stock</label>
            <input 
              type="number" 
              className="form-input"
              min="0" step="any"
              value={formData.bulkStock}
              onChange={(e) => setFormData({...formData, bulkStock: Number(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Reorder Point</label>
            <input 
              type="number" 
              className="form-input"
              min="1" step="1"
              value={formData.reorderPoint}
              onChange={(e) => setFormData({...formData, reorderPoint: Number(e.target.value)})}
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Discontinue Product"
        message={`Are you sure you want to discontinue ${productToDelete?.name}? It will no longer be available for new orders.`}
        confirmText="Discontinue"
      />

      {/* Forecast Modal */}
      {isForecastOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">✨ AI Demand Forecast (14 Days)</h2>
              <button className="btn-close" onClick={() => setIsForecastOpen(false)}>&times;</button>
            </div>
            <div className="modal-content">
              {forecasting ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Analyzing historical sales data...</p>
                </div>
              ) : forecastData ? (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Predicted sales for family <strong>{forecastData.family}</strong>:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                    {forecastData.forecast.map((f, i) => (
                      <div key={i} style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '0.5rem', 
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{f.predicted_sales}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>Failed to load forecast data.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsForecastOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
