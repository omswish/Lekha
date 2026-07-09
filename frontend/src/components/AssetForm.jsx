// frontend/src/components/AssetForm.jsx

import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, Check } from 'lucide-react';

/**
 * AssetForm Component: Manages registration or modifications of IT inventory assets.
 * Fulfills ISO 27001 Control A.5.9 (Asset Inventory) and A.5.10 (Acceptable Use policy).
 * 
 * @param {Object} props
 * @param {Object} props.asset - Existing asset object (if editing; null if creating new).
 * @param {Array<Object>} props.users - List of active employees available for assignment.
 * @param {string} props.token - JWT session authorization token.
 * @param {Function} props.onSave - Callback function to notify completion and refresh listing.
 * @param {Function} props.onCancel - Callback function to dismiss the modal.
 */
export default function AssetForm({ asset, users, token, onSave, onCancel }) {
  // Determine if form is in edit or register mode
  const isEdit = !!asset;

  // Initialize input form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Laptop');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [classification, setClassification] = useState('INTERNAL');
  const [status, setStatus] = useState('PROCURED');
  const [location, setLocation] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [acceptableUseSigned, setAcceptableUseSigned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hydrate form fields if editing an existing asset
  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setType(asset.type || 'Laptop');
      setModel(asset.model || '');
      setSerialNumber(asset.serialNumber || '');
      setClassification(asset.classification || 'INTERNAL');
      setStatus(asset.status || 'PROCURED');
      setLocation(asset.location || '');
      setOwnerId(asset.ownerId || '');
      setAcceptableUseSigned(asset.acceptableUseSigned || false);
    }
  }, [asset]);

  // Adjust status automatically when owner is selected
  const handleOwnerChange = (val) => {
    setOwnerId(val);
    if (val) {
      setStatus('ALLOCATED');
    } else {
      setStatus('PROCURED');
      setAcceptableUseSigned(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field check
    if (!name || !model || !serialNumber || !location) {
      setError('Please fill in all mandatory asset fields.');
      return;
    }

    setLoading(true);

    try {
      const url = isEdit 
        ? `http://localhost:5000/api/assets/${asset.id}` 
        : 'http://localhost:5000/api/assets';
        
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name,
        type,
        model,
        serialNumber,
        classification,
        status,
        location,
        ownerId: ownerId || null,
        acceptableUseSigned: !!ownerId && acceptableUseSigned
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record asset.');
      }

      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} className="badge-internal" style={{ color: '#3b82f6' }} />
            <h3 className="modal-title">{isEdit ? 'Modify IT Asset Record' : 'Register New IT Asset'}</h3>
          </div>
          <button className="modal-close" onClick={onCancel} disabled={loading}>×</button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <ShieldAlert size={20} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Asset Name */}
            <div className="form-group">
              <label className="form-label">Asset Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Finance Server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Asset Type */}
            <div className="form-group">
              <label className="form-label">Asset Type *</label>
              <select
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
              >
                <option value="Laptop">Laptop (LT)</option>
                <option value="Desktop">Desktop (DT)</option>
                <option value="Printer">Printer (PR)</option>
                <option value="Server">Server (SE)</option>
                <option value="Storage">Storage (ST)</option>
                <option value="Tape Library">Tape Library (TL)</option>
                <option value="Switch">Switch (SW)</option>
                <option value="Router">Router (RT)</option>
                <option value="Firewall">Firewall (FW)</option>
              </select>
            </div>


            {/* Manufacturer Model */}
            <div className="form-group">
              <label className="form-label">Model Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. PowerEdge R750"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Serial Number (Physical asset tag linkage) */}
            <div className="form-group">
              <label className="form-label">Serial Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SN-889922-DEL"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                disabled={loading || isEdit} // Locks serial key in edit mode
                required
              />
            </div>

            {/* ISO 27001 Information Classification */}
            <div className="form-group">
              <label className="form-label">Information Security Classification *</label>
              <select
                className="form-control"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                disabled={loading}
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </select>
            </div>


            {/* Physical Location */}
            <div className="form-group">
              <label className="form-label">Physical Location *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mumbai DC, Rack 3-F"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

          {/* Allocation Details */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Asset Owner & Acceptable Use Controls (ISO 27001)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            {/* Assign Employee */}
            <div className="form-group">
              <label className="form-label">Asset Assignee (Owner)</label>
              <select
                className="form-control"
                value={ownerId}
                onChange={(e) => handleOwnerChange(e.target.value)}
                disabled={loading}
              >
                <option value="">Unassigned (Stored in Inventory Stock)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Status */}
            <div className="form-group">
              <label className="form-label">Lifecycle Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="PROCURED">Procured (In Stock)</option>
                <option value="ALLOCATED">Allocated (Assigned)</option>
                <option value="MAINTENANCE">Maintenance (Service)</option>
                <option value="DISPOSED">Disposed (Decommissioned)</option>
                <option value="LOST">Lost (Incident Triggered)</option>
              </select>
            </div>
          </div>

          {/* Acceptable Use Verification Checkbox */}
          {ownerId && (
            <div className="form-group" style={{ marginTop: '0.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={acceptableUseSigned}
                  onChange={(e) => setAcceptableUseSigned(e.target.checked)}
                  disabled={loading}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Confirm that the employee has signed the <strong>IT Acceptable Use Policy</strong>.
                  (Required under ISO 27001 before allocating corporate equipment).
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : isEdit ? 'Update Asset' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
