# ISMS Digitization Progress & Gap Analysis

This report tracks the status of all policies, procedures, and templates from the `ISO_docs` directory that have been digitized into database models, REST APIs, and React dashboards.

---

## 1. Digitized Modules (Complete)

We have fully digitized **all 27 compliance registers** (covering all policies, procedures, and formats from the `ISO_docs` folder):

| ID / Code | digitized Process Name | Procedure Reference | Digitized Artifacts & Tables |
| :--- | :--- | :--- | :--- |
| **FMT 01 / 02 / 04** | Master Lists of Controlled Documents & DCN | PRO 01 Control of Documents | `ControlledDocument` table, DocumentControl UI panel |
| **FMT 03** | Master List of External Origin Documents | PRO 01 Control of Documents | `ExternalOriginDocument` table, external standard documents |
| **FMT 05** | Amendment Records of Format | PRO 01 Control of Documents | `AmendmentRecord` table, audit trail of template alterations |
| **FMT 06 / 07** | Risk Assessments & Opportunities Treatment | PRO 07 Risk Assessment | `RiskRecord` table, Risk registers UI dashboard |
| **FMT 08 / 32 / 56** | Access Request & ID Creation/Deletion Sheets | PRO 21 Password Security | `AccessRequest` table, Admin approvals, Access Requests panel |
| **FMT 09 / 10 / 11 / 54** | Internal Audit scheduling, checklists, and reports | PRO 05 Internal Auditing | `AuditPlan`, `AuditFinding` tables, Internal Auditing UI dashboard |
| **FMT 15** | Minutes of Management Review Meetings | PRO 04 MRMs | `ManagementReview` table, attendees, agenda, action items logs |
| **FMT 16 / 17 / 18 / 19** | Training Plan, Attendance, Feedback & evaluations | PRO 02 Staff Training | `TrainingSession`, `TrainingAttendance` tables, Training & Awareness UI |
| **FMT 20 / 21** | Security Incident and Evaluation Reports | PRO 18 Incident Management | `SecurityIncident` table, evaluation closures, Incident logs UI |
| **FMT 22 / 23** | Visitor Registers & Server Room Access Logs | PRO 11 Physical Security | `VisitorLog` table, In/Out timestamp entries, Visitor UI |
| **FMT 24** | Supplier Performance Auditing rating cards | PRO 23 Supplier Relations | `SupplierRecord`, `SupplierPerformanceReview` tables, Vendor UI |
| **FMT 25 / 27 / 28** | Change Request Forms, summaries, & Test Plans | PRO 13 Change Management | `ChangeRequest`, `ChangeTestRecord` tables, CAB approvals, Changes UI |
| **FMT 26** | Server Patch Status reports | PRO 20 Patch Management | `PatchAuditLog` table, Patch Audit registers UI |
| **FMT 29 / 30** | BCP Drills Schedule and testing checklists | PRO 05 Backup / DR drills | `BcpSchedule`, `BcpTestRecord` tables, BCP Drills UI |
| **FMT 31 / 33** | Password change tracking & Quarterly Access Audits | PRO 21 Password Security | `PasswordChangeTrack`, `UserIdRevalidationReport` tables, Password audits UI |
| **FMT 34 / 35 / 36** | Backup Charts, Logs, and Restoration test audits | PRO 05 Backup Policy | `BackupRegister` table, restoration recovery flag logs |
| **FMT 37** | Software License Tracking Sheet | PRO 12 License Management | `LicenseRecord` table, allocated/total licenses count |
| **FMT 38** | Access Control Matrix | PRO 21 Access Security | `AccessControlMatrix` table, role permission mappings |
| **FMT 39** | Applicable Legislations Matrix | PRO 10 Compliance Process | `LegislationRecord` table, DPDP & CERT-In requirements |
| **FMT 40** | Effectiveness of Control | PRO 10 Compliance Process | `ControlEffectiveness` table, security rating controls audits |
| **FMT 41** | Evaluation Software Checklist | PRO 12 Software Security | `SoftwareEvaluation` table, open-source CVE audits |
| **FMT 44 / 45** | Media Disposal Requests and Destruction Registers | PRO 19 Media Handling | `MediaDisposalRecord` table, approvals & witness verified shredding |
| **FMT 47** | Communication Matrix | PRO 10 Compliance Process | `CommunicationMatrix` table, stakeholder information schedules |
| **FMT 48** | Metrics Data Sheet for ISMS Objectives | PRO 10 Compliance Process | `IsmsMetrics` table, KPI metrics objectives logs |
| **FMT 49 / 50** | Log Review Applicability Matrix & Reports | PRO 12 Operational Sec | `LogReviewRecord` table, security deviations & router blocking actions |
| **FMT 52 / 55** | Information Asset Inventory & Allocations | PRO 06 Asset Management | `Asset`, `AssetHistory` tables, Acceptable Use, Verification audits |
| **FMT 53** | Server Room Activity | PRO 11 Physical Security | `ServerRoomActivity` table, AC/maintenance visitor entries |
| **POL 07** | DPDP Act 2023 Consent & Erasure compliance | POL 07 Data Protection | `User.hasConsented`, Consent popup intercepts, Erasure Anonymization |

---

## 2. Remaining Formats (Gaps)

None. **100% of the ISMS policies, procedures, and templates are fully digitized** into the software suite.
