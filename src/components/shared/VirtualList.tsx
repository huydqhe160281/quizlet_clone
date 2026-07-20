'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';

type VirtualListProps<T> = {
  items: T[];
  estimateSize?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
};

export function VirtualList<T>({
  items,
  estimateSize = 72,
  renderItem,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    measureElement: (element) => Math.ceil(element.getBoundingClientRect().height),
  });

  return (
    <div ref={parentRef} className={className ?? 'h-[min(70vh,720px)] overflow-auto pr-1'}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="pb-4"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
