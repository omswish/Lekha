// frontend/src/components/BcpRegisters.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, Activity, ClipboardCheck, Clock } from 'lucide-react';

/**
 * BcpRegisters Component: Digitizes Business Continuity Planning (BCP / DR) procedures (PRO 05, FMT 29, FMT 30).
 * Handles BCP Schedules (FMT 29) and Disaster Recovery switchover testing logs (FMT 30).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function BcpRegisters({ token, user }) {
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 29 BCP Schedule)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [systemName, setSystemName] = useState('');
  const [scenario, setScenario] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [rto, setRto] = useState('4 Hours');
  const [rpo, setRpo] = useState('24 Hours');
  const [coordinator, setCoordinator] = useState('');

  // Testing Form states (FMT 30 BCP Testing)
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedBcp, setSelectedBcp] = useState(null);
  const [actualRto, setActualRto] = useState(60);
  const [dataLoss, setDataLoss] = useState('No data loss observed.');
  const [criteriaMet, setCriteriaMet] = useState(true);
  const [testResult, setTestResult] = useState('SUCCESS');
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch BCP register (FMT 29)
  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/bcp', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load BCP register.');
      }
      setSchedules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Submit BCP drill plan (FMT 29)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!systemName || !scenario || !scheduledDate || !rto || !rpo || !coordinator) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/bcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ systemName, scenario, scheduledDate, rto, rpo, coordinator })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchSchedules();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to schedule BCP drill.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Test results (FMT 30)
  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!actualRto || !dataLoss || !testResult || !participants || !notes) {
      alert('Please fill out all testing checklist fields.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/registers/bcp/${selectedBcp.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actualRtoMinutes: actualRto,
          dataLossObserved: dataLoss,
          successCriteriaMet: criteriaMet,
          testResult,
          participants,
          notes
        })
      });
      if (response.ok) {
        setShowTestModal(false);
        fetchSchedules();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log BCP drill results.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">BCP & DR Drill Registry</h2>
          <p className="page-description">
            PRO 05: Business Continuity & Disaster Recovery switchover testing logs (FMT 29 BCP Schedule & FMT 30 BCP Testing).
          </p>
        </div>

        {isAdminOrManager && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSystemName(''); setScenario(''); setScheduledDate(new Date().toISOString().split('T')[0]); 
              setRto('4 Hours'); setRpo('24 Hours'); setCoordinator(user.email);
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Schedule BCP Drill (FMT 29)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Schedules list */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && schedules.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading BCP register...</div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No BCP drills logged in the registry.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>BCP Code</th>
                <th>System Target & Scenario</th>
                <th>Target Goals (RTO / RPO)</th>
                <th>Coordinator</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Drill Test Report (FMT 30)</th>
                {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 700 }}>{b.bcpCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.systemName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Scenario: {b.scenario}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>RTO Target: <strong>{b.rto}</strong></div>
                    <div>RPO Target: <strong>{b.rpo}</strong></div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{b.coordinator}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(b.scheduledDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className={`badge ${b.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.testRecords && b.testRecords.length > 0 ? (
                      b.testRecords.map((t) => (
                        <div key={t.id} style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={`badge ${t.testResult === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                              Drill {t.testResult}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(t.testDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          <div style={{ marginTop: '0.35rem' }}>Actual RTO: <strong>{t.actualRtoMinutes} mins</strong></div>
                          <div>Loss Observed: "{t.dataLossObserved}"</div>
                          <div style={{ fontStyle: 'italic', marginTop: '0.15rem' }}>Notes: {t.notes}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem' }}>
                            Tested By: {t.testedBy} | Team: {t.participants}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Untested drill schedule</span>
                    )}
                  </td>
                  {isAdminOrManager && (
                    <td style={{ textAlign: 'right' }}>
                      {b.status !== 'COMPLETED' && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                          onClick={() => {
                            setSelectedBcp(b); setActualRto(60); setDataLoss('No data loss observed.');
                            setCriteriaMet(true); setTestResult('SUCCESS'); setParticipants(''); setNotes('');
                            setShowTestModal(true);
                          }}
                        >
                          Log Test Report (FMT 30)
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Drill Modal (FMT 29) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} className="badge-internal" />
                <h3 className="modal-title">Schedule BCP Drill (FMT 29)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Target System *</label>
                <input type="text" className="form-control" placeholder="e.g. ERP Primary Application Node" value={systemName} onChange={(e) => setSystemName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Drill Scenario description *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="e.g. Complete loss of primary ISP fiber links. Switchover to backup cellular gateway." value={scenario} onChange={(e) => setScenario(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">RTO Target Goal *</label>
                  <input type="text" className="form-control" value={rto} onChange={(e) => setRto(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">RPO Target Goal *</label>
                  <input type="text" className="form-control" value={rpo} onChange={(e) => setRpo(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Scheduled Date *</label>
                  <input type="date" className="form-control" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Coordinator Email *</label>
                  <input type="email" className="form-control" value={coordinator} onChange={(e) => setCoordinator(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule BCP Drill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Drill Test Report (FMT 30) */}
      {showTestModal && selectedBcp && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCheck size={20} className="badge-internal" />
                <h3 className="modal-title">Log BCP Testing Report (FMT 30)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowTestModal(false)}>×</button>
            </div>

            <form onSubmit={handleTestSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Drill: </strong>{selectedBcp.bcpCode}</div>
                <div><strong>System: </strong>{selectedBcp.systemName}</div>
                <div><strong>Scenario: </strong>"{selectedBcp.scenario}"</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Actual RTO Met (Minutes) *</label>
                  <input type="number" className="form-control" value={actualRto} onChange={(e) => setActualRto(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Drill Outcome *</label>
                  <select className="form-control" value={testResult} onChange={(e) => setTestResult(e.target.value)}>
                    <option value="SUCCESS">SUCCESS (Goals Met)</option>
                    <option value="FAILED">FAILED (Goals Missed)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data Loss Observed *</label>
                <input type="text" className="form-control" placeholder="e.g. No data loss observed. Mirror replication successfully recovery." value={dataLoss} onChange={(e) => setDataLoss(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Drill Team Participants *</label>
                <input type="text" className="form-control" placeholder="e.g. ramanath.satapathy@adityabirla.com, external_support@cisco.com" value={participants} onChange={(e) => setParticipants(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Remarks / Gaps observed *</label>
                <textarea className="form-control" style={{ height: '70px', resize: 'none' }} placeholder="What lessons were learned during switchover recovery?" value={notes} onChange={(e) => setNotes(e.target.value)} required />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={criteriaMet} onChange={(e) => setCriteriaMet(e.target.checked)} />
                  DR Drill Success Criteria Met
                </label>
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
