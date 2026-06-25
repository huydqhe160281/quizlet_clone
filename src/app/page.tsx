import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo/metadata';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export const metadata: Metadata = createPageMetadata({
  path: '/',
});

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <header className="glass-nav sticky top-0 z-50 mx-auto flex w-full items-center justify-between px-6 py-4">
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-xl font-bold tracking-tight text-transparent">
          Flashcards
        </span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32 text-center">
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          Learn smarter with
          <br />
          <span className="text-primary">spaced repetition</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Create flashcard sets, study in multiple modes, and review cards at the optimal time —
          inspired by Quizlet, built for performance.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="h-14 px-8 text-lg shadow-xl shadow-primary/20">
            <Link href="/register">Start learning free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="glass-panel h-14 px-8 text-lg">
            <Link href="/library">Browse public library</Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-8 px-6 pb-32 sm:grid-cols-3">
        {[
          {
            title: '4 Study Modes',
            description: 'Flashcard, Learn, Write, and Test — pick what fits your goal.',
          },
          {
            title: 'SM-2 Spaced Repetition',
            description: 'Review cards right before you forget them.',
          },
          {
            title: 'Public Library',
            description: 'Discover and duplicate sets shared by the community.',
          },
        ].map((feature) => (
          <Card
            key={feature.title}
            className="glass-panel relative overflow-hidden rounded-2xl border-primary/10 bg-card/40 p-2 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/30"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </main>
  );
}
