'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type LoadMoreButtonProps = {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<unknown>;
  label?: string;
  centered?: boolean;
};

export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  label,
  centered = true,
}: LoadMoreButtonProps) {
  const t = useTranslations();

  if (!hasMore) {
    return null;
  }

  return (
    <div className={centered ? 'flex justify-center' : undefined}>
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={() => void onLoadMore()}
      >
        {isLoading ? t('ui.loading') : (label ?? t('ui.loadMore'))}
      </Button>
    </div>
  );
}
