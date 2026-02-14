'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDatasetSearch } from './useDatasetSearch';

interface HeaderSearchProps {
  locale: 'bg' | 'en';
}

export function HeaderSearch({ locale }: HeaderSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useDatasetSearch(query, locale);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const navigate = useCallback(
    (href: string) => {
      setIsOpen(false);
      setIsFocused(false);
      setQuery('');
      router.push(href);
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }
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
    }
  }

  function handleBlur() {
    // Delay blur to allow click on results
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        if (!query.trim()) {
          setIsFocused(false);
        }
        setIsOpen(false);
      }
    }, 150);
  }

  const placeholder = locale === 'bg' ? 'Търсене...' : 'Search...';

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ width: isFocused ? 300 : 120 }}
          className="pl-8 pr-3 py-1.5 text-sm rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 ease-in-out"
        />
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul className="absolute right-0 z-50 mt-1 w-[350px] bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((result, index) => (
            <li key={result.dataset.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => navigate(result.href)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
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

      {/* No results */}
      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute right-0 z-50 mt-1 w-[350px] bg-background border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          {locale === 'bg' ? 'Няма намерени резултати' : 'No results found'}
        </div>
      )}
    </div>
  );
}
