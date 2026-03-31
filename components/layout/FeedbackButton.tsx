'use client';

import { useLocale } from 'next-intl';

const FORM_URLS: Record<string, string> = {
  bg: 'https://forms.gle/GK8iAbB23xYTJYbz7',
  en: 'https://forms.gle/5uhusEDfmDJzYQPt8',
};

const LABELS: Record<string, string> = {
  bg: 'Обратна връзка',
  en: 'Feedback',
};

export function FeedbackButton() {
  const locale = useLocale();
  const url = FORM_URLS[locale] ?? FORM_URLS['en'];
  const label = LABELS[locale] ?? LABELS['en'];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </a>
  );
}
