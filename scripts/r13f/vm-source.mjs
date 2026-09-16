import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

export function sourceBytes(path) {
  if (process.env.R13F_TEST_BASE_REF) {
    return execFileSync('git', ['show', `${process.env.R13F_TEST_BASE_REF}:${path}`], {encoding:'utf8'});
  }
  return readFileSync(path, 'utf8');
}

/** Execute the real source bytes with explicitly controlled dependencies.
 * This is a module regression harness, NOT a live-provider or browser E2E.
 */
export async function loadSource(path, mocks = {}, env = {}) {
  const logs = [];
  const context = vm.createContext({
    Request, Response, Headers, URL, URLSearchParams, AbortController, AbortSignal,
    TextEncoder, TextDecoder, Buffer, setTimeout, clearTimeout,
    process: { env: { ...env } },
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  });
  const source = stripTypeScriptTypes(sourceBytes(path), {mode:'transform'});
  const inferred = new Map();
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    inferred.set(match[2], match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean));
  }
  const cache = new Map();
  async function dependency(specifier) {
    if (cache.has(specifier)) return cache.get(specifier);
    const provided = mocks[specifier] ?? {};
    const names = [...new Set([...(inferred.get(specifier) ?? []), ...Object.keys(provided)])];
    if (!names.length) throw new Error(`Unspecified dependency: ${specifier}`);
    const values = Object.fromEntries(names.map(name => [name, name in provided ? provided[name] : () => {throw new Error(`Unexpected dependency call: ${specifier}:${name}`);} ]));
    const module = new vm.SyntheticModule(names, function() {
      for (const name of names) this.setExport(name, values[name]);
    }, {context, identifier:specifier});
    cache.set(specifier,module);
    await module.link(() => {throw new Error('Synthetic dependency imports are forbidden');});
    await module.evaluate();
    return module;
  }
  const module = new vm.SourceTextModule(source, {context, identifier:path, importModuleDynamically:dependency});
  await module.link(dependency);
  await module.evaluate();
  return { exports:module.namespace, logs };
}
