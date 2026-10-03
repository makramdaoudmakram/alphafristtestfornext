import http from "node:http";
import https from "node:https";
import { getAlfaApiUrl } from "@/lib/api-config";
import { API_CLIENT_TIMEOUT_MS, REQUEST_ID_HEADER, newRequestId } from "@/lib/timed-fetch";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

async function nodeProxyRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{
  status: number;
  body: Buffer;
  contentType: string | null;
  contentDisposition: string | null;
}> {
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
            body: Buffer.concat(chunks),
            contentType: res.headers["content-type"] ?? null,
            contentDisposition: res.headers["content-disposition"] ?? null,
          });
        });
      }
    );

    req.setTimeout(API_CLIENT_TIMEOUT_MS, () => {
      req.destroy();
      reject(
        new Error(
          `Alfa API did not respond within ${Math.round(API_CLIENT_TIMEOUT_MS / 1000)} seconds. This is not a Vercel 504 — the proxy stopped waiting.`
        )
      );
    });
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
  const alfaApiUrl = getAlfaApiUrl();
  const targetUrl = `${alfaApiUrl}/api/${path}${search}`;

  const headers: Record<string, string> = {};
  const auth = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  const requestId =
    request.headers.get(REQUEST_ID_HEADER)?.trim() || newRequestId();
  headers[REQUEST_ID_HEADER] = requestId;
  if (auth) headers.Authorization = auth;
  if (contentType) headers["Content-Type"] = contentType;

  let body: Buffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 0) {
      body = Buffer.from(rawBody);
    }
  }

  if (body) {
    headers["Content-Length"] = body.length.toString();
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

    const responseHeaders: Record<string, string> = {
      [REQUEST_ID_HEADER]: requestId,
    };
    if (response.contentType) {
      responseHeaders["Content-Type"] = response.contentType;
    }
    if (response.contentDisposition) {
      responseHeaders["Content-Disposition"] = response.contentDisposition;
    }

    return new NextResponse(new Uint8Array(response.body), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed";

    const timedOut = /did not respond within/i.test(message);
    return NextResponse.json(
      {
        isSuccess: false,
        message: timedOut
          ? message
          : `Cannot reach Alfa API at ${alfaApiUrl}. ${message}`,
        requestId,
      },
      { status: timedOut ? 503 : 502 }
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
