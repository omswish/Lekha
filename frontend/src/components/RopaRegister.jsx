// frontend/src/components/RopaRegister.jsx

import React, { useState, useEffect } from 'react';
import { BookOpen, ShieldAlert, PlusCircle, PenTool, CheckCircle } from 'lucide-react';

/**
 * RopaRegister Component: Renders and manages the Record of Processing Activities (RoPA).
 * 
 * Under the DPDP Act 2023, data fiduciaries must record processing activities:
 * what data is gathered, why, who it's shared with, retention lengths, and safety mechanisms.
 * This component provides both user-facing transparency and admin-management capabilities.
 * 
 * @param {Object} props
 * @param {string} props.token - Session token.
 * @param {string} props.role - Logged-in user role (ADMIN can add/edit).
 */
export default function RopaRegister({ token, role }) {
  const isAdmin = role === 'ADMIN';

  // Data storage
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states for adding/editing RoPA registry items
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [dataCategory, setDataCategory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [processingActivity, setProcessingActivity] = useState('');
  const [sharingScope, setSharingScope] = useState('');
  const [retentionPeriod, setRetentionPeriod] = useState('');
  const [securitySafeguards, setSecuritySafeguards] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch RoPA records
  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/compliance/ropa', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load RoPA registry.');
      }
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Hydrate form for editing
  const handleEditClick = (rec) => {
    setEditingId(rec.id);
    setDataCategory(rec.dataCategory);
    setPurpose(rec.purpose);
    setProcessingActivity(rec.processingActivity);
    setSharingScope(rec.sharingScope);
    setRetentionPeriod(rec.retentionPeriod);
    setSecuritySafeguards(rec.securitySafeguards);
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  // Trigger form reset and open for creation
  const handleAddClick = () => {
    setEditingId('');
    setDataCategory('');
    setPurpose('');
    setProcessingActivity('');
    setSharingScope('');
    setRetentionPeriod('');
    setSecuritySafeguards('');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  // Submit RoPA updates
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!dataCategory || !purpose || !processingActivity || !sharingScope || !retentionPeriod || !securitySafeguards) {
      setFormError('All registry specification fields are mandatory.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/compliance/ropa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingId || undefined,
          dataCategory,
          purpose,
          processingActivity,
          sharingScope,
          retentionPeriod,
          securitySafeguards
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save registry record.');
      }

      setFormSuccess(editingId ? 'RoPA record updated successfully!' : 'New RoPA processing activity recorded!');
      
      // Refresh list
      fetchRecords();

      // Close form modal after short delay
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">RoPA Compliance Registry</h2>
          <p className="page-description">
            Record of Processing Activities (DPDP Section 4 & 6) outlining personal data scope, storage pipelines, and safety guards.
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
            <PlusCircle size={14} />
            Log Activity Record
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {loading && records.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Retrieving RoPA registry...
        </div>
      ) : records.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No records logged in the compliance registry.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {records.map((rec) => (
            <div key={rec.id} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>
                  {rec.dataCategory}
                </h3>
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleEditClick(rec)}>
                    <PenTool size={12} />
                    Modify
                  </button>
                )}
              </div>

              {/* Specification layout grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Lawful Purpose
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{rec.purpose}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Processing Pipelines
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{rec.processingActivity}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Sharing Scope
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{rec.sharingScope}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Retention Period
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{rec.retentionPeriod}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Security safeguards
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-success)', fontWeight: 500 }}>
                    {rec.securitySafeguards}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms Overlay Modal (Admin Only) */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} className="badge-internal" />
                <h3 className="modal-title">{editingId ? 'Modify RoPA Registry Entry' : 'Add RoPA Registry Entry'}</h3>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            {formError && (
              <div className="alert alert-danger">
                <ShieldAlert size={20} />
                <div>{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="alert alert-success">
                <CheckCircle size={20} />
                <div>{formSuccess}</div>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* Category */}
              <div className="form-group">
                <label className="form-label">Personal Data Category *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Employee Identity Details (Name, email, roles)"
                  value={dataCategory}
                  onChange={(e) => setDataCategory(e.target.value)}
                  required
                />
              </div>

              {/* Purpose */}
              <div className="form-group">
                <label className="form-label">Processing Purpose *</label>
                <textarea
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  placeholder="Why is this information captured?"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </div>

              {/* Activity details */}
              <div className="form-group">
                <label className="form-label">Processing Operations *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Input forms collection, cryptographic hashing, index links"
                  value={processingActivity}
                  onChange={(e) => setProcessingActivity(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Sharing scope */}
                <div className="form-group">
                  <label className="form-label">Sharing Scope / Third Parties *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Internal Audit only, No external shares"
                    value={sharingScope}
                    onChange={(e) => setSharingScope(e.target.value)}
                    required
                  />
                </div>

                {/* Retention length */}
                <div className="form-group">
                  <label className="form-label">Retention Period *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Service period + 1 year"
                    value={retentionPeriod}
                    onChange={(e) => setRetentionPeriod(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Safeguards */}
              <div className="form-group">
                <label className="form-label">Security Safeguards *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. bcrypt hash, SSL connection, database local partition"
                  value={securitySafeguards}
                  onChange={(e) => setSecuritySafeguards(e.target.value)}
                  required
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
