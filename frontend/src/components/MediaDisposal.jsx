// frontend/src/components/MediaDisposal.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, Trash, CheckSquare, ShieldX, HardDrive } from 'lucide-react';

/**
 * MediaDisposal Component: Digitizes Media Handling and destruction procedures (PRO 19, FMT 44, FMT 45).
 * Manages Media Disposal Requests (FMT 44) and the Media Disposal Register (FMT 45).
 * 
 * @param {Object} props
 * @param {string} props.token - Session JWT.
 * @param {Object} props.user - Session User details.
 */
export default function MediaDisposal({ token, user }) {
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation Form states (FMT 44 request)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mediaType, setMediaType] = useState('SSD Drive');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [destructionMethod, setDestructionMethod] = useState('Degaussing & Physical Disintegration');
  const [witnessName, setWitnessName] = useState('');

  // Fetch Media logs registry (FMT 45)
  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/registers/media', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Media Disposal register.');
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

  // Submit disposal ticket (FMT 44 request)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!mediaType || !serialNumber || !destructionMethod || !witnessName) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/registers/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mediaType, serialNumber, assetTag: assetTag || null, classification, destructionMethod, witnessName })
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchRecords();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to submit disposal request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Request (FMT 44 signoff)
  const handleApprove = async (id, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/registers/media/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }) // APPROVED or REJECTED
      });
      if (response.ok) {
        fetchRecords();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to update approval status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm Physical Destruction (FMT 45 Register)
  const handleConfirmDestruction = async (id) => {
    if (!confirm('Confirm drive has been completely degaussed and shredded in front of the witness?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/registers/media/${id}/destroy`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchRecords();
      } else {
        const d = await response.json();
        alert(d.error || 'Failed to log final destruction.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Media Disposal Registry</h2>
          <p className="page-description">
            PRO 19: Storage drive sanitization and physical destruction logging (FMT 44 Disposal Request & FMT 45 Disposal Register).
          </p>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => {
            setMediaType('SSD Drive'); setSerialNumber(''); setAssetTag('');
            setClassification('CONFIDENTIAL'); setDestructionMethod('Degaussing & Physical Disintegration');
            setWitnessName('');
            setShowCreateModal(true);
          }}
        >
          <PlusCircle size={14} />
          Request Media Disposal (FMT 44)
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          <ShieldAlert size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Media lists */}
      <div style={{ marginTop: '1rem' }} className="table-container">
        {loading && records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading Media Disposal register...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No media disposal entries registered.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Disposal Code</th>
                <th>Media Info</th>
                <th>Classification</th>
                <th>Destruction Method & Witness</th>
                <th>Requested By</th>
                <th>Signoffs & Dates</th>
                <th>Status</th>
                {isAdminOrManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.disposalCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.mediaType}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>Serial: {r.serialNumber}</div>
                    {r.assetTag && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Asset: {r.assetTag}</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${r.classification.toLowerCase()}`}>
                      {r.classification}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <div>Method: <strong>{r.destructionMethod}</strong></div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Witness: {r.witnessName}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{r.requestedBy}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {r.approvedBy && (
                      <div style={{ color: 'var(--color-text-muted)' }}>Approved By: {r.approvedBy}</div>
                    )}
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      Date: {new Date(r.disposalDate).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      r.status === 'DESTROYED' ? 'badge-success' : 
                      r.status === 'APPROVED' ? 'badge-internal' :
                      r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {r.status === 'PENDING_APPROVAL' ? 'Awaiting CAB Signoff' : r.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      {/* CAB Approvals triggers */}
                      {isAdminOrManager && r.status === 'PENDING_APPROVAL' && (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }} onClick={() => handleApprove(r.id, 'APPROVED')}>
                            Approve
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }} onClick={() => handleApprove(r.id, 'REJECTED')}>
                            Reject
                          </button>
                        </>
                      )}
                      {/* Confirm destruction drill */}
                      {isAdminOrManager && r.status === 'APPROVED' && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem' }}
                          onClick={() => handleConfirmDestruction(r.id)}
                        >
                          Verify Shred (FMT 45)
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

      {/* Request Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={20} className="badge-internal" />
                <h3 className="modal-title">Request Media Disposal (FMT 44)</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Storage Media Type *</label>
                <select className="form-control" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                  <option value="SSD Drive">SSD Drive</option>
                  <option value="HDD Magnetical">HDD Drive</option>
                  <option value="Backup Tape">Backup Tape</option>
                  <option value="CD/DVD Optical">CD/DVD Optical</option>
                  <option value="Paper Documents">Paper Documents (Confidential records)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Serial Number *</label>
                  <input type="text" className="form-control" placeholder="e.g. SN1298319" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Linked Asset Tag</label>
                  <input type="text" className="form-control" placeholder="e.g. UAIL/IT/ST/0002" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data Classification *</label>
                <select className="form-control" value={classification} onChange={(e) => setClassification(e.target.value)}>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Destruction Method *</label>
                <input type="text" className="form-control" placeholder="e.g. Degaussing and physical disintegration shredding." value={destructionMethod} onChange={(e) => setDestructionMethod(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Witness Operations Operator *</label>
                <input type="text" className="form-control" placeholder="e.g. Head of Mumbai Security Guard team" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Request Disposal</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
