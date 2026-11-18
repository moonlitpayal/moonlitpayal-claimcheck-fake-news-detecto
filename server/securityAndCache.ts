import crypto from 'crypto';
import net from 'net';
import type { AnalysisResponse } from '../src/types.ts';

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    );
  }
  return false;
}

export function validatePublicUrl(raw: string): { valid: true; url: URL } | { valid: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { valid: false, reason: 'Please enter a valid web link starting with https:// or http://.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only http:// and https:// web links are supported.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isPrivateIp(host)
  ) {
    return { valid: false, reason: 'Private or local network addresses cannot be checked.' };
  }

  return { valid: true, url: parsed };
}

export function extractReadableTextFromHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  const text = withoutBlocks
    .replace(/<\/(p|h1|h2|h3|h4|li|article|section|div|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const combined = title && !text.startsWith(title) ? `${title}\n${text}` : text;
  return combined.slice(0, 9000);
}

export async function fetchArticleTextFromUrl(url: URL): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ClaimCheck-FactReader/1.0',
        Accept: 'text/html, text/plain;q=0.9',
      },
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const raw = await response.text();
    const extracted = contentType.includes('text/plain')
      ? raw.trim().slice(0, 9000)
      : extractReadableTextFromHtml(raw);

    return extracted.length >= 60 ? extracted : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface CacheEntry {
  value: AnalysisResponse;
  expiresAt: number;
}

export class AnalysisCache {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = 100, ttlMs = 30 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  buildKey(input: string, customFacts: string[], modelTimestamp: string): string {
    const normalizedInput = input.trim().replace(/\s+/g, ' ').toLowerCase();
    const normalizedFacts = [...customFacts]
      .map((f) => f.trim().toLowerCase())
      .sort()
      .join('|');
    return crypto
      .createHash('sha256')
      .update(`${normalizedInput}::${normalizedFacts}::${modelTimestamp}`)
      .digest('hex');
  }

  get(key: string): AnalysisResponse | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: AnalysisResponse): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit = 30, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(ip: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(ip) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= this.limit) {
      const oldest = recent[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.hits.set(ip, recent);
      return { allowed: false, retryAfterSec };
    }

    recent.push(now);
    this.hits.set(ip, recent);
    return { allowed: true, retryAfterSec: 0 };
  }
}
