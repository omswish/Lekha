const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const {
  getAssetCategoryCode,
  getAssetCategoryLabel,
  getDefaultAssetType,
  normalizeAssetCategory,
  normalizeAssetStatus
} = require('../src/utils/assetCatalog');

const prisma = new PrismaClient();
const migrationFile = path.resolve(__dirname, '../../data_migration/Information Asset Inventory.xlsx');
const enrichmentCacheFile = path.resolve(__dirname, '../../data_migration/model_enrichment_cache.json');
const NOT_AVAILABLE = 'Not Available';
const ENRICHMENT_CACHE_VERSION = 4;
const INTERNET_LOOKUP_CONCURRENCY = 4;
const INTERNET_LOOKUP_TIMEOUT_MS = 12000;
const NON_ASSET_SHEETS = new Set([
  'Version History',
  'Process',
  'Sheet1',
  'Summary',
  'Sheet3',
  'LIFECYCLE MATRIX',
  'OSHAPADA MEDICAL'
]);
const INTERNET_ENRICHMENT_CATEGORIES = new Set([
  'LAPTOP',
  'DESKTOP',
  'KIOSK',
  'SERVER',
  'SWITCH',
  'ROUTER',
  'FIREWALL',
  'UPS',
  'ACCESS_POINT',
  'VC_UNIT',
  'PRINTER',
  'PROJECTOR',
  'MTR'
]);
const MODEL_TOKEN_STOPWORDS = new Set([
  'adapter',
  'ap',
  'bridge',
  'desktop',
  'device',
  'edition',
  'laptop',
  'monitor',
  'notebook',
  'pc',
  'printer',
  'router',
  'series',
  'server',
  'switch',
  'system',
  'unit',
  'wireless'
]);

const VENDOR_DOMAIN_HINTS = {
  hp: ['hp.com', 'support.hp.com'],
  dell: ['dell.com'],
  lenovo: ['lenovo.com', 'psref.lenovo.com'],
  ibm: ['ibm.com'],
  cisco: ['cisco.com'],
  canon: ['canon.com'],
  epson: ['epson.com'],
  samsung: ['samsung.com'],
  apc: ['apc.com', 'se.com', 'schneider-electric.com'],
  emerson: ['vertiv.com', 'emerson.com'],
  vertiv: ['vertiv.com'],
  huawei: ['consumer.huawei.com', 'huawei.com'],
  airtel: ['airtel.in']
};

const STATUS_PRIORITY = {
  PROCURED: 1,
  ALLOCATED: 2,
  MAINTENANCE: 3,
  DISPOSED: 4,
  LOST: 5
};

function isBlankValue(value) {
  if (value === null || value === undefined) {
    return true;
  }

  const cleaned = String(value).trim();
  if (!cleaned) {
    return true;
  }

  const lowered = cleaned.toLowerCase();
  return ['n/a', 'na', 'null', 'undefined', 'not found', 'not applicable'].includes(lowered);
}

function sanitizeText(value, fallback = '') {
  return isBlankValue(value) ? fallback : String(value).trim();
}

function normalizeComparableText(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeComparableText(value) {
  return normalizeComparableText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function looksLikeCpuText(value) {
  return /\b(intel|amd|xeon|ryzen|celeron|pentium|core\s*i[3579]|apple\s*m\d)\b/i.test(sanitizeText(value));
}

function normalizeKnownBlank(value) {
  const clean = sanitizeText(value);
  return clean === NOT_AVAILABLE ? '' : clean;
}

function looksLikeDateValue(value) {
  const clean = sanitizeText(value);
  return /^\d{1,2}[\/.-][A-Za-z]{3}[\/.-]\d{2,4}$/.test(clean)
    || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(clean);
}

function looksLikeAmountValue(value) {
  return /^[₹]?\s?\d[\d,]*(?:\.\d+)?$/.test(sanitizeText(value));
}

function looksLikePoNumberValue(value) {
  const clean = sanitizeText(value);
  return /^[A-Z0-9/.-]{5,}$/.test(clean) && !looksLikeDateValue(clean);
}

function sanitizeHeaderKey(header) {
  return sanitizeText(header)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeModelKey(model) {
  return sanitizeText(model)
    .toUpperCase()
    .replace(/NOTEBOOK\s*PC/g, '')
    .replace(/SMALL\s*FORM\s*FACTOR\s*CTO/g, 'SFF')
    .replace(/SMALL\s*FORM\s*FACTOR\s*BTX\s*BASE/g, 'SFF')
    .replace(/[^A-Z0-9]+/g, '');
}

function buildLookupModelLabel(make, model) {
  const cleanMake = normalizeKnownBlank(make);
  const cleanModel = normalizeKnownBlank(model);
  const withoutLeadingMake = cleanMake
    ? cleanModel.replace(new RegExp(`^${escapeRegExp(cleanMake)}\\s+`, 'i'), '').trim()
    : cleanModel;

  return [cleanMake, withoutLeadingMake].filter(Boolean).join(' ').trim();
}

function extractModelLookupTokens(make, model) {
  const vendorTokens = new Set(tokenizeComparableText(normalizeKnownBlank(make)));

  return tokenizeComparableText(buildLookupModelLabel(make, model))
    .filter((token) => !MODEL_TOKEN_STOPWORDS.has(token))
    .filter((token) => !vendorTokens.has(token))
    .filter((token) => token.length > 1);
}

function hasSpecificLookupModel(make, model) {
  const tokens = extractModelLookupTokens(make, model);
  if (!tokens.length) {
    return false;
  }

  return tokens.some((token) => /\d/.test(token)) || tokens.length >= 2;
}

function pickFirstMeaningful(...values) {
  for (const value of values) {
    if (!isBlankValue(value)) {
      return String(value).trim();
    }
  }

  return '';
}

function findHeaderRowIndex(rows, keywords) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      continue;
    }

    let matches = 0;
    for (const cell of row) {
      const normalizedCell = normalizeComparableText(cell);
      if (!normalizedCell) {
        continue;
      }

      for (const keyword of keywords) {
        if (normalizedCell.includes(normalizeComparableText(keyword))) {
          matches += 1;
          break;
        }
      }
    }

    if (matches >= 2) {
      return i;
    }
  }

  return 0;
}

