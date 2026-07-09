// frontend/src/components/NonConformances.jsx

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, CheckSquare, PlusCircle, Calendar, RefreshCw } from 'lucide-react';

/**
 * NonConformances Component: Logs and tracks deviations from ISMS standards (PRO 03).
 * 
 * Maps directly to FMT 13 (Summary of Non Conforming Report) and FMT 14 (Corrective Action Request).
 * Allows administrators to log minor/major gaps, assign target dates, link tasks,
 * and track corrective actions through to verified closure.
 * 
 * @param {Object} props
 * @param {string} props.token - Authorization JWT.
 * @param {string} props.role - User permissions role.
 */
export default function NonConformances({ token, role }) {
  const isAdmin = role === 'ADMIN';
  const isAdminOrManager = role === 'ADMIN' || role === 'ASSET_MANAGER';

  // Data storage
  const [ncList, setNcList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Log Form states
  const [showLogModal, setShowLogModal] = useState(false);
  const [source, setSource] = useState('INTERNAL_AUDIT');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MINOR');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [targetClosureDate, setTargetClosureDate] = useState('');
  const [taskId, setTaskId] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch Non-Conformances and tasks dropdown
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Non-Conformances
      const ncRes = await fetch('http://localhost:5000/api/tasks/nonconformances/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ncData = await ncRes.json();
      if (ncRes.ok) {
        setNcList(ncData);
      } else {
        throw new Error(ncData.error || 'Failed to retrieve Non-Conformances.');
      }

      // 2. Fetch Tasks list for form link dropdown
      if (isAdminOrManager) {
        const tasksRes = await fetch('http://localhost:5000/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasksData = await tasksRes.json();
        if (tasksRes.ok) {
          setTasks(tasksData);
        }
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

  // Open Log Modal and reset states
  const handleOpenLog = () => {
    setSource('INTERNAL_AUDIT');
    setDescription('');
    setSeverity('MINOR');
    setCorrectiveAction('');
    // Set target date default to 7 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    setTargetClosureDate(targetDate.toISOString().split('T')[0]);
    setTaskId('');
    setFormError('');
    setFormSuccess('');
    setShowLogModal(true);
  };

  // Submit Non-Conformance log
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!description || !targetClosureDate) {
      setFormError('Description and target closure dates are required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/tasks/nonconformances/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source,
          description,
          severity,
          correctiveAction,
          targetClosureDate,
          taskId: taskId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to log Non-Conformance.');
      }

      setFormSuccess('Non-Conformance registered and NC code generated!');
      fetchData();
      setTimeout(() => {
        setShowLogModal(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      setFormError(err.message);
    }
  };

  // Close Non-Conformance (Admin only verification step)
  const handleCloseNc = async (id, code) => {
    if (!window.confirm(`Confirm that corrective actions for deviation ${code} have been verified, and close this record?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/tasks/nonconformances/${id}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to close Non-Conformance.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Non-Conformance & Corrective Actions Ledger</h2>
          <p className="page-description">
            ISMS Gaps tracking log documenting standard compliance deviations and corrective closures (PRO 03 / FMT 13).
          </p>
        </div>

        {isAdminOrManager && (
          <button className="btn btn-primary btn-sm" onClick={handleOpenLog}>
            <PlusCircle size={14} />
            Log Non-Conformance
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="table-container">
        {loading && ncList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Retrieving ledger...
          </div>
        ) : ncList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No Non-Conformance deviations recorded.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>NC Code</th>
                <th>Source</th>
                <th>Gap Description</th>
                <th>Severity</th>
                <th>Linked Task</th>
                <th>Target Closure</th>
                <th>Status</th>
                <th>Closure Date</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {ncList.map((nc) => {
                const targetDate = new Date(nc.targetClosureDate).toLocaleDateString('en-IN');
                const closedDate = nc.closedDate ? new Date(nc.closedDate).toLocaleDateString('en-IN') : null;
                const isOverdue = nc.status === 'OPEN' && new Date(nc.targetClosureDate) < new Date();

                return (
                  <tr key={nc.id} style={{ borderLeft: isOverdue ? '3px solid var(--accent-danger)' : 'none' }}>
                    <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{nc.code}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{nc.source.replace('_', ' ')}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{nc.description}</div>
                      {nc.correctiveAction && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                          CAR: {nc.correctiveAction}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${nc.severity === 'MAJOR' ? 'badge-danger' : 'badge-warning'}`}>
                        {nc.severity}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {nc.task ? (
                        <span title={nc.task.name}>{nc.task.code}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Ad-hoc</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      <span style={{ color: isOverdue ? 'var(--accent-danger)' : 'inherit' }}>
                        {targetDate}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${nc.status === 'CLOSED' ? 'badge-success' : 'badge-danger'}`}>
                        {nc.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {closedDate ? (
                        <div>
                          <div>{closedDate}</div>
                          <div style={{ fontSize: '0.7rem' }}>By: {nc.closedBy}</div>
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic' }}>Pending</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {nc.status === 'OPEN' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleCloseNc(nc.id, nc.code)}
                            title="Verify Corrective Action Plan & Close Record"
                          >
                            <CheckSquare size={12} />
                            Verify & Close
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Non-Conformance Modal Form */}
      {showLogModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} className="badge-danger" />
                <h3 className="modal-title">Log Standard Deviation</h3>
              </div>
              <button className="modal-close" onClick={() => setShowLogModal(false)}>×</button>
            </div>

            {formError && (
              <div className="alert alert-danger">
                <ShieldAlert size={18} />
                <div>{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="alert alert-success">
                <ShieldCheck size={18} />
                <div>{formSuccess}</div>
              </div>
            )}

            <form onSubmit={handleLogSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Source Selection */}
                <div className="form-group">
                  <label className="form-label">Gap Discovery Source *</label>
                  <select
                    className="form-control"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="INTERNAL_AUDIT">Internal Audit (PRO 05)</option>
                    <option value="RANDOM_CHECK">Random Technical Audit</option>
                    <option value="VENDOR_REVIEW">Supplier Audit (PRO 23)</option>
                    <option value="MANAGEMENT_REVIEW">Management Review (PRO 04)</option>
                  </select>
                </div>

                {/* Severity */}
                <div className="form-group">
                  <label className="form-label">Severity Level *</label>
                  <select
                    className="form-control"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="MINOR">MINOR Deviation</option>
                    <option value="MAJOR">MAJOR Breach / Violation</option>
                  </select>
                </div>
              </div>

              {/* Linked Compliance Task */}
              <div className="form-group">
                <label className="form-label">Linked ISMS Process Task (Optional)</label>
                <select
                  className="form-control"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                >
                  <option value="">No linkage (Ad-hoc Gap)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Deviation Description / Gap Details *</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="Record specific description of standard control failure..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Corrective Action */}
              <div className="form-group">
                <label className="form-label">Proposed Corrective Action Request (CAR)</label>
                <textarea
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  placeholder="What steps must be implemented to resolve this gap?"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                />
              </div>

              {/* Target Date */}
              <div className="form-group">
                <label className="form-label">Target Closure Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={targetClosureDate}
                  onChange={(e) => setTargetClosureDate(e.target.value)}
                  required
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Log Deviation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
