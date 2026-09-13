import { describe, expect, it } from 'vitest';
import { getNodes } from '../data';
import { isTypingTarget, nextSibling, resolveKeyAction } from './keyboard';

describe('resolveKeyAction', () => {
  it('maps the locked keyboard map', () => {
    expect(resolveKeyAction({ key: 'ArrowUp' })).toEqual({ type: 'layer', dir: -1 });
    expect(resolveKeyAction({ key: 'ArrowDown' })).toEqual({ type: 'layer', dir: 1 });
    expect(resolveKeyAction({ key: 'ArrowLeft' })).toEqual({ type: 'sibling', dir: -1 });
    expect(resolveKeyAction({ key: 'ArrowRight' })).toEqual({ type: 'sibling', dir: 1 });
    expect(resolveKeyAction({ key: 'Enter' })).toEqual({ type: 'enter' });
    expect(resolveKeyAction({ key: 'Escape' })).toEqual({ type: 'escape' });
    expect(resolveKeyAction({ key: '/' })).toEqual({ type: 'search' });
    expect(resolveKeyAction({ key: '[' })).toEqual({ type: 'panel', side: 'left' });
    expect(resolveKeyAction({ key: ']' })).toEqual({ type: 'panel', side: 'right' });
    expect(resolveKeyAction({ key: 'p' })).toEqual({ type: 'presentation' });
    expect(resolveKeyAction({ key: 'P' })).toEqual({ type: 'presentation' });
  });

  it('leaves unbound keys and modifier chords alone (Esc excepted)', () => {
    expect(resolveKeyAction({ key: ' ' })).toBeNull();
    expect(resolveKeyAction({ key: '1' })).toBeNull();
    expect(resolveKeyAction({ key: '5' })).toBeNull();
    expect(resolveKeyAction({ key: 'ArrowDown', metaKey: true })).toBeNull();
    expect(resolveKeyAction({ key: 'p', ctrlKey: true })).toBeNull();
    expect(resolveKeyAction({ key: 'Escape', metaKey: true })).toEqual({ type: 'escape' });
  });
});

describe('nextSibling', () => {
  const nodes = getNodes('who');

  it('goes to the first node when nothing is focused', () => {
    expect(nextSibling(nodes, undefined, 1)?.id).toBe(nodes[0].id);
    expect(nextSibling(nodes, undefined, -1)?.id).toBe(nodes[0].id);
  });

  it('steps through siblings without wrapping', () => {
    expect(nextSibling(nodes, nodes[0].id, 1)?.id).toBe(nodes[1].id);
    expect(nextSibling(nodes, nodes[1].id, -1)?.id).toBe(nodes[0].id);
    expect(nextSibling(nodes, nodes[0].id, -1)).toBeUndefined();
    expect(nextSibling(nodes, nodes[nodes.length - 1].id, 1)).toBeUndefined();
  });

  it('handles empty layers and unknown ids', () => {
    expect(nextSibling([], undefined, 1)).toBeUndefined();
    expect(nextSibling(nodes, 'nope', 1)?.id).toBe(nodes[0].id);
  });
});

describe('isTypingTarget', () => {
  it('recognises form fields by tag', () => {
    expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