function findColumnIndex(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeComparableText).filter(Boolean);

  for (const alias of normalizedAliases) {
    for (let index = 0; index < headers.length; index++) {
      const normalizedHeader = normalizeComparableText(headers[index]);
      if (normalizedHeader && normalizedHeader === alias) {
        return index;
      }
    }
  }

  let bestIndex = -1;
  let bestScore = -1;

  for (const alias of normalizedAliases) {
    for (let index = 0; index < headers.length; index++) {
      const normalizedHeader = normalizeComparableText(headers[index]);
      if (!normalizedHeader) {
        continue;
      }

      if (normalizedHeader === alias) {
        const score = 1000 + alias.length;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      } else if (normalizedHeader.includes(alias)) {
        const score = alias.length;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    }
  }

  return bestIndex;
}

function buildHeaderIndexMap(headers) {
  return {
    assetTag: findColumnIndex(headers, ['it asset tag', 'asset tag', 'tag number', 'it asset code', 'asset code']),
    serialNumber: findColumnIndex(headers, ['serial no / service tag', 'server sl no', 'serial number', 'serial no', 'sl.no', 'sl no', 'imei no', 'imei', 'data card rsn no', 'sim number']),
    make: findColumnIndex(headers, ['make', 'server make', 'data card make']),
    model: findColumnIndex(headers, ['model', 'server model', 'data card model']),
    name: findColumnIndex(headers, ['name', 'device name', 'equipment', 'switch / hub', 'server name']),
    displayName: findColumnIndex(headers, ['display name']),
    hostname: findColumnIndex(headers, ['host name', 'hostname', 'computer name']),
    location: findColumnIndex(headers, ['location']),
    subLocation: findColumnIndex(headers, ['sub location / user name', 'sub-location / user name', 'sub location', 'sub-location']),
    status: findColumnIndex(headers, ['status', 'transferred status']),
    type: findColumnIndex(headers, ['asset type', 'server type', 'switch type', 'ups type', 'data card type', 'type']),
    email: findColumnIndex(headers, ['email id', 'e-mail id']),
    department: findColumnIndex(headers, ['department']),
    remark: findColumnIndex(headers, ['remark', 'remarks']),
    lifeCycle: findColumnIndex(headers, ['life cycle']),
    issuedDate: findColumnIndex(headers, ['issued date']),
    userName: findColumnIndex(headers, ['user name', 'end user', 'issued to', 'given to']),
    software: findColumnIndex(headers, ['software / application']),
    ipAddress: findColumnIndex(headers, ['management ip', 'ip address']),
    cpuConfiguration: findColumnIndex(headers, ['cpu configuration', 'server configuration']),
    storageSize: findColumnIndex(headers, ['hdd size', 'hdd configuration']),
    ramSize: findColumnIndex(headers, ['ram size']),
    operatingSystem: findColumnIndex(headers, ['os installed', 'os', 'os installation']),
    displaySize: findColumnIndex(headers, ['display size']),
    outputCapacity: findColumnIndex(headers, ['output capacity'])
  };
}

function extractFields(headers, headerIndexMap, row) {
  const fields = {};

  Object.entries(headerIndexMap).forEach(([field, index]) => {
    fields[field] = index === -1 ? '' : sanitizeText(row[index]);
  });

  return fields;
}

function applySheetSpecificFieldCorrections(sheetName, headers, row, fields) {
  const correctedFields = {
    ...fields
  };
  const customFieldOverrides = {};

  if (normalizeComparableText(sheetName) !== 'asset retirement') {
    return { fields: correctedFields, customFieldOverrides };
  }

  const serialIndex = findColumnIndex(headers, ['serial no / service tag']);
  if (
    serialIndex === -1 ||
    !isBlankValue(headers[serialIndex + 1]) ||
    !normalizeComparableText(headers[serialIndex + 2]).includes('part no')
  ) {
    return { fields: correctedFields, customFieldOverrides };
  }

  const shiftedAssetTag = sanitizeText(row[serialIndex + 3]);
  if (!isValidWorkbookAssetTag(shiftedAssetTag)) {
    return { fields: correctedFields, customFieldOverrides };
  }

  if (!looksLikeCpuText(row[serialIndex + 4])) {
    return { fields: correctedFields, customFieldOverrides };
  }

  const shiftedFieldIndexes = {
    part_no_ex_service_code: serialIndex + 1,
    finance_asset_code: serialIndex + 2,
    it_asset_tag: serialIndex + 3,
    cpu_configuration: serialIndex + 4,
    hdd_size: serialIndex + 5,
    ram_size: serialIndex + 6,
    display_type: serialIndex + 7,
    display_size: serialIndex + 8
  };

  Object.entries(shiftedFieldIndexes).forEach(([fieldKey, index]) => {
    customFieldOverrides[fieldKey] = sanitizeText(row[index], NOT_AVAILABLE) || NOT_AVAILABLE;
  });

  correctedFields.assetTag = shiftedAssetTag;
  correctedFields.cpuConfiguration = sanitizeText(row[serialIndex + 4]);
  correctedFields.storageSize = sanitizeText(row[serialIndex + 5]);
  correctedFields.ramSize = sanitizeText(row[serialIndex + 6]);
  correctedFields.displaySize = sanitizeText(row[serialIndex + 8]);

  if (
    looksLikePoNumberValue(row[71]) &&
    looksLikeDateValue(row[72]) &&
    (looksLikeAmountValue(row[75]) || /tax/i.test(sanitizeText(row[76])))
  ) {
    const procurementShiftIndexes = {
      accsesories_provided: null,
      p_o_number: 71,
      date_of_procurement: 72,
      invoice_no: 73,
      invoice_date: 74,
      procurement_price: 75,
      exclude_tax_charge: 76,
      vendor_name: 77,
      vendor_address: 78,
      warranty_period: 79,
      warranty_start_date: 80,
      warranty_end_date: 81,
      warranty_satus: 82,
      file_folder_no: 83,
      individual_ups_installed: 84,
      status: 85,
      remark: 86,
      usage_type: 87,
      age_as_on_date: 88
    };

    Object.entries(procurementShiftIndexes).forEach(([fieldKey, index]) => {
      customFieldOverrides[fieldKey] = index === null
        ? NOT_AVAILABLE
        : sanitizeText(row[index], NOT_AVAILABLE) || NOT_AVAILABLE;
    });

    correctedFields.status = sanitizeText(row[85]);
    correctedFields.remark = sanitizeText(row[86]);
  }

  return { fields: correctedFields, customFieldOverrides };
}

