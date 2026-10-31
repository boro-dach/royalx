'use client';
import dynamic from 'next/dynamic';
import ErrorBoundary from '../shared/ui/ErrorBoundary';
import { AppProvider } from '../context/AppContext';

const App = dynamic(() => import('../App'), { ssr: false });

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  );
}
