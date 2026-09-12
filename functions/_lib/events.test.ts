import { describe, expect, it } from 'vitest';
import { EVENT_TYPES, isEventType, normalizeEvent, parseBatch } from './events';

const NOW = 1_800_000_000_000;

describe('event validation', () => {
  it('knows the §6 catalogue', () => {
    expect(EVENT_TYPES).toContain('session_start');
    expect(EVENT_TYPES).toContain('video_complete');
    expect(isEventType('layer_view')).toBe(true);
    expect(isEventType('drop table')).toBe(false);
  });

  it('normalizes a wire event and lifts layerId/nodeId from props', () => {
    expect(normalizeEvent({ type: 'node_focus', ts: NOW - 5, props: { layerId: 'who', nodeId: 'starling', via: 'nav' } }, NOW)).toEqual({
      type: 'node_focus',
      ts: NOW - 5,
      layerId: 'who',
      nodeId: 'starling',
      props: { layerId: 'who', nodeId: 'starling', via: 'nav' },
    });
    expect(normalizeEvent({ name: 'heartbeat', ts: NOW, layerId: 'sectors' }, NOW)?.layerId).toBe('sectors');
  });

  it('rejects unknown types and non-objects, clamps absurd timestamps', () => {
    expect(normalizeEvent({ type: 'nope', ts: NOW }, NOW)).toBeNull();
    expect(normalizeEvent('layer_view', NOW)).toBeNull();
    expect(normalizeEvent(null, NOW)).toBeNull();
    expect(normalizeEvent({ type: 'layer_view', ts: 12 }, NOW)?.ts).toBe(NOW);
    expect(normalizeEvent({ type: 'layer_view' }, NOW)?.ts).toBe(NOW);
  });

  it('bounds props size', () => {
    const big = { type: 'search', ts: NOW, props: { q: 'x'.repeat(10_000) } };
    expect(normalizeEvent(big, NOW)?.props.q).toHaveLength(256);
    const hopeless = { type: 'search', ts: NOW, props: Object.fromEntries(Array.from({ length: 400 }, (_, i) => [`k${i}`, 'v'.repeat(200)])) };
    expect(normalizeEvent(hopeless, NOW)).toBeNull();
  });

  it('parses a batch (array or {events}) and enforces the 50 cap', () => {
    const one = { type: 'layer_view', ts: NOW, props: { layerId: 'who' } };
    expect(parseBatch([one, { type: 'bad' }], NOW)).toEqual({ events: [expect.objectContaining({ type: 'layer_view' })], dropped: 1 });
    expect(parseBatch({ events: [one] }, NOW)?.events).toHaveLength(1);
    expect(parseBatch({}, NOW)).toBeNull();
    expect(parseBatch('[]', NOW)).toBeNull();
    expect(parseBatch(Array.from({ length: 51 }, () => one), NOW)).toBeNull();
    expect(parseBatch(Array.from({ length: 50 }, () => one), NOW)?.events).toHaveLength(50);
  });
});
