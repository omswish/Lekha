# ISMS Digitization User Journeys Registry

This registry documents all role-based compliance workflows, forms, and registers implemented across the digitized ISMS application.

---

## 1. Admin Journeys (Ramanath Satapathy)

The Admin oversees security governance, auditing, approvals, and incident closures:

### Journey A: Internal Auditing & NCRs (PRO 05 / FMT 09/10/11/54)
1. **Schedule**: Admin logs in and opens the *Internal Auditing* panel to schedule a new departmental audit program (**FMT 09/10**).
2. **Execute Checklist**: Audits target operational processes, logging checklists, evidence observed, and compliance status (**FMT 11/54**).
3. **Link NCR**: If a gap is found, marks it `NON_CONFORMANCE`, prompting the input of a standard NCR log reference code (**FMT 13**).
4. **Final Sign-off**: Finalizes and completes the audit program to publish the report.
5. **NC Closure**: Navigates to *Compliance Tasks / NCRs* to log corrective actions (CAR **FMT 14**) and close out outstanding non-conformances.

### Journey B: Identity & Password Security (PRO 21 / FMT 08/31/33)
1. **Access Approval**: Navigates to *Access Requests* to approve or reject pending system privilege tickets (**FMT 08**).
2. **Quarterly Audit**: Opens *Password Security* and runs a quarterly User ID Revalidation check (**FMT 33**). Logs user access levels, verifies if they are still authorized, and records corrective actions (e.g. "Downgraded Access" or "Retained").
3. **Credential Tracking**: Reviews the list of rotational password resets (**FMT 31**) logged by corporate users.

### Journey C: Document Control & Approval (PRO 01 / FMT 01/02/04)
1. **Register Document**: Opens *Document Control* to add new ISMS policies or operational procedures (**FMT 01/02**).
2. **Update Version**: Modifies existing documents, logging a Document Change Note (DCN **FMT 04**) detail.
3. **Approve Draft**: Sets status to `APPROVED` to release the document.

### Journey D: Risk Governance (PRO 07 / FMT 06/07)
1. **Register Risk**: Opens *Risk Assessment* to list corporate threat vectors (**FMT 06**).
2. **Assess Score**: Inputs impact and likelihood scores (1 to 5 scale) to auto-calculate the risk score.
3. **Treatment Plan**: Logs mitigation plans, assignees, target dates, and updates status once controls are implemented (**FMT 07**).

---

## 2. Asset Manager Journeys (Omkar S)

The Asset Manager handles physical security, operational logs, backups, BCPs, and vendor relations:

### Journey A: Asset Lifecycle (PRO 06 / FMT 52/55)
1. **Procure**: Registers new IT assets (laptops, servers, switches) with unique asset tags (**FMT 52**).
2. **Allocate**: Assigns devices to employees, tracking device statuses.
3. **Audit**: Logs annual verification checks, acceptable use policy signoffs, and maintenance histories (**FMT 55**).

### Journey B: Physical Security & Logs (PRO 11 / PRO 12 / FMT 22/23/49/50)
1. **Visitor Escort**: Opens *Visitor Logs* to register physical vendors visiting secure facilities, stamping entry times and escorting hosts (**FMT 22/23**). Stamps checkout times upon exit.
2. **Review Logs**: Opens *Log Reviews* to perform weekly/monthly security log audits (**FMT 49/50**). If anomalous failed logins are spotted, toggles "deviations observed" to document router blocking/firewall rules.

### Journey C: BCP & DR Drills (PRO 05 / FMT 29/30)
1. **Schedule Drills**: Opens *BCP Drills* to schedule simulation recovery drills (**FMT 29**).
2. **Verify Recovery**: Logs actual recovery time metrics (RTO/RPO), checking off success criteria and participant sign-offs (**FMT 30**).

### Journey D: Backups & Patches (PRO 05 / PRO 20 / FMT 26/34/35/36)
1. **Log Backups**: Registers backup logs (Full/Incremental), noting storage locations (**FMT 34/36**).
2. **Restoration Test**: Toggles restoration flags to document recovery times and status notes (**FMT 35**).
3. **Audit Patches**: Opens *Patch Audits* to record OS patch levels, flagging CVE fixes and remediation paths (**FMT 26**).

### Journey E: Supplier Relations (PRO 23 / FMT 24)
1. **Onboard Supplier**: Adds third-party service providers.
2. **Rate Performance**: Performs periodic audits on vendor performance, scoring quality, delivery, and security parameters (**FMT 24**).

---

## 3. Employee Journeys (Purna C Nayak)

Employees perform standard compliance inputs, log resets, and mark privacy consent forms:

### Journey A: DPDP Consent Intercept (POL 07)
1. **Login Check**: Log in as Employee.
2. **Consent Notice**: A pop-up intercept modal blocks operation. The user reads the DPDP consent text detailing why corporate personal data is processed.
3. **Accept**: Click "I Consent" to register a timestamped consent record in the database before proceeding to the dashboard.

### Journey B: Submitting Access Request (PRO 21 / FMT 08)
1. **Create Ticket**: Opens *Access Requests* to submit a request for target systems (e.g. "Active Directory" or "Production DB").
2. **Track Status**: Awaits Admin approval sign-off.

### Journey C: Training & Awareness (PRO 02 / FMT 16/17/18/19)
1. **Attendance**: Joins scheduled security training sessions.
2. **Submit Feedback**: Evaluates training quality, rating the trainer and logging feedback remarks (**FMT 18**).
3. **Take Exams**: Completes post-training compliance assessments, logging scores and PASS/FAIL marks (**FMT 19**).

### Journey D: Password Rotations (PRO 21 / FMT 31)
1. **Reset Password**: Rotates corporate passwords.
2. **Log Reset**: Navigates to *Password Security* and clicks "Log Password Reset", selecting reset reasons to maintain audit log compliance.
