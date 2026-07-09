// frontend/src/components/IsmsRegisters.jsx

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, CheckSquare, PlusCircle, Calendar, 
  RefreshCw, Lock, AlertTriangle, Key, Users, Database, FileDigit 
} from 'lucide-react';

/**
 * IsmsRegisters Component: Consolidates six core digitized operational registers.
 * Digitizes:
 * 1. Risk Register (FMT 06)
 * 2. Access Request logs (FMT 08 / FMT 32)
 * 3. Security Incidents (FMT 20 / FMT 21)
 * 4. Visitor logs (FMT 22 / FMT 23)
 * 5. Backup registers (FMT 34 / FMT 35 / FMT 36)
 * 6. Patch status reports (FMT 26)
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function IsmsRegisters({ token, user }) {
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  // Sub-tabs router
  const [subTab, setSubTab] = useState('risks');

  // Unified states
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal forms trigger
  const [showModal, setShowModal] = useState(false);
  
  // Specific action target
  const [actionTarget, setActionTarget] = useState(null);
  const [actionModal, setActionModal] = useState(false);

  // ==========================================
  // SPECIFIC REGISTER INPUT STATES
  // ==========================================
  
  // A. Risk Assessment states (FMT 06)
  const [riskAsset, setRiskAsset] = useState('');
  const [riskThreat, setRiskThreat] = useState('');
  const [riskVuln, setRiskVuln] = useState('');
  const [riskImpact, setRiskImpact] = useState(3);
  const [riskLike, setRiskLike] = useState(3);
  const [riskStrategy, setRiskStrategy] = useState('MITIGATE');
  const [riskPlan, setRiskPlan] = useState('');
  const [riskTarget, setRiskTarget] = useState('');
  const [riskOwner, setRiskOwner] = useState('');

  // B. Access Request states (FMT 08)
  const [arSystem, setArSystem] = useState('');
  const [arType, setArType] = useState('READ');
  const [arJustify, setArJustify] = useState('');
  // Approval states
  const [arStatus, setArStatus] = useState('APPROVED');
  const [arActionTaken, setArActionTaken] = useState('USER_ID_CREATED');

  // C. Security Incident states (FMT 20)
  const [incDate, setIncDate] = useState('');
  const [incLoc, setIncLoc] = useState('');
  const [incDesc, setIncDesc] = useState('');
  const [incSev, setIncSev] = useState('MINOR');
  const [incContain, setIncContain] = useState('');
  // Incident Closure (FMT 21)
  const [incRoot, setIncRoot] = useState('');
  const [incCorrect, setIncCorrect] = useState('');

  // D. Visitor Log states (FMT 22)
  const [visName, setVisName] = useState('');
  const [visOrg, setVisOrg] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visArea, setVisArea] = useState('SERVER_ROOM');
  const [visBadge, setVisBadge] = useState('');

  // E. Backup Log states (FMT 36)
  const [bkSystem, setBkSystem] = useState('');
  const [bkType, setBkType] = useState('FULL');
  const [bkStatus, setBkStatus] = useState('SUCCESS');
  const [bkLoc, setBkLoc] = useState('');
  // Restoration verification (FMT 35)
  const [restStatus, setRestStatus] = useState('SUCCESS');
  const [restNotes, setRestNotes] = useState('');

  // F. Patch Status states (FMT 26)
  const [patchServer, setPatchServer] = useState('');
  const [patchId, setPatchId] = useState('');
  const [patchCrit, setPatchCrit] = useState('HIGH');
  const [patchStatus, setPatchStatus] = useState('INSTALLED');
  const [patchPlan, setPatchPlan] = useState('');

  // ==========================================
  // DATA OPERATIONS
  // ==========================================

  // Fetch register records based on active sub-tab
  const fetchRegisterData = async () => {
    setLoading(true);
    setError('');
    setData([]);
    try {
      let endpoint = '';
      switch (subTab) {
        case 'risks': endpoint = '/risks'; break;
        case 'access': endpoint = '/access-requests'; break;
        case 'incidents': endpoint = '/incidents'; break;
        case 'visitors': endpoint = '/visitors'; break;
        case 'backups': endpoint = '/backups'; break;
        case 'patches': endpoint = '/patches'; break;
        default: endpoint = '/risks';
      }

      const response = await fetch(`http://localhost:5000/api/registers${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to retrieve register records.');
      }
      setData(resData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisterData();
    setShowModal(false);
    setActionModal(false);
    setActionTarget(null);
  }, [subTab]);

  // Open creation forms
  const handleOpenCreateModal = () => {
    setError('');
    // Defaults reset
    const dateToday = new Date().toISOString().split('T')[0];
    setRiskAsset(''); setRiskThreat(''); setRiskVuln(''); setRiskImpact(3); setRiskLike(3); setRiskPlan(''); setRiskTarget(dateToday); setRiskOwner(user.email);
    setArSystem(''); setArType('READ'); setArJustify('');
    setIncDate(dateToday); setIncLoc(''); setIncDesc(''); setIncSev('MINOR'); setIncContain('');
    setVisName(''); setVisOrg(''); setVisPurpose(''); setVisArea('SERVER_ROOM'); setVisBadge('');
    setBkSystem(''); setBkType('FULL'); setBkStatus('SUCCESS'); setBkLoc('');
    setPatchServer(''); setPatchId(''); setPatchCrit('HIGH'); setPatchStatus('INSTALLED'); setPatchPlan('');

    setShowModal(true);
  };

  // Submit registers entries
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let endpoint = '';
    let payload = {};

    // Build payload according to active sub-tab
    switch (subTab) {
      case 'risks':
        endpoint = '/risks';
        payload = { assetOrProcess: riskAsset, threat: riskThreat, vulnerability: riskVuln, impactScore: riskImpact, likelihoodScore: riskLike, treatmentStrategy: riskStrategy, treatmentPlan: riskPlan, targetDate: riskTarget, owner: riskOwner };
        break;
      case 'access':
        endpoint = '/access-requests';
        payload = { systemName: arSystem, accessType: arType, justification: arJustify };
        break;
      case 'incidents':
        endpoint = '/incidents';
        payload = { dateOccurred: incDate, location: incLoc, description: incDesc, severity: incSev, containmentAction: incContain };
        break;
      case 'visitors':
        endpoint = '/visitors';
        payload = { visitorName: visName, organization: visOrg, purpose: visPurpose, areaAccessed: visArea, badgeNumber: visBadge };
        break;
      case 'backups':
        endpoint = '/backups';
        payload = { systemName: bkSystem, backupType: bkType, status: bkStatus, storageLocation: bkLoc };
        break;
      case 'patches':
        endpoint = '/patches';
        payload = { serverName: patchServer, patchId, criticality: patchCrit, status: patchStatus, remediationPlan: patchPlan };
        break;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/registers${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save register entry.');
      }
      fetchRegisterData();
      setShowModal(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Trigger Sign-out for Visitors
  const handleVisitorSignout = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/registers/visitors/${id}/signout`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRegisterData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to sign out visitor.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Actions Modals (Approval, Closures, Recovery tests)
  const handleOpenAction = (target) => {
    setActionTarget(target);
    setArStatus('APPROVED');
    setArActionTaken('USER_ID_CREATED');
    setIncRoot('');
    setIncCorrect('');
    setRestStatus('SUCCESS');
    setRestNotes('');
    setActionModal(true);
  };

  // Submit action validations
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    let url = '';
    let payload = {};

    switch (subTab) {
      case 'access':
        url = `/access-requests/${actionTarget.id}/approve`;
        payload = { status: arStatus, actionTaken: arActionTaken };
        break;
      case 'incidents':
        url = `/incidents/${actionTarget.id}/close`;
        payload = { rootCause: incRoot, correctiveAction: incCorrect };
        break;
      case 'backups':
        url = `/backups/${actionTarget.id}/test`;
        payload = { restorationStatus: restStatus, restorationNotes: restNotes };
        break;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/registers${url}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to log verification action.');
      }
      fetchRegisterData();
      setActionModal(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Sub tabs header */}
      <div className="tabs">
        <button className={`tab-btn ${subTab === 'risks' ? 'active' : ''}`} onClick={() => setSubTab('risks')}>
          Risks & Treatment (FMT 06)
        </button>
        <button className={`tab-btn ${subTab === 'access' ? 'active' : ''}`} onClick={() => setSubTab('access')}>
          Access Requests (FMT 08/32)
        </button>
        <button className={`tab-btn ${subTab === 'incidents' ? 'active' : ''}`} onClick={() => setSubTab('incidents')}>
          Security Incidents (FMT 20)
        </button>
        <button className={`tab-btn ${subTab === 'visitors' ? 'active' : ''}`} onClick={() => setSubTab('visitors')}>
          Visitor Register (FMT 22)
        </button>
        <button className={`tab-btn ${subTab === 'backups' ? 'active' : ''}`} onClick={() => setSubTab('backups')}>
          Backup Logs (FMT 35/36)
        </button>
        <button className={`tab-btn ${subTab === 'patches' ? 'active' : ''}`} onClick={() => setSubTab('patches')}>
          Patch Audits (FMT 26)
        </button>
      </div>

      {/* Page Header Detail */}
      <div className="page-header" style={{ marginTop: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>
            Digitized {subTab} Log Ledger
          </h3>
          <p className="page-description">
            {subTab === 'risks' && 'PRO 07: Risk & Opportunity Evaluation. Tracks risk mapping scores and treatment controls (FMT 06).'}
            {subTab === 'access' && 'PRO 21: Identity Access management. Logs permission request forms (FMT 08) and approvals tracker (FMT 32).'}
            {subTab === 'incidents' && 'PRO 18: Information Incident Response ledger. Logs anomalies and closure evaluation (FMT 20/21).'}
            {subTab === 'visitors' && 'PRO 11: Physical security logs of datacenter server room entries (FMT 22/23).'}
            {subTab === 'backups' && 'PRO 05: Data Backup registers and recovery restoration testing checks (FMT 34/35/36).'}
            {subTab === 'patches' && 'PRO 20: Technical vulnerability systems update patching reports (FMT 26).'}
          </p>
        </div>

        {/* Action checks */}
        {(subTab !== 'access' || user.role !== 'EMPLOYEE') && (subTab !== 'visitors' || isAdminOrManager) && (
          <button className="btn btn-primary btn-sm" onClick={handleOpenCreateModal} disabled={loading}>
            <PlusCircle size={14} />
            Add Register Entry
          </button>
        )}
      </div>

      {/* Register List */}
      <div className="table-container" style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Retrieving logs...</div>
        ) : error ? (
          <div className="alert alert-danger" style={{ margin: '1rem' }}>
            <ShieldAlert size={20} />
            <div>{error}</div>
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No digitized logs registered.</div>
        ) : (
          <table className="data-table">
            
            {/* Risks headers & rendering */}
            {subTab === 'risks' && (
              <>
                <thead>
                  <tr>
                    <th>Risk Code</th>
                    <th>Asset / Process</th>
                    <th>Threat & Vulnerability</th>
                    <th>Risk Score</th>
                    <th>Strategy</th>
                    <th>Treatment Plan</th>
                    <th>Target Date</th>
                    <th>Owner</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.riskCode}</td>
                      <td style={{ fontWeight: 600 }}>{r.assetOrProcess}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>Threat: {r.threat}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Vuln: {r.vulnerability}</div>
                      </td>
                      <td>
                        <span className={`badge ${r.riskScore >= 12 ? 'badge-danger' : r.riskScore >= 6 ? 'badge-warning' : 'badge-success'}`}>
                          {r.riskScore} (Imp: {r.impactScore} * Lkl: {r.likelihoodScore})
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.treatmentStrategy}</td>
                      <td style={{ fontSize: '0.85rem' }}>{r.treatmentPlan}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(r.targetDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontSize: '0.8rem' }}>{r.owner}</td>
                      <td>
                        <span className={`badge ${r.status === 'MITIGATED' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Access Requests */}
            {subTab === 'access' && (
              <>
                <thead>
                  <tr>
                    <th>Request Code</th>
                    <th>Requester</th>
                    <th>System Name</th>
                    <th>Access Type</th>
                    <th>Justification</th>
                    <th>Status</th>
                    <th>Approver Action</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((ar) => (
                    <tr key={ar.id}>
                      <td style={{ fontWeight: 700 }}>{ar.requestCode}</td>
                      <td>{ar.requestedBy}</td>
                      <td style={{ fontWeight: 600 }}>{ar.systemName}</td>
                      <td><span className="badge badge-internal">{ar.accessType}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{ar.justification}</td>
                      <td>
                        <span className={`badge ${ar.status === 'APPROVED' ? 'badge-success' : ar.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {ar.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {ar.approvalDate ? (
                          <div>
                            <strong>{ar.actionTaken}</strong>
                            <div style={{ fontSize: '0.7rem' }}>By: {ar.approvedBy} on {new Date(ar.approvalDate).toLocaleDateString('en-IN')}</div>
                          </div>
                        ) : 'Pending'}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          {ar.status === 'PENDING' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenAction(ar)}>
                              Action
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Incidents */}
            {subTab === 'incidents' && (
              <>
                <thead>
                  <tr>
                    <th>Incident Code</th>
                    <th>Date Occurred</th>
                    <th>Location</th>
                    <th>Gap Description</th>
                    <th>Severity</th>
                    <th>Containment Action</th>
                    <th>FMT 21 Evaluation (CAR / Root Cause)</th>
                    <th>Status</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((inc) => (
                    <tr key={inc.id}>
                      <td style={{ fontWeight: 700 }}>{inc.incidentCode}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(inc.dateOccurred).toLocaleDateString('en-IN')}</td>
                      <td>{inc.location}</td>
                      <td>{inc.description}</td>
                      <td>
                        <span className={`badge ${inc.severity === 'CRITICAL' ? 'badge-danger' : inc.severity === 'MAJOR' ? 'badge-warning' : 'badge-success'}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{inc.containmentAction}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {inc.status === 'CLOSED' ? (
                          <div>
                            <div><strong>Cause: </strong>{inc.rootCause}</div>
                            <div style={{ fontStyle: 'italic' }}>CAR: {inc.correctiveAction}</div>
                            <div style={{ fontSize: '0.7rem' }}>Closed By: {inc.closedBy}</div>
                          </div>
                        ) : 'Awaiting DPO Evaluation'}
                      </td>
                      <td>
                        <span className={`badge ${inc.status === 'CLOSED' ? 'badge-success' : 'badge-danger'}`}>{inc.status}</span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          {inc.status === 'OPEN' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenAction(inc)}>
                              Evaluate
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Visitors */}
            {subTab === 'visitors' && (
              <>
                <thead>
                  <tr>
                    <th>Visitor Name</th>
                    <th>Organization</th>
                    <th>Purpose</th>
                    <th>Area Accessed</th>
                    <th>Badge #</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Escorted By</th>
                    {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{v.visitorName}</td>
                      <td>{v.organization}</td>
                      <td style={{ fontSize: '0.85rem' }}>{v.purpose}</td>
                      <td><span className="badge badge-internal">{v.areaAccessed}</span></td>
                      <td style={{ fontFamily: 'monospace' }}>{v.badgeNumber || 'N/A'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(v.timeIn).toLocaleTimeString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {v.timeOut ? new Date(v.timeOut).toLocaleTimeString() : <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>Inside</span>}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{v.escortedBy}</td>
                      {isAdminOrManager && (
                        <td style={{ textAlign: 'right' }}>
                          {!v.timeOut && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleVisitorSignout(v.id)}>
                              Sign Out
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Backups */}
            {subTab === 'backups' && (
              <>
                <thead>
                  <tr>
                    <th>System Name</th>
                    <th>Backup Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Storage Location</th>
                    <th>Restoration Tested (FMT 35)</th>
                    <th>Performed By</th>
                    {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.systemName}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(b.backupDate).toLocaleString()}</td>
                      <td><span className="badge badge-internal">{b.backupType}</span></td>
                      <td>
                        <span className={`badge ${b.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{b.status}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{b.storageLocation}</td>
                      <td>
                        {b.restorationTested ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <span className="badge badge-success">Tested Success</span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>CAR Notes: "{b.restorationNotes}"</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>Untested</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{b.performedBy}</td>
                      {isAdminOrManager && (
                        <td style={{ textAlign: 'right' }}>
                          {!b.restorationTested && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenAction(b)}>
                              Test Recovery
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Patches */}
            {subTab === 'patches' && (
              <>
                <thead>
                  <tr>
                    <th>Server Name</th>
                    <th>Patch ID Reference</th>
                    <th>Criticality</th>
                    <th>Audit Date</th>
                    <th>Status</th>
                    <th>Checked By</th>
                    <th>Remediation Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.serverName}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.patchId}</td>
                      <td>
                        <span className={`badge ${p.criticality === 'CRITICAL' ? 'badge-danger' : p.criticality === 'HIGH' ? 'badge-warning' : 'badge-internal'}`}>
                          {p.criticality}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(p.auditDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${p.status === 'INSTALLED' ? 'badge-success' : 'badge-danger'}`}>{p.status}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{p.checkedBy}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{p.remediationPlan || 'None required'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

          </table>
        )}
      </div>

      {/* Creation Modal Forms */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Digitize operational entry</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              
              {/* Risk assessed form (FMT 06) */}
              {subTab === 'risks' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Asset or Core Process *</label>
                    <input type="text" className="form-control" placeholder="e.g. Server Room Air Conditioning" value={riskAsset} onChange={(e) => setRiskAsset(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Security Threat *</label>
                    <input type="text" className="form-control" placeholder="e.g. High temperature leading to server shutdowns" value={riskThreat} onChange={(e) => setRiskThreat(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Vulnerability *</label>
                    <input type="text" className="form-control" placeholder="e.g. Single chiller unit lacking redundancy backup" value={riskVuln} onChange={(e) => setRiskVuln(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Impact Rating (1-5) *</label>
                      <input type="number" min="1" max="5" className="form-control" value={riskImpact} onChange={(e) => setRiskImpact(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Likelihood Rating (1-5) *</label>
                      <input type="number" min="1" max="5" className="form-control" value={riskLike} onChange={(e) => setRiskLike(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Treatment Strategy *</label>
                    <select className="form-control" value={riskStrategy} onChange={(e) => setRiskStrategy(e.target.value)}>
                      <option value="MITIGATE">MITIGATE (Implement controls)</option>
                      <option value="ACCEPT">ACCEPT (Business sign-off)</option>
                      <option value="AVOID">AVOID (Change process)</option>
                      <option value="TRANSFER">TRANSFER (Insurance/Outsource)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Control Treatment Plan</label>
                    <textarea className="form-control" style={{ height: '60px', resize: 'none' }} placeholder="Detail mitigation steps to implement..." value={riskPlan} onChange={(e) => setRiskPlan(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Completion Date *</label>
                    <input type="date" className="form-control" value={riskTarget} onChange={(e) => setRiskTarget(e.target.value)} required />
                  </div>
                </>
              )}

              {/* Access Request form (FMT 08) */}
              {subTab === 'access' && (
                <>
                  <div className="form-group">
                    <label className="form-label">System or Resource Requested *</label>
                    <input type="text" className="form-control" placeholder="e.g. SV-DELL-998877 Server SSH access" value={arSystem} onChange={(e) => setArSystem(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Access Permissions Level *</label>
                    <select className="form-control" value={arType} onChange={(e) => setArType(e.target.value)}>
                      <option value="READ">READ (View Only)</option>
                      <option value="WRITE">WRITE (Edit Permissions)</option>
                      <option value="ADMIN">ADMIN (Full Administrative Control)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Justification *</label>
                    <textarea className="form-control" style={{ height: '80px', resize: 'none' }} placeholder="Why is this access required for your operations?" value={arJustify} onChange={(e) => setArJustify(e.target.value)} required />
                  </div>
                </>
              )}

              {/* Security Incident Form (FMT 20) */}
              {subTab === 'incidents' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Date/Time Occurred *</label>
                      <input type="date" className="form-control" value={incDate} onChange={(e) => setIncDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location *</label>
                      <input type="text" className="form-control" placeholder="e.g. Data Center Rack 12" value={incLoc} onChange={(e) => setIncLoc(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gap Description *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="Detail security anomaly detected..." value={incDesc} onChange={(e) => setIncDesc(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Severity level *</label>
                    <select className="form-control" value={incSev} onChange={(e) => setIncSev(e.target.value)}>
                      <option value="MINOR">MINOR (Low operation impact)</option>
                      <option value="MAJOR">MAJOR (Disruptive anomalies)</option>
                      <option value="CRITICAL">CRITICAL (Active data breach risks)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Immediate Containment Action *</label>
                    <textarea className="form-control" style={{ height: '65px', resize: 'none' }} placeholder="What quick steps were taken to limit damage?" value={incContain} onChange={(e) => setIncContain(e.target.value)} required />
                  </div>
                </>
              )}

              {/* Visitor Log (FMT 22) */}
              {subTab === 'visitors' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Visitor Full Name *</label>
                      <input type="text" className="form-control" placeholder="e.g. Rahul Sen" value={visName} onChange={(e) => setVisName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Organization *</label>
                      <input type="text" className="form-control" placeholder="e.g. Cisco India Support" value={visOrg} onChange={(e) => setVisOrg(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purpose of entry *</label>
                    <input type="text" className="form-control" placeholder="e.g. Fiber line splicing diagnostics" value={visPurpose} onChange={(e) => setVisPurpose(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Area Accessed *</label>
                      <select className="form-control" value={visArea} onChange={(e) => setVisArea(e.target.value)}>
                        <option value="SERVER_ROOM">SERVER_ROOM (Access restricted)</option>
                        <option value="OFFICE_FLOOR">OFFICE_FLOOR (General Area)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Proximity Badge Number</label>
                      <input type="text" className="form-control" placeholder="e.g. BADGE-44" value={visBadge} onChange={(e) => setVisBadge(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Backup register (FMT 36) */}
              {subTab === 'backups' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Target System *</label>
                    <input type="text" className="form-control" placeholder="e.g. active_directory_master_node" value={bkSystem} onChange={(e) => setBkSystem(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Backup Type *</label>
                      <select className="form-control" value={bkType} onChange={(e) => setBkType(e.target.value)}>
                        <option value="FULL">FULL Backup</option>
                        <option value="DIFFERENTIAL">DIFFERENTIAL Backup</option>
                        <option value="INCREMENTAL">INCREMENTAL Backup</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Backup Status *</label>
                      <select className="form-control" value={bkStatus} onChange={(e) => setBkStatus(e.target.value)}>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="FAILED">FAILED</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Storage Location Partition *</label>
                    <input type="text" className="form-control" placeholder="e.g. Local NAS, Vault storage" value={bkLoc} onChange={(e) => setBkLoc(e.target.value)} required />
                  </div>
                </>
              )}

              {/* Patching log (FMT 26) */}
              {subTab === 'patches' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Server / Network Target *</label>
                      <input type="text" className="form-control" placeholder="e.g. HQ Web edge server" value={patchServer} onChange={(e) => setPatchServer(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Patch ID Reference *</label>
                      <input type="text" className="form-control" placeholder="e.g. KB5033421" value={patchId} onChange={(e) => setPatchId(e.target.value)} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Patch Criticality *</label>
                      <select className="form-control" value={patchCrit} onChange={(e) => setPatchCrit(e.target.value)}>
                        <option value="CRITICAL">CRITICAL (Zero-day safety)</option>
                        <option value="HIGH">HIGH (Severe vulnerability)</option>
                        <option value="MEDIUM">MEDIUM (General update)</option>
                        <option value="LOW">LOW (Optimizations)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Installation Status *</label>
                      <select className="form-control" value={patchStatus} onChange={(e) => setPatchStatus(e.target.value)}>
                        <option value="INSTALLED">INSTALLED (All checks passed)</option>
                        <option value="PENDING">PENDING (Awaiting downtime window)</option>
                        <option value="REJECTED">REJECTED (Incompatible kernel)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remediation / Downtime Strategy</label>
                    <textarea className="form-control" style={{ height: '60px', resize: 'none' }} placeholder="If pending/rejected, outline the security plan..." value={patchPlan} onChange={(e) => setPatchPlan(e.target.value)} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Validation / Actions Modal */}
      {actionModal && actionTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Log Verification Audit</h3>
              <button className="modal-close" onClick={() => setActionModal(false)}>×</button>
            </div>

            <form onSubmit={handleActionSubmit}>
              
              {/* Access Approval action (FMT 32) */}
              {subTab === 'access' && (
                <>
                  <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div><strong>Request Code: </strong>{actionTarget.requestCode}</div>
                    <div><strong>System requested: </strong>{actionTarget.systemName}</div>
                    <div><strong>Justification: </strong>"{actionTarget.justification}"</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Authorization Action *</label>
                    <select className="form-control" value={arStatus} onChange={(e) => setArStatus(e.target.value)}>
                      <option value="APPROVED">APPROVED (Grant Access)</option>
                      <option value="REJECTED">REJECTED (Deny Access)</option>
                    </select>
                  </div>

                  {arStatus === 'APPROVED' && (
                    <div className="form-group">
                      <label className="form-label">FMT 32: Action Taken Log *</label>
                      <select className="form-control" value={arActionTaken} onChange={(e) => setArActionTaken(e.target.value)}>
                        <option value="USER_ID_CREATED">USER_ID_CREATED</option>
                        <option value="PERMISSIONS_UPDATED">PERMISSIONS_UPDATED</option>
                        <option value="ACCESS_CARD_ACTIVATED">ACCESS_CARD_ACTIVATED</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Incident closure evaluation (FMT 21) */}
              {subTab === 'incidents' && (
                <>
                  <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div><strong>Incident: </strong>{actionTarget.incidentCode}</div>
                    <div><strong>Description: </strong>"{actionTarget.description}"</div>
                    <div><strong>Immediate Action Taken: </strong>{actionTarget.containmentAction}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Root Cause Evaluation *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="Evaluate how standard security controls failed..." value={incRoot} onChange={(e) => setIncRoot(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Corrective Action Request (CAR) *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="Detail long term plan to prevent repeats..." value={incCorrect} onChange={(e) => setIncCorrect(e.target.value)} required />
                  </div>
                </>
              )}

              {/* Backup restoration recovery testing (FMT 35) */}
              {subTab === 'backups' && (
                <>
                  <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div><strong>System: </strong>{actionTarget.systemName}</div>
                    <div><strong>Backup date: </strong>{new Date(actionTarget.backupDate).toLocaleDateString()}</div>
                    <div><strong>Storage Location: </strong>{actionTarget.storageLocation}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Restoration Test Outcome *</label>
                    <select className="form-control" value={restStatus} onChange={(e) => setRestStatus(e.target.value)}>
                      <option value="SUCCESS">SUCCESS (All files recovered and validated)</option>
                      <option value="FAILED">FAILED (Database partition corrupted/inaccessible)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">FMT 35 Restoration Checklist Remarks *</label>
                    <textarea className="form-control" style={{ height: '80px', resize: 'none' }} placeholder="Record restoration notes, read speeds, or verification remarks..." value={restNotes} onChange={(e) => setRestNotes(e.target.value)} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
