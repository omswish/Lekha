// frontend/src/components/AdministrativeRegisters.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Clipboard, FileText, Settings, Key, Book, RefreshCw, Layers } from 'lucide-react';

/**
 * AdministrativeRegisters Component: Digitizes all remaining 11 administrative formats.
 * FMT 15 (MRM), FMT 37 (Licenses), FMT 38 (Access Matrix), FMT 53 (Server Activity),
 * FMT 03 (External Docs), FMT 05 (Amendments), FMT 39 (Legislation), FMT 40 (Control Effectiveness),
 * FMT 41 (Software Eval), FMT 47 (Communication Matrix), FMT 48 (ISMS Objectives Metrics).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function AdministrativeRegisters({ token, user }) {
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [activeSubTab, setActiveSubTab] = useState('mrm');
  const [data, setData] = useState({
    mrms: [], licenses: [], matrices: [], serverActivities: [], externalDocs: [],
    amendments: [], legislations: [], controlEffectivenessList: [], evaluations: [],
    communications: [], metrics: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form modals state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dynamic Form states based on activeSubTab
  const [mrmForm, setMrmForm] = useState({ attendees: '', agenda: '', discussionPoints: '', actionItems: '' });
  const [licenseForm, setLicenseForm] = useState({ softwareName: '', licenseKey: '', totalLicenses: 10, allocatedLicenses: 0, expiryDate: '', owner: '' });
  const [matrixForm, setMatrixForm] = useState({ roleName: 'EMPLOYEE', systemName: '', readAccess: true, writeAccess: false, adminAccess: false });
  const [activityForm, setActivityForm] = useState({ activityType: '', performedBy: '', witnessName: '', remarks: '' });
  const [extDocForm, setExtDocForm] = useState({ documentTitle: '', origin: '', version: '1.0' });
  const [amendForm, setAmendForm] = useState({ formatCode: '', amendmentDetails: '' });
  const [legForm, setLegForm] = useState({ actName: '', applicableClause: '', complianceRequirement: '', status: 'COMPLIANT' });
  const [ctrlForm, setCtrlForm] = useState({ controlCode: '', controlName: '', assessmentCriteria: '', effectivenessRating: 5 });
  const [evalForm, setEvalForm] = useState({ softwareName: '', securityChecklist: '', evaluationResult: 'APPROVED' });
  const [commForm, setCommForm] = useState({ stakeholder: '', informationShared: '', channel: '', frequency: '' });
  const [metricForm, setMetricForm] = useState({ objective: '', metricName: '', targetValue: '', actualValue: '', frequency: 'Monthly' });

  // Fetch all registers
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/all-formats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await response.json();
      if (!response.ok) {
        throw new Error(d.error || 'Failed to fetch administrative registers.');
      }
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Form submit router
  const handleSubmit = async (e) => {
    e.preventDefault();
    let url = 'http://localhost:5000/api/registers';
    let body = {};

    switch (activeSubTab) {
      case 'mrm':
        url += '/management-review';
        body = mrmForm;
        break;
      case 'license':
        url += '/license';
        body = licenseForm;
        break;
      case 'matrix':
        url += '/access-matrix';
        body = matrixForm;
        break;
      case 'activity':
        url += '/server-activity';
        body = activityForm;
        break;
      case 'extdoc':
        url += '/external-doc';
        body = extDocForm;
        break;
      case 'amendment':
        url += '/amendment';
        body = amendForm;
        break;
      case 'legislation':
        url += '/legislation';
        body = legForm;
        break;
      case 'control':
        url += '/control-effectiveness';
        body = ctrlForm;
        break;
      case 'evaluation':
        url += '/software-evaluation';
        body = evalForm;
        break;
      case 'comm':
        url += '/communication-matrix';
        body = commForm;
        break;
      case 'metrics':
        url += '/isms-metrics';
        body = metricForm;
        break;
      default:
        return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchAllData();
      } else {
        const resData = await response.json();
        alert(resData.error || 'Failed to register compliance record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Administrative Registers Dashboard</h2>
          <p className="page-description">
            Unified register for all corporate ISMS governance formats (Minutes of MRM, Software Licenses, Access Matrices, Server Activities, and Objectives Metrics).
          </p>
        </div>

        {isAdminOrManager && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              // Reset appropriate form values
              setMrmForm({ attendees: '', agenda: '', discussionPoints: '', actionItems: '' });
              setLicenseForm({ softwareName: '', licenseKey: '', totalLicenses: 10, allocatedLicenses: 0, expiryDate: new Date().toISOString().split('T')[0], owner: user.email });
              setMatrixForm({ roleName: 'EMPLOYEE', systemName: '', readAccess: true, writeAccess: false, adminAccess: false });
              setActivityForm({ activityType: '', performedBy: '', witnessName: user.email, remarks: '' });
              setExtDocForm({ documentTitle: '', origin: '', version: '1.0' });
              setAmendForm({ formatCode: '', amendmentDetails: '' });
              setLegForm({ actName: '', applicableClause: '', complianceRequirement: '', status: 'COMPLIANT' });
              setCtrlForm({ controlCode: '', controlName: '', assessmentCriteria: '', effectivenessRating: 5 });
              setEvalForm({ softwareName: '', securityChecklist: '', evaluationResult: 'APPROVED' });
              setCommForm({ stakeholder: '', informationShared: '', channel: '', frequency: 'Weekly' });
              setMetricForm({ objective: '', metricName: '', targetValue: '', actualValue: '', frequency: 'Monthly' });
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Log Entry (FMT)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Subtab selection header */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button className={`btn btn-sm ${activeSubTab === 'mrm' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('mrm')}>FMT 15: Minutes of MRM</button>
        <button className={`btn btn-sm ${activeSubTab === 'license' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('license')}>FMT 37: Licenses</button>
        <button className={`btn btn-sm ${activeSubTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('matrix')}>FMT 38: Access Matrix</button>
        <button className={`btn btn-sm ${activeSubTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('activity')}>FMT 53: Server Activity</button>
        <button className={`btn btn-sm ${activeSubTab === 'extdoc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('extdoc')}>FMT 03: External Docs</button>
        <button className={`btn btn-sm ${activeSubTab === 'amendment' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('amendment')}>FMT 05: Amendment Records</button>
        <button className={`btn btn-sm ${activeSubTab === 'legislation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('legislation')}>FMT 39: Legislations</button>
        <button className={`btn btn-sm ${activeSubTab === 'control' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('control')}>FMT 40: Control Effectiveness</button>
        <button className={`btn btn-sm ${activeSubTab === 'evaluation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('evaluation')}>FMT 41: Software Evaluation</button>
        <button className={`btn btn-sm ${activeSubTab === 'comm' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('comm')}>FMT 47: Comm Matrix</button>
        <button className={`btn btn-sm ${activeSubTab === 'metrics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('metrics')}>FMT 48: ISMS Metrics</button>
      </div>

      {/* Render subtab tables */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading registers...</div>
        ) : (
          <>
            {activeSubTab === 'mrm' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Meeting Code</th>
                    <th>Attendees</th>
                    <th>Agenda</th>
                    <th>Discussion Points</th>
                    <th>Action Items</th>
                    <th>Meeting Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mrms.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.meetingCode}</td>
                      <td>{x.attendees}</td>
                      <td style={{ fontWeight: 600 }}>{x.agenda}</td>
                      <td>{x.discussionPoints}</td>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{x.actionItems}</td>
                      <td>{new Date(x.meetingDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'license' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Software Product</th>
                    <th>License Key</th>
                    <th>Assigned / Total</th>
                    <th>Owner</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.licenses.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.softwareName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{x.licenseKey}</td>
                      <td><strong>{x.allocatedLicenses}</strong> / {x.totalLicenses}</td>
                      <td>{x.owner}</td>
                      <td style={{ color: new Date(x.expiryDate) < new Date() ? 'var(--color-text-danger)' : 'inherit' }}>
                        {new Date(x.expiryDate).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'matrix' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role Group</th>
                    <th>Target System</th>
                    <th>Read Access</th>
                    <th>Write Access</th>
                    <th>Admin Access</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matrices.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.roleName}</td>
                      <td style={{ fontWeight: 600 }}>{x.systemName}</td>
                      <td>{x.readAccess ? '✔' : '✖'}</td>
                      <td>{x.writeAccess ? '✔' : '✖'}</td>
                      <td>{x.adminAccess ? '✔' : '✖'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'activity' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity Code</th>
                    <th>Activity Type</th>
                    <th>Performed By</th>
                    <th>Witness / Host</th>
                    <th>Remarks</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serverActivities.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.activityCode}</td>
                      <td style={{ fontWeight: 600 }}>{x.activityType}</td>
                      <td>{x.performedBy}</td>
                      <td>{x.witnessName}</td>
                      <td>{x.remarks}</td>
                      <td>{new Date(x.activityDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'extdoc' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Origin Entity</th>
                    <th>Received Date</th>
                    <th>Version Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.externalDocs.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.documentTitle}</td>
                      <td>{x.origin}</td>
                      <td>{new Date(x.receivedDate).toLocaleDateString('en-IN')}</td>
                      <td>Version {x.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'amendment' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Format Code Reference</th>
                    <th>Amendment details</th>
                    <th>Approved By</th>
                    <th>Date of Amendment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.amendments.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.formatCode}</td>
                      <td>{x.amendmentDetails}</td>
                      <td>{x.approvedBy}</td>
                      <td>{new Date(x.dateOfAmendment).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'legislation' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Legislation Act Name</th>
                    <th>Applicable Clause</th>
                    <th>Compliance Requirement</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.legislations.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.actName}</td>
                      <td>{x.applicableClause}</td>
                      <td>{x.complianceRequirement}</td>
                      <td>
                        <span className={`badge ${x.status === 'COMPLIANT' ? 'badge-success' : 'badge-danger'}`}>{x.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'control' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Control Code</th>
                    <th>Control Name</th>
                    <th>Assessment Criteria</th>
                    <th>Effectiveness Rating</th>
                    <th>Assessed By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.controlEffectivenessList.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.controlCode}</td>
                      <td style={{ fontWeight: 600 }}>{x.controlName}</td>
                      <td>{x.assessmentCriteria}</td>
                      <td><strong>{x.effectivenessRating} / 5</strong></td>
                      <td>{x.assessedBy}</td>
                      <td>{new Date(x.assessedDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'evaluation' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Software Evaluated</th>
                    <th>Security Checklist verified</th>
                    <th>Result Outcome</th>
                    <th>Evaluated By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evaluations.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.softwareName}</td>
                      <td>{x.securityChecklist}</td>
                      <td>
                        <span className={`badge ${x.evaluationResult === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>{x.evaluationResult}</span>
                      </td>
                      <td>{x.evaluatedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'comm' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stakeholder</th>
                    <th>Information Shared</th>
                    <th>Channel</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.communications.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.stakeholder}</td>
                      <td>{x.informationShared}</td>
                      <td>{x.channel}</td>
                      <td>{x.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'metrics' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ISMS Objective</th>
                    <th>Metric Name</th>
                    <th>Target Value</th>
                    <th>Actual Value</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.metrics.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 700 }}>{x.objective}</td>
                      <td style={{ fontWeight: 600 }}>{x.metricName}</td>
                      <td>{x.targetValue}</td>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{x.actualValue}</td>
                      <td>{x.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Dynamic Modal Entry Form */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} className="badge-internal" />
                <h3 className="modal-title">Log Entry: {activeSubTab.toUpperCase()}</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              
              {activeSubTab === 'mrm' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Attendees *</label>
                    <input type="text" className="form-control" placeholder="Names of attendees" value={mrmForm.attendees} onChange={(e) => setMrmForm({ ...mrmForm, attendees: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meeting Agenda *</label>
                    <input type="text" className="form-control" placeholder="e.g. Audit updates" value={mrmForm.agenda} onChange={(e) => setMrmForm({ ...mrmForm, agenda: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discussion Points *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={mrmForm.discussionPoints} onChange={(e) => setMrmForm({ ...mrmForm, discussionPoints: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Action Items *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={mrmForm.actionItems} onChange={(e) => setMrmForm({ ...mrmForm, actionItems: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'license' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Software Product Name *</label>
                    <input type="text" className="form-control" value={licenseForm.softwareName} onChange={(e) => setLicenseForm({ ...licenseForm, softwareName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Key *</label>
                    <input type="text" className="form-control" value={licenseForm.licenseKey} onChange={(e) => setLicenseForm({ ...licenseForm, licenseKey: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Total Licenses *</label>
                      <input type="number" className="form-control" value={licenseForm.totalLicenses} onChange={(e) => setLicenseForm({ ...licenseForm, totalLicenses: parseInt(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Allocated *</label>
                      <input type="number" className="form-control" value={licenseForm.allocatedLicenses} onChange={(e) => setLicenseForm({ ...licenseForm, allocatedLicenses: parseInt(e.target.value) })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date *</label>
                    <input type="date" className="form-control" value={licenseForm.expiryDate} onChange={(e) => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Email *</label>
                    <input type="email" className="form-control" value={licenseForm.owner} onChange={(e) => setLicenseForm({ ...licenseForm, owner: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'matrix' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Role Group Name *</label>
                    <select className="form-control" value={matrixForm.roleName} onChange={(e) => setMatrixForm({ ...matrixForm, roleName: e.target.value })}>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="ASSET_MANAGER">ASSET_MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target System *</label>
                    <input type="text" className="form-control" value={matrixForm.systemName} onChange={(e) => setMatrixForm({ ...matrixForm, systemName: e.target.value })} required />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={matrixForm.readAccess} onChange={(e) => setMatrixForm({ ...matrixForm, readAccess: e.target.checked })} /> Read</label>
                    <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={matrixForm.writeAccess} onChange={(e) => setMatrixForm({ ...matrixForm, writeAccess: e.target.checked })} /> Write</label>
                    <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={matrixForm.adminAccess} onChange={(e) => setMatrixForm({ ...matrixForm, adminAccess: e.target.checked })} /> Admin</label>
                  </div>
                </>
              )}

              {activeSubTab === 'activity' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Activity Type *</label>
                    <input type="text" className="form-control" placeholder="e.g. Server rack physical auditing" value={activityForm.activityType} onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Performed By *</label>
                    <input type="text" className="form-control" value={activityForm.performedBy} onChange={(e) => setActivityForm({ ...activityForm, performedBy: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Witness / Host Email *</label>
                    <input type="email" className="form-control" value={activityForm.witnessName} onChange={(e) => setActivityForm({ ...activityForm, witnessName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remarks *</label>
                    <input type="text" className="form-control" value={activityForm.remarks} onChange={(e) => setActivityForm({ ...activityForm, remarks: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'extdoc' && (
                <>
                  <div className="form-group">
                    <label className="form-label">External Document Title *</label>
                    <input type="text" className="form-control" value={extDocForm.documentTitle} onChange={(e) => setExtDocForm({ ...extDocForm, documentTitle: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Origin Entity *</label>
                    <input type="text" className="form-control" value={extDocForm.origin} onChange={(e) => setExtDocForm({ ...extDocForm, origin: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Version Reference *</label>
                    <input type="text" className="form-control" value={extDocForm.version} onChange={(e) => setExtDocForm({ ...extDocForm, version: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'amendment' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Format Code Reference *</label>
                    <input type="text" className="form-control" placeholder="e.g. FMT 25 Changes Request" value={amendForm.formatCode} onChange={(e) => setAmendForm({ ...amendForm, formatCode: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amendment Details *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={amendForm.amendmentDetails} onChange={(e) => setAmendForm({ ...amendForm, amendmentDetails: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'legislation' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Legislation Act Name *</label>
                    <input type="text" className="form-control" value={legForm.actName} onChange={(e) => setLegForm({ ...legForm, actName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Applicable Clause *</label>
                    <input type="text" className="form-control" value={legForm.applicableClause} onChange={(e) => setLegForm({ ...legForm, applicableClause: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compliance Requirement *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={legForm.complianceRequirement} onChange={(e) => setLegForm({ ...legForm, complianceRequirement: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status *</label>
                    <select className="form-control" value={legForm.status} onChange={(e) => setLegForm({ ...legForm, status: e.target.value })}>
                      <option value="COMPLIANT">COMPLIANT</option>
                      <option value="ACTION_REQUIRED">ACTION_REQUIRED</option>
                    </select>
                  </div>
                </>
              )}

              {activeSubTab === 'control' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Control Code Reference *</label>
                    <input type="text" className="form-control" placeholder="e.g. CTRL-EFF-0002" value={ctrlForm.controlCode} onChange={(e) => setCtrlForm({ ...ctrlForm, controlCode: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Control Name *</label>
                    <input type="text" className="form-control" value={ctrlForm.controlName} onChange={(e) => setCtrlForm({ ...ctrlForm, controlName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assessment Criteria *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={ctrlForm.assessmentCriteria} onChange={(e) => setCtrlForm({ ...ctrlForm, assessmentCriteria: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Effectiveness Rating (1 to 5) *</label>
                    <select className="form-control" value={ctrlForm.effectivenessRating} onChange={(e) => setCtrlForm({ ...ctrlForm, effectivenessRating: parseInt(e.target.value) })}>
                      <option value="5">5 (Highly Effective)</option>
                      <option value="4">4 (Effective)</option>
                      <option value="3">3 (Moderately Effective)</option>
                      <option value="2">2 (Partially Effective)</option>
                      <option value="1">1 (Ineffective)</option>
                    </select>
                  </div>
                </>
              )}

              {activeSubTab === 'evaluation' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Software Name *</label>
                    <input type="text" className="form-control" value={evalForm.softwareName} onChange={(e) => setEvalForm({ ...evalForm, softwareName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Security Checklist Description *</label>
                    <textarea className="form-control" style={{ height: '70px', resize: 'none' }} value={evalForm.securityChecklist} onChange={(e) => setEvalForm({ ...evalForm, securityChecklist: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Result Outcome *</label>
                    <select className="form-control" value={evalForm.evaluationResult} onChange={(e) => setEvalForm({ ...evalForm, evaluationResult: e.target.value })}>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </>
              )}

              {activeSubTab === 'comm' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Stakeholder Group *</label>
                    <input type="text" className="form-control" value={commForm.stakeholder} onChange={(e) => setCommForm({ ...commForm, stakeholder: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Information Shared *</label>
                    <input type="text" className="form-control" value={commForm.informationShared} onChange={(e) => setCommForm({ ...commForm, informationShared: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Channel *</label>
                    <input type="text" className="form-control" value={commForm.channel} onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency *</label>
                    <input type="text" className="form-control" value={commForm.frequency} onChange={(e) => setCommForm({ ...commForm, frequency: e.target.value })} required />
                  </div>
                </>
              )}

              {activeSubTab === 'metrics' && (
                <>
                  <div className="form-group">
                    <label className="form-label">ISMS Objective *</label>
                    <input type="text" className="form-control" value={metricForm.objective} onChange={(e) => setMetricForm({ ...metricForm, objective: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Metric Name *</label>
                    <input type="text" className="form-control" value={metricForm.metricName} onChange={(e) => setMetricForm({ ...metricForm, metricName: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Target Value *</label>
                      <input type="text" className="form-control" value={metricForm.targetValue} onChange={(e) => setMetricForm({ ...metricForm, targetValue: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Actual Value *</label>
                      <input type="text" className="form-control" value={metricForm.actualValue} onChange={(e) => setMetricForm({ ...metricForm, actualValue: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency *</label>
                    <input type="text" className="form-control" value={metricForm.frequency} onChange={(e) => setMetricForm({ ...metricForm, frequency: e.target.value })} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
