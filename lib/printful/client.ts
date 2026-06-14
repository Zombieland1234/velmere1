const PRINTFUL_API_BASE = "https://api.printful.com";

export type PrintfulRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  revalidate?: number;
};

type NextFetchInit = RequestInit & {
  next?: {
    revalidate: number;
  };
};

export function isPrintfulConfigured() {
  return Boolean(process.env.PRINTFUL_API_TOKEN);
}

export async function printfulRequest<T>(path: string, options: PrintfulRequestOptions = {}) {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) {
    throw new Error("Missing PRINTFUL_API_TOKEN on server.");
  }

  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (process.env.PRINTFUL_STORE_ID) {
    headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  }

  const init: NextFetchInit = {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  if (method === "GET") {
    init.next = { revalidate: options.revalidate ?? 3600 };
  } else {
    init.cache = "no-store";
  }

  const response = await fetch(`${PRINTFUL_API_BASE}${path}`, init);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Printful API request failed with ${response.status}: ${text.slice(0, 180)}`);
  }

  return (await response.json()) as T;
}
