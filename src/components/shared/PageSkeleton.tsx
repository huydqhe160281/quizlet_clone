/**
 * Generic route-level skeleton used by `loading.tsx` files. Rendering a boundary
 * lets Next prefetch the layout shell for dynamic routes and swap to it instantly
 * on navigation instead of waiting for the full server render.
 */
export function PageSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'detail' }) {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      </div>
      {variant === 'detail' ? (
        <>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}
    </div>
  );
}