function buildCustomFields(headers, row, sheetName, rowNumber) {
  const customFields = {
    _migration: {
      sourceFile: path.basename(migrationFile),
      primarySourceSheet: sheetName,
      sourceSheets: [sheetName],
      sourceRows: [{ sheetName, rowNumber }]
    }
  };

  headers.forEach((header, index) => {
    const key = sanitizeHeaderKey(header);
    if (!key) {
      return;
    }

    const value = sanitizeText(row[index], NOT_AVAILABLE);
    customFields[key] = value || NOT_AVAILABLE;
  });

  return customFields;
}

function resolveWorkbookAssetTag(fields, customFields) {
  const candidates = [
    fields.assetTag,
    customFields.it_asset_tag,
    customFields.finance_asset_code,
    customFields.asset_code,
    customFields.asset_tag
  ];

  return candidates.find((candidate) => isValidWorkbookAssetTag(candidate)) || sanitizeText(fields.assetTag);
}

function categoryFromAssetTag(assetTag) {
  const value = sanitizeText(assetTag).toUpperCase();
  const match = value.match(/^UAIL\/IT\/([A-Z]{2})\//);
  if (!match) {
    if (value.includes('/BC/')) return 'SERVER';
    return '';
  }

  const code = match[1];
  const lookup = {
    LT: 'LAPTOP',
    DT: 'DESKTOP',
    PR: 'PRINTER',
    MT: 'MTR',
    KM: 'KIOSK',
    SE: 'SERVER',
    BC: 'SERVER',
    SW: 'SWITCH',
    RT: 'ROUTER',
    FW: 'FIREWALL',
    UP: 'UPS',
    AP: 'ACCESS_POINT',
    VC: 'VC_UNIT',
    DC: 'DATA_CARD',
    CS: 'CONSUMABLE'
  };

  return lookup[code] || '';
}

function inferCategory(sheetName, fields) {
  const assetTagCategory = categoryFromAssetTag(fields.assetTag);
  if (assetTagCategory) {
    return assetTagCategory;
  }

  const direct = [
    fields.type,
    sheetName,
    fields.name,
    fields.model,
    fields.software
  ].map(normalizeAssetCategory).find((category) => category !== 'OTHER');

  return direct || 'OTHER';
}

function statusHintFromSheet(sheetName) {
  const normalized = normalizeComparableText(sheetName);

  if (
    normalized.includes('sold') ||
    normalized.includes('scrap') ||
    normalized.includes('retirement') ||
    normalized.includes('donation') ||
    normalized.includes('transferred')
  ) {
    return 'DISPOSED';
  }

  if (normalized.includes('stolen') || normalized.includes('theft')) {
    return 'LOST';
  }

  return '';
}

function deriveStatus(sheetName, fields) {
  const explicitStatus = normalizeAssetStatus(
    [fields.status, fields.lifeCycle, fields.remark].filter(Boolean).join(' | '),
    ''
  );
  const sheetStatus = statusHintFromSheet(sheetName);

  if (STATUS_PRIORITY[explicitStatus] >= STATUS_PRIORITY[sheetStatus || 'PROCURED']) {
    return explicitStatus || sheetStatus || 'PROCURED';
  }

  return sheetStatus || explicitStatus || 'PROCURED';
}

function buildLocation(location, subLocation) {
  const primary = sanitizeText(location);
  const secondary = sanitizeText(subLocation);

  if (primary && secondary && primary.toLowerCase() !== secondary.toLowerCase()) {
    return `${primary} / ${secondary}`;
  }

  return primary || secondary || NOT_AVAILABLE;
}

function buildModel(make, model, category) {
  const finalMake = sanitizeText(make);
  const finalModel = sanitizeText(model);
  const combined = [finalMake, finalModel].filter(Boolean).join(' ').trim();

  return combined || NOT_AVAILABLE || getDefaultAssetType(category);
}

function normalizeInlineText(value) {
  return sanitizeText(value).replace(/\s+/g, ' ').trim();
}

function isVendorStyledName(value, customFields) {
  const candidate = normalizeInlineText(value);
  if (!candidate || candidate === NOT_AVAILABLE) {
    return false;
  }

  const vendorCandidates = [
    customFields.vendor_name_address,
    customFields.vendor_name,
    customFields.vendor_address
  ]
    .map(normalizeInlineText)
    .filter(Boolean);

  if (vendorCandidates.some((vendor) => normalizeComparableText(vendor) === normalizeComparableText(candidate))) {
    return true;
  }

  return (
    /[\r\n,]/.test(String(value || '')) &&
    /\b(?:ltd|limited|pvt|private|infotech|computers|services|building|floor|road|nagar|india|odisha|maharashtra|mumbai|bhubaneswar|vadodara|visakhapatnam)\b/i.test(candidate)
  );
}

function buildAssetName(fields, category, model, fallbackId, customFields = {}) {
  const candidates = [
    fields.displayName,
    fields.name,
    fields.userName,
    fields.hostname
  ];

  for (const candidate of candidates) {
    const cleanCandidate = sanitizeText(candidate);
    if (!cleanCandidate || isVendorStyledName(cleanCandidate, customFields)) {
      continue;
    }

    return cleanCandidate;
  }

  return pickFirstMeaningful(
    model !== NOT_AVAILABLE ? model : '',
    `${getAssetCategoryLabel(category)} ${fallbackId}`
  ) || `${getAssetCategoryLabel(category)} ${fallbackId}`;
}

function cleanSerialNumber(value, fallbackId) {
  const serial = sanitizeText(value);
  return serial || `Not Available - ${fallbackId}`;
}

function isValidWorkbookAssetTag(assetTag) {
  const value = sanitizeText(assetTag).toUpperCase();
  return /^UAIL\/IT\/[A-Z]{2,3}\/[A-Z0-9-]+$/.test(value);
}

function createCandidateKeys(assetTag, serialNumber, hostname) {
  const keys = [];
  if (isValidWorkbookAssetTag(assetTag)) {
    keys.push(`tag:${assetTag.toUpperCase()}`);
  }

  const serial = sanitizeText(serialNumber);
  if (serial && !serial.startsWith('Not Available -')) {
    keys.push(`serial:${serial.toUpperCase()}`);
  }

  const host = sanitizeText(hostname);
  if (host && host !== NOT_AVAILABLE) {
    keys.push(`host:${host.toUpperCase()}`);
  }

  return keys;
}

function shouldOverwriteValue(currentValue, nextValue) {
  const current = sanitizeText(currentValue);
  const next = sanitizeText(nextValue);

  if (!next) {
    return false;
  }

  if (!current || current === NOT_AVAILABLE || current.startsWith('Not Available -')) {
    return true;
  }

  return false;
}

function mergeCustomFields(currentCustomFields, nextCustomFields, sheetName, rowNumber) {
  const merged = {
    ...(currentCustomFields || {})
  };

  const currentMigration = merged._migration && typeof merged._migration === 'object'
    ? merged._migration
    : {};

  const sourceSheets = Array.isArray(currentMigration.sourceSheets)
    ? currentMigration.sourceSheets.slice()
    : [];
  if (!sourceSheets.includes(sheetName)) {
    sourceSheets.push(sheetName);
  }

  const sourceRows = Array.isArray(currentMigration.sourceRows)
    ? currentMigration.sourceRows.slice()
    : [];
  sourceRows.push({ sheetName, rowNumber });

  Object.entries(nextCustomFields || {}).forEach(([key, value]) => {
    if (key === '_migration') {
      return;
    }

    if (shouldOverwriteValue(merged[key], value)) {
      merged[key] = value;
    } else if (merged[key] === undefined) {
      merged[key] = value;
    }
  });

  merged._migration = {
    sourceFile: path.basename(migrationFile),
    primarySourceSheet: currentMigration.primarySourceSheet || sheetName,
    sourceSheets,
    sourceRows
  };

  return merged;
}

function mergeRecords(baseRecord, incomingRecord) {
  const currentStatusPriority = STATUS_PRIORITY[baseRecord.status] || 0;
  const nextStatusPriority = STATUS_PRIORITY[incomingRecord.status] || 0;

  if (shouldOverwriteValue(baseRecord.assetTag, incomingRecord.assetTag) && isValidWorkbookAssetTag(incomingRecord.assetTag)) {
    baseRecord.assetTag = incomingRecord.assetTag;
  }

  if (shouldOverwriteValue(baseRecord.serialNumber, incomingRecord.serialNumber)) {
    baseRecord.serialNumber = incomingRecord.serialNumber;
  }

  if (shouldOverwriteValue(baseRecord.name, incomingRecord.name)) {
    baseRecord.name = incomingRecord.name;
  }

  if (shouldOverwriteValue(baseRecord.model, incomingRecord.model)) {
    baseRecord.model = incomingRecord.model;
  }

  if (shouldOverwriteValue(baseRecord.location, incomingRecord.location)) {
    baseRecord.location = incomingRecord.location;
  }

  if (shouldOverwriteValue(baseRecord.type, incomingRecord.type)) {
    baseRecord.type = incomingRecord.type;
  }

  if (shouldOverwriteValue(baseRecord.ownerEmail, incomingRecord.ownerEmail)) {
    baseRecord.ownerEmail = incomingRecord.ownerEmail;
  }

  if (shouldOverwriteValue(baseRecord.hostname, incomingRecord.hostname)) {
    baseRecord.hostname = incomingRecord.hostname;
  }

  if (baseRecord.category === 'OTHER' && incomingRecord.category !== 'OTHER') {
    baseRecord.category = incomingRecord.category;
  }

  if (nextStatusPriority > currentStatusPriority) {
    baseRecord.status = incomingRecord.status;
    baseRecord.sourceSheet = incomingRecord.sourceSheet;
  }

  baseRecord.customFields = mergeCustomFields(
    baseRecord.customFields,
    incomingRecord.customFields,
    incomingRecord.sourceSheet,
    incomingRecord.rowNumber
  );
  baseRecord.isIncomplete = baseRecord.isIncomplete && incomingRecord.isIncomplete;
}

function readEnrichmentCache() {
  if (!fs.existsSync(enrichmentCacheFile)) {
    return {};
  }

  try {
    const rawCache = JSON.parse(fs.readFileSync(enrichmentCacheFile, 'utf8'));

    return Object.fromEntries(
      Object.entries(rawCache).filter(([, entry]) => entry && entry.cacheVersion === ENRICHMENT_CACHE_VERSION)
    );
  } catch (error) {
    console.warn(`Unable to read model enrichment cache, starting fresh: ${error.message}`);
    return {};
  }
}

function writeEnrichmentCache(cache) {
  fs.writeFileSync(enrichmentCacheFile, JSON.stringify(cache, null, 2));
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_error) {
    return '';
  }
}

