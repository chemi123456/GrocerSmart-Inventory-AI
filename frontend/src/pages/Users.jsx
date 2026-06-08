import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { usersAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { FormModal } from '../components/FormModal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Users() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
    status: 'ACTIVE'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll({ search: searchTerm });
      setUsers(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const handleOpenForm = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        password: '' // Keep empty when editing
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'CASHIER',
        status: 'ACTIVE'
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update
        const updateData = { ...formData };
        delete updateData.password; // Don't send password if empty
        delete updateData.username;
        delete updateData.email;
        
        await usersAPI.update(editingUser._id, updateData);
        toast.success('User updated successfully');
      } else {
        // Create
        await authAPI.register(formData);
        toast.success('User registered successfully');
      }
      setIsFormOpen(false);
      fetchUsers();
    } catch (error) {
      const msgs = error.response?.data?.errors || [error.response?.data?.message || 'Operation failed'];
      msgs.forEach(msg => toast.error(msg));
    }
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(userToDelete._id);
      toast.success('User deactivated successfully');
      setIsConfirmOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const columns = [
    { label: 'Name', key: 'fullName', sortable: true },
    { label: 'Username', key: 'username' },
    { label: 'Role', key: 'role', render: (row) => <StatusBadge status={row.role} /> },
    { label: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { label: 'Contact', key: 'contact', render: (row) => (
      <div>
        <div>{row.email}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.phone}</div>
      </div>
    ) },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn-icon btn-ghost" 
            onClick={(e) => { e.stopPropagation(); handleOpenForm(row); }}
            title="Edit"
          >
            <FiEdit2 />
          </button>
          {isAdmin && row._id !== user._id && row.status === 'ACTIVE' && (
            <button 
              className="btn-icon btn-ghost" 
              style={{ color: 'var(--danger)' }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setUserToDelete(row); 
                setIsConfirmOpen(true); 
              }}
              title="Deactivate"
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
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage staff accounts, roles, and access</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            <FiPlus /> New User
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ width: '300px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <DataTable columns={columns} data={users} />
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Edit User' : 'Register New User'}
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
          />
        </div>

        {!editingUser && (
          <>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                minLength={3}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </>
        )}

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

        {!editingUser && (
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              minLength={8}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select 
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              disabled={!isAdmin}
            >
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              {isAdmin && <option value="ADMIN">Admin</option>}
            </select>
          </div>

          {editingUser && (
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
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${userToDelete?.fullName}? They will no longer be able to log in.`}
        confirmText="Deactivate"
      />
    </div>
  );
}
