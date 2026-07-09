# AI Scaffolding & System Design: Compliant Asset Management System

This document outlines the detailed system design, compliance mappings, and implementation guidelines for the **Local Departmental IT Asset Management System**. It serves as an AI scaffolding document to guide the development of a secure, compliant web application utilizing React, Node.js (Express), Prisma ORM, and PostgreSQL.

---

## 1. Compliance Framework Matrix

To satisfy Indian legal and international security standards, the application must implement specific controls. Below is the mapping of compliance mandates to system features:

| Compliance Standard | Domain / Control | System Implementation Requirement | Target Components / Variables |
| :--- | :--- | :--- | :--- |
| **CERT-In (Indian Computer Emergency Response Team)** | **Log Retention & Security Incident Reporting** | Maintain secure logs of all system activities, logins, and changes for a minimum of 180 days. Logs must reside in India (local DB) and contain precise timestamp, user, source IP, action type, and status. | `AuditLog` database model, Express logging middleware, `req.ip` extraction, logs export functionality. |
| **DPDP Act, 2023 (India)** | **Data Fiduciary & Data Principal Rights** | Obtain explicit consent, minimize personal data collection, enable data correction, support the right to erasure (deletion/anonymization), and maintain a Data Protection Officer (DPO) contact. | `ConsentRecord` table, personal data fields anonymization utility (`anonymizeUser`), consent checkbox component in UI. |
| **RoPA (Record of Processing Activities)** | **Data Processing Inventory** | Maintain a structured record of what personal data is processed, the purpose of processing, category of data, retention period, and departments involved. | `RoPARecord` model/table, static RoPA registry API, admin compliance dashboard. |
| **ISO 27001:2022** | **A.5.9 - A.5.14: IT Asset Management** | Maintain an accurate inventory of assets with clear owners, classification labels, acceptable use verification, and lifecycle tracking (handover, maintenance, return). | `Asset` database model with fields: `classification`, `ownerId`, `acceptableUseSigned`, `status`, and lifecycle history. |

---

## 2. Directory & Architecture Structure

The application will follow a clean client-server mono-repository structure:

```text
cli-test1/
├── AI_SCAFFOLDING.md            # This compliance design & scaffolding document
├── backend/                     # Node.js + Express + Prisma API
│   ├── prisma/
│   │   └── schema.prisma        # Database schema including audit logs & compliance structures
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js          # Authentication and Role-based Access Control (RBAC)
│   │   │   └── auditLogger.js   # CERT-In compliant automatic request logger middleware
│   │   ├── routes/
│   │   │   ├── assets.js        # ISO 27001:2022 Asset management logic (CRUD)
│   │   │   ├── users.js         # DPDP consent, rights (erasure, edit) logic
│   │   │   ├── compliance.js    # RoPA records and compliance logs export API
│   │   │   └── auth.js          # Authentication and login endpoints
│   │   ├── utils/
│   │   │   └── compliance.js    # Anonymization and regulatory utility functions
│   │   └── index.js             # Express entry point
│   ├── .env                     # PostgreSQL connection URI and application secrets
│   └── package.json
└── frontend/                    # React SPA (Vite-based)
    ├── src/
    │   ├── components/
    │   │   ├── AssetForm.jsx    # Asset addition/editing with ISO classification
    │   │   ├── ConsentModal.jsx # DPDP consent verification modal
    │   │   ├── AuditLogs.jsx    # CERT-In compliance audit log viewer
    │   │   └── RopaRegister.jsx # RoPA compliance register visualization
    │   ├── App.jsx              # Routing and layout
    │   ├── index.css            # Premium CSS design system (Vanilla CSS)
    │   └── main.jsx
    └── package.json
```

---

## 3. Database Schema Specification (Prisma + PostgreSQL)

The schema must capture IT assets while fully incorporating auditability and data privacy flags.

