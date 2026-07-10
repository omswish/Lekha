// backend/scratch/generate_role_manuals.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Common styles & colors
const primaryColor = '#e65f00'; // Dark Orange Maximo style
const secondaryColor = '#222222'; // Charcoal text
const mutedColor = '#5e5e5e'; // Slate text

function createPageHeader(doc, title) {
  doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(title, 50, 50);
  doc.rect(50, 75, 512, 1).fill(primaryColor);
  doc.y = 95;
}

// =========================================================================
// 1. GENERATE ADMIN USER MANUAL
// =========================================================================
const adminDoc = new PDFDocument({ margin: 50 });
const adminStream = fs.createWriteStream(path.join(publicDir, 'admin_user_manual.pdf'));
adminDoc.pipe(adminStream);

// Cover
adminDoc.rect(0, 0, 612, 792).fill('#fbfaf7');
adminDoc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text('ADMINISTRATIVE OPERATIONS MANUAL', 50, 200, { align: 'center' });
adminDoc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold').text('Lekha Auditor & Compliance Portal', 50, 240, { align: 'center' });
adminDoc.rect(100, 280, 412, 3).fill(primaryColor);
adminDoc.fillColor(mutedColor).fontSize(11).font('Helvetica').text('Internal Audit Controls, CERT-In Logs, and Security Administration', 50, 315, { align: 'center' });
adminDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text('System Role: ADMIN (Auditor)\nPublished: July 2026\nCorporate Auditing Division', 50, 600, { align: 'center' });

// Page 2: Table of Contents & Introduction
adminDoc.addPage();
createPageHeader(adminDoc, '1. Introduction & Security Administration');
adminDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'As an Administrator (Auditor) on the Lekha portal, you are responsible for monitoring data processing compliance, signing off corrective actions, and auditing platform logs.\n\n' +
  'Key Responsibilities:\n' +
  '• Reviewing Indian CERT-In security audit logs to trace unauthorized activities.\n' +
  '• Approving or rejecting employee logical access requests (FMT 08/32).\n' +
  '• Logging format amendments, applicable legislations, and stakeholder communication matrices.\n' +
  '• Auditing the effectiveness of deployed security controls (FMT 40).\n' +
  '• Monitoring open non-conformances (NCR) and closing corrective action requests (CAR).',
  50, 100, { width: 512, align: 'justify' }
);

// Page 3: Key Workflows
adminDoc.addPage();
createPageHeader(adminDoc, '2. Core Administrative Workflows');
adminDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'Workflow A: Access Approval (FMT 32)\n' +
  '1. Navigate to the "Access Requests" section under the ISMS Registers tab.\n' +
  '2. Select a pending employee request and audit the business justification.\n' +
  '3. Click "Approve Access" and assign the access card or logical credentials.\n\n' +
  'Workflow B: Logging Non-Conformances (FMT 13/14 NCR)\n' +
  '1. When an internal audit schedules findings, open the Non-Conformances tab.\n' +
  '2. Create an NCR ticket detailing the observed gaps, severity, and target closure dates.\n' +
  '3. Once the custodian completes mitigation, verify the closure to resolve the corrective action request (CAR).\n\n' +
  'Workflow C: Security Audit Log Reviews\n' +
  '1. Open the "CERT-In Audit Logs" tab under the sidebar.\n' +
  '2. Ensure security logs are reviewed weekly. Filter by user activity or operation to trace deviations.',
  50, 100, { width: 512, align: 'justify' }
);

adminDoc.end();

// =========================================================================
// 2. GENERATE ASSET MANAGER MANUAL
// =========================================================================
const managerDoc = new PDFDocument({ margin: 50 });
const managerStream = fs.createWriteStream(path.join(publicDir, 'manager_user_manual.pdf'));
managerDoc.pipe(managerStream);

// Cover
managerDoc.rect(0, 0, 612, 792).fill('#fbfaf7');
managerDoc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text('ASSET CUSTODIAN MANUAL', 50, 200, { align: 'center' });
managerDoc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold').text('Lekha Inventory & Operations Portal', 50, 240, { align: 'center' });
managerDoc.rect(100, 280, 412, 3).fill(primaryColor);
managerDoc.fillColor(mutedColor).fontSize(11).font('Helvetica').text('IT Asset Lifecycle, Patch Audits, and Backup Registries', 50, 315, { align: 'center' });
managerDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text('System Role: ASSET_MANAGER (Custodian)\nPublished: July 2026\nCorporate Auditing Division', 50, 600, { align: 'center' });

