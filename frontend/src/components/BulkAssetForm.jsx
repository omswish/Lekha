// frontend/src/components/BulkAssetForm.jsx

import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, Check } from 'lucide-react';

const ASSET_CATEGORY_OPTIONS = [
  { value: 'LAPTOP', label: 'Laptop', defaultType: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop', defaultType: 'Desktop' },
  { value: 'PRINTER', label: 'Printer', defaultType: 'Printer' },
  { value: 'MTR', label: 'MTR', defaultType: 'MTR' },
  { value: 'KIOSK', label: 'Kiosk', defaultType: 'Kiosk' },
  { value: 'SERVER', label: 'Server', defaultType: 'Server' },
  { value: 'STORAGE', label: 'Storage', defaultType: 'Storage' },
  { value: 'TAPE_LIBRARY', label: 'Tape Library', defaultType: 'Tape Library' },
  { value: 'SWITCH', label: 'Switch', defaultType: 'Switch' },
  { value: 'ROUTER', label: 'Router', defaultType: 'Router' },
  { value: 'FIREWALL', label: 'Firewall', defaultType: 'Firewall' },
  { value: 'UPS', label: 'UPS', defaultType: 'UPS' },
  { value: 'ACCESS_POINT', label: 'Access Point', defaultType: 'Access Point' },
  { value: 'VC_UNIT', label: 'VC Unit', defaultType: 'VC Unit' },
  { value: 'DATA_CARD', label: 'Data Card', defaultType: 'Data Card' },
  { value: 'PROJECTOR', label: 'Projector', defaultType: 'Projector' },
  { value: 'CONSUMABLE', label: 'Consumable', defaultType: 'Consumable' },
  { value: 'OTHER', label: 'Other', defaultType: 'Other' }
];

const CATEGORY_SPECIFIC_FIELDS = {
  LAPTOP: [
    { key: 'hostname', label: 'Hostname', placeholder: 'e.g. HILHIDDORLT0740' },
    { key: 'operatingSystem', label: 'Operating System', placeholder: 'e.g. Windows 11 Pro' },
    { key: 'cpuConfiguration', label: 'CPU Configuration', placeholder: 'e.g. Intel Core i5-8250U' },
    { key: 'ramSize', label: 'RAM Size', placeholder: 'e.g. 16 GB' },
    { key: 'storageSize', label: 'Storage Size', placeholder: 'e.g. 512 GB SSD' },
    { key: 'usageType', label: 'Usage Type', placeholder: 'e.g. INDIVIDUAL / SHARED' }
  ],
  DESKTOP: [
    { key: 'hostname', label: 'Hostname', placeholder: 'e.g. HILHIDDORDT0076' },
    { key: 'operatingSystem', label: 'Operating System', placeholder: 'e.g. Windows 10 Pro' },
    { key: 'cpuConfiguration', label: 'CPU Configuration', placeholder: 'e.g. Intel Core i5-2400' },
    { key: 'ramSize', label: 'RAM Size', placeholder: 'e.g. 8 GB' },
    { key: 'storageSize', label: 'Storage Size', placeholder: 'e.g. 1 TB HDD' },
    { key: 'department', label: 'Department', placeholder: 'e.g. Finance' }
  ],
  PRINTER: [
    { key: 'printerType', label: 'Printer Type', placeholder: 'e.g. NETWORK PRINTER' },
    { key: 'ipAddress', label: 'IP Address', placeholder: 'e.g. 10.36.62.21' },
    { key: 'feature', label: 'Features', placeholder: 'e.g. PRINT-SCAN-COPY' },
    { key: 'portType', label: 'Port Type', placeholder: 'e.g. USB / ETHERNET' },
    { key: 'department', label: 'Department', placeholder: 'e.g. Security' },
    { key: 'warrantyStatus', label: 'Warranty Status', placeholder: 'e.g. OUT OF WARRANTY' }
  ],
  MTR: [
    { key: 'displayName', label: 'Display Name', placeholder: 'e.g. MTR HIL UTKAL CCR PRO CONF ROOM' },
    { key: 'custodianEmail', label: 'Custodian Email', placeholder: 'e.g. confroom@company.com' },
    { key: 'department', label: 'Department', placeholder: 'e.g. Process' },
    { key: 'roomSize', label: 'Room Size', placeholder: 'e.g. MEDIUM / LARGE' },
    { key: 'ipAddress', label: 'IP Address', placeholder: 'e.g. 10.36.62.21' },
    { key: 'hostname', label: 'Hostname', placeholder: 'e.g. HILHIDDORMT0001' }
  ],
  KIOSK: [
    { key: 'hostname', label: 'Hostname', placeholder: 'e.g. HILHIDDORDT1451' },
    { key: 'ipAddress', label: 'IP Address', placeholder: 'e.g. DHCP / 10.36.56.2' },
    { key: 'department', label: 'Department', placeholder: 'e.g. HR' },
    { key: 'usageType', label: 'Usage Type', placeholder: 'e.g. CUSTODIAN' },
    { key: 'vendorName', label: 'Vendor Name', placeholder: 'e.g. DOMIS TECH PVT. LTD' },
    { key: 'warrantyStatus', label: 'Warranty Status', placeholder: 'e.g. OUT OF WARRANTY' }
  ]
};

function findCategoryOption(value) {
  return ASSET_CATEGORY_OPTIONS.find((option) => option.value === value) || ASSET_CATEGORY_OPTIONS[0];
}

export default function BulkAssetForm({ users, token, onSave, onCancel }) {
  const [category, setCategory] = useState('LAPTOP');
  const [type, setType] = useState('Laptop');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [classification, setClassification] = useState('INTERNAL');
  const [location, setLocation] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [customFields, setCustomFields] = useState({});
  const [serialsText, setSerialsText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCategoryChange = (nextCategory) => {
    const previousDefaultType = findCategoryOption(category).defaultType;
    const nextDefaultType = findCategoryOption(nextCategory).defaultType;

    setCategory(nextCategory);
    if (!type || type === previousDefaultType) {
      setType(nextDefaultType);
    }
  };

  const handleCustomFieldChange = (key, value) => {
    setCustomFields((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Parse serial numbers
    const serialNumbers = serialsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (serialNumbers.length === 0) {
      setError('Please provide at least one hardware serial number.');
      return;
    }

    if (!name || !model || !location) {
      setError('Please fill all required common fields.');
      return;
    }

    setLoading(true);

    try {
      const categoryFields = CATEGORY_SPECIFIC_FIELDS[category] || [];
      const categoryCustomFields = categoryFields.reduce((result, field) => {
        result[field.key] = customFields[field.key] || '';
        return result;
      }, {});

      const response = await fetch('http://localhost:5000/api/assets/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category,
          type,
          model,
          serialNumbers,
          classification,
          location,
          customFields: categoryCustomFields,
          ownerId: ownerId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Bulk registration failed.');
      }

      setSuccess(`Successfully registered ${serialNumbers.length} assets!`);
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const serialCount = serialsText.split('\n').map(s => s.trim()).filter(Boolean).length;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} className="badge-internal" style={{ color: '#3b82f6' }} />
            <h3 className="modal-title">Bulk Asset Registration</h3>
          </div>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <ShieldAlert size={20} />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <Check size={20} />
            <div>{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="responsive-form-grid">
            {/* Common Asset Name */}
            <div className="form-group">
              <label className="form-label">Common Asset Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Standard Developer Workstation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Asset Category */}
            <div className="form-group">
              <label className="form-label">Asset Category *</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={loading}
              >
                {ASSET_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Subtype */}
            <div className="form-group">
              <label className="form-label">Subtype / Variant</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Laptop, Local Printer"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Manufacturer Model */}
            <div className="form-group">
              <label className="form-label">Manufacturer Model *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dell Latitude 5440"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Classification */}
            <div className="form-group">
              <label className="form-label">ISMS Classification *</label>
              <select
                className="form-control"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                disabled={loading}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED">RESTRICTED</option>
              </select>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Physical Location *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. HQ Delhi - Floor 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Category-Specific Form Fields */}
          {CATEGORY_SPECIFIC_FIELDS[category]?.length > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                  {findCategoryOption(category).label} Entry Details
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  These details will be applied as custom specifications to all registered assets.
                </p>
              </div>

              <div className="responsive-form-grid">
                {CATEGORY_SPECIFIC_FIELDS[category].map((field) => (
                  <div className="form-group" key={field.key}>
                    <label className="form-label">{field.label}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={field.placeholder}
                      value={customFields[field.key] || ''}
                      onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

          {/* Allocation & Assignee */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
              Asset Assignee & Allocation
            </h4>
            <div className="responsive-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label className="form-label">Asset Assignee (Optional)</label>
                <select
                  className="form-control"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- UNASSIGNED (IN STOCK) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

          {/* Serial Numbers Textarea */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Hardware Serial Numbers *</span>
              <span className="badge badge-info" style={{ backgroundColor: 'var(--bg-badge-internal)', color: 'var(--color-text-primary)' }}>
                Count: {serialCount}
              </span>
            </label>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Paste or enter serial numbers. Put exactly **one serial number per line**. We will generate an asset tag and record entry for each one.
            </p>
            <textarea
              className="form-control"
              rows={6}
              placeholder="e.g.&#10;SN-82736152-X&#10;SN-82736153-Y&#10;SN-82736154-Z"
              value={serialsText}
              onChange={(e) => setSerialsText(e.target.value)}
              disabled={loading}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              required
            ></textarea>
          </div>

          {/* Actions */}
          <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
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
              {loading ? 'Registering...' : `Bulk Register ${serialCount > 0 ? `(${serialCount} units)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
