import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saTenantApi } from '../api/saApi';
import { 
  Building2, Plus, Database, CheckCircle2, XCircle, Search, 
  RefreshCw, ShieldCheck, Zap, Crown
} from 'lucide-react';
import { ProvisionTenantModal } from '../components/ProvisionTenantModal';
import { CredentialsModal } from '../components/CredentialsModal';

export const SaDashboard = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState({
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    planDistribution: { basic: 0, pro: 0, enterprise: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [newTenantName, setNewTenantName] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await saTenantApi.getDashboardSummary();
      setSummary(res.data.summary || {});
      setTenants(res.data.tenants || []);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleStatus = async (tenantId) => {
    try {
      await saTenantApi.toggleTenantStatus(tenantId);
      fetchDashboard();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleUpdatePlan = async (tenantId, newPlan) => {
    try {
      await saTenantApi.updateTenantPlan(tenantId, newPlan);
      fetchDashboard();
    } catch (err) {
      console.error('Error updating tenant plan:', err);
    }
  };

  const handleProvisionSuccess = (credentials, tenantName) => {
    setShowProvisionModal(false);
    setNewCredentials(credentials);
    setNewTenantName(tenantName);
    fetchDashboard();
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch = 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dbName?.toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === 'ACTIVE') return matchesSearch && t.isActive;
      if (statusFilter === 'INACTIVE') return matchesSearch && !t.isActive;
      return matchesSearch;
    });
  }, [tenants, searchQuery, statusFilter]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Top Header & Main Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            Hotel Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchDashboard}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
              background: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '8px', color: '#475569', fontWeight: '600', fontSize: '13px',
              transition: 'all 0.15s ease-in-out', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync
          </button>

          <button
            onClick={() => navigate('/provision-hotel')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: '#2563eb', borderRadius: '8px',
              color: '#ffffff', fontWeight: '700', fontSize: '14px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            <Plus size={18} /> Provision Hotel
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Matching frontend .card-grid & .dashboard-card styling) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        {/* Total Hotels */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Total Hotels</span>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
              <Building2 size={20} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb', lineHeight: 1 }}>
            {summary.totalTenants}
          </div>
        </div>

        {/* Active Hotels */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Active</span>
            <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '8px' }}>
              <CheckCircle2 size={20} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a', lineHeight: 1 }}>
            {summary.activeTenants}
          </div>
        </div>

        {/* Inactive */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Inactive</span>
            <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '8px' }}>
              <XCircle size={20} color="#dc2626" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>
            {summary.inactiveTenants}
          </div>
        </div>

        {/* Basic Plan Widget */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Basic Plan</span>
            <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
              <ShieldCheck size={20} color="#475569" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#475569', lineHeight: 1 }}>
            {summary.planDistribution?.basic || 0}
          </div>
        </div>

        {/* Pro Plan Widget */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Pro Plan</span>
            <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px' }}>
              <Zap size={20} color="#0284c7" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0284c7', lineHeight: 1 }}>
            {summary.planDistribution?.pro || 0}
          </div>
        </div>

        {/* Enterprise Plan Widget */}
        <div className="panel-card" style={{ padding: '20px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Enterprise Plan</span>
            <div style={{ background: '#f3e8ff', padding: '8px', borderRadius: '8px' }}>
              <Crown size={20} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#7c3aed', lineHeight: 1 }}>
            {summary.planDistribution?.enterprise || 0}
          </div>
        </div>
      </div>

      {/* Tenant Directory Table Panel */}
      <div className="panel-card" style={{ padding: '24px' }}>
        
        {/* Table Filter & Search Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', width: '340px' }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search by hotel or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#0f172a', fontSize: '14px', width: '100%', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                background: statusFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: statusFilter === 'ALL' ? '#2563eb' : '#64748b',
                boxShadow: statusFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              All ({tenants.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                background: statusFilter === 'ACTIVE' ? '#ffffff' : 'transparent',
                color: statusFilter === 'ACTIVE' ? '#16a34a' : '#64748b',
                boxShadow: statusFilter === 'ACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Active ({summary.activeTenants})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                background: statusFilter === 'INACTIVE' ? '#ffffff' : 'transparent',
                color: statusFilter === 'INACTIVE' ? '#dc2626' : '#64748b',
                boxShadow: statusFilter === 'INACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Inactive ({summary.inactiveTenants})
            </button>
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading hotel databases...</div>
        ) : filteredTenants.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No hotel organizations match your search.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px' }}>Organization</th>
                  <th style={{ padding: '12px 16px' }}>Database</th>
                  <th style={{ padding: '12px 16px' }}>Owner</th>
                  <th style={{ padding: '12px 16px' }}>Subscription Plan</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', background: '#ffffff' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{t.name}</div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}>
                        <Database size={13} color="#64748b" /> {t.dbName}
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ color: '#1e293b', fontWeight: '600' }}>{t.owner?.name}</div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <select
                        value={t.plan}
                        onChange={(e) => handleUpdatePlan(t.tenantId, e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: t.plan === 'enterprise' ? '#7c3aed' : t.plan === 'pro' ? '#0284c7' : '#475569',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="basic">BASIC</option>
                        <option value="pro">PRO</option>
                        <option value="enterprise">ENTERPRISE</option>
                      </select>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${t.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(t.tenantId)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: t.isActive ? '#fee2e2' : '#dcfce7',
                          color: t.isActive ? '#b91c1c' : '#15803d',
                          border: t.isActive ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                          transition: 'all 0.15s ease-in-out',
                        }}
                      >
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Modal */}
      {showProvisionModal && (
        <ProvisionTenantModal
          onClose={() => setShowProvisionModal(false)}
          onSuccess={handleProvisionSuccess}
        />
      )}

      {/* Generated Credentials Modal */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          tenantName={newTenantName}
          onClose={() => setNewCredentials(null)}
        />
      )}
    </div>
  );
};
