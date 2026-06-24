process.env.NEXTAUTH_SECRET ??= 'vitest-secret-not-for-production';

import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
