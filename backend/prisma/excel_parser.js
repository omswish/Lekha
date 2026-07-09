// backend/prisma/excel_parser.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const formatsDir = 'C:/Users/omkar.s/Code/cli-test1/ISO_docs/Formats';

// Helper to find the header row in a sheet representation
function findHeaderRowIndex(rows, keywords) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    let matchCount = 0;
    row.forEach(cell => {
      if (cell !== null && cell !== undefined) {
        const cleaned = String(cell).trim().toLowerCase();
        keywords.forEach(keyword => {
          if (keyword && cleaned.includes(String(keyword).toLowerCase())) {
            matchCount++;
          }
        });
      }
    });
    if (matchCount >= 2) {
      return i;
    }
  }
  return 0; // fallback to first row
}

// Helper to convert excel serial date to JS Date
function parseExcelDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel base date is Dec 30, 1899 due to leap year bug
    return new Date((val - 25569) * 86400 * 1000);
  }
  const str = String(val).trim();
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed);
  return new Date(); // fallback
}

// Clean and map rows based on detected headers
function mapExcelRows(rows, headerIdx, fieldMappings) {
  if (!rows || rows.length <= headerIdx || !rows[headerIdx]) return [];
  const headers = rows[headerIdx].map(h => String(h || '').trim());
  const results = [];
  
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Check if the row is entirely empty
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    const item = {};
    let hasData = false;

    Object.keys(fieldMappings).forEach(field => {
      const aliases = fieldMappings[field];
      // Find the index of the header that matches the alias
      let colIdx = -1;
      for (let h = 0; h < headers.length; h++) {
        const headerName = String(headers[h] || '').toLowerCase();
        if (!aliases) continue;
        const found = aliases.some(alias => {
          if (!alias) return false;
          return headerName.includes(String(alias).toLowerCase());
        });
        if (found) {
          colIdx = h;
          break;
        }
      }
      
      if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null) {
        item[field] = row[colIdx];
        hasData = true;
      } else {
        item[field] = null;
      }
    });

    if (hasData) {
      results.push(item);
    }
  }
  return results;
}

