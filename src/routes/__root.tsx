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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-sm w-full p-8 text-center">
        <p className="label-xs">404 · Page not found</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          This page does not exist
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The URL you requested was not found. Return to the dashboard or sign in.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/overview"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const isAuth = error.message.includes("SECURITY_DEPENDENCY_UNAVAILABLE");
  const isForbidden = error.message.includes("FORBIDDEN");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-sm w-full p-8">
        <p className="label-xs text-severity-high">
          {isAuth ? "Security service unavailable" : isForbidden ? "Access denied" : "Application error"}
        </p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          {isAuth
            ? "Authorization service unavailable"
            : isForbidden
              ? "You are not authorized for this resource"
              : "This page did not load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAuth
            ? "No access decision was assumed. Nothing was disclosed and no access was granted."
            : isForbidden
              ? "This access attempt has been logged. Contact your administrator if you believe this is an error."
              : "An unexpected error occurred. You can retry or return home."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
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
      { title: "EHR Sentinel" },
      {
        name: "description",
        content:
          "EHR Sentinel — Explainable AI for healthcare access monitoring. Synthetic demonstration data only.",
      },
      { property: "og:title", content: "EHR Sentinel" },
      {
        property: "og:description",
        content: "Explainable AI for healthcare access monitoring.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      /* Inter from Google Fonts — subset for performance */
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
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
    <html lang="en">
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
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}