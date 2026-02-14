import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

export function useTypewriter(
  phrases: string[],
  enabled: boolean,
  options?: UseTypewriterOptions
): string {
  const { typingSpeed = 40, deletingSpeed = 20, pauseDuration = 1500 } = options ?? {};

  const [displayText, setDisplayText] = useState('');
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const tick = useCallback(() => {
    const currentPhrase = phrases[phraseIndex.current];
    if (!currentPhrase) return;

    if (isDeleting.current) {
      charIndex.current--;
      setDisplayText(currentPhrase.slice(0, charIndex.current));

      if (charIndex.current === 0) {
        isDeleting.current = false;
        phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
        timeoutRef.current = setTimeout(tick, typingSpeed);
      } else {
        timeoutRef.current = setTimeout(tick, deletingSpeed);
      }
    } else {
      charIndex.current++;
      setDisplayText(currentPhrase.slice(0, charIndex.current));

      if (charIndex.current === currentPhrase.length) {
        isDeleting.current = true;
        timeoutRef.current = setTimeout(tick, pauseDuration);
      } else {
        timeoutRef.current = setTimeout(tick, typingSpeed);
      }
    }
  }, [phrases, typingSpeed, deletingSpeed, pauseDuration]);

  useEffect(() => {
    if (enabled && phrases.length > 0) {
      timeoutRef.current = setTimeout(tick, typingSpeed);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, tick, phrases, typingSpeed]);

  return enabled ? displayText : '';
}
