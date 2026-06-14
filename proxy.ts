import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const ROOT_AUTH_ALIASES: Record<string, string> = {
  "/login": "/pl/login",
  "/logowanie": "/pl/login",
  "/sign-in": "/pl/login",
  "/signin": "/pl/login",
  "/account": "/pl/account",
  "/konto": "/pl/account",
  "/member": "/pl/account",
  "/dashboard": "/pl/account",
};

const LOCALE_AUTH_ALIASES: Record<string, string> = {
  logowanie: "login",
  "sign-in": "login",
  signin: "login",
  konto: "account",
  member: "account",
};

function stripRedundantLocaleSelfRewrite(response: NextResponse, request: NextRequest) {
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) return response;

  try {
    const target = new URL(rewrite);
    const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const targetPath = `${target.pathname}${target.search}`;

    // PASS641: next-intl already injects x-next-intl-locale. Rewriting an
    // already-prefixed URL to the identical absolute URL can be interpreted
    // as an external self-proxy by Next start and loop until ECONNRESET.
    if (targetPath === currentPath) {
      response.headers.delete("x-middleware-rewrite");
      // A rewrite response without the rewrite header is not automatically a
      // pass-through response. Mark it explicitly so Next renders the matched
      // route while retaining next-intl request overrides, cookies and links.
      response.headers.set("x-middleware-next", "1");
    }
  } catch {
    // Keep the original response if a future middleware emits a non-URL value.
  }

  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.replace(/\/$/, "") || "/";

  const rootRedirect = ROOT_AUTH_ALIASES[normalizedPath];
  if (rootRedirect) {
    return NextResponse.redirect(new URL(rootRedirect, request.url));
  }

  const match = normalizedPath.match(/^\/(pl|en|de)\/([^/]+)$/);
  if (match) {
    const [, locale, segment] = match;
    const target = LOCALE_AUTH_ALIASES[segment];
    if (target) {
      return NextResponse.redirect(new URL(`/${locale}/${target}`, request.url));
    }
  }

  return stripRedundantLocaleSelfRewrite(intlMiddleware(request), request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
