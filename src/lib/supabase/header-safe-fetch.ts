import { toHeaderSafeLatin1 } from "@/lib/env/header-safe-latin1";

function sanitizeHeaders(init?: RequestInit): RequestInit | undefined {
  if (!init?.headers) return init;

  const raw = init.headers;
  const pairs: [string, string][] = [];

  if (raw instanceof Headers) {
    raw.forEach((value, key) => pairs.push([key, value]));
  } else if (Array.isArray(raw)) {
    for (const [key, value] of raw) pairs.push([key, value]);
  } else {
    for (const [key, value] of Object.entries(raw)) {
      if (value != null) pairs.push([key, String(value)]);
    }
  }

  const safe = new Headers();
  for (const [key, value] of pairs) {
    const safeValue = toHeaderSafeLatin1(value);
    if (safeValue) safe.set(key, safeValue);
  }

  return { ...init, headers: safe };
}

/** Evita TypeError do fetch quando headers/cookies têm Unicode (ISO-8859-1 only). */
export function headerSafeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, sanitizeHeaders(init));
}
