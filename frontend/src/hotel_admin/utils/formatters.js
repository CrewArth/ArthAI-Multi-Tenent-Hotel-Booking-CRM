/**
 * Shared formatting utilities for Hotel Admin modules
 */

export const formatCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN')}`;

export const formatDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
};

export const formatDateTime = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val);
  }
};

export const getStatusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase().trim();
  switch (s) {
    case 'confirmed':
    case 'approved':
    case 'active':
    case 'available':
      return 'ha-badge--success';
    case 'checked-in':
      return 'ha-badge--primary';
    case 'checked-out':
      return 'ha-badge--neutral';
    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'booked':
      return 'ha-badge--danger';
    case 'pending':
    case 'maintenance':
      return 'ha-badge--warning';
    default:
      return 'ha-badge--neutral';
  }
};
