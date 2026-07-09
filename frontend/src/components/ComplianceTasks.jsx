// frontend/src/components/ComplianceTasks.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Calendar, FileText, CheckCircle, Clock, PlusCircle } from 'lucide-react';

/**
 * ComplianceTasks Component: Tracks and signs off on recurring ISMS controls (PRO 10).
 * 
 * Provides visibility into daily/weekly/monthly/yearly security audit checks.
 * Integrates directly with formats (like FMT 11, FMT 26, FMT 50).
 * Admins can mark tasks checked, record evidence paths, and calculate next due dates.
 * 
 * @param {Object} props
 * @param {string} props.token - Authorization JWT.
 * @param {string} props.role - Current user role.
 */
export default function ComplianceTasks({ token, role }) {
  const isAdminOrManager = role === 'ADMIN' || role === 'ASSET_MANAGER';

  // State management
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected task detail view (for checking history)
  const [selectedTask, setSelectedTask] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sign-off Form states
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [targetTask, setTargetTask] = useState(null);
  const [checkStatus, setCheckStatus] = useState('COMPLIANT');
  const [checkNotes, setCheckNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch all compliance tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load compliance tasks.');
      }
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Fetch detailed history logs for a task
  const handleViewHistory = async (task) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedTask(data);
      } else {
        alert(data.error || 'Failed to load task history.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Trigger Sign-off form
  const handleOpenCheck = (task) => {
    setTargetTask(task);
    setCheckStatus('COMPLIANT');
    setCheckNotes('');
    setEvidenceUrl('');
    setFormError('');
    setFormSuccess('');
    setShowCheckModal(true);
  };

  // Submit task verification check
  const handleCheckSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!checkNotes) {
      setFormError('Audit notes / remarks are mandatory.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${targetTask.id}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: checkStatus,
          notes: checkNotes,
          evidenceUrl
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record check log.');
      }

      setFormSuccess('Task compliance logged and schedule updated!');
      fetchTasks();
      
      // Update historical logs view if currently open on this task
      if (selectedTask && selectedTask.id === targetTask.id) {
        handleViewHistory(targetTask);
      }

      setTimeout(() => {
        setShowCheckModal(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1.5fr 1fr' : '1fr', gap: '2rem' }}>
      
      {/* Left side: Recurring checklist */}
      <div>
        <div className="page-header">
          <div>
            <h2 className="page-title">ISMS Recurring Compliance Checklists</h2>
            <p className="page-description">
              Control task tracking of operational security audits, checks, and backup verifications (PRO 10).
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <ShieldAlert size={20} />
            <div>{error}</div>
          </div>
        )}

        <div className="table-container">
          {loading && tasks.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading task calendar...
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No compliance tasks found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Code</th>
                  <th>Task Name</th>
                  <th>Frequency</th>
                  <th>Associated Format</th>
                  <th>Status</th>
                  <th>Next Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isOverdue = task.nextDueDate && new Date(task.nextDueDate) < new Date() && task.status !== 'COMPLIANT';
                  return (
                    <tr key={task.id} style={{ borderLeft: isOverdue ? '3px solid var(--accent-danger)' : 'none' }}>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{task.code}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{task.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                          {task.description}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-internal" style={{ fontSize: '0.7rem' }}>{task.frequency}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                        {task.associatedFormat || 'No standard format'}
                      </td>
                      <td>
                        <span className={`badge ${
                          task.status === 'COMPLIANT' ? 'badge-success' : 
                          task.status === 'ACTION_REQUIRED' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {task.status === 'ACTION_REQUIRED' ? 'NC Raised' : task.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {task.nextDueDate ? (
                          <span style={{ color: isOverdue ? 'var(--accent-danger)' : 'inherit' }}>
                            {new Date(task.nextDueDate).toLocaleDateString('en-IN')}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewHistory(task)}
                          >
                            Logs
                          </button>
                          
                          {isAdminOrManager && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenCheck(task)}
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right side: Detailed historical check logs */}
      {selectedTask && (
        <div className="card" style={{ alignSelf: 'flex-start', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Audit History: {selectedTask.code}
            </h3>
            <button className="modal-close" style={{ fontSize: '1.25rem' }} onClick={() => setSelectedTask(null)}>×</button>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
            {selectedTask.name}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
            {selectedTask.description}
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Frequency: </span>
              <strong>{selectedTask.frequency}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Format: </span>
              <strong>{selectedTask.associatedFormat || 'None'}</strong>
            </div>
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            Verification Check Logs
          </h4>

          {historyLoading ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: '1rem 0' }}>Loading logs...</div>
          ) : selectedTask.logs?.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
              No audits have been executed on this task yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
              {selectedTask.logs?.map((log) => (
                <div key={log.id} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className={`badge ${log.status === 'COMPLIANT' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      {new Date(log.timestamp).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {log.notes}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dotted var(--border-color)', paddingTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Auditor: {log.checkedBy}</span>
                    {log.evidenceUrl && (
                      <span style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={log.evidenceUrl}>
                        <FileText size={12} />
                        Evidence Linked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verify Check modal Form (Admin/Manager only) */}
      {showCheckModal && targetTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} className="badge-success" />
                <h3 className="modal-title">Compliance Verification Audit</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCheckModal(false)}>×</button>
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

            <form onSubmit={handleCheckSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Task Code & Name:</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{targetTask.code}</div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem', marginTop: '0.15rem' }}>{targetTask.name}</div>
                {targetTask.associatedFormat && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Linked Format Required: {targetTask.associatedFormat}
                  </div>
                )}
              </div>

              {/* Status Select */}
              <div className="form-group">
                <label className="form-label">Compliance Outcome *</label>
                <select
                  className="form-control"
                  value={checkStatus}
                  onChange={(e) => setCheckStatus(e.target.value)}
                >
                  <option value="COMPLIANT">COMPLIANT (All controls checks passed)</option>
                  <option value="NON_CONFORMANCE">NON_CONFORMANCE (Deviations detected / Action required)</option>
                </select>
              </div>

              {/* Remarks/Notes */}
              <div className="form-group">
                <label className="form-label">Audit Remarks & Observations *</label>
                <textarea
                  className="form-control"
                  style={{ height: '90px', resize: 'none' }}
                  placeholder="Record verification notes, observations, or checklists reviewed..."
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  required
                />
              </div>

              {/* Evidence Link */}
              <div className="form-group">
                <label className="form-label">Evidence File Reference / Local URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. C:/Users/omkar.s/Code/cli-test1/ISO_docs/Formats/FMT_50.docx"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Provide the file path or binder reference where the completed format checklist is saved.
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCheckModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Log Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
