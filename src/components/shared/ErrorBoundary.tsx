'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/** Client fallback so the class ErrorBoundary can use catalog strings via hooks. */
function ErrorBoundaryFallback({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="font-medium">{t('ui.errorBoundary.message')}</p>
      <Button className="mt-4" onClick={onRetry}>
        {t('ui.errorBoundary.tryAgain')}
      </Button>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorBoundaryFallback onRetry={() => this.setState({ hasError: false })} />
        )
      );
    }

    return this.props.children;
  }
}
