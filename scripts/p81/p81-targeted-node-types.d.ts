/** Minimal targeted declarations for the P81 strict TypeScript diagnostic only.
 * Canonical whole-project Node typings remain provided by the locked dependency tree
 * and are not replaced by this file in production builds.
 */
declare module "node:crypto" {
  interface DigestBuilder {
    update(value: string | Uint8Array): DigestBuilder;
    digest(encoding: "hex"): string;
  }
  export function createHash(algorithm: "sha256"): DigestBuilder;
  export function createHmac(algorithm: "sha256", secret: string): DigestBuilder;
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare module "node:dns/promises" {
  export function lookup(
    hostname: string,
    options: { all: true; verbatim: true },
  ): Promise<Array<{ address: string; family: number }>>;
}

declare module "node:net" {
  export function isIP(input: string): 0 | 4 | 6;
}

declare const Buffer: {
  from(value: string): Uint8Array;
};

declare const process: {
  env: Record<string, string | undefined>;
};
