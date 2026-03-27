import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/projects/") && pathname.endsWith("/workspace")) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = pathname.replace(/\/workspace$/, "");
    return NextResponse.redirect(nextUrl);
  }

  if (pathname.startsWith("/projects/") && pathname.endsWith("/settings")) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = pathname.replace(/\/settings$/, "");
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"]
};
