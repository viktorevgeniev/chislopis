import { notFound } from 'next/navigation';
import { getStoryBySlug, getAllStories } from '@/lib/data/stories';
import { StoryEngine } from '@/components/stories/StoryEngine';

export async function generateStaticParams() {
  const locales = ['bg', 'en'];
  const stories = getAllStories();
  return locales.flatMap((locale) =>
    stories.map((story) => ({ locale, slug: story.slug })),
  );
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  // Verify the story exists server-side so we 404 immediately on unknown slugs.
  // We pass only the slug to StoryEngine so that non-serializable values
  // (e.g. formatter functions in echartsConfig) stay client-side.
  const story = getStoryBySlug(slug);
  if (!story) {
    notFound();
  }

  return (
    <StoryEngine slug={slug} locale={locale as 'bg' | 'en'} />
  );
}
