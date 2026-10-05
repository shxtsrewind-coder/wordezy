import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { ALL_COUNTRIES, type CountryInfo } from '../lib/countryFlags.ts';

interface CountrySelectProps {
  value: string; // 2-letter ISO code or "" for none/prefer not to say
  onChange: (countryCode: string) => void;
  label?: string;
  disabled?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  label = 'Country / Flag',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedCountry: CountryInfo | undefined = ALL_COUNTRIES.find(
    (c) => c.code.toUpperCase() === value.toUpperCase()
  );

  const filteredCountries = ALL_COUNTRIES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-muted font-mono">{label}</label>
          <span className="text-[10px] text-faint font-mono">Optional</span>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3.5 py-2.5 rounded-lg bg-ink border border-rule hover:border-correct/50 text-paper text-sm flex items-center justify-between transition-colors cursor-pointer text-left focus:outline-none focus:border-correct"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedCountry ? (
            <>
              <span className="text-lg leading-none select-none">{selectedCountry.flag}</span>
              <span className="truncate text-paper font-medium">
                {selectedCountry.name} <span className="text-faint font-mono text-xs">({selectedCountry.code})</span>
              </span>
            </>
          ) : (
            <span className="text-faint text-xs">Prefer not to say (No flag)</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-correct' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface border border-rule rounded-xl shadow-xl shadow-black/40 overflow-hidden max-h-64 flex flex-col">
          <div className="p-2.5 border-b border-rule bg-ink/80 sticky top-0 z-10 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-transparent text-xs text-paper focus:outline-none placeholder:text-faint"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-muted hover:text-paper p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-rule/50">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                !value ? 'bg-correct-soft text-correct font-medium' : 'text-muted hover:bg-surface-high hover:text-paper'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🌐</span>
                <span>Prefer not to say (No flag)</span>
              </div>
              {!value && <Check className="w-3.5 h-3.5 text-correct" />}
            </button>

            {filteredCountries.map((c) => {
              const isSelected = value.toUpperCase() === c.code.toUpperCase();
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-correct-soft text-correct font-medium' : 'text-paper hover:bg-surface-high hover:text-paper'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base select-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-faint font-mono text-[10px]">({c.code})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-correct shrink-0 ml-2" />}
                </button>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className="p-3 text-center text-xs text-faint">No matching country found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
