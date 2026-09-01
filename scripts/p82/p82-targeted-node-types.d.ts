/** Minimal targeted declarations for the P82 strict TypeScript diagnostic only.
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

declare module "node:https" {
  type HeaderValue = string | string[] | undefined;
  interface P82TlsSocket {
    remoteAddress?: string;
    once(event: "secureConnect", callback: () => void): void;
  }
  interface P82IncomingMessage {
    statusCode?: number;
    headers: Record<string, HeaderValue>;
    on(event: "data", callback: (chunk: Uint8Array | string) => void): P82IncomingMessage;
    on(event: "error", callback: (error: Error) => void): P82IncomingMessage;
    on(event: "end", callback: () => void): P82IncomingMessage;
  }
  interface P82ClientRequest {
    on(event: "socket", callback: (socket: P82TlsSocket) => void): P82ClientRequest;
    on(event: "error", callback: (error: Error) => void): P82ClientRequest;
    setTimeout(timeoutMs: number, callback: () => void): P82ClientRequest;
    destroy(error?: Error): void;
    end(body?: string | Uint8Array): void;
  }
  interface P82RequestOptions {
    method: string;
    agent: false;
    servername: string;
    headers: Record<string, string>;
    lookup: (
      hostname: string,
      options: unknown,
      callback: (error: Error | null, address: string, family: 0 | 4 | 6) => void,
    ) => void;
  }
  export function request(
    url: URL,
    options: P82RequestOptions,
    callback: (response: P82IncomingMessage) => void,
  ): P82ClientRequest;
}
