import { NextRequest, NextResponse } from "next/server";
import { platformEmbedOrigins } from "./lib/platform-embed";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite .prompt.md and .prompt.yml requests to the raw API route
  if (pathname.startsWith("/prompts/") && (pathname.endsWith(".prompt.md") || pathname.endsWith(".prompt.yml"))) {
    const id = pathname.slice("/prompts/".length);
    const url = request.nextUrl.clone();
    url.pathname = `/api/prompts/${id}/raw`;
    return NextResponse.rewrite(url);
  }

  // Add pathname header for layout detection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (pathname === "/embed/platform-header") {
    response.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${platformEmbedOrigins().join(" ")}; object-src 'none'; base-uri 'self'`);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = {
  matcher: [
    // Exclude /api routes: API routes don't need the x-pathname header
    // (only src/app/layout.tsx consumes it), and the proxy/middleware adapter
    // has been observed to corrupt pages-API responses in Next 16.1.0
    // ("Expected an instance of Response to be returned" after the first request).
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
