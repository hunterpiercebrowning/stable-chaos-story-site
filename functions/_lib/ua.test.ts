import { describe, expect, it } from 'vitest';
import { deviceClassFromUa } from './ua';

describe('deviceClassFromUa', () => {
  it('classifies common agents', () => {
    expect(
      deviceClassFromUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'),
    ).toBe('desktop');
    expect(deviceClassFromUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe('mobile');
    expect(deviceClassFromUa('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36')).toBe('mobile');
    expect(deviceClassFromUa('Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/128.0 Safari/537.36')).toBe('tablet');
    expect(deviceClassFromUa('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe('tablet');
    expect(deviceClassFromUa('curl/8.4.0')).toBe('bot');
    expect(deviceClassFromUa('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe('bot');
    expect(deviceClassFromUa('')).toBe('desktop');
    expect(deviceClassFromUa(null)).toBe('desktop');
  });
});
