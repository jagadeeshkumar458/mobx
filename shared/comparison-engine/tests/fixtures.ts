// FICTIONAL test phones. These are NOT real products and NOT verified product
// data — they exist only to exercise engine rules (missing data, unverified
// values, mismatched benchmark versions, ties). Real seed data goes through
// the admin import with sources attached.
import type { PhoneRecord, SpecValue } from '../src/types.ts';

const m = (value: SpecValue['value'], extra: Partial<SpecValue> = {}): SpecValue => ({
  value, sourceType: 'manufacturer', verification: 'verified',
  sourceUrl: 'https://example.test/spec-sheet', lastUpdated: '2026-10-01', region: 'IN', ...extra,
});
const bench = (value: number, version: string): SpecValue =>
  m(value, { sourceType: 'independently_measured', conditions: { version } });

export const alpha: PhoneRecord = {
  id: 'fx-alpha', brand: 'Fixture', model: 'Alpha 9',
  specs: {
    chipset: m('Test SoC X1'),
    antutu: bench(2_100_000, 'v10'),
    refresh_rate_hz: m(120),
    peak_brightness_nits: m(3000, { conditions: { method: 'manufacturer peak' } }),
    battery_mah: m(5000),
    wired_charging_w: m(45),
    screen_on_time_h: m(7.5, { sourceType: 'independently_measured', conditions: { test: 'MV web loop v1' } }),
    os_updates_years: m(7),
    current_price_inr: m(79999),
    weight_g: m(190),
    ip_rating: m('IP68'),
    ois: m(true),
    optical_zoom_x: m(5),
    video_max: m('8K'),
  },
};

export const beta: PhoneRecord = {
  id: 'fx-beta', brand: 'Fixture', model: 'Beta 5',
  specs: {
    chipset: m('Test SoC Y2'),
    antutu: bench(1_400_000, 'v10'),
    refresh_rate_hz: m(90),
    peak_brightness_nits: m(1800, { conditions: { method: 'manufacturer peak' } }),
    battery_mah: m(6000),
    wired_charging_w: m(80),
    screen_on_time_h: m(8.2, { sourceType: 'independently_measured', conditions: { test: 'MV web loop v1' } }),
    os_updates_years: m(4),
    current_price_inr: m(34999),
    weight_g: m(205),
    ip_rating: m('IP54'),
    ois: m(true),
    // optical_zoom_x deliberately missing
    video_max: m('4K60'),
  },
};

/** Benchmark from a different AnTuTu version + an unverified rumour. */
export const gamma: PhoneRecord = {
  id: 'fx-gamma', brand: 'Fixture', model: 'Gamma Pro',
  specs: {
    chipset: m('Test SoC Z3'),
    antutu: bench(2_900_000, 'v11'),
    refresh_rate_hz: m(144),
    battery_mah: m(5500, { sourceType: 'not_verified', verification: 'unverified' }),
    wired_charging_w: m(120, { sourceType: 'user_reported', verification: 'verified' }),
    os_updates_years: m(3),
    current_price_inr: m(54999),
    weight_g: m(199),
  },
};

export const delta: PhoneRecord = { id: 'fx-delta', brand: 'Fixture', model: 'Delta', specs: { refresh_rate_hz: m(120), battery_mah: m(5000) } };
export const epsilon: PhoneRecord = { id: 'fx-epsilon', brand: 'Fixture', model: 'Epsilon', specs: { refresh_rate_hz: m(60) } };

export const fixedNow = () => new Date('2026-11-01T00:00:00Z');
