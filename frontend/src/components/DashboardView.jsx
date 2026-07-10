// frontend/src/components/DashboardView.jsx

import React, { useState, useEffect } from 'react';
import { 
  HardDrive, UserCheck, ShieldCheck, ShieldAlert, Clipboard, 
  AlertTriangle, Database, Activity, GraduationCap, Users, FileText, Lock, Settings 
} from 'lucide-react';

/**
 * DashboardView Component: Polished card-based dashboard with IBM Maximo-inspired aesthetics.
 * Allows role-based stats customization ("Customize Visible Stats") and "View All".
 * Avoids glassmorphism and uses professional colors: cream (#fbfaf7) and dark orange (#e65f00).
 */
export default function DashboardView({ token, user, setActiveTab }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Customize modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Available cards dictionary with details
  const cardsConfig = {
    total_assets: { label: 'Total IT Assets', desc: 'Registered physical/logical units', icon: HardDrive, color: '#e65f00', roles: ['ADMIN', 'ASSET_MANAGER'] },
    allocated_assets: { label: 'Assigned Devices', desc: 'Active assets currently allocated', icon: UserCheck, color: '#198754', roles: ['ADMIN', 'ASSET_MANAGER', 'EMPLOYEE'] },
    confidential_systems: { label: 'Confidential Systems', desc: 'High-security classified units', icon: ShieldCheck, color: '#dc3545', roles: ['ADMIN', 'ASSET_MANAGER'] },
    verification_overdue: { label: 'Audit Overdue Units', desc: 'Units needing physical verification', icon: ShieldAlert, color: '#e65f00', roles: ['ADMIN', 'ASSET_MANAGER'] },
    incomplete_assets: { label: 'Incomplete Assets', desc: 'Assets containing Not Available fields', icon: AlertTriangle, color: '#ffc107', roles: ['ADMIN', 'ASSET_MANAGER'] },
    pending_requests: { label: 'Pending Access Requests', desc: 'Awaiting permission approval checks', icon: Clipboard, color: '#fd7e14', roles: ['ADMIN', 'ASSET_MANAGER'] },
    active_incidents: { label: 'Open Incidents', desc: 'Unresolved security incident logs', icon: AlertTriangle, color: '#dc3545', roles: ['ADMIN'] },
    backup_success: { label: 'Backup Success Rate', desc: 'Tested & verified recovery charts', icon: Database, color: '#198754', roles: ['ADMIN', 'ASSET_MANAGER'] },
    patch_installed: { label: 'OS Patch Rate', desc: 'Installed patch levels metrics', icon: Activity, color: '#0d6efd', roles: ['ADMIN', 'ASSET_MANAGER'] },
    training_completed: { label: 'Training Pass Rate', desc: 'Staff exam scores percentage', icon: GraduationCap, color: '#198754', roles: ['ADMIN', 'ASSET_MANAGER', 'EMPLOYEE'] },
    vendor_count: { label: 'Active Suppliers', desc: 'Registered third-party vendors', icon: Users, color: '#0d6efd', roles: ['ADMIN', 'ASSET_MANAGER'] },
    mrm_logged: { label: 'MRMs Logged', desc: 'Minutes of MRM meetings tracked', icon: FileText, color: '#6c757d', roles: ['ADMIN'] },
    dpdp_consent: { label: 'DPDP Act Consent', desc: 'Your data processing authorization status', icon: Lock, color: '#198754', roles: ['EMPLOYEE', 'ADMIN'] }
  };

  // Filter cards by user role
  const allowedCardKeys = Object.keys(cardsConfig).filter(k => cardsConfig[k].roles.includes(user.role));

  // State of visible cards (keys)
  const [visibleCardKeys, setVisibleCardKeys] = useState(() => {
    // Default subset of cards
    if (user.role === 'ADMIN') {
      return ['total_assets', 'allocated_assets', 'confidential_systems', 'verification_overdue', 'incomplete_assets', 'pending_requests', 'active_incidents'];
    } else if (user.role === 'ASSET_MANAGER') {
      return ['total_assets', 'allocated_assets', 'verification_overdue', 'incomplete_assets', 'backup_success', 'patch_installed', 'vendor_count'];
    } else {
      return ['allocated_assets', 'training_completed', 'dpdp_consent'];
    }
  });

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/dashboard-metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await response.json();
      if (!response.ok) {
        throw new Error(d.error || 'Failed to fetch dashboard statistics.');
      }
      setMetrics(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const toggleCardVisibility = (key) => {
    setVisibleCardKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleViewAll = () => {
    setVisibleCardKeys(allowedCardKeys);
  };

  const getMetricValue = (key) => {
    if (!metrics) return '-';
    switch (key) {
      case 'total_assets': return metrics.totalAssets;
      case 'allocated_assets': return metrics.allocatedAssets;
      case 'confidential_systems': return metrics.criticalAssets;
      case 'verification_overdue': return metrics.unverifiedAssets;
      case 'incomplete_assets': return metrics.incompleteAssets;
      case 'pending_requests': return metrics.pendingRequests;
      case 'active_incidents': return metrics.activeIncidents;
      case 'backup_success': return `${metrics.backupRate}%`;
      case 'patch_installed': return `${metrics.patchRate}%`;
      case 'training_completed': return `${metrics.trainingPassRate}%`;
      case 'vendor_count': return metrics.supplierCount;
      case 'mrm_logged': return metrics.mrmCount;
      case 'dpdp_consent': return metrics.consentStatus ? 'GRANTED' : 'PENDING';
      default: return '-';
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title">Compliance Management Center</h2>
          <p className="page-description">
            IBM Maximo-inspired ISMS governance, asset verification registries, and DPDP consent controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleViewAll}
            style={{ fontWeight: 600 }}
          >
            View All Stats
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowCustomizeModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
          >
            <Settings size={14} />
            Customize Visible Stats
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {loading && !metrics ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Retrieving real-time compliance database metrics...
        </div>
      ) : (
        <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {visibleCardKeys.map(key => {
            const card = cardsConfig[key];
            if (!card) return null;
            const Icon = card.icon;

            return (
              <div 
                key={key} 
                className="card"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderTop: `4px solid ${card.color}`, // Solid colored header border (Maximo style)
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  // Link card clicks to relevant tabs
                  if (key === 'incomplete_assets') {
                    setActiveTab('inventory', 'INCOMPLETE');
                  } else if (key === 'total_assets' || key === 'allocated_assets' || key === 'confidential_systems' || key === 'verification_overdue') {
                    setActiveTab('inventory');
                  } else if (key === 'pending_requests') {
                    setActiveTab('registers'); // Access requests tab
                  } else if (key === 'active_incidents') {
                    setActiveTab('registers'); // Incident logs tab
                  } else if (key === 'backup_success') {
                    setActiveTab('registers'); // backup register tab
                  } else if (key === 'patch_installed') {
                    setActiveTab('registers'); // patch audits tab
                  } else if (key === 'training_completed') {
                    setActiveTab('training');
                  } else if (key === 'vendor_count') {
                    setActiveTab('suppliers');
                  } else if (key === 'mrm_logged') {
                    setActiveTab('administrative');
                  } else if (key === 'dpdp_consent') {
                    setActiveTab('profile');
                  }
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {card.label}
                  </span>
                  <div style={{ backgroundColor: `${card.color}12`, padding: '0.35rem', borderRadius: '8px' }}>
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                </div>

                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.5rem 0' }}>
                  {getMetricValue(key)}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {card.desc}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customize visible cards Modal */}
      {showCustomizeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Customize visible widgets</h3>
              <button className="modal-close" onClick={() => setShowCustomizeModal(false)}>×</button>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                Toggle the checkmarks below to add or remove dashboard widgets.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allowedCardKeys.map(k => (
                  <label 
                    key={k} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      fontSize: '0.9rem', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={visibleCardKeys.includes(k)} 
                      onChange={() => toggleCardVisibility(k)} 
                      style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                    />
                    {cardsConfig[k].label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowCustomizeModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
