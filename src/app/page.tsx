import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold text-primary">Flashcards</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Learn smarter with spaced repetition
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Create flashcard sets, study in multiple modes, and review cards at the optimal time —
          inspired by Quizlet, built for performance.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Start learning free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/library">Browse public library</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 sm:grid-cols-3">
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
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </main>
  );
}
