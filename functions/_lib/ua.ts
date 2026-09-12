export type DeviceClass = 'desktop' | 'mobile' | 'tablet' | 'bot';

/** Coarse device class from a User-Agent string. Good enough for "was this forwarded to a phone?". */
export function deviceClassFromUa(ua: string | null | undefined): DeviceClass {
  const s = (ua ?? '').toLowerCase();
  if (!s) return 'desktop';
  if (/bot|crawl|spider|slurp|curl\/|wget\/|python-requests|headlesschrome|lighthouse/.test(s)) return 'bot';
  if (/ipad|tablet|kindle|silk|playbook/.test(s)) return 'tablet';
  if (/android/.test(s) && !/mobile/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini/.test(s)) return 'mobile';
  return 'desktop';
}

export const DEVICE_CLASSES: readonly DeviceClass[] = ['desktop', 'mobile', 'tablet', 'bot'];

export function isDeviceClass(v: unknown): v is DeviceClass {
  return typeof v === 'string' && (DEVICE_CLASSES as readonly string[]).includes(v);
}
