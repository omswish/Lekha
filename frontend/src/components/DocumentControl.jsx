// frontend/src/components/DocumentControl.jsx

import React, { useState, useEffect } from 'react';
import { FileText, ShieldAlert, PlusCircle, CheckCircle, Clock } from 'lucide-react';

/**
 * DocumentControl Component: Digitizes document controls (PRO 01, FMT 01/02/04).
 * Tracks Master List of Documents (Policies, Procedures, Formats) and Version Histories.
 * 
 * @param {Object} props
 * @param {string} props.token - Session token.
 * @param {string} props.role - User permissions role.
 */
export default function DocumentControl({ token, role }) {
  const isAdmin = role === 'ADMIN';

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states (FMT 04 Document Change Note)
  const [showForm, setShowForm] = useState(false);
  const [docCode, setDocCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('POLICY');
  const [version, setVersion] = useState('1.0');
  const [owner, setOwner] = useState('IT Head');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reviewCycleMonths, setReviewCycleMonths] = useState(12);
  const [changeSummary, setChangeSummary] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch Controlled Documents list (FMT 01)
  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load document register.');
      }
      setDocs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Open form for registration
  const handleOpenForm = (existingDoc = null) => {
    if (existingDoc) {
      setDocCode(existingDoc.docCode);
      setTitle(existingDoc.title);
      setType(existingDoc.type);
      setVersion(existingDoc.version);
      setOwner(existingDoc.owner);
      setEffectiveDate(existingDoc.effectiveDate.split('T')[0]);
      setReviewCycleMonths(existingDoc.reviewCycleMonths);
      setChangeSummary(existingDoc.changeSummary || '');
    } else {
      setDocCode('');
      setTitle('');
      setType('POLICY');
      setVersion('1.0');
      setOwner('IT Head');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setReviewCycleMonths(12);
      setChangeSummary('');
    }
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  // Submit DCN form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!docCode || !title || !version || !owner || !effectiveDate) {
      setFormError('All fields marked with * are required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/registers/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          docCode,
          title,
          type,
          version,
          owner,
          effectiveDate,
          reviewCycleMonths,
          changeSummary
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to log document note.');
      }

      setFormSuccess('Controlled document version registered and DCN completed!');
      fetchDocs();
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">ISMS Controlled Documents Master List</h2>
          <p className="page-description">
            FMT 01 Master list of document controls managing organizational policies, procedures, and version tags (PRO 01).
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenForm(null)}>
            <PlusCircle size={14} />
            Log Document Control (DCN)
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Grid of Controlled Docs */}
      <div className="card-grid">
        {loading && docs.length === 0 ? (
          <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading documents...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>No controlled documents recorded.</div>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className="badge badge-internal" style={{ fontSize: '0.75rem' }}>{doc.type}</span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>V{doc.version}</span>
              </div>
              
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>
                {doc.title}
              </h3>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '1rem' }}>
                {doc.docCode}
              </div>

              {doc.changeSummary && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '1rem', border: '1px solid var(--border-color)', fontStyle: 'italic', lineHeight: 1.3 }}>
                  DCN: {doc.changeSummary}
                </div>
              )}

              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <div>
                  <span>Owner: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{doc.owner}</strong>
                </div>
                <div>
                  <span>Approved By: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{doc.approvedBy || 'N/A'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <Clock size={12} />
                  <span>Next Review: </span>
                  <strong style={{ color: new Date(doc.nextReviewDate) < new Date() ? 'var(--accent-danger)' : 'inherit' }}>
                    {new Date(doc.nextReviewDate).toLocaleDateString('en-IN')}
                  </strong>
                </div>
              </div>
              
              {isAdmin && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: '1rem', width: '100%', fontSize: '0.75rem', padding: '0.35rem' }} 
                  onClick={() => handleOpenForm(doc)}
                >
                  Log Revision (DCN)
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} className="badge-internal" />
                <h3 className="modal-title">Document Change Note (FMT 04)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            {formError && (
              <div className="alert alert-danger">
                <ShieldAlert size={18} />
                <div>{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="alert alert-success">
                <CheckCircle size={18} />
                <div>{formSuccess}</div>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Document Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UAIL/ISMS/POL/009"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Document Type *</label>
                  <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="POLICY">POLICY</option>
                    <option value="PROCEDURE">PROCEDURE</option>
                    <option value="FORMAT">FORMAT (FMT)</option>
                    <option value="MANUAL">MANUAL (ISMS)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Document Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mobile Device Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Version Target *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 1.0, 2.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsible Owner *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. IT Head"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Effective Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Review Cycle (Months) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={reviewCycleMonths}
                    onChange={(e) => setReviewCycleMonths(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Change summary (FMT 04 Document Change Note detail) */}
              <div className="form-group">
                <label className="form-label">DCN: Amendment / Change Summary Details</label>
                <textarea
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  placeholder="Describe revisions made to the document..."
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save controlled document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
