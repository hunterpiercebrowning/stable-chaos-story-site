/**
 * Node module hooks so `functions/**.ts` (written for the bundler resolver, with
 * extension-less relative imports) can run under `node --experimental-strip-types`.
 * Registered by `scripts/dev-api-node.mjs`.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL).href;
    for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) return next(candidate, context);
    }
  }
  return next(specifier, context);
}
