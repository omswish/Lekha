# AssetGuard: Compliant Local IT Asset Management System

AssetGuard is a local departmental IT inventory tracking web application built using **React**, **Node.js (Express)**, **Prisma ORM**, and **PostgreSQL**. The project is architected to fulfill the core controls of **ISO 27001:2022 (IT Asset Management)**, the **Indian CERT-In Cybersecurity Directives (180-day log retention)**, and the **Digital Personal Data Protection (DPDP) Act, 2023 (Consent registers and Right to Erasure anonymization)**.

---

## Compliance Implementations

### 1. ISO 27001:2022 Controls (A.5.9 - A.5.14)
* **A.5.9 (Inventory of Assets)**: Implements an asset register where all physical and logical components are identified, tagged with a unique identifier (`Asset Tag`), and registered.
* **A.5.12 (Classification of Information)**: Every asset is tagged with security classifications (`PUBLIC`, `INTERNAL`, `RESTRICTED`, `CONFIDENTIAL`).
* **A.5.10 (Acceptable Use)**: Asset allocation is blocked/marked pending until the organization confirms the assignee has signed the *IT Acceptable Use Policy*.

### 2. Indian CERT-In Guidelines
* **180-Day Log Retention**: The database logs all mutative database commands, authentication successes/failures, and administrator changes under the `AuditLog` table.
* **Client IP Mapping**: Request IP addresses are intercepted via middleware (`req.headers['x-forwarded-for'] || req.socket.remoteAddress`) and securely written alongside timestamp and browser user-agent signatures.
* **Immutable Logs**: Logs are read-only to normal clients (no PUT/DELETE endpoints provided) and exportable as standard JSON formats for external reporting.

### 3. DPDP Act, 2023 (India)
* **Explicit Consent (Sec 6)**: Implements first-login interception using a detailed Consent Notice Modal explaining the purpose, scope of processing, and details of the Data Protection Officer (DPO).
* **Right to Correction (Sec 11)**: Users can update/correct their details (Name) in the profile view.
* **Right to Erasure (Sec 12)**: If consent is withdrawn, the backend triggers an anonymization transaction: wiping personal identifiable information (PII) like name/email while preserving the database structure and audit trails. Associated hardware assets are automatically returned to inventory stock.

---

## Quick Start Guide

### Prerequisites
* **Node.js** (v18+)
* **NPM** (v9+)
* **PostgreSQL** local database server (Running on port 5432)

---

### Step 1: Database Setup
1. Ensure your PostgreSQL server is active.
2. Create a database named `asset_management_db`.
3. Open [backend/.env](file:///C:/Users/omkar.s/Code/cli-test1/backend/.env) and edit the connection details to match your local PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://[user]:[password]@localhost:5432/asset_management_db?schema=public"
   ```

---

### Step 2: Database Migration & Seeding
Navigate to the `/backend` folder and run the migration and seeding scripts:

```bash
cd backend

# Run Prisma schema migrations to set up PostgreSQL tables
npm run prisma:migrate

# Seed compliance tables, RoPA registry, and default test accounts
npm run db:seed
```

---

### Step 3: Run the Servers

#### 1. Start the Backend API
From the `/backend` folder:
```bash
# Starts Node Express server on http://localhost:5000 (hot reload active)
npm run dev
```

#### 2. Start the Frontend React Client
In a new terminal window, navigate to the `/frontend` folder:
```bash
cd frontend

# Install package lock assets
npm install

# Starts Vite React dev server on http://localhost:5173
npm run dev
```

---

## Pre-seeded Credentials for Testing
You can use the following default accounts to log in and inspect the compliance dashboards:

* **System Admin (Asset Manager & Compliance Lead)**:
  * **Email**: `admin.security@department.gov.in`
  * **Password**: `admin123`
  * *Features*: Full asset inventory CRUD, CERT-In audit log viewing, logs file exports, RoPA registry logging.

* **Departmental Employee (Data Principal)**:
  * **Email**: `rajesh.kumar@department.gov.in`
  * **Password**: `employee123`
  * *Features*: Profile view, assigned assets tracking, right to correction form, consent withdrawal (Right to Erasure trigger).