function decodeDuckDuckGoTarget(href) {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.href;
  } catch (_error) {
    return href;
  }
}

function parseDuckDuckGoResults(html) {
  const titleMatches = [...html.matchAll(/<h2 class="result__title">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippetMatches = [...html.matchAll(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];

  return titleMatches.slice(0, 6).map((match, index) => {
    const url = decodeDuckDuckGoTarget(match[1]);
    return {
      title: decodeHtmlEntities(match[2]),
      url,
      domain: extractDomain(url),
      snippet: decodeHtmlEntities(snippetMatches[index] ? snippetMatches[index][1] : '')
    };
  });
}

function resultRelevanceScore(result, vendorDomains) {
  let score = 0;
  if (vendorDomains.some((domain) => result.domain.includes(domain))) {
    score += 100;
  }
  if (result.title.toLowerCase().includes('spec')) score += 10;
  if (result.snippet.toLowerCase().includes('spec')) score += 10;
  return score;
}

function scoreResultTokenOverlap(result, tokens) {
  if (!tokens.length) {
    return { overlapCount: 0, overlapRatio: 0, exactPhrase: false };
  }

  const haystack = normalizeComparableText(`${result.title} ${result.snippet} ${result.domain}`);
  const overlapCount = tokens.filter((token) => haystack.includes(token)).length;
  const overlapRatio = overlapCount / tokens.length;
  const exactPhrase = haystack.includes(tokens.join(' '));

  return { overlapCount, overlapRatio, exactPhrase };
}

function isResultConfident(result, make, model, vendorDomains) {
  const tokens = extractModelLookupTokens(make, model);
  const vendorTokens = tokenizeComparableText(make);
  const haystack = normalizeComparableText(`${result.title} ${result.snippet} ${result.domain}`);
  const overlap = scoreResultTokenOverlap(result, tokens);
  const vendorMatched = vendorDomains.some((domain) => result.domain.includes(domain))
    || vendorTokens.some((token) => haystack.includes(token));
  const score = resultRelevanceScore(result, vendorDomains)
    + (overlap.overlapCount * 25)
    + (overlap.exactPhrase ? 40 : 0)
    + (vendorMatched ? 15 : 0);

  if (!tokens.length) {
    return false;
  }

  if (tokens.length === 1) {
    return vendorMatched && overlap.overlapCount === 1 && score >= 40;
  }

  if (!vendorMatched && vendorDomains.length) {
    return false;
  }

  return overlap.overlapCount >= 2 && overlap.overlapRatio >= 0.66 && score >= 60;
}

function extractSpecsFromText(text) {
  const clean = decodeHtmlEntities(text);
  const cpuMatch = clean.match(/((?:Intel|AMD|Xeon|Ryzen|Celeron|Pentium|Core\s*i[3579]|Apple\s*M\d)[^,.|;]{0,80})/i);
  const ramMatch = clean.match(/\b(\d{1,3}\s?GB(?:\s(?:DDR\d|LPDDR\d|DDR\d-SDRAM|SDRAM))?)\b/i);
  const storageMatch = clean.match(/\b(\d(?:\.\d+)?\s?(?:TB|GB)\s?(?:SSD|HDD|NVMe|eMMC|SATA|Flash)?)\b/i);
  const osMatch = clean.match(/\b(Windows(?:\sServer)?\s\d+(?:\s(?:Pro|Home|Standard|Enterprise))?|Ubuntu|Linux|macOS|Chrome OS)\b/i);
  const displayMatch = clean.match(/\b(\d{1,2}(?:\.\d)?\s?(?:\"|inch|inches|cm)|\d{2}\.\d\s?cm)\b/i);
  const portMatch = clean.match(/\b(\d{1,3}\s?(?:ports?|port))\b/i);
  const outputCapacityMatch = clean.match(/\b(\d(?:\.\d+)?\s?(?:VA|W|WATT|KVA))\b/i);

  return {
    cpuConfiguration: cpuMatch ? cpuMatch[1].trim() : NOT_AVAILABLE,
    ramSize: ramMatch ? ramMatch[1].trim() : NOT_AVAILABLE,
    storageSize: storageMatch ? storageMatch[1].trim() : NOT_AVAILABLE,
    operatingSystem: osMatch ? osMatch[1].trim() : NOT_AVAILABLE,
    displaySize: displayMatch ? displayMatch[1].trim() : NOT_AVAILABLE,
    portSummary: portMatch ? portMatch[1].trim() : NOT_AVAILABLE,
    outputCapacity: outputCapacityMatch ? outputCapacityMatch[1].trim() : NOT_AVAILABLE
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INTERNET_LOOKUP_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchResultPageText(url) {
  if (!url || url === NOT_AVAILABLE) {
    return '';
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return '';
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return '';
    }

    const html = await response.text();
    return decodeHtmlEntities(html).slice(0, 60000);
  } catch (_error) {
    return '';
  }
}

async function lookupModelOnInternet(modelQuery, make, cache) {
  const lookupLabel = buildLookupModelLabel(make, modelQuery);
  const cacheKey = normalizeModelKey(lookupLabel || make);
  if (!cacheKey) {
    return null;
  }

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  const query = `${lookupLabel} specs`.trim();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const results = parseDuckDuckGoResults(html);
    const vendorDomains = VENDOR_DOMAIN_HINTS[normalizeComparableText(make)] || [];
    const preferredResult = results
      .filter((result) => isResultConfident(result, make, modelQuery, vendorDomains))
      .slice()
      .sort((left, right) => resultRelevanceScore(right, vendorDomains) - resultRelevanceScore(left, vendorDomains))[0];
    const resultPageText = preferredResult ? await fetchResultPageText(preferredResult.url) : '';

    const sourceText = [
      preferredResult?.title || '',
      preferredResult?.snippet || '',
      resultPageText,
      ...results.slice(0, 3).map((result) => `${result.title}. ${result.snippet}`)
    ].join(' ');

    const extractedSpecs = extractSpecsFromText(sourceText);
    const enrichment = {
      cacheVersion: ENRICHMENT_CACHE_VERSION,
      query,
      lookupStatus: preferredResult ? 'FOUND' : 'NOT_FOUND',
      lookupError: NOT_AVAILABLE,
      lookedUpAt: new Date().toISOString(),
      topResultTitle: preferredResult?.title || NOT_AVAILABLE,
      topResultUrl: preferredResult?.url || NOT_AVAILABLE,
      topResultDomain: preferredResult?.domain || NOT_AVAILABLE,
      topResultSnippet: preferredResult?.snippet || NOT_AVAILABLE,
      extractedSpecs,
      results: results.slice(0, 3)
    };

    cache[cacheKey] = enrichment;
    return enrichment;
  } catch (error) {
    const enrichment = {
      cacheVersion: ENRICHMENT_CACHE_VERSION,
      query,
      lookupStatus: NOT_AVAILABLE,
      lookupError: error.message || NOT_AVAILABLE,
      lookedUpAt: new Date().toISOString(),
      topResultTitle: NOT_AVAILABLE,
      topResultUrl: NOT_AVAILABLE,
      topResultDomain: NOT_AVAILABLE,
      topResultSnippet: NOT_AVAILABLE,
      extractedSpecs: {
        cpuConfiguration: NOT_AVAILABLE,
        ramSize: NOT_AVAILABLE,
        storageSize: NOT_AVAILABLE,
        operatingSystem: NOT_AVAILABLE,
        displaySize: NOT_AVAILABLE,
        portSummary: NOT_AVAILABLE,
        outputCapacity: NOT_AVAILABLE
      },
      results: []
    };

    cache[cacheKey] = enrichment;
    return enrichment;
  }
}

function recordNeedsInternetEnrichment(record) {
  if (!INTERNET_ENRICHMENT_CATEGORIES.has(record.category)) {
    return false;
  }

  if (!hasSpecificLookupModel(record.customFields.make, record.model)) {
    return false;
  }

  const keys = ['cpu_configuration', 'ram_size', 'hdd_size', 'os_installed', 'display_size', 'output_capacity'];
  const missingCount = keys.filter((key) => !record.customFields[key] || record.customFields[key] === NOT_AVAILABLE).length;
  return record.model !== NOT_AVAILABLE && missingCount >= 2;
}

function applyInternetEnrichment(record, enrichment) {
  if (!enrichment) {
    return;
  }

  record.customFields.internet_lookup_query = enrichment.query || NOT_AVAILABLE;
  record.customFields.internet_lookup_status = enrichment.lookupStatus || NOT_AVAILABLE;
  record.customFields.internet_lookup_error = enrichment.lookupError || NOT_AVAILABLE;
  record.customFields.internet_top_result_title = enrichment.topResultTitle || NOT_AVAILABLE;
  record.customFields.internet_top_result_url = enrichment.topResultUrl || NOT_AVAILABLE;
  record.customFields.internet_top_result_domain = enrichment.topResultDomain || NOT_AVAILABLE;
  record.customFields.internet_top_result_snippet = enrichment.topResultSnippet || NOT_AVAILABLE;

  const specs = enrichment.extractedSpecs || {};
  record.customFields.internet_cpu_configuration = specs.cpuConfiguration || NOT_AVAILABLE;
  record.customFields.internet_ram_size = specs.ramSize || NOT_AVAILABLE;
  record.customFields.internet_storage_size = specs.storageSize || NOT_AVAILABLE;
  record.customFields.internet_operating_system = specs.operatingSystem || NOT_AVAILABLE;
  record.customFields.internet_display_size = specs.displaySize || NOT_AVAILABLE;
  record.customFields.internet_port_summary = specs.portSummary || NOT_AVAILABLE;
  record.customFields.internet_output_capacity = specs.outputCapacity || NOT_AVAILABLE;

  const mappedFields = {
    cpu_configuration: specs.cpuConfiguration,
    ram_size: specs.ramSize,
    hdd_size: specs.storageSize,
    os_installed: specs.operatingSystem,
    display_size: specs.displaySize,
    output_capacity: specs.outputCapacity
  };

  Object.entries(mappedFields).forEach(([fieldKey, value]) => {
    if ((!record.customFields[fieldKey] || record.customFields[fieldKey] === NOT_AVAILABLE) && value && value !== NOT_AVAILABLE) {
      record.customFields[fieldKey] = value;
    }
  });
}

function getAssetTagSequence(record) {
  const existingTag = sanitizeText(record.assetTag).toUpperCase();
  const match = existingTag.match(/^UAIL\/IT\/([A-Z]{2,3})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    code: match[1],
    sequence: parseInt(match[2], 10)
  };
}

function ensureGeneratedIdentifiers(records) {
  const assetTagCounters = {};
  const usedAssetTags = new Set();
  const serialCounts = new Map();

  records.forEach((record) => {
    const sequence = getAssetTagSequence(record);
    if (sequence) {
      assetTagCounters[sequence.code] = Math.max(assetTagCounters[sequence.code] || 0, sequence.sequence);
      usedAssetTags.add(record.assetTag.toUpperCase());
    }

    const serialKey = record.serialNumber.toUpperCase();
    serialCounts.set(serialKey, (serialCounts.get(serialKey) || 0) + 1);
  });

  const assignedSerials = new Set();

  records.forEach((record, index) => {
    if (!isValidWorkbookAssetTag(record.assetTag)) {
      const code = getAssetCategoryCode(record.category);
      assetTagCounters[code] = (assetTagCounters[code] || 0) + 1;
      let candidate = `UAIL/IT/${code}/${String(assetTagCounters[code]).padStart(4, '0')}`;
      while (usedAssetTags.has(candidate.toUpperCase())) {
        assetTagCounters[code] += 1;
        candidate = `UAIL/IT/${code}/${String(assetTagCounters[code]).padStart(4, '0')}`;
      }

      record.assetTag = candidate;
      usedAssetTags.add(candidate.toUpperCase());
    }

    const originalSerialKey = record.serialNumber.toUpperCase();
    if ((serialCounts.get(originalSerialKey) || 0) > 1 || assignedSerials.has(originalSerialKey)) {
      let candidate = record.serialNumber;
      let suffix = 1;
      while (assignedSerials.has(candidate.toUpperCase())) {
        candidate = `Not Available - ${record.category}-${String(index + 1).padStart(5, '0')}-${suffix}`;
        suffix += 1;
      }

      record.serialNumber = candidate;
    }

    assignedSerials.add(record.serialNumber.toUpperCase());
  });
}

async function enrichRecords(records) {
  const cache = readEnrichmentCache();
  const modelTasks = new Map();

  records.forEach((record) => {
    if (!recordNeedsInternetEnrichment(record)) {
      return;
    }

    const cacheKey = normalizeModelKey(buildLookupModelLabel(record.customFields.make, record.model));
    if (!cacheKey || modelTasks.has(cacheKey)) {
      return;
    }

    modelTasks.set(cacheKey, {
      key: cacheKey,
      model: record.model,
      make: record.customFields.make && record.customFields.make !== NOT_AVAILABLE ? record.customFields.make : ''
    });
  });

  const tasks = [...modelTasks.values()];
  let completed = 0;

  for (let index = 0; index < tasks.length; index += INTERNET_LOOKUP_CONCURRENCY) {
    const batch = tasks.slice(index, index + INTERNET_LOOKUP_CONCURRENCY);
    const results = await Promise.all(
      batch.map((task) => lookupModelOnInternet(task.model, task.make, cache))
    );

    completed += batch.length;
    console.log(`Internet enrichment progress: ${completed}/${tasks.length} unique models`);

    batch.forEach((task, taskIndex) => {
      cache[task.key] = results[taskIndex];
    });

    writeEnrichmentCache(cache);
  }

  records.forEach((record) => {
    const cacheKey = normalizeModelKey(buildLookupModelLabel(record.customFields.make, record.model));
    if (!cacheKey || !cache[cacheKey]) {
      record.customFields.internet_lookup_status = NOT_AVAILABLE;
      return;
    }

    applyInternetEnrichment(record, cache[cacheKey]);
  });
}

async function clearExistingAssetInventory() {
  const assetCount = await prisma.asset.count();
  const historyCount = await prisma.assetHistory.count();

  console.log(`Clearing current asset inventory: ${assetCount} assets, ${historyCount} history rows...`);

  await prisma.$transaction([
    prisma.assetHistory.deleteMany(),
    prisma.asset.deleteMany()
  ]);
}

function buildRecordFromRow(sheetName, rowNumber, headers, headerIndexMap, row, usersByEmail) {
  const rawFields = extractFields(headers, headerIndexMap, row);
  const { fields, customFieldOverrides } = applySheetSpecificFieldCorrections(sheetName, headers, row, rawFields);
  const customFields = buildCustomFields(headers, row, sheetName, rowNumber);

  Object.entries(customFieldOverrides).forEach(([key, value]) => {
    customFields[key] = value || NOT_AVAILABLE;
  });

  const assetTag = resolveWorkbookAssetTag(fields, customFields);
  const category = inferCategory(sheetName, { ...fields, assetTag });
  const sheetFallbackId = `${sheetName.replace(/\s+/g, '-').toUpperCase()}-${rowNumber}`;
  const model = buildModel(fields.make, fields.model, category);
  const serialNumber = cleanSerialNumber(
    pickFirstMeaningful(fields.serialNumber, fields.hostname, ''),
    sheetFallbackId
  );
  const status = deriveStatus(sheetName, fields);
  const type = pickFirstMeaningful(fields.type, getDefaultAssetType(category)) || getDefaultAssetType(category);
  const location = buildLocation(fields.location, fields.subLocation);
  const ownerEmail = sanitizeText(fields.email).toLowerCase();
  const owner = ownerEmail ? usersByEmail.get(ownerEmail) : null;

  customFields.category = category;
  customFields.make = sanitizeText(fields.make, NOT_AVAILABLE) || NOT_AVAILABLE;
  customFields.model = model || NOT_AVAILABLE;
  customFields.status = sanitizeText(fields.status, customFields.status || NOT_AVAILABLE) || NOT_AVAILABLE;
  customFields.lifecycle = sanitizeText(fields.lifeCycle, NOT_AVAILABLE) || NOT_AVAILABLE;
  customFields.remark = sanitizeText(fields.remark, NOT_AVAILABLE) || NOT_AVAILABLE;
  const name = buildAssetName(fields, category, model, sanitizeText(assetTag, sheetFallbackId), customFields);

  return {
    category,
    assetTag,
    serialNumber,
    name,
    type,
    model: model || NOT_AVAILABLE,
    location,
    status,
    sourceSheet: sheetName,
    rowNumber,
    ownerId: owner ? owner.id : null,
    ownerEmail: owner ? owner.email : '',
    hostname: sanitizeText(fields.hostname, NOT_AVAILABLE) || NOT_AVAILABLE,
    customFields,
    isIncomplete: [assetTag, serialNumber, name, model, location].some((value) => !sanitizeText(value))
  };
}

async function migrate() {
  console.log('============================================================');
  console.log('Starting full asset migration');
  console.log('============================================================');

  if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(migrationFile);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true
    }
  });
  const usersByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user])
  );

  await clearExistingAssetInventory();

  const recordMap = new Map();
  const keyToRecordId = new Map();
  let recordSequence = 0;
  let processedRows = 0;

  for (const sheetName of workbook.SheetNames) {
    if (NON_ASSET_SHEETS.has(sheetName)) {
      console.log(`Skipping non-asset sheet: ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!rows.length) {
      continue;
    }

    const headerIndex = findHeaderRowIndex(rows, ['serial', 'tag', 'model', 'location']);
    const headers = (rows[headerIndex] || []).map((header) => sanitizeText(header));
    const headerIndexMap = buildHeaderIndexMap(headers);
    let sheetRowCount = 0;

    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!Array.isArray(row) || row.every((cell) => isBlankValue(cell))) {
        continue;
      }

      const record = buildRecordFromRow(sheetName, rowIndex + 1, headers, headerIndexMap, row, usersByEmail);
      const keys = createCandidateKeys(record.assetTag, record.serialNumber, record.hostname);
      const matchedRecordId = keys.map((key) => keyToRecordId.get(key)).find(Boolean);

      if (matchedRecordId) {
        mergeRecords(recordMap.get(matchedRecordId), record);
      } else {
        const recordId = `record-${++recordSequence}`;
        recordMap.set(recordId, record);
        keys.forEach((key) => keyToRecordId.set(key, recordId));
      }

      sheetRowCount += 1;
      processedRows += 1;
    }

    console.log(`Parsed ${sheetRowCount} rows from ${sheetName}.`);
  }

  const records = [...recordMap.values()];
  ensureGeneratedIdentifiers(records);
  await enrichRecords(records);

  console.log(`Persisting ${records.length} deduplicated assets to the database...`);

  let inserted = 0;
  for (const record of records) {
    let wStatus = 'Not Available';
    const cf = record.customFields || {};
    if (cf.warranty_satus && cf.warranty_satus !== 'Not Available') {
      wStatus = cf.warranty_satus;
    } else if (cf.warranty_end_date && cf.warranty_end_date !== 'Not Available') {
      const endDate = new Date(cf.warranty_end_date);
      if (!isNaN(endDate.getTime())) {
        wStatus = endDate < new Date() ? 'Expired' : 'Active';
      }
    }

    const createdAsset = await prisma.asset.create({
      data: {
        assetTag: record.assetTag,
        name: record.name,
        category: record.category,
        type: record.type,
        model: record.model || NOT_AVAILABLE,
        serialNumber: record.serialNumber,
        classification: 'INTERNAL',
        status: record.status,
        location: record.location || NOT_AVAILABLE,
        ownerId: record.ownerId,
        acceptableUseSigned: !!record.ownerId,
        signOffDate: record.ownerId ? new Date() : null,
        lastVerifiedDate: null,
        nextVerificationDue: null,
        sourceSheet: record.sourceSheet,
        customFields: record.customFields,
        isIncomplete: record.isIncomplete,
        warrantyStatus: wStatus
      }
    });

    await prisma.assetHistory.create({
      data: {
        assetId: createdAsset.id,
        action: 'MIGRATED',
        performedBy: 'system-migration',
        description: `Imported from workbook sheets: ${(record.customFields._migration.sourceSheets || []).join(', ')}.`
      }
    });

    inserted += 1;
    if (inserted % 250 === 0) {
      console.log(`Inserted ${inserted}/${records.length} assets...`);
      // Yield to the event loop to release memory and let GC run
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  console.log('============================================================');
  console.log(`Workbook rows processed: ${processedRows}`);
  console.log(`Assets imported: ${inserted}`);
  console.log(`Unique models cached for internet enrichment: ${Object.keys(readEnrichmentCache()).length}`);
  console.log('============================================================');

  await migrateAllocationHistory();

  await prisma.$disconnect();
}

async function migrateAllocationHistory() {
  console.log('============================================================');
  console.log('Starting asset allocation history migration');
  console.log('============================================================');

  const historyFile = path.resolve(__dirname, '../../data_migration/ASSET ISSUE AND REVOKE TRACK.xlsx');
  if (!fs.existsSync(historyFile)) {
    console.warn(`Allocation history file not found at: ${historyFile}`);
    return;
  }

  const workbook = XLSX.readFile(historyFile);
  const sheet = workbook.Sheets.Sheet1 || workbook.Sheets[workbook.SheetNames[0]];

  // Fix bloated range: the original file has a stray cell at row 1048565 causing
  // sheet_to_json to try processing 1M+ rows. Override to actual data extent.
  if (sheet['!ref']) {
    const refMatch = sheet['!ref'].match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (refMatch && parseInt(refMatch[4]) > 50000) {
      // Find actual last row with data
      const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
      let maxDataRow = 0;
      cellKeys.forEach(k => {
        const m = k.match(/^[A-Z]+(\d+)$/);
        if (m) {
          const r = parseInt(m[1]);
          // Skip obvious stray cells (e.g., row 1048565)
          if (r < 50000 && r > maxDataRow) maxDataRow = r;
        }
      });
      if (maxDataRow > 0) {
        const newRef = `${refMatch[1]}${refMatch[2]}:${refMatch[3]}${maxDataRow}`;
        console.log(`Overriding bloated sheet range ${sheet['!ref']} → ${newRef}`);
        sheet['!ref'] = newRef;
      }
    }
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (!rows.length) {
    console.warn('Allocation history sheet is empty.');
    return;
  }

  const headers = (rows[0] || []).map(h => String(h || '').trim());
  const headerMap = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (row, columnName) => {
    const idx = headerMap[columnName];
    if (idx === undefined) return '';
    return String(row[idx] || '').trim();
  };

  let createdHistoryCount = 0;
  let createdAssetCount = 0;

  // Clear existing allocation history first
  await prisma.allocationHistory.deleteMany();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    if (row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;

    const modelName = getCol(row, 'HOSTNAME') || 'Generic Model';
    const assetTag = ''; // No asset tag column in this file
    const serialNumber = getCol(row, 'SERIAL NO/SERVICE TAG');
    const employeeName = getCol(row, 'USER NAME');
    const employeeCode = getCol(row, 'SL NO');
    const department = '';
    const location = 'Hirakud Plant';
    const rawIssueDate = getCol(row, 'DATE');
    const rawRevokeDate = '';
    const actionType = getCol(row, 'ISSUED/ REVOKED') || 'ISSUED';
    const status = actionType.toUpperCase().includes('REVOKE') ? 'REVOKED' : 'ISSUED';
    const remarks = getCol(row, 'REMARK');

    if (!serialNumber) continue;

    // Find the asset by serial number or tag
    let asset = null;
    if (serialNumber) {
      asset = await prisma.asset.findUnique({ where: { serialNumber } });
    }
    if (!asset && assetTag) {
      asset = await prisma.asset.findUnique({ where: { assetTag } });
    }

    // If the asset doesn't exist, create it dynamically
    if (!asset) {
      const finalTag = assetTag || `UAIL/MIGRATE/HIST/${i}-${Date.now()}`;
      const finalSerial = serialNumber || `SN-MIGRATE-HIST-${i}-${Date.now()}`;
      const inferredCat = normalizeAssetCategory(modelName);

      try {
        asset = await prisma.asset.create({
          data: {
            assetTag: finalTag,
            name: modelName,
            category: inferredCat,
            type: getDefaultAssetType(inferredCat),
            model: modelName,
            serialNumber: finalSerial,
            classification: 'INTERNAL',
            status: status.toUpperCase() === 'ISSUED' ? 'ALLOCATED' : 'PROCURED',
            location: location,
            acceptableUseSigned: true,
            signOffDate: new Date(),
            isIncomplete: true
          }
        });
        createdAssetCount++;
      } catch (err) {
        console.warn(`  ⚠️ Failed to create dynamic asset for history row ${i}:`, err.message);
        continue;
      }
    }

    // Convert dates — guard against Invalid Date objects
    let issueDate = null;
    if (rawIssueDate) {
      const parsed = isNaN(rawIssueDate) ? new Date(rawIssueDate) : excelDateToDate(rawIssueDate);
      if (parsed && !isNaN(parsed.getTime()) && parsed.getFullYear() > 1970 && parsed.getFullYear() < 2100) {
        issueDate = parsed;
      }
    }
    let revokeDate = null;
    if (rawRevokeDate) {
      const parsed = isNaN(rawRevokeDate) ? new Date(rawRevokeDate) : excelDateToDate(rawRevokeDate);
      if (parsed && !isNaN(parsed.getTime()) && parsed.getFullYear() > 1970 && parsed.getFullYear() < 2100) {
        revokeDate = parsed;
      }
    }

    // Insert allocation history
    try {
      await prisma.allocationHistory.create({
        data: {
          assetId: asset.id,
          employeeName: employeeName || 'Unknown Employee',
          employeeCode: employeeCode || null,
          department: department || null,
          location: location || null,
          issueDate,
          revokeDate,
          status: status.toUpperCase(),
          remarks: remarks || null
        }
      });
      createdHistoryCount++;
    } catch (err) {
      console.warn(`  ⚠️ Failed to create allocation history entry at row ${i}:`, err.message);
    }
  }

  const dbHistCount = await prisma.allocationHistory.count();
  const dbAssetCount = await prisma.asset.count();
  console.log(`Successfully migrated ${createdHistoryCount} allocation history records.`);
  console.log(`Dynamically created ${createdAssetCount} missing assets from history track.`);
  console.log(`Verification - Database counts are: Assets=${dbAssetCount}, AllocationHistory=${dbHistCount}`);
  console.log('============================================================');
}

function excelDateToDate(excelSerial) {
  const days = Number(excelSerial);
  if (isNaN(days) || days <= 0) return null;
  const date = new Date((days - 25569) * 86400 * 1000);
  return date;
}



if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('Asset migration failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = {
  migrate,
  migrateAllocationHistoryOnly: async function () {
    await migrateAllocationHistory();
    await prisma.$disconnect();
  }
};