// Page 2: Intro & Custodian Duties
managerDoc.addPage();
createPageHeader(managerDoc, '1. Custodian Operations Overview');
managerDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'As an Asset Manager (Custodian), you oversee the physical and logical IT assets of the department. Your actions are governed by ISO 27001 Controls A.5.9 (Inventory) and A.8.10 (Information Deletion).\n\n' +
  'Key Responsibilities:\n' +
  '• Registering physical IT assets, servers, switches, and client hardware.\n' +
  '• Assigning owners to equipment and tracking physical verification audits.\n' +
  '• Logging daily backup status charts (FMT 36) and quarterly restoration test audits (FMT 35).\n' +
  '• Monitoring server OS patch compliance levels (FMT 26).\n' +
  '• Onboarding third-party suppliers and tracking performance star ratings.',
  50, 100, { width: 512, align: 'justify' }
);

// Page 3: Workflows
managerDoc.addPage();
createPageHeader(managerDoc, '2. Inventory & Operations Workflows');
managerDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'Workflow A: Asset Onboarding & Lifecycle Management\n' +
  '1. Navigate to "Asset Inventory" in the sidebar.\n' +
  '2. Click "Register Asset" and fill out the serial number, model, classification, and location.\n' +
  '3. Upon assigning an owner, print the acceptable use declaration form.\n\n' +
  'Workflow B: Media Disposal Destruction (FMT 44/45)\n' +
  '1. Go to the Media Disposal section and inspect pending employee disposal requests.\n' +
  '2. Verify that the asset tag matches the information inventory database.\n' +
  '3. Approve the request, perform degaussing or physical shredding, and log witness signatures.\n\n' +
  'Workflow C: Backup Restoration Logs\n' +
  '1. Record daily system backups under the Backups tab.\n' +
  '2. Quarterly, restore a test image to staging. Log restoration success and recovery speeds.',
  50, 100, { width: 512, align: 'justify' }
);

managerDoc.end();

// =========================================================================
// 3. GENERATE EMPLOYEE USER MANUAL
// =========================================================================
const empDoc = new PDFDocument({ margin: 50 });
const empStream = fs.createWriteStream(path.join(publicDir, 'employee_user_manual.pdf'));
empDoc.pipe(empStream);

// Cover
empDoc.rect(0, 0, 612, 792).fill('#fbfaf7');
empDoc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text('EMPLOYEE COMPLIANCE MANUAL', 50, 200, { align: 'center' });
empDoc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold').text('Lekha Personal Data Protection Portal', 50, 240, { align: 'center' });
empDoc.rect(100, 280, 412, 3).fill(primaryColor);
empDoc.fillColor(mutedColor).fontSize(11).font('Helvetica').text('Data Subject Rights, Access Requests, and Profile Security', 50, 315, { align: 'center' });
empDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text('System Role: EMPLOYEE (Data Principal)\nPublished: July 2026\nCorporate Auditing Division', 50, 600, { align: 'center' });

// Page 2: Intro & Principal Rights
empDoc.addPage();
createPageHeader(empDoc, '1. Privacy Compliance & Personal Rights');
empDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'As an Employee (Data Principal) under the Indian DPDP Act 2023, you have rights regarding the collection and processing of your personal data.\n\n' +
  'Your DPDP Rights on the Platform:\n' +
  '• Right to Information: Review why the company processes your work email ID (audit trails & device allocations).\n' +
  '• Right to Correction (Section 11): Correct spelling or details in your profile name under the Profile tab.\n' +
  '• Right to Erasure (Section 12): Purge all personal identifier records from the active asset tracker database upon resignation or contract termination.\n' +
  '• Logical Access Requests: File access requests for storage devices or systems.',
  50, 100, { width: 512, align: 'justify' }
);

// Page 3: Workflows
empDoc.addPage();
createPageHeader(empDoc, '2. Access & Training Workflows');
empDoc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'Workflow A: Submitting Access Requests (FMT 08)\n' +
  '1. Open the "ISMS Registers" tab and select "Access Requests" subtab.\n' +
  '2. Click "Create Request" and type the system name, read/write permissions needed, and justification.\n' +
  '3. Monitor the status. Once approved, the admin will active your card access.\n\n' +
  'Workflow B: Executing Profile Corrections (DPDP Sec 11)\n' +
  '1. Navigate to the "My Profile & Consent" sidebar link.\n' +
  '2. Update your profile name and click "Correct Details". Your updated record will immediately update the database.\n\n' +
  'Workflow C: Right to Erasure Account Purge\n' +
  '1. Under the Profile tab, click "Request Data Erasure".\n' +
  '2. Type "CONFIRM ERASURE" in the blocking browser prompt.\n' +
  '3. All allocated assets will automatically return to the corporate stock pool, your account details will be scrubbed, and you will be logged out.',
  50, 100, { width: 512, align: 'justify' }
);

empDoc.end();

console.log('Role-specific user manuals generated successfully.');
