import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Settings } from '../lib/settings.ts';

interface SettingsModalProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  /** Hard mode can only be switched on before the first guess of a round. */
  hardModeLocked: boolean;
  puzzleNo: number;
  onClose: () => void;
}

const Toggle: React.FC<{
  id: string;
  label: string;
  hint: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ id, label, hint, note, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-rule last:border-b-0">
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-paper">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-xs text-muted mt-0.5">
        {hint}
      </p>
      {note && <p className="text-xs text-present mt-1">{note}</p>}
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={`${id}-hint`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-correct border-correct' : 'bg-surface-high border-rule'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, hardModeLocked, puzzleNo, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-sm bg-surface border border-rule rounded-lg p-5 shadow-xl shadow-black/15"
      >
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h2 id="settings-title" className="font-display font-semibold text-paper">
            Settings
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close settings" className="p-1 text-muted hover:text-paper cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <Toggle
          id="set-hard"
          label="Hard mode"
          hint="Any revealed hints must be used in later guesses."
          note={hardModeLocked && !settings.hardMode ? 'Hard mode can only be turned on before your first guess.' : undefined}
          checked={settings.hardMode}
          disabled={hardModeLocked && !settings.hardMode}
          onChange={(v) => onChange({ hardMode: v })}
        />
        <Toggle
          id="set-contrast"
          label="High contrast"
          hint="Orange and blue tiles, easier to tell apart for colour-blind players."
          checked={settings.highContrast}
          onChange={(v) => onChange({ highContrast: v })}
        />
        <Toggle
          id="set-onscreen"
          label="On-screen keyboard only"
          hint="Ignore your physical keyboard. Handy with some keyboard apps."
          checked={settings.onscreenOnly}
          onChange={(v) => onChange({ onscreenOnly: v })}
        />
        <p className="pt-3 text-[11px] font-mono text-faint">Wordezy No. {puzzleNo}</p>
      </div>
    </div>
  );
};
