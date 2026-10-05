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
          <label className="block text-xs font-semibold text-stone-300 font-mono">{label}</label>
          <span className="text-[10px] text-stone-500 font-mono">Optional</span>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 hover:border-emerald-500/50 text-stone-100 text-sm flex items-center justify-between transition-colors cursor-pointer text-left focus:outline-none focus:border-emerald-500"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedCountry ? (
            <>
              <span className="text-lg leading-none select-none">{selectedCountry.flag}</span>
              <span className="truncate text-stone-100 font-medium">
                {selectedCountry.name} <span className="text-stone-500 font-mono text-xs">({selectedCountry.code})</span>
              </span>
            </>
          ) : (
            <span className="text-stone-500 text-xs">Prefer not to say (No flag)</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#141210] border border-stone-700/90 rounded-2xl shadow-2xl overflow-hidden max-h-64 flex flex-col">
          <div className="p-2.5 border-b border-stone-800 bg-stone-950/80 sticky top-0 z-10 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-transparent text-xs text-stone-100 focus:outline-none placeholder:text-stone-500"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-200 p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-stone-900/50">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                !value ? 'bg-emerald-500/15 text-emerald-300 font-semibold' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🌐</span>
                <span>Prefer not to say (No flag)</span>
              </div>
              {!value && <Check className="w-3.5 h-3.5 text-emerald-400" />}
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
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-500/15 text-emerald-300 font-semibold' : 'text-stone-200 hover:bg-stone-900 hover:text-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base select-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-stone-500 font-mono text-[10px]">({c.code})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                </button>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className="p-3 text-center text-xs text-stone-500">No matching country found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
