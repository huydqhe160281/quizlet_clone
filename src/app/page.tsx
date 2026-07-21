import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo/metadata';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export async function generateMetadata() {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);
  return createPageMetadata({
    path: '/',
    locale,
    title: t(catalog, 'seo.title'),
    description: t(catalog, 'seo.description'),
  });
}

export default async function LandingPage() {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);
  const tr = (key: string) => t(catalog, key);

  const features = [
    {
      title: tr('landing.featureModesTitle'),
      description: tr('landing.featureModesDesc'),
    },
    {
      title: tr('landing.featureSm2Title'),
      description: tr('landing.featureSm2Desc'),
    },
    {
      title: tr('landing.featureLibraryTitle'),
      description: tr('landing.featureLibraryDesc'),
    },
  ];

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <header className="glass-nav sticky top-0 z-50 mx-auto flex w-full items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-xl">Q</span>
          </div>
          <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
            {tr('app.name')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">{tr('nav.login')}</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/register">{tr('nav.getStarted')}</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32 text-center">
        <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-6xl font-black tracking-tighter text-transparent sm:text-8xl md:leading-[1.1]">
          {tr('landing.headlineBefore')}
          <br />
          <span className="text-primary drop-shadow-[0_0_32px_rgba(var(--primary),0.3)]">
            {tr('landing.headlineAccent')}
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground font-medium sm:text-2xl leading-relaxed">
          {tr('landing.subtitle')}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            asChild
            className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 rounded-2xl transition-all duration-300"
          >
            <Link href="/register">{tr('landing.ctaStart')}</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="glass-panel h-14 px-8 text-lg font-bold rounded-2xl transition-all duration-300 hover:bg-muted/50 hover:scale-105"
          >
            <Link href="/library">{tr('landing.ctaLibrary')}</Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-8 px-6 pb-32 sm:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="glass-panel relative overflow-hidden rounded-xl border-white/20 bg-card/40 p-4 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 group"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl transition-all duration-500 group-hover:bg-primary/30" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
              <CardDescription className="text-base font-medium mt-2">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </main>
  );
}
