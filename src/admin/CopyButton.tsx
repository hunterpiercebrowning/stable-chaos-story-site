import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Copies `value` to the clipboard and flashes "Copied" for a moment. */
export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 1600);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      className={`admin-btn admin-btn--sm ${className ?? ''}`}
      data-state={state}
      onClick={async () => setState((await copyText(value)) ? 'copied' : 'failed')}
      aria-live="polite"
    >
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={14} />
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </button>
  );
}
