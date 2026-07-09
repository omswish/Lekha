// frontend/src/components/SupplierPerformance.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Users, Star, MessageSquare } from 'lucide-react';

/**
 * SupplierPerformance Component: Digitizes Supplier Relationship procedures (PRO 23, FMT 24).
 * Manages Supplier registers and performance rating evaluation cards (FMT 24).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function SupplierPerformance({ token, user }) {
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [serviceProvided, setServiceProvided] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Evaluation Form states (FMT 24)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [qualityRating, setQualityRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [securityRating, setSecurityRating] = useState(5);
  const [remarks, setRemarks] = useState('');

  // Fetch Suppliers list
  const fetchSuppliers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load supplier registry.');
      }
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Submit new Supplier Record
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName || !serviceProvided || !contactPerson || !contactEmail) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ supplierName, serviceProvided, contactPerson, contactEmail })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchSuppliers();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to register supplier.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Supplier Performance Review (FMT 24)
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!remarks) {
      alert('Remarks are required.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/registers/suppliers/${selectedSupplier.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qualityRating, deliveryRating, securityRating, remarks })
      });
      if (response.ok) {
        setShowReviewModal(false);
        fetchSuppliers();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit supplier performance review.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Status (Admin Only)
  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/registers/suppliers/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchSuppliers();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to update supplier status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Supplier & Vendor Registry</h2>
          <p className="page-description">
            PRO 23: Suppliers relationship controls tracking active vendors and auditing security performance (FMT 24).
          </p>
        </div>

        {isAdminOrManager && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSupplierName(''); setServiceProvided(''); setContactPerson(''); setContactEmail('');
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Register Supplier
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Suppliers list */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && suppliers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading suppliers register...</div>
        ) : suppliers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No suppliers registered yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier & Services</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th>Performance Evaluations (FMT 24 Reviews)</th>
                {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.supplierName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Service: {s.serviceProvided}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>{s.contactPerson}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{s.contactEmail}</div>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.75rem', padding: '0.2rem', width: 'auto' }}
                        value={s.status}
                        onChange={(e) => handleUpdateStatus(s.id, e.target.value)}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="UNDER_REVIEW">UNDER REVIEW</option>
                        <option value="BLACKLISTED">BLACKLISTED</option>
                      </select>
                    ) : (
                      <span className={`badge ${
                        s.status === 'ACTIVE' ? 'badge-success' : 
                        s.status === 'UNDER_REVIEW' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {s.status}
                      </span>
                    )}
                  </td>
                  <td>
                    {s.reviews && s.reviews.length > 0 ? (
                      s.reviews.map((r) => (
                        <div key={r.id} style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>
                              Score: <strong style={{ color: 'var(--accent-success)', fontSize: '0.85rem' }}>{r.overallScore}/5</strong>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(r.reviewDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem', fontSize: '0.7rem' }}>
                            <div>Quality: <strong>{r.qualityRating}/5</strong></div>
                            <div>Delivery: <strong>{r.deliveryRating}/5</strong></div>
                            <div>Security: <strong>{r.securityRating}/5</strong></div>
                          </div>
                          <div style={{ marginTop: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem' }}>
                            "{r.remarks}"
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>Reviewed by: {r.reviewedBy}</div>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No evaluations recorded</span>
                    )}
                  </td>
                  {isAdminOrManager && (
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => { setSelectedSupplier(s); setQualityRating(5); setDeliveryRating(5); setSecurityRating(5); setRemarks(''); setShowReviewModal(true); }}
                      >
                        Auditing Review (FMT 24)
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Register Supplier Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} className="badge-internal" />
                <h3 className="modal-title">Register Supplier</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input type="text" className="form-control" placeholder="e.g. Cisco Systems India" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Service / Scope Provided *</label>
                <input type="text" className="form-control" placeholder="e.g. Router hardware supply and maintenance SLA." value={serviceProvided} onChange={(e) => setServiceProvided(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person Name *</label>
                <input type="text" className="form-control" placeholder="e.g. Anil Kumar" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email Address *</label>
                <input type="email" className="form-control" placeholder="anil.k@cisco.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auditing Review Modal (FMT 24) */}
      {showReviewModal && selectedSupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={20} className="badge-internal" />
                <h3 className="modal-title">Supplier Performance Review (FMT 24)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Vendor: </strong>{selectedSupplier.supplierName}</div>
                <div><strong>Service: </strong>{selectedSupplier.serviceProvided}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Quality (1-5) *</label>
                  <input type="number" min="1" max="5" className="form-control" value={qualityRating} onChange={(e) => setQualityRating(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery (1-5) *</label>
                  <input type="number" min="1" max="5" className="form-control" value={deliveryRating} onChange={(e) => setDeliveryRating(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Security (1-5) *</label>
                  <input type="number" min="1" max="5" className="form-control" value={securityRating} onChange={(e) => setSecurityRating(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Remarks / Audit Findings *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="Detail service levels, compliance SLA status, or identified security risks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
