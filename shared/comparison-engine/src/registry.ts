import type { CategoryDefinition, Registry, SpecDefinition } from './types.ts';

// All 16 categories from the spec. In production this is loaded from the
// database (spec_definitions / categories tables); this file is the seed.
const c = (
  key: string, order: number, priority: CategoryDefinition['priority'],
  weightGroup: CategoryDefinition['weightGroup'], sceneType: string, enabledByDefault = true,
): CategoryDefinition => ({
  key, order, priority, weightGroup,
  labelKey: `category.${key}.label`,
  descriptionKey: `category.${key}.description`,
  video: { sceneType, maxFactsPerScene: 4, enabledByDefault },
});

export const categories: CategoryDefinition[] = [
  c('overview', 0, 'P0', 'none', 'featureGrid', false),
  c('performance', 1, 'P0', 'performance', 'processorBattle'),
  c('camera', 2, 'P0', 'camera', 'cameraBattle'),
  c('display', 3, 'P0', 'display', 'displayBattle'),
  c('battery', 4, 'P0', 'battery', 'batteryBattle'),
  c('software', 5, 'P0', 'software', 'softwareCards'),
  c('price', 6, 'P0', 'price', 'priceBattle'),
  c('ai', 7, 'P0', 'ai', 'featureGrid'),
  c('design', 8, 'P1', 'design', 'designReveal'),
  c('audio', 9, 'P1', 'none', 'featureGrid'),
  c('connectivity', 10, 'P1', 'none', 'featureGrid'),
  c('biometrics', 11, 'P1', 'none', 'featureGrid'),
  c('reliability', 12, 'P1', 'none', 'issueList', false),
  c('service', 13, 'P1', 'none', 'priceBattle', false),
  c('ecosystem', 14, 'P1', 'none', 'featureGrid', false),
  c('reviews', 15, 'P2', 'none', 'ratingCards', false),
  c('recommendation', 16, 'P2', 'none', 'verdict'),
];

const s = (
  key: string, categoryKey: string, order: number, d: Partial<SpecDefinition> & Pick<SpecDefinition, 'type' | 'direction'>,
): SpecDefinition => ({
  key, categoryKey, order,
  labelKey: `spec.${key}.label`,
  explainKey: `spec.${key}.explain`,
  tier: 'detailed', weight: 0.5, ...d,
});

