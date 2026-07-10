// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, LogOut, LayoutDashboard, UserCheck, 
  BookOpen, History, PlusCircle, Edit, Trash2, Shield, User, HardDrive,
  CalendarCheck, ClipboardList, CheckSquare, Settings, GraduationCap, Activity, Users, Clipboard, Trash, Key, Layers, FileText, FileDigit
} from 'lucide-react';
import ConsentModal from './components/ConsentModal';
import AssetForm from './components/AssetForm';
import AuditLogs from './components/AuditLogs';
import RopaRegister from './components/RopaRegister';
import ComplianceTasks from './components/ComplianceTasks';
import NonConformances from './components/NonConformances';
import DocumentControl from './components/DocumentControl';
import IsmsRegisters from './components/IsmsRegisters';
import ChangeManagement from './components/ChangeManagement';
import TrainingAwareness from './components/TrainingAwareness';
import BcpRegisters from './components/BcpRegisters';
import SupplierPerformance from './components/SupplierPerformance';
import InternalAudits from './components/InternalAudits';
import MediaDisposal from './components/MediaDisposal';
import PasswordSecurity from './components/PasswordSecurity';
import LogReview from './components/LogReview';
import AdministrativeRegisters from './components/AdministrativeRegisters';
import DashboardView from './components/DashboardView';
import ChatbotWidget from './components/ChatbotWidget';
const ASSET_CATEGORY_LABELS = {
  LAPTOP: 'Laptop',
  DESKTOP: 'Desktop',
  PRINTER: 'Printer',
  MTR: 'MTR',
  KIOSK: 'Kiosk',
  SERVER: 'Server',
  STORAGE: 'Storage',
  TAPE_LIBRARY: 'Tape Library',
  SWITCH: 'Switch',
  ROUTER: 'Router',
  FIREWALL: 'Firewall',
  UPS: 'UPS',
  ACCESS_POINT: 'Access Point',
  VC_UNIT: 'VC Unit',
  DATA_CARD: 'Data Card',
  PROJECTOR: 'Projector',
  CONSUMABLE: 'Consumable',
  OTHER: 'Other'
};

function formatAssetCategory(asset) {
  const categoryLabel = ASSET_CATEGORY_LABELS[asset.category] || asset.category || asset.type || 'Other';
  if (asset.type && asset.type !== categoryLabel) {
    return `${categoryLabel} (${asset.type})`;
  }
  return categoryLabel;
}

const INVENTORY_STATUS_FILTER_OPTIONS = [
  { value: 'ACTIVE', label: 'Active / Allocated' },
  { value: 'ALL', label: 'All Statuses' },
  { value: 'INCOMPLETE', label: 'Incomplete Records' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'PROCURED', label: 'Procured / Stock' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'DISPOSED', label: 'Disposed' },
  { value: 'LOST', label: 'Lost' }
];

const ACTIVE_ASSET_STATUSES = new Set(['ALLOCATED']);

function matchesInventoryStatusFilter(asset, statusFilter) {
  if (statusFilter === 'ALL') {
    return true;
  }
  if (statusFilter === 'ACTIVE') {
    return ACTIVE_ASSET_STATUSES.has(asset.status);
  }
  if (statusFilter === 'INCOMPLETE') {
    return !!asset.isIncomplete;
  }
  return asset.status === statusFilter;
}





/**
 * Main Application Container: Orchestrates state, views, and compliance logic.
 * Incorporates:
 * - Session state (authorization token and user profile)
 * - Consent check intercepts (DPDP Act 2023)
 * - Navigation tabs (Asset Inventory, My Profile, RoPA Register, Compliance Tasks, Non-Conformances, CERT-In Logs)
 * - Annual physical verification audits (PRO 06)
 */
