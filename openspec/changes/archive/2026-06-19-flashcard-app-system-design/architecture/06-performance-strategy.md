# Performance Strategy

## Mục tiêu
- Lighthouse score > 90 (mobile + desktop)
- TTFB < 200ms cho trang chính
- LCP (Largest Contentful Paint) < 2.5s
- CLS (Cumulative Layout Shift) < 0.1
- FID/INP < 200ms

---

## 1. Server-Side Rendering (SSR) & Streaming

### Server Components (Zero JavaScript to client)

```tsx
// ✅ Set detail page: Server Component fetch parallel
// src/app/(app)/sets/[setId]/page.tsx

export default async function SetDetailPage({ params }: { params: Promise<{ setId: string }> }) {
  // Next.js 15: params là Promise, phải await trước khi dùng
  const { setId } = await params;

  // Parallel fetch — không waterfall
  const [set, cards, userProgress] = await Promise.all([
    setService.getSet(setId),
    cardService.getCards(setId),
    studyService.getUserProgress(setId),
  ]);

  return (
    <div>
      <SetHeader set={set} />
      <Suspense fallback={<CardListSkeleton />}>
        <CardList cards={cards} progress={userProgress} />
      </Suspense>
    </div>
  );
}
```

### Streaming với Suspense

```tsx
// Dashboard page: stream từng section độc lập
export default function DashboardPage() {
  return (
    <div>
      {/* Hiện ngay, không chờ data */}
      <PageHeader title="Dashboard" />

      {/* Stream từng widget riêng */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards /> {/* async Server Component */}
      </Suspense>

      <Suspense fallback={<HeatmapSkeleton />}>
        <ActivityHeatmap /> {/* async Server Component */}
      </Suspense>
    </div>
  );
}
```

**Lợi ích**: Browser nhận và render từng phần ngay khi sẵn sàng — TTFB cải thiện đáng kể.

---

## 2. Static Site Generation (SSG) & ISR

| Route | Strategy | TTL | Trigger revalidate |
|---|---|---|---|
| `/` (Landing) | SSG | ∞ | On deploy |
| `/library` | ISR | 300s | `revalidatePath('/library')` sau khi có set public mới |
| `/sets/[setId]` (public) | SSR | — | Dynamic, phụ thuộc auth |

```tsx
// Public library: ISR 5 phút
// src/app/(public)/library/page.tsx
export const revalidate = 300;

export default async function LibraryPage() {
  const sets = await getPublicSets({ sort: 'newest' });
  return <LibraryGrid sets={sets} />;
}
```

---

## 3. React Query — Client State & Caching

### Stale-Time Configuration

```typescript
// src/lib/query-config.ts
export const queryConfig = {
  sets: {
    staleTime: 5 * 60 * 1000,      // 5 phút: sets list ít thay đổi
    gcTime: 30 * 60 * 1000,         // 30 phút: giữ cache
  },
  cards: {
    staleTime: 2 * 60 * 1000,       // 2 phút
  },
  studySession: {
    staleTime: 0,                    // Luôn fresh: quan trọng cho SM-2
    gcTime: 0,
  },
  library: {
    staleTime: 5 * 60 * 1000,
  },
};
```

### Prefetch từ Server Component

```tsx
// Hydrate React Query cache từ server
// src/app/(app)/sets/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function SetsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['sets'],
    queryFn: () => getSets(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SetsClient /> {/* Client Component nhận cache từ server */}
    </HydrationBoundary>
  );
}
```

### Optimistic Updates

```typescript
// Khi user đổi visibility set: cập nhật UI trước, rollback nếu lỗi
const mutation = useMutation({
  mutationFn: updateSet,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['sets', setId] });
    const previous = queryClient.getQueryData(['sets', setId]);
    queryClient.setQueryData(['sets', setId], (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['sets', setId], context.previous); // Rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['sets', setId] });
  },
});
```

---

## 4. Virtualization — Danh sách lớn

Khi user có 500+ cards trong một set, render tất cả = DOM bloat = lag.

```tsx
// src/components/shared/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualCardList({ cards }: { cards: Flashcard[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // estimated card height
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: '100%',
              height: `${virtualItem.size}px`,
            }}
          >
            <CardItem card={cards[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Code Splitting & Lazy Loading

```tsx
// Lazy load study modes (chỉ load khi user vào mode đó)
const FlashcardMode = dynamic(() => import('@/features/study/components/flashcard/FlashcardViewer'), {
  loading: () => <StudyModeSkeleton />,
  ssr: false, // Study modes là client-only
});

const TestMode = dynamic(() => import('@/features/study/components/test/TestMode'), {
  loading: () => <StudyModeSkeleton />,
  ssr: false,
});
```

**Lợi ích**: Route `/sets/[setId]` không load JS của study modes khi chỉ xem card list.

---

## 6. Image Optimization

```tsx
// Dùng Next.js <Image> cho mọi ảnh
import Image from 'next/image';

<Image
  src={getSupabaseImageUrl(card.imageUrl)}
  alt={card.front}
  width={400}
  height={300}
  loading="lazy"         // lazy by default cho below-fold
  placeholder="blur"     // blur-up effect
  blurDataURL={...}      // low-quality placeholder
/>
```

**next.config.ts:**
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats
  },
};
```

---

## 7. Database Query Optimization

### Tránh N+1 với Prisma include

```typescript
// ✅ Single query với include
const sets = await prisma.flashcardSet.findMany({
  where: { userId },
  include: {
    _count: { select: { cards: true } },
    tags: { include: { tag: true } },
  },
  orderBy: { updatedAt: 'desc' },
  take: 20,
});
```

### Select chỉ fields cần thiết (không `SELECT *`)

```typescript
// ✅ Select minimal fields cho list view
const sets = await prisma.flashcardSet.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    description: true,
    visibility: true,
    _count: { select: { cards: true } },
    updatedAt: true,
  },
});
```

### Connection Pooling (Critical cho Vercel Serverless)

```
DATABASE_URL=postgresql://user:pass@db.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
```

---

## 8. Bundle Size

```typescript
// next.config.ts — phân tích bundle
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
```

**Mục tiêu bundle sizes:**
- First Load JS: < 100KB (gzipped)
- Per-page JS: < 50KB
- Shared chunks: < 80KB

**Tránh import nặng:**
```typescript
// ❌ Import toàn bộ thư viện
import _ from 'lodash';
// ✅ Named import
import { debounce } from 'lodash-es';

// ❌ date-fns full
import { format } from 'date-fns';
// ✅ Dùng Intl API (built-in)
const formatted = new Intl.DateTimeFormat('vi', { ... }).format(date);
```

---

## 9. Lighthouse Checklist

| Metric | Target | Strategy |
|---|---|---|
| Performance | > 90 | SSR + Streaming + Image opt |
| Accessibility | > 90 | shadcn/ui (Radix) ARIA labels |
| Best Practices | > 90 | HTTPS, no mixed content |
| SEO | > 90 | metadata API, semantic HTML |
| LCP | < 2.5s | SSR hero section, preload fonts |
| CLS | < 0.1 | Reserve image dimensions |
| INP | < 200ms | Debounce inputs, avoid blocking JS |
