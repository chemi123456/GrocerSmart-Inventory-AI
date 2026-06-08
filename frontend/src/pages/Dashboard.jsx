import React, { useState, useEffect } from 'react';
import { FiUsers, FiBox, FiDollarSign, FiShoppingCart } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { usersAPI, productsAPI, ordersAPI, creditAPI } from '../services/api';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    creditDue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // In a real app, you'd want a specific /api/dashboard endpoint for this
        // For now, we'll fetch basic counts from the list endpoints
        const [usersRes, productsRes, ordersRes, creditRes] = await Promise.all([
          usersAPI.getAll(),
          productsAPI.getAll(),
          ordersAPI.getAll(),
          creditAPI.getAll()
        ]);

        const totalRevenue = ordersRes.data.data
          .filter(o => o.status === 'COMPLETED')
          .reduce((sum, order) => sum + order.totalAmount, 0);

        const totalCreditDue = creditRes.data.data
          .reduce((sum, customer) => sum + customer.outstandingBalance, 0);

        setStats({
          users: usersRes.data.count,
          products: productsRes.data.count,
          orders: ordersRes.data.count,
          revenue: totalRevenue,
          creditDue: totalCreditDue
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.fullName}!</h1>
          <p className="page-subtitle">Here's what's happening at GrocerSmart today.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green"><FiDollarSign /></div>
              <div className="stat-info">
                <p>Total Revenue</p>
                <h3>Rs. {stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon amber"><FiShoppingCart /></div>
              <div className="stat-info">
                <p>Total Orders</p>
                <h3>{stats.orders}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue"><FiBox /></div>
              <div className="stat-info">
                <p>Products</p>
                <h3>{stats.products}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red"><FiCreditCard /></div>
              <div className="stat-info">
                <p>Credit Due</p>
                <h3>Rs. {stats.creditDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
            <div className="glass-card">
              <h3>Recent Orders</h3>
              <div className="empty-state">
                <div className="empty-icon" style={{ fontSize: '2rem' }}>🛒</div>
                <p>Feature coming soon</p>
              </div>
            </div>
            <div className="glass-card">
              <h3>Low Stock Alerts</h3>
              <div className="empty-state">
                <div className="empty-icon" style={{ fontSize: '2rem' }}>⚠️</div>
                <p>Feature coming soon</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Ensure FiCreditCard is available
import { FiCreditCard } from 'react-icons/fi';
