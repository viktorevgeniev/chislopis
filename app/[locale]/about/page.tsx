export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as 'bg' | 'en';

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-10">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-foreground">
          {loc === 'bg' ? 'За проекта' : 'About the Project'}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {loc === 'bg'
            ? 'В ежедневието лесно се изгубваме в детайлите и губим представа за общата картина. Трудно е да преценим дали вървим напред, назад или просто стоим на едно място. Числопис е създаден, за да направи данните достъпни и тенденциите видими — превръщайки сухата статистика в ясни, интерактивни визуализации, достъпни за всеки.'
            : 'In the rush of daily life it is easy to lose sight of the bigger picture. It becomes hard to tell whether we are making progress, falling behind, or simply standing still. Chislopis exists to make data digestible and trends visible — turning raw statistics into clear, interactive charts that anyone can explore.'}
        </p>
      </section>

      {/* Data Source */}
      <section className="rounded-2xl border bg-muted/30 p-6 shadow-ambient space-y-3">
        <h2 className="text-2xl font-headline font-bold">
          {loc === 'bg' ? 'Данните' : 'The Data'}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {loc === 'bg' ? (
            <>
              Всички набори от данни са взети от открития портал на{' '}
              <a
                href="https://www.nsi.bg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Националния статистически институт (НСИ)
              </a>
              . Платформата включва над 130 набора, обхващащи демография, труд и заетост, социални показатели, икономика, финанси и секторна статистика.
            </>
          ) : (
            <>
              All datasets are sourced from the open data portal of the{' '}
              <a
                href="https://www.nsi.bg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                National Statistical Institute of Bulgaria (NSI)
              </a>
              . The platform covers 130+ datasets spanning demographics, labour &amp; employment, social indicators, economy, finance, and sectoral statistics.
            </>
          )}
        </p>
      </section>

      {/* Methodology */}
      <section className="rounded-2xl border bg-muted/30 p-6 shadow-ambient space-y-4">
        <h2 className="text-2xl font-headline font-bold">
          {loc === 'bg' ? 'Методология' : 'Methodology'}
        </h2>
        <ul className="space-y-3 text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-3">
            <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-primary" />
            <span>
              {loc === 'bg'
                ? 'Данните се теглят от НСИ и се пресъздават директно в платформата.'
                : 'The data is downloaded from NSI and directly in the platform.'}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-primary" />
            <span>
              {loc === 'bg'
                ? 'Файловете с кодови списъци (codelists) свързват числовите и кодирани стойности с четими за хора означения — региони, възрастови групи, категории и др.'
                : 'Codelist files map numeric and coded values to human-readable labels — regions, age groups, categories, and more.'}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-primary" />
            <span>
              {loc === 'bg'
                ? 'Данните се дедублират по ревизия — при наличие на няколко версии на един запис се показва само най-новата ревизия за всяка комбинация от измерения.'
                : 'Data is deduplicated by revision — when multiple versions of a record exist, only the latest revision for each dimension combination is shown.'}
            </span>
          </li>
        </ul>
      </section>

      {/* Author */}
      <section className="rounded-2xl border bg-muted/30 p-6 shadow-ambient space-y-3">
        <h2 className="text-2xl font-headline font-bold">
          {loc === 'bg' ? 'Авторът' : 'The Author'}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {loc === 'bg'
            ? 'Числопис е личен проект на Виктор Евгениев — страничен проект, роден от страст към програмирането, данните и красивите визуализации. Идеята е проста: статистиката не трябва да бъде скучна или достъпна само за специалисти.'
            : 'Chislopis is a personal project by Viktor Evgeniev — a side project born from a passion for coding, data, and beautiful visualizations. The idea is simple: statistics should not be dry or accessible only to specialists.'}
        </p>
      </section>

      {/* Footer note */}
      <footer className="text-center text-sm text-muted-foreground pt-6 pb-4 border-t border-outline/20">
        {loc === 'bg' ? 'Данни от' : 'Data from'}{' '}
        <a
          href="https://www.nsi.bg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          {loc === 'bg'
            ? 'Национален статистически институт (НСИ)'
            : 'National Statistical Institute of Bulgaria (NSI)'}
        </a>
      </footer>
    </div>
  );
}
