import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import brandFavicon from "@/assets/colab-nation-logo.jpg";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Error 404</p>
        <h1 className="mt-3 text-5xl font-bold gradient-text">Lost in the void</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist in this workspace.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-all hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-2xl font-semibold text-foreground">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The workspace hit an unexpected error. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CoLab Nation Workspace" },
      { name: "description", content: "Internal operating system for CoLab Nation — recruit, onboard, and run every department in one workspace." },
      { name: "author", content: "CoLab Nation" },
      { property: "og:title", content: "CoLab Nation Workspace" },
      { property: "og:description", content: "Internal operating system for CoLab Nation — recruit, onboard, and run every department in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CoLab Nation Workspace" },
      { name: "twitter:description", content: "Internal operating system for CoLab Nation — recruit, onboard, and run every department in one workspace." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66e1d7c2-5787-4181-ba5c-d57583d4abb2/id-preview-676021f7--2c1f6475-76e7-4c21-bcb1-923228cacbbf.lovable.app-1783585998834.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66e1d7c2-5787-4181-ba5c-d57583d4abb2/id-preview-676021f7--2c1f6475-76e7-4c21-bcb1-923228cacbbf.lovable.app-1783585998834.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: brandFavicon, type: "image/jpeg" },
      { rel: "apple-touch-icon", href: brandFavicon },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
