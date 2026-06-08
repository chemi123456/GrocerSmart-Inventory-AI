import React from 'react';

export function StatusBadge({ status }) {
  const getBadgeClass = (s) => {
    const statusUpper = String(s).toUpperCase();
    switch (statusUpper) {
      case 'ACTIVE':
      case 'COMPLETED':
      case 'CLEARED':
      case 'RECEIVED':
      case 'SETTLED':
        return 'badge-success';
      case 'PENDING':
      case 'DRAFT':
      case 'DEPOSITED':
        return 'badge-warning';
      case 'INACTIVE':
      case 'DISCONTINUED':
      case 'CANCELLED':
      case 'VOIDED':
      case 'DEFAULTED':
      case 'BOUNCED':
        return 'badge-danger';
      case 'ADMIN':
      case 'MANAGER':
      case 'CASHIER':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {status}
    </span>
  );
}
