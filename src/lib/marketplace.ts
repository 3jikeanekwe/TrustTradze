export function normalizeText(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with"
]);

export function buildSearchKeywords(values: Array<string | number | null | undefined>) {
  const tokens = new Set<string>();

  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = normalizeText(String(value));
    if (!text) continue;

    for (const token of text.split(/[^a-z0-9]+/g)) {
      const cleaned = token.trim();
      if (!cleaned || cleaned.length < 2 || STOP_WORDS.has(cleaned)) continue;
      tokens.add(cleaned);
    }

    tokens.add(text);
  }

  return Array.from(tokens).slice(0, 40);
}

export function extractYouTubeVideoId(url: string) {
  const trimmed = url.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl(url: string) {
  const id = extractYouTubeVideoId(url);
  if (!id) return url;
  return `https://www.youtube.com/embed/${id}`;
}

export function buildWhatsAppUrl(phoneNumber?: string | null) {
  if (!phoneNumber) return null;

  let digits = phoneNumber.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `234${digits.slice(1)}`;
  }

  if (digits.length < 8) return null;

  return `https://wa.me/${digits}`;
}

export function formatMoney(amount: number) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
