// frontend/src/components/ConsentModal.jsx

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Mail } from 'lucide-react';

/**
 * ConsentModal Component: Handles explicit user consent collection under the DPDP Act 2023.
 * 
 * DPDP compliance mandates that before processing any personal data, organizations must:
 * 1. Present a clear, plain-language notice detailing what data is collected.
 * 2. Specify the precise purpose of processing.
 * 3. Give the user the right to grant or deny consent.
 * 4. Provide the contact details of the Data Protection Officer (DPO).
 * 
 * @param {Object} props
 * @param {string} props.userId - The user account requesting consent.
 * @param {string} props.email - The user email.
 * @param {Function} props.onConsentGranted - Callback function triggered after successful consent response.
 * @param {Function} props.onCancel - Callback function if user cancels or denies consent.
 */
export default function ConsentModal({ userId, email, onConsentGranted, onCancel }) {
  // Checkbox state for user approval
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle consent submission API call
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) {
      setError('You must check the agreement box to grant consent and proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // POST the consent parameters to the backend
      const response = await fetch('http://localhost:5000/api/auth/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          hasConsented: true,
          consentPurpose: 'IT Asset Inventory Tracking, Security logs retention for CERT-In (180 days), and System Login access verification.'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit consent registry.');
      }

      // If consent is registered successfully, backend returns user token. Pass it back to parent.
      onConsentGranted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div className="auth-logo" style={{ marginBottom: '1rem', justifyContent: 'flex-start' }}>
          <ShieldCheck size={28} className="badge-success" style={{ color: '#10b981' }} />
          <span>DPDP Consent Notice</span>
        </div>

        <p className="page-description" style={{ marginBottom: '1.5rem' }}>
          In accordance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> (India), 
          we require your explicit consent to process your personal data for IT asset management.
        </p>

        {error && (
          <div className="alert alert-danger">
            <ShieldAlert size={20} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Data Items list */}
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              1. Categories of Personal Data Collected:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              <li>User Identity (Full name, work email address)</li>
              <li>Department and role classifications</li>
              <li>System access log tracks (IP address, login times, device user-agent)</li>
            </ul>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              2. Explicit Purpose of Processing:
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              To assign, log, and audit local departmental IT inventories (laptops, server permissions) in compliance 
              with ISO 27001, and to retain security event logs for 180 days as mandated by CERT-In cybersecurity directives.
            </p>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              3. Retention and Safekeeping:
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Your details will reside on internal server systems and will be processed until you exercise your 
              Right to Erasure. System access audit trails will be pruned automatically after 180 days.
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                disabled={loading}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                I hereby grant consent to the Departmental Data Fiduciary to process my personal identifiers 
                for the purposes defined above. I acknowledge my right to modify or withdraw consent at any time.
              </span>
            </label>
          </div>

          {/* Data Protection Officer contact info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <Mail size={14} />
            <span>Data Protection Officer: <strong>dpo.security@department.gov.in</strong></span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Deny Consent
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !agree}
            >
              {loading ? 'Submitting...' : 'I Agree & Proceed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
