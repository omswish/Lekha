// frontend/src/components/InternalAudits.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Clipboard, FileText, Search } from 'lucide-react';

/**
 * InternalAudits Component: Digitizes Internal Auditing procedures (PRO 05, FMT 09/10/11/54).
 * Manages Audit Plans (FMT 09/10) and Checklist findings records (FMT 11/54).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function InternalAudits({ token, user }) {
  const isAdmin = user.role === 'ADMIN';

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 10 Audit Plan)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [department, setDepartment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [leadAuditor, setLeadAuditor] = useState('');
  const [auditee, setAuditee] = useState('');
  const [scope, setScope] = useState('');

  // Finding Form states (FMT 11 Checklist & FMT 54 Report)
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [checklistQuestion, setChecklistQuestion] = useState('');
  const [evidenceObserved, setEvidenceObserved] = useState('');
  const [complianceStatus, setComplianceStatus] = useState('COMPLIANT');
  const [ncrCode, setNcrCode] = useState('');

  // Fetch Audits list
  const fetchAudits = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/audits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load internal audit register.');
      }
      setAudits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  // Submit new Audit Plan (FMT 09/10)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!department || !scheduledDate || !leadAuditor || !auditee || !scope) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ department, scheduledDate, leadAuditor, auditee, scope })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchAudits();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to schedule audit plan.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Audit Finding (FMT 11/54)
  const handleFindingSubmit = async (e) => {
    e.preventDefault();
    if (!checklistQuestion || !evidenceObserved) {
      alert('Checklist points and evidence observed are mandatory.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/registers/audits/${selectedAudit.id}/finding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ checklistQuestion, evidenceObserved, complianceStatus, ncrCode: complianceStatus === 'NON_CONFORMANCE' ? ncrCode : null })
      });
      if (response.ok) {
        setShowFindingModal(false);
        fetchAudits();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log audit findings.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Signoff Audit completion
  const handleCompleteAudit = async (id) => {
    if (!confirm('Are you sure you want to sign-off and finalize this internal audit report?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/registers/audits/${id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchAudits();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to sign-off audit.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Internal Audits Registry</h2>
          <p className="page-description">
            PRO 05: Internal audit planning schedules (FMT 09/10) and checklist verification reports (FMT 11/54).
          </p>
        </div>

        {isAdmin && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setDepartment(''); setScheduledDate(new Date().toISOString().split('T')[0]); 
              setLeadAuditor(user.email); setAuditee(''); setScope('');
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Schedule Internal Audit (FMT 09/10)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Audits list */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && audits.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading audits register...</div>
        ) : audits.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No audit plans scheduled.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit Code</th>
                <th>Target Dept & Scope</th>
                <th>Auditor / Auditee</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Findings Checklist (FMT 11/54)</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.auditCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.department}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Scope: {a.scope}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>Auditor: <strong>{a.leadAuditor}</strong></div>
                    <div>Auditee: <strong>{a.auditee}</strong></div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(a.scheduledDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className={`badge ${a.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.findings && a.findings.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {a.findings.map((f) => (
                          <div key={f.id} style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className={`badge ${
                                f.complianceStatus === 'COMPLIANT' ? 'badge-success' : 
                                f.complianceStatus === 'CONCERN' ? 'badge-warning' : 'badge-danger'
                              }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                                {f.complianceStatus}
                              </span>
                              {f.ncrCode && <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>NCR: {f.ncrCode}</span>}
                            </div>
                            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>Q: {f.checklistQuestion}</div>
                            <div style={{ color: 'var(--color-text-muted)' }}>Evidence: "{f.evidenceObserved}"</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>Audited by: {f.testedBy}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No findings checklists logged</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      {a.status !== 'COMPLETED' && (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                            onClick={() => { setSelectedAudit(a); setChecklistQuestion(''); setEvidenceObserved(''); setComplianceStatus('COMPLIANT'); setNcrCode(''); setShowFindingModal(true); }}
                          >
                            Add Finding (FMT 11)
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                            onClick={() => handleCompleteAudit(a.id)}
                          >
                            Signoff Report (FMT 54)
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Audit Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clipboard size={20} className="badge-internal" />
                <h3 className="modal-title">Schedule Audit Program (FMT 09/10)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Department Target *</label>
                <input type="text" className="form-control" placeholder="e.g. IT & Security Operations" value={department} onChange={(e) => setDepartment(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audit Scope description *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="e.g. Verify patch management compliance PRO-20 and visitor logs registries FMT 22." value={scope} onChange={(e) => setScope(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Lead Auditor Email *</label>
                  <input type="email" className="form-control" value={leadAuditor} onChange={(e) => setLeadAuditor(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Auditee Department Lead *</label>
                  <input type="email" className="form-control" placeholder="dept.head@adityabirla.com" value={auditee} onChange={(e) => setAuditee(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Scheduled Audit Date *</label>
                <input type="date" className="form-control" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Finding Modal */}
      {showFindingModal && selectedAudit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} className="badge-internal" />
                <h3 className="modal-title">Record Audit Finding (FMT 11/54)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowFindingModal(false)}>×</button>
            </div>

            <form onSubmit={handleFindingSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Audit: </strong>{selectedAudit.auditCode}</div>
                <div><strong>Dept: </strong>{selectedAudit.department}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Checklist Point Question *</label>
                <input type="text" className="form-control" placeholder="e.g. Are security patches deployed within 48 hours SLA?" value={checklistQuestion} onChange={(e) => setChecklistQuestion(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Evidence / Observation findings *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="Detail observed records, database logs audited, or checklists verified..." value={evidenceObserved} onChange={(e) => setEvidenceObserved(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Audit Compliance Status *</label>
                <select className="form-control" value={complianceStatus} onChange={(e) => setComplianceStatus(e.target.value)}>
                  <option value="COMPLIANT">COMPLIANT (No gaps observed)</option>
                  <option value="CONCERN">CONCERN (Minor recommendation)</option>
                  <option value="NON_CONFORMANCE">NON CONFORMANCE (Gap raised)</option>
                </select>
              </div>

              {complianceStatus === 'NON_CONFORMANCE' && (
                <div className="form-group" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <label className="form-label" style={{ color: 'var(--color-text-danger)' }}>Create NCR Log Link (FMT 13 NCR Code)</label>
                  <input type="text" className="form-control" placeholder="e.g. NC-2026-0001" value={ncrCode} onChange={(e) => setNcrCode(e.target.value)} required />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Note: Links this checklist point to the standard Non-Conformance ledger.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFindingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Audit Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
