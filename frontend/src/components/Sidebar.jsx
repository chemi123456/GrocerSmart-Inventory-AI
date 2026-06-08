import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, FiUsers, FiBox, FiShoppingCart, 
  FiCreditCard, FiDollarSign, FiTruck, FiLogOut, FiMenu
} from 'react-icons/fi';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <FiHome />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { path: '/inventory', label: 'Inventory', icon: <FiBox />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { path: '/orders', label: 'Orders', icon: <FiShoppingCart />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { path: '/credit-customers', label: 'Credit Customers', icon: <FiCreditCard />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { path: '/cheques', label: 'Bank & Cheques', icon: <FiDollarSign />, roles: ['ADMIN', 'MANAGER'] },
    { path: '/suppliers', label: 'Suppliers', icon: <FiTruck />, roles: ['ADMIN', 'MANAGER'] },
    { path: '/users', label: 'User Management', icon: <FiUsers />, roles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          {!collapsed && <h2>Grocer<span>Smart</span></h2>}
          {collapsed && <h2>GS</h2>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <FiMenu size={20} />
        </button>
      </div>

      <div className="sidebar-nav">
        {filteredItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <div className="nav-icon">{item.icon}</div>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <div className="user-name">{user?.fullName}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout} title={collapsed ? "Logout" : ""}>
          <FiLogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: width var(--transition);
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .logo h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        
        .logo span {
          color: var(--primary);
        }

        .collapse-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition);
        }

        .collapse-btn:hover {
          color: var(--text-primary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.875rem 1.5rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all var(--transition-fast);
          margin: 0.25rem 1rem;
          border-radius: var(--radius-md);
        }

        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .nav-icon {
          font-size: 1.25rem;
          margin-right: 1rem;
          display: flex;
        }

        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 0.875rem;
          margin: 0.25rem 0.5rem;
        }

        .sidebar.collapsed .nav-icon {
          margin-right: 0;
        }

        .nav-label {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar.collapsed .sidebar-footer {
          flex-direction: column;
          padding: 1rem 0.5rem;
        }

        .user-info {
          overflow: hidden;
        }

        .user-name {
          font-weight: 700;
          font-size: 0.875rem;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .logout-btn {
          background: none;
          border: none;
          color: var(--danger-light);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: background var(--transition);
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </aside>
  );
}
