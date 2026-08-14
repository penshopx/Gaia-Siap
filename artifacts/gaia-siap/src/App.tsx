import { type ReactNode, useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from 'wouter';

import { AppLayout } from '@/components/layout/app-layout';
import Landing from '@/pages/landing';
import Start from '@/pages/start';
import Dashboard from '@/pages/dashboard';
import CaseDetail from '@/pages/case-detail';

// ── Clerk configuration ───────────────────────────────────────────────────────
// REQUIRED — resolves key from hostname so the same build serves dev + prod.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod. Do NOT gate on NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Strip the base path prefix before passing to wouter (which already bases from basePath).
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// ── Appearance — matches the Gaia SIAP design system ─────────────────────────
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#1a2744',
    colorForeground: '#0d1730',
    colorMutedForeground: '#697a90',
    colorDanger: '#f23f3f',
    colorBackground: '#faf9f7',
    colorInput: '#e2e8f0',
    colorInputForeground: '#0d1730',
    colorNeutral: '#dfe8f2',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'shadow-lg rounded-2xl w-[440px] max-w-full overflow-hidden bg-white',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-900 font-bold',
    headerSubtitle: 'text-slate-500',
    socialButtonsBlockButtonText: 'text-slate-700 font-medium',
    formFieldLabel: 'text-slate-700 font-medium',
    footerActionLink: 'text-primary font-semibold hover:text-primary/80',
    footerActionText: 'text-slate-500',
    dividerText: 'text-slate-400',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-emerald-600',
    alertText: 'text-slate-700',
    logoBox: 'mx-auto',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border border-slate-200 hover:bg-slate-50 rounded-lg',
    formButtonPrimary: 'bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold',
    formFieldInput: 'border border-slate-200 rounded-lg bg-white text-slate-900',
    footerAction: 'bg-slate-50',
    dividerLine: 'bg-slate-200',
    alert: 'border border-red-100 bg-red-50 rounded-lg',
    otpCodeFieldInput: 'border border-slate-200 rounded-lg',
    formFieldRow: '',
    main: '',
  },
};

const queryClient = new QueryClient();

// ── Auth pages ────────────────────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
// Redirects authenticated users to dashboard; shows Landing to guests
function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

// Loading spinner shown while Clerk resolves the session
function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
    </div>
  );
}

// Requires auth — shows spinner until Clerk resolves, then guards guests to sign-in
function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingSpinner />;
  }

  return (
    <>
      <Show when="signed-in">
        <AppLayout>{children}</AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

// Invalidates React Query cache when the signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRoute} />

        {/* Auth pages — MUST be exactly /*? to catch OAuth sub-paths */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Protected app routes */}
        <Route path="/mulai">
          <ProtectedLayout>
            <Start />
          </ProtectedLayout>
        </Route>

        <Route path="/dashboard">
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        </Route>

        <Route path="/case/:id/*?">
          {(params) => (
            <ProtectedLayout>
              <CaseDetail params={params} />
            </ProtectedLayout>
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

// ── Root App ──────────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Selamat datang kembali',
            subtitle: 'Masuk untuk melanjutkan ke Gaia SIAP',
          },
        },
        signUp: {
          start: {
            title: 'Buat akun baru',
            subtitle: 'Mulai kelola kasus Anda secara terstruktur',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
