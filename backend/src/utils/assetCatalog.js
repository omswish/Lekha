const ASSET_CATEGORY_CONFIG = {
  LAPTOP: {
    label: 'Laptop',
    tagCode: 'LT',
    defaultType: 'Laptop',
    aliases: ['laptop', 'lt']
  },
  DESKTOP: {
    label: 'Desktop',
    tagCode: 'DT',
    defaultType: 'Desktop',
    aliases: ['desktop', 'dt']
  },
  PRINTER: {
    label: 'Printer',
    tagCode: 'PR',
    defaultType: 'Printer',
    aliases: ['printer', 'pr']
  },
  MTR: {
    label: 'MTR',
    tagCode: 'MT',
    defaultType: 'MTR',
    aliases: ['mtr', 'meeting room', 'meeting room system', 'mt']
  },
  KIOSK: {
    label: 'Kiosk',
    tagCode: 'KM',
    defaultType: 'Kiosk',
    aliases: ['kiosk', 'km']
  },
  SERVER: {
    label: 'Server',
    tagCode: 'SE',
    defaultType: 'Server',
    aliases: ['server', 'blade center server', 'new server', 'old server', 'se']
  },
  STORAGE: {
    label: 'Storage',
    tagCode: 'ST',
    defaultType: 'Storage',
    aliases: ['storage', 'st']
  },
  TAPE_LIBRARY: {
    label: 'Tape Library',
    tagCode: 'TL',
    defaultType: 'Tape Library',
    aliases: ['tape library', 'tl']
  },
  SWITCH: {
    label: 'Switch',
    tagCode: 'SW',
    defaultType: 'Switch',
    aliases: ['switch', 'sw']
  },
  ROUTER: {
    label: 'Router',
    tagCode: 'RT',
    defaultType: 'Router',
    aliases: ['router', 'rt']
  },
  FIREWALL: {
    label: 'Firewall',
    tagCode: 'FW',
    defaultType: 'Firewall',
    aliases: ['firewall', 'fw', 'cyberoam']
  },
  UPS: {
    label: 'UPS',
    tagCode: 'UP',
    defaultType: 'UPS',
    aliases: ['ups', 'up']
  },
  ACCESS_POINT: {
    label: 'Access Point',
    tagCode: 'AP',
    defaultType: 'Access Point',
    aliases: ['access point', 'ap']
  },
  VC_UNIT: {
    label: 'VC Unit',
    tagCode: 'VC',
    defaultType: 'VC Unit',
    aliases: ['vc unit', 'vc']
  },
  DATA_CARD: {
    label: 'Data Card',
    tagCode: 'DC',
    defaultType: 'Data Card',
    aliases: ['data card', 'datacard', 'dc']
  },
  PROJECTOR: {
    label: 'Projector',
    tagCode: 'PJ',
    defaultType: 'Projector',
    aliases: ['projector', 'pj']
  },
  CONSUMABLE: {
    label: 'Consumable',
    tagCode: 'CS',
    defaultType: 'Consumable',
    aliases: ['consumable', 'consumable spares', 'spares', 'cs']
  },
  OTHER: {
    label: 'Other',
    tagCode: 'OT',
    defaultType: 'Other',
    aliases: ['other', 'asset']
  }
};

function normalizeLookupValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeAssetCategory(value) {
  const normalized = normalizeLookupValue(value);
  if (!normalized) {
    return 'OTHER';
  }

  for (const [category, config] of Object.entries(ASSET_CATEGORY_CONFIG)) {
    if (config.aliases.includes(normalized)) {
      return category;
    }
  }

  if (normalized.includes('laptop')) return 'LAPTOP';
  if (normalized.includes('desktop')) return 'DESKTOP';
  if (normalized.includes('printer')) return 'PRINTER';
  if (normalized.includes('kiosk')) return 'KIOSK';
  if (normalized.includes('mtr') || normalized.includes('meeting room')) return 'MTR';
  if (normalized.includes('server')) return 'SERVER';
  if (normalized.includes('router')) return 'ROUTER';
  if (normalized.includes('switch')) return 'SWITCH';
  if (normalized.includes('firewall') || normalized.includes('cyberoam')) return 'FIREWALL';
  if (normalized.includes('storage')) return 'STORAGE';
  if (normalized.includes('tape')) return 'TAPE_LIBRARY';
  if (normalized.includes('ups')) return 'UPS';
  if (normalized.includes('access point')) return 'ACCESS_POINT';
  if (normalized.includes('vc')) return 'VC_UNIT';
  if (normalized.includes('data card')) return 'DATA_CARD';
  if (normalized.includes('projector')) return 'PROJECTOR';
  if (normalized.includes('consumable') || normalized.includes('spares')) return 'CONSUMABLE';

  return 'OTHER';
}

function getAssetCategoryConfig(category) {
  return ASSET_CATEGORY_CONFIG[normalizeAssetCategory(category)] || ASSET_CATEGORY_CONFIG.OTHER;
}

function getAssetCategoryCode(category) {
  return getAssetCategoryConfig(category).tagCode;
}

function getDefaultAssetType(category) {
  return getAssetCategoryConfig(category).defaultType;
}

function getAssetCategoryLabel(category) {
  return getAssetCategoryConfig(category).label;
}

function normalizeAssetStatus(rawValue, fallback = 'PROCURED') {
  const value = normalizeLookupValue(rawValue);
  if (!value) {
    return fallback;
  }

  if (value.includes('lost') || value.includes('stolen') || value.includes('theft')) {
    return 'LOST';
  }

  if (value.includes('not working')) {
    return 'MAINTENANCE';
  }

  if (
    value.includes('stock') ||
    value.includes('store') ||
    value.includes('available')
  ) {
    return 'PROCURED';
  }

  if (
    value.includes('repair') ||
    value.includes('service') ||
    value.includes('maintenance')
  ) {
    return 'MAINTENANCE';
  }

  if (
    value.includes('sold') ||
    value.includes('scrap') ||
    value.includes('retire') ||
    value.includes('dispose') ||
    value.includes('donation')
  ) {
    return 'DISPOSED';
  }

  if (
    value.includes('allocated') ||
    value.includes('issued') ||
    value.includes('working in use') ||
    value.includes('in use') ||
    value.includes('operational stage') ||
    value.includes('working')
  ) {
    return 'ALLOCATED';
  }

  if (
    value.includes('procured') ||
    value.includes('new') ||
    value.includes('design stage') ||
    value.includes('phasing out stage')
  ) {
    return 'PROCURED';
  }

  return fallback;
}

module.exports = {
  ASSET_CATEGORY_CONFIG,
  getAssetCategoryCode,
  getAssetCategoryConfig,
  getAssetCategoryLabel,
  getDefaultAssetType,
  normalizeAssetCategory,
  normalizeAssetStatus
};
