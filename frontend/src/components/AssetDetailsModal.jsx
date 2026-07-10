// frontend/src/components/AssetDetailsModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, HardDrive, Shield, MapPin, Hash, CheckCircle, AlertTriangle, Clock, Award } from 'lucide-react';

/**
 * Helper to identify OEM brand from asset name/model and return a styled logo
 */
function OemLogo({ brand }) {
  const logoStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    textTransform: 'uppercase',
    fontFamily: 'monospace'
  };

  switch (brand) {
    case 'HP':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#0096D6', color: '#ffffff', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1rem', fontStyle: 'italic' }} title="Hewlett-Packard">
          hp
        </span>
      );
    case 'DELL':
      return (
        <span style={{ ...logoStyles, border: '2px solid #0076B6', color: '#0076B6', borderRadius: '50%', width: '36px', height: '36px', fontSize: '0.7rem' }} title="Dell Technologies">
          DELL
        </span>
      );
    case 'LENOVO':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#E11927', color: '#ffffff', letterSpacing: '-0.5px' }} title="Lenovo Group">
          lenovo
        </span>
      );
    case 'APPLE':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#111111', color: '#ffffff', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.1rem' }} title="Apple Inc.">
          
        </span>
      );
    case 'CISCO':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#049FD9', color: '#ffffff' }} title="Cisco Systems">
          CISCO
        </span>
      );
    case 'APC':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#3b9c00', color: '#ffffff' }} title="APC by Schneider Electric">
          APC
        </span>
      );
    case 'EMERSON':
      return (
        <span style={{ ...logoStyles, backgroundColor: '#00539B', color: '#ffffff' }} title="Emerson Network Power">
          EMERSON
        </span>
      );
    default:
      return (
        <span style={{ ...logoStyles, backgroundColor: 'var(--bg-tertiary)', color: 'var(--color-text-muted)', border: '1px solid var(--border-color)' }} title="Generic Brand">
          {brand}
        </span>
      );
  }
}