export default function App() {
  // Session credentials
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user')) || null);

  // Clear legacy localStorage to fix sticky sessions
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Sign-in inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // DPDP Consent interceptor state
  const [consentUser, setConsentUser] = useState(null);

  // Active tab navigation
  const [activeTab, setActiveTab] = useState('dashboard');


  // Inventory list storage
  const [assets, setAssets] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, allocated: 0, critical: 0, unverified: 0 });

  // Modal displays
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showBulkAssetForm, setShowBulkAssetForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Inventory filtering state
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('ALL');
  const [assetStatusFilter, setAssetStatusFilter] = useState('ACTIVE');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');

  // Employee profile states (Right to Correction)
  const [profileData, setProfileData] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Handle successful login or consent grants
  const handleAuthSuccess = (tokenValue, userValue) => {
    setToken(tokenValue);
    setUser(userValue);
    sessionStorage.setItem('token', tokenValue);
    sessionStorage.setItem('user', JSON.stringify(userValue));
    setConsentUser(null);
    setLoginError('');
  };

  // Perform clean session logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    setProfileData(null);
    setAssets([]);
    setAssetCategoryFilter('ALL');
    setAssetStatusFilter('ACTIVE');
    setAssetSearchQuery('');
    setShowBulkAssetForm(false);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  // Login Request
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.status === 202 && data.needsConsent) {
        // User needs to grant DPDP consent
        setConsentUser({ id: data.userId, email: data.email });
      } else if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      } else {
        handleAuthSuccess(data.token, data.user);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Consent Modal Success Handler
  const handleConsentGranted = (authData) => {
    handleAuthSuccess(authData.token, authData.user);
  };

  // Fetch IT Inventory register (PRO 06)
  const fetchInventoryData = async () => {
    if (!token) return;
    try {
      // 1. Fetch Assets
      const assetsRes = await fetch('http://localhost:5000/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assetsData = await assetsRes.json();
      if (assetsRes.ok) {
        setAssets(assetsData);
        // Calculate metrics
        const total = assetsData.length;
        const allocated = assetsData.filter(a => a.status === 'ALLOCATED').length;
        const critical = assetsData.filter(a => a.classification === 'CONFIDENTIAL').length;
        // Count unverified if next due date is overdue
        const unverified = assetsData.filter(a => a.nextVerificationDue && new Date(a.nextVerificationDue) < new Date()).length;
        setMetrics({ total, allocated, critical, unverified });
      } else {
        if (assetsRes.status === 401 || assetsRes.status === 403 || assetsRes.status === 404) {
          handleLogout();
          return;
        }
      }

      // 2. Fetch active users list for dropdowns (restricted to admin/manager)
      if (user && (user.role === 'ADMIN' || user.role === 'ASSET_MANAGER')) {
        const usersRes = await fetch('http://localhost:5000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) {
          setUsersList(usersData);
        } else {
          if (usersRes.status === 401 || usersRes.status === 403 || usersRes.status === 404) {
            handleLogout();
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard inventory:', err);
    }
  };

  // Fetch logged-in user profile details
  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfileData(data);
        setProfileName(data.name || '');
      } else {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error loading employee profile:', err);
    }
  };

  // Run fetch cycles upon state transitions
  useEffect(() => {
    if (token) {
      fetchInventoryData();
      fetchProfile();
    }
  }, [token, activeTab]);

  const availableAssetCategories = [
    'ALL',
    ...Array.from(new Set(assets.map(a => a.category).filter(Boolean))).sort()
  ];

  const normalizedSearch = assetSearchQuery.trim().toLowerCase();
  const filteredAssets = assets.filter(asset => {
    if (assetCategoryFilter !== 'ALL' && asset.category !== assetCategoryFilter) {
      return false;
    }
    if (!matchesInventoryStatusFilter(asset, assetStatusFilter)) {
      return false;
    }
    if (normalizedSearch) {
      const text = [
        asset.assetTag,
        asset.name,
        asset.model,
        asset.serialNumber,
        asset.status,
        asset.location,
        asset.type,
        asset.category,
        asset.owner?.name,
        asset.owner?.department
      ].filter(Boolean).join(' ').toLowerCase();
      if (!text.includes(normalizedSearch)) return false;
    }
    return true;
  });

  // Asset Decommissioning (Admin only)
  const handleDeleteAsset = async (id, tag) => {
    if (!window.confirm(`Are you sure you want to decommission and delete asset tag ${tag}?`)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchInventoryData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete asset.');
      }
    } catch (err) {
      console.error('Delete Asset error:', err);
    }
  };

  // Asset physical verification audit check-off (PRO 06)
  const handleVerifyAsset = async (id, tag) => {
    try {
      const response = await fetch(`http://localhost:5000/api/assets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verifyAction: true })
      });
      if (response.ok) {
        alert(`Physical verification check completed for asset tag ${tag}! Next due date extended.`);
        fetchInventoryData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to verify asset.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Profile Update (DPDP Right to Correction)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileName })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setProfileSuccess('Profile details corrected successfully (DPDP Section 11 compliance).');
      fetchProfile();
    } catch (err) {
      setProfileError(err.message);
    }
  };

  // DPDP Right to Erasure Account Anonymization
  const handleRightToErasure = async () => {
    const confirmMessage = `WARNING: EXERCISING YOUR RIGHT TO ERASURE WILL WIPE ALL YOUR PII IDENTIFIERS.\n\nAll allocated assets will be returned to inventory stock. You will be logged out and your account details anonymized.\n\nType 'CONFIRM ERASURE' to execute.`;
    const check = window.prompt(confirmMessage);
    if (check !== 'CONFIRM ERASURE') {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/erasure`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete erasure request.');
      }

      alert('Compliance operation successful. Your account has been anonymized.');
      handleLogout();
    } catch (err) {
      alert(`Erasure Request Failed: ${err.message}`);
    }
  };

  // Render Login Layout if not authenticated
  if (!token || !user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <ShieldCheck size={36} style={{ color: 'var(--accent-primary)' }} />
              <span>AssetGuard</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', marginTop: '0.5rem', fontWeight: 700 }}>Compliance & Asset Manager</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              ISMS Compliance Tracker & ISO 27001 / DPDP Portal
            </p>
          </div>

          {loginError && (
            <div className="alert alert-danger">
              <ShieldAlert size={20} />
              <div>{loginError}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Work Email ID</label>
              <input
                type="email"
                className="form-control"
                placeholder="username@adityabirla.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Secure Sign In'}
            </button>
          </form>

          {/* Seed credentials info */}
          <div style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            <h4 style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Demo Login Credentials:</h4>
            <div>• <strong>Admin (Auditor):</strong> ramanath.satapathy@adityabirla.com / <code>admin123</code></div>
            <div>• <strong>Manager (Audit):</strong> omkar.s@adityabirla.com / <code>manager123</code></div>
            <div>• <strong>Employee (Principal):</strong> purna.c.nayak@adityabirla.com / <code>employee123</code></div>
          </div>


        </div>

        {/* DPDP Consent notice interceptor */}
        {consentUser && (
          <ConsentModal
            userId={consentUser.id}
            email={consentUser.email}
            onConsentGranted={handleConsentGranted}
            onCancel={() => setConsentUser(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <Shield size={24} style={{ color: '#3b82f6' }} />
          <span>AssetGuard </span>
        </div>

        <nav>
          <ul className="nav-links">
            <div style={{ fontSize: '0.7rem', color: 'var(--sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '1rem 0.5rem 0.5rem 0.5rem', fontWeight: 700 }}>
              Inventory Stock
            </div>
            <li 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </li>
            <li 
              className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <HardDrive size={18} />
              Asset Inventory
            </li>


            <li 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserCheck size={18} />
              My Profile & Consent
            </li>

            <div style={{ fontSize: '0.7rem', color: 'var(--sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '1.25rem 0.5rem 0.5rem 0.5rem', fontWeight: 700 }}>
              Compliance Center
            </div>
            
            <li 
              className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText size={18} />
              Controlled Documents
            </li>

            <li 
              className={`nav-item ${activeTab === 'registers' ? 'active' : ''}`}
              onClick={() => setActiveTab('registers')}
            >
              <FileDigit size={18} />
              ISMS Registers
            </li>

            <li 
              className={`nav-item ${activeTab === 'changes' ? 'active' : ''}`}
              onClick={() => setActiveTab('changes')}
            >
              <Settings size={18} />
              Change Management
            </li>

            <li 
              className={`nav-item ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              <GraduationCap size={18} />
              Training & Awareness
            </li>

            <li 
              className={`nav-item ${activeTab === 'bcp' ? 'active' : ''}`}
              onClick={() => setActiveTab('bcp')}
            >
              <Activity size={18} />
              BCP & DR Drills
            </li>

            <li 
              className={`nav-item ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <Users size={18} />
              Supplier Performance
            </li>

            <li 
              className={`nav-item ${activeTab === 'auditing' ? 'active' : ''}`}
              onClick={() => setActiveTab('auditing')}
            >
              <Clipboard size={18} />
              Internal Auditing
            </li>

            <li 
              className={`nav-item ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <Trash size={18} />
              Media Disposal
            </li>

            <li 
              className={`nav-item ${activeTab === 'passwords' ? 'active' : ''}`}
              onClick={() => setActiveTab('passwords')}
            >
              <Key size={18} />
              Password Security
            </li>

            <li 
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <ClipboardList size={18} />
              Log Reviews
            </li>

            <li 
              className={`nav-item ${activeTab === 'administrative' ? 'active' : ''}`}
              onClick={() => setActiveTab('administrative')}
            >
              <Layers size={18} />
              Administrative Registers
            </li>










            <li 
              className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <CalendarCheck size={18} />
              Compliance Tasks
            </li>

            <li 
              className={`nav-item ${activeTab === 'nonconformances' ? 'active' : ''}`}
              onClick={() => setActiveTab('nonconformances')}
            >
              <ClipboardList size={18} />
              Non-Conformances
            </li>

            <li 
              className={`nav-item ${activeTab === 'ropa' ? 'active' : ''}`}
              onClick={() => setActiveTab('ropa')}
            >
              <BookOpen size={18} />
              RoPA Register
            </li>

            {/* Audit Logs (Admin Only) */}
            {user.role === 'ADMIN' && (
              <>
                <div style={{ fontSize: '0.7rem', color: 'var(--sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '1.25rem 0.5rem 0.5rem 0.5rem', fontWeight: 700 }}>
                  Security Audit
                </div>
                <li 
                  className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  <History size={18} />
                  CERT-In Audit Logs
                </li>
              </>
            )}
          </ul>
        </nav>


        {/* User Profile Badge */}
        <div className="user-badge">
          <div className="user-badge-name">{user.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="user-badge-role">{user.role}</span>
            <button 
              onClick={handleLogout} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
          {user.role === 'ADMIN' && (
            <a 
              href="http://localhost:5000/static/admin_user_manual.pdf" 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                fontSize: '0.75rem', 
                color: 'var(--accent-primary)', 
                textDecoration: 'underline', 
                fontWeight: 600,
                marginTop: '0.5rem' 
              }}
            >
              Admin Operations Manual (PDF)
            </a>
          )}
          {user.role === 'ASSET_MANAGER' && (
            <a 
              href="http://localhost:5000/static/manager_user_manual.pdf" 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                fontSize: '0.75rem', 
                color: 'var(--accent-primary)', 
                textDecoration: 'underline', 
                fontWeight: 600,
                marginTop: '0.5rem' 
              }}
            >
              Custodian Operations Manual (PDF)
            </a>
          )}
          {user.role === 'EMPLOYEE' && (
            <a 
              href="http://localhost:5000/static/employee_user_manual.pdf" 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                fontSize: '0.75rem', 
                color: 'var(--accent-primary)', 
                textDecoration: 'underline', 
                fontWeight: 600,
                marginTop: '0.5rem' 
              }}
            >
              Employee User Manual (PDF)
            </a>
          )}
        </div>


      </div>

      {/* Main Content Workspace */}
      <div className="main-content">

        {/* Tab 0: Home Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView token={token} user={user} setActiveTab={setActiveTab} />
        )}
        
        {/* Tab 1: Asset Inventory Grid */}
        {activeTab === 'inventory' && (

          <div>
            <div className="page-header">
              <div>
                <h2 className="page-title">Departmental Asset Register</h2>
                <p className="page-description">
                  Physical and logical IT assets registry under ISO 27001:2022 IT Asset Management controls.
                </p>
              </div>

              {(user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setShowBulkAssetForm(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Layers size={16} />
                    Bulk Register
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => { setSelectedAsset(null); setShowAssetForm(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <PlusCircle size={16} />
                    Register Asset
                  </button>
                </div>
              )}
            </div>

            {/* Stats Metrics Panel */}
            <div className="card-grid">
              <div className="card">
                <div className="card-title">Total IT Assets <HardDrive size={16} style={{ color: 'var(--accent-primary)' }} /></div>
                <div className="card-metric">{metrics.total}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Registered physical/logical units</div>
              </div>
              <div className="card">
                <div className="card-title">Allocated Assets <UserCheck size={16} style={{ color: 'var(--accent-success)' }} /></div>
                <div className="card-metric">{metrics.allocated}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Assigned to active employees</div>
              </div>
              <div className="card">
                <div className="card-title">Confidential Systems <ShieldCheck size={16} style={{ color: 'var(--accent-danger)' }} /></div>
                <div className="card-metric">{metrics.critical}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>High-security classification rated</div>
              </div>
              <div className="card">
                <div className="card-title">Verification Overdue <ShieldAlert size={16} style={{ color: 'var(--accent-warning)' }} /></div>
                <div className="card-metric" style={{ color: metrics.unverified > 0 ? 'var(--accent-danger)' : 'inherit' }}>
                  {metrics.unverified}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Assets needing yearly audit check</div>
              </div>
            </div>

            <div className="card inventory-toolbar">
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Inventory Filter
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Showing {filteredAssets.length} of {assets.length} assets
                </div>
              </div>

              <div className="inventory-toolbar-controls">
                <div className="inventory-toolbar-control inventory-search-control">
                  <label
                    htmlFor="asset-search-filter"
                    style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
                  >
                    Search
                  </label>
                  <input
                    id="asset-search-filter"
                    type="search"
                    className="form-control"
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Search by tag, name, model, serial..."
                  />
                </div>

                <div className="inventory-toolbar-control">
                  <label
                    htmlFor="asset-status-filter"
                    style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
                  >
                    Status
                  </label>
                  <select
                    id="asset-status-filter"
                    className="form-control"
                    value={assetStatusFilter}
                    onChange={(e) => setAssetStatusFilter(e.target.value)}
                  >
                    {INVENTORY_STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inventory-toolbar-control">
                  <label
                    htmlFor="asset-category-filter"
                    style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
                  >
                    Category
                  </label>
                  <select
                    id="asset-category-filter"
                    className="form-control"
                    value={assetCategoryFilter}
                    onChange={(e) => setAssetCategoryFilter(e.target.value)}
                  >
                    {availableAssetCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'ALL' ? 'All Categories' : (ASSET_CATEGORY_LABELS[cat] || cat)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Asset Table */}
            <div className="table-container">
              {filteredAssets.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No assets match the current search and filter selection.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Asset Name</th>
                      <th>Category</th>
                      <th>Serial Number</th>
                      <th>Classification</th>
                      <th>Status</th>
                      <th>Owner Assignee</th>
                      <th>Acceptable Use</th>
                      <th>Last Verified</th>
                      <th>Next Due Date</th>
                      {(user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const lastVerified = asset.lastVerifiedDate ? new Date(asset.lastVerifiedDate).toLocaleDateString('en-IN') : 'Never';
                      const nextDue = asset.nextVerificationDue ? new Date(asset.nextVerificationDue).toLocaleDateString('en-IN') : 'N/A';
                      const verificationOverdue = asset.nextVerificationDue && new Date(asset.nextVerificationDue) < new Date();

                      return (
                        <tr key={asset.id} style={{ borderLeft: verificationOverdue ? '3px solid var(--accent-danger)' : 'none' }}>
                          <td style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{asset.assetTag}</td>
                          <td style={{ fontWeight: 600 }}>{asset.name}</td>
                          <td style={{ fontSize: '0.85rem' }}>{formatAssetCategory(asset)}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{asset.serialNumber}</td>
                          <td>
                            <span className={`badge badge-${asset.classification.toLowerCase()}`}>
                              {asset.classification}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{asset.status}</span>
                          </td>
                          <td style={{ fontSize: '0.9rem' }}>
                            {asset.owner ? (
                              asset.owner.isAnonymized ? (
                                <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Anonymized</span>
                              ) : (
                                `${asset.owner.name} (${asset.owner.department})`
                              )
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Stock</span>
                            )}
                          </td>
                          <td>
                            {asset.ownerId ? (
                              <span className={`badge ${asset.acceptableUseSigned ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                {asset.acceptableUseSigned ? 'Signed' : 'Pending'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{lastVerified}</td>
                          <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            <span style={{ color: verificationOverdue ? 'var(--accent-danger)' : 'inherit' }}>
                              {nextDue}
                              {verificationOverdue && ' (Overdue)'}
                            </span>
                          </td>
                          {(user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                {/* Annual physical verification trigger check-off */}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center' }}
                                  onClick={() => handleVerifyAsset(asset.id, asset.assetTag)}
                                  title="Perform Annual Physical Verification Audit"
                                >
                                  <CheckSquare size={12} />
                                </button>
                                
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.3rem 0.5rem' }}
                                  onClick={() => { setSelectedAsset(asset); setShowAssetForm(true); }}
                                >
                                  <Edit size={12} />
                                </button>
                                
                                {user.role === 'ADMIN' && (
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    style={{ padding: '0.3rem 0.5rem' }}
                                    onClick={() => handleDeleteAsset(asset.id, asset.assetTag)}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Profile, Consent & Right to Erasure */}
        {activeTab === 'profile' && profileData && (
          <div style={{ maxWidth: '800px' }}>
            <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Personal Data Principal Profile</h2>
            <p className="page-description" style={{ marginBottom: '2rem' }}>
              DPDP Compliance Panel: View your processed data inventory, correct details, or exercise data erasure rights.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              
              {/* Profile Details Card (Right to Correction) */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                  Right to Correction & Information
                </h3>

                {profileError && (
                  <div className="alert alert-danger">
                    <ShieldAlert size={18} />
                    <div>{profileError}</div>
                  </div>
                )}

                {profileSuccess && (
                  <div className="alert alert-success">
                    <ShieldCheck size={18} />
                    <div>{profileSuccess}</div>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label className="form-label">System Account ID (UUID)</label>
                    <input type="text" className="form-control" value={profileData.id} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Work Email Address</label>
                    <input type="text" className="form-control" value={profileData.email} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Access Permissions Role</label>
                    <input type="text" className="form-control" value={profileData.role} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name (Editable under DPDP Sec 11)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input type="text" className="form-control" value={profileData.department} disabled style={{ opacity: 0.6 }} />
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                    Save Corrections
                  </button>
                </form>
              </div>

              {/* Consent & Erasure panel */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>
                  Consent Ledger & Account Deletion
                </h3>

                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Consent Status:</span>
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Active Grant</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Registered Date:</span>
                    <span>{profileData.consentTimestamp ? new Date(profileData.consentTimestamp).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Consent Purpose:</span>
                    <p style={{ fontStyle: 'italic', fontSize: '0.8rem', lineHeight: 1.3 }}>"{profileData.consentPurpose}"</p>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Withdraw Consent & Right to Erasure
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                    By withdrawing consent, your account profile will be permanently anonymized to remove PII. 
                    All active hardware assets currently assigned to you will return to general stock.
                  </p>
                  <button type="button" className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleRightToErasure}>
                    Exercise Right to Erasure
                  </button>
                </div>
              </div>

            </div>

            {/* My Allocated Assets table */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={16} style={{ color: 'var(--accent-primary)' }} />
                My Allocated IT Equipment (ISO 27001)
              </h3>

              {profileData.assets?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  No hardware or virtual assets are currently assigned to your profile.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Asset Name</th>
                      <th>Category</th>
                      <th>Classification</th>
                      <th>Status</th>
                      <th>Acceptable Use Sign-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.assets?.map((ass) => (
                      <tr key={ass.id}>
                        <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{ass.assetTag}</td>
                        <td style={{ fontWeight: 500 }}>{ass.name}</td>
                        <td>{ass.type}</td>
                        <td>
                          <span className={`badge badge-${ass.classification.toLowerCase()}`}>
                            {ass.classification}
                          </span>
                        </td>
                        <td>{ass.status}</td>
                        <td>
                          <span className={`badge ${ass.acceptableUseSigned ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {ass.acceptableUseSigned ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: Controlled Documents Master List */}
        {activeTab === 'documents' && (
          <DocumentControl token={token} role={user.role} />
        )}

        {/* Tab 4: Digitized operational registers */}
        {activeTab === 'registers' && (
          <IsmsRegisters token={token} user={user} />
        )}

        {/* Tab 5: Change Management Registry */}
        {activeTab === 'changes' && (
          <ChangeManagement token={token} user={user} />
        )}

        {/* Tab 6: Training & Awareness Registry */}
        {activeTab === 'training' && (
          <TrainingAwareness token={token} user={user} />
        )}

        {/* Tab 7: BCP & DR Drill Registry */}
        {activeTab === 'bcp' && (
          <BcpRegisters token={token} user={user} />
        )}

        {/* Tab 8: Supplier Performance reviews */}
        {activeTab === 'suppliers' && (
          <SupplierPerformance token={token} user={user} />
        )}

        {/* Tab 9: Internal Audits checklist */}
        {activeTab === 'auditing' && (
          <InternalAudits token={token} user={user} />
        )}

        {/* Tab 10: Media Disposal register */}
        {activeTab === 'media' && (
          <MediaDisposal token={token} user={user} />
        )}

        {/* Tab 11: Password Security & Access audits */}
        {activeTab === 'passwords' && (
          <PasswordSecurity token={token} user={user} />
        )}

        {/* Tab 12: Security Log audits & review register */}
        {activeTab === 'logs' && (
          <LogReview token={token} user={user} />
        )}

        {/* Tab 13: Administrative compliance registers (remaining 11 formats) */}
        {activeTab === 'administrative' && (
          <AdministrativeRegisters token={token} user={user} />
        )}

        {/* Tab 14: Compliance tasks sign-off calendar */}
        {activeTab === 'tasks' && (
          <ComplianceTasks token={token} role={user.role} />
        )}










        {/* Tab 6: Gaps Non-Conformances ledger */}
        {activeTab === 'nonconformances' && (
          <NonConformances token={token} role={user.role} />
        )}

        {/* Tab 7: RoPA Register */}
        {activeTab === 'ropa' && (
          <RopaRegister token={token} role={user.role} />
        )}

        {/* Tab 8: CERT-In Audit Logs (Admin Only) */}
        {activeTab === 'logs' && user.role === 'ADMIN' && (
          <AuditLogs token={token} />
        )}


      </div>

      {/* Asset Form Modal (Create or Edit Asset) */}
      {showAssetForm && (
        <AssetForm
          asset={selectedAsset}
          users={usersList}
          token={token}
          onSave={() => { setShowAssetForm(false); fetchInventoryData(); }}
          onCancel={() => setShowAssetForm(false)}
        />
      )}

      {/* Bulk Asset Form Modal */}
      {showBulkAssetForm && (
        <BulkAssetForm
          users={usersList}
          token={token}
          onSave={() => { setShowBulkAssetForm(false); fetchInventoryData(); }}
          onCancel={() => setShowBulkAssetForm(false)}
        />
      )}

      {/* Compliance Chatbot Assistant */}
      <ChatbotWidget token={token} setActiveTab={setActiveTab} />
    </div>
  );
}

