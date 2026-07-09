// frontend/src/components/PasswordSecurity.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Key, UserCheck, Shield } from 'lucide-react';

/**
 * PasswordSecurity Component: Digitizes Passwords & Access Revalidation controls (PRO 21, FMT 31, FMT 33).
 * Manages Password Rotation tracking logs (FMT 31) and quarterly User ID Revalidation Audits (FMT 33).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function PasswordSecurity({ token, user }) {
  const isAdmin = user.role === 'ADMIN';

  const [tracks, setTracks] = useState([]);
  const [revals, setRevals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Revalidation modal states (FMT 33)
  const [showRevalModal, setShowRevalModal] = useState(false);
  const [systemName, setSystemName] = useState('Active Directory');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [currentAccessLevel, setCurrentAccessLevel] = useState('EMPLOYEE');
  const [revalidated, setRevalidated] = useState(true);
  const [actionTaken, setActionTaken] = useState('Retained');

  // Track modal states (FMT 31)
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [resetReason, setResetReason] = useState('90-Day Rotation Policy');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Revalidation Reports
      const revResponse = await fetch('http://localhost:5000/api/registers/passwords/revalidations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const revData = await revResponse.json();
      if (revResponse.ok) setRevals(revData);

      // 2. Fetch Password Tracks (Admin Only)
      if (isAdmin) {
        const trResponse = await fetch('http://localhost:5000/api/registers/passwords/tracks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const trData = await trResponse.json();
        if (trResponse.ok) setTracks(trData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Revalidation Audit (FMT 33)
  const handleRevalSubmit = async (e) => {
    e.preventDefault();
    if (!systemName || !employeeEmail || !currentAccessLevel || !actionTaken) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/passwords/revalidations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ systemName, employeeEmail, currentAccessLevel, revalidated, actionTaken })
      });
      if (response.ok) {
        setShowRevalModal(false);
        fetchData();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit revalidation audit.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Log password reset (FMT 31)
  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/registers/passwords/reset-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employeeEmail: user.email, reason: resetReason })
      });
      if (response.ok) {
        setShowTrackModal(false);
        fetchData();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log reset track.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Password Security & Access Audits</h2>
          <p className="page-description">
            PRO 21: Password control tracks (FMT 31) and quarterly User ID revalidation reports (FMT 33).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => { setResetReason('90-Day Rotation Policy'); setShowTrackModal(true); }}
          >
            <Key size={14} />
            Log Password Reset (FMT 31)
          </button>

          {isAdmin && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSystemName('Active Directory'); setEmployeeEmail(''); setCurrentAccessLevel('EMPLOYEE');
                setRevalidated(true); setActionTaken('Retained');
                setShowRevalModal(true);
              }}
            >
              <UserCheck size={14} />
              Revalidate Access (FMT 33)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Grid sections */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* User ID access revalidation table */}
        <div className="table-container">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1rem' }}>Quarterly Access Revalidation Register (FMT 33)</h3>
          
          {loading && revals.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : revals.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No revalidation reports registered.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>System & User</th>
                  <th>Outcome</th>
                  <th>Auditor Signoff</th>
                </tr>
              </thead>
              <tbody>
                {revals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.revalidationCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.employeeEmail}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>System: {r.systemName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Current Role: {r.currentAccessLevel}</div>
                    </td>
                    <td>
                      <span className={`badge ${r.revalidated ? 'badge-success' : 'badge-danger'}`} style={{ marginRight: '0.25rem' }}>
                        {r.revalidated ? 'PASSED' : 'SUSPENDED'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Action: <strong>{r.actionTaken}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      <div>By: {r.revalidatedBy}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        Date: {new Date(r.reviewDate).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Password tracking history (Admin Only) */}
        {isAdmin && (
          <div className="table-container">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1rem' }}>Password Change Tracking Logs (FMT 31)</h3>
            
            {loading && tracks.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
            ) : tracks.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No password changes tracked.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Reset Reason</th>
                    <th>Change Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.employeeEmail}</td>
                      <td>{t.reason}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(t.changedDate).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Log Password track modal */}
      {showTrackModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} className="badge-internal" />
                <h3 className="modal-title">Log Password Reset (FMT 31)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowTrackModal(false)}>×</button>
            </div>

            <form onSubmit={handleTrackSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>User: </strong>{user.email}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Password Reset Reason *</label>
                <select className="form-control" value={resetReason} onChange={(e) => setResetReason(e.target.value)}>
                  <option value="90-Day Rotation Policy">90-Day Rotation Policy (Standard Compliance)</option>
                  <option value="Ad-Hoc Security Reset">Ad-Hoc Security Reset (Suspicious activity check)</option>
                  <option value="First-Time Secure Reset">First-Time Secure Reset</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTrackModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revalidation Modal (FMT 33) */}
      {showRevalModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} className="badge-internal" />
                <h3 className="modal-title">User ID Revalidation Audit (FMT 33)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowRevalModal(false)}>×</button>
            </div>

            <form onSubmit={handleRevalSubmit}>
              <div className="form-group">
                <label className="form-label">Target System *</label>
                <input type="text" className="form-control" value={systemName} onChange={(e) => setSystemName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Target User Email *</label>
                <input type="email" className="form-control" placeholder="username@adityabirla.com" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Current Role / Access Level *</label>
                <select className="form-control" value={currentAccessLevel} onChange={(e) => setCurrentAccessLevel(e.target.value)}>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="ASSET_MANAGER">ASSET_MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Revalidation Result *</label>
                <select className="form-control" value={String(revalidated)} onChange={(e) => setRevalidated(e.target.value === 'true')}>
                  <option value="true">PASSED (Access Validated)</option>
                  <option value="false">SUSPENDED (Access Flagged / Revoked)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Action Taken *</label>
                <select className="form-control" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}>
                  <option value="Retained">Retained (Permissions unmodified)</option>
                  <option value="Downgraded Access">Downgraded Access (Privileges stripped)</option>
                  <option value="Access Revoked">Access Revoked (User account locked)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRevalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Audit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
