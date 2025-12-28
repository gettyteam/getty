function normalizeCssFontFamily(value, fallback) {
  const fb = typeof fallback === 'string' ? fallback : '';
  if (typeof value !== 'string') return fb;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'custom') return fb;
  if (trimmed.length > 120) return fb;

  if (/[;{}():<>@\n\r\t\0\\]/.test(trimmed)) return fb;
  if (/url\s*\(/i.test(trimmed)) return fb;
  if (/@import\b|@charset\b/i.test(trimmed)) return fb;

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!parts.length) return fb;

  const tokenRe = /^[a-zA-Z0-9 _-]+$/;
  const quotedRe = /^(?:'[^'\n\r]{1,64}'|"[^"\n\r]{1,64}")$/;

  for (const part of parts) {
    if (quotedRe.test(part)) continue;
    if (!tokenRe.test(part)) return fb;
  }

  return parts.join(', ');
}

function normalizeCssPxNumber(value, fallback, { min = 8, max = 200 } = {}) {
  const fb = typeof fallback === 'string' ? fallback : String(Number(fallback) || 0);
  if (value === undefined || value === null) return fb;

  const s = typeof value === 'string' ? value.trim() : String(value);
  if (!s) return fb;

  const m = s.match(/^(\d{1,3})(?:px)?$/i);
  if (!m) return fb;

  let n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return fb;
  n = Math.min(max, Math.max(min, n));
  return String(n);
}

module.exports = {
  normalizeCssFontFamily,
  normalizeCssPxNumber,
};