export default function AssetDetailsModal({ asset, token, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!asset || !asset.id) return;
    setLoading(true);
    setError(null);

    fetch(`http://localhost:5000/api/assets/${asset.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load asset details');
        return res.json();
      })
      .then(data => {
        setDetails(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching details:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [asset, token]);

  if (!asset) return null;

  // Determine OEM brand
  const text = ((asset.model || '') + ' ' + (asset.name || '')).toLowerCase();
  let brand = 'GENERIC';
  if (text.includes('hp') || text.includes('hewlett')) brand = 'HP';
  else if (text.includes('dell')) brand = 'DELL';
  else if (text.includes('lenovo') || text.includes('thinkpad')) brand = 'LENOVO';
  else if (text.includes('apple') || text.includes('macbook') || text.includes('imac')) brand = 'APPLE';
  else if (text.includes('cisco')) brand = 'CISCO';
  else if (text.includes('apc')) brand = 'APC';
  else if (text.includes('emerson')) brand = 'EMERSON';

  // Get warranty badge styling details
  const getWarrantyBadgeClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('ACTIVE') || s.includes('OK') || s.includes('YES') || s === 'IN WARRANTY') return 'badge-success';
    if (s.includes('EXPIRED') || s.includes('NO')) return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '720px', 
          width: '90%', 
          backgroundColor: '#ffffff', 
          color: '#212529',
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          padding: '2rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: '1px solid var(--border-color)', 
            paddingBottom: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              Asset Specification Card
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              ISO 27001:2022 Control A.5.9 compliance audit record
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.2rem'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading asset allocation track and specifications...
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ margin: '1rem 0' }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : (
            <div>
              {/* Top Banner Overview */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  borderTop: '4px solid var(--accent-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {details.name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{details.assetTag}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{details.model}</span>
                  </div>
                  <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${details.classification?.toLowerCase()}`}>
                      {details.classification}
                    </span>
                    <span className={`badge ${details.status === 'ALLOCATED' ? 'badge-success' : 'badge-secondary'}`}>
                      {details.status}
                    </span>
                  </div>
                </div>

                <div>
                  <OemLogo brand={brand} />
                </div>
              </div>

              {/* Core Information Redesign Highlights */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem', 
                  marginBottom: '1.5rem' 
                }}
              >
                {/* Serial Number Card */}
                <div style={{ padding: '1rem', backgroundColor: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Serial Number
                  </div>
                  <div style={{ fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {details.serialNumber || 'Not Available'}
                  </div>
                </div>

                {/* Allocation Status Card */}
                <div style={{ padding: '1rem', backgroundColor: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Allocation Status
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: details.owner ? 'var(--accent-success)' : 'var(--color-text-muted)' }}>
                    {details.owner ? `Allocated: ${details.owner.name}` : 'In Stock / Unassigned'}
                  </div>
                </div>

                {/* Warranty Status Card */}
                <div style={{ padding: '1rem', backgroundColor: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Warranty Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                    <span className={`badge ${getWarrantyBadgeClass(details.warrantyStatus)}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                      {details.warrantyStatus || 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specifications Grid */}
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                <HardDrive size={16} style={{ color: 'var(--accent-primary)' }} /> Hardware Specifications
              </h4>

              <div className="form-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Category</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.category}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Physical Location</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.location || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Sub-type Label</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.type || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Data Classification</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.classification}
                  </div>
                </div>
              </div>

              {/* Verification Audit Track */}
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                <Shield size={16} style={{ color: 'var(--accent-warning)' }} /> Physical Verification Track (PRO 06)
              </h4>

              <div className="form-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Last Verified Date</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.lastVerifiedDate ? new Date(details.lastVerifiedDate).toLocaleDateString('en-IN') : 'Never Verified'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Next Audit Due Date</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.nextVerificationDue ? new Date(details.nextVerificationDue).toLocaleDateString('en-IN') : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Current Assignee details */}
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                <User size={16} style={{ color: 'var(--accent-success)' }} /> Current Allocation details
              </h4>

              <div className="form-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Assigned Employee</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.owner ? details.owner.name : 'Stock / Unassigned'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Department</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.2rem', color: 'var(--color-text-primary)' }}>
                    {details.owner?.department || 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Acceptable Use Policy</label>
                  <div style={{ marginTop: '0.2rem' }}>
                    {details.owner ? (
                      <span className={`badge ${details.acceptableUseSigned ? 'badge-success' : 'badge-danger'}`}>
                        {details.acceptableUseSigned ? 'Signed' : 'Pending'}
                      </span>
                    ) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Extra specifications metadata */}
              {details.customFields && Object.keys(details.customFields).filter(k => k !== '_migration').length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                    Extended Specs Attributes
                  </h4>
                  <div 
                    style={{ 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-color)', 
                      marginBottom: '1.5rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '0.75rem'
                    }}
                  >
                    {Object.entries(details.customFields)
                      .filter(([k]) => k !== '_migration')
                      .map(([key, val]) => (
                        <div key={key}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '0.1rem' }}>
                            {String(val)}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Allocation history list */}
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> Historical Issue & Revoke Track
              </h4>

              {!details.allocationHistory || details.allocationHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  No historical transfer allocations logged in the issue tracking registry.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {details.allocationHistory.map((hist) => {
                    const issueStr = hist.issueDate ? new Date(hist.issueDate).toLocaleDateString('en-IN') : 'Unknown';
                    const revokeStr = hist.revokeDate ? new Date(hist.revokeDate).toLocaleDateString('en-IN') : 'Present';
                    const isRevoked = hist.status?.toUpperCase() === 'REVOKED' || !!hist.revokeDate;

                    return (
                      <div 
                        key={hist.id} 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          backgroundColor: '#ffffff', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)',
                          borderLeft: isRevoked ? '4px solid var(--color-text-muted)' : '4px solid var(--accent-success)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                            {hist.employeeName} {hist.employeeCode ? `(${hist.employeeCode})` : ''}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem' }}>
                            <span><strong>Dept:</strong> {hist.department || 'Not Available'}</span>
                            <span><strong>Loc:</strong> {hist.location || 'Not Available'}</span>
                          </div>
                          {hist.remarks && (
                            <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              Remarks: {hist.remarks}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span 
                            className={`badge ${isRevoked ? 'badge-danger' : 'badge-success'}`} 
                            style={{ display: 'inline-block', fontSize: '0.7rem', padding: '0.15rem 0.4rem', marginBottom: '0.3rem' }}
                          >
                            {isRevoked ? 'REVOKED' : 'ISSUED'}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {issueStr} – {revokeStr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close details
          </button>
        </div>
      </div>
    </div>
  );
}
