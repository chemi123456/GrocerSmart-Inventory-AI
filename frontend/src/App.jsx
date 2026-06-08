import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Users } from './pages/Users';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Orders } from './pages/Orders';
import { CreditCustomers } from './pages/CreditCustomers';
import { Cheques } from './pages/Cheques';
import { Suppliers } from './pages/Suppliers';

// Placeholder components for pages we haven't built yet
// const Dashboard = () => <div><h2>Dashboard</h2><p>Coming soon...</p></div>;
// const Users = () => <div><h2>User Management</h2><p>Coming soon...</p></div>;
// const Inventory = () => <div><h2>Inventory Management</h2><p>Coming soon...</p></div>;
// const Orders = () => <div><h2>Order Management</h2><p>Coming soon...</p></div>;
// const CreditCustomers = () => <div><h2>Credit Customer Management</h2><p>Coming soon...</p></div>;
// const Cheques = () => <div><h2>Bank & Cheque Management</h2><p>Coming soon...</p></div>;
// const Suppliers = () => <div><h2>Supplier Management</h2><p>Coming soon...</p></div>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="credit-customers" element={<CreditCustomers />} />
            <Route path="cheques" element={<Cheques />} />
            <Route path="suppliers" element={<Suppliers />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
