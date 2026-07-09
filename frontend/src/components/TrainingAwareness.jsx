// frontend/src/components/TrainingAwareness.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, CheckSquare, GraduationCap, ClipboardList, Star } from 'lucide-react';

/**
 * TrainingAwareness Component: Digitizes Training & Awareness (PRO 02, FMT 16/17/18/19).
 * Tracks Training Plans (FMT 16), Attendance registers (FMT 17), Feedback Forms (FMT 18), and Evaluations (FMT 19).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function TrainingAwareness({ token, user }) {
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 16 Training Plan)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [trainer, setTrainer] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [durationHours, setDurationHours] = useState(2.0);

  // Attendance Form states (FMT 17 Attendance)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [employeeEmail, setEmployeeEmail] = useState('');

  // Feedback Form states (FMT 18 Feedback)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // Evaluation Form states (FMT 19 Evaluation)
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalScore, setEvalScore] = useState(80);
  const [evalStatus, setEvalStatus] = useState('PASS');

  // Fetch training sessions register (FMT 16)
  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/trainings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load training sessions register.');
      }
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Submit new Training Session Plan (FMT 16)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!topic || !trainer || !scheduledDate || !durationHours) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, trainer, scheduledDate, durationHours })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchSessions();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to schedule training session.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Log Attendance (FMT 17)
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!employeeEmail) {
      alert('Please enter participant email.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/registers/trainings/${selectedSession.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employeeEmail })
      });
      if (response.ok) {
        setShowAttendanceModal(false);
        fetchSessions();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log participant.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Feedback (FMT 18)
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/registers/trainings/attendance/${selectedAttendance.id}/evaluate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feedbackRating, feedbackNotes })
      });
      if (response.ok) {
        setShowFeedbackModal(false);
        fetchSessions();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Evaluation score (FMT 19)
  const handleEvalSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/registers/trainings/attendance/${selectedAttendance.id}/evaluate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ evaluationScore: evalScore, evaluationStatus: evalStatus })
      });
      if (response.ok) {
        setShowEvalModal(false);
        fetchSessions();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log evaluation results.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Training & Awareness Registry</h2>
          <p className="page-description">
            PRO 02: Staff training processes tracking Training Plans (FMT 16), Attendance (FMT 17), Feedback (FMT 18), and Evaluations (FMT 19).
          </p>
        </div>

        {isAdminOrManager && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setTopic(''); setTrainer(''); setScheduledDate(new Date().toISOString().split('T')[0]); setDurationHours(2.0);
              setShowCreateModal(true);
            }}
          >
            <PlusCircle size={14} />
            Schedule Training Session (FMT 16)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Sessions list */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && sessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading training sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No training sessions logged in the registry.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Training Session Topic</th>
                <th>Trainer</th>
                <th>Scheduled Date</th>
                <th>Duration (Hrs)</th>
                <th>Status</th>
                <th>Participants (FMT 17 Attendance & FMT 18/19 Reports)</th>
                {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.topic}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.trainer}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(s.scheduledDate).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontSize: '0.85rem' }}>{s.durationHours} hrs</td>
                  <td>
                    <span className={`badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.attendanceList && s.attendanceList.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {s.attendanceList.map((att) => {
                          const isSelfParticipant = att.employeeEmail === user.email;

                          return (
                            <div key={att.id} style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{att.employeeEmail}</strong>
                                <span className={`badge ${
                                  att.evaluationStatus === 'PASS' ? 'badge-success' : 
                                  att.evaluationStatus === 'FAIL' ? 'badge-danger' : 'badge-warning'
                                }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                                  Eval: {att.evaluationStatus} {att.evaluationScore ? `(${att.evaluationScore}%)` : ''}
                                </span>
                              </div>

                              {/* Feedback text */}
                              {att.feedbackRating ? (
                                <div style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem' }}>
                                  <span>Rating: <strong style={{ color: 'var(--accent-warning)' }}>{att.feedbackRating}/5</strong></span>
                                  <div>Notes: "{att.feedbackNotes}"</div>
                                </div>
                              ) : (
                                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>No participant feedback logged</div>
                              )}

                              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                {/* Employee Feedback trigger */}
                                {isSelfParticipant && !att.feedbackRating && (
                                  <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}
                                    onClick={() => { setSelectedAttendance(att); setFeedbackRating(5); setFeedbackNotes(''); setShowFeedbackModal(true); }}
                                  >
                                    Submit Feedback (FMT 18)
                                  </button>
                                )}

                                {/* Admin Evaluation trigger */}
                                {isAdmin && att.evaluationStatus === 'AWAITING' && (
                                  <button 
                                    className="btn btn-primary btn-sm" 
                                    style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}
                                    onClick={() => { setSelectedAttendance(att); setEvalScore(80); setEvalStatus('PASS'); setShowEvalModal(true); }}
                                  >
                                    Log Score (FMT 19)
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No participants logged.</span>
                    )}
                  </td>
                  {isAdminOrManager && (
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => { setSelectedSession(s); setEmployeeEmail(''); setShowAttendanceModal(true); }}
                      >
                        Add Participant (FMT 17)
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Session Modal (FMT 16) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={20} className="badge-internal" />
                <h3 className="modal-title">Schedule Training session (FMT 16)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Training Topic Name *</label>
                <input type="text" className="form-control" placeholder="e.g. ISO 27001 ISMS Staff Awareness" value={topic} onChange={(e) => setTopic(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Designated Trainer *</label>
                <input type="text" className="form-control" placeholder="e.g. Cybersecurity Lead" value={trainer} onChange={(e) => setTrainer(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Scheduled Date *</label>
                  <input type="date" className="form-control" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Hours) *</label>
                  <input type="number" step="0.5" className="form-control" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Participant Modal (FMT 17) */}
      {showAttendanceModal && selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Attendance (FMT 17)</h3>
              <button className="modal-close" onClick={() => setShowAttendanceModal(false)}>×</button>
            </div>

            <form onSubmit={handleAttendanceSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Topic: </strong>{selectedSession.topic}</div>
                <div><strong>Scheduled: </strong>{new Date(selectedSession.scheduledDate).toLocaleDateString()}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Participant Employee Email *</label>
                <input type="email" className="form-control" placeholder="username@adityabirla.com" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAttendanceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Attendance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participant Feedback Modal (FMT 18) */}
      {showFeedbackModal && selectedAttendance && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={20} className="badge-internal" />
                <h3 className="modal-title">Submit Session Feedback (FMT 18)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>

            <form onSubmit={handleFeedbackSubmit}>
              <div className="form-group">
                <label className="form-label">Feedback Rating (1 - 5 Stars) *</label>
                <input type="number" min="1" max="5" className="form-control" value={feedbackRating} onChange={(e) => setFeedbackRating(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Feedback Remarks / Notes</label>
                <textarea className="form-control" style={{ height: '75px', resize: 'none' }} placeholder="What did you learn? Any improvement ideas?" value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participant Evaluation Modal (FMT 19) */}
      {showEvalModal && selectedAttendance && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} className="badge-internal" />
                <h3 className="modal-title">Log Test Evaluation (FMT 19)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowEvalModal(false)}>×</button>
            </div>

            <form onSubmit={handleEvalSubmit}>
              <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Participant: </strong>{selectedAttendance.employeeEmail}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Test Score (%) *</label>
                <input type="number" min="0" max="100" className="form-control" value={evalScore} onChange={(e) => setEvalScore(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Result *</label>
                <select className="form-control" value={evalStatus} onChange={(e) => setEvalStatus(e.target.value)}>
                  <option value="PASS">PASS (Score {`>= 60%`})</option>
                  <option value="FAIL">FAIL (Awaiting Re-examination)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Evaluation Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
