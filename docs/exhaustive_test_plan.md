# Comprehensive ISMS Compliance Test Plan (20-Point Check)

This plan outlines the testing strategy for verifying all 20 data entry forms, approval workflows, and compliance checks built into the **ISMS Compliance Tracker & Asset Manager**.

---

## 1. Authentication & Profiling Forms

### [Form 1] User Secure Sign In
* **Purpose**: Validate signed JWT sessions.
* **Fields**: Email (email), Password (string).
* **QA Validation**: Submit valid credentials $\to$ `200 OK` with JSON Web Token; invalid credentials $\to$ `401 Unauthorized`.

### [Form 2] DPDP Consent Modal
* **Purpose**: Capture explicit consent before account data processing.
* **Fields**: `userId` (UUID), `hasConsented` (boolean), `consentPurpose` (string).
* **QA Validation**: Accept consent $\to$ `200 OK` + saves consent metadata in the user profile; decline $\to$ blocks login.

### [Form 3] Profile Correction Form (DPDP Section 11)
* **Purpose**: Allow principals to correct details.
* **Fields**: `name` (string).
* **QA Validation**: Submit update $\to$ `200 OK`, updates the user's name, and logs correction events to audit tables.

### [Form 4] Right to Erasure Form (DPDP Section 12)
* **Purpose**: Principal account anonymization.
* **Fields**: Confirmation prompt string match (`CONFIRM ERASURE`).
* **QA Validation**: Submit erasure request $\to$ `200 OK` + anonymizes name/email to randomized hash, returns allocated assets to stock, and revokes login rights.

---

## 2. IT Asset Management Forms (PRO 06 & POL 09)

### [Form 5] Register IT Asset Form
* **Purpose**: Log inventory devices with classification levels.
* **Fields**: `name` (string), `type` (LT/DT/PR/SE/ST/TL/SW/RT/FW), `model` (string), `serialNumber` (string), `classification` (PUBLIC/INTERNAL/CONFIDENTIAL), `location` (string).
* **QA Validation**: Submit details $\to$ `201 Created` + auto-generates tag prefix (e.g. `UAIL/IT/FW/nnnn`) and sets physical verification due date to +365 days.

### [Form 6] Physical Verification Audit Action
* **Purpose**: Record annual physical inventory checks.
* **Fields**: `verifyAction` (boolean).
* **QA Validation**: Submit verify click $\to$ `200 OK`, updates `lastVerifiedDate` to today, extends `nextVerificationDue` by 365 days, and logs a `VERIFIED` activity to `AssetHistory`.

---

## 3. Document Control Forms (PRO 01 / FMT 04)

### [Form 7] Document Change Note (DCN) Form
* **Purpose**: Digitally sign and publish policies/procedures.
* **Fields**: `docCode` (string), `title` (string), `type` (POLICY/PROCEDURE/FORMAT/MANUAL), `version` (string), `owner` (string), `effectiveDate` (date), `reviewCycleMonths` (integer), `changeSummary` (string).
* **QA Validation**: Submit version revision $\to$ `201 Created` + updates Master List (FMT 01), sets next review date, and appends the DCN change history.

---

## 4. Compliance Audits & Non-Conformances (PRO 10 / PRO 03)

### [Form 8] Compliance Task Check-off Form
* **Purpose**: Record routine compliance task verification audits.
* **Fields**: `status` (COMPLIANT/NON_CONFORMANCE), `notes` (string), `evidenceUrl` (string).
* **QA Validation**: Submit check-off $\to$ `201 Created` + logs report log, updates checklist scheduler status, and updates the next scheduled audit due date.

### [Form 9] Log Non-Conformance (NCR) Form
* **Purpose**: Document gaps and auditor deviations (FMT 13).
* **Fields**: `source` (AUDIT/CHECK), `description` (string), `severity` (MINOR/MAJOR), `targetClosureDate` (date), `taskId` (UUID).
* **QA Validation**: Submit gap report $\to$ `210 Created` + creates active NC ledger item with status `OPEN`.