// Representative spec set per category. New specs are added as data rows —
// the engine, dashboard and video adapters need no code changes.
export const specs: SpecDefinition[] = [
  s('chipset', 'performance', 1, { type: 'text', direction: 'none', tier: 'quick' }),
  s('process_node_nm', 'performance', 2, { type: 'number', unit: 'nm', direction: 'none', tier: 'techie' }),
  s('antutu', 'performance', 3, { type: 'number', direction: 'higher', comparableBy: ['version'], minMeaningfulDelta: 50000, weight: 1, tier: 'quick' }),
  s('geekbench_single', 'performance', 4, { type: 'number', direction: 'higher', comparableBy: ['version'], minMeaningfulDelta: 100, weight: 0.8 }),
  s('geekbench_multi', 'performance', 5, { type: 'number', direction: 'higher', comparableBy: ['version'], minMeaningfulDelta: 300, weight: 0.8 }),
  s('ram_type', 'performance', 6, { type: 'enum', direction: 'rank', rankOrder: ['LPDDR5X', 'LPDDR5', 'LPDDR4X', 'LPDDR4'], weight: 0.3, tier: 'techie' }),
  s('storage_type', 'performance', 7, { type: 'enum', direction: 'rank', rankOrder: ['UFS 4.1', 'UFS 4.0', 'UFS 3.1', 'UFS 2.2'], weight: 0.3, tier: 'techie' }),

  s('main_camera_mp', 'camera', 1, { type: 'number', unit: 'MP', direction: 'none', tier: 'quick' }), // megapixels alone don't decide quality
  s('main_sensor', 'camera', 2, { type: 'text', direction: 'none', tier: 'techie' }),
  s('main_sensor_size_inch', 'camera', 3, { type: 'text', direction: 'none', tier: 'techie' }),
  s('ois', 'camera', 4, { type: 'boolean', direction: 'higher', weight: 0.6 }),
  s('optical_zoom_x', 'camera', 5, { type: 'number', unit: 'x', direction: 'higher', minMeaningfulDelta: 1, weight: 0.6 }),
  s('video_max', 'camera', 6, { type: 'enum', direction: 'rank', rankOrder: ['8K', '4K120', '4K60', '4K30', '1080p60', '1080p30'], weight: 0.7 }),

  s('display_tech', 'display', 1, { type: 'text', direction: 'none', tier: 'quick' }),
  s('screen_size_in', 'display', 2, { type: 'number', unit: 'in', direction: 'none', tier: 'quick' }),
  s('refresh_rate_hz', 'display', 3, { type: 'number', unit: 'Hz', direction: 'higher', minMeaningfulDelta: 20, weight: 0.8, tier: 'quick' }),
  s('peak_brightness_nits', 'display', 4, { type: 'number', unit: 'nits', direction: 'higher', comparableBy: ['method'], minMeaningfulDelta: 300, weight: 0.7 }),
  s('pwm_hz', 'display', 5, { type: 'number', unit: 'Hz', direction: 'higher', minMeaningfulDelta: 240, weight: 0.4, tier: 'techie' }),

  s('battery_mah', 'battery', 1, { type: 'number', unit: 'mAh', direction: 'higher', minMeaningfulDelta: 300, weight: 0.6, tier: 'quick' }),
  s('wired_charging_w', 'battery', 2, { type: 'number', unit: 'W', direction: 'higher', minMeaningfulDelta: 10, weight: 0.5, tier: 'quick' }),
  s('charge_0_100_min', 'battery', 3, { type: 'number', unit: 'min', direction: 'lower', comparableBy: ['charger'], minMeaningfulDelta: 8, weight: 0.6 }),
  s('screen_on_time_h', 'battery', 4, { type: 'number', unit: 'h', direction: 'higher', comparableBy: ['test'], minMeaningfulDelta: 0.75, weight: 1 }),
  s('wireless_charging_w', 'battery', 5, { type: 'number', unit: 'W', direction: 'higher', minMeaningfulDelta: 5, weight: 0.3 }),

  s('os_at_launch', 'software', 1, { type: 'text', direction: 'none', tier: 'quick' }),
  s('os_updates_years', 'software', 2, { type: 'number', unit: 'years', direction: 'higher', minMeaningfulDelta: 1, weight: 1, tier: 'quick' }),
  s('security_updates_years', 'software', 3, { type: 'number', unit: 'years', direction: 'higher', minMeaningfulDelta: 1, weight: 0.8 }),

  s('launch_price_inr', 'price', 1, { type: 'number', unit: 'INR', direction: 'lower', minMeaningfulDelta: 2000, weight: 0.4, tier: 'quick' }),
  s('current_price_inr', 'price', 2, { type: 'number', unit: 'INR', direction: 'lower', minMeaningfulDelta: 2000, weight: 1, tier: 'quick' }),

  s('ai_assistant', 'ai', 1, { type: 'text', direction: 'none' }),
  s('on_device_ai', 'ai', 2, { type: 'boolean', direction: 'higher', weight: 0.6 }),

  s('weight_g', 'design', 1, { type: 'number', unit: 'g', direction: 'lower', minMeaningfulDelta: 10, weight: 0.5, tier: 'quick' }),
  s('ip_rating', 'design', 2, { type: 'enum', direction: 'rank', rankOrder: ['IP69', 'IP68', 'IP67', 'IP66', 'IP65', 'IP64', 'IP48', 'IPX8', 'IP54', 'IP53', 'IP52', 'None'], weight: 0.7 }),
  s('frame_material', 'design', 3, { type: 'text', direction: 'none' }),

  s('stereo_speakers', 'audio', 1, { type: 'boolean', direction: 'higher', weight: 0.6 }),
  s('headphone_jack', 'audio', 2, { type: 'boolean', direction: 'none' }),
  s('wifi_version', 'connectivity', 1, { type: 'enum', direction: 'rank', rankOrder: ['Wi-Fi 7', 'Wi-Fi 6E', 'Wi-Fi 6', 'Wi-Fi 5'], weight: 0.5 }),
  s('esim', 'connectivity', 2, { type: 'boolean', direction: 'none' }),
  s('fingerprint_type', 'biometrics', 1, { type: 'enum', direction: 'rank', rankOrder: ['ultrasonic', 'optical', 'capacitive', 'side-mounted'], weight: 0.5 }),
  s('known_issues', 'reliability', 1, { type: 'list', direction: 'none' }),
  s('display_replacement_inr', 'service', 1, { type: 'number', unit: 'INR', direction: 'lower', minMeaningfulDelta: 1000, weight: 0.6 }),
  s('cross_device_sharing', 'ecosystem', 1, { type: 'text', direction: 'none' }),
  s('expert_rating', 'reviews', 1, { type: 'number', direction: 'none' }), // ratings from different outlets aren't comparable

  // Common specs every phone page lists (added 2026-11-02).
  s('launch_date', 'overview', 1, { type: 'text', direction: 'none', tier: 'quick' }),
  s('dimensions_mm', 'overview', 2, { type: 'text', direction: 'none' }),
  s('colours', 'overview', 3, { type: 'list', direction: 'none' }),
  s('cpu', 'performance', 8, { type: 'text', direction: 'none', tier: 'techie' }),
  s('gpu', 'performance', 9, { type: 'text', direction: 'none', tier: 'techie' }),
  s('ram_gb', 'performance', 10, { type: 'number', unit: 'GB', direction: 'higher', minMeaningfulDelta: 2, weight: 0.4, tier: 'quick' }),
  s('storage_gb', 'performance', 11, { type: 'number', unit: 'GB', direction: 'higher', minMeaningfulDelta: 64, weight: 0.3, tier: 'quick' }),
  s('storage_options', 'performance', 12, { type: 'text', direction: 'none' }),
  s('main_aperture', 'camera', 7, { type: 'text', direction: 'none', tier: 'techie' }),
  s('ultrawide_mp', 'camera', 8, { type: 'number', unit: 'MP', direction: 'none' }),
  s('telephoto_mp', 'camera', 9, { type: 'number', unit: 'MP', direction: 'none' }),
  s('front_camera_mp', 'camera', 10, { type: 'number', unit: 'MP', direction: 'none', tier: 'quick' }),
  s('front_video_max', 'camera', 11, { type: 'enum', direction: 'rank', rankOrder: ['4K60', '4K30', '1080p60', '1080p30'], weight: 0.3 }),
  s('resolution', 'display', 6, { type: 'text', direction: 'none' }),
  s('ppi', 'display', 7, { type: 'number', unit: 'ppi', direction: 'higher', minMeaningfulDelta: 50, weight: 0.3, tier: 'techie' }),
  s('screen_protection', 'display', 8, { type: 'text', direction: 'none' }),
  s('thickness_mm', 'design', 4, { type: 'number', unit: 'mm', direction: 'lower', minMeaningfulDelta: 0.5, weight: 0.3 }),
  s('back_material', 'design', 5, { type: 'text', direction: 'none' }),
  s('five_g', 'connectivity', 3, { type: 'boolean', direction: 'higher', weight: 0.3 }),
  s('bluetooth_version', 'connectivity', 4, { type: 'text', direction: 'none' }),
  s('nfc', 'connectivity', 5, { type: 'boolean', direction: 'higher', weight: 0.3 }),
  s('usb', 'connectivity', 6, { type: 'text', direction: 'none' }),
  s('face_unlock', 'biometrics', 2, { type: 'text', direction: 'none' }),
  s('ai_features', 'ai', 3, { type: 'list', direction: 'none' }),
  s('circle_to_search', 'ai', 4, { type: 'boolean', direction: 'none' }),
];

export const defaultRegistry: Registry = { version: '2026.11.11', categories, specs };
