'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDatasetSearch } from './useDatasetSearch';
import { useTypewriter } from './useTypewriter';

const examplePhrases: Record<'bg' | 'en', string[]> = {
  bg: [
    'Население',
    'Безработица',
    'Заплати',
    'Бедност',
    'Туризъм',
    'Живородени',
  ],
  en: [
    'Population',
    'Unemployment',
    'Wages',
    'Poverty',
    'Tourism',
    'Live births',
  ],
};

interface DatasetSearchProps {
  locale: 'bg' | 'en';
}

export function DatasetSearch({ locale }: DatasetSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const phrases = useMemo(() => examplePhrases[locale], [locale]);
  const typewriterText = useTypewriter(phrases, !isFocused);

  const results = useDatasetSearch(query, locale);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const navigate = useCallback(
    (href: string) => {
      setIsOpen(false);
      setQuery('');
      router.push(href);
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      navigate(results[activeIndex].href);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const placeholder = isFocused ? '' : typewriterText;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground placeholder:italic focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((result, index) => (
            <li key={result.dataset.id}>
              <button
                type="button"
                onClick={() => navigate(result.href)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  index === activeIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="font-medium text-sm leading-tight">
                  {result.dataset.title[locale]}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {result.categoryName} &rarr; {result.subcategoryName}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
          {locale === 'bg' ? 'Няма намерени резултати' : 'No results found'}
        </div>
      )}
    </div>
  );
}
