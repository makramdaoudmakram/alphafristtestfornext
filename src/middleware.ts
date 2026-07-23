import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ensureAuthEnv, getNextAuthSecret } from "@/lib/env";

ensureAuthEnv();

export async function middleware(request: NextRequest) {
  const secret = getNextAuthSecret();

  if (!secret) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Configuration");
    return NextResponse.redirect(loginUrl);
  }

  const token = await getToken({ req: request, secret });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