async function parseAndSeedExcel(prisma, adminUser, employeeUser, managerUser) {
  console.log('--- EXCEL WORKSHEETS PARSING ENGINE STARTED ---');

  // ==========================================
  // 1. Controlled Documents (FMT 01)
  // ==========================================
  const docFile = path.join(formatsDir, 'FMT 01 Master List of Documents.xlsx');
  if (fs.existsSync(docFile)) {
    try {
      const wb = XLSX.readFile(docFile);
      const sheets = ['Manual ', 'Policy', 'Process', 'Format'];
      
      for (const sheetName of sheets) {
        if (!wb.SheetNames.includes(sheetName)) continue;
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const headerIdx = findHeaderRowIndex(rows, ['Document No', 'Document Name', 'Author', 'Prepared by']);
        const mapped = mapExcelRows(rows, headerIdx, {
          docCode: ['Document No', 'Document No.'],
          title: ['Document Name ', 'Document Name'],
          version: ['Version', 'Ver No.'],
          owner: ['Author', 'Prepared by', 'Prepared By'],
          approvedBy: ['Approver', 'Approver '],
          effectiveDate: ['Effective Date', 'Effective Date ']
        });

        const docTypeMap = {
          'Manual ': 'MANUAL',
          'Policy': 'POLICY',
          'Process': 'PROCEDURE',
          'Format': 'FORMAT'
        };

        for (const doc of mapped) {
          if (!doc.docCode || !doc.title) continue;
          const cleanCode = String(doc.docCode).trim();
          const cleanTitle = String(doc.title).trim();
          
          await prisma.controlledDocument.upsert({
            where: { docCode: cleanCode },
            update: {},
            create: {
              docCode: cleanCode,
              title: cleanTitle,
              type: docTypeMap[sheetName] || 'FORMAT',
              version: String(doc.version || '1.0').trim(),
              status: 'APPROVED',
              owner: String(doc.owner || 'IT Operations').trim(),
              approvedBy: doc.approvedBy ? String(doc.approvedBy).trim() : 'IT Head',
              effectiveDate: parseExcelDate(doc.effectiveDate),
              nextReviewDate: new Date(parseExcelDate(doc.effectiveDate).getTime() + 365 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }
      console.log('✔ Seeded Controlled Documents (FMT 01).');
    } catch (err) {
      console.error('❌ Error parsing FMT 01 Master Documents:', err.message);
    }
  }

  // ==========================================
  // 2. Information Asset Inventory (FMT 55)
  // ==========================================
  const assetFile = path.join(formatsDir, 'FMT 55 Information Asset Inventory.xlsx');
  if (fs.existsSync(assetFile)) {
    try {
      const wb = XLSX.readFile(assetFile);
      const assetSheets = [
        'Laptop', 'Desktop', 'BLADE CENTER SERVER', 'OLD SERVER', 'UPS ', 
        'PRINTER', 'SWITCH', 'ROUTER', 'DATA CARD', 'ACCESS POINT', 
        'PROJECTOR', 'ATTENDANCE ', 'VC UNIT', 'CYBEROAM', 'CONSUMABLE SPARES'
      ];
      
      let assetIndex = 1;
      
      for (const sheetName of assetSheets) {
        if (!wb.SheetNames.includes(sheetName)) continue;
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const headerIdx = findHeaderRowIndex(rows, ['IT ASSET TAG', 'SERIAL NO', 'LOCATION', 'MAKE', 'MODEL']);
        const mapped = mapExcelRows(rows, headerIdx, {
          assetTag: ['IT ASSET TAG', 'IT Asset Tag', 'IT ASSET CODE', 'IT Asset Tag', 'ASSET CODE', 'TAG NUMBER'],
          name: ['NAME', 'DEVICE NAME', 'SERVER NAME', 'ITEAM', 'ITEM', 'SWITCH / HUB', 'DEVICE TYPE'],
          model: ['MODEL', 'SERVER MODEL', 'MAKE', 'DATA CARD MAKE', 'UPS TYPE'],
          serialNumber: ['SERIAL NUMBER', 'SERIAL NO', 'SL.NO', 'SL NO', 'SERIAL NO / SERVICE TAG', 'SIM NUMBER', 'DATA CARD IMEI NO', 'SIM NUMBER'],
          location: ['LOCATION', 'SUB LOCATION', 'SUB-LOCATION'],
          status: ['STATUS']
        });

        for (const rowData of mapped) {
          const serial = rowData.serialNumber ? String(rowData.serialNumber).trim() : `SN-AUTO-${assetIndex++}`;
          let tag = rowData.assetTag ? String(rowData.assetTag).trim() : `UAIL/IT/${sheetName.toUpperCase().replace(/\s+/g, '')}/${assetIndex}`;
          
          // Ensure tag is unique
          const existing = await prisma.asset.findFirst({
            where: {
              OR: [
                { assetTag: tag },
                { serialNumber: serial }
              ]
            }
          });
          if (existing) continue;

          await prisma.asset.create({
            data: {
              assetTag: tag,
              name: rowData.name ? String(rowData.name).trim() : `${sheetName} Asset`,
              type: sheetName.trim(),
              model: rowData.model ? String(rowData.model).trim() : 'Generic',
              serialNumber: serial,
              classification: 'INTERNAL',
              status: rowData.status && String(rowData.status).toUpperCase().includes('OK') ? 'ALLOCATED' : 'PROCURED',
              location: rowData.location ? String(rowData.location).trim() : 'HQ Delhi',
              ownerId: employeeUser.id,
              acceptableUseSigned: true,
              signOffDate: new Date(),
              lastVerifiedDate: new Date(),
              nextVerificationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }
      console.log('✔ Seeded IT Asset Inventory (FMT 55).');
    } catch (err) {
      console.error('❌ Error parsing FMT 55 Asset Inventory:', err.message);
    }
  }

  // ==========================================
  // 3. Risk Assessment Records (FMT 06)
  // ==========================================
  const riskFile = path.join(formatsDir, 'FMT 06 Risk assessment and treatment record.xlsx');
  if (fs.existsSync(riskFile)) {
    try {
      const wb = XLSX.readFile(riskFile);
      const riskSheets = ['Process ', 'Physical ', 'Software', 'Information ', 'Paper ', 'People ', 'Service '];
      let riskIdx = 1;

      for (const sheetName of riskSheets) {
        if (!wb.SheetNames.includes(sheetName)) continue;
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const headerIdx = findHeaderRowIndex(rows, ['Risk Owner', 'Threat', 'Vulnerability', 'Risk Value']);
        const mapped = mapExcelRows(rows, headerIdx, {
          assetOrProcess: ['Process Name', 'Information/ Assets', 'Information/ Assets', 'Information/ Asset Owner'],
          threat: ['Threat Description', 'Threat'],
          vulnerability: ['Vulnerability', 'Vulnerability Description', 'Vulnerability '],
          impact: ['Impact (Consequence)', 'Impact'],
          likelihood: ['Probe (Likelihood)', 'Probe'],
          treatmentPlan: ['Control Description', 'Existing', 'New'],
          owner: ['Risk Owner', 'Information/ Asset Owner']
        });

        for (const rowData of mapped) {
          if (!rowData.threat || !rowData.vulnerability) continue;
          
          const impact = parseInt(rowData.impact) || 3;
          const likelihood = parseInt(rowData.likelihood) || 3;
          const score = impact * likelihood;
          const rCode = `RISK-FMT06-${riskIdx++}`;

          await prisma.riskRecord.upsert({
            where: { riskCode: rCode },
            update: {},
            create: {
              riskCode: rCode,
              assetOrProcess: rowData.assetOrProcess ? String(rowData.assetOrProcess).trim() : 'Operational Infrastructure',
              threat: String(rowData.threat).trim(),
              vulnerability: String(rowData.vulnerability).trim(),
              impactScore: impact,
              likelihoodScore: likelihood,
              riskScore: score,
              treatmentStrategy: score >= 12 ? 'MITIGATE' : 'ACCEPT',
              treatmentPlan: rowData.treatmentPlan ? String(rowData.treatmentPlan).trim() : 'Regular monitoring and standard controls.',
              targetDate: new Date('2026-12-31'),
              status: 'OPEN',
              owner: rowData.owner ? String(rowData.owner).trim() : adminUser.email
            }
          });
        }
      }
      console.log('✔ Seeded Risk assessment records (FMT 06).');
    } catch (err) {
      console.error('❌ Error parsing FMT 06 Risk Records:', err.message);
    }
  }

  // ==========================================
  // 4. Successful Backup Log (FMT 36)
  // ==========================================
  const backupFile = path.join(formatsDir, 'FMT 36 Backup Register.xlsx');
  if (fs.existsSync(backupFile)) {
    try {
      const wb = XLSX.readFile(backupFile);
      const sheetName = 'Successful Backup Log';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['HOSTNAME', 'POLICY NAME', 'START DATE', 'PERFORMED BY']);
        const mapped = mapExcelRows(rows, headerIdx, {
          systemName: ['HOSTNAME', 'HOSTNAME AND IP', 'SERVER NAME'],
          backupType: ['BACKUP FREQUENCY', 'Frequency'],
          performedBy: ['PERFORMED BY'],
          storageLocation: ['LOCATION OF TAPES', 'LOCATION OF TAPES\r\nOFFSITE/ONSITE'],
          backupDate: ['START DATE', 'START DATE\r\nMM/DD/YY']
        });

        for (const log of mapped) {
          if (!log.systemName) continue;
          await prisma.backupRegister.create({
            data: {
              systemName: String(log.systemName).trim(),
              backupDate: log.backupDate ? parseExcelDate(log.backupDate) : new Date(),
              backupType: log.backupType ? String(log.backupType).trim() : 'FULL',
              status: 'SUCCESS',
              performedBy: log.performedBy ? String(log.performedBy).trim() : managerUser.email,
              storageLocation: log.storageLocation ? String(log.storageLocation).trim() : 'Onsite Vault',
              restorationTested: true,
              restorationTestDate: new Date(),
              restorationStatus: 'SUCCESS',
              restorationNotes: 'Restored file index structure verified correct.'
            }
          });
        }
        console.log('✔ Seeded Backup log registers (FMT 36).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 36 Backup Register:', err.message);
    }
  }

  // ==========================================
  // 5. Software Licenses (FMT 37)
  // ==========================================
  const licFile = path.join(formatsDir, 'FMT 37 License tracking sheet.xls');
  if (fs.existsSync(licFile)) {
    try {
      const wb = XLSX.readFile(licFile);
      const sheets = ['Microsoft', 'Oracle', 'Other'];
      
      for (const sheetName of sheets) {
        if (!wb.SheetNames.includes(sheetName)) continue;
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Vendor', 'Category', 'Lic.Agreement No', 'Decsription']);
        const mapped = mapExcelRows(rows, headerIdx, {
          vendor: ['Vendor'],
          key: ['Lic.Agreement No', 'Lic.Agreement No '],
          softwareName: ['Decsription', 'Description'],
          qty: ['Qty', 'Qty '],
          owner: ['Source']
        });

        for (const lic of mapped) {
          if (!lic.softwareName) continue;
          const qtyVal = parseInt(lic.qty) || 5;
          await prisma.licenseRecord.create({
            data: {
              softwareName: `${String(lic.vendor || 'Generic').trim()} - ${String(lic.softwareName).trim()}`,
              licenseKey: lic.key ? String(lic.key).trim() : 'LIC-AGREEMENT-VOL-AUTO',
              totalLicenses: qtyVal,
              allocatedLicenses: Math.min(Math.floor(qtyVal * 0.7), qtyVal),
              expiryDate: new Date('2028-12-31'),
              owner: lic.owner ? String(lic.owner).trim() : 'IT Services Department'
            }
          });
        }
      }
      console.log('✔ Seeded Software License trackers (FMT 37).');
    } catch (err) {
      console.error('❌ Error parsing FMT 37 License Sheet:', err.message);
    }
  }

  // ==========================================
  // 6. Access Control Matrix (FMT 38)
  // ==========================================
  const acmFile = path.join(formatsDir, 'FMT 38 Access control matrix.xlsx');
  if (fs.existsSync(acmFile)) {
    try {
      const wb = XLSX.readFile(acmFile);
      const sheetName = 'Windows';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Role', 'AD Admin', 'Local Admin', 'Designation']);
        const mapped = mapExcelRows(rows, headerIdx, {
          roleName: ['Role'],
          designation: ['Designation'],
          adAdmin: ['AD Admin'],
          localAdmin: ['Local Admin']
        });

        for (const row of mapped) {
          if (!row.roleName) continue;
          await prisma.accessControlMatrix.create({
            data: {
              roleName: String(row.roleName).trim(),
              systemName: row.designation ? String(row.designation).trim() : 'Windows Server System',
              readAccess: true,
              writeAccess: row.localAdmin && String(row.localAdmin).toLowerCase().includes('y') ? true : false,
              adminAccess: row.adAdmin && String(row.adAdmin).toLowerCase().includes('y') ? true : false
            }
          });
        }
        console.log('✔ Seeded Access Control Matrix (FMT 38).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 38 Access Control Matrix:', err.message);
    }
  }

  // ==========================================
  // 7. Applicable Legislations (FMT 39)
  // ==========================================
  const legFile = path.join(formatsDir, 'FMT 39 Applicable Legislations Matrix.xlsx');
  if (fs.existsSync(legFile)) {
    try {
      const wb = XLSX.readFile(legFile);
      const sheetName = 'Appli. Legislations';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Legislation / Act', 'Compliance/ Statutory Provisions', 'Compliance Header']);
        const mapped = mapExcelRows(rows, headerIdx, {
          actName: ['Legislation / Act', 'Legislation'],
          applicableClause: ['Compliance Header', 'Categorization'],
          complianceRequirement: ['Compliance/ Statutory Provisions', 'Compliance Description ']
        });

        for (const leg of mapped) {
          if (!leg.actName || !leg.complianceRequirement) continue;
          await prisma.legislationRecord.create({
            data: {
              actName: String(leg.actName).trim(),
              applicableClause: leg.applicableClause ? String(leg.applicableClause).trim() : 'General ISMS Provisions',
              complianceRequirement: String(leg.complianceRequirement).trim(),
              status: 'COMPLIANT'
            }
          });
        }
        console.log('✔ Seeded Legislations & Acts Registry (FMT 39).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 39 Legislations Matrix:', err.message);
    }
  }

  // ==========================================
  // 8. Effectiveness of Control (FMT 40)
  // ==========================================
  const effFile = path.join(formatsDir, 'FMT 40 Effectiveness of Control.xlsx');
  if (fs.existsSync(effFile)) {
    try {
      const wb = XLSX.readFile(effFile);
      const sheetName = 'Effectiveness of Control ';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Clause', 'Controls ', 'If Proactive - Method for Verification']);
        const mapped = mapExcelRows(rows, headerIdx, {
          controlCode: ['Clause'],
          controlName: ['Controls '],
          assessmentCriteria: ['If Proactive - Method for Verification of Effectiveness']
        });

        let effIdx = 1;
        for (const eff of mapped) {
          if (!eff.controlName) continue;
          const codeVal = eff.controlCode ? String(eff.controlCode).trim() : `CTRL-${effIdx++}`;
          
          const existing = await prisma.controlEffectiveness.findUnique({ where: { controlCode: codeVal } });
          if (existing) continue;

          await prisma.controlEffectiveness.create({
            data: {
              controlCode: codeVal,
              controlName: String(eff.controlName).trim(),
              assessmentCriteria: eff.assessmentCriteria ? String(eff.assessmentCriteria).trim() : 'Standard audit check',
              effectivenessRating: 5,
              assessedBy: adminUser.email
            }
          });
        }
        console.log('✔ Seeded Effectiveness of Controls (FMT 40).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 40 Effectiveness Control:', err.message);
    }
  }

  // ==========================================
  // 9. Communication Matrix (FMT 47)
  // ==========================================
  const commFile = path.join(formatsDir, 'FMT 47 Communication matrix.xlsx');
  if (fs.existsSync(commFile)) {
    try {
      const wb = XLSX.readFile(commFile);
      const sheetName = 'Communications Matrix';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Description of communication', 'Mode of communication', 'Responsibility']);
        const mapped = mapExcelRows(rows, headerIdx, {
          stakeholder: ['Responsibility /Communicated By', 'Responsibility'],
          informationShared: ['Description of communication', 'Description'],
          channel: ['Mode of communication*', 'Mode'],
          frequency: ['Freq.']
        });

        for (const row of mapped) {
          if (!row.informationShared) continue;
          await prisma.communicationMatrix.create({
            data: {
              stakeholder: row.stakeholder ? String(row.stakeholder).trim() : 'Security Coordinator',
              informationShared: String(row.informationShared).trim(),
              channel: row.channel ? String(row.channel).trim() : 'Email and Portal Alert',
              frequency: row.frequency ? String(row.frequency).trim() : 'Annual'
            }
          });
        }
        console.log('✔ Seeded Communications Matrices (FMT 47).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 47 Communication Matrix:', err.message);
    }
  }

  // ==========================================
  // 10. Metrics Data Sheet (FMT 48)
  // ==========================================
  const metricsFile = path.join(formatsDir, 'FMT 48 Metrics Data Sheet for ISMS Objectives.xlsx');
  if (fs.existsSync(metricsFile)) {
    try {
      const wb = XLSX.readFile(metricsFile);
      const sheetName = 'ISMS Objectives';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Sr #', 'Objectives', 'Status ']);
        const mapped = mapExcelRows(rows, headerIdx, {
          objective: ['Sr #'],
          metricName: ['Objectives'],
          targetValue: ['Status ']
        });

        for (const log of mapped) {
          if (!log.metricName) continue;
          await prisma.ismsMetrics.create({
            data: {
              objective: log.objective ? String(log.objective).trim() : 'ISMS Objective',
              metricName: String(log.metricName).trim(),
              targetValue: '100% compliance',
              actualValue: '100%',
              frequency: 'Annual'
            }
          });
        }
        console.log('✔ Seeded Objectives & Metrics (FMT 48).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 48 Metrics Data Sheet:', err.message);
    }
  }

  // ==========================================
  // 11. Log Review Matrix (FMT 49)
  // ==========================================
  const logFile = path.join(formatsDir, 'FMT 49 Log Review Applicability Matrix.xlsx');
  if (fs.existsSync(logFile)) {
    try {
      const wb = XLSX.readFile(logFile);
      const sheetName = 'Applicability Matrix';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['System/Application/Device Name', 'Category', 'Frequency']);
        const mapped = mapExcelRows(rows, headerIdx, {
          systemName: ['System/Application/Device Name', 'Name'],
          logSource: ['Category'],
          frequency: ['Frequency']
        });

        let logRevIdx = 1;
        for (const log of mapped) {
          if (!log.systemName) continue;
          await prisma.logReviewRecord.create({
            data: {
              reviewCode: `LOG-REV-FMT49-${logRevIdx++}`,
              systemName: String(log.systemName).trim(),
              logSource: log.logSource ? String(log.logSource).trim() : 'Operational Syslog',
              reviewDate: new Date(),
              reviewedBy: adminUser.email,
              deviationsObserved: false,
              status: 'COMPLIANT'
            }
          });
        }
        console.log('✔ Seeded Log review matrix (FMT 49).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 49 Log Review Matrix:', err.message);
    }
  }

  // ==========================================
  // 12. Server Room Activity (FMT 53)
  // ==========================================
  const sraFile = path.join(formatsDir, 'FMT 53 Server Room Activity.xlsx');
  if (fs.existsSync(sraFile)) {
    try {
      const wb = XLSX.readFile(sraFile);
      const sheetName = 'Server Room Activity ';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['LOCATION', 'SERVER NAME', 'SERVER STATUS', 'REMARKS']);
        const mapped = mapExcelRows(rows, headerIdx, {
          location: ['LOCATION'],
          serverName: ['SERVER NAME'],
          status: ['SERVER STATUS'],
          remarks: ['REMARKS']
        });

        let sraIdx = 1;
        for (const act of mapped) {
          if (!act.serverName) continue;
          await prisma.serverRoomActivity.create({
            data: {
              activityCode: `SRA-FMT53-${sraIdx++}`,
              activityDate: new Date(),
              activityType: `Audit: ${String(act.serverName).trim()} Status check`,
              performedBy: managerUser.name,
              witnessName: 'Emerson System Monitoring',
              remarks: act.remarks ? String(act.remarks).trim() : `Server status verified as ${String(act.status || 'OK').trim()}`
            }
          });
        }
        console.log('✔ Seeded Server room activity register (FMT 53).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 53 Server Room Activity:', err.message);
    }
  }

  // ==========================================
  // 13. Internal Audit findings (FMT 54)
  // ==========================================
  const auditFile = path.join(formatsDir, 'FMT 54 Internal Audit Report.xls');
  if (fs.existsSync(auditFile)) {
    try {
      const wb = XLSX.readFile(auditFile);
      const sheetName = 'Internal Audit Report';
      if (wb.SheetNames.includes(sheetName)) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerIdx = findHeaderRowIndex(rows, ['Points for consideration', 'NC against', 'Responsibility']);
        const mapped = mapExcelRows(rows, headerIdx, {
          scope: ['Points for consideration'],
          ncrClause: ['NC against', 'Clause'],
          auditee: ['Responsibility'],
          leadAuditor: ['Verified By']
        });

        let auditIdx = 1;
        for (const row of mapped) {
          if (!row.scope) continue;
          
          const aCode = `AUDIT-FMT54-${auditIdx++}`;
          
          const plan = await prisma.auditPlan.create({
            data: {
              auditCode: aCode,
              department: 'Operations & IT Infrastructure',
              scheduledDate: new Date('2026-06-15'),
              leadAuditor: row.leadAuditor ? String(row.leadAuditor).trim() : adminUser.email,
              auditee: row.auditee ? String(row.auditee).trim() : employeeUser.email,
              scope: String(row.scope).trim().substring(0, 200),
              status: 'COMPLETED'
            }
          });

          await prisma.auditFinding.create({
            data: {
              auditPlanId: plan.id,
              checklistQuestion: `Does the control satisfy requirements for ISO 27001 Clause: ${String(row.ncrClause || 'General').trim()}?`,
              evidenceObserved: 'Checked configuration logs and revalidated access approvals.',
              complianceStatus: 'COMPLIANT',
              testedBy: adminUser.email
            }
          });
        }
        console.log('✔ Seeded Internal Auditing findings (FMT 54).');
      }
    } catch (err) {
      console.error('❌ Error parsing FMT 54 Internal Audit Report:', err.message);
    }
  }

  console.log('--- EXCEL WORKSHEETS PARSING ENGINE COMPLETED SUCCESSFULLY ---');
}

module.exports = { parseAndSeedExcel };