### [Form 10] Corrective Action Request (CAR) Closure Form
* **Purpose**: Close resolved gaps (FMT 14).
* **Fields**: `correctiveAction` (string).
* **QA Validation**: Submit CAR details $\to$ `200 OK` + updates NC status to `CLOSED` and stamps closure date.

---

## 5. Digitized ISMS Operational Registers

### [Form 11] Risk Assessment Form (FMT 06)
* **Purpose**: Document process risks and treatment controls.
* **Fields**: `assetOrProcess` (string), `threat` (string), `vulnerability` (string), `impactScore` (1-5), `likelihoodScore` (1-5), `treatmentStrategy` (MITIGATE/ACCEPT/AVOID/TRANSFER), `treatmentPlan` (string), `targetDate` (date), `owner` (string).
* **QA Validation**: Submit risk $\to$ `201 Created` + calculates Risk Score (Impact $\times$ Likelihood) and creates treatment tracker.

### [Form 12] Access Request Form (FMT 08)
* **Purpose**: Request system permissions.
* **Fields**: `systemName` (string), `accessType` (READ/WRITE/ADMIN), `justification` (string).
* **QA Grey-box Validation**: Submit access form $\to$ `201 Created` + logs pending request (`PENDING`).

### [Form 13] Access Request Approval Form (FMT 32)
* **Purpose**: Approve request and log action taken.
* **Fields**: `status` (APPROVED/REJECTED), `actionTaken` (USER_ID_CREATED/PERMISSIONS_GRANTED).
* **QA Validation**: Submit approval $\to$ `200 OK` + updates access request status.

### [Form 14] Log Security Incident Form (FMT 20)
* **Purpose**: Report security incidents.
* **Fields**: `dateOccurred` (date), `location` (string), `description` (string), `severity` (MINOR/MAJOR/CRITICAL), `containmentAction` (string).
* **QA Validation**: Submit incident $\to$ `201 Created` + logs incident with status `OPEN`.

### [Form 15] Incident Evaluation & CAR Form (FMT 21)
* **Purpose**: Evaluate root cause and close incident.
* **Fields**: `rootCause` (string), `correctiveAction` (string).
* **QA Validation**: Submit details $\to$ `200 OK` + updates status to `CLOSED` and logs root cause.

### [Form 16] Visitor Entry Log Form (FMT 22)
* **Purpose**: Log physical security visitor access.
* **Fields**: `visitorName` (string), `organization` (string), `purpose` (string), `areaAccessed` (OFFICE/SERVER_ROOM), `badgeNumber` (string).
* **QA Validation**: Submit visitor $\to$ `201 Created` + logs timestamp entry.

### [Form 17] Visitor Exit Sign-out Action
* **Purpose**: Record visitor departure.
* **Fields**: Click trigger (updates exit timestamp).
* **QA Validation**: Sign out click $\to$ `200 OK` + saves current timestamp in `timeOut`.

### [Form 18] Log Backup Status Form (FMT 36)
* **Purpose**: Record routine server backup states.
* **Fields**: `systemName` (string), `backupType` (FULL/INCREMENTAL), `status` (SUCCESS/FAILED), `storageLocation` (string).
* **QA Validation**: Submit log $\to$ `201 Created` + saves backup entry as untested.

### [Form 19] Backup Restoration Test Form (FMT 35)
* **Purpose**: Audit recovery of backups.
* **Fields**: `restorationStatus` (SUCCESS/FAILED), `restorationNotes` (string).
* **QA Validation**: Submit test $\to$ `200 OK` + marks restoration tested.

### [Form 20] Log Patch Audit Form (FMT 26)
* **Purpose**: Audit vulnerability patching.
* **Fields**: `serverName` (string), `patchId` (string), `criticality` (CRITICAL/HIGH/MEDIUM/LOW), `status` (INSTALLED/PENDING/REJECTED), `remediationPlan` (string).
* **QA Validation**: Submit patch log $\to$ `201 Created` + saves patch state.