```prisma
// backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  ASSET_MANAGER
  EMPLOYEE
}

enum AssetClassification {
  PUBLIC
  INTERNAL
  RESTRICTED
  CONFIDENTIAL
}

enum AssetStatus {
  PROCURED
  ALLOCATED
  MAINTENANCE
  DISPOSED
  LOST
}

model User {
  id                  String           @id @default(uuid())
  email               String           @unique
  name                String
  passwordHash        String
  role                Role             @default(EMPLOYEE)
  department          String
  
  // DPDP Compliance Fields
  hasConsented        Boolean          @default(false)
  consentTimestamp    DateTime?
  consentPurpose      String?          // e.g., "IT Asset Allocation and Authentication"
  isAnonymized        Boolean          @default(false) // Triggered under DPDP "Right to Erasure"
  
  // Relations
  assets              Asset[]          @relation("AssetOwner")
  auditLogs           AuditLog[]
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}

model Asset {
  id                  String              @id @default(uuid())
  assetTag            String              @unique // ISO 27001 Unique Labeling requirement
  name                String
  type                String              // e.g., Laptop, Server, Firewall, Mobile
  model               String
  serialNumber        String              @unique
  classification      AssetClassification @default(INTERNAL) // ISO 27001 Classification Requirement
  status              AssetStatus         @default(PROCURED)
  location            String
  
  // ISO 27001 Owner Assignee
  ownerId             String?
  owner               User?               @relation("AssetOwner", fields: [ownerId], references: [id])
  
  // ISO 27001 Acceptable Use Sign-Off
  acceptableUseSigned Boolean             @default(false)
  signOffDate         DateTime?

  // Lifecycle logs
  history             AssetHistory[]
  
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
}

model AssetHistory {
  id          String   @id @default(uuid())
  assetId     String
  asset       Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  action      String   // e.g., "ALLOCATED", "REPAIRED", "DECOMMISSIONED"
  performedBy String   // User email or ID
  description String
  timestamp   DateTime @default(now())
}

// CERT-In 180-Day Log Retention Requirement
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action      String   // e.g., "USER_LOGIN", "CREATE_ASSET", "DELETE_USER"
  module      String   // e.g., "AUTH", "ASSET_MANAGEMENT", "COMPLIANCE"
  ipAddress   String   // Target system IP (CERT-In mandate)
  userAgent   String   // Browser/client signature
  details     String   // Specific JSON or text payload changes
  status      String   // "SUCCESS" or "FAILURE"
  timestamp   DateTime @default(now())
}

// RoPA Compliance Registry Table
model RoPARecord {
  id                  String   @id @default(uuid())
  dataCategory        String   // e.g., "Employee Identity", "Auth Credentials"
  purpose             String   // e.g., "Inventory assignment and verification"
  processingActivity  String   // e.g., "Collection, storage, asset binding"
  sharingScope        String   // e.g., "Internal IT Department only (No external sharing)"
  retentionPeriod     String   // e.g., "Employment duration plus 1 year"
  securitySafeguards  String   // e.g., "Encrypted at rest, AES-256, access log auditing"
  updatedAt           DateTime @updatedAt
}
```

---

## 4. Back-End Implementation Instructions

### A. CERT-In Logging Middleware (`auditLogger.js`)
All incoming requests that mutate data or authenticate users must pass through an `auditLogger` middleware.
* **Variable Naming**: Use descriptive names like `ipAddress`, `userAgent`, `actionType`, `targetModule`.
* **Execution**: Resolve standard Express headers (handling proxies with `req.headers['x-forwarded-for'] || req.socket.remoteAddress`).
* **Storage**: Directly save to the `AuditLog` table using Prisma.

### B. DPDP Right to Erasure / Anonymization Utility (`compliance.js`)
Under the DPDP Act, users can withdraw consent and request data deletion. To maintain database integrity and historical audit logs (needed for CERT-In), we use anonymization rather than complete cascade deletions.
* **Function**: `anonymizeUser(userId)`
* **Process**:
  1. Retrieve the user.
  2. Set `isAnonymized = true`, `hasConsented = false`, and erase `consentTimestamp`.
  3. Replace `name` with `"Anonymized User " + userId.substring(0, 6)`.
  4. Replace `email` with `anonymized_email_` + random identifier.
  5. Clear password hash and sensitive personal details.
  6. Generate a CERT-In Audit Log indicating user data erasure compliance.

### C. ISO 27001 Asset Tracking Details
* **Asset Identification**: Every asset must generate a standard format `Asset Tag` (e.g., `DEPT-IT-2026-XXXX`).
* **Classification**: Assets require classification tags (Confidential, Restricted, Internal, Public).
* **Acceptable Use Checklist**: Asset allocation is not finalized until `acceptableUseSigned` is marked `true`, with a timestamp.

---

## 5. Front-End Design & Visual Guidelines (Premium Vanilla CSS)

To ensure high aesthetic standards and ease of access:
* **Color Palette**: Dark theme with high-contrast accentuation.
  - Primary Dark Background: `#0B0F19`
  - Card/Sect Background: `#151B2D`
  - Active Blue Accent: `#3B82F6` (Cyber security color)
  - Compliant Green: `#10B981`
  - Non-Compliant/Alert Amber: `#F59E0B`
* **Typography**: Outfit or Inter Google Fonts for modern tech appearance.
* **Layout**: Sticky left sidebar navigation. Right side displays responsive card grids and interactive line charts/data tables.
* **Micro-Animations**: Custom CSS hover scales (`transform: translateY(-2px)`), button transitions (`transition: all 0.3s ease`).

---

## 6. Implementation Milestones

1. **Phase 1: Environment Setup**
   * Setup workspace directory structures for `/backend` and `/frontend`.
   * Configure `package.json` for Express (with scripts, cors, dotenv, helmet, prisma client) and Vite React.
   * Initialize local PostgreSQL and run Prisma migrations.
   * Populate default RoPA records in seed script.

2. **Phase 2: Secure Backend API**
   * Implement core authentication (JWT with bcrypt).
   * Implement Express `auditLogger` middleware tracking IP addresses.
   * Implement CRUD endpoints for `assets` and `users` (specifically DPDP consent management and anonymization).

3. **Phase 3: Front-End UI Assembly**
   * Create CSS styling foundation (`index.css`) containing variables, typography, and dark-mode designs.
   * Implement UI dashboard displaying:
     - ISO 27001 Asset inventory grid.
     - CERT-In compliance audit log viewer (paginated, filtering failed attempts).
     - DPDP User management, consent management, and erasure request interface.
     - RoPA register visualization detailing active processing activities.

4. **Phase 4: Compliance Verification**
   * Run verification tests showing that log entries are immutable.
   * Validate that anonymization removes identifying details but keeps log audit trails intact.
