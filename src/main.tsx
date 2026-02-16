import { Component, StrictMode, Suspense, lazy, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { trackError } from './lib/telemetry';
import './styles/globals.css';

const App = lazy(async () => import('./App'));

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error('[RootErrorBoundary]', error);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center">
            <h1 className="heading-2 text-gray-900">앱을 불러오는 중 문제가 발생했어요</h1>
            <p className="body-14 mt-2 text-gray-500">새로고침 후 다시 시도해주세요.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element.');
}

window.addEventListener('error', (event) => {
  trackError(event.error ?? event.message, {
    phase: 'window.error',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  trackError(event.reason, {
    phase: 'window.unhandledrejection',
  });
});

createRoot(rootElement).render(
  <StrictMode>
    <RootErrorBoundary>
      <Suspense
        fallback={(
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
          </div>
        )}
      >
        <App />
      </Suspense>
    </RootErrorBoundary>
  </StrictMode>,
);
