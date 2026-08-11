import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { AppLayout } from '@/components/layout/app-layout';
import Landing from '@/pages/landing';
import Start from '@/pages/start';
import Dashboard from '@/pages/dashboard';
import CaseDetail from '@/pages/case-detail';

const queryClient = new QueryClient();

// A simple empty layout wrapper since some pages need sidebar and others don't
// Landing and Start manage their own layouts.
function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/mulai" component={Start} />
        
        {/* Dashboard and App pages use AppLayout */}
        <Route path="/dashboard">
          <AppLayout><Dashboard /></AppLayout>
        </Route>
        
        <Route path="/case/:id/*?">
          {params => (
            <AppLayout>
              <CaseDetail params={params} />
            </AppLayout>
          )}
        </Route>

        <Route>
          <div className="flex h-screen items-center justify-center flex-col gap-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p>Halaman tidak ditemukan.</p>
          </div>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
