import http from "node:http";
import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

const ALFA_API_URL =
  process.env.ALFA_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://localhost:7211";

async function nodeProxyRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; body: string; contentType: string | null }> {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;
  const isLocalDev =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        ...(isHttps && isLocalDev ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 502,
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: res.headers["content-type"] ?? null,
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[]
) {
  const path = pathSegments.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${ALFA_API_URL}/api/${path}${search}`;

  const headers: Record<string, string> = {};
  const auth = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  if (auth) headers.Authorization = auth;
  if (contentType) headers["Content-Type"] = contentType;

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  if (body) {
    headers["Content-Length"] = Buffer.byteLength(body).toString();
  }

  try {
    const response = await nodeProxyRequest(
      targetUrl,
      request.method,
      headers,
      body
    );

    // 204/205 must not include a body (Response constructor rejects it).
    if (response.status === 204 || response.status === 205) {
      return new NextResponse(null, { status: response.status });
    }

    const responseHeaders: Record<string, string> = {};
    if (response.contentType) {
      responseHeaders["Content-Type"] = response.contentType;
    }

    return new NextResponse(response.body || null, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed";

    return NextResponse.json(
      {
        isSuccess: false,
        message: `Cannot reach Alfa API at ${ALFA_API_URL}. ${message}`,
      },
      { status: 502 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
