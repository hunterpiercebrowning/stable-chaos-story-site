/** Small response helpers so every route speaks the same JSON dialect. */

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function error(status: number, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ error: message, ...extra }, status);
}

export function noContent(headers: HeadersInit = {}): Response {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', ...headers } });
}

export function redirect(request: Request, path: string, headers: HeadersInit = {}): Response {
  const url = new URL(path, request.url);
  return new Response(null, {
    status: 302,
    headers: { location: url.toString(), 'cache-control': 'no-store', ...headers },
  });
}

/** Parse a JSON body regardless of content-type (sendBeacon sends text/plain). */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return null;
  return JSON.parse(text);
}

/** Add headers to a possibly-immutable upstream response. */
export function withHeaders(res: Response, headers: Record<string, string>, append: string[] = []): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) {
    if (append.includes(k)) out.headers.append(k, v);
    else out.headers.set(k, v);
  }
  return out;
}

/** Client IP as seen by Cloudflare. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    ''
  );
}

/** Geo from the `cf` object (present in production; mostly absent under wrangler dev). */
export function geo(request: Request): { country: string | null; region: string | null; city: string | null } {
  const cf = (request as Request & { cf?: IncomingRequestCfProperties }).cf;
  return {
    country: typeof cf?.country === 'string' ? cf.country : null,
    region: typeof cf?.region === 'string' ? cf.region : null,
    city: typeof cf?.city === 'string' ? cf.city : null,
  };
}
