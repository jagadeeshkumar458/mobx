// Narration templates. Values are always inserted from snapshot cells (`display`),
// so translations change the wording around a spec, never the spec itself.
// Full translations live in the i18n bundles; this is the minimal seed set.

type Lang = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml';

const T: Record<'en' | 'te', Record<string, string>> = {
  en: {
    intro: '{phones}. Which one is actually worth your money? Let’s go through the spec sheets, category by category.',
    leads: '{spec}: {phone} leads with {value}.',
    others: '{list}.',
    tie: '{spec} is too close to call.',
    noData: 'We don’t have enough verified data on {spec} yet.',
    incomparable: '{spec} figures were measured differently, so we won’t rank them.',
    verdict: 'Overall, for your priorities, {phone} comes out ahead.',
    verdictClose: 'Overall it’s too close to call — pick based on what matters most to you.',
    outro: 'All figures come from verified sources listed in the description. If this helped you decide, subscribe for more comparisons.',
  },
  te: {
    intro: '{phones}. వీటిలో ఏది మీ డబ్బుకు తగినది? ఒక్కో విభాగాన్ని చూద్దాం.',
    leads: '{spec}లో {phone} {value}తో ముందుంది.',
    others: '{list}.',
    tie: '{spec}లో తేడా చాలా తక్కువ.',
    noData: '{spec} గురించి ఇంకా ధృవీకరించిన సమాచారం సరిపోదు.',
    incomparable: '{spec} వేర్వేరు పద్ధతుల్లో కొలిచారు, అందుకే ర్యాంక్ ఇవ్వడం లేదు.',
    verdict: 'మొత్తంగా, మీ ప్రాధాన్యతలకు {phone} ఉత్తమం.',
    verdictClose: 'మొత్తంగా తేడా చాలా తక్కువ — మీకు ఏది ముఖ్యమో దాని ఆధారంగా ఎంచుకోండి.',
    outro: 'అన్ని గణాంకాలు వివరణలో ఇచ్చిన ధృవీకరించిన మూలాల నుండి తీసుకున్నవి. ఇలాంటి మరిన్ని పోలికల కోసం సబ్‌స్క్రైబ్ చేయండి.',
  },
};

const SPEC_LABELS: Record<'en' | 'te', Record<string, string>> = {
  en: {
    antutu: 'AnTuTu score', refresh_rate_hz: 'Refresh rate', battery_mah: 'Battery capacity',
    wired_charging_w: 'Wired charging', screen_on_time_h: 'Screen-on time', os_updates_years: 'OS updates',
    current_price_inr: 'Current price', weight_g: 'Weight', optical_zoom_x: 'Optical zoom', ip_rating: 'Water resistance',
    peak_brightness_nits: 'Peak brightness', pwm_hz: 'PWM dimming', charge_0_100_min: 'Full charge time',
    wireless_charging_w: 'Wireless charging', security_updates_years: 'Security updates', launch_price_inr: 'Launch price',
    geekbench_single: 'Geekbench single-core', geekbench_multi: 'Geekbench multi-core', ram_type: 'RAM type', storage_type: 'Storage type',
    ois: 'Optical stabilisation', video_max: 'Best video mode', on_device_ai: 'On-device AI', stereo_speakers: 'Stereo speakers',
    wifi_version: 'Wi-Fi', fingerprint_type: 'Fingerprint sensor', display_replacement_inr: 'Screen replacement cost',
    ram_gb: 'RAM', storage_gb: 'Storage', ppi: 'Pixel density', thickness_mm: 'Thickness', front_video_max: 'Selfie video', five_g: '5G', nfc: 'NFC',
  },
  te: {
    antutu: 'AnTuTu స్కోర్', refresh_rate_hz: 'రిఫ్రెష్ రేట్', battery_mah: 'బ్యాటరీ సామర్థ్యం',
    wired_charging_w: 'వైర్డ్ ఛార్జింగ్', screen_on_time_h: 'స్క్రీన్-ఆన్ టైమ్', os_updates_years: 'OS అప్‌డేట్‌లు',
    current_price_inr: 'ప్రస్తుత ధర', weight_g: 'బరువు', optical_zoom_x: 'ఆప్టికల్ జూమ్', ip_rating: 'నీటి నిరోధకత',
    peak_brightness_nits: 'గరిష్ఠ బ్రైట్‌నెస్', pwm_hz: 'PWM డిమ్మింగ్', charge_0_100_min: 'పూర్తి ఛార్జింగ్ సమయం',
    wireless_charging_w: 'వైర్‌లెస్ ఛార్జింగ్', security_updates_years: 'సెక్యూరిటీ అప్‌డేట్‌లు', launch_price_inr: 'లాంచ్ ధర',
    geekbench_single: 'Geekbench సింగిల్-కోర్', geekbench_multi: 'Geekbench మల్టీ-కోర్', ram_type: 'RAM రకం', storage_type: 'స్టోరేజ్ రకం',
    ois: 'ఆప్టికల్ స్టెబిలైజేషన్', video_max: 'అత్యుత్తమ వీడియో మోడ్', on_device_ai: 'ఆన్-డివైస్ AI', stereo_speakers: 'స్టీరియో స్పీకర్లు',
    wifi_version: 'Wi-Fi', fingerprint_type: 'ఫింగర్‌ప్రింట్ సెన్సర్', display_replacement_inr: 'స్క్రీన్ మార్పు ఖర్చు',
    ram_gb: 'RAM', storage_gb: 'స్టోరేజ్', ppi: 'పిక్సెల్ సాంద్రత', thickness_mm: 'మందం', front_video_max: 'సెల్ఫీ వీడియో', five_g: '5G', nfc: 'NFC',
  },
};

const pick = (lang: Lang) => (lang === 'te' ? 'te' : 'en'); // other languages fall back until bundles are added

export function t(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  const tpl = T[pick(lang)][key] ?? T.en[key] ?? key;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function specLabel(lang: Lang, specKey: string): string {
  return SPEC_LABELS[pick(lang)][specKey] ?? SPEC_LABELS.en[specKey] ?? specKey.replace(/_/g, ' ');
}

export type { Lang };
