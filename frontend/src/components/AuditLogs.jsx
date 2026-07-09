// frontend/src/components/AuditLogs.jsx

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Filter, RefreshCw, ChevronLeft, ChevronRight, HardDrive } from 'lucide-react';

/**
 * AuditLogs Component: Displays security and administration event records (CERT-In Mandate).
 * 
 * To meet Indian CERT-In guidelines, the system logs client IP addresses, user accounts,
 * modules, activities, and success states. This view allows administrators to audit
 * logs and export records for regulatory compliance inspections.
 * 
 * @param {Object} props
 * @param {string} props.token - JWT session authorization token.
 */
export default function AuditLogs({ token }) {
  // Log storage states
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15); // Logs per page

  // Filter conditions states
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch paginated audit logs from backend API
  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      let query = `?page=${page}&limit=${limit}`;
      if (moduleFilter) query += `&module=${moduleFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const response = await fetch(`http://localhost:5000/api/compliance/logs${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve compliance audit logs.');
      }

      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch logs when page or filters are updated
  useEffect(() => {
    fetchLogs();
  }, [page, moduleFilter, statusFilter]);

  // Export logs payload to local JSON file
  const handleExportLogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/compliance/logs/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate export file payload.');
      }

      // Convert response stream to file blob download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cert_in_audit_logs_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`Export Error: ${err.message}`);
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">CERT-In Compliance Audit Logs</h2>
          <p className="page-description">
            Standard security transaction records showing user actions, client IP traces, and operation status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Refresh Logs Button */}
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          {/* Export Logs Button (Downloads log file for compliance filing) */}
          <button className="btn btn-primary btn-sm" onClick={handleExportLogs}>
            <Download size={14} />
            Export Audit File
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>

        {/* Module select */}
        <div>
          <select 
            className="form-control" 
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', width: '180px' }}
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            disabled={loading}
          >
            <option value="">All Modules</option>
            <option value="AUTH">Authentication (AUTH)</option>
            <option value="ASSET_MANAGEMENT">Asset Inventory (ASSET)</option>
            <option value="USER_MANAGEMENT">User Profiles (USER)</option>
            <option value="COMPLIANCE">Compliance Registry</option>
          </select>
        </div>

        {/* Status select */}
        <div>
          <select 
            className="form-control" 
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', width: '150px' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            disabled={loading}
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILURE">Failure Only</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Total Log Entries: <strong>{total}</strong>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="table-container">
        {loading && logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Retrieving compliance records...
          </div>
        ) : error ? (
          <div className="alert alert-danger" style={{ margin: '1rem' }}>
            <ShieldCheck size={20} />
            <div>{error}</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No audit logs match current filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor (Email)</th>
                <th>Module</th>
                <th>Action & Endpoint</th>
                <th>Source IP Address</th>
                <th>User Agent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const date = new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{date}</td>
                    <td style={{ fontWeight: 500 }}>
                      {log.user ? (
                        log.user.email
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Anonymous</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-internal">{log.module}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                      {log.action}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ipAddress}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.userAgent}>
                      {log.userAgent}
                    </td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0 0.5rem' }}>
        <HardDrive size={14} />
        <span>CERT-In guidelines mandate keeping local logs for 180 days. All database entries are immutable.</span>
      </div>
    </div>
  );
}
