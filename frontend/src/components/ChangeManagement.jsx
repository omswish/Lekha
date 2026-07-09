// frontend/src/components/ChangeManagement.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Settings, RefreshCw, FileText } from 'lucide-react';

/**
 * ChangeManagement Component: Digitizes Change Management procedures (PRO 13, FMT 25, FMT 28).
 * Handles Change Request logs, CAB approvals, and testing validation checklists.
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function ChangeManagement({ token, user }) {
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 25)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [systemName, setSystemName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [impactAnalysis, setImpactAnalysis] = useState('Low impact details...');
  const [rollbackPlan, setRollbackPlan] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Testing Modal states (FMT 28)
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState(null);
  const [testPlan, setTestPlan] = useState('');
  const [testCases, setTestCases] = useState('');
  const [testResult, setTestResult] = useState('SUCCESS');

  // Fetch Change requests register (FMT 27 Change Summary)
  const fetchChanges = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/changes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load change requests register.');
      }
      setChanges(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, []);

  // Submit new Change Request (FMT 25)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title || !systemName || !description || !reason || !impactAnalysis || !rollbackPlan || !targetDate) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, systemName, description, reason, impactAnalysis, rollbackPlan, targetDate })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchChanges();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit Change Request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit CAB Approval
  const handleApprove = async (id, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/registers/changes/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }) // APPROVED or REJECTED
      });
      if (response.ok) {
        fetchChanges();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to approve Change Request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Test Validation log (FMT 28)
  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!testPlan || !testCases || !testResult) {
      alert('Please fill out all testing checklist fields.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/registers/changes/${selectedChange.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testPlan, testCases, testResult })
      });
      if (response.ok) {
        setShowTestModal(false);
        fetchChanges();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log test results.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Change Management Registry</h2>
          <p className="page-description">
            PRO 13: System changes management controls logging Change Requests (FMT 25) and Testing validation (FMT 28).
          </p>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => {
            setTitle(''); setSystemName(''); setDescription(''); setReason(''); 
            setImpactAnalysis(''); setRollbackPlan(''); setTargetDate(new Date().toISOString().split('T')[0]);
            setShowCreateModal(true);
          }}
        >
          <PlusCircle size={14} />
          Create Change Request (FMT 25)
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Changes list layout */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && changes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading Change register...</div>
        ) : changes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No changes logged in the registry.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Change Code</th>
                <th>System & Title</th>
                <th>Impact & Rollback</th>
                <th>Requested By</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Approvals / Testing Logs</th>
                {(isAdmin || isAdminOrManager) && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.changeCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>System: {c.systemName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Desc: {c.description}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <div><strong>Impact: </strong>{c.impactAnalysis}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}><strong>Rollback: </strong>{c.rollbackPlan}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{c.requestedBy}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(c.targetDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className={`badge ${
                      c.status === 'IMPLEMENTED' ? 'badge-success' : 
                      c.status === 'APPROVED' ? 'badge-internal' :
                      c.status === 'TESTING' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {/* CAB approvals details */}
                    {c.approvalDate ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        CAB Approved by {c.approvedBy} on {new Date(c.approvalDate).toLocaleDateString('en-IN')}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--accent-warning)' }}>Awaiting CAB Review</div>
                    )}
                    {/* Testing logs details (FMT 28) */}
                    {c.testRecords && c.testRecords.length > 0 ? (
                      c.testRecords.map((t) => (
                        <div key={t.id} style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                          <span className={`badge ${t.testResult === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                            Test {t.testResult}
                          </span>
                          <div style={{ fontWeight: 500, marginTop: '0.15rem' }}>Plan: {t.testPlan}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>By: {t.testedBy} on {new Date(t.testDate).toLocaleDateString('en-IN')}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No Test logs recorded</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      {/* CAB Approvals triggers */}
                      {isAdmin && c.status === 'PENDING' && (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }} onClick={() => handleApprove(c.id, 'APPROVED')}>
                            Approve
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }} onClick={() => handleApprove(c.id, 'REJECTED')}>
                            Reject
                          </button>
                        </>
                      )}
                      {/* Testing log trigger */}
                      {isAdminOrManager && c.status === 'APPROVED' && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                          onClick={() => {
                            setSelectedChange(c); setTestPlan(''); setTestCases(''); setTestResult('SUCCESS');
                            setShowTestModal(true);
                          }}
                        >
                          Log Test (FMT 28)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Request Change Modal (FMT 25) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} className="badge-internal" />
                <h3 className="modal-title">Request System Change (FMT 25)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Change Request Title *</label>
                <input type="text" className="form-control" placeholder="e.g. Upgrade ERP Database Kernel" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">System / Hardware Target *</label>
                <input type="text" className="form-control" placeholder="e.g. Server UAIL/IT/SE/0002" value={systemName} onChange={(e) => setSystemName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Change Description *</label>
                <textarea className="form-control" style={{ height: '65px', resize: 'none' }} placeholder="Detail changes to apply..." value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Business Reason *</label>
                <input type="text" className="form-control" placeholder="e.g. Fix security vulnerabilities in outdated database version." value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Impact Analysis Details *</label>
                <input type="text" className="form-control" placeholder="e.g. Medium impact. Requires 30 mins downtime next Saturday night." value={impactAnalysis} onChange={(e) => setImpactAnalysis(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Rollback / Restoration Strategy *</label>
                <input type="text" className="form-control" placeholder="e.g. Restore VM partition from NAS backup logs." value={rollbackPlan} onChange={(e) => setRollbackPlan(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Target Completion Date *</label>
                <input type="date" className="form-control" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Change Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Log Modal (FMT 28) */}
      {showTestModal && selectedChange && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} className="badge-internal" />
                <h3 className="modal-title">Log Test Plan & Results (FMT 28)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowTestModal(false)}>×</button>
            </div>

            <form onSubmit={handleTestSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Change: </strong>{selectedChange.changeCode}</div>
                <div><strong>System: </strong>{selectedChange.systemName}</div>
                <div><strong>Title: </strong>{selectedChange.title}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Validation Test Plan Description *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="e.g. Restore backup image, verify user connections, execute read/write tests." value={testPlan} onChange={(e) => setTestPlan(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Test Case Validation checklist *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="e.g. 1. DB service starts (PASS)&#10;2. Connection pool loads (PASS)&#10;3. Data sync integrity (PASS)" value={testCases} onChange={(e) => setTestCases(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Test Case Result *</label>
                <select className="form-control" value={testResult} onChange={(e) => setTestResult(e.target.value)}>
                  <option value="SUCCESS">SUCCESS (Ready for Deployment)</option>
                  <option value="FAILED">FAILED (Rollback activated)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Test Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
