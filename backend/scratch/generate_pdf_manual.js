// backend/scratch/generate_pdf_manual.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const pdfPath = path.join(publicDir, 'help_manual.pdf');
const doc = new PDFDocument({ margin: 50 });

const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Styles & Colors
const primaryColor = '#e65f00'; // Dark Orange Maximo style
const secondaryColor = '#222222'; // Charcoal text
const mutedColor = '#5e5e5e'; // Slate text

// Title Page
doc.rect(0, 0, 612, 792).fill('#fbfaf7'); // Cream cover page

doc.fillColor(primaryColor).fontSize(28).font('Helvetica-Bold')
   .text('COMPLIANCE & LEKHA PORTAL', 50, 200, { align: 'center' });

doc.fillColor(secondaryColor).fontSize(18).font('Helvetica-Bold')
   .text('Unified Help & Operations Manual', 50, 240, { align: 'center' });

doc.rect(100, 280, 412, 3).fill(primaryColor);

doc.fillColor(mutedColor).fontSize(11).font('Helvetica')
   .text('ISO 27001:2022 ISMS Controls & DPDP Act 2023 Compliance Portal', 50, 310, { align: 'center' });

doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
   .text('System Version: v2.0 (IBM Maximo Inspired Theme)\nPublished: July 2026\nCorporate Auditing Division', 50, 600, { align: 'center' });

doc.addPage();

// TOC / Page 2
doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text('Table of Contents', 50, 50);
doc.rect(50, 75, 512, 1).fill(primaryColor);

const topics = [
  { p: '1. Introduction to Lekha Platform', page: '3' },
  { p: '2. User Access Groups & Permissions', page: '3' },
  { p: '3. Asset Inventory Registration & Verification (ISO 27001 A.5.9)', page: '4' },
  { p: '4. Privacy Compliance Controls (DPDP Section 11 & 12)', page: '4' },
  { p: '5. Document Control & Change Management (PRO 01 & PRO 13)', page: '5' },
  { p: '6. Operational Security Registers (Backups, Patches, Logs)', page: '5' },
  { p: '7. Troubleshooting & Verification Audits', page: '6' }
];

let tocY = 110;
topics.forEach(t => {
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(t.p, 50, tocY);
  doc.fillColor(mutedColor).fontSize(11).font('Helvetica').text(t.page, 520, tocY, { align: 'right' });
  tocY += 25;
});

doc.addPage();

// Page 3: Intro & Roles
doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('1. Introduction to Lekha Platform', 50, 50);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'Lekha is a compliance-centric IT Asset Management portal engineered to meet strict Indian CERT-In guidelines and ISO 27001 standards. The user interface borrows layout principles from IBM Maximo, focusing on high-contrast data tables, structured KPI grids, and clean cream-orange styling.',
  50, 75, { width: 512, align: 'justify' }
);

doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('2. User Access Groups & Permissions', 50, 160);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'The system enforces strict Role-Based Access Controls (RBAC) segregated into three operational profiles:\n\n' +
  '• Admin (Auditor): Full write and deletion permissions across all tables, including security audit logs, access requests, and CAB changes.\n\n' +
  '• Asset Manager (Custodian): Write and modification access for IT inventory register tags, software license logs, visitor sheets, and patch logs.\n\n' +
  '• Employee (Principal): Read-only inventory view. Access request creation forms, training course feedback submissions, and DPDP profile correction controls.',
  50, 185, { width: 512, align: 'justify' }
);

doc.addPage();

// Page 4: Inventory & Privacy
doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('3. Asset Inventory & Verification (ISO A.5.9)', 50, 50);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'To comply with ISO 27001 controls for inventory validation:\n\n' +
  '• Asset Tags: Generated automatically using 2-letter uppercase codes (e.g. LT for Laptop, SE for Server) and serial-count padded numbers.\n\n' +
  '• Verification Audits: Every asset must undergo physical verification at least once a year. Overdue items are highlighted in red in the inventory register and dashboard widgets.\n\n' +
  '• Acceptable Use: Assets assigned to users automatically prompt an acceptable use declaration sign-off (PRO 06).',
  50, 75, { width: 512, align: 'justify' }
);

doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('4. Privacy Compliance Controls (DPDP Act)', 50, 240);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'To satisfy data privacy rules under the Digital Personal Data Protection (DPDP) Act 2023:\n\n' +
  '• Explicit Consent: A blocking modal popup forces users to agree to data processing conditions before accessing any dashboard parameters.\n\n' +
  '• Right to Correction (Sec 11): Employees can request updates to inaccurate profile fields (e.g., name spellings) under the Profile tab.\n\n' +
  '• Right to Erasure (Sec 12): Selecting account erasure triggers dynamic PII scrubbing, returns allocated assets to inventory stock, and terminates active session authorizations.',
  50, 265, { width: 512, align: 'justify' }
);

doc.addPage();

// Page 5: Docs & Ops
doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('5. Document Control & Change Management', 50, 50);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  '• Document Change Notes (FMT 04): Logs version modifications, effective dates, and review periods for controlled documents.\n\n' +
  '• Change Management (PRO 13): Change requests are filed with impact analyses, rollback plans, and peer CAB review approvals. Post-deployment requires submitting testing checklists (FMT 28).',
  50, 75, { width: 512, align: 'justify' }
);

doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('6. Operational Security Registers', 50, 200);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  '• Backups (FMT 36): Track backup success logs and storage locations, coupled with quarterly restoration recovery checks (FMT 35).\n\n' +
  '• Security Incident Evaluation (FMT 20/21): Incident details require logged containment containment actions, root causes, and corrective action requests (CAR).\n\n' +
  '• Media Handling & Disposal (FMT 44/45): Media destruction forms require manager approval signatures and witness shredding check-offs.',
  50, 225, { width: 512, align: 'justify' }
);

doc.addPage();

// Page 6: Support
doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('7. Troubleshooting & Verification Audits', 50, 50);
doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(
  'For help with login or permission failures:\n\n' +
  '• Ensure you are signing in with valid `@adityabirla.com` work credentials.\n\n' +
  '• If you cannot access the CERT-In audit logs tab, verify that your account has been assigned the ADMIN role.\n\n' +
  '• For database lock issues on Windows, restart backend servers to release node DLL locking handles.\n\n\n' +
  'Contact system support at: support.compliance@adityabirla.com or visit the IT Helpdesk.',
  50, 75, { width: 512, align: 'justify' }
);

doc.end();

writeStream.on('finish', () => {
  console.log('Help manual generated successfully at: public/help_manual.pdf');
});
