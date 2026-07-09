// backend/prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma Client to connect with PostgreSQL database.
const prisma = new PrismaClient();

/**
 * Compliance Seeding Engine: Digitizes all ISMS processes.
 * Populates mock logs, checklists, risk sheets, access forms, and controlled docs.
 */
async function main() {
  console.log('Seeding digitized compliance registers (all ISO Formats & Policies)...');

  // 1. Purge existing records in reverse dependency order
  await prisma.managementReview.deleteMany();
  await prisma.licenseRecord.deleteMany();
  await prisma.accessControlMatrix.deleteMany();
  await prisma.serverRoomActivity.deleteMany();
  await prisma.externalOriginDocument.deleteMany();
  await prisma.amendmentRecord.deleteMany();
  await prisma.legislationRecord.deleteMany();
  await prisma.controlEffectiveness.deleteMany();
  await prisma.softwareEvaluation.deleteMany();
  await prisma.communicationMatrix.deleteMany();
  await prisma.ismsMetrics.deleteMany();
  await prisma.logReviewRecord.deleteMany();
  await prisma.passwordChangeTrack.deleteMany();
  await prisma.userIdRevalidationReport.deleteMany();
  await prisma.mediaDisposalRecord.deleteMany();
  await prisma.auditFinding.deleteMany();
  await prisma.auditPlan.deleteMany();
  await prisma.supplierPerformanceReview.deleteMany();
  await prisma.supplierRecord.deleteMany();
  await prisma.bcpTestRecord.deleteMany();
  await prisma.bcpSchedule.deleteMany();
  await prisma.trainingAttendance.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.changeTestRecord.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.patchAuditLog.deleteMany();
  await prisma.backupRegister.deleteMany();
  await prisma.visitorLog.deleteMany();
  await prisma.securityIncident.deleteMany();
  await prisma.accessRequest.deleteMany();

  await prisma.riskRecord.deleteMany();

  await prisma.nonConformance.deleteMany();
  await prisma.complianceTaskLog.deleteMany();







  await prisma.complianceTask.deleteMany();
  await prisma.controlledDocument.deleteMany();
  await prisma.roPARecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  // 2. Generate cryptographically secure passwords
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const employeePasswordHash = await bcrypt.hash('employee123', salt);
  const managerPasswordHash = await bcrypt.hash('manager123', salt);

  // 3. Create Seed Users
  const admin = await prisma.user.create({
    data: {
      email: 'ramanath.satapathy@adityabirla.com',
      name: 'Ramanath Satapathy',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      department: 'Information Technology & Cybersecurity',
      hasConsented: true,
      consentTimestamp: new Date(),
      consentPurpose: 'Required for ISMS systems management, asset audits, and administrator authentication logs.',
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'purna.c.nayak@adityabirla.com',
      name: 'Purna C. Nayak',
      passwordHash: employeePasswordHash,
      role: 'EMPLOYEE',
      department: 'Policy Operations',
      hasConsented: true,
      consentTimestamp: new Date(),
      consentPurpose: 'Required for personal asset assignments, active inventory checking, and secure system access.',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'omkar.s@adityabirla.com',
      name: 'Omkar S.',
      passwordHash: managerPasswordHash,
      role: 'ASSET_MANAGER',
      department: 'Infrastructure Operations',
      hasConsented: true,
      consentTimestamp: new Date(),
      consentPurpose: 'Required for hardware registrations, physical verification checks, and asset allocations.',
    },
  });

  console.log('Users seeded.');



  // 4. Create standard UAIL assets (PRO 06)
  const laptopAsset = await prisma.asset.create({
    data: {
      assetTag: 'UAIL/IT/LT/0001',
      name: 'ThinkPad T14 Gen 4',
      type: 'Laptop',
      model: 'Lenovo ThinkPad T14',
      serialNumber: 'L3N123456789X',
      classification: 'INTERNAL',
      status: 'ALLOCATED',
      location: 'HQ Delhi - Floor 3',
      ownerId: employee.id,
      acceptableUseSigned: true,
      signOffDate: new Date(),
      lastVerifiedDate: new Date(),
      nextVerificationDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  const serverAsset = await prisma.asset.create({
    data: {
      assetTag: 'UAIL/IT/SE/0002',
      name: 'Core Database Server',
      type: 'Server',
      model: 'Dell PowerEdge R760',
      serialNumber: 'SV-DELL-998877',
      classification: 'CONFIDENTIAL',
      status: 'MAINTENANCE',
      location: 'Mumbai Data Center - Rack 12-A',
      ownerId: admin.id,
      acceptableUseSigned: true,
      signOffDate: new Date(),
      lastVerifiedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      nextVerificationDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 335),
    },
  });

  console.log('IT Assets registered.');

  // 5. Seed Controlled Documents (FMT 01 / FMT 02)
  await prisma.controlledDocument.createMany({
    data: [
      {
        docCode: 'UAIL/ISMS/POL/001',
        title: 'Access Control Policy',
        type: 'POLICY',
        version: '2.0',
        status: 'APPROVED',
        owner: 'IT Head',
        approvedBy: 'Management Committee',
        effectiveDate: new Date('2025-01-15'),
        nextReviewDate: new Date('2026-01-15'),
        changeSummary: 'Updated user validation cycle and remote access logging guidelines.',
      },
      {
        docCode: 'UAIL/ISMS/POL/009',
        title: 'Information Classification and Labelling Policy',
        type: 'POLICY',
        version: '1.0',
        status: 'APPROVED',
        owner: 'Security Coordinator',
        approvedBy: 'IT Head',
        effectiveDate: new Date('2025-02-01'),
        nextReviewDate: new Date('2026-02-01'),
        changeSummary: 'First formal release aligning classification levels strictly to CONFIDENTIAL, INTERNAL, PUBLIC.',
      },
      {
        docCode: 'UAIL/ISMS/PRO/006',
        title: 'Assets Management Process',
        type: 'PROCEDURE',
        version: '2.0',
        status: 'APPROVED',
        owner: 'IT Manager',
        approvedBy: 'IT Head',
        effectiveDate: new Date('2025-01-18'),
        nextReviewDate: new Date('2026-01-18'),
        changeSummary: 'Added custom tag patterns and annual verification logs guidelines.',
      },
      {
        docCode: 'UAIL/ISMS/PRO/010',
        title: 'Compliance Process',
        type: 'PROCEDURE',
        version: '1.0',
        status: 'APPROVED',
        owner: 'Security Coordinator',
        approvedBy: 'IT Head',
        effectiveDate: new Date('2025-02-01'),
        nextReviewDate: new Date('2026-02-01'),
        changeSummary: 'Initial release. Outlined compliance tasks and Non-Conformance log steps.',
      },
    ],
  });

  console.log('Controlled Documents (FMT 01/02) seeded.');

  // 6. Seed Compliance Tasks (PRO 10)
  const taskAudit = await prisma.complianceTask.create({
    data: {
      code: 'PRO-05',
      name: 'Internal Audit Process',
      description: 'Annual internal audit of information security management system controls to assess effectiveness.',
      frequency: 'YEARLY',
      associatedFormat: 'FMT 11 Internal Audit Checklist',
      status: 'PENDING',
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    },
  });

  const taskLogs = await prisma.complianceTask.create({
    data: {
      code: 'PRO-12',
      name: 'Log Review Process',
      description: 'Periodic review of critical system, server, and firewall logs to detect security anomalies.',
      frequency: 'MONTHLY',
      associatedFormat: 'FMT 50 Log Review Report',
      status: 'COMPLIANT',
      lastChecked: new Date(),
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const taskPatches = await prisma.complianceTask.create({
    data: {
      code: 'PRO-20',
      name: 'Patch Management Process',
      description: 'Audit server Operating Systems for critical security updates and log installation reports.',
      frequency: 'MONTHLY',
      associatedFormat: 'FMT 26 Patch status Report',
      status: 'ACTION_REQUIRED',
      nextDueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
  });

  console.log('Compliance Tasks seeded.');

  // 7. Seed Risk Register (FMT 06 Risk Assessment)
  await prisma.riskRecord.createMany({
    data: [
      {
        riskCode: 'RISK-2026-0001',
        assetOrProcess: 'Core Database Server (UAIL/IT/SE/0002)',
        threat: 'SQL Injection / Unauthorized Access attempt',
        vulnerability: 'Unpatched legacy database engine version',
        impactScore: 5,
        likelihoodScore: 2,
        riskScore: 10, // 5 * 2
        treatmentStrategy: 'MITIGATE',
        treatmentPlan: 'Perform scheduled OS patch updates (PRO-20) and enable database firewall checks.',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: 'OPEN',
        owner: admin.email,
      },
      {
        riskCode: 'RISK-2026-0002',
        assetOrProcess: 'Employee Handover Process (PRO 06)',
        threat: 'PII leak or data retention failures post exit',
        vulnerability: 'Delay in active credential revocation and asset recovery checks',
        impactScore: 4,
        likelihoodScore: 3,
        riskScore: 12, // 4 * 3
        treatmentStrategy: 'MITIGATE',
        treatmentPlan: 'Automate Right to Erasure account anonymization transaction to immediately purge PII.',
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
        status: 'MITIGATED',
        owner: admin.email,
      },
    ],
  });

  console.log('Risk Records (FMT 06) seeded.');

  // 8. Seed Access Requests (FMT 08 Request Form / FMT 32 User ID Logs)
  await prisma.accessRequest.createMany({
    data: [
      {
        requestCode: 'AR-2026-0001',
        requestedBy: employee.email,
        systemName: 'Departmental Asset Register API',
        accessType: 'WRITE',
        justification: 'Required to create and manage local department inventory lists.',
        status: 'APPROVED',
        approvedBy: admin.email,
        approvalDate: new Date(),
        actionTaken: 'USER_ID_CREATED',
        actionDate: new Date(),
      },
      {
        requestCode: 'AR-2026-0002',
        requestedBy: employee.email,
        systemName: 'Data Center Server Room (Physical Access)',
        accessType: 'READ',
        justification: 'Accompanying external contractor for AC maintenance verification check.',
        status: 'PENDING',
      },
    ],
  });

  console.log('Access Requests (FMT 08) seeded.');

  // 9. Seed Security Incidents (FMT 20 Incident Report)
  await prisma.securityIncident.createMany({
    data: [
      {
        incidentCode: 'INC-2026-0001',
        dateOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        location: 'HQ Delhi Server Room',
        description: 'Unauthorized access alert triggered by proximity badge scanner on secondary server room door.',
        severity: 'MINOR',
        containmentAction: 'Locked down access card logs and verified CCTV recordings. Discovered it was a contractor entry delay.',
        rootCause: 'Contractor entered room before escort logged details in physical visitor sheet.',
        correctiveAction: 'Enforce strict escort verification check gate before physical access keys are released.',
        status: 'CLOSED',
        closedBy: admin.email,
        closedDate: new Date(),
      },
      {
        incidentCode: 'INC-2026-0002',
        dateOccurred: new Date(),
        location: 'Edge Network Firewall',
        description: 'DDoS brute force login attempts detected from unknown external IP address block.',
        severity: 'MAJOR',
        containmentAction: 'Temporarily blocked target IP blocks at edge router firewall rules.',
        status: 'OPEN',
      },
    ],
  });

  console.log('Incidents (FMT 20) seeded.');

  // 10. Seed Visitor Logs (FMT 22 Visitor Register / FMT 23 Server Room Access)
  await prisma.visitorLog.createMany({
    data: [
      {
        visitorName: 'Amit Verma',
        organization: 'Fortinet Tech Support',
        purpose: 'Firewall device hardware update check',
        areaAccessed: 'SERVER_ROOM',
        timeIn: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        timeOut: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
        escortedBy: admin.email,
        badgeNumber: 'VIS-99',
      },
      {
        visitorName: 'Sanjay Dutt',
        organization: 'Blue Star AC Services',
        purpose: 'Quarterly server room chiller servicing',
        areaAccessed: 'SERVER_ROOM',
        timeIn: new Date(),
        escortedBy: admin.email,
        badgeNumber: 'VIS-102',
      },
    ],
  });

  console.log('Visitor Access logs (FMT 22/23) seeded.');

  // 11. Seed Backup Logs (FMT 36 Backup Register / FMT 35 Restoration Test)
  await prisma.backupRegister.createMany({
    data: [
      {
        systemName: 'Core Database PostgreSQL Partition',
        backupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
        backupType: 'FULL',
        status: 'SUCCESS',
        performedBy: admin.email,
        storageLocation: 'Local NAS Backups Partition B',
        restorationTested: true,
        restorationTestDate: new Date(),
        restorationStatus: 'SUCCESS',
        restorationNotes: 'Restored backup file to test instance. All database tables and asset records matched.',
      },
      {
        systemName: 'Access Logs Storage (180-day backup)',
        backupDate: new Date(),
        backupType: 'INCREMENTAL',
        status: 'SUCCESS',
        performedBy: admin.email,
        storageLocation: 'Local NAS Backups Partition A',
        restorationTested: false,
      },
    ],
  });

  console.log('Backup Register (FMT 35/36) seeded.');

  // 12. Seed Patch Audit Logs (FMT 26 Patch status Report)
  await prisma.patchAuditLog.createMany({
    data: [
      {
        serverName: 'Core DB Server',
        patchId: 'KB5031123',
        criticality: 'CRITICAL',
        status: 'INSTALLED',
        checkedBy: admin.email,
      },
      {
        serverName: 'Edge Router Firewall',
        patchId: 'CVE-2026-0012-Remediation',
        criticality: 'HIGH',
        status: 'PENDING',
        checkedBy: admin.email,
        remediationPlan: 'Deploy patch during off-peak hours next Saturday night (PRO-20).',
      },
    ],
  });

  console.log('Patch Register (FMT 26) seeded.');

  // 13. Seed Non-Conformance item
  await prisma.nonConformance.create({
    data: {
      code: 'NC-2026-0001',
      source: 'RANDOM_CHECK',
      description: 'Edge Firewall lacks installation check logs for patch status update. Missing format FMT 26.',
      severity: 'MAJOR',
      status: 'OPEN',
      correctiveAction: 'Deploy security administrator to install standard patch and document on FMT 26.',
      targetClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      taskId: taskPatches.id,
    },
  });

  // 14. Seed mock Change Management requests (PRO 13 / FMT 25 / FMT 28)
  const changeReq = await prisma.changeRequest.create({
    data: {
      changeCode: 'CR-2026-0001',
      title: 'Upgrade Database Server to PostgreSQL 16',
      systemName: 'Core Database Server (UAIL/IT/SE/0002)',
      description: 'Upgrade PostgreSQL instance from version 14 to 16 to enable encryption at rest features and performance gains.',
      reason: 'Vulnerability remediation and performance enhancements.',
      impactAnalysis: 'Medium impact. Requires 30-minute system maintenance downtime window.',
      rollbackPlan: 'Restore virtual machine partition from NAS Backup log partition B.',
      status: 'APPROVED',
      requestedBy: employee.email,
      targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      approvedBy: admin.email,
      approvalDate: new Date(),
      testRecords: {
        create: {
          testPlan: 'Execute validation check tests on restored database image. Verify connection pools.',
          testCases: '1. Verify select queries\n2. Verify write transactions\n3. Verify encryption keys loading.',
          testResult: 'SUCCESS',
          testedBy: manager.email,
        }
      }
    }
  });

  console.log('Change Management requests (FMT 25/28) seeded.');

  // 15. Seed mock Training Sessions (PRO 02 / FMT 16 / FMT 17 / FMT 18 / FMT 19)
  const training = await prisma.trainingSession.create({
    data: {
      topic: 'Information Security & DPDP Awareness Training',
      trainer: 'Chief Information Security Officer',
      scheduledDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
      durationHours: 2.0,
      status: 'COMPLETED',
      attendanceList: {
        create: [
          {
            employeeEmail: 'purna.c.nayak@adityabirla.com',
            attended: true,
            feedbackRating: 5,
            feedbackNotes: 'Excellent overview of the new DPDP Data Principal rights.',
            evaluationScore: 90.0,
            evaluationStatus: 'PASS',
          },
          {
            employeeEmail: 'omkar.s@adityabirla.com',
            attended: true,
            feedbackRating: 4,
            feedbackNotes: 'Very clear. Learned about the physical verification audits.',
            evaluationScore: 85.0,
            evaluationStatus: 'PASS',
          }
        ]
      }
    }
  });

  console.log('Training & Awareness records (FMT 16/17) seeded.');

  // 16. Seed mock BCP & DR drills (PRO 05 / FMT 29 / FMT 30)
  const bcp = await prisma.bcpSchedule.create({
    data: {
      bcpCode: 'BCP-2026-0001',
      systemName: 'Primary Core ERP Database (UAIL/IT/SE/0002)',
      scenario: 'Loss of primary Delhi data center. Switchover DR drill to backup Mumbai DC.',
      scheduledDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
      rto: '4 Hours',
      rpo: '24 Hours',
      coordinator: admin.email,
      status: 'COMPLETED',
      testRecords: {
        create: {
          testDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
          actualRtoMinutes: 145, // 2h 25m
          dataLossObserved: 'No data loss observed. Transactions synced up to 30s before cutover.',
          successCriteriaMet: true,
          testResult: 'SUCCESS',
          participants: 'ramanath.satapathy@adityabirla.com, omkar.s@adityabirla.com',
          notes: 'DR switchover worked within RTO limit of 4 hours. Followed standard procedure PRO 05.',
          testedBy: admin.email,
        }
      }
    }
  });

  console.log('BCP & DR drill records (FMT 29/30) seeded.');

  // 17. Seed mock Supplier records (PRO 23 / FMT 24)
  const supplier = await prisma.supplierRecord.create({
    data: {
      supplierName: 'Utkal Cloud Solutions Ltd.',
      serviceProvided: 'Offsite disaster recovery hosting and server replication.',
      contactPerson: 'Pranav Kumar',
      contactEmail: 'pranav.k@utkalcloud.com',
      status: 'ACTIVE',
      reviews: {
        create: {
          reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
          qualityRating: 5,
          deliveryRating: 4,
          securityRating: 5,
          overallScore: 4.67,
          remarks: 'Excellent uptime compliance. Security audits passed without deviations.',
          reviewedBy: admin.email,
        }
      }
    }
  });

  console.log('Supplier relationship records (FMT 24) seeded.');

  // 18. Seed mock Internal Audit plans (PRO 05 / FMT 09 / FMT 10 / FMT 11 / FMT 54)
  const audit = await prisma.auditPlan.create({
    data: {
      auditCode: 'AUDIT-2026-0001',
      department: 'IT Department',
      scheduledDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20), // 20 days ago
      leadAuditor: admin.email,
      auditee: manager.email,
      scope: 'Review of access controls, patch logs, and server backups registry (FMT 10).',
      status: 'COMPLETED',
      findings: {
        create: [
          {
            checklistQuestion: 'Are monthly backup logs recorded and recovery tests performed quarterly?',
            evidenceObserved: 'Backup logs are properly recorded under FMT 36, and quarterly recovery is verified on FMT 35.',
            complianceStatus: 'COMPLIANT',
            testedBy: admin.email,
          },
          {
            checklistQuestion: 'Are server operating systems updated and critical patches logged within 48 hours?',
            evidenceObserved: 'Edge firewall logs show a missing CVE standard patch check log. Initiated NCR gap record.',
            complianceStatus: 'NON_CONFORMANCE',
            ncrCode: 'NC-2026-0001',
            testedBy: admin.email,
          }
        ]
      }
    }
  });

  console.log('Internal Audit plan records (FMT 09/10/54) seeded.');

  // 19. Seed mock Media Disposal logs (PRO 19 / FMT 44 / FMT 45)
  const media = await prisma.mediaDisposalRecord.create({
    data: {
      disposalCode: 'MEDIA-2026-0001',
      mediaType: 'SSD Drive',
      serialNumber: 'SND328908312',
      assetTag: 'UAIL/IT/ST/0002',
      classification: 'CONFIDENTIAL',
      requestedBy: employee.email,
      approvedBy: manager.email,
      destructionMethod: 'Degaussing & Physical Disintegration',
      witnessName: 'Mumbai Central Security Guard',
      disposalDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: 'DESTROYED'
    }
  });

  console.log('Media Disposal logs (FMT 44/45) seeded.');

  // 20. Seed mock Password Change Tracks & Revalidations (PRO 21 / FMT 31 / FMT 33)
  await prisma.passwordChangeTrack.create({
    data: {
      employeeEmail: employee.email,
      reason: '90-Day Rotation Policy',
      changedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12)
    }
  });

  await prisma.userIdRevalidationReport.create({
    data: {
      revalidationCode: 'REV-2026-0001',
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      systemName: 'Active Directory Domain Controller',
      employeeEmail: manager.email,
      currentAccessLevel: 'ASSET_MANAGER',
      revalidated: true,
      revalidatedBy: admin.email,
      actionTaken: 'Retained'
    }
  });

  console.log('Password tracks & revalidations (FMT 31/33) seeded.');

  // 21. Seed mock Log Review records (PRO 12 / FMT 49 / FMT 50)
  await prisma.logReviewRecord.createMany({
    data: [
      {
        reviewCode: 'LOG-2026-0001',
        systemName: 'Active Directory Server',
        logSource: 'Windows Event Log (Security channel)',
        reviewedBy: admin.email,
        deviationsObserved: false,
        status: 'COMPLIANT',
        reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4)
      },
      {
        reviewCode: 'LOG-2026-0002',
        systemName: 'Core Database Server',
        logSource: 'PostgreSQL connection query logs',
        reviewedBy: admin.email,
        deviationsObserved: true,
        deviationDetails: 'Observed multiple failed logins from internal IP 192.168.1.144.',
        actionTaken: 'Blocked source IP at subnet router level, verified as safe configuration audit.',
        status: 'ACTION_REQUIRED',
        reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      }
    ]
  });

  console.log('Log review records (FMT 49/50) seeded.');

  // 22. Seed mock data for all 11 remaining compliance formats
  await prisma.managementReview.create({
    data: {
      meetingCode: 'MRM-2026-0001',
      attendees: 'Ramanath S, Omkar S, Purna N',
      agenda: 'ISMS Digitization Progress & DPDP Compliance Review',
      discussionPoints: 'Reviewed consent Intercept modal and 16 operational compliance registers.',
      actionItems: 'Complete final 11 administrative formats integration by end of sprint.'
    }
  });

  await prisma.licenseRecord.create({
    data: {
      softwareName: 'Office 365 Business Premium',
      licenseKey: 'MS-O365-PREM-XYZ',
      totalLicenses: 100,
      allocatedLicenses: 84,
      expiryDate: new Date('2027-03-31'),
      owner: admin.email
    }
  });

  await prisma.accessControlMatrix.createMany({
    data: [
      { roleName: 'ADMIN', systemName: 'Active Directory', readAccess: true, writeAccess: true, adminAccess: true },
      { roleName: 'EMPLOYEE', systemName: 'Active Directory', readAccess: true, writeAccess: false, adminAccess: false }
    ]
  });

  await prisma.serverRoomActivity.create({
    data: {
      activityCode: 'SRA-2026-0001',
      activityType: 'Quarterly AC Filter Maintenance',
      performedBy: 'CoolTemp Aircon Vendor Tech',
      witnessName: manager.email,
      remarks: 'Verified safe entry visitor clearance.'
    }
  });

  await prisma.externalOriginDocument.create({
    data: {
      documentTitle: 'ISO/IEC 27001:2022 Standard Requirements Guide',
      origin: 'International Organization for Standardization',
      version: '3.0'
    }
  });

  await prisma.amendmentRecord.create({
    data: {
      formatCode: 'FMT 24 Supplier Reviews',
      amendmentDetails: 'Converted from manual Excel star rating form to a digital REST input matrix.',
      approvedBy: admin.email
    }
  });

  await prisma.legislationRecord.create({
    data: {
      actName: 'Digital Personal Data Protection (DPDP) Act 2023',
      applicableClause: 'Section 6: Consent requirements',
      complianceRequirement: 'Enforce consent modal before collecting/processing personal details.'
    }
  });

  await prisma.controlEffectiveness.create({
    data: {
      controlCode: 'CTRL-EFF-0001',
      controlName: 'A.8.20 Network Security Controls',
      assessmentCriteria: 'Audit weekly firewall log reviews.',
      effectivenessRating: 5,
      assessedBy: admin.email
    }
  });

  await prisma.softwareEvaluation.create({
    data: {
      softwareName: 'Vite React Framework',
      securityChecklist: 'Verifies CVE scanning logs, package lock file vulnerabilities, and open source license terms.',
      evaluationResult: 'APPROVED',
      evaluatedBy: admin.email
    }
  });

  await prisma.communicationMatrix.create({
    data: {
      stakeholder: 'Department Heads & CAB members',
      informationShared: 'Change Request Implementations logs',
      channel: 'Email / Compliance Dashboard notifications',
      frequency: 'Weekly'
    }
  });

  await prisma.ismsMetrics.create({
    data: {
      objective: 'Minimize database security gaps',
      metricName: 'Count of active open Non-Conformances',
      targetValue: '0 active NCs',
      actualValue: '1 active NC (NC-2026-0001)',
      frequency: 'Monthly'
    }
  });

  console.log('Remaining 11 ISMS formats seeded.');

  // 23. Initialize CERT-In audit log entry
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DIGITIZED_COMPLIANCE_SUITE_INITIALIZATION',
      module: 'COMPLIANCE',
      ipAddress: '127.0.0.1',
      userAgent: 'Prisma Seeding Script',
      details: 'Wiped database and seeded digitized records for Controlled Documents, Risks, Access Requests, Incidents, Visitors, Backups, Patches, Change Requests, Training sessions, BCP schedules, Supplier reviews, Internal Audits, Media Disposal logs, Password revalidations, Log reviews, and all remaining 11 administrative formats.',
      status: 'SUCCESS',
    },
  });

  console.log('Compliance database fully populated. Ready for operations.');
}









main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding compliance database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
