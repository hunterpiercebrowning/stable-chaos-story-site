#!/usr/bin/env node
/**
 * Fallback local API server for machines where the Cloudflare Workers runtime
 * cannot run (workerd needs macOS 13.5+ / glibc 2.35+). Serves `dist/` and
 * runs the real `functions/**.ts` through a Pages-Functions-style router with
 * a D1 shim over `node:sqlite`. Prefer `npm run dev:api` (wrangler) when it works.
 *
 *   npm run build && npm run dev:api:node            # http://127.0.0.1:8788
 *   node --experimental-strip-types --no-warnings scripts/dev-api-node.mjs --port 8789 --db path.sqlite
 *
 * Reads secrets from `.dev.vars` (falls back to `.dev.vars.example`). Applies `migrations/` on start.
 * Differences from production: no `request.cf` geo, `Secure` cookies are omitted over http.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { register } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyMigrations, DEFAULT_DB_FILE, openD1 } from './_node-d1.mjs';

register('./_ts-hooks.mjs', import.meta.url);

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const PORT = Number(opt('port', process.env.PORT ?? 8788));
const DIST = resolve(opt('dist', 'dist'));
const FUNCTIONS = resolve('functions');
const DB_FILE = opt('db', DEFAULT_DB_FILE);

// ---- env --------------------------------------------------------------------
function loadDevVars() {
  const file = existsSync('.dev.vars') ? '.dev.vars' : '.dev.vars.example';
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  for (const k of Object.keys(out)) if (process.env[k]) out[k] = process.env[k];
  return { file, vars: out };
}
const { file: varsFile, vars } = loadDevVars();
const db = openD1(DB_FILE);
const applied = applyMigrations(db);
const env = { ...vars, DB: db };

// ---- route table from functions/ -------------------------------------------
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const files = await walk(FUNCTIONS);
const routes = []; // { segments: [{ param?: string, literal?: string }], mod }
const middlewares = []; // { prefix: string[], mod }
for (const file of files) {
  const rel = file.slice(FUNCTIONS.length + 1).replace(/\.ts$/, '');
  const parts = rel.split('/');
  if (parts.some((p) => p.startsWith('_') && p !== '_middleware')) continue; // _lib etc.
  const mod = await import(pathToFileURL(file).href);
  if (parts[parts.length - 1] === '_middleware') {
    middlewares.push({ prefix: parts.slice(0, -1), mod });
    continue;
  }
  if (parts[parts.length - 1] === 'index') parts.pop();
  routes.push({
    segments: parts.map((p) => (p.startsWith('[') && p.endsWith(']') ? { param: p.slice(1, -1) } : { literal: p })),
    mod,
    file: rel,
  });
}
// Root middleware runs first, then nested ones.
middlewares.sort((a, b) => a.prefix.length - b.prefix.length);
// Literal segments outrank params.
routes.sort((a, b) => {
  const score = (r) => r.segments.reduce((n, s) => n + (s.literal ? 2 : 1), 0);
  return score(b) - score(a);
});

function matchRoute(pathname) {
  const segs = pathname.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.segments.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < segs.length; i++) {
      const s = r.segments[i];
      if (s.literal !== undefined) {
        if (s.literal !== segs[i]) {
          ok = false;
          break;
        }
      } else params[s.param] = decodeURIComponent(segs[i]);
    }
    if (ok) return { route: r, params };
  }
  return null;
}

function handlerFor(mod, method) {
  const m = method.charAt(0) + method.slice(1).toLowerCase();
  return mod[`onRequest${m}`] ?? mod.onRequest ?? null;
}

// ---- static assets -----------------------------------------------------------
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(request) {
  const { pathname } = new URL(request.url);
  let file = resolve(DIST, `.${decodeURIComponent(pathname)}`);
  if (!file.startsWith(DIST)) return new Response('forbidden', { status: 403 });
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    if (extname(pathname)) return new Response('not found', { status: 404 });
    file = join(DIST, 'index.html'); // SPA fallback, like Pages
  }
  const body = readFileSync(file);
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: { 'content-type': type, 'content-length': String(body.length) },
  });
}

// ---- dispatch -------------------------------------------------------------------
async function dispatch(request) {
  const url = new URL(request.url);
  const segs = url.pathname.split('/').filter(Boolean);
  const matched = matchRoute(url.pathname);
  const chain = [];
  for (const mw of middlewares) {
    if (mw.prefix.every((p, i) => segs[i] === p)) {
      const fn = handlerFor(mw.mod, request.method);
      if (fn) chain.push(fn);
    }
  }
  if (matched) {
    const fn = handlerFor(matched.route.mod, request.method);
    if (fn) chain.push(fn);
  }
  const data = {};
  const params = matched?.params ?? {};
  const run = async (i) => {
    if (i >= chain.length) return serveStatic(request);
    return chain[i]({
      request,
      env,
      params,
      data,
      next: () => run(i + 1),
      waitUntil: () => undefined,
      passThroughOnException: () => undefined,
      functionPath: url.pathname,
    });
  };
  return run(0);
}

// ---- node http bridge ------------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
      else if (v !== undefined) headers.set(k, v);
    }
    // Production sees the visitor IP as `cf-connecting-ip`; mimic it from the socket.
    if (!headers.has('cf-connecting-ip') && req.socket.remoteAddress) headers.set('cf-connecting-ip', req.socket.remoteAddress);
    const hasBody = !['GET', 'HEAD'].includes(req.method ?? 'GET');
    const chunks = [];
    if (hasBody) for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
    const response = await dispatch(request);
    const outHeaders = [];
    response.headers.forEach((v, k) => {
      if (k !== 'set-cookie') outHeaders.push([k, v]);
    });
    for (const c of response.headers.getSetCookie()) outHeaders.push(['set-cookie', c]);
    res.writeHead(response.status, outHeaders);
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`dev-api-node error: ${e?.stack ?? e}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-api-node] http://127.0.0.1:${PORT}  dist=${DIST}  db=${DB_FILE}  vars=${varsFile}`);
  if (applied.length) console.log(`[dev-api-node] applied migrations: ${applied.join(', ')}`);
  console.log(`[dev-api-node] routes: ${routes.map((r) => '/' + r.segments.map((s) => (s.literal ?? `:${s.param}`)).join('/')).join('  ')}`);
});
