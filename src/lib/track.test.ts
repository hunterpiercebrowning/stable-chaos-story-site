import { afterEach, describe, expect, it } from 'vitest';
import { deviceClassFromUa, fingerprintLite, flush, pending, setTransport, toWire, track } from './track';

afterEach(() => {
  flush();
  setTransport(() => true);
});

describe('track transport', () => {
  it('maps queued events to the wire shape with layerId/nodeId lifted', () => {
    const sent: unknown[][] = [];
    setTransport((events) => {
      sent.push(events.map(toWire));
      return true;
    });
    track('node_focus', { layerId: 'who', nodeId: 'starling', via: 'nav' });
    track('density_change', { value: 'expanded' });
    expect(pending()).toHaveLength(2);
    flush();
    expect(pending()).toHaveLength(0);
    expect(sent[0][0]).toEqual({
      type: 'node_focus',
      ts: expect.any(Number),
      layerId: 'who',
      nodeId: 'starling',
      props: { layerId: 'who', nodeId: 'starling', via: 'nav' },
    });
    expect(sent[0][1]).not.toHaveProperty('layerId');
  });

  it('keeps events queued when the transport refuses, and auto-flushes at 20', () => {
    let calls = 0;
    setTransport(() => {
      calls++;
      return false;
    });
    for (let i = 0; i < 19; i++) track('heartbeat');
    expect(calls).toBe(0);
    track('heartbeat');
    expect(calls).toBe(1);
    expect(pending()).toHaveLength(20);
    setTransport(() => true);
    flush();
    expect(pending()).toHaveLength(0);
  });

  it('derives a device class and a stable fingerprint', async () => {
    expect(deviceClassFromUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari')).toBe('mobile');
    expect(deviceClassFromUa('Mozilla/5.0 (Macintosh) Chrome/128 Safari/537.36')).toBe('desktop');
    const a = await fingerprintLite(['ua', '1440x900x30', 'America/New_York', 'en-US']);
    const b = await fingerprintLite(['ua', '1440x900x30', 'America/New_York', 'en-US']);
    const c = await fingerprintLite(['ua', '1440x900x30', 'Europe/Berlin', 'en-US']);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});
