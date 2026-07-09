// frontend/src/components/LogReview.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Search, Clipboard } from 'lucide-react';

/**
 * LogReview Component: Digitizes Log Review procedures (PRO 12, FMT 49, FMT 50).
 * Handles Log Review Matrix (FMT 49) and Log Review audit checklists (FMT 50).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function LogReview({ token, user }) {
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 49/50)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [systemName, setSystemName] = useState('Active Directory Server');
  const [logSource, setLogSource] = useState('Security Log Channel');
  const [deviationsObserved, setDeviationsObserved] = useState(false);
  const [deviationDetails, setDeviationDetails] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  // Fetch reviews history
  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/logs/reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load log review records.');
      }
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Submit log review (FMT 50)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!systemName || !logSource) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/logs/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ systemName, logSource, deviationsObserved, deviationDetails, actionTaken })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchReviews();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit log review audit.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Log Review Registry</h2>
          <p className="page-description">
            PRO 12: Security event logging matrix checks (FMT 49 Matrix & FMT 50 Log Review Reports).
          </p>
        </div>

        {isAdminOrManager && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSystemName('Active Directory Server'); setLogSource('Security Log Channel');
              setDeviationsObserved(false); setDeviationDetails(''); setActionTaken('');
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Perform Log Review (FMT 50)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Reviews list */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && reviews.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading log audits...</div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No log reviews registered yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit Code</th>
                <th>System & Log Source</th>
                <th>Status / Outcome</th>
                <th>Observed Deviations / Gaps</th>
                <th>Actions Taken</th>
                <th>Auditor Signoff</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.reviewCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.systemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Source: {r.logSource}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'COMPLIANT' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {r.deviationsObserved ? (
                      <span style={{ color: 'var(--color-text-danger)' }}>{r.deviationDetails}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No deviations observed</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {r.actionTaken ? (
                      <span>{r.actionTaken}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>By: {r.reviewedBy}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      Date: {new Date(r.reviewDate).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Perform Review Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clipboard size={20} className="badge-internal" />
                <h3 className="modal-title">Log Review Audit (FMT 50)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Target System *</label>
                <input type="text" className="form-control" value={systemName} onChange={(e) => setSystemName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Log Source Target *</label>
                <input type="text" className="form-control" placeholder="e.g. /var/log/secure" value={logSource} onChange={(e) => setLogSource(e.target.value)} required />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={deviationsObserved} onChange={(e) => setDeviationsObserved(e.target.checked)} />
                  Security Deviations / Anomalies Observed
                </label>
              </div>

              {deviationsObserved && (
                <>
                  <div className="form-group">
                    <label className="form-label">Deviation details *</label>
                    <textarea className="form-control" style={{ height: '65px', resize: 'none' }} placeholder="Detail observed audit failed logs or unauthorized attempts..." value={deviationDetails} onChange={(e) => setDeviationDetails(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Corrective action taken *</label>
                    <textarea className="form-control" style={{ height: '65px', resize: 'none' }} placeholder="Detail blocking rules applied or password reset instructions triggered..." value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
