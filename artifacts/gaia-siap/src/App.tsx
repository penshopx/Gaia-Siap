import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useQueryClient as _useQueryClient } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
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
    colorPrimary: '#1a2e5c',        // deep navy
    colorForeground: '#0d1726',     // near-black navy
    colorMutedForeground: '#6b7a90',
    colorDanger: '#ef4444',
    colorBackground: '#faf9f7',     // off-white warm
    colorInput: '#e2e8f0',
    colorInputForeground: '#0d1726',
    colorNeutral: '#e2e8f0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-900 font-bold',
    headerSubtitle: 'text-slate-500',
    socialButtonsBlockButtonText: 'text-slate-700 font-medium',
    formFieldLabel: 'text-slate-700 font-medium',
    footerActionLink: 'text-[#1a2e5c] font-semibold hover:underline',
    footerActionText: 'text-slate-500',
    dividerText: 'text-slate-400',
    identityPreviewEditButton: 'text-[#1a2e5c]',
    formFieldSuccessText: 'text-emerald-600',
    alertText: 'text-slate-700',
    logoBox: 'mb-2',
    logoImage: 'w-10 h-10',
    socialButtonsBlockButton: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    formButtonPrimary: 'bg-[#1a2e5c] hover:bg-[#243a70] text-white font-semibold',
    formFieldInput: 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
    footerAction: 'bg-slate-50',
    dividerLine: 'bg-slate-200',
    alert: 'bg-red-50 border border-red-200',
    otpCodeFieldInput: 'border-slate-200 text-slate-900',
    formFieldRow: '',
    main: '',
  },
};

// ── Auth pages ────────────────────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

// ── Home — public landing, redirect signed-in users to dashboard ──────────────
function HomeRedirect() {
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

// ── Cache invalidation on user change ────────────────────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

// ── Router ────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Public */}
        <Route path="/" component={HomeRedirect} />
        <Route path="/mulai" component={Start} />

        {/* Auth pages — MUST be exact paths with /*? wildcard for Clerk OAuth callbacks */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Protected app pages */}
        <Route path="/dashboard">
          <Protected>
            <AppLayout><Dashboard /></AppLayout>
          </Protected>
        </Route>

        <Route path="/case/:id/*?">
          {(params) => (
            <Protected>
              <AppLayout>
                <CaseDetail params={params} />
              </AppLayout>
            </Protected>
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

// ── ClerkProvider with Wouter integration ─────────────────────────────────────
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
            title: 'Masuk ke Gaia SIAP',
            subtitle: 'Masuk untuk mengelola kasus dan workflow bisnis Anda',
          },
        },
        signUp: {
          start: {
            title: 'Buat Akun Gaia SIAP',
            subtitle: 'Mulai kelola bisnis Anda lebih sistematis',
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

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
